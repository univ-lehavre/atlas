# Phase 3: HashiCorp Vault

This phase installs HashiCorp Vault for centralized secrets management with auto-unseal and External Secrets Operator integration.

## Why Vault?

::: info Benefits
- **Centralized secrets**: All credentials in one auditable place
- **Dynamic secrets**: Database credentials generated on-demand with TTL
- **Automatic rotation**: Secrets can rotate without service restarts
- **Audit logging**: Every secret access is logged
- **Encryption as a Service**: Transit engine for application encryption
:::

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Kubernetes                            │
│                                                              │
│  ┌──────────────┐     ┌──────────────────────────────────┐  │
│  │    Vault     │◄────│   External Secrets Operator      │  │
│  │  (secrets)   │     │   (syncs to K8s Secrets)         │  │
│  └──────┬───────┘     └──────────────────────────────────┘  │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────┐                                           │
│  │   Longhorn   │  ◄── Encrypted PVC for Vault storage     │
│  │   (storage)  │                                           │
│  └──────────────┘                                           │
│                                                              │
│  Services: PostgreSQL, Redis, Mattermost, Gitea, etc.       │
│            ▲                                                 │
│            └── Read secrets from K8s Secrets (synced)       │
└─────────────────────────────────────────────────────────────┘
```

## Vault Namespace and Storage

```bash
# Create namespace
kubectl create namespace vault

# Vault will use the encrypted StorageClass by default (longhorn-encrypted)
```

## Install Vault via Helm

::: tip K3D/macOS
Replace `longhorn-encrypted` with `local-path`:
```bash
--set server.dataStorage.storageClass=local-path
```
:::

```bash
# Install Vault in standalone mode with Raft storage
helm install vault hashicorp/vault \
  --namespace vault \
  --set server.standalone.enabled=true \
  --set server.dataStorage.enabled=true \
  --set server.dataStorage.size=10Gi \
  --set server.dataStorage.storageClass=longhorn-encrypted \
  --set ui.enabled=true \
  --set ui.serviceType=ClusterIP

# Wait for pod to start (it will be in 0/1 Running - not ready until initialized)
kubectl wait --for=condition=Ready=false pod \
  -l app.kubernetes.io/name=vault -n vault --timeout=120s
```

## Initialize Vault

::: danger Critical
The unseal keys and root token generated here are **irreplaceable**.
Store them securely offline (password manager, hardware security module, or printed in a safe).
:::

```bash
# Initialize Vault with 5 key shares, 3 required to unseal
kubectl exec -n vault vault-0 -- vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -format=json > vault-init.json

# Extract keys and token
VAULT_UNSEAL_KEY_1=$(jq -r '.unseal_keys_b64[0]' vault-init.json)
VAULT_UNSEAL_KEY_2=$(jq -r '.unseal_keys_b64[1]' vault-init.json)
VAULT_UNSEAL_KEY_3=$(jq -r '.unseal_keys_b64[2]' vault-init.json)
VAULT_UNSEAL_KEY_4=$(jq -r '.unseal_keys_b64[3]' vault-init.json)
VAULT_UNSEAL_KEY_5=$(jq -r '.unseal_keys_b64[4]' vault-init.json)
VAULT_ROOT_TOKEN=$(jq -r '.root_token' vault-init.json)

# Display keys - SAVE THESE SECURELY OFFLINE
echo "=== VAULT UNSEAL KEYS - SAVE SECURELY ==="
echo "Key 1: ${VAULT_UNSEAL_KEY_1}"
echo "Key 2: ${VAULT_UNSEAL_KEY_2}"
echo "Key 3: ${VAULT_UNSEAL_KEY_3}"
echo "Key 4: ${VAULT_UNSEAL_KEY_4}"
echo "Key 5: ${VAULT_UNSEAL_KEY_5}"
echo ""
echo "Root Token: ${VAULT_ROOT_TOKEN}"
echo "=========================================="

# Remove the init file after saving keys
rm vault-init.json
```

## Unseal Vault

```bash
# Unseal with 3 of the 5 keys
kubectl exec -n vault vault-0 -- vault operator unseal ${VAULT_UNSEAL_KEY_1}
kubectl exec -n vault vault-0 -- vault operator unseal ${VAULT_UNSEAL_KEY_2}
kubectl exec -n vault vault-0 -- vault operator unseal ${VAULT_UNSEAL_KEY_3}

# Verify Vault is unsealed and ready
kubectl exec -n vault vault-0 -- vault status
# Expected: Sealed = false
```

## Configure Vault

```bash
# Set environment for vault commands
export VAULT_ADDR="http://127.0.0.1:8200"

# Port forward to access Vault
kubectl port-forward -n vault svc/vault 8200:8200 &
sleep 2

# Login with root token
vault login ${VAULT_ROOT_TOKEN}
```

### Enable KV Secrets Engine

```bash
# Enable KV v2 secrets engine at 'secret/' path
vault secrets enable -path=secret kv-v2

# Create structure for our secrets
# Infrastructure secrets
vault kv put secret/infrastructure/postgresql \
  admin-password="$(openssl rand -base64 32)" \
  replication-password="$(openssl rand -base64 32)"

vault kv put secret/infrastructure/redis \
  password="$(openssl rand -base64 32)"

vault kv put secret/infrastructure/longhorn \
  crypto-key="$(head -c 32 /dev/urandom | base64)"

# Vault's own database password (for PostgreSQL storage)
vault kv put secret/services/vault \
  db-password="$(openssl rand -base64 32)"

# Service secrets
vault kv put secret/services/authentik \
  secret-key="$(openssl rand -base64 60)" \
  admin-password="$(openssl rand -base64 24)" \
  admin-token="$(openssl rand -hex 32)"

vault kv put secret/services/mattermost \
  db-password="$(openssl rand -base64 32)"

vault kv put secret/services/nextcloud \
  admin-password="$(openssl rand -base64 24)" \
  db-password="$(openssl rand -base64 32)"

vault kv put secret/services/gitea \
  db-password="$(openssl rand -base64 32)" \
  secret-key="$(openssl rand -base64 32)"

vault kv put secret/services/argocd \
  admin-password="$(openssl rand -base64 32)"

vault kv put secret/services/grafana \
  admin-password="$(openssl rand -base64 32)"

vault kv put secret/services/redcap \
  db-password="$(openssl rand -base64 32)" \
  salt="$(openssl rand -base64 32)"

vault kv put secret/services/flipt \
  db-password="$(openssl rand -base64 32)"

vault kv put secret/services/onlyoffice \
  jwt-secret="$(openssl rand -base64 32)"
```

### Enable Database Secrets Engine (Optional - Dynamic Secrets)

```bash
# Enable database secrets engine for dynamic credentials
vault secrets enable database

# Configuration will be added after PostgreSQL is installed
# This allows Vault to generate short-lived database credentials
```

### Create Kubernetes Authentication

```bash
# Enable Kubernetes auth method
vault auth enable kubernetes

# Configure Kubernetes auth
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443"
```

### Create Policies

```bash
# Policy for External Secrets Operator
vault policy write external-secrets - <<EOF
path "secret/data/*" {
  capabilities = ["read", "list"]
}
EOF

# Policy for PostgreSQL (for dynamic secrets later)
vault policy write postgresql-admin - <<EOF
path "database/creds/postgresql-admin" {
  capabilities = ["read"]
}
EOF
```

### Create Kubernetes Auth Roles

```bash
# Role for External Secrets Operator
vault write auth/kubernetes/role/external-secrets \
  bound_service_account_names=external-secrets \
  bound_service_account_namespaces=external-secrets \
  policies=external-secrets \
  ttl=1h
```

## Install External Secrets Operator

External Secrets Operator syncs secrets from Vault to Kubernetes Secrets.

```bash
# Add Helm repo
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Create namespace
kubectl create namespace external-secrets

# Install External Secrets Operator
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --set installCRDs=true

# Wait for deployment
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=external-secrets \
  -n external-secrets --timeout=120s
```

### Create ClusterSecretStore

```bash
# Create service account for ESO
kubectl create serviceaccount external-secrets -n external-secrets

# Create ClusterSecretStore pointing to Vault
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "http://vault.vault.svc:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: "external-secrets"
            namespace: "external-secrets"
EOF
```

### Test External Secrets

```bash
# Create a test ExternalSecret
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: test-vault-secret
  namespace: default
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: test-vault-secret
    creationPolicy: Owner
  data:
    - secretKey: redis-password
      remoteRef:
        key: infrastructure/redis
        property: password
EOF

# Verify secret was created
kubectl get secret test-vault-secret -o jsonpath='{.data.redis-password}' | base64 -d
# Should output the Redis password from Vault

# Cleanup test
kubectl delete externalsecret test-vault-secret
```

## Vault Ingress (Optional)

::: warning Security
Only expose Vault UI if you have proper 2FA configured via Authentik.
:::

```bash
# Replace with your domain
export DOMAIN="example.com"

cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: vault
  namespace: vault
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: cilium
  tls:
    - hosts:
        - vault.${DOMAIN}
      secretName: vault-tls
  rules:
    - host: vault.${DOMAIN}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: vault-ui
                port:
                  number: 8200
EOF
```

## Auto-Unseal Configuration (Recommended for Production)

For production, configure auto-unseal to avoid manual intervention after restarts.

### Option 1: Kubernetes Secret Auto-Unseal

::: warning Security Consideration
Storing Vault unseal keys in a Kubernetes Secret places the keys required to decrypt all Vault data inside the same cluster. An attacker who gains cluster-admin or etcd access can read this secret and automatically unseal Vault.

**For production environments**, consider:
- **Cloud KMS auto-unseal** (AWS KMS, GCP Cloud KMS, Azure Key Vault)
- **HSM auto-unseal** for on-premises deployments
- **Transit auto-unseal** using a separate Vault instance in a different trust domain
- **Keeping unseal keys strictly offline** and manually unsealing after restarts

The Kubernetes Secret approach below is suitable for development/testing or when you accept the shared trust boundary.
:::

```bash
# Store unseal keys in a Kubernetes secret (encrypted by etcd encryption)
kubectl create secret generic vault-unseal-keys \
  --namespace vault \
  --from-literal=key1="${VAULT_UNSEAL_KEY_1}" \
  --from-literal=key2="${VAULT_UNSEAL_KEY_2}" \
  --from-literal=key3="${VAULT_UNSEAL_KEY_3}"

# Create auto-unseal script as ConfigMap
cat <<'EOF' | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-auto-unseal
  namespace: vault
data:
  unseal.sh: |
    #!/bin/sh
    set -e

    # Wait for Vault to be running
    until vault status 2>/dev/null | grep -q "Sealed.*true"; do
      sleep 2
    done

    echo "Vault is sealed, attempting auto-unseal..."

    # Unseal with keys from environment
    vault operator unseal "$UNSEAL_KEY_1"
    vault operator unseal "$UNSEAL_KEY_2"
    vault operator unseal "$UNSEAL_KEY_3"

    echo "Vault unsealed successfully"
EOF

# Create a sidecar deployment for auto-unseal
# This is a simple approach - for HA, consider using a Kubernetes Job
```

### Option 2: Transit Auto-Unseal (Advanced)

For high-security environments, use a separate Vault instance or cloud KMS for auto-unseal.

## Validation Tests

```bash
# Check Vault pod status
kubectl get pods -n vault
# Expected: vault-0 Running 1/1

# Check Vault status
kubectl exec -n vault vault-0 -- vault status
# Expected: Sealed = false, HA Enabled = false

# Check secrets engine
kubectl exec -n vault vault-0 -- vault secrets list
# Expected: secret/ (kv-v2)

# Check External Secrets Operator
kubectl get pods -n external-secrets
# Expected: All pods Running

# Check ClusterSecretStore
kubectl get clustersecretstore vault-backend
# Expected: Ready = True

# Test secret sync
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: validation-test
  namespace: default
spec:
  refreshInterval: "1m"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: validation-test-secret
  data:
    - secretKey: test
      remoteRef:
        key: infrastructure/redis
        property: password
EOF

sleep 5
kubectl get secret validation-test-secret
# Expected: Secret exists

# Cleanup
kubectl delete externalsecret validation-test
```

## Expected Results

| Component | Status |
|-----------|--------|
| Vault Pod | Running 1/1 |
| Vault Sealed | false |
| KV Engine | Enabled at secret/ |
| Kubernetes Auth | Enabled |
| External Secrets Operator | Running |
| ClusterSecretStore | Ready |

## Secrets Structure

After this phase, Vault contains:

```
secret/
├── infrastructure/
│   ├── postgresql      # admin-password, replication-password
│   ├── redis           # password
│   ├── longhorn        # crypto-key
│   └── seaweedfs       # s3-access-key, s3-secret-key
└── services/
    ├── vault           # db-password
    ├── authentik       # secret-key, admin-password, admin-token
    ├── mattermost      # db-password
    ├── nextcloud       # admin-password, db-password
    ├── gitea           # db-password, secret-key
    ├── argocd          # admin-password
    ├── grafana         # admin-password
    ├── redcap          # db-password, salt
    ├── flipt           # db-password
    └── onlyoffice      # jwt-secret
```

::: tip Secret Rotation
Secrets can be rotated by updating them in Vault:
```bash
vault kv put secret/services/mattermost db-password="$(openssl rand -base64 32)"
```
External Secrets Operator will sync the new value within the refresh interval.
:::

## Next Step

Proceed to [Phase 4: Shared Databases](./04-databases.md) to set up PostgreSQL HA and Redis Sentinel with Vault integration.
