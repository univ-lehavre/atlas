# ECRIN Infrastructure - Environnement de Developpement Local

Architecture Zero Trust pour l'environnement de developpement local sur macOS.

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

| Composant          | Role                                        | Port        |
| ------------------ | ------------------------------------------- | ----------- |
| **k3d**            | Cluster k3s dans Docker                     | -           |
| **Cilium**         | CNI + Ingress Controller + Network Policies | 8080 (HTTP) |
| **Hubble**         | Observabilite reseau Cilium                 | -           |
| **SPIRE**          | mTLS automatique (CA workload identity)     | -           |
| **Authelia**       | Authentification (magic links)              | 9091        |
| **OPA**            | Autorisation RBAC/ABAC (Rego)               | 8181        |
| **ecrin**          | Dashboard SvelteKit                         | 3000        |
| **redcap-service** | API interne REDCap                          | 3000        |
| **MailHog**        | Capture emails dev                          | 8025        |
| **Loki**           | Agregation logs                             | 3100        |
| **Grafana**        | Dashboards observabilite                    | 3000        |

## Prerequis

```bash
# macOS
brew install k3d kubectl helm cilium-cli

# Docker Desktop doit etre installe et demarre
```

## Demarrage rapide

```bash
# Demarrer l'environnement
./infra/scripts/setup.sh

# Arreter et nettoyer
./infra/scripts/teardown.sh
```

## URLs

| Service   | URL                             | Description             |
| --------- | ------------------------------- | ----------------------- |
| Dashboard | http://localhost:8080           | Application ecrin       |
| Authelia  | http://localhost:8080/authelia/ | Page de connexion       |
| MailHog   | http://localhost:8025           | UI emails (magic links) |
| Registry  | localhost:5111                  | Registre Docker local   |

### Acces supplementaires (port-forward)

```bash
# Grafana (dashboards audit)
kubectl port-forward svc/grafana 3000:3000 -n ecrin
# -> http://localhost:3000 (admin/admin)

# Hubble UI (observabilite reseau)
cilium hubble ui
# -> http://localhost:12000
```

## Utilisateurs de test

| Email                      | Role           | Groupes                    |
| -------------------------- | -------------- | -------------------------- |
| admin@univ-lehavre.fr      | Administrateur | admin, allowed-domain      |
| researcher@univ-lehavre.fr | Chercheur      | researcher, allowed-domain |
| viewer@univ-lehavre.fr     | Lecteur        | viewer, allowed-domain     |

**Mot de passe** : Authentification par magic link uniquement. Les emails arrivent dans MailHog.

## Structure des fichiers

```
infra/
├── k3d/
│   └── cluster.yaml              # Config k3d (ports, CNI, registry)
├── cilium/
│   └── values.yaml               # Helm values Cilium + Hubble + SPIRE
├── spire/
│   ├── namespace.yaml            # Namespace spire
│   ├── server.yaml               # SPIRE Server (CA)
│   ├── agent.yaml                # SPIRE Agent (DaemonSet)
│   └── registrations.yaml        # Documentation SPIFFE IDs
├── opa/
│   ├── deployment.yaml           # OPA server
│   └── configmap.yaml            # Policies Rego
├── observability/
│   ├── loki/
│   │   └── values.yaml           # Helm values Loki
│   └── grafana/
│       ├── values.yaml           # Helm values Grafana
│       ├── configmap.yaml        # Dashboards ConfigMap
│       └── dashboards/
│           └── audit.json        # Dashboard audit logs
├── manifests/
│   ├── namespace.yaml            # Namespace ecrin
│   ├── mailhog.yaml              # MailHog deployment
│   ├── ingress.yaml              # Cilium Ingress + forward-auth
│   ├── network-policies/
│   │   ├── default-deny.yaml     # Zero Trust: deny all par defaut
│   │   ├── ecrin-egress.yaml     # ecrin -> redcap-service, OPA
│   │   └── redcap-mtls.yaml      # mTLS obligatoire
│   ├── authelia/
│   │   ├── deployment.yaml       # Authelia deployment
│   │   ├── configmap.yaml        # Configuration
│   │   ├── users.yaml            # Utilisateurs dev
│   │   └── secrets.yaml          # Secrets dev (commites)
│   ├── redcap-service/
│   │   ├── deployment.yaml       # API deployment
│   │   └── secrets.yaml          # Token REDCap mock
│   └── ecrin/
│       └── deployment.yaml       # Dashboard deployment
└── scripts/
    ├── setup.sh                  # Script de demarrage
    └── teardown.sh               # Script de nettoyage
```

## k3d vs kind

Cette infrastructure utilise **k3d** (k3s dans Docker) au lieu de kind :

| Critere             | k3d        | kind                |
| ------------------- | ---------- | ------------------- |
| Base                | k3s        | Kubernetes upstream |
| RAM                 | ~512 MB    | ~1.2 GB             |
| Demarrage           | ~20s       | ~60s                |
| Registry local      | Integre    | Manuel              |
| Coherence avec prod | k3s sur VM | -                   |

### Avantages du registre local

```bash
# Build et push direct (plus de "kind load")
docker build -t localhost:5111/ecrin:dev packages/ecrin
docker push localhost:5111/ecrin:dev

# Rollout
kubectl rollout restart deployment/ecrin -n ecrin
```

## Securite - Architecture Zero Trust

### Principes appliques

| Principe                       | Implementation                              |
| ------------------------------ | ------------------------------------------- |
| **Never trust, always verify** | Chaque requete verifiee par Authelia + OPA  |
| **Least privilege**            | RBAC/ABAC via OPA, acces minimal par defaut |
| **Assume breach**              | mTLS partout, isolation reseau, audit logs  |
| **Micro-segmentation**         | Cilium Network Policies strictes            |
| **Encrypt everywhere**         | mTLS interne (SPIRE), TLS externe           |

### 4 niveaux d'autorisation

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. NETWORK (Cilium Network Policies)                            │
│    → Seul ecrin peut contacter redcap-service                  │
│    → Default deny sur tout le namespace                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. AUTHENTIFICATION (Authelia)                                  │
│    → Magic link email (domaine @univ-lehavre.fr)               │
│    → Session cookie securisee                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. AUTORISATION POLICY (OPA/Rego)                               │
│    → RBAC: admin, researcher, viewer                           │
│    → ABAC: owner du record                                     │
│    → Contexte: IP, risque                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. mTLS (SPIRE + Cilium)                                        │
│    → Identites workload automatiques                           │
│    → Certificats auto-generes et rotatifs                      │
└─────────────────────────────────────────────────────────────────┘
```

### Identites SPIFFE

```
spiffe://ecrin.local/ns/ecrin/sa/ecrin
spiffe://ecrin.local/ns/ecrin/sa/redcap-service
```

### Policies OPA (Rego)

```rego
# Admin: acces complet
allow if { "admin" in input.user.groups }

# Researcher: lecture + ecriture propres records
allow if { "researcher" in input.user.groups; input.action == "read" }
allow if { "researcher" in input.user.groups; input.action == "write"; input.resource.owner == input.user.email }

# Viewer: lecture seule
allow if { "viewer" in input.user.groups; input.action == "read" }

# Delete: admin uniquement
deny if { input.action == "delete"; not "admin" in input.user.groups }
```

## Routes publiques vs protegees

| Route          | Acces           | Description          |
| -------------- | --------------- | -------------------- |
| `/`            | Public          | Page d'accueil       |
| `/about`       | Public          | A propos             |
| `/authelia/*`  | Public          | Authentification     |
| `/dashboard/*` | Protege         | Tableau de bord      |
| `/records/*`   | Protege         | Gestion records      |
| `/users/*`     | Protege (admin) | Gestion utilisateurs |
| `/api/*`       | Protege         | API endpoints        |

## Flux d'authentification

```
1. User → localhost:8080/dashboard
2. Cilium Ingress → Authelia /api/authz/forward-auth
3. Pas de session → Redirect /authelia/
4. User entre email → Magic link envoye (MailHog)
5. Click sur le lien → Session creee
6. Redirect → /dashboard avec headers:
   - Remote-User: admin
   - Remote-Email: admin@univ-lehavre.fr
   - Remote-Groups: admin,allowed-domain
7. ecrin lit les headers → connait l'utilisateur
8. OPA verifie les autorisations
```

## Observabilite

### Logs d'audit

Tous les services emettent des logs JSON structures :

```json
{
  "timestamp": "2024-01-22T10:30:00Z",
  "level": "audit",
  "service": "ecrin",
  "user": "researcher@univ-lehavre.fr",
  "action": "read",
  "resource": "/records/123",
  "decision": "allow"
}
```

### Dashboard Grafana

Le dashboard "ECRIN Audit" affiche :

- Nombre d'acces autorises/refuses
- Timeline des decisions
- Repartition par utilisateur
- Details des acces refuses

### Hubble (reseau)

```bash
# UI web
cilium hubble ui

# CLI
hubble observe --namespace ecrin
```

## Commandes utiles

```bash
# Statut du cluster
kubectl get pods -n ecrin
kubectl get pods -n spire
cilium status
k3d cluster list

# Logs
kubectl logs -f deployment/ecrin -n ecrin
kubectl logs -f deployment/authelia -n ecrin
kubectl logs -f deployment/opa -n ecrin

# Network policies
kubectl get ciliumnetworkpolicies -n ecrin

# SPIRE identites
kubectl exec -n spire spire-server-0 -- /opt/spire/bin/spire-server entry show

# Test OPA policy
curl -X POST http://localhost:8181/v1/data/ecrin/authz/allow \
  -H "Content-Type: application/json" \
  -d '{"input":{"user":{"email":"admin@univ-lehavre.fr","groups":["admin"]},"action":"delete","resource":{"type":"record"}}}'

# Rebuild et push image (via registre local)
docker build -t localhost:5111/ecrin:dev packages/ecrin
docker push localhost:5111/ecrin:dev
kubectl rollout restart deployment/ecrin -n ecrin
```

## Secrets (dev uniquement)

Les secrets sont commites car c'est un environnement de dev local :

| Secret                | Valeur                                               |
| --------------------- | ---------------------------------------------------- |
| JWT Secret (Authelia) | `dev-jwt-secret-32-chars-minimum-for-authelia-hs256` |
| Session Secret        | `dev-session-secret-32-chars-minimum-for-authelia`   |
| REDCap Token          | `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`                   |

**Ne jamais utiliser ces valeurs en production.**

## Troubleshooting

### Le cluster ne demarre pas

```bash
# Verifier Docker
docker info

# Supprimer et recreer
k3d cluster delete ecrin
./infra/scripts/setup.sh
```

### Cilium n'est pas pret

```bash
cilium status
kubectl get pods -n kube-system -l k8s-app=cilium
```

### Pas d'email dans MailHog

1. Verifier que MailHog est running : `kubectl get pods -n ecrin -l app=mailhog`
2. Verifier les logs Authelia : `kubectl logs deployment/authelia -n ecrin`

### Acces refuse alors que je suis connecte

1. Verifier les headers : les routes protegees recoivent `Remote-User`, `Remote-Email`, `Remote-Groups`
2. Verifier OPA : `kubectl logs deployment/opa -n ecrin`
3. Verifier la policy dans [infra/opa/configmap.yaml](opa/configmap.yaml)

### mTLS ne fonctionne pas

```bash
# Verifier SPIRE
kubectl get pods -n spire
kubectl logs deployment/spire-server -n spire

# Verifier les identites enregistrees
kubectl exec -n spire deployment/spire-server -- /opt/spire/bin/spire-server entry show
```

### Probleme de registre local

```bash
# Verifier que le registre tourne
docker ps | grep ecrin-registry

# Tester le push
docker pull nginx:alpine
docker tag nginx:alpine localhost:5111/test:latest
docker push localhost:5111/test:latest
```

## Evolution vers la production

Cette architecture est concue pour evoluer vers un environnement de production :

| Dev (k3d)        | VM (k3s)         | Production             |
| ---------------- | ---------------- | ---------------------- |
| k3d local        | k3s natif        | k3s ou k8s manage      |
| Secrets commites | Secrets locaux   | Vault / Sealed Secrets |
| MailHog          | MailHog ou SMTP  | SMTP reel              |
| Loki single node | Loki single node | Loki distribue         |
| HTTP             | HTTP/HTTPS       | HTTPS (cert-manager)   |
| localhost        | IP VM            | Domaine reel           |
| local-path       | local-path       | Longhorn ou Rook/Ceph  |

Les configurations Cilium, SPIRE, OPA et Authelia sont reutilisables avec des ajustements mineurs.
