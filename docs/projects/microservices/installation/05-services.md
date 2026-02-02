# Phase 5: Core Services

This phase installs the core application services: Authentik (IAM), Mattermost (chat), Nextcloud (files + collaborative editing), REDCap (research forms), ECRIN (researcher platform), and Flipt (feature flags).

## Services Compatibility Matrix

### Authentication Methods

| Service | OIDC | LDAP | SAML | Forward Auth | Native Auth |
|---------|------|------|------|--------------|-------------|
| **Authentik** | Provider | Provider | Provider | Provider | ✅ |
| **Nextcloud** | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| **Mattermost** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Gitea** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Grafana** | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| **ArgoCD** | ✅ | ❌ | ✅ | ❌ | ✅ |
| **Vault** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **REDCap** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **ECRIN** | ✅ | ❌ | ❌ | ⚠️ | ❌ |
| **Longhorn UI** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Hubble UI** | ❌ | ❌ | ❌ | ✅ | ❌ |

**Legend**: ✅ Supported | ⚠️ Possible but not recommended | ❌ Not supported

### Integration Strategy

| Service | Method | MFA | Group Sync | Feature Flags |
|---------|--------|-----|------------|---------------|
| **Nextcloud** | OIDC | Via Authentik | ✅ | ✅ (via claims) |
| **Mattermost** | OIDC | Via Authentik | ✅ | ✅ (via claims) |
| **Gitea** | OIDC | Via Authentik | ✅ | ❌ |
| **Grafana** | OIDC | Via Authentik | ✅ | ✅ (via claims) |
| **ArgoCD** | OIDC | Via Authentik | ✅ | ❌ |
| **Vault** | OIDC | Via Authentik | ✅ | ❌ |
| **REDCap** | Forward Auth | Via Authentik | ❌ | ❌ |
| **ECRIN** | OIDC | Via Authentik | ✅ | ✅ (via Flipt) |
| **Flipt** | OIDC | Via Authentik | ✅ | - |
| **Longhorn UI** | Forward Auth | Via Authentik | ❌ | ❌ |
| **Hubble UI** | Forward Auth | Via Authentik | ❌ | ❌ |

### Access Control Matrix

| Service | URL | Default Policy | Admin Policy | Groups |
|---------|-----|----------------|--------------|--------|
| **Authentik** | auth.example.com | - | 2FA | admins |
| **Nextcloud** | cloud.example.com | 1FA | 1FA | researchers, technicians |
| **Mattermost** | chat.example.com | 1FA | 1FA | researchers, technicians |
| **Gitea** | git.example.com | 1FA | 1FA | developers, researchers |
| **Grafana** | grafana.example.com | 2FA | 2FA | admins |
| **ArgoCD** | argocd.example.com | 2FA | 2FA | admins |
| **Vault** | vault.example.com | 2FA | 2FA | admins |
| **REDCap** | redcap.example.com | 1FA | 2FA | researchers, redcap-admins |
| **REDCap Surveys** | redcap.example.com/surveys/* | Bypass | - | - |
| **ECRIN** | ecrin.example.com | 1FA | 1FA | researchers |
| **Flipt** | flags.example.com | 2FA | 2FA | admins, developers |
| **Longhorn UI** | longhorn.example.com | 2FA | 2FA | admins |
| **Hubble UI** | hubble.example.com | 2FA | 2FA | admins |

## Services Overview

| Service | Purpose | Auth Method | Database | Redis |
|---------|---------|-------------|----------|-------|
| Authentik | IAM/SSO/MFA | - | PostgreSQL | Yes |
| Mattermost | Team Messaging | OIDC | PostgreSQL | Yes |
| Nextcloud | Files + Document Editing | OIDC | PostgreSQL | Yes |
| REDCap | Research Forms | Forward Auth | PostgreSQL | - |
| ECRIN | Researcher Platform | OIDC | - | - |
| Flipt | Feature Flags | OIDC | PostgreSQL | - |

## Authentik (Identity & Access Management)

Authentik provides centralized identity management, SSO, MFA, and access control for all services.

### Features

- **User Directory**: Centralized user and group management
- **OIDC/OAuth2 Provider**: SSO for all compatible services
- **Forward Auth**: Protection for services without native auth
- **MFA**: TOTP, WebAuthn, SMS
- **Custom Attributes**: Feature flags, metadata
- **Policies**: Fine-grained access control
- **Audit Logging**: Complete access trail

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Authentik                                  │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │   Users     │  │   Groups    │  │  Attributes │  │  Policies │  │
│  │  (directory)│  │   (roles)   │  │  (flags)    │  │  (rules)  │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │
│         │                │                │                │        │
│         └────────────────┴────────────────┴────────────────┘        │
│                                   │                                 │
│         ┌─────────────────────────┼─────────────────────────┐       │
│         ▼                         ▼                         ▼       │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐ │
│  │    OIDC     │          │    LDAP     │          │Forward Auth │ │
│  │  Providers  │          │  Outpost    │          │   Outpost   │ │
│  └──────┬──────┘          └──────┬──────┘          └──────┬──────┘ │
│         │                        │                        │        │
└─────────┼────────────────────────┼────────────────────────┼────────┘
          ▼                        ▼                        ▼
   ┌────────────┐           ┌────────────┐           ┌────────────┐
   │ Nextcloud  │           │  (future)  │           │  REDCap    │
   │ Mattermost │           │            │           │  Longhorn  │
   │ Gitea      │           │            │           │  Hubble    │
   │ Grafana    │           │            │           │            │
   │ ArgoCD     │           │            │           │            │
   └────────────┘           └────────────┘           └────────────┘
```

### Create Namespace and Secrets

```bash
kubectl create namespace authentik

# Store Authentik credentials in Vault
kubectl exec -n vault vault-0 -- vault kv put secret/services/authentik \
  secret-key="$(openssl rand -base64 60)" \
  admin-password="$(openssl rand -base64 24)" \
  admin-token="$(openssl rand -hex 32)"

cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: authentik-secrets
  namespace: authentik
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: authentik-secrets
    creationPolicy: Owner
  data:
    - secretKey: AUTHENTIK_SECRET_KEY
      remoteRef:
        key: services/authentik
        property: secret-key
    - secretKey: AUTHENTIK_BOOTSTRAP_PASSWORD
      remoteRef:
        key: services/authentik
        property: admin-password
    - secretKey: AUTHENTIK_BOOTSTRAP_TOKEN
      remoteRef:
        key: services/authentik
        property: admin-token
    - secretKey: AUTHENTIK_POSTGRESQL__PASSWORD
      remoteRef:
        key: services/authentik
        property: admin-password
    - secretKey: AUTHENTIK_REDIS__PASSWORD
      remoteRef:
        key: infrastructure/redis
        property: password
EOF

kubectl wait --for=condition=Ready externalsecret/authentik-secrets \
  -n authentik --timeout=60s
```

::: info Database
The `authentik` database was created in [Phase 4: Shared Databases](./04-databases.md#create-application-databases).
:::

### Install Authentik

```bash
export DOMAIN="example.com"

helm repo add authentik https://charts.goauthentik.io
helm repo update

helm install authentik authentik/authentik \
  --namespace authentik \
  --set authentik.secret_key="" \
  --set authentik.postgresql.host=postgresql-postgresql-ha-pgpool.databases.svc \
  --set authentik.postgresql.name=authentik \
  --set authentik.postgresql.user=authentik_user \
  --set authentik.redis.host=redis-master.databases.svc \
  --set server.replicas=1 \
  --set server.resources.requests.memory=256Mi \
  --set server.resources.requests.cpu=100m \
  --set server.resources.limits.memory=512Mi \
  --set worker.replicas=1 \
  --set worker.resources.requests.memory=256Mi \
  --set worker.resources.requests.cpu=100m \
  --set worker.resources.limits.memory=512Mi \
  --set server.ingress.enabled=true \
  --set server.ingress.ingressClassName=cilium \
  --set server.ingress.hosts[0]=auth.${DOMAIN} \
  --set server.ingress.annotations."cert-manager\.io/cluster-issuer"=letsencrypt-prod \
  --set server.ingress.tls[0].hosts[0]=auth.${DOMAIN} \
  --set server.ingress.tls[0].secretName=authentik-tls \
  --set postgresql.enabled=false \
  --set redis.enabled=false \
  --set envFrom[0].secretRef.name=authentik-secrets

kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=authentik -n authentik --timeout=300s
```

### Initial Configuration

After deployment, access `https://auth.${DOMAIN}/if/flow/initial-setup/` to complete setup, then configure via the admin interface or API:

```bash
# Get bootstrap credentials
AUTHENTIK_TOKEN=$(kubectl get secret authentik-secrets -n authentik \
  -o jsonpath='{.data.AUTHENTIK_BOOTSTRAP_TOKEN}' | base64 -d)

# Configure via API
AUTHENTIK_URL="https://auth.${DOMAIN}/api/v3"

# Create groups
curl -X POST "${AUTHENTIK_URL}/core/groups/" \
  -H "Authorization: Bearer ${AUTHENTIK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "admins", "is_superuser": true}'

curl -X POST "${AUTHENTIK_URL}/core/groups/" \
  -H "Authorization: Bearer ${AUTHENTIK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "researchers", "attributes": {"features": ["nextcloud", "mattermost", "redcap", "ecrin"]}}'

curl -X POST "${AUTHENTIK_URL}/core/groups/" \
  -H "Authorization: Bearer ${AUTHENTIK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "technicians", "attributes": {"features": ["nextcloud", "mattermost", "gitea"]}}'

curl -X POST "${AUTHENTIK_URL}/core/groups/" \
  -H "Authorization: Bearer ${AUTHENTIK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "developers", "attributes": {"features": ["nextcloud", "mattermost", "gitea", "argocd"]}}'

curl -X POST "${AUTHENTIK_URL}/core/groups/" \
  -H "Authorization: Bearer ${AUTHENTIK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "redcap-admins", "attributes": {"features": ["redcap-admin"]}}'

curl -X POST "${AUTHENTIK_URL}/core/groups/" \
  -H "Authorization: Bearer ${AUTHENTIK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "beta-testers", "attributes": {"features": ["beta-ui", "experimental"]}}'
```

### Create OIDC Providers

```bash
# Nextcloud OIDC Provider
curl -X POST "${AUTHENTIK_URL}/providers/oauth2/" \
  -H "Authorization: Bearer ${AUTHENTIK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nextcloud",
    "authorization_flow": "default-provider-authorization-implicit-consent",
    "client_type": "confidential",
    "client_id": "nextcloud",
    "client_secret": "'$(openssl rand -base64 32)'",
    "redirect_uris": "https://cloud.'${DOMAIN}'/apps/oidc_login/oidc",
    "property_mappings": ["goauthentik.io/providers/oauth2/scope-email", "goauthentik.io/providers/oauth2/scope-openid", "goauthentik.io/providers/oauth2/scope-profile"],
    "sub_mode": "user_email"
  }'

# Mattermost OIDC Provider
curl -X POST "${AUTHENTIK_URL}/providers/oauth2/" \
  -H "Authorization: Bearer ${AUTHENTIK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mattermost",
    "authorization_flow": "default-provider-authorization-implicit-consent",
    "client_type": "confidential",
    "client_id": "mattermost",
    "client_secret": "'$(openssl rand -base64 32)'",
    "redirect_uris": "https://chat.'${DOMAIN}'/signup/gitlab/complete\nhttps://chat.'${DOMAIN}'/login/gitlab/complete",
    "property_mappings": ["goauthentik.io/providers/oauth2/scope-email", "goauthentik.io/providers/oauth2/scope-openid", "goauthentik.io/providers/oauth2/scope-profile"],
    "sub_mode": "user_email"
  }'

# Gitea OIDC Provider
curl -X POST "${AUTHENTIK_URL}/providers/oauth2/" \
  -H "Authorization: Bearer ${AUTHENTIK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gitea",
    "authorization_flow": "default-provider-authorization-implicit-consent",
    "client_type": "confidential",
    "client_id": "gitea",
    "client_secret": "'$(openssl rand -base64 32)'",
    "redirect_uris": "https://git.'${DOMAIN}'/user/oauth2/authentik/callback",
    "property_mappings": ["goauthentik.io/providers/oauth2/scope-email", "goauthentik.io/providers/oauth2/scope-openid", "goauthentik.io/providers/oauth2/scope-profile"],
    "sub_mode": "user_email"
  }'

# Grafana OIDC Provider
curl -X POST "${AUTHENTIK_URL}/providers/oauth2/" \
  -H "Authorization: Bearer ${AUTHENTIK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Grafana",
    "authorization_flow": "default-provider-authorization-implicit-consent",
    "client_type": "confidential",
    "client_id": "grafana",
    "client_secret": "'$(openssl rand -base64 32)'",
    "redirect_uris": "https://grafana.'${DOMAIN}'/login/generic_oauth",
    "property_mappings": ["goauthentik.io/providers/oauth2/scope-email", "goauthentik.io/providers/oauth2/scope-openid", "goauthentik.io/providers/oauth2/scope-profile"],
    "sub_mode": "user_email"
  }'

# ArgoCD OIDC Provider
curl -X POST "${AUTHENTIK_URL}/providers/oauth2/" \
  -H "Authorization: Bearer ${AUTHENTIK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ArgoCD",
    "authorization_flow": "default-provider-authorization-implicit-consent",
    "client_type": "confidential",
    "client_id": "argocd",
    "client_secret": "'$(openssl rand -base64 32)'",
    "redirect_uris": "https://argocd.'${DOMAIN}'/auth/callback",
    "property_mappings": ["goauthentik.io/providers/oauth2/scope-email", "goauthentik.io/providers/oauth2/scope-openid", "goauthentik.io/providers/oauth2/scope-profile"],
    "sub_mode": "user_email"
  }'

# ECRIN OIDC Provider
curl -X POST "${AUTHENTIK_URL}/providers/oauth2/" \
  -H "Authorization: Bearer ${AUTHENTIK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ECRIN",
    "authorization_flow": "default-provider-authorization-implicit-consent",
    "client_type": "confidential",
    "client_id": "ecrin",
    "client_secret": "'$(openssl rand -base64 32)'",
    "redirect_uris": "https://ecrin.'${DOMAIN}'/auth/callback",
    "property_mappings": ["goauthentik.io/providers/oauth2/scope-email", "goauthentik.io/providers/oauth2/scope-openid", "goauthentik.io/providers/oauth2/scope-profile"],
    "sub_mode": "user_email"
  }'
```

### Create Forward Auth Provider (Proxy)

For services without native OIDC support:

```bash
# Create Proxy Provider for REDCap, Longhorn, Hubble
curl -X POST "${AUTHENTIK_URL}/providers/proxy/" \
  -H "Authorization: Bearer ${AUTHENTIK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Forward Auth",
    "authorization_flow": "default-provider-authorization-implicit-consent",
    "mode": "forward_single",
    "external_host": "https://auth.'${DOMAIN}'"
  }'
```

### Deploy Authentik Outpost (Forward Auth)

```bash
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: authentik-outpost
  namespace: authentik
spec:
  replicas: 1
  selector:
    matchLabels:
      app: authentik-outpost
  template:
    metadata:
      labels:
        app: authentik-outpost
    spec:
      containers:
      - name: outpost
        image: ghcr.io/goauthentik/proxy:2024.2
        ports:
        - containerPort: 9000
        - containerPort: 9443
        env:
        - name: AUTHENTIK_HOST
          value: "https://auth.${DOMAIN}"
        - name: AUTHENTIK_INSECURE
          value: "false"
        - name: AUTHENTIK_TOKEN
          valueFrom:
            secretKeyRef:
              name: authentik-outpost-token
              key: token
        resources:
          requests:
            memory: 64Mi
            cpu: 25m
          limits:
            memory: 128Mi
---
apiVersion: v1
kind: Service
metadata:
  name: authentik-outpost
  namespace: authentik
spec:
  ports:
  - name: http
    port: 9000
    targetPort: 9000
  - name: https
    port: 9443
    targetPort: 9443
  selector:
    app: authentik-outpost
EOF
```

### Custom Property Mapping for Feature Flags

Create a custom scope that includes feature flags:

```bash
# Create custom property mapping for features
curl -X POST "${AUTHENTIK_URL}/propertymappings/scope/" \
  -H "Authorization: Bearer ${AUTHENTIK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OIDC Feature Flags",
    "scope_name": "features",
    "expression": "return {\"features\": list(set(request.user.group_attributes().get(\"features\", []) + request.user.attributes.get(\"features\", [])))}"
  }'
```

This maps group and user feature flags to an OIDC claim:

```json
{
  "features": ["beta-ui", "nextcloud", "mattermost", "experimental"]
}
```

## Mattermost (Team Messaging)

### Create Namespace and Secrets

```bash
kubectl create namespace mattermost

cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: mattermost-secrets
  namespace: mattermost
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: mattermost-secrets
    creationPolicy: Owner
    template:
      data:
        MM_SQLSETTINGS_DATASOURCE: "postgres://mattermost_user:{{ .dbPassword }}@postgresql-postgresql-ha-pgpool.databases.svc:5432/mattermost?sslmode=disable&connect_timeout=10"
  data:
    - secretKey: dbPassword
      remoteRef:
        key: services/mattermost
        property: db-password
EOF

kubectl wait --for=condition=Ready externalsecret/mattermost-secrets \
  -n mattermost --timeout=60s
```

### Install Mattermost

```bash
helm install mattermost mattermost/mattermost-team-edition \
  --namespace mattermost \
  --set ingress.enabled=true \
  --set ingress.className=cilium \
  --set ingress.hosts[0].host=chat.${DOMAIN} \
  --set ingress.annotations."cert-manager\.io/cluster-issuer"=letsencrypt-prod \
  --set ingress.tls[0].hosts[0]=chat.${DOMAIN} \
  --set ingress.tls[0].secretName=mattermost-tls \
  --set mysql.enabled=false \
  --set externalDB.enabled=true \
  --set externalDB.externalDriverType=postgres \
  --set externalDB.externalConnectionString="" \
  --set extraEnvVars[0].name=MM_SQLSETTINGS_DATASOURCE \
  --set extraEnvVars[0].valueFrom.secretKeyRef.name=mattermost-secrets \
  --set extraEnvVars[0].valueFrom.secretKeyRef.key=MM_SQLSETTINGS_DATASOURCE \
  --set persistence.data.enabled=true \
  --set persistence.data.storageClass=longhorn-encrypted \
  --set persistence.data.size=10Gi \
  --set resources.requests.memory=256Mi \
  --set resources.requests.cpu=100m \
  --set resources.limits.memory=512Mi

kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=mattermost-team-edition \
  -n mattermost --timeout=300s
```

### Configure Mattermost OIDC (Authentik)

```bash
# Get Mattermost OIDC secret from Authentik
# (retrieve from Authentik admin UI or API)
MATTERMOST_OIDC_SECRET="<from-authentik>"

kubectl exec -n mattermost deploy/mattermost-team-edition -- \
  mmctl config set GitLabSettings.Enable true
kubectl exec -n mattermost deploy/mattermost-team-edition -- \
  mmctl config set GitLabSettings.Id mattermost
kubectl exec -n mattermost deploy/mattermost-team-edition -- \
  mmctl config set GitLabSettings.Secret "${MATTERMOST_OIDC_SECRET}"
kubectl exec -n mattermost deploy/mattermost-team-edition -- \
  mmctl config set GitLabSettings.AuthEndpoint "https://auth.${DOMAIN}/application/o/authorize/"
kubectl exec -n mattermost deploy/mattermost-team-edition -- \
  mmctl config set GitLabSettings.TokenEndpoint "https://auth.${DOMAIN}/application/o/token/"
kubectl exec -n mattermost deploy/mattermost-team-edition -- \
  mmctl config set GitLabSettings.UserApiEndpoint "https://auth.${DOMAIN}/application/o/userinfo/"
```

## SeaweedFS (S3 Storage Backend)

SeaweedFS provides S3-compatible object storage for Nextcloud.

### Create Namespace and Secrets

```bash
kubectl create namespace seaweedfs

# Store SeaweedFS credentials in Vault
kubectl exec -n vault vault-0 -- vault kv put secret/infrastructure/seaweedfs \
  s3-access-key="$(openssl rand -hex 16)" \
  s3-secret-key="$(openssl rand -base64 32)"

cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: seaweedfs-secrets
  namespace: seaweedfs
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: seaweedfs-secrets
    creationPolicy: Owner
  data:
    - secretKey: s3-access-key
      remoteRef:
        key: infrastructure/seaweedfs
        property: s3-access-key
    - secretKey: s3-secret-key
      remoteRef:
        key: infrastructure/seaweedfs
        property: s3-secret-key
EOF

kubectl wait --for=condition=Ready externalsecret/seaweedfs-secrets \
  -n seaweedfs --timeout=60s
```

### Install SeaweedFS

```bash
helm install seaweedfs seaweedfs/seaweedfs \
  --namespace seaweedfs \
  --set master.replicas=1 \
  --set master.persistence.enabled=true \
  --set master.persistence.storageClass=longhorn-encrypted \
  --set master.persistence.size=1Gi \
  --set volume.replicas=1 \
  --set volume.persistence.enabled=true \
  --set volume.persistence.storageClass=longhorn-encrypted \
  --set volume.persistence.size=100Gi \
  --set filer.enabled=true \
  --set filer.replicas=1 \
  --set filer.persistence.enabled=true \
  --set filer.persistence.storageClass=longhorn-encrypted \
  --set filer.persistence.size=10Gi \
  --set filer.s3.enabled=true \
  --set filer.s3.port=8333 \
  --set filer.s3.existingSecret=seaweedfs-secrets \
  --set filer.s3.existingSecretAccessKeyKey=s3-access-key \
  --set filer.s3.existingSecretSecretKeyKey=s3-secret-key \
  --set s3.enabled=true \
  --set s3.ingress.enabled=false

kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=seaweedfs \
  -n seaweedfs --timeout=300s
```

### Create Nextcloud Bucket

```bash
S3_ACCESS_KEY=$(kubectl get secret seaweedfs-secrets -n seaweedfs -o jsonpath='{.data.s3-access-key}' | base64 -d)
S3_SECRET_KEY=$(kubectl get secret seaweedfs-secrets -n seaweedfs -o jsonpath='{.data.s3-secret-key}' | base64 -d)

kubectl run aws-cli --rm -it --restart=Never \
  --image=amazon/aws-cli \
  --env="AWS_ACCESS_KEY_ID=${S3_ACCESS_KEY}" \
  --env="AWS_SECRET_ACCESS_KEY=${S3_SECRET_KEY}" \
  -- --endpoint-url=http://seaweedfs-s3.seaweedfs.svc:8333 s3 mb s3://nextcloud
```

## Nextcloud (Files + Collaborative Editing)

### Create Namespace and Secrets

```bash
kubectl create namespace nextcloud

# Store Nextcloud credentials in Vault
kubectl exec -n vault vault-0 -- vault kv put secret/services/nextcloud \
  admin-password="$(openssl rand -base64 24)" \
  db-password="$(openssl rand -base64 32)"

cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: nextcloud-secrets
  namespace: nextcloud
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: nextcloud-secrets
    creationPolicy: Owner
  data:
    - secretKey: nextcloud-admin-password
      remoteRef:
        key: services/nextcloud
        property: admin-password
    - secretKey: db-password
      remoteRef:
        key: services/nextcloud
        property: db-password
    - secretKey: s3-access-key
      remoteRef:
        key: infrastructure/seaweedfs
        property: s3-access-key
    - secretKey: s3-secret-key
      remoteRef:
        key: infrastructure/seaweedfs
        property: s3-secret-key
    - secretKey: redis-password
      remoteRef:
        key: infrastructure/redis
        property: password
EOF

kubectl wait --for=condition=Ready externalsecret/nextcloud-secrets \
  -n nextcloud --timeout=60s
```

::: info Database
The `nextcloud` database and `nextcloud_user` were created in [Phase 4: Shared Databases](./04-databases.md#create-application-databases).
:::

### Install Nextcloud

```bash
helm repo add nextcloud https://nextcloud.github.io/helm/
helm repo update

helm install nextcloud nextcloud/nextcloud \
  --namespace nextcloud \
  --set nextcloud.host=cloud.${DOMAIN} \
  --set nextcloud.username=admin \
  --set nextcloud.existingSecret.enabled=true \
  --set nextcloud.existingSecret.secretName=nextcloud-secrets \
  --set nextcloud.existingSecret.usernameKey=nextcloud-admin-user \
  --set nextcloud.existingSecret.passwordKey=nextcloud-admin-password \
  --set nextcloud.extraEnv[0].name=POSTGRES_HOST \
  --set nextcloud.extraEnv[0].value=postgresql-postgresql-ha-pgpool.databases.svc \
  --set nextcloud.extraEnv[1].name=POSTGRES_DB \
  --set nextcloud.extraEnv[1].value=nextcloud \
  --set nextcloud.extraEnv[2].name=POSTGRES_USER \
  --set nextcloud.extraEnv[2].value=nextcloud_user \
  --set nextcloud.extraEnv[3].name=POSTGRES_PASSWORD \
  --set nextcloud.extraEnv[3].valueFrom.secretKeyRef.name=nextcloud-secrets \
  --set nextcloud.extraEnv[3].valueFrom.secretKeyRef.key=db-password \
  --set nextcloud.extraEnv[4].name=REDIS_HOST \
  --set nextcloud.extraEnv[4].value=redis-master.databases.svc \
  --set nextcloud.extraEnv[5].name=REDIS_HOST_PASSWORD \
  --set nextcloud.extraEnv[5].valueFrom.secretKeyRef.name=nextcloud-secrets \
  --set nextcloud.extraEnv[5].valueFrom.secretKeyRef.key=redis-password \
  --set nextcloud.extraEnv[6].name=OBJECTSTORE_S3_HOST \
  --set nextcloud.extraEnv[6].value=seaweedfs-s3.seaweedfs.svc \
  --set nextcloud.extraEnv[7].name=OBJECTSTORE_S3_PORT \
  --set nextcloud.extraEnv[7].value="8333" \
  --set nextcloud.extraEnv[8].name=OBJECTSTORE_S3_SSL \
  --set nextcloud.extraEnv[8].value="false" \
  --set nextcloud.extraEnv[9].name=OBJECTSTORE_S3_BUCKET \
  --set nextcloud.extraEnv[9].value=nextcloud \
  --set nextcloud.extraEnv[10].name=OBJECTSTORE_S3_KEY \
  --set nextcloud.extraEnv[10].valueFrom.secretKeyRef.name=nextcloud-secrets \
  --set nextcloud.extraEnv[10].valueFrom.secretKeyRef.key=s3-access-key \
  --set nextcloud.extraEnv[11].name=OBJECTSTORE_S3_SECRET \
  --set nextcloud.extraEnv[11].valueFrom.secretKeyRef.name=nextcloud-secrets \
  --set nextcloud.extraEnv[11].valueFrom.secretKeyRef.key=s3-secret-key \
  --set nextcloud.extraEnv[12].name=OBJECTSTORE_S3_USEPATH_STYLE \
  --set nextcloud.extraEnv[12].value="true" \
  --set internalDatabase.enabled=false \
  --set externalDatabase.enabled=true \
  --set externalDatabase.type=postgresql \
  --set externalDatabase.host=postgresql-postgresql-ha-pgpool.databases.svc \
  --set externalDatabase.database=nextcloud \
  --set externalDatabase.user=nextcloud_user \
  --set externalDatabase.existingSecret.enabled=true \
  --set externalDatabase.existingSecret.secretName=nextcloud-secrets \
  --set externalDatabase.existingSecret.passwordKey=db-password \
  --set redis.enabled=false \
  --set cronjob.enabled=true \
  --set persistence.enabled=true \
  --set persistence.storageClass=longhorn-encrypted \
  --set persistence.size=10Gi \
  --set resources.requests.memory=512Mi \
  --set resources.requests.cpu=200m \
  --set resources.limits.memory=1Gi \
  --set ingress.enabled=true \
  --set ingress.className=cilium \
  --set ingress.annotations."cert-manager\.io/cluster-issuer"=letsencrypt-prod \
  --set ingress.tls[0].hosts[0]=cloud.${DOMAIN} \
  --set ingress.tls[0].secretName=nextcloud-tls

kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=nextcloud \
  -n nextcloud --timeout=600s
```

### Configure Nextcloud Apps and OIDC (Authentik)

```bash
# Get OIDC secret from Authentik
NEXTCLOUD_OIDC_SECRET="<from-authentik>"

# Install apps and configure OIDC
kubectl exec -n nextcloud deploy/nextcloud -- su -s /bin/bash www-data -c "
  php occ app:install groupfolders
  php occ app:install onlyoffice
  php occ app:install oidc_login
  php occ app:install activity

  # Disable unwanted apps
  php occ app:disable dashboard
  php occ app:disable weather_status
  php occ app:disable firstrunwizard

  # Configure OIDC login (Authentik)
  php occ config:app:set oidc_login provider_url --value='https://auth.${DOMAIN}/application/o/nextcloud/'
  php occ config:app:set oidc_login client_id --value='nextcloud'
  php occ config:app:set oidc_login client_secret --value='${NEXTCLOUD_OIDC_SECRET}'
  php occ config:app:set oidc_login login_button_text --value='Login with Authentik'
  php occ config:app:set oidc_login disable_registration --value='0'
  php occ config:app:set oidc_login auto_redirect --value='0'
  php occ config:app:set oidc_login mode --value='email'
"
```

### Install OnlyOffice Document Server

```bash
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: onlyoffice-ds
  namespace: nextcloud
spec:
  replicas: 1
  selector:
    matchLabels:
      app: onlyoffice-ds
  template:
    metadata:
      labels:
        app: onlyoffice-ds
    spec:
      containers:
      - name: onlyoffice
        image: onlyoffice/documentserver:8.2
        ports:
        - containerPort: 80
        env:
        - name: JWT_ENABLED
          value: "true"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: onlyoffice-jwt
              key: secret
        resources:
          requests:
            memory: 1Gi
            cpu: 500m
          limits:
            memory: 2Gi
            cpu: 2000m
        volumeMounts:
        - name: data
          mountPath: /var/lib/onlyoffice
      volumes:
      - name: data
        emptyDir: {}
---
apiVersion: v1
kind: Secret
metadata:
  name: onlyoffice-jwt
  namespace: nextcloud
type: Opaque
stringData:
  secret: "$(openssl rand -base64 32)"
---
apiVersion: v1
kind: Service
metadata:
  name: onlyoffice-ds
  namespace: nextcloud
spec:
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: onlyoffice-ds
EOF

kubectl wait --for=condition=ready pod \
  -l app=onlyoffice-ds -n nextcloud --timeout=300s

# Configure OnlyOffice in Nextcloud
kubectl exec -n nextcloud deploy/nextcloud -- su -s /bin/bash www-data -c "
  php occ config:app:set onlyoffice DocumentServerUrl --value='http://onlyoffice-ds.nextcloud.svc/'
  php occ config:app:set onlyoffice jwt_secret --value='\$(kubectl get secret onlyoffice-jwt -n nextcloud -o jsonpath=\"{.data.secret}\" | base64 -d)'
"
```

## REDCap (Research Data Capture)

REDCap doesn't support OIDC natively, so we use Authentik Forward Auth.

::: warning Prerequisites
REDCap requires a valid license from Vanderbilt University.
:::

### Create Namespace and Secrets

```bash
kubectl create namespace redcap

cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: redcap-secrets
  namespace: redcap
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: redcap-secrets
    creationPolicy: Owner
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: services/redcap
        property: db-password
    - secretKey: SALT
      remoteRef:
        key: services/redcap
        property: salt
EOF

kubectl wait --for=condition=Ready externalsecret/redcap-secrets \
  -n redcap --timeout=60s
```

### Install REDCap with Forward Auth

```bash
cat <<EOF | kubectl apply -f -
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
        - name: DB_HOSTNAME
          value: "postgresql-postgresql-ha-pgpool.databases.svc"
        - name: DB_NAME
          value: "redcap"
        - name: DB_USERNAME
          value: "redcap_user"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redcap-secrets
              key: DB_PASSWORD
        - name: REDCAP_SALT
          valueFrom:
            secretKeyRef:
              name: redcap-secrets
              key: SALT
        resources:
          requests:
            memory: 256Mi
            cpu: 100m
          limits:
            memory: 512Mi
            cpu: 500m
        volumeMounts:
        - name: redcap-data
          mountPath: /var/www/html
        - name: redcap-edocs
          mountPath: /var/edocs
      volumes:
      - name: redcap-data
        persistentVolumeClaim:
          claimName: redcap-data
      - name: redcap-edocs
        persistentVolumeClaim:
          claimName: redcap-edocs
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redcap-data
  namespace: redcap
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: longhorn-encrypted
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redcap-edocs
  namespace: redcap
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: longhorn-encrypted
---
apiVersion: v1
kind: Service
metadata:
  name: redcap
  namespace: redcap
spec:
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: redcap
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: redcap
  namespace: redcap
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
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
      # Public surveys - no auth
      - path: /surveys
        pathType: Prefix
        backend:
          service:
            name: redcap
            port:
              number: 80
      # Everything else - forward auth
      - path: /
        pathType: Prefix
        backend:
          service:
            name: redcap
            port:
              number: 80
---
# Middleware for forward auth (if using Traefik/similar)
# For Cilium, configure via CiliumNetworkPolicy or use authentik-outpost
EOF
```

## ECRIN (Researcher Platform)

```bash
kubectl create namespace ecrin

# Store OIDC secret in Vault (get from Authentik after creating provider)
ECRIN_OIDC_SECRET="<from-authentik>"
kubectl exec -n vault vault-0 -- vault kv put secret/services/ecrin \
  oidc-secret="${ECRIN_OIDC_SECRET}"

# Create ExternalSecret for ECRIN OIDC
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: ecrin-oidc-secret
  namespace: ecrin
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: ecrin-oidc-secret
    creationPolicy: Owner
  data:
    - secretKey: client-secret
      remoteRef:
        key: services/ecrin
        property: oidc-secret
EOF

kubectl wait --for=condition=Ready externalsecret/ecrin-oidc-secret \
  -n ecrin --timeout=60s

cat <<EOF | kubectl apply -f -
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
        env:
        - name: NODE_ENV
          value: "production"
        - name: OIDC_ISSUER
          value: "https://auth.${DOMAIN}/application/o/ecrin/"
        - name: OIDC_CLIENT_ID
          value: "ecrin"
        - name: OIDC_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: ecrin-oidc-secret
              key: client-secret
        resources:
          requests:
            memory: 128Mi
            cpu: 50m
          limits:
            memory: 256Mi
            cpu: 200m
---
apiVersion: v1
kind: Service
metadata:
  name: ecrin
  namespace: ecrin
spec:
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: ecrin
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ecrin
  namespace: ecrin
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
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
              number: 80
EOF
```

## Flipt (Feature Flags)

Flipt provides feature flag management with a modern UI, OIDC authentication, and OpenFeature SDK compatibility.

### Why Flipt?

| Feature | Flipt | OpenFeature + flagd |
|---------|-------|---------------------|
| **UI Admin** | ✅ Integrated | ❌ None |
| **OIDC** | ✅ Native | ⚠️ Via proxy |
| **Audit Logs** | ✅ Built-in | ❌ Manual |
| **OpenFeature SDK** | ✅ Provider | ✅ Native |
| **GitOps** | ✅ YAML import | ✅ ConfigMaps |
| **Resources** | ~64MB | ~64MB |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Flipt Feature Flags                       │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │    Flags     │    │   Segments   │    │   Rollouts   │       │
│  │  (toggles)   │    │  (targeting) │    │ (percentage) │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         └───────────────────┴───────────────────┘                │
│                             │                                    │
│                   ┌─────────▼─────────┐                          │
│                   │   Evaluation API  │                          │
│                   │   (gRPC + REST)   │                          │
│                   └─────────┬─────────┘                          │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   ┌──────────┐         ┌──────────┐         ┌──────────┐
   │  ECRIN   │         │ Nextcloud │        │ Grafana  │
   │ (TS SDK) │         │ (PHP SDK) │        │  (Go)    │
   └──────────┘         └──────────┘         └──────────┘
```

### Create Namespace and Secrets

```bash
kubectl create namespace flipt

# Store Flipt credentials in Vault
kubectl exec -n vault vault-0 -- vault kv put secret/services/flipt \
  db-password="$(openssl rand -base64 32)"

cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: flipt-secrets
  namespace: flipt
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: flipt-secrets
    creationPolicy: Owner
  data:
    - secretKey: db-password
      remoteRef:
        key: services/flipt
        property: db-password
EOF

kubectl wait --for=condition=Ready externalsecret/flipt-secrets \
  -n flipt --timeout=60s
```

::: info Database
The `flipt` database and `flipt_user` were created in [Phase 4: Shared Databases](./04-databases.md#create-application-databases).
:::

### Create Flipt OIDC Provider in Authentik

```bash
# Create OIDC Provider for Flipt
curl -X POST "${AUTHENTIK_URL}/providers/oauth2/" \
  -H "Authorization: Bearer ${AUTHENTIK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Flipt",
    "authorization_flow": "default-provider-authorization-implicit-consent",
    "client_type": "confidential",
    "client_id": "flipt",
    "client_secret": "'$(openssl rand -base64 32)'",
    "redirect_uris": "https://flags.'${DOMAIN}'/auth/callback",
    "property_mappings": ["goauthentik.io/providers/oauth2/scope-email", "goauthentik.io/providers/oauth2/scope-openid", "goauthentik.io/providers/oauth2/scope-profile"],
    "sub_mode": "user_email"
  }'
```

### Install Flipt

```bash
# Store OIDC secret in Vault (get from Authentik after creating provider)
FLIPT_OIDC_SECRET="<from-authentik>"
kubectl exec -n vault vault-0 -- vault kv patch secret/services/flipt \
  oidc-secret="${FLIPT_OIDC_SECRET}"

# Update ExternalSecret to include OIDC secret
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: flipt-secrets
  namespace: flipt
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: flipt-secrets
    creationPolicy: Owner
    template:
      data:
        db-password: "{{ .dbPassword }}"
        oidc-secret: "{{ .oidcSecret }}"
        database-url: "postgres://flipt_user:{{ .dbPassword }}@postgresql-postgresql-ha-pgpool.databases.svc:5432/flipt?sslmode=disable"
  data:
    - secretKey: dbPassword
      remoteRef:
        key: services/flipt
        property: db-password
    - secretKey: oidcSecret
      remoteRef:
        key: services/flipt
        property: oidc-secret
EOF

kubectl wait --for=condition=Ready externalsecret/flipt-secrets \
  -n flipt --timeout=60s

# ConfigMap with placeholders for secrets (injected via env vars)
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: flipt-config
  namespace: flipt
data:
  flipt.yaml: |
    log:
      level: info

    db:
      url: \${FLIPT_DATABASE_URL}

    authentication:
      required: true
      session:
        domain: flags.${DOMAIN}
        secure: true
      methods:
        oidc:
          enabled: true
          providers:
            authentik:
              issuer_url: https://auth.${DOMAIN}/application/o/flipt/
              client_id: flipt
              client_secret: \${FLIPT_OIDC_SECRET}
              redirect_address: https://flags.${DOMAIN}
              scopes:
                - openid
                - profile
                - email

    audit:
      sinks:
        log:
          enabled: true

    meta:
      telemetry_enabled: false
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flipt
  namespace: flipt
spec:
  replicas: 1
  selector:
    matchLabels:
      app: flipt
  template:
    metadata:
      labels:
        app: flipt
    spec:
      containers:
      - name: flipt
        image: flipt/flipt:v1.37.1
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9000
          name: grpc
        args:
          - --config
          - /etc/flipt/flipt.yaml
        env:
        - name: FLIPT_DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: flipt-secrets
              key: database-url
        - name: FLIPT_OIDC_SECRET
          valueFrom:
            secretKeyRef:
              name: flipt-secrets
              key: oidc-secret
        resources:
          requests:
            memory: 64Mi
            cpu: 25m
          limits:
            memory: 128Mi
            cpu: 200m
        volumeMounts:
        - name: config
          mountPath: /etc/flipt
          readOnly: true
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: flipt-config
---
apiVersion: v1
kind: Service
metadata:
  name: flipt
  namespace: flipt
spec:
  ports:
  - name: http
    port: 8080
    targetPort: 8080
  - name: grpc
    port: 9000
    targetPort: 9000
  selector:
    app: flipt
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flipt
  namespace: flipt
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: cilium
  tls:
  - hosts:
    - flags.${DOMAIN}
    secretName: flipt-tls
  rules:
  - host: flags.${DOMAIN}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: flipt
            port:
              number: 8080
EOF

kubectl wait --for=condition=ready pod \
  -l app=flipt -n flipt --timeout=120s
```

### Create Initial Flags via API

```bash
# Create namespace and flags via Flipt API
FLIPT_URL="https://flags.${DOMAIN}"

# Create namespace for ECRIN
curl -X POST "${FLIPT_URL}/api/v1/namespaces" \
  -H "Content-Type: application/json" \
  -d '{"key": "ecrin", "name": "ECRIN Application", "description": "Feature flags for ECRIN researcher platform"}'

# Create beta-ui flag
curl -X POST "${FLIPT_URL}/api/v1/namespaces/ecrin/flags" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "beta-ui",
    "name": "Beta UI",
    "description": "Enable new beta user interface",
    "enabled": true,
    "type": "BOOLEAN_FLAG_TYPE"
  }'

# Create experimental flag
curl -X POST "${FLIPT_URL}/api/v1/namespaces/ecrin/flags" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "experimental",
    "name": "Experimental Features",
    "description": "Enable experimental features for testing",
    "enabled": true,
    "type": "BOOLEAN_FLAG_TYPE"
  }'

# Create new-dashboard flag with variants
curl -X POST "${FLIPT_URL}/api/v1/namespaces/ecrin/flags" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "new-dashboard",
    "name": "New Dashboard",
    "description": "Progressive rollout of new dashboard",
    "enabled": true,
    "type": "VARIANT_FLAG_TYPE"
  }'

# Add variants
curl -X POST "${FLIPT_URL}/api/v1/namespaces/ecrin/flags/new-dashboard/variants" \
  -H "Content-Type: application/json" \
  -d '{"key": "control", "name": "Control (Old Dashboard)"}'

curl -X POST "${FLIPT_URL}/api/v1/namespaces/ecrin/flags/new-dashboard/variants" \
  -H "Content-Type: application/json" \
  -d '{"key": "treatment", "name": "Treatment (New Dashboard)"}'

# Create segment for beta testers
curl -X POST "${FLIPT_URL}/api/v1/namespaces/ecrin/segments" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "beta-testers",
    "name": "Beta Testers",
    "description": "Users in the beta testing program",
    "match_type": "ANY_MATCH_TYPE"
  }'

# Add constraint: users with beta-tester group
curl -X POST "${FLIPT_URL}/api/v1/namespaces/ecrin/segments/beta-testers/constraints" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "STRING_COMPARISON_TYPE",
    "property": "groups",
    "operator": "eq",
    "value": "beta-testers"
  }'
```

### Integration with OpenFeature SDK

Applications can use the standard OpenFeature SDK with Flipt provider:

```typescript
// packages/find-an-expert/src/lib/server/feature-flags.ts
import { OpenFeature } from '@openfeature/server-sdk';
import { FliptProvider } from '@openfeature/flipt-provider';

// Initialize Flipt provider
const provider = new FliptProvider({
  url: process.env.FLIPT_URL || 'http://flipt.flipt.svc:8080',
  namespace: 'ecrin'
});

OpenFeature.setProvider(provider);

const client = OpenFeature.getClient();

export interface FeatureContext {
  userId: string;
  email: string;
  groups: string[];
}

export async function getFeatureFlags(context: FeatureContext) {
  const evaluationContext = {
    targetingKey: context.userId,
    email: context.email,
    groups: context.groups.join(',')
  };

  const [betaUI, experimental, newDashboard] = await Promise.all([
    client.getBooleanValue('beta-ui', false, evaluationContext),
    client.getBooleanValue('experimental', false, evaluationContext),
    client.getStringValue('new-dashboard', 'control', evaluationContext)
  ]);

  return {
    betaUI,
    experimental,
    newDashboard: newDashboard === 'treatment'
  };
}

// Usage in SvelteKit load function
export async function load({ locals }) {
  const session = await getSession(locals);

  if (!session?.user) {
    return { flags: { betaUI: false, experimental: false, newDashboard: false } };
  }

  const flags = await getFeatureFlags({
    userId: session.user.id,
    email: session.user.email,
    groups: session.user.groups || []
  });

  return { user: session.user, flags };
}
```

### GitOps: Flags as Code

Store flags in Git for version control:

```yaml
# flags/ecrin.yaml
namespace: ecrin
flags:
  - key: beta-ui
    name: Beta UI
    description: Enable new beta user interface
    enabled: true
    type: BOOLEAN_FLAG_TYPE

  - key: experimental
    name: Experimental Features
    enabled: false
    type: BOOLEAN_FLAG_TYPE

  - key: new-dashboard
    name: New Dashboard
    enabled: true
    type: VARIANT_FLAG_TYPE
    variants:
      - key: control
        name: Control (Old Dashboard)
      - key: treatment
        name: Treatment (New Dashboard)
    rules:
      - segment: beta-testers
        distributions:
          - variant: treatment
            rollout: 100
      - segment: default
        distributions:
          - variant: control
            rollout: 80
          - variant: treatment
            rollout: 20

segments:
  - key: beta-testers
    name: Beta Testers
    match_type: ANY_MATCH_TYPE
    constraints:
      - property: groups
        operator: eq
        value: beta-testers
```

Import via CLI or API:

```bash
# Import flags from YAML
flipt import --address ${FLIPT_URL} flags/ecrin.yaml
```

## Admin Dashboard

The Admin Dashboard provides a unified view of all administrative services.

### Dashboard URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Authentik** | https://auth.example.com | Identity & Access Management |
| **Flipt** | https://flags.example.com | Feature Flags |
| **Grafana** | https://grafana.example.com | Metrics & Logs |
| **ArgoCD** | https://argocd.example.com | GitOps Deployments |
| **Vault** | https://vault.example.com | Secrets Management |
| **Longhorn** | https://longhorn.example.com | Storage Management |
| **Hubble** | https://hubble.example.com | Network Observability |

### Authentik Admin Application

Create a custom application in Authentik that links to all admin services:

```bash
# Create Admin Dashboard application group
curl -X POST "${AUTHENTIK_URL}/core/groups/" \
  -H "Authorization: Bearer ${AUTHENTIK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "admin-dashboard",
    "attributes": {
      "links": [
        {"name": "Authentik", "url": "https://auth.'${DOMAIN}'", "icon": "fa-users"},
        {"name": "Feature Flags", "url": "https://flags.'${DOMAIN}'", "icon": "fa-flag"},
        {"name": "Grafana", "url": "https://grafana.'${DOMAIN}'", "icon": "fa-chart-line"},
        {"name": "ArgoCD", "url": "https://argocd.'${DOMAIN}'", "icon": "fa-rocket"},
        {"name": "Vault", "url": "https://vault.'${DOMAIN}'", "icon": "fa-key"},
        {"name": "Longhorn", "url": "https://longhorn.'${DOMAIN}'", "icon": "fa-database"},
        {"name": "Hubble", "url": "https://hubble.'${DOMAIN}'", "icon": "fa-network-wired"}
      ]
    }
  }'
```

### Access Summary

| Role | Services Access |
|------|----------------|
| **admins** | All admin services |
| **developers** | Flipt, ArgoCD, Grafana |
| **researchers** | None (user services only) |
| **technicians** | Grafana (read-only) |

## Validation Tests

```bash
# Check all namespaces
kubectl get pods -n authentik
kubectl get pods -n mattermost
kubectl get pods -n seaweedfs
kubectl get pods -n nextcloud
kubectl get pods -n redcap
kubectl get pods -n ecrin
kubectl get pods -n flipt
# Expected: All pods Running

# Check ingresses
kubectl get ingress -A
# Expected: auth, chat, cloud, redcap, ecrin, flags with addresses

# Check certificates
kubectl get certificate -A
# Expected: All certificates Ready

# Test Authentik
curl -I https://auth.${DOMAIN}
# Expected: HTTP/2 200

# Test OIDC discovery
curl https://auth.${DOMAIN}/application/o/nextcloud/.well-known/openid-configuration
# Expected: JSON with OIDC endpoints

# Test protected service
curl -I https://cloud.${DOMAIN}
# Expected: HTTP/2 302 redirect to auth.${DOMAIN}
```

## Expected Results

| Service | Namespace | Pods | Ingress |
|---------|-----------|------|---------|
| Authentik | authentik | 3 Running | auth.example.com |
| Mattermost | mattermost | 1 Running | chat.example.com |
| SeaweedFS | seaweedfs | 3 Running | - (internal) |
| Nextcloud | nextcloud | 2 Running | cloud.example.com |
| REDCap | redcap | 1 Running | redcap.example.com |
| ECRIN | ecrin | 1 Running | ecrin.example.com |
| Flipt | flipt | 1 Running | flags.example.com |

## Resource Summary

| Service | CPU Request | Memory Request | Storage |
|---------|-------------|----------------|---------|
| Authentik Server | 100m | 256Mi | - |
| Authentik Worker | 100m | 256Mi | - |
| Authentik Outpost | 25m | 64Mi | - |
| Mattermost | 100m | 256Mi | 10Gi |
| SeaweedFS | 300m | 512Mi | 111Gi |
| Nextcloud | 200m | 512Mi | 10Gi |
| OnlyOffice DS | 500m | 1Gi | - |
| REDCap | 100m | 256Mi | 60Gi |
| ECRIN | 50m | 128Mi | - |
| Flipt | 25m | 64Mi | - |
| **Total** | **1500m** | **~3.3Gi** | **191Gi** |

## Feature Flags Architecture

Feature flags are managed centrally in Flipt and can be accessed via:

1. **OpenFeature SDK** (recommended): Standard SDK with Flipt provider
2. **Flipt REST API**: Direct API calls for simple use cases
3. **Authentik OIDC claims** (legacy): Group-based flags via custom property mapping

```typescript
// Recommended: OpenFeature SDK with Flipt
import { getFeatureFlags } from '$lib/server/feature-flags';

export async function load({ locals }) {
  const session = await getSession(locals);

  if (!session?.user) {
    return { flags: { betaUI: false, experimental: false, newDashboard: false } };
  }

  const flags = await getFeatureFlags({
    userId: session.user.id,
    email: session.user.email,
    groups: session.user.groups || []
  });

  return { user: session.user, flags };
}
```

## Next Step

Proceed to [Phase 6: DevOps Tools](./06-devops.md) to install Gitea and ArgoCD.
