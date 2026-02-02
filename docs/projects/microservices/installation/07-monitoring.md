# Phase 7: Monitoring Stack

This phase installs the observability stack: Prometheus for metrics collection, Grafana for dashboards, and Alertmanager for alerting.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Observability Stack                             │
│                                                                     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐   │
│  │  Prometheus │────►│  Grafana    │     │   Alertmanager      │   │
│  │  (metrics)  │     │ (dashboards)│     │   (notifications)   │   │
│  └──────┬──────┘     └─────────────┘     └─────────────────────┘   │
│         │                                           ▲               │
│         │ scrape                                    │               │
│         ▼                                           │               │
│  ┌──────────────────────────────────────────────────┴────────────┐ │
│  │                     ServiceMonitors                            │ │
│  │                                                                │ │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  │ │
│  │  │ K3s    │  │Cilium  │  │Longhorn│  │  PostgreSQL   │  │ Redis  │  │ │
│  │  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘  │ │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  │ │
│  │  │ Vault  │  │Authelia│  │Mattermost│  │ Gitea │  │ ArgoCD │  │ │
│  │  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Hubble: Network flow observability (Cilium)                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Create Namespace

```bash
kubectl create namespace monitoring
```

## Install Prometheus Stack (kube-prometheus-stack)

The kube-prometheus-stack includes:
- Prometheus Operator
- Prometheus
- Alertmanager
- Grafana
- Node Exporter
- kube-state-metrics

### Create ExternalSecret for Grafana

```bash
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: grafana-secrets
  namespace: monitoring
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: grafana-admin-credentials
    creationPolicy: Owner
  data:
    - secretKey: admin-password
      remoteRef:
        key: services/grafana
        property: admin-password
EOF

kubectl wait --for=condition=Ready externalsecret/grafana-secrets \
  -n monitoring --timeout=60s
```

### Install kube-prometheus-stack

```bash
export DOMAIN="example.com"

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.retention=15d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.storageClassName=longhorn-encrypted \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
  --set prometheus.prometheusSpec.resources.requests.memory=512Mi \
  --set prometheus.prometheusSpec.resources.requests.cpu=200m \
  --set prometheus.prometheusSpec.resources.limits.memory=1Gi \
  --set alertmanager.alertmanagerSpec.storage.volumeClaimTemplate.spec.storageClassName=longhorn-encrypted \
  --set alertmanager.alertmanagerSpec.storage.volumeClaimTemplate.spec.resources.requests.storage=5Gi \
  --set alertmanager.alertmanagerSpec.resources.requests.memory=64Mi \
  --set alertmanager.alertmanagerSpec.resources.requests.cpu=25m \
  --set grafana.adminPassword="" \
  --set grafana.admin.existingSecret=grafana-admin-credentials \
  --set grafana.admin.userKey=admin-user \
  --set grafana.admin.passwordKey=admin-password \
  --set grafana.persistence.enabled=true \
  --set grafana.persistence.storageClassName=longhorn-encrypted \
  --set grafana.persistence.size=10Gi \
  --set grafana.resources.requests.memory=128Mi \
  --set grafana.resources.requests.cpu=50m \
  --set grafana.resources.limits.memory=256Mi \
  --set grafana.ingress.enabled=true \
  --set grafana.ingress.ingressClassName=cilium \
  --set grafana.ingress.hosts[0]=grafana.${DOMAIN} \
  --set grafana.ingress.annotations."cert-manager\.io/cluster-issuer"=letsencrypt-prod \
  --set grafana.ingress.tls[0].hosts[0]=grafana.${DOMAIN} \
  --set grafana.ingress.tls[0].secretName=grafana-tls \
  --set grafana.sidecar.dashboards.enabled=true \
  --set grafana.sidecar.datasources.enabled=true \
  --set nodeExporter.enabled=true \
  --set kubeStateMetrics.enabled=true \
  --set defaultRules.create=true \
  --set defaultRules.rules.alertmanager=true \
  --set defaultRules.rules.etcd=true \
  --set defaultRules.rules.kubernetesApps=true \
  --set defaultRules.rules.kubernetesResources=true \
  --set defaultRules.rules.kubernetesStorage=true \
  --set defaultRules.rules.kubernetesSystem=true \
  --set defaultRules.rules.node=true \
  --set defaultRules.rules.prometheus=true

kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=prometheus -n monitoring --timeout=300s
```

### Configure Grafana OIDC

```bash
# Generate OIDC client secret
GRAFANA_OIDC_SECRET=$(openssl rand -base64 32)

# Store in Vault
kubectl exec -n vault vault-0 -- vault kv patch secret/services/grafana \
  oidc-secret="${GRAFANA_OIDC_SECRET}"

# Create ConfigMap for Grafana OAuth
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-oauth-config
  namespace: monitoring
data:
  grafana.ini: |
    [server]
    root_url = https://grafana.${DOMAIN}

    [auth.generic_oauth]
    enabled = true
    name = Authelia
    allow_sign_up = true
    client_id = grafana
    client_secret = ${GRAFANA_OIDC_SECRET}
    scopes = openid profile email groups
    auth_url = https://auth.${DOMAIN}/api/oidc/authorization
    token_url = https://auth.${DOMAIN}/api/oidc/token
    api_url = https://auth.${DOMAIN}/api/oidc/userinfo
    role_attribute_path = contains(groups[*], 'admins') && 'Admin' || 'Viewer'
    email_attribute_path = email
    name_attribute_path = name

    [auth]
    disable_login_form = false
    oauth_auto_login = false
EOF

# Restart Grafana to apply OAuth config
kubectl rollout restart deployment prometheus-grafana -n monitoring
```

## Install Cilium Hubble UI

Hubble provides network flow observability.

```bash
# Hubble UI is already enabled via Cilium installation
# Create ingress for Hubble UI

cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hubble-ui
  namespace: kube-system
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: cilium
  tls:
  - hosts:
    - hubble.${DOMAIN}
    secretName: hubble-tls
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

## Create Longhorn Ingress

```bash
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: longhorn
  namespace: longhorn-system
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: cilium
  tls:
  - hosts:
    - longhorn.${DOMAIN}
    secretName: longhorn-tls
  rules:
  - host: longhorn.${DOMAIN}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: longhorn-frontend
            port:
              number: 80
EOF
```

## Create ServiceMonitors for Custom Services

### Vault ServiceMonitor

```bash
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: vault
  namespace: monitoring
  labels:
    release: prometheus
spec:
  namespaceSelector:
    matchNames:
      - vault
  selector:
    matchLabels:
      app.kubernetes.io/name: vault
  endpoints:
    - port: http
      path: /v1/sys/metrics
      params:
        format: ["prometheus"]
EOF
```

### Authelia ServiceMonitor

```bash
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: authelia
  namespace: monitoring
  labels:
    release: prometheus
spec:
  namespaceSelector:
    matchNames:
      - authelia
  selector:
    matchLabels:
      app.kubernetes.io/name: authelia
  endpoints:
    - port: http
      path: /metrics
EOF
```

### Gitea ServiceMonitor

```bash
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: gitea
  namespace: monitoring
  labels:
    release: prometheus
spec:
  namespaceSelector:
    matchNames:
      - gitea
  selector:
    matchLabels:
      app.kubernetes.io/name: gitea
  endpoints:
    - port: http
      path: /metrics
EOF
```

## Configure Alertmanager

### Create Alert Rules

```bash
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: atlas-alerts
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
    - name: atlas.rules
      rules:
        # High Memory Usage
        - alert: HighMemoryUsage
          expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.9
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High memory usage on {{ \$labels.instance }}"
            description: "Memory usage is above 90% (current: {{ \$value | humanizePercentage }})"

        # High CPU Usage
        - alert: HighCPUUsage
          expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 90
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High CPU usage on {{ \$labels.instance }}"
            description: "CPU usage is above 90%"

        # Disk Space Low
        - alert: DiskSpaceLow
          expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Low disk space on {{ \$labels.instance }}"
            description: "Less than 10% disk space remaining"

        # Pod CrashLoopBackOff
        - alert: PodCrashLoopBackOff
          expr: kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"} > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Pod {{ \$labels.namespace }}/{{ \$labels.pod }} is in CrashLoopBackOff"
            description: "Container {{ \$labels.container }} in pod {{ \$labels.pod }} is crash looping"

        # Certificate Expiring Soon
        - alert: CertificateExpiringSoon
          expr: certmanager_certificate_expiration_timestamp_seconds - time() < 604800
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Certificate {{ \$labels.name }} expiring soon"
            description: "Certificate will expire in less than 7 days"

        # Vault Sealed
        - alert: VaultSealed
          expr: vault_core_unsealed == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Vault is sealed"
            description: "Vault instance is sealed and cannot serve requests"

        # PostgreSQL Down
        - alert: PostgreSQLDown
          expr: pg_up == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "PostgreSQL is down"
            description: "PostgreSQL instance {{ \$labels.instance }} is not responding"

        # Redis Down
        - alert: RedisDown
          expr: redis_up == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Redis is down"
            description: "Redis instance {{ \$labels.instance }} is not responding"

        # Longhorn Volume Degraded
        - alert: LonghornVolumeDegraded
          expr: longhorn_volume_robustness == 2
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Longhorn volume {{ \$labels.volume }} is degraded"
            description: "Volume has degraded robustness"
EOF
```

### Configure Alertmanager Notifications

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-prometheus-kube-prometheus-alertmanager
  namespace: monitoring
  labels:
    app: kube-prometheus-stack-alertmanager
type: Opaque
stringData:
  alertmanager.yaml: |
    global:
      resolve_timeout: 5m

    route:
      group_by: ['alertname', 'namespace']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      receiver: 'default-receiver'
      routes:
        - match:
            severity: critical
          receiver: 'critical-receiver'
          continue: true

    receivers:
      - name: 'default-receiver'
        # Configure email or webhook notifications here
        # Example for email:
        # email_configs:
        #   - to: 'admin@example.com'
        #     from: 'alertmanager@example.com'
        #     smarthost: 'smtp.example.com:587'
        #     auth_username: 'alertmanager@example.com'
        #     auth_password: 'password'

      - name: 'critical-receiver'
        # Configure critical alert notifications
        # Example for Mattermost webhook:
        # webhook_configs:
        #   - url: 'https://chat.example.com/hooks/xxx'

    inhibit_rules:
      - source_match:
          severity: 'critical'
        target_match:
          severity: 'warning'
        equal: ['alertname', 'namespace']
EOF
```

## Import Grafana Dashboards

### Create ConfigMaps for Dashboards

```bash
# Kubernetes Cluster Overview Dashboard
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-cluster
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  cluster-overview.json: |
    {
      "annotations": {
        "list": []
      },
      "title": "ATLAS Cluster Overview",
      "uid": "atlas-cluster",
      "version": 1,
      "panels": [
        {
          "title": "CPU Usage",
          "type": "gauge",
          "gridPos": {"h": 8, "w": 6, "x": 0, "y": 0},
          "targets": [
            {
              "expr": "100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
              "legendFormat": "CPU %"
            }
          ]
        },
        {
          "title": "Memory Usage",
          "type": "gauge",
          "gridPos": {"h": 8, "w": 6, "x": 6, "y": 0},
          "targets": [
            {
              "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
              "legendFormat": "Memory %"
            }
          ]
        },
        {
          "title": "Disk Usage",
          "type": "gauge",
          "gridPos": {"h": 8, "w": 6, "x": 12, "y": 0},
          "targets": [
            {
              "expr": "(1 - (node_filesystem_avail_bytes{mountpoint=\"/\"} / node_filesystem_size_bytes{mountpoint=\"/\"})) * 100",
              "legendFormat": "Disk %"
            }
          ]
        },
        {
          "title": "Pod Count",
          "type": "stat",
          "gridPos": {"h": 8, "w": 6, "x": 18, "y": 0},
          "targets": [
            {
              "expr": "count(kube_pod_info)",
              "legendFormat": "Pods"
            }
          ]
        }
      ]
    }
EOF
```

### Import Community Dashboards

Add these dashboard IDs to Grafana:
- **1860**: Node Exporter Full
- **15757**: Kubernetes / Views / Global
- **13473**: Longhorn Dashboard
- **12171**: Cilium Dashboard
- **15983**: ArgoCD Dashboard

## Validation Tests

```bash
# Check Prometheus
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus
# Expected: prometheus-prometheus-kube-prometheus-prometheus-0 Running

# Check Grafana
kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana
# Expected: prometheus-grafana-xxx Running

# Check Alertmanager
kubectl get pods -n monitoring -l app.kubernetes.io/name=alertmanager
# Expected: alertmanager-prometheus-kube-prometheus-alertmanager-0 Running

# Check ServiceMonitors
kubectl get servicemonitor -n monitoring
# Expected: Multiple ServiceMonitors listed

# Check PrometheusRules
kubectl get prometheusrule -n monitoring
# Expected: atlas-alerts and default rules listed

# Test Grafana access
curl -I https://grafana.${DOMAIN}
# Expected: HTTP/2 200 or 302

# Test Prometheus targets
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090 &
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length'
# Expected: Number of active targets

# Test Hubble UI
curl -I https://hubble.${DOMAIN}
# Expected: HTTP/2 200

# Test Longhorn UI
curl -I https://longhorn.${DOMAIN}
# Expected: HTTP/2 200 or 302
```

## Expected Results

| Component | Namespace | Pods | Ingress |
|-----------|-----------|------|---------|
| Prometheus | monitoring | 1 Running | - (internal) |
| Grafana | monitoring | 1 Running | grafana.example.com |
| Alertmanager | monitoring | 1 Running | - (internal) |
| Node Exporter | monitoring | 1 Running | - (DaemonSet) |
| kube-state-metrics | monitoring | 1 Running | - |
| Hubble UI | kube-system | 1 Running | hubble.example.com |
| Longhorn UI | longhorn-system | 1 Running | longhorn.example.com |

## Resource Summary

| Component | CPU Request | Memory Request | Storage |
|-----------|-------------|----------------|---------|
| Prometheus | 200m | 512Mi | 50Gi |
| Grafana | 50m | 128Mi | 10Gi |
| Alertmanager | 25m | 64Mi | 5Gi |
| Node Exporter | 25m | 32Mi | - |
| kube-state-metrics | 25m | 64Mi | - |
| **Total** | **325m** | **~800Mi** | **65Gi** |

## Dashboards Available

After installation, these dashboards are available in Grafana:

| Dashboard | Description |
|-----------|-------------|
| ATLAS Cluster Overview | Custom overview of cluster resources |
| Node Exporter Full | Detailed node metrics |
| Kubernetes / Compute Resources | Resource usage by namespace/pod |
| Longhorn | Storage metrics and volume health |
| Cilium / Hubble | Network flow and policy metrics |
| ArgoCD | GitOps sync status and metrics |
| PostgreSQL | Database performance metrics |
| Redis | Cache performance metrics |

## Next Step

Proceed to [Phase 8: Security](./08-security.md) to configure Network Policies and access control.
