# Phase 2: K3s Core Infrastructure

This phase installs the core Kubernetes infrastructure with encryption enabled at all layers.

## etcd Encryption Configuration

::: warning Security
Kubernetes secrets are stored in plaintext in etcd by default. This configuration enables AES-256 encryption at rest.
:::

```bash
# Generate encryption key for etcd
ETCD_ENCRYPTION_KEY=$(head -c 32 /dev/urandom | base64)

# Create encryption configuration
cat > /etc/rancher/k3s/encryption-config.yaml <<EOF
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: ${ETCD_ENCRYPTION_KEY}
      - identity: {}
EOF

chmod 600 /etc/rancher/k3s/encryption-config.yaml

# CRITICAL: Save this key securely offline!
# This key is required to decrypt all Kubernetes secrets.
# Store it in a password manager or secure vault OUTSIDE the server.
echo "ETCD_ENCRYPTION_KEY=${ETCD_ENCRYPTION_KEY}"
echo "⚠️  SAVE THIS KEY SECURELY OFFLINE - YOU WILL NEED IT FOR DISASTER RECOVERY"
```

## K3s Installation

```bash
# Install K3s with:
# - etcd encryption enabled
# - Flannel disabled (we'll use Cilium)
# - Traefik disabled (we'll use Cilium Ingress)
# - Local storage disabled (we'll use Longhorn)
# - Audit logging enabled

curl -sfL https://get.k3s.io | sh -s - \
  --write-kubeconfig-mode 600 \
  --flannel-backend=none \
  --disable-network-policy \
  --disable=traefik \
  --disable=local-storage \
  --kube-apiserver-arg="encryption-provider-config=/etc/rancher/k3s/encryption-config.yaml" \
  --kube-apiserver-arg="audit-log-path=/var/log/kubernetes/audit.log" \
  --kube-apiserver-arg="audit-log-maxage=30" \
  --kube-apiserver-arg="audit-log-maxbackup=10" \
  --kube-apiserver-arg="audit-log-maxsize=100"

# Wait for K3s to start (30-60 seconds)
sleep 60

# Configure kubectl
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
echo 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml' >> ~/.bashrc
```

::: info Note
At this point, the node shows `NotReady` because no CNI is installed. This is expected.
:::

## Helm Installation

```bash
# Install Helm 3
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Add required Helm repositories
helm repo add cilium https://helm.cilium.io/
helm repo add longhorn https://charts.longhorn.io
helm repo add jetstack https://charts.jetstack.io
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add seaweedfs https://seaweedfs.github.io/seaweedfs/helm
helm repo add mattermost https://helm.mattermost.com
helm repo add gitea https://dl.gitea.io/charts/
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update
```

## Cilium Installation (CNI + Ingress + mTLS)

Cilium provides:
- High-performance eBPF networking
- Built-in Ingress Controller (Envoy)
- WireGuard encryption between all pods
- L3/L4/L7 Network Policies
- Hubble for network observability

```bash
# Install Cilium CLI (optional but recommended)
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
curl -L --fail --remote-name-all \
  https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz
tar xzvfC cilium-linux-amd64.tar.gz /usr/local/bin
rm cilium-linux-amd64.tar.gz

# Install Cilium via Helm
helm install cilium cilium/cilium \
  --version 1.16.5 \
  --namespace kube-system \
  --set operator.replicas=1 \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set ingressController.enabled=true \
  --set ingressController.default=true \
  --set ingressController.loadbalancerMode=shared \
  --set kubeProxyReplacement=true \
  --set encryption.enabled=true \
  --set encryption.type=wireguard \
  --set encryption.wireguard.userspaceFallback=true

# Wait for Cilium to be ready (2-3 minutes)
kubectl wait --for=condition=ready pod \
  -l k8s-app=cilium -n kube-system --timeout=300s

# Verify WireGuard encryption is active
cilium status | grep Encryption
# Expected: Encryption: Wireguard [NodeEncryption: Disabled, ...]
```

## Longhorn Installation (Encrypted Storage)

Longhorn provides distributed block storage with LUKS encryption support.

### Create Encryption Key

```bash
# Generate LUKS encryption key
LONGHORN_CRYPTO_KEY=$(head -c 32 /dev/urandom | base64)

# CRITICAL: Save this key securely offline!
echo "LONGHORN_CRYPTO_KEY=${LONGHORN_CRYPTO_KEY}"
echo "⚠️  SAVE THIS KEY SECURELY OFFLINE - REQUIRED FOR DATA RECOVERY"

# Create namespace
kubectl create namespace longhorn-system

# Create encryption secret
kubectl create secret generic longhorn-crypto \
  --namespace longhorn-system \
  --from-literal=CRYPTO_KEY_VALUE="${LONGHORN_CRYPTO_KEY}" \
  --from-literal=CRYPTO_KEY_PROVIDER="secret"
```

### Install Longhorn

```bash
# Install Longhorn with encryption enabled by default
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --set defaultSettings.defaultDataPath=/var/lib/longhorn \
  --set defaultSettings.defaultReplicaCount=1 \
  --set defaultSettings.createDefaultDiskLabeledNodes=true

# Wait for Longhorn to be ready (2-3 minutes)
kubectl wait --for=condition=ready pod \
  -l app=longhorn-manager -n longhorn-system --timeout=300s
```

### Create Encrypted StorageClass

```bash
cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-encrypted
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
parameters:
  numberOfReplicas: "1"
  staleReplicaTimeout: "2880"
  fromBackup: ""
  fsType: "ext4"
  encrypted: "true"
  csi.storage.k8s.io/provisioner-secret-name: "longhorn-crypto"
  csi.storage.k8s.io/provisioner-secret-namespace: "longhorn-system"
  csi.storage.k8s.io/node-publish-secret-name: "longhorn-crypto"
  csi.storage.k8s.io/node-publish-secret-namespace: "longhorn-system"
  csi.storage.k8s.io/node-stage-secret-name: "longhorn-crypto"
  csi.storage.k8s.io/node-stage-secret-namespace: "longhorn-system"
EOF

# Remove default annotation from unencrypted storageclass if exists
kubectl patch storageclass longhorn -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}' 2>/dev/null || true
```

## cert-manager Installation

```bash
# Create namespace
kubectl create namespace cert-manager

# Install cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --set crds.enabled=true

# Wait for deployment
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/instance=cert-manager \
  -n cert-manager --timeout=120s
```

### Create Let's Encrypt ClusterIssuers

```bash
# Replace with your email
export ACME_EMAIL="admin@example.com"

cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: ${ACME_EMAIL}
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
    - http01:
        ingress:
          class: cilium
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ${ACME_EMAIL}
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - http01:
        ingress:
          class: cilium
EOF
```

## Validation Tests

```bash
# Check node status (should be Ready now)
kubectl get nodes
# Expected: 1 node Ready

# Check all system pods
kubectl get pods -A
# Expected: coredns, metrics-server, cilium, cilium-operator, cilium-envoy, longhorn-* Running

# Check Cilium status
cilium status
# Expected: OK for all components

# Check WireGuard encryption
cilium status | grep -i encrypt
# Expected: Encryption: Wireguard

# Check Cilium Ingress Controller
kubectl get svc -n kube-system cilium-ingress
# Expected: LoadBalancer with EXTERNAL-IP

# Check Longhorn
kubectl get pods -n longhorn-system
# Expected: All pods Running

# Check encrypted StorageClass is default
kubectl get storageclass
# Expected: longhorn-encrypted (default)

# Check cert-manager
kubectl get pods -n cert-manager
# Expected: 3 pods Running

# Check ClusterIssuers
kubectl get clusterissuer
# Expected: letsencrypt-staging and letsencrypt-prod Ready

# Test encrypted volume creation
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-encrypted-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
EOF

kubectl get pvc test-encrypted-pvc
# Expected: Bound

# Verify encryption is enabled on the volume
kubectl get volumes.longhorn.io -n longhorn-system -o jsonpath='{.items[0].spec.encrypted}'
# Expected: true

# Cleanup test
kubectl delete pvc test-encrypted-pvc
```

## Expected Results

| Component | Status |
|-----------|--------|
| Node | Ready |
| Cilium | OK |
| WireGuard | Enabled |
| Longhorn | All pods Running |
| StorageClass | longhorn-encrypted (default) |
| cert-manager | 3 pods Running |
| ClusterIssuers | 2 Ready |

## Encryption Summary

| Layer | Method | Key Location |
|-------|--------|--------------|
| etcd (K8s Secrets) | AES-256-CBC | `/etc/rancher/k3s/encryption-config.yaml` |
| Persistent Volumes | LUKS | `longhorn-crypto` Secret |
| Pod-to-Pod Network | WireGuard | Auto-managed by Cilium |
| External Traffic | TLS | cert-manager managed |

::: danger Key Management
You must securely store these keys **offline**:
1. `ETCD_ENCRYPTION_KEY` - Required to decrypt Kubernetes secrets
2. `LONGHORN_CRYPTO_KEY` - Required to decrypt persistent volumes

Without these keys, data recovery is **impossible**.
:::

## Next Step

Proceed to [Phase 3: Vault](./03-vault.md) to set up centralized secrets management.
