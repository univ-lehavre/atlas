# Microservices

Infrastructure documentation for deploying the ATLAS platform on Kubernetes.

## Documentation

- [Installation Guide](./installation/) - Complete 9-phase installation guide for a single-server K3s cluster

## Architecture Overview

The ATLAS microservices platform runs on K3s (lightweight Kubernetes) with the following components:

```
                              Internet
                                 │
                                 ▼
                    ┌─────────────────────────────────┐
                    │         Host Server             │
                    │         (Public IP)             │
                    │                                 │
                    │  ┌───────────────────────────┐  │
                    │  │           K3s             │  │
                    │  │       (Kubernetes)        │  │
                    │  └─────────────┬─────────────┘  │
                    │               │                 │
                    │  ┌─────────────▼─────────────┐  │
                    │  │      Cilium Ingress       │  │
                    │  │      (Envoy proxy)        │  │
                    │  │       :80 / :443          │  │
                    │  └─────────────┬─────────────┘  │
                    │               │                 │
                    │  ┌───┬───┬───┬┴──┬───┬───┬───┐  │
                    │  ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼  │
                    │ auth cloud chat ecrin redcap   │
                    │   git argocd grafana vault     │
                    │        flags hubble longhorn   │
                    └─────────────────────────────────┘

    Internal services (not exposed): PostgreSQL, Redis, SeaweedFS
```

### Components

| Component | Role | Technologies |
|-----------|------|--------------|
| **Orchestration** | Container management | K3s, containerd |
| **Networking** | CNI + Ingress + mTLS | Cilium (eBPF), Envoy, WireGuard |
| **Storage** | Persistent volumes | Longhorn (CNCF), LUKS encryption |
| **Object Storage** | S3-compatible | SeaweedFS |
| **Certificates** | TLS automation | cert-manager, Let's Encrypt |
| **Secrets** | Centralized secrets | HashiCorp Vault, External Secrets Operator |
| **IAM** | Identity & Access | Authentik (OIDC, MFA, Forward Auth) |
| **Feature Flags** | Feature management | Flipt (OpenFeature SDK) |
| **Messaging** | Team collaboration | Mattermost |
| **Files** | Drive + Collaboration | Nextcloud + OnlyOffice |
| **Research Forms** | Data capture | REDCap v16 |
| **Platform** | Researcher expertise | ECRIN (SvelteKit) |
| **Git Forge** | Source code hosting | Gitea |
| **GitOps CD** | Continuous deployment | ArgoCD |
| **Monitoring** | Metrics & Logs | Prometheus, Grafana, Loki |
| **Observability** | Network visibility | Hubble UI |

### Databases (Mutualized)

| Service | PostgreSQL | Redis |
|---------|------------|-------|
| Authentik | ✅ | ✅ |
| Mattermost | ✅ | ✅ |
| Nextcloud | ✅ | ✅ |
| Gitea | ✅ | ✅ |
| Vault | ✅ | - |
| Flipt | ✅ | - |
| REDCap | ✅ | - |

## Resource Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 16 GB | 32 GB |
| CPU | 4 cores | 8 cores |
| Disk | 200 GB | 500 GB |
| OS | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |

### Resource Breakdown

| Component | CPU Request | Memory Request | Storage |
|-----------|-------------|----------------|---------|
| K3s + Cilium | 500m | 900Mi | - |
| Longhorn | 200m | 400Mi | - |
| Vault | 100m | 200Mi | 10Gi |
| PostgreSQL HA (3 pods) | 300m | 1.5Gi | 30Gi |
| Redis Sentinel (3 pods) | 150m | 450Mi | - |
| Authentik | 225m | 576Mi | - |
| Mattermost | 100m | 256Mi | 10Gi |
| Nextcloud + OnlyOffice | 700m | 1.5Gi | 10Gi |
| SeaweedFS | 300m | 512Mi | 111Gi |
| REDCap | 100m | 256Mi | 60Gi |
| ECRIN | 50m | 128Mi | - |
| Flipt | 25m | 64Mi | - |
| Gitea | 100m | 256Mi | 20Gi |
| ArgoCD | 200m | 400Mi | - |
| Monitoring | 300m | 700Mi | 50Gi |
| **Total** | **~3.4 cores** | **~8Gi** | **~300Gi** |

## Service URLs

| Service | URL | Auth | Target Users |
|---------|-----|------|--------------|
| **Authentik** | auth.example.com | 2FA | Admins |
| **Nextcloud** | cloud.example.com | 1FA | Researchers, Technicians |
| **Mattermost** | chat.example.com | 1FA | Researchers, Technicians |
| **ECRIN** | ecrin.example.com | 1FA | Researchers |
| **REDCap** | redcap.example.com | 1FA/2FA | Researchers, Admins |
| **Gitea** | git.example.com | 1FA | Developers |
| **Flipt** | flags.example.com | 2FA | Admins, Developers |
| **ArgoCD** | argocd.example.com | 2FA | Admins |
| **Grafana** | grafana.example.com | 2FA | Admins |
| **Vault** | vault.example.com | 2FA | Admins |
| **Longhorn** | longhorn.example.com | 2FA | Admins |
| **Hubble** | hubble.example.com | 2FA | Admins |

## Installation Phases

1. [**System Preparation**](./installation/01-preparation.md) - OS setup, firewall, prerequisites
2. [**K3s Core**](./installation/02-k3s-core.md) - K3s, Cilium, Longhorn with encryption
3. [**Vault**](./installation/03-vault.md) - Secrets management setup
4. [**Databases**](./installation/04-databases.md) - PostgreSQL HA, Redis Sentinel
5. [**Services**](./installation/05-services.md) - Authentik, Mattermost, Nextcloud, REDCap, ECRIN, Flipt
6. [**DevOps**](./installation/06-devops.md) - Gitea, ArgoCD
7. [**Monitoring**](./installation/07-monitoring.md) - Prometheus, Grafana, Loki, alerting
8. [**Security**](./installation/08-security.md) - Network policies, access control
9. [**Operations**](./installation/09-operations.md) - Backups, secret rotation, maintenance

## Related Documentation

- [ECRIN Platform](/projects/ecrin/) - Researcher collaboration platform
- [CRF / REDCap](/projects/crf/) - Case Report Forms documentation
- [Infrastructure Guide](/guide/developers/infrastructure) - General infrastructure documentation
