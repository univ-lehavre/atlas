# Audit Infrastructure ECRIN - Plan de corrections

**Date** : 2026-01-23
**Scope** : `/infra`

---

## Problèmes identifiés

### 1. [CRITIQUE] Network Policy default-deny incorrecte

**Fichier** : `manifests/network-policies/default-deny.yaml:12-15`

**Problème** : La syntaxe actuelle autorise tout le trafic au lieu de le bloquer.

```yaml
# Actuel (INCORRECT - autorise tout)
spec:
  endpointSelector: {}
  ingress:
    - {}
  egress:
    - {}
```

**Correction** : Retirer les blocs ingress/egress pour un deny implicite, ou utiliser des listes vides.

```yaml
# Corrigé (deny all)
spec:
  endpointSelector: {}
  ingressDeny:
    - {}
  egressDeny:
    - {}
```

**Impact** : Sans cette correction, le Zero Trust n'est pas effectif - tout le trafic est autorisé par défaut.

---

### 2. [MOYEN] Chemin incorrect pour redcap-service dans setup.sh

**Fichier** : `scripts/setup.sh:188-191`

**Problème** : Le script cherche `apps/redcap-service` mais le service est dans `services/redcap`.

```bash
# Actuel (INCORRECT)
if [ -d "$ROOT_DIR/apps/redcap-service" ]; then
    docker build -t localhost:${REGISTRY_PORT}/redcap-service:dev "$ROOT_DIR/apps/redcap-service"
```

**Correction** :

```bash
# Corrigé
if [ -d "$ROOT_DIR/services/redcap" ]; then
    docker build -t localhost:${REGISTRY_PORT}/redcap-service:dev "$ROOT_DIR/services/redcap"
```

**Impact** : Le build de redcap-service échoue silencieusement avec un warning.

---

### 3. [FAIBLE] Commentaire trompeur dans cilium/values.yaml

**Fichier** : `cilium/values.yaml:1,7`

**Problème** : Le commentaire mentionne "kind" mais l'infra utilise k3d. La valeur `k8sServiceHost` est de toute façon surchargée par setup.sh.

```yaml
# Actuel
# Cilium Helm values for kind cluster with Zero Trust
k8sServiceHost: ecrin-control-plane
```

**Correction** :

```yaml
# Corrigé
# Cilium Helm values for k3d cluster with Zero Trust
# Note: k8sServiceHost is overridden dynamically by setup.sh
k8sServiceHost: k3d-ecrin-server-0
```

**Impact** : Confusion pour les mainteneurs. Pas d'impact fonctionnel.

---

### 4. [FAIBLE] Annotations nginx inutiles sur ingress Cilium

**Fichier** : `manifests/ingress.yaml:45-47`

**Problème** : Les annotations `nginx.ingress.kubernetes.io/*` sont ignorées par Cilium Ingress Controller.

```yaml
# Actuel (ignoré par Cilium)
annotations:
  nginx.ingress.kubernetes.io/auth-url: '...'
  nginx.ingress.kubernetes.io/auth-signin: '...'
  nginx.ingress.kubernetes.io/auth-response-headers: '...'
```

**Correction** : Retirer ces annotations car le forward-auth est géré par `CiliumEnvoyConfig` (lignes 83-173).

**Impact** : Annotations mortes, confusion pour les mainteneurs.

---

## Plan d'action

| #   | Action                              | Fichier                                        | Priorité |
| --- | ----------------------------------- | ---------------------------------------------- | -------- |
| 1   | Corriger la network policy deny-all | `manifests/network-policies/default-deny.yaml` | Haute    |
| 2   | Corriger le chemin redcap-service   | `scripts/setup.sh`                             | Moyenne  |
| 3   | Mettre à jour commentaire Cilium    | `cilium/values.yaml`                           | Basse    |
| 4   | Supprimer annotations nginx         | `manifests/ingress.yaml`                       | Basse    |

---

## Tests de validation post-correction

### Test 1 : Network Policy deny-all

```bash
# Avant : vérifier que le trafic passe (mauvais comportement)
# Après : vérifier que le trafic est bloqué sauf exceptions

# Créer un pod de test
kubectl run test-pod --image=busybox -n ecrin -- sleep 3600
kubectl wait --for=condition=ready pod/test-pod -n ecrin

# Test : accès internet devrait être bloqué
kubectl exec -n ecrin test-pod -- wget -q -O- --timeout=2 http://google.com 2>&1 || echo "✓ Egress blocked"

# Test : accès à un service non autorisé devrait être bloqué
kubectl exec -n ecrin test-pod -- nc -z -w2 authelia 9091 2>&1 || echo "✓ Internal traffic blocked"

# Cleanup
kubectl delete pod test-pod -n ecrin
```

### Test 2 : Build redcap-service

```bash
# Vérifier que le build fonctionne
./infra/scripts/setup.sh 2>&1 | grep -A2 "Building redcap-service"
# Devrait afficher le build, pas "not found"
```

### Test 3 : Flux complet Zero Trust

```bash
# 1. Accès public
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/
# Attendu : 200

# 2. Accès protégé sans auth
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/dashboard
# Attendu : 302 (redirect vers Authelia)

# 3. Test OPA decision
curl -s -X POST http://localhost:8181/v1/data/ecrin/authz/allow \
  -H "Content-Type: application/json" \
  -d '{"input":{"user":{"email":"viewer@test.fr","groups":["viewer"]},"action":"delete","resource":{"type":"record"}}}' \
  | jq -e '.result != true'
# Attendu : true (viewer ne peut pas supprimer)
```

---

## Commandes pour appliquer les corrections

```bash
# Après les edits, réappliquer les manifests
kubectl apply -f infra/manifests/network-policies/
kubectl apply -f infra/manifests/ingress.yaml

# Vérifier les policies
kubectl get ciliumnetworkpolicies -n ecrin
cilium policy get -n ecrin
```
