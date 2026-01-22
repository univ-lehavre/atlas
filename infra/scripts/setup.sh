#!/bin/bash
# ECRIN Local Development Setup Script
# Sets up a complete Zero Trust Kubernetes environment using k3d

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$INFRA_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Registry configuration
REGISTRY_NAME="ecrin-registry"
REGISTRY_PORT="5111"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."

    local missing=()

    command -v docker &> /dev/null || missing+=("docker")
    command -v k3d &> /dev/null || missing+=("k3d")
    command -v kubectl &> /dev/null || missing+=("kubectl")
    command -v helm &> /dev/null || missing+=("helm")
    command -v cilium &> /dev/null || missing+=("cilium-cli")

    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing[*]}"
        echo ""
        echo "Install with:"
        echo "  brew install k3d kubectl helm cilium-cli"
        echo "  Docker Desktop must also be installed"
        exit 1
    fi

    # Check Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi

    log_info "All dependencies found"
}

create_cluster() {
    log_info "Creating k3d cluster..."

    # Check if cluster already exists
    if k3d cluster list 2>/dev/null | grep -q "ecrin"; then
        log_warn "Cluster 'ecrin' already exists."
        read -p "Delete existing cluster? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            k3d cluster delete ecrin
        else
            exit 1
        fi
    fi

    k3d cluster create --config "$INFRA_DIR/k3d/cluster.yaml"

    # Wait for node to be ready
    log_info "Waiting for node to be ready..."
    kubectl wait --for=condition=ready node --all --timeout=120s

    log_info "Cluster created"
}

install_cilium() {
    log_info "Installing Cilium..."

    # Add Cilium Helm repo
    helm repo add cilium https://helm.cilium.io/ 2>/dev/null || true
    helm repo update

    # Install Cilium with k3d-specific settings
    helm install cilium cilium/cilium \
        --namespace kube-system \
        --values "$INFRA_DIR/cilium/values.yaml" \
        --set k8sServiceHost="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' k3d-ecrin-server-0)" \
        --set k8sServicePort=6443 \
        --wait

    log_info "Waiting for Cilium to be ready..."
    cilium status --wait --wait-duration 5m

    log_info "Cilium installed and ready"
}

install_spire() {
    log_info "Installing SPIRE..."

    # Create SPIRE namespace
    kubectl apply -f "$INFRA_DIR/spire/namespace.yaml"

    # Install SPIRE server
    kubectl apply -f "$INFRA_DIR/spire/server.yaml"

    # Wait for SPIRE server
    log_info "Waiting for SPIRE server..."
    kubectl wait --for=condition=ready pod -l app=spire-server -n spire --timeout=120s

    # Install SPIRE agent
    kubectl apply -f "$INFRA_DIR/spire/agent.yaml"

    # Wait for SPIRE agent
    log_info "Waiting for SPIRE agent..."
    kubectl wait --for=condition=ready pod -l app=spire-agent -n spire --timeout=120s

    log_info "SPIRE installed"
}

create_namespace() {
    log_info "Creating ecrin namespace..."
    kubectl apply -f "$INFRA_DIR/manifests/namespace.yaml"
}

deploy_opa() {
    log_info "Deploying OPA..."
    kubectl apply -f "$INFRA_DIR/opa/configmap.yaml"
    kubectl apply -f "$INFRA_DIR/opa/deployment.yaml"

    log_info "Waiting for OPA..."
    kubectl wait --for=condition=ready pod -l app=opa -n ecrin --timeout=120s

    log_info "OPA deployed"
}

deploy_mailhog() {
    log_info "Deploying MailHog..."
    kubectl apply -f "$INFRA_DIR/manifests/mailhog.yaml"

    log_info "Waiting for MailHog..."
    kubectl wait --for=condition=ready pod -l app=mailhog -n ecrin --timeout=120s

    log_info "MailHog deployed"
}

deploy_authelia() {
    log_info "Deploying Authelia..."
    kubectl apply -f "$INFRA_DIR/manifests/authelia/secrets.yaml"
    kubectl apply -f "$INFRA_DIR/manifests/authelia/configmap.yaml"
    kubectl apply -f "$INFRA_DIR/manifests/authelia/users.yaml"
    kubectl apply -f "$INFRA_DIR/manifests/authelia/deployment.yaml"

    log_info "Waiting for Authelia..."
    kubectl wait --for=condition=ready pod -l app=authelia -n ecrin --timeout=120s

    log_info "Authelia deployed"
}

apply_network_policies() {
    log_info "Applying network policies..."
    kubectl apply -f "$INFRA_DIR/manifests/network-policies/"
    log_info "Network policies applied"
}

build_and_push_images() {
    log_info "Building and pushing images to local registry..."

    # Build ecrin
    if [ -d "$ROOT_DIR/apps/ecrin" ]; then
        log_info "Building ecrin..."
        docker build -t localhost:${REGISTRY_PORT}/ecrin:dev "$ROOT_DIR/apps/ecrin"
        docker push localhost:${REGISTRY_PORT}/ecrin:dev
    else
        log_warn "apps/ecrin not found, skipping build"
    fi

    # Build redcap-service
    if [ -d "$ROOT_DIR/apps/redcap-service" ]; then
        log_info "Building redcap-service..."
        docker build -t localhost:${REGISTRY_PORT}/redcap-service:dev "$ROOT_DIR/apps/redcap-service"
        docker push localhost:${REGISTRY_PORT}/redcap-service:dev
    else
        log_warn "apps/redcap-service not found, skipping build"
    fi

    log_info "Images built and pushed"
}

deploy_services() {
    log_info "Deploying services..."

    # Deploy redcap-service
    kubectl apply -f "$INFRA_DIR/manifests/redcap-service/secrets.yaml"
    kubectl apply -f "$INFRA_DIR/manifests/redcap-service/deployment.yaml"

    # Deploy ecrin
    kubectl apply -f "$INFRA_DIR/manifests/ecrin/deployment.yaml"

    # Deploy ingress
    kubectl apply -f "$INFRA_DIR/manifests/ingress.yaml"

    log_info "Services deployed"
}

install_observability() {
    log_info "Installing observability stack..."

    # Add Grafana Helm repo
    helm repo add grafana https://grafana.github.io/helm-charts 2>/dev/null || true
    helm repo update

    # Install Loki
    helm install loki grafana/loki \
        --namespace ecrin \
        --values "$INFRA_DIR/observability/loki/values.yaml" \
        --wait || log_warn "Loki installation failed, continuing..."

    # Apply Grafana dashboard ConfigMap
    kubectl apply -f "$INFRA_DIR/observability/grafana/configmap.yaml"

    # Install Grafana
    helm install grafana grafana/grafana \
        --namespace ecrin \
        --values "$INFRA_DIR/observability/grafana/values.yaml" \
        --wait || log_warn "Grafana installation failed, continuing..."

    log_info "Observability stack installed"
}

wait_for_pods() {
    log_info "Waiting for all pods to be ready..."
    kubectl wait --for=condition=ready pod --all -n ecrin --timeout=300s || true
    log_info "Pods ready"
}

print_urls() {
    echo ""
    echo "=========================================="
    echo "  ECRIN Local Development Environment"
    echo "  (k3d + Cilium + Zero Trust)"
    echo "=========================================="
    echo ""
    echo "URLs:"
    echo "  Dashboard:  http://localhost:8080"
    echo "  Authelia:   http://localhost:8080/authelia/"
    echo "  MailHog:    http://localhost:8025"
    echo ""
    echo "Local Registry:"
    echo "  localhost:${REGISTRY_PORT}"
    echo ""
    echo "Test users (magic link auth):"
    echo "  admin@univ-lehavre.fr     (admin)"
    echo "  researcher@univ-lehavre.fr (researcher)"
    echo "  viewer@univ-lehavre.fr     (viewer)"
    echo ""
    echo "Access Grafana (port-forward):"
    echo "  kubectl port-forward svc/grafana 3000:3000 -n ecrin"
    echo "  Then open: http://localhost:3000 (admin/admin)"
    echo ""
    echo "Useful commands:"
    echo "  kubectl get pods -n ecrin"
    echo "  cilium status"
    echo "  k3d cluster list"
    echo "  kubectl logs -f deployment/ecrin -n ecrin"
    echo ""
}

main() {
    log_info "Starting ECRIN setup (k3d)..."

    check_dependencies
    create_cluster
    install_cilium
    install_spire
    create_namespace
    deploy_opa
    deploy_mailhog
    deploy_authelia
    apply_network_policies
    build_and_push_images
    deploy_services
    install_observability
    wait_for_pods
    print_urls

    log_info "Setup complete!"
}

main "$@"
