# Phase 8: Security Hardening

This phase configures Cilium Network Policies, access control, and security best practices.

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Security Layers                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Layer 7: Application                      │   │
│  │  • Authentik (IAM/SSO/2FA)                                  │   │
│  │  • OIDC authentication                                      │   │
│  │  • Role-based access control                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ▲                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Layer 4-7: Network                        │   │
│  │  • Cilium Network Policies                                  │   │
│  │  • WireGuard encryption (pod-to-pod)                        │   │
│  │  • TLS termination (cert-manager)                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ▲                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Layer 3: Infrastructure                   │   │
│  │  • etcd encryption (AES-256)                                │   │
│  │  • Longhorn LUKS encryption                                 │   │
│  │  • Vault secrets management                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ▲                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Layer 2: Host                             │   │
│  │  • UFW firewall                                             │   │
│  │  • SSH key authentication only                              │   │
│  │  • Fail2ban (optional)                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Cilium Network Policy Strategy

::: info Zero-Trust Approach
We use a **default-deny** policy with explicit allow rules for each service.
This means no pod can communicate with another unless explicitly permitted.
:::

### Enable Default Deny

```bash
# Create default deny policy for all namespaces
# This policy selects all endpoints but has no ingress/egress rules,
# which means all traffic is denied by default
cat <<EOF | kubectl apply -f -
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: default-deny-all
spec:
  endpointSelector: {}
  ingress: []
  egress: []
EOF
```

::: danger Important
This policy DENIES ALL traffic cluster-wide. Apply namespace-specific allow policies
BEFORE enabling this, or your cluster will become unreachable.
Order of operations:
1. Apply all namespace-specific policies (below)
2. Verify connectivity for each service
3. Then apply the default-deny policy
:::

## Namespace Network Policies

### kube-system Namespace

```bash
cat <<EOF | kubectl apply -f -
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: kube-system-policy
  namespace: kube-system
spec:
  endpointSelector: {}
  ingress:
    # Allow all ingress from any namespace (system services)
    - fromEndpoints:
        - matchLabels: {}
    # Allow ingress from outside cluster (Cilium Ingress)
    - fromEntities:
        - world
        - cluster
  egress:
    # Allow DNS
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
            - port: "53"
              protocol: TCP
    # Allow all egress (system services need external access)
    - toEntities:
        - world
        - cluster
EOF
```

### Vault Namespace

```bash
cat <<EOF | kubectl apply -f -
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: vault-policy
  namespace: vault
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/name: vault
  ingress:
    # Allow from External Secrets Operator
    - fromEndpoints:
        - matchLabels:
            app.kubernetes.io/name: external-secrets
            k8s:io.kubernetes.pod.namespace: external-secrets
      toPorts:
        - ports:
            - port: "8200"
              protocol: TCP
    # Allow from Cilium Ingress
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            io.cilium.k8s.policy.serviceaccount: cilium-envoy
      toPorts:
        - ports:
            - port: "8200"
              protocol: TCP
    # Allow from monitoring (Prometheus)
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: monitoring
      toPorts:
        - ports:
            - port: "8200"
              protocol: TCP
  egress:
    # DNS
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
    # Kubernetes API (for auth)
    - toEntities:
        - kube-apiserver
      toPorts:
        - ports:
            - port: "6443"
              protocol: TCP
EOF
```

### Databases Namespace

```bash
cat <<EOF | kubectl apply -f -
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: postgresql-policy
  namespace: databases
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/name: postgresql-ha
  ingress:
    # Allow from services that need PostgreSQL
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: vault
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: mattermost
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: gitea
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: authentik
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: nextcloud
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: redcap
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: flipt
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
    # Allow monitoring
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: monitoring
      toPorts:
        - ports:
            - port: "9187"
              protocol: TCP
    # Allow internal replication
    - fromEndpoints:
        - matchLabels:
            app.kubernetes.io/name: postgresql-ha
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
  egress:
    # DNS
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
    # Internal replication
    - toEndpoints:
        - matchLabels:
            app.kubernetes.io/name: postgresql-ha
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
---
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: redis-policy
  namespace: databases
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/name: redis
  ingress:
    # Allow from services that need Redis
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: authentik
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: mattermost
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: gitea
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: nextcloud
      toPorts:
        - ports:
            - port: "6379"
              protocol: TCP
            - port: "26379"
              protocol: TCP
    # Allow monitoring
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: monitoring
      toPorts:
        - ports:
            - port: "9121"
              protocol: TCP
    # Allow internal replication
    - fromEndpoints:
        - matchLabels:
            app.kubernetes.io/name: redis
      toPorts:
        - ports:
            - port: "6379"
              protocol: TCP
            - port: "26379"
              protocol: TCP
  egress:
    # DNS
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
    # Internal replication
    - toEndpoints:
        - matchLabels:
            app.kubernetes.io/name: redis
      toPorts:
        - ports:
            - port: "6379"
              protocol: TCP
            - port: "26379"
              protocol: TCP
EOF
```

### Authentik Namespace

```bash
cat <<EOF | kubectl apply -f -
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: authentik-server-policy
  namespace: authentik
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/component: server
  ingress:
    # Allow from Cilium Ingress
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            io.cilium.k8s.policy.serviceaccount: cilium-envoy
      toPorts:
        - ports:
            - port: "9000"
              protocol: TCP
    # Allow from all services for OIDC authentication
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: mattermost
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: gitea
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: nextcloud
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: argocd
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: monitoring
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: ecrin
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: flipt
      toPorts:
        - ports:
            - port: "9000"
              protocol: TCP
    # Allow from Authentik Worker
    - fromEndpoints:
        - matchLabels:
            app.kubernetes.io/component: worker
      toPorts:
        - ports:
            - port: "9000"
              protocol: TCP
    # Allow from monitoring (Prometheus)
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: monitoring
      toPorts:
        - ports:
            - port: "9300"
              protocol: TCP
  egress:
    # DNS
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
    # PostgreSQL
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: databases
            app.kubernetes.io/name: postgresql-ha
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
    # Redis
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: databases
            app.kubernetes.io/name: redis
      toPorts:
        - ports:
            - port: "6379"
              protocol: TCP
    # External (email, webhooks)
    - toEntities:
        - world
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
            - port: "587"
              protocol: TCP
---
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: authentik-worker-policy
  namespace: authentik
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/component: worker
  ingress:
    # No direct ingress needed
    - fromEndpoints:
        - matchLabels:
            app.kubernetes.io/component: server
  egress:
    # DNS
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
    # PostgreSQL
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: databases
            app.kubernetes.io/name: postgresql-ha
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
    # Redis
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: databases
            app.kubernetes.io/name: redis
      toPorts:
        - ports:
            - port: "6379"
              protocol: TCP
    # Authentik Server
    - toEndpoints:
        - matchLabels:
            app.kubernetes.io/component: server
      toPorts:
        - ports:
            - port: "9000"
              protocol: TCP
    # External (email)
    - toEntities:
        - world
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
            - port: "587"
              protocol: TCP
---
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: authentik-outpost-policy
  namespace: authentik
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/component: outpost
  ingress:
    # Allow from Cilium Ingress (Forward Auth)
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            io.cilium.k8s.policy.serviceaccount: cilium-envoy
      toPorts:
        - ports:
            - port: "9000"
              protocol: TCP
            - port: "9443"
              protocol: TCP
  egress:
    # DNS
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
    # Authentik Server (API calls)
    - toEndpoints:
        - matchLabels:
            app.kubernetes.io/component: server
      toPorts:
        - ports:
            - port: "9000"
              protocol: TCP
    # Redis (session cache)
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: databases
            app.kubernetes.io/name: redis
      toPorts:
        - ports:
            - port: "6379"
              protocol: TCP
EOF
```

### Nextcloud Namespace

```bash
cat <<EOF | kubectl apply -f -
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: nextcloud-policy
  namespace: nextcloud
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/name: nextcloud
  ingress:
    # Allow from Cilium Ingress
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            io.cilium.k8s.policy.serviceaccount: cilium-envoy
      toPorts:
        - ports:
            - port: "80"
              protocol: TCP
  egress:
    # DNS
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
    # PostgreSQL
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: databases
            app.kubernetes.io/name: postgresql-ha
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
    # Redis
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: databases
            app.kubernetes.io/name: redis
      toPorts:
        - ports:
            - port: "6379"
              protocol: TCP
    # Authentik (OIDC)
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: authentik
            app.kubernetes.io/component: server
      toPorts:
        - ports:
            - port: "9000"
              protocol: TCP
    # SeaweedFS (S3 storage)
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: seaweedfs
      toPorts:
        - ports:
            - port: "8333"
              protocol: TCP
    # External (apps, updates)
    - toEntities:
        - world
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
EOF
```

### Flipt Namespace

```bash
cat <<EOF | kubectl apply -f -
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: flipt-policy
  namespace: flipt
spec:
  endpointSelector:
    matchLabels:
      app: flipt
  ingress:
    # Allow from Cilium Ingress (UI)
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            io.cilium.k8s.policy.serviceaccount: cilium-envoy
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
    # Allow from services that need feature flags (gRPC)
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: ecrin
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: nextcloud
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: mattermost
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: monitoring
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
            - port: "9000"
              protocol: TCP
    # Allow from monitoring (Prometheus)
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: monitoring
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
  egress:
    # DNS
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
    # PostgreSQL
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: databases
            app.kubernetes.io/name: postgresql-ha
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
    # Authentik (OIDC)
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: authentik
            app.kubernetes.io/component: server
      toPorts:
        - ports:
            - port: "9000"
              protocol: TCP
EOF
```

### Mattermost Namespace

```bash
cat <<EOF | kubectl apply -f -
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: mattermost-policy
  namespace: mattermost
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/name: mattermost-team-edition
  ingress:
    # Allow from Cilium Ingress
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            io.cilium.k8s.policy.serviceaccount: cilium-envoy
      toPorts:
        - ports:
            - port: "8065"
              protocol: TCP
  egress:
    # DNS
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
    # PostgreSQL
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: databases
            app.kubernetes.io/name: postgresql-ha
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
    # Redis
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: databases
            app.kubernetes.io/name: redis
      toPorts:
        - ports:
            - port: "6379"
              protocol: TCP
    # Authentik (OIDC)
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: authentik
            app.kubernetes.io/component: server
      toPorts:
        - ports:
            - port: "9000"
              protocol: TCP
    # External (push notifications, integrations)
    - toEntities:
        - world
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
EOF
```

### Gitea Namespace

```bash
cat <<EOF | kubectl apply -f -
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: gitea-policy
  namespace: gitea
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/name: gitea
  ingress:
    # Allow from Cilium Ingress (HTTP)
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            io.cilium.k8s.policy.serviceaccount: cilium-envoy
      toPorts:
        - ports:
            - port: "3000"
              protocol: TCP
    # Allow SSH from anywhere (NodePort)
    - fromEntities:
        - world
      toPorts:
        - ports:
            - port: "22"
              protocol: TCP
    # Allow from ArgoCD
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: argocd
      toPorts:
        - ports:
            - port: "3000"
              protocol: TCP
            - port: "22"
              protocol: TCP
  egress:
    # DNS
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
    # PostgreSQL
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: databases
            app.kubernetes.io/name: postgresql-ha
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
    # Redis
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: databases
            app.kubernetes.io/name: redis
      toPorts:
        - ports:
            - port: "6379"
              protocol: TCP
            - port: "26379"
              protocol: TCP
    # Authentik (OIDC)
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: authentik
            app.kubernetes.io/component: server
      toPorts:
        - ports:
            - port: "9000"
              protocol: TCP
    # External (webhooks, LFS, avatars)
    - toEntities:
        - world
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
EOF
```

### ArgoCD Namespace

```bash
cat <<EOF | kubectl apply -f -
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: argocd-policy
  namespace: argocd
spec:
  endpointSelector: {}
  ingress:
    # Allow from Cilium Ingress
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            io.cilium.k8s.policy.serviceaccount: cilium-envoy
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
    # Allow internal communication
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: argocd
  egress:
    # DNS
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
    # Kubernetes API
    - toEntities:
        - kube-apiserver
      toPorts:
        - ports:
            - port: "6443"
              protocol: TCP
    # Gitea (Git repos)
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: gitea
      toPorts:
        - ports:
            - port: "3000"
              protocol: TCP
            - port: "22"
              protocol: TCP
    # Authentik (OIDC)
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: authentik
            app.kubernetes.io/component: server
      toPorts:
        - ports:
            - port: "9000"
              protocol: TCP
    # External repos (GitHub, etc.)
    - toEntities:
        - world
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
            - port: "22"
              protocol: TCP
EOF
```

### Monitoring Namespace

```bash
cat <<EOF | kubectl apply -f -
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: monitoring-policy
  namespace: monitoring
spec:
  endpointSelector: {}
  ingress:
    # Allow from Cilium Ingress (Grafana)
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            io.cilium.k8s.policy.serviceaccount: cilium-envoy
      toPorts:
        - ports:
            - port: "3000"
              protocol: TCP
    # Allow internal communication
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: monitoring
  egress:
    # DNS
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
    # Scrape all namespaces (metrics)
    - toEndpoints:
        - matchLabels: {}
    # External (Grafana plugins, etc.)
    - toEntities:
        - world
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
EOF
```

## Verify Network Policies

```bash
# List all Cilium Network Policies
kubectl get ciliumnetworkpolicy -A

# List ClusterWide Policies
kubectl get ciliumclusterwidenetworkpolicy

# Check policy enforcement status
cilium status | grep "Policy Enforcement"

# Test connectivity to PostgreSQL (TCP check; should work)
kubectl exec -n mattermost deploy/mattermost-team-edition -- \
  sh -c "nc -zv postgresql-postgresql-ha-pgpool.databases.svc 5432"

# Test connectivity to Vault (TCP check; should fail if default-deny is active)
kubectl exec -n mattermost deploy/mattermost-team-edition -- \
  sh -c "nc -zv vault.vault.svc 8200"
```

## Pod Security Standards

### Apply Restricted Security Context

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
EOF
```

### Security Context Template for Deployments

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  fsGroup: 1000
  seccompProfile:
    type: RuntimeDefault
containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
          - ALL
```

## Audit Logging

Kubernetes audit logs are already enabled in Phase 2. To view them:

```bash
# View audit logs
tail -f /var/log/kubernetes/audit.log | jq

# Filter for specific user
grep '"user":.*admin' /var/log/kubernetes/audit.log | jq

# Filter for secrets access
grep '"resource":"secrets"' /var/log/kubernetes/audit.log | jq
```

## Security Checklist

### Infrastructure Layer

| Item | Status | Notes |
|------|--------|-------|
| etcd encryption | ✅ | AES-256-CBC |
| Longhorn LUKS | ✅ | All PVCs encrypted |
| WireGuard pod encryption | ✅ | Cilium managed |
| TLS certificates | ✅ | cert-manager + Let's Encrypt |

### Network Layer

| Item | Status | Notes |
|------|--------|-------|
| Default deny policy | ✅ | ClusterWide policy |
| Service-specific policies | ✅ | Per-namespace |
| Ingress TLS termination | ✅ | Cilium Envoy |
| Internal mTLS | ✅ | WireGuard |

### Application Layer

| Item | Status | Notes |
|------|--------|-------|
| SSO/OIDC | ✅ | Authentik |
| 2FA for admin services | ✅ | TOTP |
| Role-based access | ✅ | Per-service RBAC |
| Audit logging | ✅ | Kubernetes + Vault |

### Secrets Management

| Item | Status | Notes |
|------|--------|-------|
| Centralized secrets | ✅ | HashiCorp Vault |
| No plaintext secrets | ✅ | External Secrets Operator |
| Secret rotation | ✅ | Vault + ESO refresh |
| Sealed unseal keys | ✅ | Offline storage required |

## Validation Tests

```bash
# Test Network Policies
# Create a test pod
kubectl run test-pod --rm -it --restart=Never \
  --image=busybox -- sh

# From test pod, try to access services (should fail without policy)
wget -qO- --timeout=2 http://vault.vault.svc:8200/v1/sys/health
# Expected: Connection timed out (blocked by policy)

# Check Hubble for dropped flows
hubble observe --namespace vault --verdict DROPPED

# Verify Pod Security Standards
kubectl get ns --show-labels | grep pod-security

# Check audit logs for suspicious activity
grep -E '"verb":"(create|delete)".*"resource":"secrets"' \
  /var/log/kubernetes/audit.log | jq -r '.user.username'
```

## Expected Results

| Security Layer | Coverage |
|----------------|----------|
| Network Policies | All namespaces |
| Encryption at Rest | 100% |
| Encryption in Transit | 100% |
| Authentication | All services |
| 2FA | Admin services |
| Audit Logging | All API calls |

## Next Step

Proceed to [Phase 9: Operations](./09-operations.md) for backup procedures, secret rotation, and maintenance tasks.
