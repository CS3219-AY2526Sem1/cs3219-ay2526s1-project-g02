#!/bin/bash

# =============================================================================
# GKE Cluster Setup Script
# =============================================================================
# This script sets up a GKE cluster for the NoClue project
# It reads configuration from config/cluster.yaml and is idempotent
#
# Usage:
#   ./scripts/setup-gke.sh [config_file]
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

# Load and validate configuration
load_configuration() {
    log_step "Loading cluster configuration"

    # Load configuration from YAML file
    export CLUSTER_PROJECT_ID=$(parse_yaml "$CONFIG_FILE" "project_id")
    export CLUSTER_NAME=$(parse_yaml "$CONFIG_FILE" "cluster.name")
    export CLUSTER_REGION=$(parse_yaml "$CONFIG_FILE" "cluster.region")
    export CLUSTER_ZONE=$(parse_yaml "$CONFIG_FILE" "cluster.zone")
    export CLUSTER_NETWORK=$(parse_yaml "$CONFIG_FILE" "cluster.network")
    export CLUSTER_SUBNET=$(parse_yaml "$CONFIG_FILE" "cluster.subnet")
    export CLUSTER_NAMESPACE=$(parse_yaml "$CONFIG_FILE" "cluster.namespace")

    export NODE_MACHINE_TYPE=$(parse_yaml "$CONFIG_FILE" "nodePool.machineType")
    export NODE_DISK_SIZE=$(parse_yaml "$CONFIG_FILE" "nodePool.diskSizeGb")
    export NODE_INITIAL_COUNT=$(parse_yaml "$CONFIG_FILE" "nodePool.initialNodeCount")
    export NODE_MIN_COUNT=$(parse_yaml "$CONFIG_FILE" "nodePool.minNodes")
    export NODE_MAX_COUNT=$(parse_yaml "$CONFIG_FILE" "nodePool.maxNodes")
    export NODE_PREEMPTIBLE=$(parse_yaml "$CONFIG_FILE" "nodePool.preemptible")
    export NODE_SERVICE_ACCOUNT=$(parse_yaml "$CONFIG_FILE" "nodePool.serviceAccount")

    # Display configuration
    log_success "Configuration loaded successfully"
    echo ""
    log_info "Cluster Configuration:"
    echo -e "  ${CYAN}Project ID:${NC}       $CLUSTER_PROJECT_ID"
    echo -e "  ${CYAN}Cluster Name:${NC}     $CLUSTER_NAME"
    echo -e "  ${CYAN}Region:${NC}           $CLUSTER_REGION"
    echo -e "  ${CYAN}Zone:${NC}             $CLUSTER_ZONE"
    echo -e "  ${CYAN}Network:${NC}          $CLUSTER_NETWORK"
    echo -e "  ${CYAN}Subnet:${NC}           $CLUSTER_SUBNET"
    echo -e "  ${CYAN}Namespace:${NC}        $CLUSTER_NAMESPACE"
    echo ""
    log_info "Node Pool Configuration:"
    echo -e "  ${CYAN}Machine Type:${NC}     $NODE_MACHINE_TYPE"
    echo -e "  ${CYAN}Disk Size:${NC}        ${NODE_DISK_SIZE}GB"
    echo -e "  ${CYAN}Initial Nodes:${NC}    $NODE_INITIAL_COUNT"
    echo -e "  ${CYAN}Min Nodes:${NC}        $NODE_MIN_COUNT"
    echo -e "  ${CYAN}Max Nodes:${NC}        $NODE_MAX_COUNT"
    echo -e "  ${CYAN}Preemptible:${NC}      $NODE_PREEMPTIBLE"
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

    # Verify project access
    verify_project_access "$CLUSTER_PROJECT_ID" || exit 1

    log_success "GCP project configured"
}

# Check if cluster already exists (idempotency)
check_cluster_exists() {
    log_step "Checking if cluster already exists"

    if cluster_exists_gcp "$CLUSTER_NAME" "$CLUSTER_ZONE"; then
        log_warning "Cluster '$CLUSTER_NAME' already exists in zone '$CLUSTER_ZONE'"

        local status
        status=$(gcloud container clusters describe "$CLUSTER_NAME" \
            --zone="$CLUSTER_ZONE" \
            --format="value(status)" 2>/dev/null)

        log_info "Cluster status: $status"

        if [[ "$status" == "RUNNING" ]]; then
            log_success "Cluster is already running"

            # Configure kubectl
            configure_kubectl_context "$CLUSTER_NAME" "$CLUSTER_ZONE" "$CLUSTER_PROJECT_ID"

            # Ensure namespace exists
            create_namespace_if_not_exists "$CLUSTER_NAMESPACE"

            # Display cluster info
            display_cluster_info "$CLUSTER_NAME" "$CLUSTER_ZONE" "$CLUSTER_PROJECT_ID"

            log_success "Cluster setup complete (already existed)"
            exit 0
        else
            log_warning "Cluster exists but is not running (status: $status)"
            log_info "Waiting for cluster to become ready..."
        fi
    else
        log_info "Cluster does not exist, proceeding with creation"
    fi
}

# Create GKE cluster
create_cluster() {
    log_step "Creating GKE cluster"

    log_info "Creating cluster: $CLUSTER_NAME"
    log_warning "This may take 5-10 minutes..."

    # Build gcloud command
    local preemptible_flag=""
    if [[ "$NODE_PREEMPTIBLE" == "true" ]]; then
        preemptible_flag="--preemptible"
    fi

    # Determine network and subnet flags
    local network_flag="--network=$CLUSTER_NETWORK"
    local subnet_flag=""
    if [[ "$CLUSTER_SUBNET" != "default" ]]; then
        subnet_flag="--subnetwork=$CLUSTER_SUBNET"
    fi

    # Create cluster
    gcloud container clusters create "$CLUSTER_NAME" \
        --zone="$CLUSTER_ZONE" \
        --machine-type="$NODE_MACHINE_TYPE" \
        --disk-size="$NODE_DISK_SIZE" \
        --num-nodes="$NODE_INITIAL_COUNT" \
        --enable-autoscaling \
        --min-nodes="$NODE_MIN_COUNT" \
        --max-nodes="$NODE_MAX_COUNT" \
        $network_flag \
        $subnet_flag \
        --enable-ip-alias \
        --enable-cloud-logging \
        --enable-cloud-monitoring \
        --enable-autorepair \
        --enable-autoupgrade \
        --maintenance-window-start="2023-01-01T03:00:00Z" \
        --maintenance-window-duration="4h" \
        --release-channel="stable" \
        --addons=HorizontalPodAutoscaling,HttpLoadBalancing \
        --service-account="$NODE_SERVICE_ACCOUNT" \
        --scopes="https://www.googleapis.com/auth/cloud-platform" \
        --labels="environment=production,project=noclue,managed-by=script" \
        $preemptible_flag

    log_success "Cluster created successfully"
}

# Configure kubectl
configure_kubectl_for_cluster() {
    log_step "Configuring kubectl"

    log_info "Getting cluster credentials..."

    gcloud container clusters get-credentials "$CLUSTER_NAME" \
        --zone="$CLUSTER_ZONE" \
        --project="$CLUSTER_PROJECT_ID"

    log_success "kubectl configured"

    # Verify connection
    log_info "Verifying cluster connection..."

    if kubectl cluster-info &> /dev/null; then
        log_success "Successfully connected to cluster"

        local context
        context=$(kubectl config current-context)
        log_info "Current context: $context"
    else
        log_error "Failed to connect to cluster"
        exit 1
    fi
}

# Create namespace
create_application_namespace() {
    log_step "Creating application namespace"

    if kubectl get namespace "$CLUSTER_NAMESPACE" &> /dev/null; then
        log_warning "Namespace '$CLUSTER_NAMESPACE' already exists"
    else
        log_info "Creating namespace: $CLUSTER_NAMESPACE"

        kubectl create namespace "$CLUSTER_NAMESPACE"

        # Label the namespace
        kubectl label namespace "$CLUSTER_NAMESPACE" \
            project=noclue \
            environment=production \
            managed-by=script

        log_success "Namespace '$CLUSTER_NAMESPACE' created"
    fi

    # Set as default namespace
    kubectl config set-context --current --namespace="$CLUSTER_NAMESPACE"
    log_info "Default namespace set to: $CLUSTER_NAMESPACE"
}

# Display cluster information
display_setup_summary() {
    print_header "Cluster Setup Complete"

    # Display cluster details
    gcloud container clusters describe "$CLUSTER_NAME" \
        --zone="$CLUSTER_ZONE" \
        --format="table(
            name,
            location,
            currentMasterVersion:label=VERSION,
            currentNodeCount:label=NODES,
            status
        )"

    echo ""
    log_info "Cluster endpoint:"
    gcloud container clusters describe "$CLUSTER_NAME" \
        --zone="$CLUSTER_ZONE" \
        --format="value(endpoint)"

    echo ""
    log_info "Current kubectl context:"
    kubectl config current-context

    echo ""
    log_info "Namespaces:"
    kubectl get namespaces

    echo ""
    print_summary "Setup Summary"

    echo -e "${GREEN}Cluster Details:${NC}"
    echo -e "  Project:     $CLUSTER_PROJECT_ID"
    echo -e "  Cluster:     $CLUSTER_NAME"
    echo -e "  Zone:        $CLUSTER_ZONE"
    echo -e "  Namespace:   $CLUSTER_NAMESPACE"
    echo ""

    echo -e "${GREEN}Next Steps:${NC}"
    echo -e "  1. Deploy your applications:"
    echo -e "     ${CYAN}kubectl apply -f k8s/${NC}"
    echo ""
    echo -e "  2. Check cluster health:"
    echo -e "     ${CYAN}./scripts/health-check.sh${NC}"
    echo ""
    echo -e "  3. View cluster info:"
    echo -e "     ${CYAN}kubectl cluster-info${NC}"
    echo -e "     ${CYAN}kubectl get nodes${NC}"
    echo -e "     ${CYAN}kubectl get pods -n $CLUSTER_NAMESPACE${NC}"
    echo ""

    log_success "GKE cluster setup completed successfully!"
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    print_header "GKE Cluster Setup - NoClue Project"

    # Step 1: Validate prerequisites
    validate_prerequisites

    # Step 2: Load configuration
    load_configuration

    # Step 3: Set GCP project
    set_gcp_project

    # Step 4: Check if cluster exists (idempotent)
    check_cluster_exists

    # Step 5: Create cluster
    create_cluster

    # Step 6: Wait for cluster to be ready
    log_info "Waiting for cluster to stabilize..."
    sleep 30

    # Step 7: Configure kubectl
    configure_kubectl_for_cluster

    # Step 8: Create namespace
    create_application_namespace

    # Step 9: Display summary
    display_setup_summary
}

# Run main function
main "$@"
