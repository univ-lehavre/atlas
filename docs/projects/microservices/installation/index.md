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
                    │ auth chat office ecrin redcap   │
                    │       git argocd grafana vault  │
                    └─────────────────────────────────┘

    Internal services (not exposed): PostgreSQL, Redis, SeaweedFS
```

## Key Design Principles

### 1. Centralized Secrets Management with Vault

All secrets are managed by HashiCorp Vault:
- No plaintext secrets on disk
- Automatic rotation support
- Audit logging for compliance
- Dynamic secrets for databases

### 2. Mutualized Databases

Instead of one database per service, we use shared clusters:
- **PostgreSQL HA**: Single cluster with multiple databases (Mattermost, Gitea, Vault)
- **Redis Sentinel**: Single cluster for sessions (Authelia, Mattermost, Gitea)

### 3. Encryption at Rest

All data is encrypted:
- **etcd**: AES-256 encryption for Kubernetes secrets
- **Longhorn**: LUKS encryption for all persistent volumes
- **Network**: WireGuard encryption between all pods (Cilium)

### 4. Zero-Trust Network

Cilium Network Policies enforce:
- Default deny all traffic
- Explicit allow rules per service
- L7 filtering where needed

## Components

| Component | Role | RAM | HA Replicas |
|-----------|------|-----|-------------|
| K3s | Kubernetes orchestration | ~500MB | 1 |
| Cilium | CNI + Ingress + mTLS | ~400MB | 1 |
| Longhorn | Encrypted storage | ~400MB | 1 |
| Vault | Secrets management | ~200MB | 1 |
| PostgreSQL | Shared database | ~500MB | 3 |
| Redis Sentinel | Shared cache/sessions | ~150MB | 3 |
| cert-manager | TLS certificates | ~100MB | 1 |
| SeaweedFS | S3-compatible storage | ~200MB | 3 |
| Authelia | SSO/OIDC provider | ~100MB | 1 |
| Mattermost | Team messaging | ~400MB | 1 |
| OnlyOffice | Collaborative editing | ~2GB | 1 |
| REDCap | Research forms | ~500MB | 1 |
| ECRIN | Researcher platform | ~200MB | 1 |
| Gitea | Git forge | ~300MB | 1 |
| ArgoCD | GitOps deployment | ~400MB | 1 |
| Prometheus | Metrics collection | ~500MB | 1 |
| Grafana | Dashboards | ~200MB | 1 |

**Total estimated**: ~7GB RAM minimum, 16GB recommended

## Service Access Matrix

| Service | URL | Auth | Who |
|---------|-----|------|-----|
| Vault | `vault.example.com` | 2FA | Admins |
| Authelia | `auth.example.com` | - | All |
| Mattermost | `chat.example.com` | 1FA | Researchers, Technicians |
| OnlyOffice | `office.example.com` | 1FA | Researchers, Technicians |
| ECRIN | `ecrin.example.com` | 1FA | Researchers |
| REDCap Surveys | `redcap.example.com/surveys/*` | None | Public |
| REDCap Projects | `redcap.example.com` | 1FA | Researchers |
| REDCap Admin | `redcap.example.com/ControlCenter/*` | 2FA | REDCap Admins |
| Gitea | `git.example.com` | 1FA | Developers, Researchers |
| ArgoCD | `argocd.example.com` | 2FA | Admins |
| Grafana | `grafana.example.com` | 2FA | Admins |
| Longhorn UI | `longhorn.example.com` | 2FA | Admins |
| Hubble UI | `hubble.example.com` | 2FA | Admins |

**Legend**: 1FA = password, 2FA = password + TOTP

## Installation Phases

1. [**System Preparation**](./01-preparation.md) - OS setup, firewall, prerequisites
2. [**K3s Core**](./02-k3s-core.md) - K3s, Cilium, Longhorn with encryption
3. [**Vault**](./03-vault.md) - Secrets management setup
4. [**Shared Databases**](./04-databases.md) - PostgreSQL HA, Redis Sentinel
5. [**Core Services**](./05-services.md) - Authelia, Mattermost, OnlyOffice, REDCap, ECRIN
6. [**DevOps**](./06-devops.md) - Gitea, ArgoCD
7. [**Monitoring**](./07-monitoring.md) - Prometheus, Grafana, alerting
8. [**Security**](./08-security.md) - Network policies, access control
9. [**Operations**](./09-operations.md) - Backups, secret rotation, maintenance

## Prerequisites

- Ubuntu 24.04 LTS server with root access
- Public IP address
- DNS records pointing to the server:
  - `vault.example.com`
  - `auth.example.com`
  - `chat.example.com`
  - `office.example.com`
  - `ecrin.example.com`
  - `redcap.example.com`
  - `git.example.com`
  - `argocd.example.com`
  - `grafana.example.com`
  - `longhorn.example.com`
  - `hubble.example.com`
- Minimum resources:
  - RAM: 16GB (32GB recommended for HA)
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
