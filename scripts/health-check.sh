#!/bin/bash

# =============================================================================
# GKE Cluster Health Check Script
# =============================================================================
# This script performs comprehensive health checks on a GKE cluster
# It verifies cluster connectivity, pod status, services, and endpoints
#
# Usage:
#   ./scripts/health-check.sh [config_file]
#
# Arguments:
#   config_file - Optional path to cluster configuration file
#                 Default: config/cluster.yaml
#
# Requirements:
#   - gcloud CLI installed and authenticated
#   - kubectl installed
#   - yq installed (for YAML parsing)
#   - Cluster must be running and kubectl configured
#
# Exit Codes:
#   0 - All health checks passed
#   1 - One or more health checks failed
# =============================================================================

set -e
set -o pipefail

# Source utility functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=scripts/utils.sh
source "$SCRIPT_DIR/utils.sh"

# =============================================================================
# Configuration
# =============================================================================

CONFIG_FILE="${1:-$PROJECT_ROOT/config/cluster.yaml}"

# Health check status tracking
HEALTH_CHECKS_PASSED=0
HEALTH_CHECKS_FAILED=0
HEALTH_CHECKS_WARNING=0

# =============================================================================
# Helper Functions
# =============================================================================

# Record health check result
record_check() {
    local check_name=$1
    local status=$2  # "pass", "fail", or "warning"

    case $status in
        "pass")
            HEALTH_CHECKS_PASSED=$((HEALTH_CHECKS_PASSED + 1))
            log_success "$check_name: PASSED"
            ;;
        "fail")
            HEALTH_CHECKS_FAILED=$((HEALTH_CHECKS_FAILED + 1))
            log_error "$check_name: FAILED"
            ;;
        "warning")
            HEALTH_CHECKS_WARNING=$((HEALTH_CHECKS_WARNING + 1))
            log_warning "$check_name: WARNING"
            ;;
    esac
}

# =============================================================================
# Main Functions
# =============================================================================

# Validate prerequisites
validate_prerequisites() {
    log_step "Validating prerequisites"

    # Check required commands
    require_command "gcloud" "Install from: https://cloud.google.com/sdk/docs/install"
    require_command "kubectl" "Install with: brew install kubectl"
    require_command "yq" "Install with: brew install yq"

    # Check gcloud authentication
    check_gcloud_auth || exit 1

    # Validate YAML file
    validate_yaml_file "$CONFIG_FILE" || exit 1

    log_success "All prerequisites validated"
}

# Load configuration
load_configuration() {
    log_step "Loading cluster configuration"

    # Load configuration from YAML file
    export CLUSTER_PROJECT_ID=$(parse_yaml "$CONFIG_FILE" "project_id")
    export CLUSTER_NAME=$(parse_yaml "$CONFIG_FILE" "cluster.name")
    export CLUSTER_REGION=$(parse_yaml "$CONFIG_FILE" "cluster.region")
    export CLUSTER_ZONE=$(parse_yaml "$CONFIG_FILE" "cluster.zone")
    export CLUSTER_NAMESPACE=$(parse_yaml "$CONFIG_FILE" "cluster.namespace")

    log_success "Configuration loaded"
    log_info "Checking health for: $CLUSTER_NAME"
}

# Check cluster connectivity
check_cluster_connectivity() {
    log_step "Checking cluster connectivity"

    # Check if cluster exists
    if ! cluster_exists_gcp "$CLUSTER_NAME" "$CLUSTER_ZONE"; then
        record_check "Cluster Existence" "fail"
        log_error "Cluster '$CLUSTER_NAME' does not exist"
        return 1
    fi
    record_check "Cluster Existence" "pass"

    # Get cluster status
    local status
    status=$(gcloud container clusters describe "$CLUSTER_NAME" \
        --zone="$CLUSTER_ZONE" \
        --format="value(status)" 2>/dev/null)

    if [[ "$status" != "RUNNING" ]]; then
        record_check "Cluster Status" "fail"
        log_error "Cluster status is '$status', expected 'RUNNING'"
        return 1
    fi
    record_check "Cluster Status" "pass"

    # Configure kubectl
    log_info "Configuring kubectl..."
    if gcloud container clusters get-credentials "$CLUSTER_NAME" \
        --zone="$CLUSTER_ZONE" \
        --project="$CLUSTER_PROJECT_ID" &> /dev/null; then
        record_check "kubectl Configuration" "pass"
    else
        record_check "kubectl Configuration" "fail"
        return 1
    fi

    # Test cluster connection
    if kubectl cluster-info &> /dev/null; then
        record_check "Cluster Connection" "pass"
        log_info "Connected to: $(kubectl config current-context)"
    else
        record_check "Cluster Connection" "fail"
        return 1
    fi
}

# Check cluster nodes
check_cluster_nodes() {
    log_step "Checking cluster nodes"

    local node_count
    node_count=$(kubectl get nodes --no-headers 2>/dev/null | wc -l | tr -d ' ')

    if [[ $node_count -eq 0 ]]; then
        record_check "Node Count" "fail"
        log_error "No nodes found in cluster"
        return 1
    fi

    log_info "Found $node_count node(s)"
    record_check "Node Count" "pass"

    # Check node status
    log_info "Node Status:"
    local not_ready_nodes
    not_ready_nodes=$(kubectl get nodes --no-headers 2>/dev/null | grep -v " Ready" | wc -l | tr -d ' ')

    kubectl get nodes 2>/dev/null || true

    if [[ $not_ready_nodes -gt 0 ]]; then
        record_check "Node Readiness" "warning"
        log_warning "$not_ready_nodes node(s) not ready"
    else
        record_check "Node Readiness" "pass"
        log_success "All nodes are ready"
    fi

    # Check node resource usage
    log_info "Node Resource Usage:"
    kubectl top nodes 2>/dev/null || log_warning "Metrics server not available"
}

# Check namespace
check_namespace() {
    log_step "Checking namespace: $CLUSTER_NAMESPACE"

    if kubectl get namespace "$CLUSTER_NAMESPACE" &> /dev/null; then
        record_check "Namespace Existence" "pass"
        log_success "Namespace '$CLUSTER_NAMESPACE' exists"
    else
        record_check "Namespace Existence" "fail"
        log_error "Namespace '$CLUSTER_NAMESPACE' does not exist"
        return 1
    fi
}

# Check pods
check_pods() {
    log_step "Checking pods in namespace: $CLUSTER_NAMESPACE"

    local pod_count
    pod_count=$(kubectl get pods -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | wc -l | tr -d ' ')

    if [[ $pod_count -eq 0 ]]; then
        record_check "Pod Count" "warning"
        log_warning "No pods found in namespace '$CLUSTER_NAMESPACE'"
        return 0
    fi

    log_info "Found $pod_count pod(s)"

    # Display pod status
    echo ""
    kubectl get pods -n "$CLUSTER_NAMESPACE" 2>/dev/null || true
    echo ""

    # Check for non-running pods
    local not_running_pods
    not_running_pods=$(kubectl get pods -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | grep -v "Running" | grep -v "Completed" | wc -l | tr -d ' ')

    if [[ $not_running_pods -gt 0 ]]; then
        record_check "Pod Status" "warning"
        log_warning "$not_running_pods pod(s) not in Running state"

        echo ""
        log_info "Problematic pods:"
        kubectl get pods -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | grep -v "Running" | grep -v "Completed" || true
    else
        record_check "Pod Status" "pass"
        log_success "All pods are running"
    fi

    # Check pod restarts
    local high_restart_pods
    high_restart_pods=$(kubectl get pods -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | awk '$4 > 5 {print $0}' | wc -l | tr -d ' ')

    if [[ $high_restart_pods -gt 0 ]]; then
        record_check "Pod Restarts" "warning"
        log_warning "$high_restart_pods pod(s) have high restart counts (>5)"

        echo ""
        log_info "Pods with high restarts:"
        kubectl get pods -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | awk '$4 > 5 {print $0}' || true
    else
        record_check "Pod Restarts" "pass"
        log_success "No pods with excessive restarts"
    fi

    # Check pod resource usage
    echo ""
    log_info "Pod Resource Usage:"
    kubectl top pods -n "$CLUSTER_NAMESPACE" 2>/dev/null || log_warning "Metrics server not available"
}

# Check services
check_services() {
    log_step "Checking services in namespace: $CLUSTER_NAMESPACE"

    local service_count
    service_count=$(kubectl get services -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | wc -l | tr -d ' ')

    if [[ $service_count -eq 0 ]]; then
        record_check "Service Count" "warning"
        log_warning "No services found in namespace '$CLUSTER_NAMESPACE'"
        return 0
    fi

    log_info "Found $service_count service(s)"
    record_check "Service Count" "pass"

    # Display services
    echo ""
    kubectl get services -n "$CLUSTER_NAMESPACE" 2>/dev/null || true
    echo ""

    # Check each service
    local services
    services=$(kubectl get services -n "$CLUSTER_NAMESPACE" -o name 2>/dev/null)

    for service in $services; do
        local service_name
        service_name=$(echo "$service" | cut -d'/' -f2)

        log_info "Checking service: $service_name"

        # Get service details
        local service_type
        service_type=$(kubectl get service "$service_name" -n "$CLUSTER_NAMESPACE" -o jsonpath='{.spec.type}' 2>/dev/null)

        log_info "  Type: $service_type"

        # Check endpoints
        local endpoints
        endpoints=$(kubectl get endpoints "$service_name" -n "$CLUSTER_NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null)

        if [[ -n "$endpoints" ]]; then
            local endpoint_count
            endpoint_count=$(echo "$endpoints" | wc -w | tr -d ' ')
            log_success "  Endpoints: $endpoint_count ready"
        else
            log_warning "  No ready endpoints"
        fi

        # For LoadBalancer services, check external IP
        if [[ "$service_type" == "LoadBalancer" ]]; then
            local external_ip
            external_ip=$(kubectl get service "$service_name" -n "$CLUSTER_NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)

            if [[ -n "$external_ip" ]]; then
                log_info "  External IP: $external_ip"
            else
                log_warning "  External IP: Pending"
            fi
        fi

        echo ""
    done

    record_check "Service Health" "pass"
}

# Check deployments
check_deployments() {
    log_step "Checking deployments in namespace: $CLUSTER_NAMESPACE"

    local deployment_count
    deployment_count=$(kubectl get deployments -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | wc -l | tr -d ' ')

    if [[ $deployment_count -eq 0 ]]; then
        record_check "Deployment Count" "warning"
        log_warning "No deployments found in namespace '$CLUSTER_NAMESPACE'"
        return 0
    fi

    log_info "Found $deployment_count deployment(s)"

    # Display deployments
    echo ""
    kubectl get deployments -n "$CLUSTER_NAMESPACE" 2>/dev/null || true
    echo ""

    # Check deployment readiness
    local not_ready_deployments
    not_ready_deployments=$(kubectl get deployments -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | awk '$2 != $3 {print $0}' | wc -l | tr -d ' ')

    if [[ $not_ready_deployments -gt 0 ]]; then
        record_check "Deployment Readiness" "warning"
        log_warning "$not_ready_deployments deployment(s) not fully ready"

        echo ""
        log_info "Deployments not ready:"
        kubectl get deployments -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | awk '$2 != $3 {print $0}' || true
    else
        record_check "Deployment Readiness" "pass"
        log_success "All deployments are ready"
    fi
}

# Check persistent volume claims
check_pvcs() {
    log_step "Checking persistent volume claims"

    local pvc_count
    pvc_count=$(kubectl get pvc -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | wc -l | tr -d ' ')

    if [[ $pvc_count -eq 0 ]]; then
        log_info "No PVCs found (this is normal if not using persistent storage)"
        return 0
    fi

    log_info "Found $pvc_count PVC(s)"

    # Display PVCs
    echo ""
    kubectl get pvc -n "$CLUSTER_NAMESPACE" 2>/dev/null || true
    echo ""

    # Check PVC status
    local unbound_pvcs
    unbound_pvcs=$(kubectl get pvc -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | grep -v "Bound" | wc -l | tr -d ' ')

    if [[ $unbound_pvcs -gt 0 ]]; then
        record_check "PVC Status" "warning"
        log_warning "$unbound_pvcs PVC(s) not bound"
    else
        record_check "PVC Status" "pass"
        log_success "All PVCs are bound"
    fi
}

# Test basic connectivity
test_connectivity() {
    log_step "Testing basic connectivity"

    # Try to get a pod to test from
    local test_pod
    test_pod=$(kubectl get pods -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | grep "Running" | head -1 | awk '{print $1}')

    if [[ -z "$test_pod" ]]; then
        log_warning "No running pods available to test connectivity"
        return 0
    fi

    log_info "Testing from pod: $test_pod"

    # Test DNS resolution
    log_info "Testing DNS resolution..."
    if kubectl exec "$test_pod" -n "$CLUSTER_NAMESPACE" -- nslookup kubernetes.default &> /dev/null; then
        record_check "DNS Resolution" "pass"
        log_success "DNS resolution working"
    else
        record_check "DNS Resolution" "warning"
        log_warning "DNS resolution test failed (may not have nslookup installed)"
    fi

    # Test connectivity to Kubernetes API
    log_info "Testing Kubernetes API connectivity..."
    if kubectl exec "$test_pod" -n "$CLUSTER_NAMESPACE" -- wget -q -O- --timeout=5 https://kubernetes.default/healthz &> /dev/null; then
        record_check "K8s API Connectivity" "pass"
        log_success "Kubernetes API connectivity working"
    else
        record_check "K8s API Connectivity" "warning"
        log_warning "Kubernetes API connectivity test failed (may not have wget installed)"
    fi
}

# Display health report summary
display_health_report() {
    print_header "Health Check Summary"

    local total_checks=$((HEALTH_CHECKS_PASSED + HEALTH_CHECKS_FAILED + HEALTH_CHECKS_WARNING))

    echo -e "${CYAN}Cluster:${NC}     $CLUSTER_NAME"
    echo -e "${CYAN}Zone:${NC}        $CLUSTER_ZONE"
    echo -e "${CYAN}Namespace:${NC}   $CLUSTER_NAMESPACE"
    echo ""

    echo -e "${CYAN}Health Check Results:${NC}"
    echo -e "  ${GREEN}Passed:${NC}   $HEALTH_CHECKS_PASSED"
    echo -e "  ${RED}Failed:${NC}   $HEALTH_CHECKS_FAILED"
    echo -e "  ${YELLOW}Warnings:${NC} $HEALTH_CHECKS_WARNING"
    echo -e "  ${CYAN}Total:${NC}    $total_checks"
    echo ""

    if [[ $HEALTH_CHECKS_FAILED -eq 0 ]] && [[ $HEALTH_CHECKS_WARNING -eq 0 ]]; then
        print_summary "All Health Checks Passed"
        log_success "Cluster is healthy!"
        return 0
    elif [[ $HEALTH_CHECKS_FAILED -eq 0 ]]; then
        print_summary "Health Checks Passed with Warnings"
        log_warning "Cluster is operational but has some warnings"
        return 0
    else
        print_summary "Health Checks Failed"
        log_error "Cluster has critical issues that need attention"
        return 1
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    log_header "GKE Cluster Health Check - NoClue Project"

    # Step 1: Validate prerequisites
    validate_prerequisites

    # Step 2: Load configuration
    load_configuration

    # Step 3: Check cluster connectivity
    check_cluster_connectivity || exit 1

    # Step 4: Check cluster nodes
    check_cluster_nodes

    # Step 5: Check namespace
    check_namespace || exit 1

    # Step 6: Check pods
    check_pods

    # Step 7: Check services
    check_services

    # Step 8: Check deployments
    check_deployments

    # Step 9: Check PVCs
    check_pvcs

    # Step 10: Test connectivity
    test_connectivity

    # Step 11: Display health report
    display_health_report
}

# Run main function and capture exit code
main "$@"
exit_code=$?

exit $exit_code
