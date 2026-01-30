# ATLAS Cluster Installation Procedure on Single-Server Kubernetes

## Architecture cible

### 1. Vue d'ensemble - Flux réseau externe

```
                              Internet
                                 │
                                 ▼
                    ┌─────────────────────────────────┐
                    │         Serveur Hôte            │
                    │         (IP publique)           │
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
                    │              git  argo          │
                    └─────────────────────────────────┘

    Services internes (non exposés) : SeaweedFS
```

### 2. Composants K3s et Cilium

```
┌─────────────────────────────────────────────────────────┐
│                        K3s                               │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Composants intégrés                 │    │
│  │                                                  │    │
│  │  containerd ─── Runtime de conteneurs (OCI)     │    │
│  │  CoreDNS ────── DNS interne du cluster          │    │
│  │  Metrics ────── kubectl top nodes/pods          │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Longhorn (Stockage)                 │    │
│  │                                                  │    │
│  │  Block Storage ── Volumes persistants répliqués │    │
│  │  Snapshots ────── Sauvegardes instantanées      │    │
│  │  Backups ──────── Export vers S3 (SeaweedFS)    │    │
│  │  UI ───────────── Interface web de gestion      │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Cilium (CNI + Ingress)              │    │
│  │                                                  │    │
│  │  eBPF ────────── Réseau haute performance       │    │
│  │  Ingress ─────── Envoy proxy L7 (remplace       │    │
│  │                  Traefik de K3s)                  │    │
│  │  NetworkPolicy ─ Politiques réseau L3/L4/L7     │    │
│  │  Hubble ──────── Observabilité réseau           │    │
│  │  Service Mesh ── Chiffrement mTLS (optionnel)   │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 3. Namespaces et isolation

```
┌──────────────────────────────────────────────────────────────────────┐
│                              K3s Cluster                              │
│                                                                       │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐│
│  │ authelia  │ │ mattermost│ │ onlyoffice│ │  redcap   │ │   ecrin   ││
│  │           │ │           │ │           │ │           │ │           ││
│  │ Authelia  │ │Mattermost │ │ OnlyOffice│ │ REDCap 16 │ │  SvelteKit││
│  │ Redis     │ │PostgreSQL │ │           │ │ MariaDB     │ │           ││
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘│
│                                                                       │
│  ┌───────────┐                                                        │
│  │   gitea   │                                                        │
│  │           │                                                        │
│  │  Gitea    │                                                        │
│  │PostgreSQL │                                                        │
│  │  + CI     │                                                        │
│  └───────────┘                                                        │
│                                                                       │
│  ┌─────────────┐                                                      │
│  │  seaweedfs  │                                                      │
│  │  S3 Storage │                                                      │
│  └─────────────┘                                                      │
│                                                                       │
│  ┌─────────────┐  ┌───────────────┐  ┌─────────────────────────┐   │
│  │cert-manager │  │longhorn-system│  │       kube-system       │   │
│  │             │  │               │  │                         │   │
│  │ Let's       │  │  Stockage +   │  │  CoreDNS, Cilium        │   │
│  │ Encrypt     │  │  Backups → S3 │  │                         │   │
│  └─────────────┘  └───────────────┘  └─────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### 4. Flux de requête HTTP

```
   Navigateur
       │
       │ https://chat.example.com
       ▼
┌─────────────────┐
│  Cilium Ingress │  ← Envoy proxy (écoute :443)
│                 │
│  TLS terminé    │  ← Certificat Let's Encrypt (via cert-manager)
│  (HTTPS → HTTP) │
└────────┬────────┘
         │ Host: chat.example.com
         ▼
┌─────────────────┐
│    Ingress      │  ← Règle de routage Kubernetes
│  (mattermost)   │  ← ingressClassName: cilium
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Service      │  ← ClusterIP interne
│  (mattermost    │
│   :8065)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│      Pod        │  ← Conteneur applicatif
│  (Mattermost)   │
│   :8065         │
└─────────────────┘
```

### 5. Stockage persistant avec Longhorn

```
┌───────────────────────────────────────────────────────────────────┐
│                    Stockage Longhorn                               │
│                                                                    │
│   Application          PVC                  Longhorn Volume        │
│   (demande)        (allocation)            (répliqué + snapshots)  │
│                                                                    │
│  ┌──────────┐     ┌──────────┐     ┌────────────────────────┐     │
│  │PostgreSQL│ ──▶ │  20 Gi   │ ──▶ │  /var/lib/longhorn/    │     │
│  └──────────┘     └──────────┘     │  replicas/             │     │
│                                    │  pvc-xxx-postgres/     │     │
│  ┌──────────┐     ┌──────────┐     ├────────────────────────┤     │
│  │ MariaDB    │ ──▶ │  10 Gi   │ ──▶ │  pvc-xxx-mariadb/        │     │
│  └──────────┘     └──────────┘     ├────────────────────────┤     │
│                                    │  pvc-xxx-redis/        │     │
│  ┌──────────┐     ┌──────────┐     ├────────────────────────┤     │
│  │SeaweedFS │ ──▶ │  65 Gi   │ ──▶ │  pvc-xxx-seaweed/      │     │
│  └──────────┘     └──────────┘     └────────────────────────┘     │
│                                                                    │
│   StorageClass: longhorn (CNCF incubating)                        │
│   Fonctionnalités: snapshots, backups S3, restauration            │
└───────────────────────────────────────────────────────────────────┘
```

### 6. Résumé des ressources Kubernetes utilisées

| Ressource         | Rôle                   | Exemple                      |
| ----------------- | ---------------------- | ---------------------------- |
| **Namespace**     | Isolation logique      | `mattermost`, `authelia`     |
| **Deployment**    | Gestion pods sans état | Authelia, OnlyOffice, ECRIN  |
| **StatefulSet**   | Pods avec état         | PostgreSQL, MariaDB, Redis     |
| **Service**       | Réseau interne         | `mattermost:8065`            |
| **Ingress**       | Routing HTTP externe   | `chat.example.com → :8065`   |
| **PVC**           | Demande stockage       | `20Gi` pour PostgreSQL       |
| **ConfigMap**     | Config non sensible    | Configuration Authelia       |
| **Secret**        | Données sensibles      | Mots de passe, certificats   |
| **ClusterIssuer** | Config Let's Encrypt   | `letsencrypt-prod`           |
| **Certificate**   | Cert TLS auto-géré     | `mattermost-tls`             |

### Stack technique

| Composant              | Rôle                                | Ressources estimées |
| ---------------------- | ----------------------------------- | ------------------- |
| K3s                    | Orchestration Kubernetes            | ~500-800MB RAM      |
| containerd             | Runtime de conteneurs (inclus K3s)  | -                   |
| Cilium                 | CNI eBPF + Ingress Controller       | ~300-400MB RAM      |
| CoreDNS                | DNS interne cluster (inclus K3s)    | -                   |
| Longhorn               | Stockage distribué + Backups S3     | ~300-500MB RAM      |
| cert-manager           | Certificats TLS Let's Encrypt       | ~100MB RAM          |
| PostgreSQL             | Base de données Mattermost + REDCap | ~300-500MB RAM      |
| MariaDB                  | Base de données REDCap              | ~200-300MB RAM      |
| Redis                  | Sessions Authelia                   | ~20-50MB RAM        |
| SeaweedFS              | Stockage S3-compatible              | ~200MB RAM          |
| OnlyOffice             | Édition collaborative               | ~1.5-2GB RAM        |
| Authelia               | SSO/OIDC Provider                   | ~100MB RAM          |
| Mattermost             | Messagerie d'équipe                 | ~300-500MB RAM      |
| REDCap                 | Formulaires de recherche (v16)      | ~500MB RAM          |
| ECRIN                  | Plateforme collaboration chercheurs | ~200MB RAM          |
| Gitea                  | Forge Git self-hosted               | ~200-300MB RAM      |
| ArgoCD                 | GitOps CD (déploiement continu)     | ~300-500MB RAM      |

**Total estimé** : 12-14GB RAM, 4 CPU cores

### Résumé des accès

| Service | URL | Authentification | Qui a accès | Notes |
|---------|-----|------------------|-------------|-------|
| **Authelia** | `auth.example.com` | - | Tous | Portail SSO |
| **Mattermost** | `chat.example.com` | Authelia (1FA) | Chercheurs, Techniciens | Messagerie d'équipe |
| **OnlyOffice** | `office.example.com` | Authelia (1FA) | Chercheurs, Techniciens | Édition collaborative |
| **ECRIN** | `ecrin.example.com` | Authelia (1FA) | Chercheurs | Plateforme collaboration |
| **REDCap Surveys** | `redcap.example.com/surveys/*` | **Aucune** | Public | Formulaires enquêtés |
| **REDCap Projets** | `redcap.example.com` | Authelia (1FA) | Chercheurs, Admins REDCap | Saisie de données |
| **REDCap Admin** | `redcap.example.com/ControlCenter/*` | Authelia (2FA) | Admins REDCap | Administration |
| **REDCap API** | Interne uniquement | - | ECRIN | Non exposé sur internet |
| **Gitea** | `git.example.com` | Authelia (1FA) | Admins, Chercheurs, Développeurs | Forge Git |
| **ArgoCD** | `argocd.example.com` | Authelia (2FA) | Admins | GitOps CD |
| **Hubble UI** | `hubble.example.com` | Authelia (2FA) | Admins | Observabilité réseau |
| **Longhorn UI** | `longhorn.example.com` | Authelia (2FA) | Admins | Gestion stockage |
| **SeaweedFS** | Interne uniquement | - | Longhorn, REDCap | Stockage S3 |

**Légende** : 1FA = mot de passe, 2FA = mot de passe + TOTP

### Composants K3s et réseau

K3s inclut par défaut plusieurs composants essentiels. Flannel (CNI par défaut) est désactivé et remplacé par Cilium :

| Composant          | Source       | Description                                                      |
| ------------------ | ------------ | ---------------------------------------------------------------- |
| **containerd**     | K3s intégré  | Runtime de conteneurs OCI, remplace Docker                       |
| **Cilium**         | Helm externe | CNI eBPF + Ingress Controller (Envoy), Network Policies L3/L4/L7 |
| **CoreDNS**        | K3s intégré  | Résolution DNS interne du cluster                                |
| **Longhorn**       | Helm externe | Stockage distribué avec snapshots et backups S3 (CNCF)           |
| **Metrics Server** | K3s intégré  | Métriques CPU/RAM pour kubectl top                               |

#### Pourquoi Cilium plutôt que Flannel ?

| Critère              | Flannel                 | Cilium                             |
| -------------------- | ----------------------- | ---------------------------------- |
| **Performance**      | VXLAN (userspace)       | eBPF (kernel) - plus rapide        |
| **Network Policies** | Non supporté nativement | L3/L4/L7 intégré                   |
| **Observabilité**    | Limitée                 | Hubble (visualisation flux réseau) |
| **mTLS**             | Non                     | Optionnel (service mesh)           |
| **Complexité**       | Simple                  | Modérée                            |

---

## Prérequis

- Serveur Ubuntu 22.04+ / 24.04 avec accès root
- IP publique
- Domaines DNS configurés pointant vers le serveur :
  - `auth.votre-domaine.com` → IP serveur
  - `chat.votre-domaine.com` → IP serveur
  - `office.votre-domaine.com` → IP serveur
  - `redcap.votre-domaine.com` → IP serveur
  - `ecrin.votre-domaine.com` → IP serveur
  - `git.votre-domaine.com` → IP serveur
  - `argocd.votre-domaine.com` → IP serveur
- Ressources minimales :
  - RAM libre : >12GB
  - Disque libre : >100GB (pour `/var/lib/longhorn`)
  - CPU : 4+ cores

---

## PHASE 1 : Préparation du système

### Actions

```bash
# Connexion SSH
ssh root@votre-ip

# Mise à jour système
apt update && apt upgrade -y

# Installation prérequis
apt install -y curl wget git vim ufw open-iscsi

# Activer iSCSI (requis par Longhorn)
systemctl enable iscsid
systemctl start iscsid

# Configuration firewall
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (Let's Encrypt)
ufw allow 443/tcp   # HTTPS
ufw allow 6443/tcp  # K8s API
ufw enable
```

### Tests de validation

```bash
# Vérifier version Ubuntu
lsb_release -a
# Attendu : Ubuntu 22.04+ ou 24.04 LTS

# Vérifier firewall
ufw status numbered
# Attendu : ports 22, 80, 443, 6443 ALLOW

# Vérifier ressources
free -h    # RAM disponible (>6GB)
df -h      # Espace disque (>50GB)
nproc      # CPU cores (2+)

# Vérifier iSCSI (requis par Longhorn)
systemctl status iscsid
# Attendu : active (running)
```

---

## PHASE 2 : Installation K3s et Helm

### Actions

```bash
# Installation K3s SANS Flannel, Traefik ni local-storage
# Cilium = CNI + Ingress, Longhorn = stockage
curl -sfL https://get.k3s.io | sh -s - \
  --write-kubeconfig-mode 644 \
  --flannel-backend=none \
  --disable-network-policy \
  --disable=traefik \
  --disable=local-storage

# Attendre démarrage (30-60s)
sleep 60

# Configuration kubectl
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
echo 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml' >> ~/.bashrc

# Installation Helm 3
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Ajout des repos Helm nécessaires
helm repo add jetstack https://charts.jetstack.io
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add seaweedfs https://seaweedfs.github.io/seaweedfs/helm
helm repo add mattermost https://helm.mattermost.com
helm repo add cilium https://helm.cilium.io/
helm repo add longhorn https://charts.longhorn.io
helm repo add gitea https://dl.gitea.io/charts/
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update
```

> **Note** : À ce stade, le node est NotReady car aucun CNI n'est installé. C'est normal.

### Installation Cilium (CNI + Ingress Controller)

```bash
# Installer Cilium CLI (optionnel mais recommandé)
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
curl -L --fail --remote-name-all \
  https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz
tar xzvfC cilium-linux-amd64.tar.gz /usr/local/bin
rm cilium-linux-amd64.tar.gz

# Installer Cilium via Helm avec Ingress Controller activé
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set operator.replicas=1 \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set ingressController.enabled=true \
  --set ingressController.default=true \
  --set ingressController.loadbalancerMode=shared \
  --set kubeProxyReplacement=true

# Attendre que Cilium soit prêt (2-3 minutes)
kubectl wait --for=condition=ready pod \
  -l k8s-app=cilium -n kube-system --timeout=300s
```

> **Note** : `ingressController.default=true` fait de Cilium l'Ingress Controller par défaut.
> `kubeProxyReplacement=true` permet à Cilium de remplacer kube-proxy pour de meilleures performances.

### Installation Longhorn (stockage distribué)

```bash
# Créer namespace Longhorn
kubectl create namespace longhorn-system

# Installer Longhorn
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --set defaultSettings.defaultDataPath=/var/lib/longhorn \
  --set defaultSettings.defaultReplicaCount=1 \
  --set defaultSettings.backupTarget="s3://longhorn-backups@us-east-1/" \
  --set defaultSettings.backupTargetCredentialSecret=longhorn-s3-credentials

# Attendre que Longhorn soit prêt (2-3 minutes)
kubectl wait --for=condition=ready pod \
  -l app=longhorn-manager -n longhorn-system --timeout=300s

# Définir Longhorn comme StorageClass par défaut
kubectl patch storageclass longhorn -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

> **Note** : `defaultReplicaCount=1` car nous sommes sur un serveur unique. En cluster multi-nœuds, utiliser 2 ou 3 réplicas.

### Tests de validation

```bash
# Vérifier node (doit être Ready maintenant)
kubectl get nodes
# Attendu : 1 node Ready

# Vérifier pods système (incluant Cilium)
kubectl get pods -A
# Attendu : coredns, metrics-server, cilium, cilium-operator, cilium-envoy Running

# Vérifier statut Cilium
cilium status
# Attendu : OK pour tous les composants

# Vérifier Cilium Ingress Controller
kubectl get svc -n kube-system cilium-ingress
# Attendu : LoadBalancer avec EXTERNAL-IP

# Vérifier Longhorn
kubectl get pods -n longhorn-system
# Attendu : longhorn-manager, longhorn-driver, longhorn-csi Running

# Vérifier StorageClass par défaut
kubectl get storageclass
# Attendu : longhorn (default)

# Version Helm
helm version
# Attendu : v3.x.x

# Métriques du node
kubectl top nodes
# Attendu : affichage CPU/RAM
```

**Métriques attendues** :

- Node status : Ready
- System pods : 100% Running (incluant cilium, cilium-operator, longhorn)
- Cilium status : OK
- Longhorn StorageClass : default
- K3s + Cilium + Longhorn RAM : ~1-1.5GB

---

## PHASE 3 : cert-manager et ClusterIssuers

### Actions

```bash
# Créer namespace
kubectl create namespace cert-manager

# Installer cert-manager (dernière version disponible)
# Vérifier la dernière version : helm search repo jetstack/cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --set crds.enabled=true

# Attendre déploiement
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/instance=cert-manager \
  -n cert-manager --timeout=120s
```

### Configuration DNS

Créer les enregistrements A dans votre DNS :

```
auth.votre-domaine.com    → IP-du-serveur
chat.votre-domaine.com    → IP-du-serveur
office.votre-domaine.com  → IP-du-serveur
redcap.votre-domaine.com  → IP-du-serveur
ecrin.votre-domaine.com   → IP-du-serveur
git.votre-domaine.com     → IP-du-serveur
argocd.votre-domaine.com  → IP-du-serveur
```

### ClusterIssuers Let's Encrypt

```bash
# Créer les ClusterIssuers (staging + prod)
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: votre-email@domaine.com
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
    email: votre-email@domaine.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - http01:
        ingress:
          class: cilium
EOF
```

### Tests de validation

```bash
# Vérifier pods cert-manager
kubectl get pods -n cert-manager
# Attendu : 3 pods Running (cert-manager, webhook, cainjector)

# Test DNS
dig auth.votre-domaine.com +short
dig chat.votre-domaine.com +short
dig office.votre-domaine.com +short
dig redcap.votre-domaine.com +short
dig ecrin.votre-domaine.com +short
dig git.votre-domaine.com +short
dig argocd.votre-domaine.com +short
# Attendu : votre IP serveur pour tous les domaines

# Vérifier ClusterIssuers
kubectl get clusterissuer
# Attendu : letsencrypt-staging et letsencrypt-prod Ready
```

**Métriques attendues** :

- cert-manager pods : 3/3 Running
- DNS propagation : <5min
- ClusterIssuers : 2 Ready (staging + prod)

---

## PHASE 4 : PostgreSQL pour Mattermost

### Actions

```bash
# Créer namespace
kubectl create namespace mattermost

# Générer les mots de passe
export POSTGRES_PASSWORD=$(openssl rand -base64 24)
export MATTERMOST_DB_PASSWORD=$(openssl rand -base64 24)

# Créer fichier secrets (à sauvegarder en lieu sûr)
cat > ~/k3s-secrets.env <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
MATTERMOST_DB_PASSWORD=${MATTERMOST_DB_PASSWORD}
EOF
chmod 600 ~/k3s-secrets.env

# Installer PostgreSQL
helm install postgresql bitnami/postgresql \
  --namespace mattermost \
  --set auth.postgresPassword="${POSTGRES_PASSWORD}" \
  --set auth.username=mattermost \
  --set auth.password="${MATTERMOST_DB_PASSWORD}" \
  --set auth.database=mattermost \
  --set primary.persistence.size=20Gi

# Attendre déploiement
kubectl wait --for=condition=ready pod postgresql-0 \
  -n mattermost --timeout=300s
```

### Tests de validation

```bash
# Vérifier pods
kubectl get pods -n mattermost
# Attendu : postgresql-0 Running

# Vérifier PVC
kubectl get pvc -n mattermost
# Attendu : PVC Bound

# Test connexion PostgreSQL
kubectl exec -it postgresql-0 -n mattermost -- \
  psql -U postgres -c "SELECT 1"
# Attendu : ?column? = 1

# Vérifier base de données Mattermost
kubectl exec -it postgresql-0 -n mattermost -- \
  psql -U postgres -c "\\l" | grep mattermost
# Attendu : mattermost database listed
```

**Métriques attendues** :

- Pod status : Running
- PVC : Bound, 20Gi
- Database : mattermost créée
- RAM PostgreSQL : ~200-300MB

---

## PHASE 5 : Redis pour Authelia

### Actions

```bash
# Créer namespace
kubectl create namespace authelia

# Générer le mot de passe
export REDIS_PASSWORD=$(openssl rand -base64 24)
echo "REDIS_PASSWORD=${REDIS_PASSWORD}" >> ~/k3s-secrets.env

# Installer Redis (standalone suffit)
helm install redis bitnami/redis \
  --namespace authelia \
  --set architecture=standalone \
  --set auth.password="${REDIS_PASSWORD}" \
  --set master.persistence.size=1Gi \
  --set replica.replicaCount=0

# Attendre déploiement
kubectl wait --for=condition=ready pod redis-master-0 \
  -n authelia --timeout=120s
```

### Tests de validation

```bash
# Vérifier pods
kubectl get pods -n authelia
# Attendu : redis-master-0 Running

# Test connexion Redis
kubectl exec -it redis-master-0 -n authelia -- \
  redis-cli -a "${REDIS_PASSWORD}" ping
# Attendu : PONG

# Test set/get
kubectl exec -it redis-master-0 -n authelia -- \
  redis-cli -a "${REDIS_PASSWORD}" set test "hello"
kubectl exec -it redis-master-0 -n authelia -- \
  redis-cli -a "${REDIS_PASSWORD}" get test
# Attendu : "hello"
```

**Métriques attendues** :

- Pod status : Running
- RAM Redis : ~20-50MB
- Response time : <1ms

---

## PHASE 6 : SeaweedFS (stockage S3)

> **Note importante** : Utiliser le chart officiel SeaweedFS, pas Bitnami (subscription requise pour les images).

### Actions

```bash
# Créer namespace
kubectl create namespace seaweedfs

# Installer SeaweedFS (images officielles)
helm install seaweedfs seaweedfs/seaweedfs \
  --namespace seaweedfs \
  --set master.replicas=1 \
  --set volume.replicas=1 \
  --set filer.replicas=1 \
  --set filer.s3.enabled=true \
  --set filer.s3.port=8333 \
  --set master.persistence.size=5Gi \
  --set filer.persistence.size=10Gi \
  --set volume.persistence.size=50Gi

# Attendre déploiement
kubectl wait --for=condition=ready pod seaweedfs-master-0 \
  -n seaweedfs --timeout=180s
```

### Tests de validation

```bash
# Vérifier pods
kubectl get pods -n seaweedfs
# Attendu : master, volume, filer, s3 Running

# Vérifier services
kubectl get svc -n seaweedfs
# Attendu : seaweedfs-s3 sur port 8333

# Test S3 API (optionnel, nécessite aws-cli)
apt install -y awscli
kubectl port-forward -n seaweedfs svc/seaweedfs-s3 8333:8333 &
sleep 5
aws configure set aws_access_key_id admin
aws configure set aws_secret_access_key admin
aws configure set default.region us-east-1
aws --endpoint-url http://localhost:8333 s3 mb s3://rocketchat-uploads
aws --endpoint-url http://localhost:8333 s3 ls
pkill -f "port-forward.*8333"
```

**Métriques attendues** :

- Pods : 4/4 Running (master, volume, filer, s3)
- PVC : ~65Gi total Bound
- S3 API : fonctionnel sur port 8333

---

## PHASE 7 : OnlyOffice Document Server

> **Note importante** : Utiliser l'image all-in-one `onlyoffice/documentserver`. Le chart Helm OnlyOffice nécessite NFS (StorageClass non disponible par défaut).

### Actions

```bash
# Créer namespace
kubectl create namespace onlyoffice

# Générer le secret JWT
export ONLYOFFICE_JWT_SECRET=$(openssl rand -base64 32)
echo "ONLYOFFICE_JWT_SECRET=${ONLYOFFICE_JWT_SECRET}" >> ~/k3s-secrets.env

# Déploiement OnlyOffice all-in-one
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: onlyoffice-data
  namespace: onlyoffice
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 10Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: onlyoffice
  namespace: onlyoffice
spec:
  replicas: 1
  selector:
    matchLabels:
      app: onlyoffice
  template:
    metadata:
      labels:
        app: onlyoffice
    spec:
      containers:
      - name: onlyoffice
        image: onlyoffice/documentserver:latest
        ports:
        - containerPort: 80
        env:
        - name: JWT_ENABLED
          value: "true"
        - name: JWT_SECRET
          value: "${ONLYOFFICE_JWT_SECRET}"
        volumeMounts:
        - name: data
          mountPath: /var/www/onlyoffice/Data
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "4Gi"
            cpu: "2"
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: onlyoffice-data
---
apiVersion: v1
kind: Service
metadata:
  name: onlyoffice
  namespace: onlyoffice
spec:
  selector:
    app: onlyoffice
  ports:
  - port: 80
    targetPort: 80
EOF

# Attendre le démarrage (peut prendre 3-5 minutes)
kubectl wait --for=condition=ready pod -l app=onlyoffice \
  -n onlyoffice --timeout=600s
```

### Créer Ingress (STAGING d'abord)

```bash
export DOMAIN="votre-domaine.com"

cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: onlyoffice
  namespace: onlyoffice
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-staging
spec:
  ingressClassName: cilium
  tls:
  - hosts:
    - office.${DOMAIN}
    secretName: onlyoffice-tls
  rules:
  - host: office.${DOMAIN}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: onlyoffice
            port:
              number: 80
EOF
```

### Tests de validation

```bash
# Vérifier pods
kubectl get pods -n onlyoffice
# Attendu : onlyoffice pod Running (peut prendre 3-5min)

# Vérifier Ingress
kubectl get ingress -n onlyoffice
# Attendu : ADDRESS rempli

# Vérifier certificat
kubectl get certificate -n onlyoffice
# Attendu : onlyoffice-tls Ready (peut prendre 1-2 min)

# Test healthcheck
curl -k https://office.${DOMAIN}/healthcheck
# Attendu : true
```

**Métriques attendues** :

- Pod status : Running
- RAM OnlyOffice : ~1.5-2GB
- Certificat TLS : Ready (staging)
- HTTP healthcheck : true

---

## PHASE 8 : Authelia (SSO)

> **Note importante** : Le chart Helm Authelia a des problèmes de compatibilité. Utiliser un déploiement manuel.
>
> **CRITIQUE** : Nommer le service `auth-server` (pas `authelia`) pour éviter les conflits de variables d'environnement Kubernetes qui provoquent un CrashLoopBackOff.

### Génération des secrets

```bash
# Générer tous les secrets
export AUTHELIA_JWT_SECRET=$(openssl rand -hex 32)
export AUTHELIA_SESSION_SECRET=$(openssl rand -hex 32)
export AUTHELIA_STORAGE_KEY=$(openssl rand -hex 32)
export AUTHELIA_OIDC_HMAC_SECRET=$(openssl rand -hex 32)
export AUTHELIA_CLIENT_SECRET=$(openssl rand -hex 32)

# Sauvegarder les secrets
cat >> ~/k3s-secrets.env <<EOF
AUTHELIA_JWT_SECRET=${AUTHELIA_JWT_SECRET}
AUTHELIA_SESSION_SECRET=${AUTHELIA_SESSION_SECRET}
AUTHELIA_STORAGE_KEY=${AUTHELIA_STORAGE_KEY}
AUTHELIA_OIDC_HMAC_SECRET=${AUTHELIA_OIDC_HMAC_SECRET}
AUTHELIA_CLIENT_SECRET=${AUTHELIA_CLIENT_SECRET}
EOF

# Générer la clé privée OIDC
openssl genrsa -out /tmp/oidc-private-key.pem 4096

# Générer le hash du mot de passe admin
# Option 1 : via Docker
docker run --rm authelia/authelia:latest \
  authelia crypto hash generate argon2 --password "VotreMotDePasse"

# Option 2 : noter le hash généré et l'utiliser ci-dessous
# Format : $argon2id$v=19$m=65536,t=3,p=4$...
export ADMIN_PASSWORD_HASH='$argon2id$v=19$m=65536,t=3,p=4$VOTRE_HASH_ICI'
```

### Configuration Authelia (sans OIDC initial)

> Pour une première installation, on configure Authelia en mode simple (one_factor sans OIDC). L'OIDC peut être ajouté ultérieurement.

```bash
source ~/k3s-secrets.env

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: authelia-config
  namespace: authelia
data:
  configuration.yml: |
    theme: light
    default_2fa_method: totp

    server:
      address: tcp://0.0.0.0:9091/

    log:
      level: info

    authentication_backend:
      file:
        path: /config/users_database.yml

    access_control:
      default_policy: one_factor

    session:
      cookies:
        - domain: '${DOMAIN}'
          authelia_url: 'https://auth.${DOMAIN}'
      redis:
        host: redis-master.authelia.svc.cluster.local
        port: 6379
        password: '${REDIS_PASSWORD}'

    storage:
      encryption_key: '${AUTHELIA_STORAGE_KEY}'
      local:
        path: /data/db.sqlite3

    notifier:
      filesystem:
        filename: /data/notification.txt
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: authelia-users-db
  namespace: authelia
data:
  users_database.yml: |
    users:
      admin:
        disabled: false
        displayname: "Administrator"
        password: "${ADMIN_PASSWORD_HASH}"
        email: admin@${DOMAIN}
        groups:
          - admins
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: authelia-data
  namespace: authelia
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 1Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-server
  namespace: authelia
spec:
  replicas: 1
  selector:
    matchLabels:
      app: auth-server
  template:
    metadata:
      labels:
        app: auth-server
    spec:
      containers:
      - name: authelia
        image: authelia/authelia:latest
        ports:
        - containerPort: 9091
        env:
        - name: AUTHELIA_JWT_SECRET
          value: "${AUTHELIA_JWT_SECRET}"
        - name: AUTHELIA_SESSION_SECRET
          value: "${AUTHELIA_SESSION_SECRET}"
        volumeMounts:
        - name: config
          mountPath: /config/configuration.yml
          subPath: configuration.yml
          readOnly: true
        - name: users
          mountPath: /config/users_database.yml
          subPath: users_database.yml
          readOnly: true
        - name: data
          mountPath: /data
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: config
        configMap:
          name: authelia-config
      - name: users
        configMap:
          name: authelia-users-db
      - name: data
        persistentVolumeClaim:
          claimName: authelia-data
---
apiVersion: v1
kind: Service
metadata:
  name: auth-server
  namespace: authelia
spec:
  selector:
    app: auth-server
  ports:
  - port: 9091
    targetPort: 9091
EOF

# Attendre le démarrage
kubectl wait --for=condition=ready pod -l app=auth-server \
  -n authelia --timeout=120s
```

### Créer Ingress Authelia (STAGING)

```bash
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: authelia
  namespace: authelia
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-staging
spec:
  ingressClassName: cilium
  tls:
  - hosts:
    - auth.${DOMAIN}
    secretName: authelia-tls
  rules:
  - host: auth.${DOMAIN}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: auth-server
            port:
              number: 9091
EOF
```

### Tests de validation

```bash
# Vérifier pods
kubectl get pods -n authelia
# Attendu : auth-server et redis Running

# Vérifier logs (pas d'erreur fatale)
kubectl logs -n authelia -l app=auth-server --tail=50
# Attendu : "Startup complete" ou "Authelia is listening"

# Test HTTP
curl -k https://auth.${DOMAIN}/api/health
# Attendu : {"status":"UP"}
```

**Test graphique** :

- Ouvrir navigateur : https://auth.votre-domaine.com
- Attendu : Page de login Authelia
- Credentials : admin / (mot de passe défini)
- Note : Certificat staging = warning navigateur

**Métriques attendues** :

- Pod status : Running
- Health check : UP
- Login UI : accessible
- Redis connexion : OK

---

## PHASE 9 : Mattermost

### Actions

```bash
source ~/k3s-secrets.env

# Générer le secret Mattermost
export MATTERMOST_SECRET=$(openssl rand -base64 32)
echo "MATTERMOST_SECRET=${MATTERMOST_SECRET}" >> ~/k3s-secrets.env

# Installer Mattermost avec authentification OIDC via Authelia
helm install mattermost mattermost/mattermost-team-edition \
  --namespace mattermost \
  --set mariadb.enabled=false \
  --set externalDB.enabled=true \
  --set externalDB.externalDriverType=postgres \
  --set externalDB.externalConnectionString="postgres://mattermost:${MATTERMOST_DB_PASSWORD}@postgresql.mattermost.svc.cluster.local:5432/mattermost?sslmode=disable" \
  --set persistence.data.enabled=true \
  --set persistence.data.size=10Gi \
  --set persistence.data.storageClass=longhorn \
  --set ingress.enabled=false

# Attendre le démarrage
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=mattermost-team-edition \
  -n mattermost --timeout=600s
```

### Créer Ingress Mattermost (STAGING)

```bash
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mattermost
  namespace: mattermost
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-staging
spec:
  ingressClassName: cilium
  tls:
  - hosts:
    - chat.${DOMAIN}
    secretName: mattermost-tls
  rules:
  - host: chat.${DOMAIN}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: mattermost-team-edition
            port:
              number: 8065
EOF
```

### Configuration OIDC avec Authelia

Une fois Mattermost démarré, configurer l'authentification OIDC :

```bash
# Générer le client secret pour Mattermost
export MATTERMOST_OIDC_SECRET=$(openssl rand -hex 32)
echo "MATTERMOST_OIDC_SECRET=${MATTERMOST_OIDC_SECRET}" >> ~/k3s-secrets.env
```

Ajouter le client OIDC dans la configuration Authelia (voir PHASE 14 : Gestion des autorisations).

Dans **System Console > Authentication > OpenID Connect** de Mattermost :

| Paramètre | Valeur |
|-----------|--------|
| **Enable OpenID Connect** | true |
| **Button Name** | Connexion ATLAS |
| **Button Color** | #1a73e8 |
| **Discovery Endpoint** | `https://auth.${DOMAIN}/.well-known/openid-configuration` |
| **Client ID** | mattermost |
| **Client Secret** | (valeur de `MATTERMOST_OIDC_SECRET`) |

### Tests de validation

```bash
# Vérifier pods
kubectl get pods -n mattermost
# Attendu : mattermost-team-edition et postgresql Running

# Vérifier logs
kubectl logs -n mattermost -l app.kubernetes.io/name=mattermost-team-edition --tail=100
# Attendu : "Server is listening on"

# Test HTTP
curl -k https://chat.${DOMAIN}/api/v4/system/ping
# Attendu : {"status":"OK"}
```

**Test graphique** :

- Ouvrir navigateur : https://chat.votre-domaine.com
- Attendu : Page de login Mattermost avec bouton "Connexion ATLAS"
- Cliquer sur "Connexion ATLAS" → redirection vers Authelia
- Après authentification → retour vers Mattermost connecté
- Note : Certificat staging = warning navigateur

**Métriques attendues** :

- Pod status : Running
- RAM Mattermost : ~300-500MB
- Connexion PostgreSQL : OK
- OIDC : fonctionnel via Authelia

---

## PHASE 10 : REDCap v16 (formulaires de recherche)

> **REDCap** (Research Electronic Data Capture) est une application web sécurisée pour la création et la gestion de formulaires de recherche. Version 16 utilisée.

### Prérequis

- Licence REDCap (gratuite pour institutions académiques) : https://projectredcap.org/
- Télécharger le package d'installation depuis le consortium REDCap

### Installation MariaDB pour REDCap

```bash
# Créer namespace
kubectl create namespace redcap

# Générer les mots de passe
export MYSQL_ROOT_PASSWORD=$(openssl rand -base64 24)
export REDCAP_DB_PASSWORD=$(openssl rand -base64 24)
cat >> ~/k3s-secrets.env <<EOF
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
REDCAP_DB_PASSWORD=${REDCAP_DB_PASSWORD}
EOF

# Installer MariaDB
helm install mariadb bitnami/mariadb \
  --namespace redcap \
  --set auth.rootPassword="${MYSQL_ROOT_PASSWORD}" \
  --set auth.username=redcap \
  --set auth.password="${REDCAP_DB_PASSWORD}" \
  --set auth.database=redcap \
  --set primary.persistence.size=20Gi

# Attendre déploiement
kubectl wait --for=condition=ready pod mariadb-0 \
  -n redcap --timeout=300s
```

### Déploiement REDCap

```bash
source ~/k3s-secrets.env

# Créer le PVC pour les fichiers REDCap
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redcap-files
  namespace: redcap
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 20Gi
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: redcap-config
  namespace: redcap
data:
  database.php: |
    <?php
    \$hostname = 'mariadb.redcap.svc.cluster.local';
    \$db = 'redcap';
    \$username = 'redcap';
    \$password = '${REDCAP_DB_PASSWORD}';
    \$salt = '$(openssl rand -hex 16)';
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redcap
  namespace: redcap
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redcap
  template:
    metadata:
      labels:
        app: redcap
    spec:
      containers:
      - name: redcap
        image: php:8.2-apache
        ports:
        - containerPort: 80
        env:
        - name: APACHE_DOCUMENT_ROOT
          value: /var/www/html/redcap
        volumeMounts:
        - name: redcap-files
          mountPath: /var/www/html/redcap
        - name: config
          mountPath: /var/www/html/redcap/database.php
          subPath: database.php
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "1Gi"
            cpu: "1"
      initContainers:
      - name: install-redcap
        image: php:8.2-cli
        command:
        - /bin/sh
        - -c
        - |
          # Note: Télécharger REDCap manuellement depuis le consortium
          # et placer les fichiers dans le PVC
          echo "REDCap files must be uploaded to this volume"
          echo "Download from: https://projectredcap.org/"
        volumeMounts:
        - name: redcap-files
          mountPath: /var/www/html/redcap
      volumes:
      - name: redcap-files
        persistentVolumeClaim:
          claimName: redcap-files
      - name: config
        configMap:
          name: redcap-config
---
apiVersion: v1
kind: Service
metadata:
  name: redcap
  namespace: redcap
spec:
  selector:
    app: redcap
  ports:
  - port: 80
    targetPort: 80
EOF

# Attendre le démarrage
kubectl wait --for=condition=ready pod -l app=redcap \
  -n redcap --timeout=300s
```

### Créer Ingress REDCap (STAGING)

> **Politique d'accès REDCap** :
> - `/surveys/` : Accès public (formulaires pour les enquêtés)
> - `/api/` : Accès restreint à ECRIN uniquement (interne cluster)
> - `/ControlCenter/` et admin : Authentification Authelia requise

```bash
# Ingress pour les formulaires publics (surveys)
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: redcap-public
  namespace: redcap
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-staging
spec:
  ingressClassName: cilium
  tls:
  - hosts:
    - redcap.${DOMAIN}
    secretName: redcap-tls
  rules:
  - host: redcap.${DOMAIN}
    http:
      paths:
      - path: /surveys
        pathType: Prefix
        backend:
          service:
            name: redcap
            port:
              number: 80
      - path: /redcap_v16/surveys
        pathType: Prefix
        backend:
          service:
            name: redcap
            port:
              number: 80
---
# Ingress pour l'interface admin (protégé par Authelia)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: redcap-admin
  namespace: redcap
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-staging
spec:
  ingressClassName: cilium
  tls:
  - hosts:
    - redcap.${DOMAIN}
    secretName: redcap-tls
  rules:
  - host: redcap.${DOMAIN}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: redcap
            port:
              number: 80
EOF
```

> **Note** : L'API REDCap (`/api/`) n'est pas exposée via Ingress. Elle est accessible uniquement depuis le cluster (ECRIN → REDCap via Service interne).

### Tests de validation

```bash
# Vérifier pods
kubectl get pods -n redcap
# Attendu : redcap et mariadb-0 Running

# Test accès public (surveys)
curl -k https://redcap.${DOMAIN}/surveys/
# Attendu : Page de formulaire ou erreur "survey not found"

# Test accès admin (doit rediriger vers Authelia)
curl -k -I https://redcap.${DOMAIN}/ControlCenter/
# Attendu : Redirection 302 vers auth.${DOMAIN}
```

**Post-installation** :

1. Télécharger REDCap v16 depuis le consortium
2. Copier les fichiers dans le PVC : `kubectl cp redcap16.zip redcap/<pod>:/var/www/html/`
3. Extraire et configurer via l'interface web
4. Configurer les politiques d'accès Authelia (voir PHASE 16)
5. Configurer SMTP et stockage S3 (voir ci-dessous)

### Configuration SMTP pour REDCap

REDCap peut envoyer des emails pour les notifications, invitations aux enquêtes, et alertes.

```bash
# Dans l'interface REDCap : Control Center > General Configuration
# Ou via le fichier de configuration :

kubectl exec -it deploy/redcap -n redcap -- bash -c 'cat >> /var/www/html/redcap/database.php << "EOF"

// SMTP Configuration
\$smtp_server = getenv("SMTP_HOST") ?: "smtp.example.com";
\$smtp_port = getenv("SMTP_PORT") ?: 587;
\$smtp_protocol = "STARTTLS";
\$smtp_username = getenv("SMTP_USER");
\$smtp_password = getenv("SMTP_PASSWORD");
\$from_email = getenv("SMTP_FROM") ?: "noreply@example.com";
EOF'
```

Configuration via **Control Center > General Configuration** :

| Paramètre | Valeur |
|-----------|--------|
| **SMTP Server** | `smtp.example.com` |
| **SMTP Port** | `587` |
| **SMTP Protocol** | `STARTTLS` |
| **SMTP Username** | `username` |
| **SMTP Password** | `(mot de passe)` |
| **From Email** | `noreply@example.com` |

### Configuration S3 pour le stockage des fichiers REDCap

REDCap v16 supporte le stockage S3 pour les fichiers uploadés (pièces jointes, signatures, etc.).

```bash
# Configuration S3 via SeaweedFS interne
source ~/k3s-secrets.env

# Créer un bucket dédié pour REDCap dans SeaweedFS
kubectl exec -it deploy/seaweedfs-filer -n seaweedfs -- \
  /usr/bin/weed shell -master=seaweedfs-master:9333 \
  -filer=seaweedfs-filer:8888 << EOF
s3.bucket.create -name redcap-files
EOF
```

Configuration via **Control Center > File Repository Settings** :

| Paramètre | Valeur |
|-----------|--------|
| **Storage Type** | `Amazon S3` |
| **S3 Endpoint** | `http://seaweedfs-s3.seaweedfs.svc.cluster.local:8333` |
| **S3 Bucket** | `redcap-files` |
| **S3 Access Key** | `${SEAWEEDFS_ACCESS_KEY}` |
| **S3 Secret Key** | `${SEAWEEDFS_SECRET_KEY}` |
| **S3 Region** | `us-east-1` (ou laisser vide) |
| **Use Path Style** | `Yes` (requis pour SeaweedFS) |

> **Note** : L'endpoint S3 utilise le service Kubernetes interne. Le trafic reste dans le cluster.

### Test de la configuration S3

```bash
# Vérifier que le bucket existe
kubectl exec -it deploy/seaweedfs-filer -n seaweedfs -- \
  curl -s http://seaweedfs-s3:8333/redcap-files/ | head -20
# Attendu : XML listing (peut être vide initialement)

# Test upload depuis REDCap (via l'interface web)
# 1. Aller dans un projet REDCap
# 2. Uploader un fichier dans un champ "File Upload"
# 3. Vérifier que le fichier est stocké dans S3
```

**Métriques attendues** :

- Pod status : Running
- RAM REDCap : ~500MB
- MariaDB connexion : OK
- Surveys : Accès public OK
- Admin : Protégé par Authelia
- SMTP : Emails fonctionnels
- S3 : Fichiers stockés dans SeaweedFS

---

## PHASE 11 : ECRIN (plateforme collaboration chercheurs)

> **ECRIN** est une plateforme SvelteKit pour la collaboration entre chercheurs. Elle utilise REDCap pour les formulaires.

### Déploiement ECRIN

```bash
# Créer namespace
kubectl create namespace ecrin

# Générer les secrets
export ECRIN_SECRET=$(openssl rand -base64 32)
echo "ECRIN_SECRET=${ECRIN_SECRET}" >> ~/k3s-secrets.env

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: ecrin-config
  namespace: ecrin
data:
  PUBLIC_APP_NAME: "ECRIN"
  PUBLIC_REDCAP_URL: "https://redcap.${DOMAIN}"
  PUBLIC_AUTH_URL: "https://auth.${DOMAIN}"
  ORIGIN: "https://ecrin.${DOMAIN}"
---
apiVersion: v1
kind: Secret
metadata:
  name: ecrin-secrets
  namespace: ecrin
type: Opaque
stringData:
  OIDC_CLIENT_SECRET: "${ECRIN_OIDC_SECRET}"
  SESSION_SECRET: "${ECRIN_SECRET}"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ecrin
  namespace: ecrin
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ecrin
  template:
    metadata:
      labels:
        app: ecrin
    spec:
      containers:
      - name: ecrin
        image: ghcr.io/univ-lehavre/ecrin:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: ecrin-config
        - secretRef:
            name: ecrin-secrets
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: ecrin
  namespace: ecrin
spec:
  selector:
    app: ecrin
  ports:
  - port: 3000
    targetPort: 3000
EOF

# Attendre le démarrage
kubectl wait --for=condition=ready pod -l app=ecrin \
  -n ecrin --timeout=120s
```

### Créer Ingress ECRIN (STAGING)

```bash
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ecrin
  namespace: ecrin
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-staging
spec:
  ingressClassName: cilium
  tls:
  - hosts:
    - ecrin.${DOMAIN}
    secretName: ecrin-tls
  rules:
  - host: ecrin.${DOMAIN}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ecrin
            port:
              number: 3000
EOF
```

### Fonctionnalités ECRIN

ECRIN est organisé en **6 sections** représentant les étapes de collaboration scientifique :

| Section | Cartes disponibles |
|---------|-------------------|
| **Introduce** | Me, My scientific question, My references |
| **Collaborate** | Create my project, Build my team, Find my expert, Fund my project |
| **Explore** | My graph, Community graph |
| **Ask** | Data, An expert |
| **Publish** | My data, My news |
| **Administrate** | My account, My survey |

### Tests de validation

```bash
# Vérifier pods
kubectl get pods -n ecrin
# Attendu : ecrin pod Running

# Test HTTP
curl -k https://ecrin.${DOMAIN}/
# Attendu : Page d'accueil ECRIN
```

**Métriques attendues** :

- Pod status : Running
- RAM ECRIN : ~200MB
- Connexion REDCap : OK (via API)

---

## PHASE 12 : Gitea (forge Git self-hosted)

> **Gitea** est une forge Git légère et auto-hébergée, alternative à GitHub/GitLab. Elle s'intègre avec Authelia pour le SSO.

### Installation PostgreSQL pour Gitea

```bash
# Créer namespace
kubectl create namespace gitea

# Générer les mots de passe
export GITEA_DB_PASSWORD=$(openssl rand -base64 24)
cat >> ~/k3s-secrets.env <<EOF
GITEA_DB_PASSWORD=${GITEA_DB_PASSWORD}
EOF

# Installer PostgreSQL pour Gitea
helm install postgresql bitnami/postgresql \
  --namespace gitea \
  --set auth.postgresPassword="${POSTGRES_PASSWORD}" \
  --set auth.username=gitea \
  --set auth.password="${GITEA_DB_PASSWORD}" \
  --set auth.database=gitea \
  --set primary.persistence.size=10Gi

# Attendre déploiement
kubectl wait --for=condition=ready pod postgresql-0 \
  -n gitea --timeout=300s
```

### Installation Gitea

```bash
source ~/k3s-secrets.env

# Générer le secret Gitea
export GITEA_SECRET=$(openssl rand -base64 32)
export GITEA_INTERNAL_TOKEN=$(openssl rand -base64 64 | tr -d '\n')
export GITEA_JWT_SECRET=$(openssl rand -base64 32)
cat >> ~/k3s-secrets.env <<EOF
GITEA_SECRET=${GITEA_SECRET}
GITEA_INTERNAL_TOKEN=${GITEA_INTERNAL_TOKEN}
GITEA_JWT_SECRET=${GITEA_JWT_SECRET}
EOF

# Installer Gitea via Helm
helm install gitea gitea/gitea \
  --namespace gitea \
  --set gitea.admin.username=gitea_admin \
  --set gitea.admin.password="${GITEA_SECRET}" \
  --set gitea.admin.email="admin@${DOMAIN}" \
  --set gitea.config.database.DB_TYPE=postgres \
  --set gitea.config.database.HOST=postgresql.gitea.svc.cluster.local:5432 \
  --set gitea.config.database.NAME=gitea \
  --set gitea.config.database.USER=gitea \
  --set gitea.config.database.PASSWD="${GITEA_DB_PASSWORD}" \
  --set gitea.config.server.ROOT_URL="https://git.${DOMAIN}" \
  --set gitea.config.server.DOMAIN="git.${DOMAIN}" \
  --set gitea.config.server.SSH_DOMAIN="git.${DOMAIN}" \
  --set gitea.config.security.SECRET_KEY="${GITEA_SECRET}" \
  --set gitea.config.security.INTERNAL_TOKEN="${GITEA_INTERNAL_TOKEN}" \
  --set gitea.config.oauth2.JWT_SECRET="${GITEA_JWT_SECRET}" \
  --set persistence.enabled=true \
  --set persistence.size=20Gi \
  --set persistence.storageClass=longhorn \
  --set postgresql.enabled=false \
  --set redis-cluster.enabled=false \
  --set ingress.enabled=false

# Attendre le démarrage
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=gitea \
  -n gitea --timeout=300s
```

### Créer Ingress Gitea (STAGING)

```bash
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gitea
  namespace: gitea
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-staging
spec:
  ingressClassName: cilium
  tls:
  - hosts:
    - git.${DOMAIN}
    secretName: gitea-tls
  rules:
  - host: git.${DOMAIN}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: gitea-http
            port:
              number: 3000
EOF
```

### Configuration OIDC avec Authelia

Ajouter le client OIDC pour Gitea dans Authelia (voir PHASE 14) :

```yaml
- client_id: gitea
  client_name: Gitea
  client_secret: '${GITEA_OIDC_SECRET}'
  public: false
  authorization_policy: one_factor
  redirect_uris:
    - https://git.example.com/user/oauth2/authelia/callback
  scopes:
    - openid
    - profile
    - email
    - groups
  userinfo_signed_response_alg: none
```

Configurer Gitea pour utiliser Authelia OIDC :

```bash
# Générer le secret OIDC
export GITEA_OIDC_SECRET=$(openssl rand -hex 32)
echo "GITEA_OIDC_SECRET=${GITEA_OIDC_SECRET}" >> ~/k3s-secrets.env

# Ajouter la configuration OAuth2 dans Gitea
# Via l'interface web : Site Administration > Authentication Sources > Add Authentication Source
# Ou via API Gitea
```

| Paramètre | Valeur |
|-----------|--------|
| **Authentication Type** | OAuth2 |
| **Authentication Name** | authelia |
| **OAuth2 Provider** | OpenID Connect |
| **Client ID** | gitea |
| **Client Secret** | (valeur de `GITEA_OIDC_SECRET`) |
| **OpenID Connect Auto Discovery URL** | `https://auth.${DOMAIN}/.well-known/openid-configuration` |

### Tests de validation

```bash
# Vérifier pods
kubectl get pods -n gitea
# Attendu : gitea et postgresql Running

# Test HTTP
curl -k https://git.${DOMAIN}/
# Attendu : Page d'accueil Gitea
```

**Métriques attendues** :

- Pod status : Running
- RAM Gitea : ~200-300MB
- Connexion PostgreSQL : OK
- OIDC : fonctionnel via Authelia

---

## PHASE 13 : ArgoCD (GitOps CD)

> **ArgoCD** est un outil de déploiement continu GitOps pour Kubernetes. Il synchronise automatiquement l'état du cluster avec les définitions dans Git.

### Installation ArgoCD

```bash
# Créer namespace
kubectl create namespace argocd

# Installer ArgoCD
helm install argocd argo/argo-cd \
  --namespace argocd \
  --set server.ingress.enabled=false \
  --set server.extraArgs="{--insecure}" \
  --set configs.params."server\.insecure"=true \
  --set redis-ha.enabled=false \
  --set controller.replicas=1 \
  --set server.replicas=1 \
  --set repoServer.replicas=1 \
  --set applicationSet.replicas=1

# Attendre le démarrage
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server \
  -n argocd --timeout=300s

# Récupérer le mot de passe admin initial
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
# Sauvegarder ce mot de passe !
```

### Créer Ingress ArgoCD (STAGING)

```bash
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd
  namespace: argocd
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-staging
spec:
  ingressClassName: cilium
  tls:
  - hosts:
    - argocd.${DOMAIN}
    secretName: argocd-tls
  rules:
  - host: argocd.${DOMAIN}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-server
            port:
              number: 80
EOF
```

### Configuration OIDC avec Authelia

Ajouter le client OIDC pour ArgoCD dans Authelia :

```yaml
- client_id: argocd
  client_name: ArgoCD
  client_secret: '${ARGOCD_OIDC_SECRET}'
  public: false
  authorization_policy: two_factor
  redirect_uris:
    - https://argocd.example.com/auth/callback
  scopes:
    - openid
    - profile
    - email
    - groups
  userinfo_signed_response_alg: none
```

Configurer ArgoCD pour utiliser Authelia OIDC :

```bash
# Générer le secret OIDC
export ARGOCD_OIDC_SECRET=$(openssl rand -hex 32)
echo "ARGOCD_OIDC_SECRET=${ARGOCD_OIDC_SECRET}" >> ~/k3s-secrets.env

# Patcher la ConfigMap ArgoCD
kubectl patch configmap argocd-cm -n argocd --type merge -p '
data:
  url: "https://argocd.${DOMAIN}"
  oidc.config: |
    name: Authelia
    issuer: https://auth.${DOMAIN}
    clientID: argocd
    clientSecret: $oidc.authelia.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - groups
'

# Ajouter le secret OIDC
kubectl patch secret argocd-secret -n argocd --type merge -p "
stringData:
  oidc.authelia.clientSecret: \"${ARGOCD_OIDC_SECRET}\"
"

# Configurer les RBAC pour mapper les groupes Authelia
kubectl patch configmap argocd-rbac-cm -n argocd --type merge -p '
data:
  policy.csv: |
    g, admins, role:admin
    g, researchers, role:readonly
  policy.default: role:readonly
'

# Redémarrer ArgoCD
kubectl rollout restart deployment argocd-server -n argocd
```

### Connecter Gitea à ArgoCD

```bash
# Ajouter Gitea comme source de repos
argocd repo add https://git.${DOMAIN}/organisation/projet.git \
  --username gitea_admin \
  --password "${GITEA_SECRET}"

# Ou via SSH (recommandé pour les déploiements automatiques)
# Générer une clé SSH dédiée
ssh-keygen -t ed25519 -C "argocd@${DOMAIN}" -f /tmp/argocd-deploy-key -N ""

# Ajouter la clé publique dans Gitea (Settings > SSH Keys)
cat /tmp/argocd-deploy-key.pub

# Ajouter le repo avec la clé privée
argocd repo add git@git.${DOMAIN}:organisation/projet.git \
  --ssh-private-key-path /tmp/argocd-deploy-key
```

### Exemple d'Application ArgoCD

```bash
cat <<EOF | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ecrin
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://git.${DOMAIN}/atlas/ecrin-deploy.git
    targetRevision: HEAD
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: ecrin
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
EOF
```

### Tests de validation

```bash
# Vérifier pods
kubectl get pods -n argocd
# Attendu : argocd-server, argocd-repo-server, argocd-application-controller Running

# Test HTTP
curl -k https://argocd.${DOMAIN}/
# Attendu : Page de login ArgoCD

# Vérifier les applications
kubectl get applications -n argocd
```

**Métriques attendues** :

- Pod status : Running
- RAM ArgoCD : ~300-500MB
- OIDC : fonctionnel via Authelia
- Sync status : Synced (si applications configurées)

---

## PHASE 14 : Tests et passage en production

### Test E2E complet

```bash
# 1. Vérifier tous les pods
kubectl get pods -A | grep -v Running
# Attendu : aucun pod en erreur (sauf Completed pour jobs)

# 2. Vérifier Cilium et la connectivité réseau
cilium status
cilium connectivity test
# Attendu : tous les tests OK

# 3. Vérifier tous les certificats
kubectl get certificates -A
# Attendu : tous Ready (staging)

# 4. Vérifier tous les Ingress
kubectl get ingress -A
# Attendu : auth, office, chat, redcap, ecrin, git, argocd avec ADDRESS

# 5. Vérifier Longhorn et ses volumes
kubectl get volumes.longhorn.io -n longhorn-system
# Attendu : tous les volumes Healthy
```

### Bascule vers Let's Encrypt PRODUCTION

> **Quand basculer ?** Après validation complète en staging (tous les tests passés, services accessibles).

```bash
# 1. Authelia
kubectl patch ingress authelia -n authelia \
  -p '{"metadata":{"annotations":{"cert-manager.io/cluster-issuer":"letsencrypt-prod"}}}'
kubectl delete secret authelia-tls -n authelia
kubectl get certificate authelia-tls -n authelia --watch
# Attendre : Ready True

# 2. OnlyOffice
kubectl patch ingress onlyoffice -n onlyoffice \
  -p '{"metadata":{"annotations":{"cert-manager.io/cluster-issuer":"letsencrypt-prod"}}}'
kubectl delete secret onlyoffice-tls -n onlyoffice
kubectl get certificate onlyoffice-tls -n onlyoffice --watch

# 3. Mattermost
kubectl patch ingress mattermost -n mattermost \
  -p '{"metadata":{"annotations":{"cert-manager.io/cluster-issuer":"letsencrypt-prod"}}}'
kubectl delete secret mattermost-tls -n mattermost
kubectl get certificate mattermost-tls -n mattermost --watch

# 4. REDCap
kubectl patch ingress redcap -n redcap \
  -p '{"metadata":{"annotations":{"cert-manager.io/cluster-issuer":"letsencrypt-prod"}}}'
kubectl delete secret redcap-tls -n redcap
kubectl get certificate redcap-tls -n redcap --watch

# 5. ECRIN
kubectl patch ingress ecrin -n ecrin \
  -p '{"metadata":{"annotations":{"cert-manager.io/cluster-issuer":"letsencrypt-prod"}}}'
kubectl delete secret ecrin-tls -n ecrin
kubectl get certificate ecrin-tls -n ecrin --watch

# 6. Gitea
kubectl patch ingress gitea -n gitea \
  -p '{"metadata":{"annotations":{"cert-manager.io/cluster-issuer":"letsencrypt-prod"}}}'
kubectl delete secret gitea-tls -n gitea
kubectl get certificate gitea-tls -n gitea --watch

# 7. ArgoCD
kubectl patch ingress argocd -n argocd \
  -p '{"metadata":{"annotations":{"cert-manager.io/cluster-issuer":"letsencrypt-prod"}}}'
kubectl delete secret argocd-tls -n argocd
kubectl get certificate argocd-tls -n argocd --watch

# Vérification finale
kubectl get certificates -A
# Attendu : tous Ready avec issuer letsencrypt-prod

# Test HTTPS production
for domain in auth office chat redcap ecrin git argocd; do
  echo "Testing $domain.${DOMAIN}"
  curl -v https://$domain.${DOMAIN} 2>&1 | grep "SSL certificate verify"
done
# Attendu : "verify result: ok" pour tous
```

---

## PHASE 15 : Configuration post-installation

### Configuration OnlyOffice pour Mattermost (édition collaborative)

> **OnlyOffice** permet l'édition collaborative de documents directement depuis Mattermost via un plugin.
>
> **Note** : OnlyOffice n'est pas exposé sur internet. Le plugin Mattermost utilise l'URL interne du cluster Kubernetes.

#### Installation du plugin OnlyOffice

```bash
# Télécharger le plugin OnlyOffice pour Mattermost
ONLYOFFICE_PLUGIN_VERSION="2.5.0"
wget https://github.com/nickyc975/mattermost-plugin-onlyoffice/releases/download/v${ONLYOFFICE_PLUGIN_VERSION}/com.github.nickyc975.mattermost-plugin-onlyoffice-${ONLYOFFICE_PLUGIN_VERSION}.tar.gz

# Uploader via l'API Mattermost (ou via System Console > Plugins)
# Option 1 : Via System Console
# Aller dans System Console > Plugins > Plugin Management > Upload Plugin

# Option 2 : Via API (nécessite un token admin)
curl -X POST \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -F "plugin=@com.github.nickyc975.mattermost-plugin-onlyoffice-${ONLYOFFICE_PLUGIN_VERSION}.tar.gz" \
  https://chat.${DOMAIN}/api/v4/plugins
```

#### Configuration du plugin OnlyOffice

Dans **System Console > Plugins > OnlyOffice** :

| Paramètre | Valeur |
|-----------|--------|
| **Enable Plugin** | true |
| **OnlyOffice Document Server URL** | `https://office.${DOMAIN}` |
| **OnlyOffice Document Server Secret** | (valeur de `ONLYOFFICE_JWT_SECRET` dans `~/k3s-secrets.env`) |

#### Fonctionnalités disponibles

Une fois configuré, les utilisateurs peuvent :

| Action | Description |
|--------|-------------|
| **Créer un document** | Clic droit dans un canal → "Create document" → Word/Excel/PowerPoint |
| **Éditer un fichier** | Clic sur un fichier uploadé → "Edit with OnlyOffice" |
| **Co-édition temps réel** | Plusieurs utilisateurs peuvent éditer simultanément |
| **Commentaires** | Ajouter des commentaires dans les documents |
| **Historique** | Voir l'historique des modifications |

#### Test de validation

```bash
# Vérifier que le plugin est actif
curl -k https://chat.${DOMAIN}/api/v4/plugins | jq '.active[] | select(.id | contains("onlyoffice"))'
# Attendu : JSON avec le plugin OnlyOffice

# Tester la connexion OnlyOffice
curl -k https://office.${DOMAIN}/healthcheck
# Attendu : true
```

**Test graphique** :

1. Se connecter à Mattermost
2. Dans un canal, cliquer sur "+" (attachments) → "Create document"
3. Sélectionner le type de document (Word, Excel, PowerPoint)
4. Le document s'ouvre dans OnlyOffice
5. Inviter un autre utilisateur → vérifier la co-édition temps réel

### Configuration SMTP (optionnel)

```bash
export SMTP_HOST="smtp.example.com"
export SMTP_PORT="587"
export SMTP_USER="username"
export SMTP_PASSWORD="password"
export SMTP_FROM="noreply@example.com"

# Sauvegarder
cat >> ~/k3s-secrets.env <<EOF
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_FROM=${SMTP_FROM}
EOF
```

#### SMTP pour Mattermost

Dans **System Console > Environment > SMTP** :

| Paramètre | Valeur |
|-----------|--------|
| **SMTP Server** | `${SMTP_HOST}` |
| **SMTP Port** | `${SMTP_PORT}` |
| **Connection Security** | STARTTLS |
| **SMTP Username** | `${SMTP_USER}` |
| **SMTP Password** | `${SMTP_PASSWORD}` |
| **From Address** | `${SMTP_FROM}` |

#### SMTP pour Authelia

Mettre à jour la ConfigMap Authelia pour remplacer le notifier filesystem par SMTP :

```yaml
notifier:
  smtp:
    address: smtp://${SMTP_HOST}:${SMTP_PORT}
    username: ${SMTP_USER}
    password: ${SMTP_PASSWORD}
    sender: "Authelia <${SMTP_FROM}>"
    subject: "[ATLAS] {title}"
    startup_check_address: test@example.com
```

### Configuration SeaweedFS pour uploads Mattermost

Dans **System Console > Environment > File Storage** :

| Paramètre | Valeur |
|-----------|--------|
| **File Storage System** | Amazon S3 |
| **Amazon S3 Bucket** | `mattermost-uploads` |
| **Amazon S3 Access Key ID** | `admin` |
| **Amazon S3 Secret Access Key** | `admin` |
| **Amazon S3 Endpoint** | `http://seaweedfs-s3.seaweedfs.svc.cluster.local:8333` |
| **Enable Secure Amazon S3 Connections** | false |
| **Amazon S3 Region** | `us-east-1` |

Créer le bucket avant :

```bash
kubectl port-forward -n seaweedfs svc/seaweedfs-s3 8333:8333 &
sleep 5
aws --endpoint-url http://localhost:8333 s3 mb s3://mattermost-uploads
pkill -f "port-forward.*8333"
```

### Configuration backups automatiques Longhorn

Les backups Longhorn sont configurés pour être envoyés vers SeaweedFS (S3).

```bash
# Créer le bucket pour les backups Longhorn
kubectl port-forward -n seaweedfs svc/seaweedfs-s3 8333:8333 &
sleep 5
aws --endpoint-url http://localhost:8333 s3 mb s3://longhorn-backups
pkill -f "port-forward.*8333"

# Créer le secret pour les credentials S3
kubectl create secret generic longhorn-s3-credentials \
  -n longhorn-system \
  --from-literal=AWS_ACCESS_KEY_ID=admin \
  --from-literal=AWS_SECRET_ACCESS_KEY=admin \
  --from-literal=AWS_ENDPOINTS=http://seaweedfs-s3.seaweedfs.svc.cluster.local:8333

# Configurer le backup target dans Longhorn
kubectl patch setting backup-target -n longhorn-system \
  --type merge -p '{"value": "s3://longhorn-backups@us-east-1/"}'
kubectl patch setting backup-target-credential-secret -n longhorn-system \
  --type merge -p '{"value": "longhorn-s3-credentials"}'
```

### Créer une politique de backup récurrente

```bash
cat <<EOF | kubectl apply -f -
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-backup
  namespace: longhorn-system
spec:
  cron: "0 2 * * *"
  task: backup
  groups:
  - default
  retain: 30
  concurrency: 1
  labels:
    backup-type: daily
EOF

# Vérifier
kubectl get recurringjobs -n longhorn-system
# Attendu : daily-backup
```

### Test de backup manuel

```bash
# Via l'UI Longhorn ou via kubectl
# Créer un snapshot puis un backup d'un volume
kubectl get volumes.longhorn.io -n longhorn-system

# Pour créer un backup d'un volume spécifique via l'API :
# 1. Accéder à l'UI Longhorn (port-forward ou Ingress)
# 2. Sélectionner le volume
# 3. Create Backup
```

---

## PHASE 16 : Gestion des autorisations

> La gestion des autorisations se fait à deux niveaux :
> - **Statique** : utilisateurs et groupes définis dans Authelia
> - **Dynamique** : politiques d'accès basées sur les attributs (URL, groupes, méthodes HTTP)

### Autorisations statiques : Gestion des utilisateurs

Les utilisateurs sont définis dans le fichier `users_database.yml` d'Authelia.

#### Ajouter un utilisateur

```bash
# Générer le hash du mot de passe
docker run --rm authelia/authelia:latest \
  authelia crypto hash generate argon2 --password "MotDePasseUtilisateur"

# Mettre à jour la ConfigMap des utilisateurs
kubectl edit configmap authelia-users-db -n authelia
```

Structure du fichier `users_database.yml` :

```yaml
users:
  admin:
    disabled: false
    displayname: "Administrateur"
    password: "$argon2id$v=19$m=65536,t=3,p=4$..."
    email: admin@example.com
    groups:
      - admins
      - researchers

  chercheur1:
    disabled: false
    displayname: "Dr. Marie Curie"
    password: "$argon2id$v=19$m=65536,t=3,p=4$..."
    email: marie.curie@example.com
    groups:
      - researchers
      - ecrin-users

  technicien1:
    disabled: false
    displayname: "Jean Technique"
    password: "$argon2id$v=19$m=65536,t=3,p=4$..."
    email: jean.tech@example.com
    groups:
      - technicians
```

#### Groupes disponibles

| Groupe | Description | Accès |
|--------|-------------|-------|
| `admins` | Administrateurs système | Tout (Hubble, Longhorn, ArgoCD, Gitea, etc.) |
| `researchers` | Chercheurs | ECRIN, REDCap (projets), Mattermost, OnlyOffice, Gitea |
| `developers` | Développeurs | Gitea, Mattermost |
| `ecrin-users` | Utilisateurs ECRIN | ECRIN uniquement |
| `redcap-admins` | Administrateurs REDCap | REDCap ControlCenter (2FA) |
| `technicians` | Support technique | Monitoring, logs |

### Autorisations dynamiques : Politiques d'accès Authelia

Les politiques d'accès sont définies dans la section `access_control` de la configuration Authelia.

#### Mettre à jour les politiques

```bash
# Éditer la ConfigMap Authelia
kubectl edit configmap authelia-config -n authelia
```

Configuration recommandée `access_control` :

```yaml
access_control:
  default_policy: deny

  rules:
    # Authelia elle-même - toujours accessible
    - domain: auth.example.com
      policy: bypass

    # API publiques (health checks, etc.)
    - domain: "*.example.com"
      resources:
        - "^/api/health$"
        - "^/api/v[0-9]+/system/ping$"
      policy: bypass

    # ECRIN - accessible aux chercheurs
    - domain: ecrin.example.com
      policy: one_factor
      subject:
        - "group:researchers"
        - "group:ecrin-users"

    # REDCap - accès différencié selon les chemins
    # Formulaires publics (surveys) - accessible sans authentification
    - domain: redcap.example.com
      resources:
        - "^/surveys.*"
        - "^/redcap_v[0-9]+/surveys.*"
      policy: bypass

    # Interface d'administration REDCap - 2FA requis
    - domain: redcap.example.com
      resources:
        - "^/ControlCenter/.*"
        - "^/redcap_v[0-9]+/ControlCenter/.*"
      policy: two_factor
      subject:
        - "group:redcap-admins"

    # Reste de l'interface REDCap (projets, data entry) - chercheurs
    - domain: redcap.example.com
      policy: one_factor
      subject:
        - "group:researchers"
        - "group:redcap-admins"

    # Mattermost - authentification simple
    - domain: chat.example.com
      policy: one_factor
      subject:
        - "group:researchers"
        - "group:technicians"

    # OnlyOffice - accessible aux chercheurs (édition collaborative)
    - domain: office.example.com
      policy: one_factor
      subject:
        - "group:researchers"
        - "group:technicians"

    # Hubble UI - admins uniquement avec 2FA
    - domain: hubble.example.com
      policy: two_factor
      subject:
        - "group:admins"

    # Longhorn UI - admins uniquement avec 2FA
    - domain: longhorn.example.com
      policy: two_factor
      subject:
        - "group:admins"

    # Gitea - accessible aux développeurs et chercheurs
    - domain: git.example.com
      policy: one_factor
      subject:
        - "group:admins"
        - "group:researchers"
        - "group:developers"

    # ArgoCD - admins uniquement avec 2FA (déploiement production)
    - domain: argocd.example.com
      policy: two_factor
      subject:
        - "group:admins"
```

#### Politiques disponibles

| Politique | Description |
|-----------|-------------|
| `bypass` | Pas d'authentification requise |
| `one_factor` | Mot de passe uniquement |
| `two_factor` | Mot de passe + TOTP/WebAuthn |
| `deny` | Accès refusé |

### Configuration OIDC pour les applications

Authelia peut agir comme fournisseur OIDC pour les applications.

#### Activer OIDC dans Authelia

```bash
# Générer les secrets OIDC pour chaque application
export MATTERMOST_OIDC_SECRET=$(openssl rand -hex 32)
export ECRIN_OIDC_SECRET=$(openssl rand -hex 32)
export REDCAP_OIDC_SECRET=$(openssl rand -hex 32)

cat >> ~/k3s-secrets.env <<EOF
MATTERMOST_OIDC_SECRET=${MATTERMOST_OIDC_SECRET}
ECRIN_OIDC_SECRET=${ECRIN_OIDC_SECRET}
REDCAP_OIDC_SECRET=${REDCAP_OIDC_SECRET}
EOF
```

Ajouter la section OIDC dans la configuration Authelia :

```yaml
identity_providers:
  oidc:
    hmac_secret: '${AUTHELIA_OIDC_HMAC_SECRET}'
    jwks:
      - key: |
          -----BEGIN RSA PRIVATE KEY-----
          ... (contenu de /tmp/oidc-private-key.pem)
          -----END RSA PRIVATE KEY-----

    clients:
      - client_id: mattermost
        client_name: Mattermost
        client_secret: '${MATTERMOST_OIDC_SECRET}'
        public: false
        authorization_policy: one_factor
        redirect_uris:
          - https://chat.example.com/signup/gitlab/complete
          - https://chat.example.com/login/gitlab/complete
        scopes:
          - openid
          - profile
          - email
          - groups
        userinfo_signed_response_alg: none

      - client_id: ecrin
        client_name: ECRIN
        client_secret: '${ECRIN_OIDC_SECRET}'
        public: false
        authorization_policy: one_factor
        redirect_uris:
          - https://ecrin.example.com/auth/callback
        scopes:
          - openid
          - profile
          - email
          - groups
        userinfo_signed_response_alg: none

      - client_id: redcap
        client_name: REDCap
        client_secret: '${REDCAP_OIDC_SECRET}'
        public: false
        authorization_policy: one_factor
        redirect_uris:
          - https://redcap.example.com/?oauth2callback
        scopes:
          - openid
          - profile
          - email
        userinfo_signed_response_alg: none
```

### Redémarrer Authelia après modifications

```bash
# Appliquer les changements
kubectl rollout restart deployment auth-server -n authelia

# Vérifier le redémarrage
kubectl rollout status deployment auth-server -n authelia

# Vérifier les logs
kubectl logs -n authelia -l app=auth-server --tail=50
```

### Vérifier la configuration OIDC

```bash
# Tester le endpoint de découverte OIDC
curl -k https://auth.${DOMAIN}/.well-known/openid-configuration | jq .

# Attendu : JSON avec issuer, authorization_endpoint, token_endpoint, etc.
```

---

## PHASE 17 : Sécurité réseau avec Cilium

### Politique par défaut : deny-all

> **Principe de sécurité** : Tout le trafic est bloqué par défaut. On n'autorise explicitement que les flux nécessaires.

```bash
# Politique globale deny-all pour chaque namespace applicatif
for ns in mattermost authelia onlyoffice redcap ecrin gitea argocd; do
cat <<EOF | kubectl apply -f -
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: default-deny-all
  namespace: ${ns}
spec:
  endpointSelector: {}
  ingress:
  - fromEndpoints:
    - {}
  egress:
  - toEndpoints:
    - {}
EOF
done
```

### Autoriser le trafic depuis Cilium Ingress (Envoy)

```bash
# Autoriser Cilium Envoy à atteindre les services exposés
cat <<EOF | kubectl apply -f -
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-from-ingress
  namespace: mattermost
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/name: mattermost-team-edition
  ingress:
  - fromEntities:
    - ingress
    toPorts:
    - ports:
      - port: "8065"
        protocol: TCP
---
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-from-ingress
  namespace: authelia
spec:
  endpointSelector:
    matchLabels:
      app: auth-server
  ingress:
  - fromEntities:
    - ingress
    toPorts:
    - ports:
      - port: "9091"
        protocol: TCP
---
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-from-ingress
  namespace: onlyoffice
spec:
  endpointSelector:
    matchLabels:
      app: onlyoffice
  ingress:
  - fromEntities:
    - ingress
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
---
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-from-ingress
  namespace: redcap
spec:
  endpointSelector:
    matchLabels:
      app: redcap
  ingress:
  - fromEntities:
    - ingress
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
---
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-from-ingress
  namespace: ecrin
spec:
  endpointSelector:
    matchLabels:
      app: ecrin
  ingress:
  - fromEntities:
    - ingress
    toPorts:
    - ports:
      - port: "3000"
        protocol: TCP
---
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-from-ingress
  namespace: gitea
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/name: gitea
  ingress:
  - fromEntities:
    - ingress
    toPorts:
    - ports:
      - port: "3000"
        protocol: TCP
---
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-from-ingress
  namespace: argocd
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  ingress:
  - fromEntities:
    - ingress
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
EOF
```

> **Note** : `fromEntities: ingress` est une entité spéciale Cilium qui représente le trafic provenant de l'Ingress Controller Cilium.

### Autoriser les flux internes (app → base de données)

```bash
cat <<EOF | kubectl apply -f -
# Mattermost → PostgreSQL
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: mattermost-to-postgresql
  namespace: mattermost
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/name: postgresql
  ingress:
  - fromEndpoints:
    - matchLabels:
        app.kubernetes.io/name: mattermost-team-edition
    toPorts:
    - ports:
      - port: "5432"
        protocol: TCP
---
# Mattermost → OnlyOffice (édition collaborative interne)
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: mattermost-to-onlyoffice
  namespace: onlyoffice
spec:
  endpointSelector:
    matchLabels:
      app: onlyoffice
  ingress:
  - fromEndpoints:
    - matchExpressions:
      - key: k8s:io.kubernetes.pod.namespace
        operator: In
        values:
        - mattermost
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
---
# Authelia → Redis
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: authelia-to-redis
  namespace: authelia
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/name: redis
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: auth-server
    toPorts:
    - ports:
      - port: "6379"
        protocol: TCP
---
# REDCap → MariaDB
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: redcap-to-mariadb
  namespace: redcap
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/name: mariadb
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: redcap
    toPorts:
    - ports:
      - port: "3306"
        protocol: TCP
---
# ECRIN → REDCap (API calls)
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: ecrin-to-redcap
  namespace: redcap
spec:
  endpointSelector:
    matchLabels:
      app: redcap
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: ecrin
      matchExpressions:
      - key: io.kubernetes.pod.namespace
        operator: In
        values:
        - ecrin
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
---
# Gitea → PostgreSQL
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: gitea-to-postgresql
  namespace: gitea
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/name: postgresql
  ingress:
  - fromEndpoints:
    - matchLabels:
        app.kubernetes.io/name: gitea
    toPorts:
    - ports:
      - port: "5432"
        protocol: TCP
---
# ArgoCD → Gitea (git clone/fetch)
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: argocd-to-gitea
  namespace: gitea
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/name: gitea
  ingress:
  - fromEndpoints:
    - matchLabels:
        app.kubernetes.io/name: argocd-repo-server
      matchExpressions:
      - key: io.kubernetes.pod.namespace
        operator: In
        values:
        - argocd
    toPorts:
    - ports:
      - port: "3000"
        protocol: TCP
      - port: "22"
        protocol: TCP
---
# ArgoCD → Kubernetes API (deploy applications)
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: argocd-to-kube-api
  namespace: argocd
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-application-controller
  egress:
  - toEntities:
    - kube-apiserver
    toPorts:
    - ports:
      - port: "6443"
        protocol: TCP
EOF
```

### Vérifier les politiques réseau

```bash
# Lister toutes les CiliumNetworkPolicies
kubectl get cnp -A

# Voir le détail d'une politique
kubectl describe cnp allow-from-ingress -n mattermost

# Tester la connectivité (via Cilium CLI)
cilium connectivity test
```

---

## PHASE 18 : Hubble UI (Observabilité réseau)

> **Hubble** est l'outil d'observabilité de Cilium. Il permet de visualiser les flux réseau en temps réel et de déboguer les politiques réseau.

### Accès à Hubble UI

Hubble UI a été activé lors de l'installation de Cilium. Pour y accéder :

```bash
# Option 1 : Port-forward (accès local uniquement)
cilium hubble ui
# Ouvre automatiquement http://localhost:12000 dans le navigateur

# Option 2 : Port-forward manuel
kubectl port-forward -n kube-system svc/hubble-ui 12000:80
# Accéder à http://localhost:12000
```

### Exposer Hubble UI via Ingress (optionnel, accès sécurisé)

> **Attention** : Hubble UI expose des informations sensibles sur le réseau. Ne l'exposer qu'avec authentification.

```bash
export DOMAIN="votre-domaine.com"

cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hubble-ui
  namespace: kube-system
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    # Protection par Authelia (optionnel)
    # Note: Pour protéger Hubble UI via Authelia, configurer l'authentification au niveau Cilium
    # ou utiliser un middleware Authelia compatible
spec:
  ingressClassName: cilium
  tls:
  - hosts:
    - hubble.${DOMAIN}
    secretName: hubble-ui-tls
  rules:
  - host: hubble.${DOMAIN}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: hubble-ui
            port:
              number: 80
EOF
```

### Utilisation de Hubble CLI

```bash
# Installer Hubble CLI
HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/master/stable.txt)
curl -L --fail --remote-name-all \
  https://github.com/cilium/hubble/releases/download/${HUBBLE_VERSION}/hubble-linux-amd64.tar.gz
tar xzvfC hubble-linux-amd64.tar.gz /usr/local/bin
rm hubble-linux-amd64.tar.gz

# Activer le port-forward Hubble Relay
cilium hubble port-forward &

# Observer les flux en temps réel
hubble observe

# Filtrer par namespace
hubble observe --namespace gitea

# Voir les flux bloqués (dropped)
hubble observe --verdict DROPPED

# Voir les flux HTTP
hubble observe --protocol http

# Statistiques réseau
hubble observe --summary
```

### Métriques Hubble attendues

Une fois les NetworkPolicies appliquées, vous devriez voir dans Hubble :

| Flux                        | Verdict   | Description              |
| --------------------------- | --------- | ------------------------ |
| Internet → Cilium Ingress   | FORWARDED | Trafic entrant HTTPS     |
| Ingress → Mattermost        | FORWARDED | Autorisé par CNP         |
| Ingress → Authelia          | FORWARDED | Autorisé par CNP         |
| Ingress → OnlyOffice        | FORWARDED | Autorisé par CNP         |
| Ingress → REDCap            | FORWARDED | Autorisé par CNP         |
| Ingress → ECRIN             | FORWARDED | Autorisé par CNP         |
| Ingress → Gitea             | FORWARDED | Autorisé par CNP         |
| Ingress → ArgoCD            | FORWARDED | Autorisé par CNP         |
| Mattermost → PostgreSQL     | FORWARDED | Autorisé par CNP         |
| Mattermost → OnlyOffice     | FORWARDED | Autorisé par CNP (interne) |
| Authelia → Redis            | FORWARDED | Autorisé par CNP         |
| REDCap → MariaDB              | FORWARDED | Autorisé par CNP         |
| ECRIN → REDCap              | FORWARDED | Autorisé par CNP         |
| Gitea → PostgreSQL          | FORWARDED | Autorisé par CNP         |
| ArgoCD → Gitea              | FORWARDED | Autorisé par CNP         |
| ArgoCD → Kubernetes API     | FORWARDED | Autorisé par CNP         |
| Pod inconnu → Service       | DROPPED   | Bloqué par deny-all      |

---

## Résumé des décisions techniques (retour d'expérience)

| Composant        | Décision                               | Raison                                                                  |
| ---------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| **CNI**          | Cilium (pas Flannel)                   | eBPF haute performance, Network Policies L3/L4/L7, Hubble observabilité |
| **Stockage**     | Longhorn (pas local-path)              | Snapshots, backups S3, restauration, projet CNCF incubating             |
| **Backups**      | Longhorn (pas Velero)                  | Intégré au stockage, moins de composants à gérer                        |
| **Messagerie**   | Mattermost (pas Rocket.Chat)           | OIDC natif, PostgreSQL (plus simple), meilleure intégration Authelia    |
| **Formulaires**  | REDCap v16                             | Standard recherche, utilisé par ECRIN pour les enquêtes                 |
| **OnlyOffice**   | Image all-in-one, accès public         | Chart Helm nécessite NFS, accessible via Authelia                       |
| **Base données** | MariaDB (pas MySQL)                    | Fork communautaire, licence GPL, meilleure compatibilité                |
| **Authelia**     | Déploiement manuel nommé `auth-server` | Chart incompatible + conflit variables env                              |
| **SeaweedFS**    | Chart officiel                         | Images Bitnami nécessitent subscription                                 |
| **Certificats**  | Staging d'abord                        | Éviter les rate limits Let's Encrypt                                    |
| **cert-manager** | Dernière version                       | Toujours utiliser la version la plus récente                            |
| **Forge Git**    | Gitea (pas GitLab)                     | Léger, auto-hébergé, OIDC natif, adapté aux petites équipes             |
| **CD**           | ArgoCD (GitOps)                        | Déploiement déclaratif, synchronisation auto, UI intuitive              |

---

## Fichiers de référence

| Fichier                          | Contenu                                  |
| -------------------------------- | ---------------------------------------- |
| `~/k3s-secrets.env`              | Tous les mots de passe générés           |
| `/etc/rancher/k3s/k3s.yaml`      | Kubeconfig                               |
| `INSTALLATION-K3S-ATLAS.md`      | Documentation complète post-installation |
| `k3s-install.log`                | Log complet de l'installation initiale   |

---

## Maintenance courante

### Vérification santé cluster

```bash
# Santé globale
kubectl get nodes
kubectl get pods -A | grep -v Running

# Ressources
kubectl top nodes
kubectl top pods -A

# Certificats expiration
kubectl get certificates -A
```

### Mises à jour

```bash
# Update Helm repos
helm repo update

# Lister versions disponibles
helm search repo mattermost/mattermost-team-edition
helm search repo bitnami/postgresql

# Créer un snapshot avant mise à jour (via Longhorn UI ou CLI)
# Puis upgrade
helm upgrade mattermost mattermost/mattermost-team-edition \
  --namespace mattermost \
  --reuse-values
```

### Troubleshooting

```bash
# Logs pod spécifique
kubectl logs -n <namespace> <pod-name> --tail=100 -f

# Logs précédent (si crash)
kubectl logs -n <namespace> <pod-name> --previous

# Events namespace
kubectl get events -n <namespace> --sort-by='.lastTimestamp'

# Describe pod
kubectl describe pod -n <namespace> <pod-name>
```

---

## Ressources utiles

- K3s docs : https://docs.k3s.io
- Helm charts : https://artifacthub.io
- Mattermost docs : https://docs.mattermost.com
- REDCap docs : https://projectredcap.org/resources/
- Authelia docs : https://www.authelia.com/integration/openid-connect/introduction/
- SeaweedFS docs : https://github.com/seaweedfs/seaweedfs/wiki
- Longhorn docs : https://longhorn.io/docs
- Cilium docs : https://docs.cilium.io
- cert-manager docs : https://cert-manager.io/docs
- Gitea docs : https://docs.gitea.com
- ArgoCD docs : https://argo-cd.readthedocs.io

---

**Document basé sur l'installation du 30 janvier 2026**
