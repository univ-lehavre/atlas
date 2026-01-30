# Zero Trust Infrastructure

::: warning Project Not Implemented
This documentation describes a target architecture for a Zero Trust infrastructure. **It is not yet implemented.** The scripts and configurations mentioned do not currently exist in the repository.
:::

Atlas includes a local Kubernetes infrastructure with a complete Zero Trust architecture.

## Architecture

```
                         localhost:8080
                              │
                    ┌─────────▼───────────┐
                    │   Cilium Ingress    │
                    │   (forward-auth)    │
                    └─────────┬───────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    /authelia/*          /* (protected)       (not exposed)
         │                    │                    │
┌────────▼────────┐  ┌───────▼───────┐  ┌────────▼────────┐
│    Authelia     │  │     ecrin     │  │  redcap-service │
│  - Login page   │  │  - Dashboard  │  │  - REDCap API   │
│  - Magic links  │  │  - SvelteKit  │  │  - ClusterIP    │
│  - Verify API   │  │               │  │  (internal only)│
└────────┬────────┘  └───────┬───────┘  └────────▲────────┘
         │                   │                   │
         │                   │   mTLS (SPIRE)    │
         │                   └───────────────────┘
┌────────▼────────┐
│    MailHog      │  localhost:8025 (dev email UI)
└─────────────────┘
```

## Components

| Component        | Role                                              |
| ---------------- | ------------------------------------------------- |
| **k3d**          | k3s cluster in Docker                             |
| **Cilium**       | CNI + Ingress + Network Policies + mTLS           |
| **SPIRE**        | Workload identity + automatic certificates        |
| **Authelia**     | Authentication (magic links, restricted domain)   |
| **OPA**          | RBAC/ABAC authorization (Rego policies)           |
| **Loki/Grafana** | Audit logs + observability                        |
| **Hubble**       | Network observability                             |

## Quick Start

### Prerequisites

```bash
# macOS
brew install k3d kubectl helm cilium-cli
```

Docker Desktop must be installed and running.

### Startup

```bash
./infra/scripts/setup.sh
```

### URLs

| Service   | URL                             |
| --------- | ------------------------------- |
| Dashboard | http://localhost:8080           |
| Authelia  | http://localhost:8080/authelia/ |
| MailHog   | http://localhost:8025           |

### Shutdown

```bash
./infra/scripts/teardown.sh
```

## Test Users

| Email                      | Role          | Groups     |
| -------------------------- | ------------- | ---------- |
| admin@univ-lehavre.fr      | Administrator | admin      |
| researcher@univ-lehavre.fr | Researcher    | researcher |
| viewer@univ-lehavre.fr     | Viewer        | viewer     |

Authentication by **magic link** only. Emails arrive in MailHog.

## Zero Trust Principles

### 4 Authorization Levels

1. **Network** (Cilium Network Policies)
   - Default deny on the entire namespace
   - Only ecrin can contact redcap-service

2. **Authentication** (Authelia)
   - Magic link email
   - Restricted domain (@univ-lehavre.fr)

3. **Authorization** (OPA/Rego)
   - RBAC: admin, researcher, viewer
   - ABAC: record owner

4. **mTLS** (SPIRE + Cilium)
   - Automatic workload identities
   - Auto-rotating certificates

### OPA Policies

```txt
# Admin: full access
allow if { "admin" in input.user.groups }

# Researcher: read + write own records
allow if { "researcher" in input.user.groups; input.action == "read" }
allow if {
  "researcher" in input.user.groups
  input.action == "write"
  input.resource.owner == input.user.email
}

# Viewer: read only
allow if { "viewer" in input.user.groups; input.action == "read" }
```

## Observability

### Grafana

```bash
kubectl port-forward svc/grafana 3000:3000 -n ecrin
```

Then open http://localhost:3000 (admin/admin).

### Hubble

```bash
cilium hubble ui
```

### Logs

```bash
kubectl logs -f deployment/ecrin -n ecrin
kubectl logs -f deployment/authelia -n ecrin
kubectl logs -f deployment/opa -n ecrin
```

## Evolution to Production

| Dev (k3d)        | Production              |
| ---------------- | ----------------------- |
| Local k3d        | Native k3s or managed k8s |
| Committed secrets | Vault / Sealed Secrets  |
| MailHog          | Real SMTP               |
| HTTP             | HTTPS (cert-manager)    |
| localhost        | Real domain             |
| local-path       | Longhorn or Rook/Ceph   |

Cilium, SPIRE, OPA and Authelia configurations are reusable with minor adjustments.

## Complete Documentation

See [infra/README.md](https://github.com/univ-lehavre/atlas/blob/main/infra/README.md) for detailed documentation.
