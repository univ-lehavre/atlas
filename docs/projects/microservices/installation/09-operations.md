# Phase 9: Operations & Maintenance

This phase covers backup procedures, secret rotation, disaster recovery, and ongoing maintenance tasks.

## Backup Strategy

### Backup Components

| Component | Method | Frequency | Retention |
|-----------|--------|-----------|-----------|
| etcd | etcd snapshot | Daily | 30 days |
| PostgreSQL | pg_dumpall | Daily | 30 days |
| Redis | RDB snapshot | Daily | 7 days |
| Longhorn Volumes | Longhorn backup | Daily | 14 days |
| Vault | Raft snapshot | Daily | 30 days |
| Gitea Repositories | Git bundle | Weekly | 90 days |
| Configuration | ArgoCD Git repo | Continuous | Git history |

### Automated Backup Jobs

#### etcd Backup

```bash
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup
  namespace: kube-system
spec:
  schedule: "0 1 * * *"  # Daily at 1 AM
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          hostNetwork: true
          containers:
          - name: etcd-backup
            image: rancher/k3s:v1.30.0-k3s1
            command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
              BACKUP_FILE=/backup/etcd_\${TIMESTAMP}.db

              # Create etcd snapshot
              k3s etcd-snapshot save --name etcd_\${TIMESTAMP}

              # Copy to backup volume
              cp /var/lib/rancher/k3s/server/db/snapshots/etcd_\${TIMESTAMP}* /backup/

              # Keep only last 30 days
              find /backup -name "etcd_*.db" -mtime +30 -delete

              echo "Backup completed: \${BACKUP_FILE}"
            volumeMounts:
            - name: backup
              mountPath: /backup
            - name: k3s-data
              mountPath: /var/lib/rancher/k3s
              readOnly: true
            securityContext:
              privileged: true
          restartPolicy: OnFailure
          nodeSelector:
            node-role.kubernetes.io/control-plane: "true"
          tolerations:
          - key: node-role.kubernetes.io/control-plane
            operator: Exists
            effect: NoSchedule
          volumes:
          - name: backup
            persistentVolumeClaim:
              claimName: etcd-backup-pvc
          - name: k3s-data
            hostPath:
              path: /var/lib/rancher/k3s
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: etcd-backup-pvc
  namespace: kube-system
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: longhorn-encrypted
EOF
```

#### Vault Backup

```bash
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: vault-backup
  namespace: vault
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: vault
          containers:
          - name: vault-backup
            image: hashicorp/vault:1.15
            command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=\$(date +%Y%m%d_%H%M%S)

              # Login to Vault (requires configured auth)
              export VAULT_ADDR=http://vault:8200

              # Create Raft snapshot
              vault operator raft snapshot save /backup/vault_\${TIMESTAMP}.snap

              # Keep only last 30 days
              find /backup -name "vault_*.snap" -mtime +30 -delete

              echo "Vault backup completed"
            env:
            - name: VAULT_TOKEN
              valueFrom:
                secretKeyRef:
                  name: vault-backup-token
                  key: token
            volumeMounts:
            - name: backup
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: backup
            persistentVolumeClaim:
              claimName: vault-backup-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: vault-backup-pvc
  namespace: vault
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: longhorn-encrypted
EOF
```

#### Longhorn Recurring Backup

```bash
cat <<EOF | kubectl apply -f -
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-backup
  namespace: longhorn-system
spec:
  cron: "0 3 * * *"
  task: backup
  groups:
    - default
  retain: 14
  concurrency: 2
  labels:
    backup-type: daily
EOF
```

### Backup Verification

```bash
# Create backup verification job
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-verify
  namespace: kube-system
spec:
  schedule: "0 6 * * 0"  # Weekly on Sunday at 6 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: verify
            image: bitnami/postgresql:16
            command:
            - /bin/bash
            - -c
            - |
              echo "=== Backup Verification Report ==="
              echo "Date: \$(date)"
              echo ""

              # Check etcd backups
              echo "etcd backups:"
              ls -lh /backup/etcd/*.db 2>/dev/null | tail -5

              # Check PostgreSQL backups
              echo ""
              echo "PostgreSQL backups:"
              ls -lh /backup/postgresql/*.sql.gz 2>/dev/null | tail -5

              # Check Vault backups
              echo ""
              echo "Vault backups:"
              ls -lh /backup/vault/*.snap 2>/dev/null | tail -5

              # Verify latest PostgreSQL backup integrity
              echo ""
              echo "Verifying latest PostgreSQL backup..."
              LATEST_PG=\$(ls -t /backup/postgresql/*.sql.gz 2>/dev/null | head -1)
              if [ -n "\$LATEST_PG" ]; then
                gunzip -t "\$LATEST_PG" && echo "PostgreSQL backup OK" || echo "PostgreSQL backup CORRUPTED"
              else
                echo "No PostgreSQL backup found"
              fi
            volumeMounts:
            - name: etcd-backup
              mountPath: /backup/etcd
            - name: postgresql-backup
              mountPath: /backup/postgresql
            - name: vault-backup
              mountPath: /backup/vault
          restartPolicy: OnFailure
          volumes:
          - name: etcd-backup
            persistentVolumeClaim:
              claimName: etcd-backup-pvc
          - name: postgresql-backup
            persistentVolumeClaim:
              claimName: postgresql-backup-pvc
          - name: vault-backup
            persistentVolumeClaim:
              claimName: vault-backup-pvc
EOF
```

## Secret Rotation

### Automatic Rotation via Vault

Vault can automatically rotate secrets. Configure rotation policies:

```bash
# Connect to Vault
kubectl exec -n vault vault-0 -- vault login ${VAULT_ROOT_TOKEN}

# Enable database secrets engine with rotation
kubectl exec -n vault vault-0 -- vault write database/config/postgresql \
  plugin_name=postgresql-database-plugin \
  connection_url="postgresql://{{username}}:{{password}}@postgresql-postgresql-ha-pgpool.databases.svc:5432/postgres" \
  allowed_roles="*" \
  username="postgres" \
  password="${POSTGRES_PASSWORD}"

# Create role with automatic rotation
kubectl exec -n vault vault-0 -- vault write database/roles/mattermost-dynamic \
  db_name=postgresql \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT ALL PRIVILEGES ON DATABASE mattermost TO \"{{name}}\";" \
  revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

### Manual Secret Rotation Procedure

#### Rotate PostgreSQL Passwords

```bash
#!/bin/bash
# rotate-postgresql.sh

# Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)
SERVICE=$1  # mattermost, gitea, etc.

# Update Vault
kubectl exec -n vault vault-0 -- vault kv put secret/services/${SERVICE} \
  db-password="${NEW_PASSWORD}"

# Update PostgreSQL user
kubectl exec -n databases postgresql-postgresql-ha-0 -- psql -U postgres -c \
  "ALTER USER ${SERVICE}_user WITH PASSWORD '${NEW_PASSWORD}';"

# Wait for External Secrets to sync (default 1h, can be faster)
kubectl annotate externalsecret ${SERVICE}-db -n ${SERVICE} \
  force-sync=$(date +%s)

# Restart the service to pick up new credentials
kubectl rollout restart deployment/${SERVICE} -n ${SERVICE}

echo "Password rotated for ${SERVICE}"
```

#### Rotate Redis Password

```bash
#!/bin/bash
# rotate-redis.sh

# Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# Update Vault
kubectl exec -n vault vault-0 -- vault kv put secret/infrastructure/redis \
  password="${NEW_PASSWORD}"

# Update Redis (requires restart for Sentinel)
kubectl exec -n databases redis-master-0 -- redis-cli CONFIG SET requirepass "${NEW_PASSWORD}"
kubectl exec -n databases redis-replicas-0 -- redis-cli CONFIG SET requirepass "${NEW_PASSWORD}"
kubectl exec -n databases redis-replicas-1 -- redis-cli CONFIG SET requirepass "${NEW_PASSWORD}"

# Force External Secrets sync
kubectl annotate externalsecret redis-credentials -n databases \
  force-sync=$(date +%s)

# Restart services that use Redis
kubectl rollout restart deployment/authelia -n authelia
kubectl rollout restart deployment/mattermost-team-edition -n mattermost
kubectl rollout restart statefulset/gitea -n gitea

echo "Redis password rotated"
```

#### Rotate Vault Unseal Keys

::: danger Critical Operation
Rotating Vault unseal keys requires careful planning. All current unseal keys will be invalidated.
:::

```bash
# Generate new unseal keys
kubectl exec -n vault vault-0 -- vault operator rekey -init \
  -key-shares=5 \
  -key-threshold=3

# Provide 3 of the current unseal keys to authorize the rekey
kubectl exec -n vault vault-0 -- vault operator rekey \
  -nonce=<nonce-from-init>

# Save new keys securely offline
# Update auto-unseal configuration if used
```

### Rotation Schedule

| Secret Type | Rotation Frequency | Method |
|-------------|-------------------|--------|
| Database passwords | 90 days | Manual + Vault |
| Redis password | 90 days | Manual |
| JWT/Session secrets | 180 days | Vault + restart |
| TLS certificates | Auto (cert-manager) | Automatic |
| OIDC client secrets | 365 days | Manual |
| Vault unseal keys | As needed | Manual |
| LUKS encryption keys | Never (re-encrypt volumes) | N/A |

## Disaster Recovery

### Recovery Procedures

#### Recover from etcd Backup

```bash
# Stop K3s
systemctl stop k3s

# Restore etcd snapshot
k3s server --cluster-reset \
  --cluster-reset-restore-path=/backup/etcd_YYYYMMDD_HHMMSS.db

# Start K3s
systemctl start k3s

# Verify cluster
kubectl get nodes
kubectl get pods -A
```

#### Recover PostgreSQL

```bash
# Scale down services using PostgreSQL
kubectl scale deployment --all -n mattermost --replicas=0
kubectl scale deployment --all -n gitea --replicas=0
kubectl scale deployment --all -n authelia --replicas=0

# Restore from backup
kubectl exec -n databases postgresql-postgresql-ha-0 -- \
  gunzip -c /backup/all_databases_YYYYMMDD_HHMMSS.sql.gz | \
  psql -U postgres

# Scale services back up
kubectl scale deployment --all -n mattermost --replicas=1
kubectl scale deployment --all -n gitea --replicas=1
kubectl scale deployment --all -n authelia --replicas=1
```

#### Recover Vault

```bash
# Unseal Vault if needed
kubectl exec -n vault vault-0 -- vault operator unseal ${UNSEAL_KEY_1}
kubectl exec -n vault vault-0 -- vault operator unseal ${UNSEAL_KEY_2}
kubectl exec -n vault vault-0 -- vault operator unseal ${UNSEAL_KEY_3}

# Restore from Raft snapshot
kubectl exec -n vault vault-0 -- vault operator raft snapshot restore \
  /backup/vault_YYYYMMDD_HHMMSS.snap

# Verify
kubectl exec -n vault vault-0 -- vault status
```

#### Recover Longhorn Volumes

```bash
# Via Longhorn UI or CLI
# 1. Navigate to Longhorn UI > Backup
# 2. Select the backup to restore
# 3. Create a new volume from backup
# 4. Update the PVC to use the new volume

# Or via kubectl
kubectl apply -f - <<EOF
apiVersion: longhorn.io/v1beta2
kind: Volume
metadata:
  name: restored-volume
  namespace: longhorn-system
spec:
  fromBackup: "s3://backup-bucket@region/backups/backup-xxx"
  numberOfReplicas: 1
EOF
```

### Recovery Time Objectives

| Component | RTO | RPO |
|-----------|-----|-----|
| Kubernetes Control Plane | 30 min | 24h |
| PostgreSQL | 1h | 24h |
| Vault | 30 min | 24h |
| Application Services | 15 min | N/A (stateless) |
| Longhorn Volumes | 2h | 24h |

## Maintenance Tasks

### Regular Maintenance Schedule

| Task | Frequency | Command |
|------|-----------|---------|
| Check node health | Daily | `kubectl get nodes` |
| Check pod status | Daily | `kubectl get pods -A \| grep -v Running` |
| Review alerts | Daily | Grafana dashboard |
| Check certificate expiry | Weekly | `kubectl get certificate -A` |
| Check Longhorn health | Weekly | Longhorn UI |
| Review Vault audit logs | Weekly | Vault UI or API |
| Update system packages | Monthly | `apt update && apt upgrade` |
| K3s minor updates | Monthly | See below |
| Helm chart updates | Monthly | See below |
| Review resource usage | Monthly | Grafana |
| Test backup restore | Quarterly | Restore to test env |
| Rotate secrets | As scheduled | See rotation section |

### K3s Updates

```bash
# Check current version
k3s --version

# Check available versions
curl -s https://update.k3s.io/v1-release/channels | jq

# Update K3s (single-node)
curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=stable sh -

# Verify update
k3s --version
kubectl get nodes
```

### Helm Chart Updates

```bash
# Update all Helm repos
helm repo update

# Check for updates
helm list -A -o json | jq -r '.[] | "\(.name) \(.namespace) \(.chart)"' | while read name ns chart; do
  current=$(echo $chart | sed 's/.*-//')
  latest=$(helm search repo $(echo $chart | sed 's/-[0-9].*//' ) -o json | jq -r '.[0].version')
  if [ "$current" != "$latest" ]; then
    echo "Update available: $name in $ns: $current -> $latest"
  fi
done

# Update a specific chart
helm upgrade <release> <chart> -n <namespace> --reuse-values
```

### Cleanup Tasks

```bash
# Remove completed/failed jobs
kubectl delete jobs --field-selector status.successful=1 -A
kubectl delete jobs --field-selector status.failed=1 -A

# Clean up old ReplicaSets
kubectl get rs -A -o json | jq -r '.items[] | select(.spec.replicas == 0) | "\(.metadata.namespace) \(.metadata.name)"' | \
  xargs -n2 kubectl delete rs -n

# Prune unused images (on node)
crictl rmi --prune

# Clean old Longhorn snapshots
kubectl get snapshot -n longhorn-system -o json | jq -r '.items[] | select(.status.readyToUse == true) | .metadata.name' | \
  xargs -I {} kubectl delete snapshot {} -n longhorn-system
```

## Monitoring Maintenance Health

### Create Maintenance Dashboard

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-maintenance
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  maintenance.json: |
    {
      "title": "ATLAS Maintenance Status",
      "uid": "atlas-maintenance",
      "panels": [
        {
          "title": "Backup Age (hours)",
          "type": "stat",
          "gridPos": {"h": 4, "w": 6, "x": 0, "y": 0},
          "targets": [{
            "expr": "(time() - max(kube_job_status_completion_time{job_name=~\".*backup.*\"})) / 3600"
          }]
        },
        {
          "title": "Certificate Expiry (days)",
          "type": "stat",
          "gridPos": {"h": 4, "w": 6, "x": 6, "y": 0},
          "targets": [{
            "expr": "min(certmanager_certificate_expiration_timestamp_seconds - time()) / 86400"
          }]
        },
        {
          "title": "Vault Sealed Status",
          "type": "stat",
          "gridPos": {"h": 4, "w": 6, "x": 12, "y": 0},
          "targets": [{
            "expr": "vault_core_unsealed"
          }]
        },
        {
          "title": "Failed Pods",
          "type": "stat",
          "gridPos": {"h": 4, "w": 6, "x": 18, "y": 0},
          "targets": [{
            "expr": "count(kube_pod_status_phase{phase=~\"Failed|Unknown\"})"
          }]
        }
      ]
    }
EOF
```

## Validation Tests

```bash
# Check all CronJobs
kubectl get cronjobs -A
# Expected: etcd-backup, postgresql-backup, redis-backup, vault-backup Running

# Check recent backup jobs
kubectl get jobs -A -l app=backup --sort-by=.status.completionTime | tail -10

# Verify backup files exist
kubectl exec -n kube-system deploy/etcd-backup-verify -- ls -la /backup/

# Check Longhorn backup status
kubectl get backups -n longhorn-system

# Test External Secrets sync
kubectl annotate externalsecret mattermost-secrets -n mattermost \
  force-sync=$(date +%s)
kubectl get secret mattermost-secrets -n mattermost -o yaml | grep -c "db-password"

# Check maintenance alerts
kubectl get prometheusrule -n monitoring -o yaml | grep -A5 "BackupFailed"
```

## Expected Results

| Task | Status | Verification |
|------|--------|--------------|
| etcd backup | Daily at 1 AM | Check job history |
| PostgreSQL backup | Daily at 2 AM | Check job history |
| Vault backup | Daily at 2 AM | Check job history |
| Longhorn backup | Daily at 3 AM | Longhorn UI |
| Backup verification | Weekly Sunday | Check job logs |
| Certificate renewal | Automatic | cert-manager status |

## Operations Runbook

### Daily Checks

```bash
#!/bin/bash
# daily-check.sh

echo "=== ATLAS Daily Health Check ==="
echo "Date: $(date)"
echo ""

echo "1. Node Status:"
kubectl get nodes
echo ""

echo "2. Pod Issues:"
kubectl get pods -A | grep -v Running | grep -v Completed
echo ""

echo "3. Recent Events:"
kubectl get events -A --sort-by='.lastTimestamp' | tail -20
echo ""

echo "4. Certificate Status:"
kubectl get certificate -A
echo ""

echo "5. Vault Status:"
kubectl exec -n vault vault-0 -- vault status 2>/dev/null | grep -E "Sealed|Version"
echo ""

echo "6. Backup Jobs (last 24h):"
kubectl get jobs -A --sort-by='.status.completionTime' | tail -10
echo ""

echo "=== End of Daily Check ==="
```

## Summary

This operations guide covers:

1. **Backups**: Automated daily backups for all critical components
2. **Secret Rotation**: Procedures and schedules for rotating credentials
3. **Disaster Recovery**: Step-by-step recovery procedures
4. **Maintenance**: Regular tasks and update procedures

::: tip Automation
Consider automating the daily checks script and sending results to Mattermost or email.
:::

## Conclusion

You have now completed the full ATLAS cluster installation:

1. ✅ System Preparation
2. ✅ K3s Core Infrastructure
3. ✅ HashiCorp Vault
4. ✅ Shared Databases
5. ✅ Core Services
6. ✅ DevOps Tools
7. ✅ Monitoring Stack
8. ✅ Security Hardening
9. ✅ Operations & Maintenance

The cluster is now ready for production use with:
- Full encryption at rest and in transit
- Centralized secrets management
- Comprehensive monitoring and alerting
- Automated backups
- GitOps deployment workflow
