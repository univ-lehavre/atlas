# Phase 5: Core Services

This phase installs the core application services: Authelia (SSO), Mattermost (chat), Nextcloud (files + collaborative editing), REDCap (research forms), and ECRIN (researcher platform).

## Services Overview

| Service | Purpose | Auth Level | Database | Redis |
|---------|---------|------------|----------|-------|
| Authelia | SSO/OIDC Provider | - | PostgreSQL | Yes |
| Mattermost | Team Messaging | 1FA | PostgreSQL | Yes |
| Nextcloud | Files + Document Editing | 1FA | PostgreSQL | Yes |
| REDCap | Research Forms | 1FA/2FA | PostgreSQL | - |
| ECRIN | Researcher Platform | 1FA | - | - |

## Authelia (SSO/OIDC Provider)

Authelia provides single sign-on and multi-factor authentication for all services.

### Create Namespace and Secrets

```bash
kubectl create namespace authelia

# Create ExternalSecret for Authelia
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: authelia-secrets
  namespace: authelia
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: authelia-secrets
    creationPolicy: Owner
  data:
    - secretKey: JWT_SECRET
      remoteRef:
        key: services/authelia
        property: jwt-secret
    - secretKey: SESSION_SECRET
      remoteRef:
        key: services/authelia
        property: session-secret
    - secretKey: STORAGE_ENCRYPTION_KEY
      remoteRef:
        key: services/authelia
        property: storage-encryption-key
    - secretKey: OIDC_HMAC_SECRET
      remoteRef:
        key: services/authelia
        property: oidc-hmac-secret
    - secretKey: REDIS_PASSWORD
      remoteRef:
        key: infrastructure/redis
        property: password
EOF

kubectl wait --for=condition=Ready externalsecret/authelia-secrets \
  -n authelia --timeout=60s
```

### Generate OIDC Keys

```bash
# Generate RSA key pair for OIDC
openssl genrsa -out /tmp/oidc-private.pem 4096
openssl rsa -in /tmp/oidc-private.pem -pubout -out /tmp/oidc-public.pem

# Create secret with OIDC keys
kubectl create secret generic authelia-oidc-keys \
  --namespace authelia \
  --from-file=private.pem=/tmp/oidc-private.pem \
  --from-file=public.pem=/tmp/oidc-public.pem

rm /tmp/oidc-private.pem /tmp/oidc-public.pem
```

### Create Authelia Configuration

```bash
export DOMAIN="example.com"

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: authelia-config
  namespace: authelia
data:
  configuration.yml: |
    theme: auto
    default_2fa_method: totp

    server:
      address: tcp://0.0.0.0:9091/

    log:
      level: info

    totp:
      issuer: ${DOMAIN}
      period: 30
      skew: 1

    authentication_backend:
      file:
        path: /config/users.yml
        watch: true
        password:
          algorithm: argon2
          argon2:
            variant: argon2id
            iterations: 3
            memory: 65536
            parallelism: 4
            key_length: 32
            salt_length: 16

    access_control:
      default_policy: deny
      rules:
        # Public survey access for REDCap
        - domain: redcap.${DOMAIN}
          policy: bypass
          resources:
            - "^/surveys/.*$"

        # 1FA services
        - domain:
            - chat.${DOMAIN}
            - cloud.${DOMAIN}
            - ecrin.${DOMAIN}
            - git.${DOMAIN}
          policy: one_factor

        # 2FA for admin interfaces
        - domain:
            - vault.${DOMAIN}
            - argocd.${DOMAIN}
            - grafana.${DOMAIN}
            - longhorn.${DOMAIN}
            - hubble.${DOMAIN}
          policy: two_factor

        # REDCap with mixed policies
        - domain: redcap.${DOMAIN}
          policy: one_factor
          resources:
            - "^(?!/ControlCenter/).*$"
        - domain: redcap.${DOMAIN}
          policy: two_factor
          resources:
            - "^/ControlCenter/.*$"

    session:
      name: authelia_session
      same_site: lax
      expiration: 12h
      inactivity: 1h
      remember_me: 1M
      cookies:
        - domain: ${DOMAIN}
          authelia_url: https://auth.${DOMAIN}
      redis:
        host: redis-master.databases.svc
        port: 6379
        password: \${REDIS_PASSWORD}

    regulation:
      max_retries: 3
      find_time: 2m
      ban_time: 5m

    storage:
      encryption_key: \${STORAGE_ENCRYPTION_KEY}
      postgres:
        address: tcp://postgresql-postgresql-ha-pgpool.databases.svc:5432
        database: authelia
        username: authelia_user
        password: \${AUTHELIA_DB_PASSWORD}

    notifier:
      filesystem:
        filename: /config/notifications.txt

    identity_providers:
      oidc:
        hmac_secret: \${OIDC_HMAC_SECRET}
        jwks:
          - key: {{ secret "/secrets/oidc/private.pem" | mindent 10 "|" | msquote }}
        cors:
          endpoints:
            - authorization
            - token
            - revocation
            - introspection
          allowed_origins_from_client_redirect_uris: true
        clients:
          - client_id: mattermost
            client_name: Mattermost
            client_secret: '\${MATTERMOST_OIDC_SECRET}'
            public: false
            authorization_policy: one_factor
            redirect_uris:
              - https://chat.${DOMAIN}/signup/gitlab/complete
              - https://chat.${DOMAIN}/login/gitlab/complete
            scopes:
              - openid
              - profile
              - email
              - groups
            userinfo_signed_response_alg: none
            token_endpoint_auth_method: client_secret_basic

          - client_id: nextcloud
            client_name: Nextcloud
            client_secret: '\${NEXTCLOUD_OIDC_SECRET}'
            public: false
            authorization_policy: one_factor
            redirect_uris:
              - https://cloud.${DOMAIN}/apps/oidc_login/oidc
            scopes:
              - openid
              - profile
              - email
              - groups

          - client_id: gitea
            client_name: Gitea
            client_secret: '\${GITEA_OIDC_SECRET}'
            public: false
            authorization_policy: one_factor
            redirect_uris:
              - https://git.${DOMAIN}/user/oauth2/authelia/callback
            scopes:
              - openid
              - profile
              - email
              - groups

          - client_id: grafana
            client_name: Grafana
            client_secret: '\${GRAFANA_OIDC_SECRET}'
            public: false
            authorization_policy: two_factor
            redirect_uris:
              - https://grafana.${DOMAIN}/login/generic_oauth
            scopes:
              - openid
              - profile
              - email
              - groups

          - client_id: argocd
            client_name: ArgoCD
            client_secret: '\${ARGOCD_OIDC_SECRET}'
            public: false
            authorization_policy: two_factor
            redirect_uris:
              - https://argocd.${DOMAIN}/auth/callback
            scopes:
              - openid
              - profile
              - email
              - groups
EOF
```

### Create Users File

```bash
# Generate password hash
ADMIN_PASSWORD_HASH=$(docker run --rm authelia/authelia:latest authelia crypto hash generate argon2 --password 'ChangeMe123!' | grep 'Digest:' | cut -d' ' -f2)

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: authelia-users
  namespace: authelia
data:
  users.yml: |
    users:
      admin:
        disabled: false
        displayname: "Administrator"
        password: "${ADMIN_PASSWORD_HASH}"
        email: admin@${DOMAIN}
        groups:
          - admins
          - developers
EOF
```

### Install Authelia

```bash
helm repo add authelia https://charts.authelia.com
helm repo update

helm install authelia authelia/authelia \
  --namespace authelia \
  --set domain=${DOMAIN} \
  --set ingress.enabled=true \
  --set ingress.className=cilium \
  --set ingress.annotations."cert-manager\.io/cluster-issuer"=letsencrypt-prod \
  --set ingress.tls.enabled=true \
  --set ingress.tls.secret=authelia-tls \
  --set pod.extraVolumeMounts[0].name=config \
  --set pod.extraVolumeMounts[0].mountPath=/config \
  --set pod.extraVolumes[0].name=config \
  --set pod.extraVolumes[0].configMap.name=authelia-config \
  --set pod.extraVolumeMounts[1].name=users \
  --set pod.extraVolumeMounts[1].mountPath=/config/users.yml \
  --set pod.extraVolumeMounts[1].subPath=users.yml \
  --set pod.extraVolumes[1].name=users \
  --set pod.extraVolumes[1].configMap.name=authelia-users \
  --set pod.extraVolumeMounts[2].name=oidc-keys \
  --set pod.extraVolumeMounts[2].mountPath=/secrets/oidc \
  --set pod.extraVolumes[2].name=oidc-keys \
  --set pod.extraVolumes[2].secret.secretName=authelia-oidc-keys \
  --set configMap.enabled=false

kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=authelia -n authelia --timeout=120s
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

### Configure Mattermost OIDC

After Mattermost is running, configure OIDC via the System Console or `config.json`:

```bash
kubectl exec -n mattermost deploy/mattermost-team-edition -- \
  mmctl config set GitLabSettings.Enable true
kubectl exec -n mattermost deploy/mattermost-team-edition -- \
  mmctl config set GitLabSettings.Id mattermost
kubectl exec -n mattermost deploy/mattermost-team-edition -- \
  mmctl config set GitLabSettings.Secret "${MATTERMOST_OIDC_SECRET}"
kubectl exec -n mattermost deploy/mattermost-team-edition -- \
  mmctl config set GitLabSettings.AuthEndpoint "https://auth.${DOMAIN}/api/oidc/authorization"
kubectl exec -n mattermost deploy/mattermost-team-edition -- \
  mmctl config set GitLabSettings.TokenEndpoint "https://auth.${DOMAIN}/api/oidc/token"
kubectl exec -n mattermost deploy/mattermost-team-edition -- \
  mmctl config set GitLabSettings.UserApiEndpoint "https://auth.${DOMAIN}/api/oidc/userinfo"
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
# Get S3 credentials
S3_ACCESS_KEY=$(kubectl get secret seaweedfs-secrets -n seaweedfs -o jsonpath='{.data.s3-access-key}' | base64 -d)
S3_SECRET_KEY=$(kubectl get secret seaweedfs-secrets -n seaweedfs -o jsonpath='{.data.s3-secret-key}' | base64 -d)

# Create bucket using AWS CLI
kubectl run aws-cli --rm -it --restart=Never \
  --image=amazon/aws-cli \
  --env="AWS_ACCESS_KEY_ID=${S3_ACCESS_KEY}" \
  --env="AWS_SECRET_ACCESS_KEY=${S3_SECRET_KEY}" \
  -- --endpoint-url=http://seaweedfs-s3.seaweedfs.svc:8333 s3 mb s3://nextcloud
```

## Nextcloud (Files + Collaborative Editing)

Nextcloud provides file storage, sharing, and collaborative document editing via OnlyOffice integration.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Nextcloud                               │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Files     │  │ Groupfolders│  │      OnlyOffice         │ │
│  │  (storage)  │  │  (shared)   │  │  (collaborative edit)   │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────────┘ │
│         │                │                                      │
│         └───────┬────────┘                                      │
│                 ▼                                               │
│         ┌─────────────┐                                        │
│         │  SeaweedFS  │  (S3 primary storage)                  │
│         │  (backend)  │                                        │
│         └─────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Create Namespace and Secrets

```bash
kubectl create namespace nextcloud

# Store Nextcloud credentials in Vault
kubectl exec -n vault vault-0 -- vault kv put secret/services/nextcloud \
  admin-password="$(openssl rand -base64 24)" \
  db-password="$(openssl rand -base64 32)" \
  oidc-secret="$(openssl rand -base64 32)"

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
    - secretKey: oidc-secret
      remoteRef:
        key: services/nextcloud
        property: oidc-secret
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

### Create Nextcloud Database

```bash
# Get PostgreSQL admin password
PGPASSWORD=$(kubectl get secret postgresql-credentials -n databases \
  -o jsonpath='{.data.postgres-password}' | base64 -d)

# Get Nextcloud DB password from Vault
NC_DB_PASS=$(kubectl exec -n vault vault-0 -- vault kv get -field=db-password secret/services/nextcloud)

# Create database and user
kubectl run psql-client --rm -it --restart=Never \
  --namespace databases \
  --image=bitnami/postgresql:16 \
  --env="PGPASSWORD=${PGPASSWORD}" \
  -- psql -h postgresql-postgresql-ha-pgpool -U postgres <<EOF
CREATE DATABASE nextcloud;
CREATE USER nextcloud_user WITH ENCRYPTED PASSWORD '${NC_DB_PASS}';
GRANT ALL PRIVILEGES ON DATABASE nextcloud TO nextcloud_user;
\c nextcloud
GRANT ALL ON SCHEMA public TO nextcloud_user;
EOF
```

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

### Configure Nextcloud Apps and OIDC

After Nextcloud is running, install required apps and configure OIDC:

```bash
# Install Nextcloud apps
kubectl exec -n nextcloud deploy/nextcloud -- su -s /bin/bash www-data -c "
  php occ app:install groupfolders
  php occ app:install onlyoffice
  php occ app:install oidc_login
  php occ app:install activity

  # Disable unwanted apps
  php occ app:disable dashboard
  php occ app:disable weather_status
  php occ app:disable firstrunwizard
"

# Get OIDC secret
NEXTCLOUD_OIDC_SECRET=$(kubectl exec -n vault vault-0 -- vault kv get -field=oidc-secret secret/services/nextcloud)

# Configure OIDC login
kubectl exec -n nextcloud deploy/nextcloud -- su -s /bin/bash www-data -c "
  php occ config:app:set oidc_login provider_url --value='https://auth.${DOMAIN}'
  php occ config:app:set oidc_login client_id --value='nextcloud'
  php occ config:app:set oidc_login client_secret --value='${NEXTCLOUD_OIDC_SECRET}'
  php occ config:app:set oidc_login login_button_text --value='Login with Authelia'
  php occ config:app:set oidc_login disable_registration --value='0'
  php occ config:app:set oidc_login auto_redirect --value='0'
  php occ config:app:set oidc_login mode --value='email'
"

# Configure OnlyOffice (using built-in document server)
kubectl exec -n nextcloud deploy/nextcloud -- su -s /bin/bash www-data -c "
  php occ config:app:set onlyoffice DocumentServerUrl --value='https://cloud.${DOMAIN}/onlyoffice-ds/'
  php occ config:app:set onlyoffice jwt_secret --value='$(openssl rand -base64 32)'
"
```

### Install OnlyOffice Document Server (Integrated)

OnlyOffice Document Server runs as a sidecar or separate deployment integrated with Nextcloud:

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
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: onlyoffice-ds
  namespace: nextcloud
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: cilium
  tls:
  - hosts:
    - cloud.${DOMAIN}
    secretName: nextcloud-tls
  rules:
  - host: cloud.${DOMAIN}
    http:
      paths:
      - path: /onlyoffice-ds
        pathType: Prefix
        backend:
          service:
            name: onlyoffice-ds
            port:
              number: 80
EOF

kubectl wait --for=condition=ready pod \
  -l app=onlyoffice-ds -n nextcloud --timeout=300s
```

### Create Groupfolders for Teams

```bash
# Create shared folders for research teams
kubectl exec -n nextcloud deploy/nextcloud -- su -s /bin/bash www-data -c "
  # Create groupfolders
  php occ groupfolders:create 'Research Team A'
  php occ groupfolders:create 'Research Team B'
  php occ groupfolders:create 'Shared Resources'

  # Set quotas (in bytes, -3 = unlimited)
  php occ groupfolders:quota 1 10737418240  # 10GB
  php occ groupfolders:quota 2 10737418240  # 10GB
  php occ groupfolders:quota 3 53687091200  # 50GB
"
```

## REDCap (Research Data Capture)

::: warning Prerequisites
REDCap requires a valid license from Vanderbilt University.
You must download the REDCap installation files and have a valid license key.
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

### Install REDCap

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
      initContainers:
      - name: init-db
        image: postgres:16
        env:
        - name: PGPASSWORD
          valueFrom:
            secretKeyRef:
              name: redcap-secrets
              key: DB_PASSWORD
        command:
        - sh
        - -c
        - |
          until pg_isready -h postgresql-postgresql-ha-pgpool.databases.svc -U redcap_user; do
            echo "Waiting for PostgreSQL..."
            sleep 2
          done
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
      - path: /
        pathType: Prefix
        backend:
          service:
            name: redcap
            port:
              number: 80
EOF
```

::: info REDCap Authentication
REDCap uses its own authentication system. Authelia protects access at the ingress level with:
- Public surveys: bypass authentication
- Project access: 1FA required
- Control Center: 2FA required
:::

## ECRIN (Researcher Platform)

```bash
kubectl create namespace ecrin

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
          value: "https://auth.${DOMAIN}"
        - name: OIDC_CLIENT_ID
          value: "ecrin"
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

## Validation Tests

```bash
# Check all namespaces
kubectl get pods -n authelia
kubectl get pods -n mattermost
kubectl get pods -n seaweedfs
kubectl get pods -n nextcloud
kubectl get pods -n redcap
kubectl get pods -n ecrin
# Expected: All pods Running

# Check ingresses
kubectl get ingress -A
# Expected: auth, chat, cloud, redcap, ecrin with addresses

# Check certificates
kubectl get certificate -A
# Expected: All certificates Ready

# Test Authelia
curl -I https://auth.${DOMAIN}
# Expected: HTTP/2 200

# Test Nextcloud
curl -I https://cloud.${DOMAIN}
# Expected: HTTP/2 200 or 302

# Test protected service redirects to Authelia
curl -I https://chat.${DOMAIN}
# Expected: HTTP/2 302 redirect to auth.${DOMAIN}

# Test SeaweedFS S3
kubectl exec -n nextcloud deploy/nextcloud -- curl -s http://seaweedfs-s3.seaweedfs.svc:8333
# Expected: S3 response
```

## Expected Results

| Service | Namespace | Pods | Ingress |
|---------|-----------|------|---------|
| Authelia | authelia | 1 Running | auth.example.com |
| Mattermost | mattermost | 1 Running | chat.example.com |
| SeaweedFS | seaweedfs | 3 Running | - (internal) |
| Nextcloud | nextcloud | 2 Running | cloud.example.com |
| REDCap | redcap | 1 Running | redcap.example.com |
| ECRIN | ecrin | 1 Running | ecrin.example.com |

## Resource Summary

| Service | CPU Request | Memory Request | Storage |
|---------|-------------|----------------|---------|
| Authelia | 100m | 128Mi | - |
| Mattermost | 100m | 256Mi | 10Gi |
| SeaweedFS | 300m | 512Mi | 111Gi |
| Nextcloud | 200m | 512Mi | 10Gi |
| OnlyOffice DS | 500m | 1Gi | - |
| REDCap | 100m | 256Mi | 60Gi |
| ECRIN | 50m | 128Mi | - |
| **Total** | **1350m** | **~2.8Gi** | **191Gi** |

## Nextcloud Features Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Files | ✅ Enabled | Primary storage on SeaweedFS (S3) |
| Groupfolders | ✅ Enabled | Shared team folders |
| OnlyOffice | ✅ Enabled | Collaborative document editing |
| Activity | ✅ Enabled | Audit trail for file operations |
| OIDC Login | ✅ Enabled | SSO via Authelia |
| Talk | ❌ Disabled | Use Mattermost instead |
| Calendar | ❌ Not installed | As requested |
| Contacts | ❌ Not installed | As requested |
| Deck | ❌ Not installed | As requested |

## Next Step

Proceed to [Phase 6: DevOps Tools](./06-devops.md) to install Gitea and ArgoCD.
