# Infrastructure Zero Trust

Atlas inclut une infrastructure Kubernetes locale avec une architecture Zero Trust complete.

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
    /authelia/*          /* (protege)        (non expose)
         │                    │                    │
┌────────▼────────┐  ┌───────▼───────┐  ┌────────▼────────┐
│    Authelia     │  │     ecrin     │  │  redcap-service │
│  - Login page   │  │  - Dashboard  │  │  - API REDCap   │
│  - Magic links  │  │  - SvelteKit  │  │  - ClusterIP    │
│  - Verify API   │  │               │  │  (interne seul) │
└────────┬────────┘  └───────┬───────┘  └────────▲────────┘
         │                   │                   │
         │                   │   mTLS (SPIRE)    │
         │                   └───────────────────┘
┌────────▼────────┐
│    MailHog      │  localhost:8025 (UI emails dev)
└─────────────────┘
```

## Composants

| Composant        | Role                                              |
| ---------------- | ------------------------------------------------- |
| **k3d**          | Cluster k3s dans Docker                           |
| **Cilium**       | CNI + Ingress + Network Policies + mTLS           |
| **SPIRE**        | Workload identity + certificats automatiques      |
| **Authelia**     | Authentification (magic links, domaine restreint) |
| **OPA**          | Autorisation RBAC/ABAC (Rego policies)            |
| **Loki/Grafana** | Audit logs + observabilite                        |
| **Hubble**       | Observabilite reseau                              |

## Demarrage rapide

### Prerequis

```bash
# macOS
brew install k3d kubectl helm cilium-cli
```

Docker Desktop doit etre installe et demarre.

### Demarrage

```bash
./infra/scripts/setup.sh
```

### URLs

| Service   | URL                             |
| --------- | ------------------------------- |
| Dashboard | http://localhost:8080           |
| Authelia  | http://localhost:8080/authelia/ |
| MailHog   | http://localhost:8025           |

### Arret

```bash
./infra/scripts/teardown.sh
```

## Utilisateurs de test

| Email                      | Role           | Groupes    |
| -------------------------- | -------------- | ---------- |
| admin@univ-lehavre.fr      | Administrateur | admin      |
| researcher@univ-lehavre.fr | Chercheur      | researcher |
| viewer@univ-lehavre.fr     | Lecteur        | viewer     |

Authentification par **magic link** uniquement. Les emails arrivent dans MailHog.

## Principes Zero Trust

### 4 niveaux d'autorisation

1. **Network** (Cilium Network Policies)
   - Default deny sur tout le namespace
   - Seul ecrin peut contacter redcap-service

2. **Authentication** (Authelia)
   - Magic link email
   - Domaine restreint (@univ-lehavre.fr)

3. **Authorization** (OPA/Rego)
   - RBAC: admin, researcher, viewer
   - ABAC: owner du record

4. **mTLS** (SPIRE + Cilium)
   - Identites workload automatiques
   - Certificats auto-rotatifs

### Policies OPA

```rego
# Admin: acces complet
allow if { "admin" in input.user.groups }

# Researcher: lecture + ecriture propres records
allow if { "researcher" in input.user.groups; input.action == "read" }
allow if {
  "researcher" in input.user.groups
  input.action == "write"
  input.resource.owner == input.user.email
}

# Viewer: lecture seule
allow if { "viewer" in input.user.groups; input.action == "read" }
```

## Observabilite

### Grafana

```bash
kubectl port-forward svc/grafana 3000:3000 -n ecrin
```

Puis ouvrir http://localhost:3000 (admin/admin).

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

## Evolution vers la production

| Dev (k3d)        | Production              |
| ---------------- | ----------------------- |
| k3d local        | k3s natif ou k8s manage |
| Secrets commites | Vault / Sealed Secrets  |
| MailHog          | SMTP reel               |
| HTTP             | HTTPS (cert-manager)    |
| localhost        | Domaine reel            |
| local-path       | Longhorn ou Rook/Ceph   |

Les configurations Cilium, SPIRE, OPA et Authelia sont reutilisables avec des ajustements mineurs.

## Documentation complete

Voir [infra/README.md](https://github.com/univ-lehavre/atlas/blob/main/infra/README.md) pour la documentation detaillee.
