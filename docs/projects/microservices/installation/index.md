# ATLAS Cluster Installation Guide

This guide documents the installation of the ATLAS Kubernetes cluster on a single server, designed for Le Havre Normandie University's research platform.

## Architecture Overview

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

## Key Design Principles

### 1. Centralized Identity Management with Authentik

All authentication is managed by Authentik:
- OIDC provider for all compatible services
- Forward Auth proxy for legacy services (REDCap, Longhorn, Hubble)
- MFA (TOTP, WebAuthn) for admin services
- Group-based access control
- Custom attributes for feature flags

### 2. Centralized Secrets Management with Vault

All secrets are managed by HashiCorp Vault:
- No plaintext secrets on disk
- Automatic rotation support via External Secrets Operator
- Audit logging for compliance
- Dynamic secrets for databases

### 3. Mutualized Databases

Instead of one database per service, we use shared clusters:
- **PostgreSQL HA**: Single cluster with multiple databases (Authentik, Mattermost, Nextcloud, Gitea, Vault, Flipt, REDCap)
- **Redis Sentinel**: Single cluster for sessions/cache (Authentik, Mattermost, Nextcloud, Gitea)

### 4. Encryption at Rest

All data is encrypted:
- **etcd**: AES-256 encryption for Kubernetes secrets
- **Longhorn**: LUKS encryption for all persistent volumes
- **Network**: WireGuard encryption between all pods (Cilium)

### 5. Zero-Trust Network

Cilium Network Policies enforce:
- Default deny all traffic
- Explicit allow rules per service
- L7 filtering where needed

### 6. Feature Flags with Flipt

Centralized feature flag management:
- OpenFeature SDK compatibility
- OIDC authentication via Authentik
- Audit logs for all flag changes
- GitOps support (flags as code)

## Components

| Component | Role | RAM | HA Replicas |
|-----------|------|-----|-------------|
| K3s | Kubernetes orchestration | ~500MB | 1 |
| Cilium | CNI + Ingress + mTLS | ~400MB | 1 |
| Longhorn | Encrypted storage | ~400MB | 1 |
| Vault | Secrets management | ~200MB | 1 |
| External Secrets | Vault → K8s secrets | ~100MB | 1 |
| PostgreSQL HA | Shared database | ~1.5GB | 3 |
| Redis Sentinel | Shared cache/sessions | ~450MB | 3 |
| cert-manager | TLS certificates | ~100MB | 1 |
| SeaweedFS | S3-compatible storage | ~500MB | 3 |
| Authentik | IAM/SSO/OIDC/MFA | ~576MB | 2 |
| Mattermost | Team messaging | ~256MB | 1 |
| Nextcloud | Files + collaboration | ~512MB | 1 |
| OnlyOffice DS | Document editing | ~1GB | 1 |
| REDCap | Research forms | ~256MB | 1 |
| ECRIN | Researcher platform | ~128MB | 1 |
| Flipt | Feature flags | ~64MB | 1 |
| Gitea | Git forge | ~256MB | 1 |
| ArgoCD | GitOps deployment | ~400MB | 1 |
| Prometheus | Metrics collection | ~500MB | 1 |
| Grafana | Dashboards | ~200MB | 1 |
| Loki | Log aggregation | ~256MB | 1 |

**Total estimated**: ~8GB RAM minimum, 16GB recommended

## Service Access Matrix

| Service | URL | Auth Method | Policy | Target Users |
|---------|-----|-------------|--------|--------------|
| Authentik | `auth.example.com` | Native | 2FA | Admins |
| Nextcloud | `cloud.example.com` | OIDC | 1FA | Researchers, Technicians |
| Mattermost | `chat.example.com` | OIDC | 1FA | Researchers, Technicians |
| ECRIN | `ecrin.example.com` | OIDC | 1FA | Researchers |
| REDCap Surveys | `redcap.example.com/surveys/*` | None | Bypass | Public |
| REDCap Projects | `redcap.example.com` | Forward Auth | 1FA | Researchers |
| REDCap Admin | `redcap.example.com/ControlCenter/*` | Forward Auth | 2FA | REDCap Admins |
| Gitea | `git.example.com` | OIDC | 1FA | Developers, Researchers |
| Flipt | `flags.example.com` | OIDC | 2FA | Admins, Developers |
| ArgoCD | `argocd.example.com` | OIDC | 2FA | Admins |
| Grafana | `grafana.example.com` | OIDC | 2FA | Admins |
| Vault | `vault.example.com` | OIDC | 2FA | Admins |
| Longhorn UI | `longhorn.example.com` | Forward Auth | 2FA | Admins |
| Hubble UI | `hubble.example.com` | Forward Auth | 2FA | Admins |

**Legend**: 1FA = password, 2FA = password + TOTP

## Installation Phases

1. [**System Preparation**](./01-preparation.md) - OS setup, firewall, prerequisites
2. [**K3s Core**](./02-k3s-core.md) - K3s, Cilium, Longhorn with encryption
3. [**Vault**](./03-vault.md) - Secrets management setup
4. [**Shared Databases**](./04-databases.md) - PostgreSQL HA, Redis Sentinel
5. [**Core Services**](./05-services.md) - Authentik, Mattermost, Nextcloud, REDCap, ECRIN, Flipt
6. [**DevOps**](./06-devops.md) - Gitea, ArgoCD
7. [**Monitoring**](./07-monitoring.md) - Prometheus, Grafana, Loki, alerting
8. [**Security**](./08-security.md) - Network policies, access control
9. [**Operations**](./09-operations.md) - Backups, secret rotation, maintenance

## Prerequisites

- Ubuntu 24.04 LTS server with root access
- Public IP address
- DNS records pointing to the server:
  - `auth.example.com` (Authentik)
  - `cloud.example.com` (Nextcloud)
  - `chat.example.com` (Mattermost)
  - `ecrin.example.com` (ECRIN)
  - `redcap.example.com` (REDCap)
  - `git.example.com` (Gitea)
  - `flags.example.com` (Flipt)
  - `argocd.example.com` (ArgoCD)
  - `grafana.example.com` (Grafana)
  - `vault.example.com` (Vault)
  - `longhorn.example.com` (Longhorn UI)
  - `hubble.example.com` (Hubble UI)
- Minimum resources:
  - RAM: 16GB (32GB recommended)
  - Disk: 200GB for `/var/lib/longhorn`
  - CPU: 4 cores (8 recommended)
- Admin IP for kubectl access (not exposed publicly)

## Quick Start

```bash
# Clone the installation scripts
git clone https://github.com/univ-lehavre/atlas-infra.git
cd atlas-infra

# Configure your domain and IPs
cp .env.example .env
vim .env

# Run the installation
./install.sh
```

Or follow the manual installation guides linked above.

## Admin Dashboard

After installation, administrators can access all services from Authentik's user interface, which provides links to:

| Service | Purpose |
|---------|---------|
| **Authentik** | Identity & Access Management |
| **Flipt** | Feature Flags |
| **Grafana** | Metrics & Logs |
| **ArgoCD** | GitOps Deployments |
| **Vault** | Secrets Management |
| **Longhorn** | Storage Management |
| **Hubble** | Network Observability |
