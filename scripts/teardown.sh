#!/bin/bash

# =============================================================================
# GKE Cluster Teardown Script
# =============================================================================
# This script safely tears down a GKE cluster with confirmation
# It deletes Kubernetes resources first, then removes the cluster
#
# Usage:
#   ./scripts/teardown.sh [config_file]
#
# Arguments:
#   config_file - Optional path to cluster configuration file
#                 Default: config/cluster.yaml
#
# Requirements:
#   - gcloud CLI installed and authenticated
#   - kubectl installed
#   - yq installed (for YAML parsing)
#   - Appropriate GCP permissions
#
# Safety Features:
#   - Requires explicit confirmation with cluster name
#   - Lists all resources before deletion
#   - Deletes Kubernetes resources before cluster
#   - Cleans up kubectl context
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

    # Display configuration
    log_success "Configuration loaded"
    echo ""
    log_info "Target Cluster:"
    echo -e "  ${CYAN}Project ID:${NC}    $CLUSTER_PROJECT_ID"
    echo -e "  ${CYAN}Cluster Name:${NC}  $CLUSTER_NAME"
    echo -e "  ${CYAN}Zone:${NC}          $CLUSTER_ZONE"
    echo -e "  ${CYAN}Namespace:${NC}     $CLUSTER_NAMESPACE"
    echo ""
}

# Set GCP project
set_gcp_project() {
    log_step "Setting GCP project"

    local current_project
    current_project=$(gcloud config get-value project 2>/dev/null || echo "")

    if [[ "$current_project" != "$CLUSTER_PROJECT_ID" ]]; then
        log_info "Switching to project: $CLUSTER_PROJECT_ID"
        gcloud config set project "$CLUSTER_PROJECT_ID"
    else
        log_info "Already using project: $CLUSTER_PROJECT_ID"
    fi

    log_success "GCP project configured"
}

# Check if cluster exists
check_cluster_exists() {
    log_step "Checking if cluster exists"

    if ! cluster_exists_gcp "$CLUSTER_NAME" "$CLUSTER_ZONE"; then
        log_warning "Cluster '$CLUSTER_NAME' does not exist in zone '$CLUSTER_ZONE'"
        log_info "Nothing to tear down"
        exit 0
    fi

    log_info "Cluster '$CLUSTER_NAME' exists"

    local status
    status=$(gcloud container clusters describe "$CLUSTER_NAME" \
        --zone="$CLUSTER_ZONE" \
        --format="value(status)" 2>/dev/null)

    log_info "Cluster status: $status"
}

# Configure kubectl to connect to the cluster
configure_kubectl_connection() {
    log_step "Connecting to cluster with kubectl"

    log_info "Getting cluster credentials..."

    if gcloud container clusters get-credentials "$CLUSTER_NAME" \
        --zone="$CLUSTER_ZONE" \
        --project="$CLUSTER_PROJECT_ID" &> /dev/null; then
        log_success "kubectl configured"
    else
        log_warning "Could not configure kubectl (cluster may not be accessible)"
        log_warning "Will attempt to delete cluster anyway"
        return 1
    fi
}

# List all resources that will be deleted
list_resources_to_delete() {
    log_step "Listing resources that will be deleted"

    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}The following resources will be DELETED:${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo ""

    # Cluster information
    echo -e "${RED}GKE Cluster:${NC}"
    gcloud container clusters describe "$CLUSTER_NAME" \
        --zone="$CLUSTER_ZONE" \
        --format="table(
            name,
            location,
            currentNodeCount:label=NODES,
            status
        )" 2>/dev/null || echo "  (Could not retrieve cluster info)"

    echo ""

    # Try to list Kubernetes resources if kubectl is configured
    if kubectl cluster-info &> /dev/null; then
        echo -e "${RED}Kubernetes Namespaces:${NC}"
        kubectl get namespaces --no-headers 2>/dev/null | awk '{print "  - " $1}' || echo "  (none)"

        if kubectl get namespace "$CLUSTER_NAMESPACE" &> /dev/null; then
            echo ""
            echo -e "${RED}Resources in namespace '$CLUSTER_NAMESPACE':${NC}"

            echo -e "${YELLOW}Deployments:${NC}"
            kubectl get deployments -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | awk '{print "  - " $1}' || echo "  (none)"

            echo -e "${YELLOW}Services:${NC}"
            kubectl get services -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | awk '{print "  - " $1}' || echo "  (none)"

            echo -e "${YELLOW}Pods:${NC}"
            kubectl get pods -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | awk '{print "  - " $1}' || echo "  (none)"

            echo -e "${YELLOW}ConfigMaps:${NC}"
            kubectl get configmaps -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | awk '{print "  - " $1}' || echo "  (none)"

            echo -e "${YELLOW}Secrets:${NC}"
            kubectl get secrets -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | awk '{print "  - " $1}' || echo "  (none)"

            echo -e "${YELLOW}PersistentVolumeClaims:${NC}"
            kubectl get pvc -n "$CLUSTER_NAMESPACE" --no-headers 2>/dev/null | awk '{print "  - " $1}' || echo "  (none)"
        fi
    else
        log_warning "kubectl not configured - skipping Kubernetes resource listing"
    fi

    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo ""
}

# Confirm deletion
confirm_deletion() {
    log_step "Confirmation required"

    log_warning "================================================"
    log_warning "DESTRUCTIVE ACTION: This will DELETE the cluster"
    log_warning "and ALL associated resources!"
    log_warning "This action CANNOT be undone!"
    log_warning "================================================"

    echo ""
    echo -e "${RED}To confirm deletion, type the cluster name exactly: ${CYAN}$CLUSTER_NAME${NC}"
    echo -en "${YELLOW}Cluster name: ${NC}"
    read -r user_input

    if [[ "$user_input" != "$CLUSTER_NAME" ]]; then
        log_error "Confirmation failed"
        log_error "Expected: '$CLUSTER_NAME'"
        log_error "Got: '$user_input'"
        log_info "Teardown cancelled"
        exit 1
    fi

    log_warning "Deletion confirmed"

    # Double confirmation
    echo ""
    echo -en "${YELLOW}Are you absolutely sure? (type 'yes' to proceed): ${NC}"
    read -r final_confirmation

    if [[ "$final_confirmation" != "yes" ]]; then
        log_info "Teardown cancelled"
        exit 0
    fi

    log_warning "Final confirmation received - proceeding with deletion"
}

# Delete Kubernetes resources
delete_kubernetes_resources() {
    log_step "Deleting Kubernetes resources"

    if ! kubectl cluster-info &> /dev/null; then
        log_warning "kubectl not configured - skipping Kubernetes resource deletion"
        return 0
    fi

    if ! kubectl get namespace "$CLUSTER_NAMESPACE" &> /dev/null; then
        log_warning "Namespace '$CLUSTER_NAMESPACE' does not exist - skipping"
        return 0
    fi

    log_info "Deleting all resources in namespace: $CLUSTER_NAMESPACE"

    # Delete deployments
    log_info "Deleting deployments..."
    kubectl delete deployments --all -n "$CLUSTER_NAMESPACE" --timeout=60s 2>/dev/null || log_warning "No deployments to delete"

    # Delete services (except kubernetes default)
    log_info "Deleting services..."
    kubectl delete services --all -n "$CLUSTER_NAMESPACE" --timeout=60s 2>/dev/null || log_warning "No services to delete"

    # Delete configmaps
    log_info "Deleting configmaps..."
    kubectl delete configmaps --all -n "$CLUSTER_NAMESPACE" --timeout=60s 2>/dev/null || log_warning "No configmaps to delete"

    # Delete secrets
    log_info "Deleting secrets..."
    kubectl delete secrets --all -n "$CLUSTER_NAMESPACE" --timeout=60s 2>/dev/null || log_warning "No secrets to delete"

    # Delete persistent volume claims
    log_info "Deleting persistent volume claims..."
    kubectl delete pvc --all -n "$CLUSTER_NAMESPACE" --timeout=60s 2>/dev/null || log_warning "No PVCs to delete"

    # Delete namespace
    log_info "Deleting namespace: $CLUSTER_NAMESPACE"
    kubectl delete namespace "$CLUSTER_NAMESPACE" --timeout=60s 2>/dev/null || log_warning "Namespace already deleted"

    log_success "Kubernetes resources deleted"
}

# Delete GKE cluster
delete_cluster() {
    log_step "Deleting GKE cluster"

    log_warning "Deleting cluster: $CLUSTER_NAME"
    log_warning "This may take 5-10 minutes..."

    if gcloud container clusters delete "$CLUSTER_NAME" \
        --zone="$CLUSTER_ZONE" \
        --quiet; then
        log_success "Cluster deleted successfully"
    else
        log_error "Failed to delete cluster"
        return 1
    fi
}

# Clean up kubectl context
cleanup_kubectl_config() {
    log_step "Cleaning up kubectl configuration"

    local context_name="gke_${CLUSTER_PROJECT_ID}_${CLUSTER_ZONE}_${CLUSTER_NAME}"

    log_info "Removing kubectl context: $context_name"

    if kubectl config get-contexts "$context_name" &> /dev/null; then
        kubectl config delete-context "$context_name" &> /dev/null || true
        log_success "Context removed"
    else
        log_info "Context not found - nothing to clean up"
    fi

    # Also try to delete the cluster entry
    if kubectl config get-clusters | grep -q "$context_name"; then
        kubectl config delete-cluster "$context_name" &> /dev/null || true
        log_info "Cluster entry removed"
    fi

    log_success "kubectl configuration cleaned up"
}

# Display teardown summary
display_teardown_summary() {
    print_summary "Teardown Complete"

    echo -e "${GREEN}Successfully deleted:${NC}"
    echo -e "  Cluster:     $CLUSTER_NAME"
    echo -e "  Zone:        $CLUSTER_ZONE"
    echo -e "  Project:     $CLUSTER_PROJECT_ID"
    echo ""

    echo -e "${GREEN}Next Steps:${NC}"
    echo -e "  1. Verify cluster is deleted:"
    echo -e "     ${CYAN}gcloud container clusters list --project=$CLUSTER_PROJECT_ID${NC}"
    echo ""
    echo -e "  2. Check for remaining resources:"
    echo -e "     ${CYAN}gcloud compute disks list --project=$CLUSTER_PROJECT_ID${NC}"
    echo -e "     ${CYAN}gcloud compute addresses list --project=$CLUSTER_PROJECT_ID${NC}"
    echo ""
    echo -e "  3. To recreate the cluster:"
    echo -e "     ${CYAN}./scripts/setup-gke.sh${NC}"
    echo ""

    log_success "GKE cluster teardown completed successfully!"
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    log_header "GKE Cluster Teardown - NoClue Project"

    # Step 1: Validate prerequisites
    validate_prerequisites

    # Step 2: Load configuration
    load_configuration

    # Step 3: Set GCP project
    set_gcp_project

    # Step 4: Check if cluster exists
    check_cluster_exists

    # Step 5: Configure kubectl (optional)
    configure_kubectl_connection || true

    # Step 6: List resources
    list_resources_to_delete

    # Step 7: Confirm deletion
    confirm_deletion

    # Step 8: Delete Kubernetes resources
    delete_kubernetes_resources

    # Step 9: Delete cluster
    delete_cluster

    # Step 10: Clean up kubectl context
    cleanup_kubectl_config

    # Step 11: Display summary
    display_teardown_summary
}

# Run main function
main "$@"
