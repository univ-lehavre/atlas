# Phase 6: DevOps Tools

This phase installs Gitea (Git forge) and ArgoCD (GitOps continuous deployment).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitOps Workflow                          │
│                                                                 │
│  Developer                                                      │
│      │                                                          │
│      ▼                                                          │
│  ┌────────┐     push      ┌─────────┐                          │
│  │ Local  │ ─────────────►│  Gitea  │                          │
│  │  Git   │               │  (Git)  │                          │
│  └────────┘               └────┬────┘                          │
│                                │                                │
│                           webhook                               │
│                                │                                │
│                                ▼                                │
│                          ┌─────────┐     sync     ┌──────────┐ │
│                          │ ArgoCD  │ ────────────►│ Cluster  │ │
│                          │ (GitOps)│              │  (K3s)   │ │
│                          └─────────┘              └──────────┘ │
│                                                                 │
│  Both authenticated via Authentik (2FA for ArgoCD)              │
└─────────────────────────────────────────────────────────────────┘
```

## Gitea (Git Forge)

### Create Namespace and Secrets

```bash
kubectl create namespace gitea

cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: gitea-secrets
  namespace: gitea
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: gitea-secrets
    creationPolicy: Owner
  data:
    - secretKey: db-password
      remoteRef:
        key: services/gitea
        property: db-password
    - secretKey: secret-key
      remoteRef:
        key: services/gitea
        property: secret-key
    - secretKey: redis-password
      remoteRef:
        key: infrastructure/redis
        property: password
EOF

kubectl wait --for=condition=Ready externalsecret/gitea-secrets \
  -n gitea --timeout=60s
```

### Install Gitea

```bash
export DOMAIN="example.com"

# Get secrets from Kubernetes for Helm values
DB_PASSWORD=$(kubectl get secret gitea-secrets -n gitea -o jsonpath='{.data.db-password}' | base64 -d)
REDIS_PASSWORD=$(kubectl get secret gitea-secrets -n gitea -o jsonpath='{.data.redis-password}' | base64 -d)

helm install gitea gitea/gitea \
  --namespace gitea \
  --set gitea.admin.username=gitea_admin \
  --set gitea.admin.password="" \
  --set gitea.admin.email=admin@${DOMAIN} \
  --set gitea.config.database.DB_TYPE=postgres \
  --set gitea.config.database.HOST=postgresql-postgresql-ha-pgpool.databases.svc:5432 \
  --set gitea.config.database.NAME=gitea \
  --set gitea.config.database.USER=gitea_user \
  --set gitea.config.database.PASSWD="${DB_PASSWORD}" \
  --set gitea.config.cache.ENABLED=true \
  --set gitea.config.cache.ADAPTER=redis \
  --set gitea.config.cache.HOST="redis+sentinel://redis.databases.svc:26379/mymaster/0?password=${REDIS_PASSWORD}" \
  --set gitea.config.session.PROVIDER=redis \
  --set gitea.config.session.PROVIDER_CONFIG="redis+sentinel://redis.databases.svc:26379/mymaster/1?password=${REDIS_PASSWORD}" \
  --set gitea.config.queue.TYPE=redis \
  --set gitea.config.queue.CONN_STR="redis+sentinel://redis.databases.svc:26379/mymaster/2?password=${REDIS_PASSWORD}" \
  --set gitea.config.server.DOMAIN=git.${DOMAIN} \
  --set gitea.config.server.ROOT_URL=https://git.${DOMAIN} \
  --set gitea.config.server.SSH_DOMAIN=git.${DOMAIN} \
  --set gitea.config.service.DISABLE_REGISTRATION=true \
  --set gitea.config.openid.ENABLE_OPENID_SIGNIN=false \
  --set gitea.config.oauth2_client.ENABLE_AUTO_REGISTRATION=true \
  --set gitea.config.oauth2_client.ACCOUNT_LINKING=auto \
  --set gitea.config.oauth2_client.USERNAME=nickname \
  --set postgresql.enabled=false \
  --set postgresql-ha.enabled=false \
  --set redis-cluster.enabled=false \
  --set persistence.enabled=true \
  --set persistence.storageClass=longhorn-encrypted \
  --set persistence.size=50Gi \
  --set ingress.enabled=true \
  --set ingress.className=cilium \
  --set ingress.hosts[0].host=git.${DOMAIN} \
  --set ingress.hosts[0].paths[0].path=/ \
  --set ingress.hosts[0].paths[0].pathType=Prefix \
  --set ingress.annotations."cert-manager\.io/cluster-issuer"=letsencrypt-prod \
  --set ingress.tls[0].hosts[0]=git.${DOMAIN} \
  --set ingress.tls[0].secretName=gitea-tls \
  --set resources.requests.memory=256Mi \
  --set resources.requests.cpu=100m \
  --set resources.limits.memory=512Mi

kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=gitea -n gitea --timeout=300s
```

### Configure Gitea OIDC (Authentik)

After Gitea is running, add Authentik as OAuth2 provider:

```bash
# Get Gitea admin credentials (generated during install)
GITEA_ADMIN_PASS=$(kubectl get secret gitea -n gitea -o jsonpath='{.data.admin-password}' | base64 -d)

# Generate OIDC client secret
GITEA_OIDC_SECRET=$(openssl rand -base64 32)

# Store in Vault
kubectl exec -n vault vault-0 -- vault kv patch secret/services/gitea \
  oidc-secret="${GITEA_OIDC_SECRET}"

# Add OAuth2 provider via Gitea API
kubectl exec -n gitea deploy/gitea -- \
  gitea admin auth add-oauth \
  --name "Authentik" \
  --provider "openidConnect" \
  --key "gitea" \
  --secret "${GITEA_OIDC_SECRET}" \
  --auto-discover-url "https://auth.${DOMAIN}/.well-known/openid-configuration" \
  --group-claim-name "groups" \
  --admin-group "admins"
```

### SSH Access Configuration

For Git SSH access (port 22), create a NodePort service:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: gitea-ssh
  namespace: gitea
spec:
  type: NodePort
  ports:
  - name: ssh
    port: 22
    targetPort: 22
    nodePort: 30022
  selector:
    app: gitea
EOF
```

::: tip Firewall
Remember to allow port 30022 (or your chosen NodePort) in the firewall for SSH access:
```bash
ufw allow 30022/tcp comment 'Gitea SSH'
```
:::

## ArgoCD (GitOps)

### Create Namespace

```bash
kubectl create namespace argocd
```

### Create ExternalSecret

```bash
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: argocd-secrets
  namespace: argocd
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: argocd-secret
    creationPolicy: Owner
    template:
      metadata:
        labels:
          app.kubernetes.io/part-of: argocd
  data:
    - secretKey: admin.password
      remoteRef:
        key: services/argocd
        property: admin-password
EOF

kubectl wait --for=condition=Ready externalsecret/argocd-secrets \
  -n argocd --timeout=60s
```

### Install ArgoCD

```bash
helm install argocd argo/argo-cd \
  --namespace argocd \
  --set configs.params."server\.insecure"=true \
  --set server.ingress.enabled=true \
  --set server.ingress.ingressClassName=cilium \
  --set server.ingress.hosts[0]=argocd.${DOMAIN} \
  --set server.ingress.annotations."cert-manager\.io/cluster-issuer"=letsencrypt-prod \
  --set server.ingress.tls[0].hosts[0]=argocd.${DOMAIN} \
  --set server.ingress.tls[0].secretName=argocd-tls \
  --set server.resources.requests.memory=128Mi \
  --set server.resources.requests.cpu=50m \
  --set server.resources.limits.memory=256Mi \
  --set controller.resources.requests.memory=256Mi \
  --set controller.resources.requests.cpu=100m \
  --set controller.resources.limits.memory=512Mi \
  --set repoServer.resources.requests.memory=128Mi \
  --set repoServer.resources.requests.cpu=50m \
  --set repoServer.resources.limits.memory=256Mi \
  --set applicationSet.enabled=true \
  --set notifications.enabled=true

kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=argocd-server -n argocd --timeout=300s
```

### Configure ArgoCD OIDC (Authentik)

```bash
# Generate OIDC client secret
ARGOCD_OIDC_SECRET=$(openssl rand -base64 32)

# Store in Vault
kubectl exec -n vault vault-0 -- vault kv patch secret/services/argocd \
  oidc-secret="${ARGOCD_OIDC_SECRET}"

# Update Authentik config with ArgoCD client (already done in Phase 5)

# Configure ArgoCD OIDC
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
  labels:
    app.kubernetes.io/name: argocd-cm
    app.kubernetes.io/part-of: argocd
data:
  url: https://argocd.${DOMAIN}
  oidc.config: |
    name: Authentik
    issuer: https://auth.${DOMAIN}
    clientID: argocd
    clientSecret: \$argocd-oidc-secret:oidc.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - groups
EOF

# Create secret for OIDC client secret
kubectl create secret generic argocd-oidc-secret \
  --namespace argocd \
  --from-literal=oidc.clientSecret="${ARGOCD_OIDC_SECRET}"

# Configure RBAC for OIDC groups
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
  labels:
    app.kubernetes.io/name: argocd-rbac-cm
    app.kubernetes.io/part-of: argocd
data:
  policy.csv: |
    g, admins, role:admin
    g, developers, role:readonly
  policy.default: role:readonly
EOF

# Restart ArgoCD to apply changes
kubectl rollout restart deployment argocd-server -n argocd
```

### Connect Gitea to ArgoCD

Create a repository credential for Gitea:

```bash
# Get the SSH key from Gitea or generate one
ssh-keygen -t ed25519 -f /tmp/argocd-gitea -N ""

# Create secret with repository credentials
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: gitea-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  type: git
  url: https://git.${DOMAIN}
  username: gitea_admin
  password: ${GITEA_ADMIN_PASS}
EOF
```

### Create Application for Cluster Management

Create an ArgoCD Application that syncs cluster configuration from Gitea:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cluster-config
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://git.${DOMAIN}/infra/cluster-config.git
    targetRevision: HEAD
    path: manifests
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
EOF
```

::: tip Repository Structure
Create a repository `infra/cluster-config` in Gitea with this structure:
```
cluster-config/
├── manifests/
│   ├── namespaces/
│   │   └── ...
│   ├── network-policies/
│   │   └── ...
│   └── kustomization.yaml
└── README.md
```
ArgoCD will automatically sync changes pushed to this repository.
:::

## ArgoCD CLI Access

```bash
# Install ArgoCD CLI
curl -sSL -o /usr/local/bin/argocd \
  https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x /usr/local/bin/argocd

# Login with admin password
ARGOCD_ADMIN_PASS=$(kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath='{.data.password}' | base64 -d)

argocd login argocd.${DOMAIN} --username admin --password "${ARGOCD_ADMIN_PASS}"

# List applications
argocd app list
```

## Validation Tests

```bash
# Check Gitea
kubectl get pods -n gitea
# Expected: gitea-0 Running

# Check Gitea ingress
kubectl get ingress -n gitea
# Expected: git.example.com with address

# Test Gitea web access
curl -I https://git.${DOMAIN}
# Expected: HTTP/2 200 or 302

# Check ArgoCD
kubectl get pods -n argocd
# Expected: All pods Running (server, controller, repo-server, redis, dex)

# Check ArgoCD ingress
kubectl get ingress -n argocd
# Expected: argocd.example.com with address

# Test ArgoCD web access
curl -I https://argocd.${DOMAIN}
# Expected: HTTP/2 200

# Check ArgoCD applications
kubectl get applications -n argocd
# Expected: cluster-config application listed

# Check certificates
kubectl get certificate -n gitea
kubectl get certificate -n argocd
# Expected: Both Ready
```

## Expected Results

| Service | Namespace | Pods | Ingress | SSH Port |
|---------|-----------|------|---------|----------|
| Gitea | gitea | 1 Running | git.example.com | 30022 |
| ArgoCD | argocd | 5 Running | argocd.example.com | - |

## Resource Summary

| Service | CPU Request | Memory Request | Storage |
|---------|-------------|----------------|---------|
| Gitea | 100m | 256Mi | 50Gi |
| ArgoCD Server | 50m | 128Mi | - |
| ArgoCD Controller | 100m | 256Mi | - |
| ArgoCD Repo Server | 50m | 128Mi | - |
| ArgoCD Redis | 50m | 64Mi | - |
| ArgoCD Dex | 25m | 64Mi | - |
| **Total** | **375m** | **~900Mi** | **50Gi** |

## GitOps Workflow

1. **Developer** pushes code to Gitea
2. **Gitea webhook** notifies ArgoCD (optional, or ArgoCD polls)
3. **ArgoCD** compares desired state (Git) with actual state (cluster)
4. **ArgoCD** applies changes automatically (if auto-sync enabled)
5. **Notifications** sent via ArgoCD Notifications (Slack, email, etc.)

## Next Step

Proceed to [Phase 7: Monitoring](./07-monitoring.md) to install Prometheus and Grafana.
