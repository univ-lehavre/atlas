# Phase 4: Shared Databases

This phase installs mutualized PostgreSQL HA and Redis Sentinel clusters, eliminating per-service database redundancy.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Shared Database Layer                           │
│                                                                     │
│  ┌─────────────────────────────────┐  ┌──────────────────────────┐  │
│  │       PostgreSQL HA (3 pods)    │  │   Redis Sentinel (3)     │  │
│  │                                 │  │                          │  │
│  │  ┌─────────┐  ┌─────────────┐  │  │  ┌────────┐  ┌────────┐  │  │
│  │  │ Primary │  │  Replicas   │  │  │  │ Master │  │Replicas│  │  │
│  │  │  (RW)   │  │   (RO) x2   │  │  │  │        │  │   x2   │  │  │
│  │  └─────────┘  └─────────────┘  │  │  └────────┘  └────────┘  │  │
│  │                                 │  │                          │  │
│  │  Databases:                     │  │  Uses:                   │  │
│  │  - vault                        │  │  - Authentik sessions    │  │
│  │  - authentik                    │  │  - Mattermost cache      │  │
│  │  - mattermost                   │  │  - Nextcloud cache       │  │
│  │  - nextcloud                    │  │  - Gitea cache           │  │
│  │  - gitea                        │  │  - Rate limiting         │  │
│  │  - flipt                        │  │                          │  │
│  │  - redcap                       │  │                          │  │
│  └─────────────────────────────────┘  └──────────────────────────┘  │
│                                                                     │
│  All credentials managed by Vault + External Secrets Operator       │
└─────────────────────────────────────────────────────────────────────┘
```

## Benefits of Mutualization

| Aspect | Per-Service DBs | Shared Cluster |
|--------|-----------------|----------------|
| RAM Usage | ~2GB (4 instances) | ~500MB (1 HA cluster) |
| Backup Complexity | 4 separate backups | 1 unified backup |
| HA Setup | None or manual | Built-in with Bitnami |
| Maintenance | Multiple upgrades | Single upgrade |
| Monitoring | Multiple dashboards | Unified metrics |

## Create Database Namespace

```bash
kubectl create namespace databases
```

## PostgreSQL HA Installation

### Create ExternalSecret for PostgreSQL

```bash
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: postgresql-credentials
  namespace: databases
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: postgresql-credentials
    creationPolicy: Owner
  data:
    - secretKey: postgres-password
      remoteRef:
        key: infrastructure/postgresql
        property: admin-password
    - secretKey: replication-password
      remoteRef:
        key: infrastructure/postgresql
        property: replication-password
EOF

# Wait for secret to sync
kubectl wait --for=condition=Ready externalsecret/postgresql-credentials \
  -n databases --timeout=60s
```

### Install PostgreSQL HA

```bash
# Install Bitnami PostgreSQL HA
helm install postgresql bitnami/postgresql-ha \
  --namespace databases \
  --set global.postgresql.username=postgres \
  --set global.postgresql.existingSecret=postgresql-credentials \
  --set global.postgresql.secretKeys.adminPasswordKey=postgres-password \
  --set global.postgresql.secretKeys.replicationPasswordKey=replication-password \
  --set postgresql.replicaCount=3 \
  --set postgresql.resources.requests.memory=256Mi \
  --set postgresql.resources.requests.cpu=100m \
  --set postgresql.resources.limits.memory=512Mi \
  --set postgresql.resources.limits.cpu=500m \
  --set persistence.enabled=true \
  --set persistence.storageClass=longhorn-encrypted \
  --set persistence.size=20Gi \
  --set pgpool.replicaCount=1 \
  --set pgpool.resources.requests.memory=128Mi \
  --set pgpool.resources.requests.cpu=50m \
  --set metrics.enabled=true

# Wait for PostgreSQL to be ready (3-5 minutes)
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=postgresql-ha \
  -n databases --timeout=300s
```

### Create Application Databases

```bash
# Get admin password from secret
PGPASSWORD=$(kubectl get secret postgresql-credentials -n databases \
  -o jsonpath='{.data.postgres-password}' | base64 -d)

# Create databases for each service
kubectl run psql-client --rm -it --restart=Never \
  --namespace databases \
  --image=bitnami/postgresql:16 \
  --env="PGPASSWORD=${PGPASSWORD}" \
  -- psql -h postgresql-postgresql-ha-pgpool -U postgres <<EOF

-- Vault database
CREATE DATABASE vault;
CREATE USER vault_user WITH ENCRYPTED PASSWORD '$(kubectl get secret -n vault vault-db-password -o jsonpath='{.data.password}' 2>/dev/null | base64 -d || openssl rand -base64 24)';
GRANT ALL PRIVILEGES ON DATABASE vault TO vault_user;

-- Mattermost database
CREATE DATABASE mattermost;
CREATE USER mattermost_user WITH ENCRYPTED PASSWORD '$(kubectl exec -n vault vault-0 -- vault kv get -field=db-password secret/services/mattermost)';
GRANT ALL PRIVILEGES ON DATABASE mattermost TO mattermost_user;

-- Gitea database
CREATE DATABASE gitea;
CREATE USER gitea_user WITH ENCRYPTED PASSWORD '$(kubectl exec -n vault vault-0 -- vault kv get -field=db-password secret/services/gitea)';
GRANT ALL PRIVILEGES ON DATABASE gitea TO gitea_user;

-- REDCap database
CREATE DATABASE redcap;
CREATE USER redcap_user WITH ENCRYPTED PASSWORD '$(kubectl exec -n vault vault-0 -- vault kv get -field=db-password secret/services/redcap)';
GRANT ALL PRIVILEGES ON DATABASE redcap TO redcap_user;

-- Authentik database
CREATE DATABASE authentik;
GRANT ALL PRIVILEGES ON DATABASE authentik TO postgres;

-- Nextcloud database
CREATE DATABASE nextcloud;
CREATE USER nextcloud_user WITH ENCRYPTED PASSWORD '$(kubectl exec -n vault vault-0 -- vault kv get -field=db-password secret/services/nextcloud)';
GRANT ALL PRIVILEGES ON DATABASE nextcloud TO nextcloud_user;
\c nextcloud
GRANT ALL ON SCHEMA public TO nextcloud_user;
\c postgres

-- Flipt database
CREATE DATABASE flipt;
CREATE USER flipt_user WITH ENCRYPTED PASSWORD '$(kubectl exec -n vault vault-0 -- vault kv get -field=db-password secret/services/flipt)';
GRANT ALL PRIVILEGES ON DATABASE flipt TO flipt_user;
\c flipt
GRANT ALL ON SCHEMA public TO flipt_user;
\c postgres

-- List all databases
\l
EOF
```

::: tip Alternative: Vault Dynamic Secrets
For advanced setups, configure Vault's database secrets engine to generate short-lived credentials:
```bash
vault write database/config/postgresql \
  plugin_name=postgresql-database-plugin \
  connection_url="postgresql://{{username}}:{{password}}@postgresql-postgresql-ha-pgpool.databases.svc:5432/postgres" \
  allowed_roles="*" \
  username="postgres" \
  password="${PGPASSWORD}"
```
:::

## Redis Sentinel Installation

### Create ExternalSecret for Redis

```bash
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: redis-credentials
  namespace: databases
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: redis-credentials
    creationPolicy: Owner
  data:
    - secretKey: redis-password
      remoteRef:
        key: infrastructure/redis
        property: password
EOF

# Wait for secret to sync
kubectl wait --for=condition=Ready externalsecret/redis-credentials \
  -n databases --timeout=60s
```

### Install Redis Sentinel

```bash
# Install Bitnami Redis with Sentinel
helm install redis bitnami/redis \
  --namespace databases \
  --set auth.existingSecret=redis-credentials \
  --set auth.existingSecretPasswordKey=redis-password \
  --set architecture=replication \
  --set replica.replicaCount=2 \
  --set sentinel.enabled=true \
  --set sentinel.masterSet=mymaster \
  --set master.resources.requests.memory=64Mi \
  --set master.resources.requests.cpu=50m \
  --set master.resources.limits.memory=128Mi \
  --set replica.resources.requests.memory=64Mi \
  --set replica.resources.requests.cpu=50m \
  --set replica.resources.limits.memory=128Mi \
  --set master.persistence.enabled=true \
  --set master.persistence.storageClass=longhorn-encrypted \
  --set master.persistence.size=2Gi \
  --set replica.persistence.enabled=true \
  --set replica.persistence.storageClass=longhorn-encrypted \
  --set replica.persistence.size=2Gi \
  --set metrics.enabled=true

# Wait for Redis to be ready (2-3 minutes)
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=redis \
  -n databases --timeout=180s
```

## Service Connection Strings

Services will connect using these endpoints:

### PostgreSQL

| Service | Connection String |
|---------|------------------|
| Vault | `postgresql://vault_user:***@postgresql-postgresql-ha-pgpool.databases.svc:5432/vault` |
| Authentik | `postgresql://postgres:***@postgresql-postgresql-ha-pgpool.databases.svc:5432/authentik` |
| Mattermost | `postgresql://mattermost_user:***@postgresql-postgresql-ha-pgpool.databases.svc:5432/mattermost` |
| Nextcloud | `postgresql://nextcloud_user:***@postgresql-postgresql-ha-pgpool.databases.svc:5432/nextcloud` |
| Gitea | `postgresql://gitea_user:***@postgresql-postgresql-ha-pgpool.databases.svc:5432/gitea` |
| REDCap | `postgresql://redcap_user:***@postgresql-postgresql-ha-pgpool.databases.svc:5432/redcap` |
| Flipt | `postgresql://flipt_user:***@postgresql-postgresql-ha-pgpool.databases.svc:5432/flipt` |

::: info PgPool
PgPool handles connection pooling and automatic failover to replicas.
The service endpoint `postgresql-postgresql-ha-pgpool` automatically routes to the current primary.
:::

### Redis Sentinel

| Service | Connection Details |
|---------|-------------------|
| All Services | `redis-sentinel://redis.databases.svc:26379/mymaster` |

For services that support Sentinel:
```
REDIS_SENTINEL_HOST=redis.databases.svc
REDIS_SENTINEL_PORT=26379
REDIS_SENTINEL_MASTER=mymaster
REDIS_PASSWORD=<from-vault>
```

For services that only support standalone Redis:
```
REDIS_HOST=redis-master.databases.svc
REDIS_PORT=6379
REDIS_PASSWORD=<from-vault>
```

::: info Service Secrets
Each service creates its own ExternalSecrets in its namespace during [Phase 5: Core Services](./05-services.md).
This ensures secrets are scoped to the namespaces where they are used.
:::

## Backup Configuration

### PostgreSQL Backup CronJob

```bash
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgresql-backup
  namespace: databases
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: bitnami/postgresql:16
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgresql-credentials
                  key: postgres-password
            command:
            - /bin/bash
            - -c
            - |
              TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
              pg_dumpall -h postgresql-postgresql-ha-pgpool -U postgres | gzip > /backup/all_databases_\${TIMESTAMP}.sql.gz
              # Keep only last 7 days
              find /backup -name "*.sql.gz" -mtime +7 -delete
            volumeMounts:
            - name: backup-volume
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: backup-volume
            persistentVolumeClaim:
              claimName: postgresql-backup-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgresql-backup-pvc
  namespace: databases
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: longhorn-encrypted
EOF
```

### Redis Backup (RDB Snapshots)

Redis is configured with RDB persistence by default. For additional backup:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: redis-backup
  namespace: databases
spec:
  schedule: "0 3 * * *"  # Daily at 3 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: bitnami/redis:7.2
            env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-credentials
                  key: redis-password
            command:
            - /bin/bash
            - -c
            - |
              TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
              redis-cli -h redis-master -a \$REDIS_PASSWORD BGSAVE
              sleep 10
              cp /data/dump.rdb /backup/dump_\${TIMESTAMP}.rdb
              # Keep only last 7 days
              find /backup -name "dump_*.rdb" -mtime +7 -delete
            volumeMounts:
            - name: redis-data
              mountPath: /data
            - name: backup-volume
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: redis-data
            persistentVolumeClaim:
              claimName: redis-data-redis-master-0
          - name: backup-volume
            persistentVolumeClaim:
              claimName: redis-backup-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-backup-pvc
  namespace: databases
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: longhorn-encrypted
EOF
```

## Validation Tests

```bash
# Check PostgreSQL pods
kubectl get pods -n databases -l app.kubernetes.io/name=postgresql-ha
# Expected: 3 postgresql pods Running, 1 pgpool pod Running

# Check Redis pods
kubectl get pods -n databases -l app.kubernetes.io/name=redis
# Expected: 1 master, 2 replicas, 3 sentinel pods Running

# Test PostgreSQL connectivity
kubectl run psql-test --rm -it --restart=Never \
  --namespace databases \
  --image=bitnami/postgresql:16 \
  --env="PGPASSWORD=$(kubectl get secret postgresql-credentials -n databases -o jsonpath='{.data.postgres-password}' | base64 -d)" \
  -- psql -h postgresql-postgresql-ha-pgpool -U postgres -c "\l"
# Expected: List of databases (vault, authentik, mattermost, nextcloud, gitea, redcap, flipt)

# Test Redis connectivity
kubectl run redis-test --rm -it --restart=Never \
  --namespace databases \
  --image=bitnami/redis:7.2 \
  --env="REDIS_PASSWORD=$(kubectl get secret redis-credentials -n databases -o jsonpath='{.data.redis-password}' | base64 -d)" \
  -- redis-cli -h redis-master -a $REDIS_PASSWORD PING
# Expected: PONG

# Check ExternalSecrets
kubectl get externalsecret -n databases
# Expected: postgresql-credentials and redis-credentials Ready

# Check Prometheus metrics
kubectl get servicemonitor -n databases
# Expected: postgresql-ha and redis servicemonitors
```

## Expected Results

| Component | Status |
|-----------|--------|
| PostgreSQL Primary | Running |
| PostgreSQL Replicas | 2 Running |
| PgPool | Running |
| Redis Master | Running |
| Redis Replicas | 2 Running |
| Redis Sentinel | 3 Running |
| ExternalSecrets | 2 Ready |
| Backup CronJobs | 2 Scheduled |

## Resource Summary

| Component | CPU Request | Memory Request | Storage |
|-----------|-------------|----------------|---------|
| PostgreSQL (x3) | 300m | 768Mi | 60Gi |
| PgPool | 50m | 128Mi | - |
| Redis Master | 50m | 64Mi | 2Gi |
| Redis Replicas (x2) | 100m | 128Mi | 4Gi |
| Backup PVCs | - | - | 55Gi |
| **Total** | **500m** | **~1.1Gi** | **~121Gi** |

## Next Step

Proceed to [Phase 5: Core Services](./05-services.md) to install Authentik, Mattermost, Nextcloud, REDCap, ECRIN, and Flipt.
