#!/bin/bash

# Utility functions for deployment scripts
# Source this file in other scripts: source "$(dirname "$0")/utils.sh"

# Bash strict mode: exit on error, undefined variables, and pipe failures
set -euo pipefail

# Colors for output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export CYAN='\033[0;36m'
export NC='\033[0m' # No Color

# =============================================================================
# LOGGING FUNCTIONS
# =============================================================================

# Get current timestamp in ISO 8601 format
get_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Logging functions with timestamps
log_info() {
    echo -e "${BLUE}[$(get_timestamp)] INFO:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(get_timestamp)] SUCCESS:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(get_timestamp)] WARNING:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(get_timestamp)] ERROR:${NC} $1" >&2
}

log_step() {
    echo -e "\n${CYAN}==>${NC} ${YELLOW}$1${NC}\n"
}

# Check if a command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Check if kubectl is installed and configured
check_kubectl() {
    if ! command_exists kubectl; then
        log_error "kubectl is not installed"
        log_info "Install kubectl: https://kubernetes.io/docs/tasks/tools/"
        exit 1
    fi
    log_success "kubectl is installed"
}

# Check if gcloud is installed (optional)
check_gcloud() {
    if ! command_exists gcloud; then
        log_warning "gcloud is not installed (optional for GKE)"
        return 1
    fi
    log_success "gcloud is installed"
    return 0
}

# Check if cluster is accessible
check_cluster() {
    log_step "Checking cluster accessibility..."

    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        log_info "Run: kubectl config current-context"
        log_info "For GKE, run: gcloud container clusters get-credentials CLUSTER_NAME --zone ZONE --project PROJECT_ID"
        exit 1
    fi

    local context=$(kubectl config current-context)
    log_success "Connected to cluster: ${context}"
}

# Check if namespace exists, create if it doesn't
ensure_namespace() {
    local namespace=$1

    if kubectl get namespace "$namespace" &> /dev/null; then
        log_info "Namespace '$namespace' already exists"
    else
        log_info "Creating namespace '$namespace'..."
        kubectl create namespace "$namespace"
        log_success "Namespace '$namespace' created"
    fi
}

# Wait for deployment to be ready
wait_for_deployment() {
    local deployment=$1
    local namespace=$2
    local timeout=${3:-300}  # Default 5 minutes

    log_info "Waiting for deployment '$deployment' to be ready (timeout: ${timeout}s)..."

    if kubectl rollout status deployment/"$deployment" -n "$namespace" --timeout="${timeout}s"; then
        log_success "Deployment '$deployment' is ready"
        return 0
    else
        log_error "Deployment '$deployment' failed to become ready within ${timeout}s"
        log_info "Check pod status: kubectl get pods -n $namespace -l app=$deployment"
        log_info "Check logs: kubectl logs -n $namespace deployment/$deployment --tail=50"
        return 1
    fi
}

# Check if a secret exists
secret_exists() {
    local secret=$1
    local namespace=$2

    kubectl get secret "$secret" -n "$namespace" &> /dev/null
}

# Create or update a secret from literal values
create_or_update_secret() {
    local secret_name=$1
    local namespace=$2
    shift 2
    local key_values=("$@")

    if secret_exists "$secret_name" "$namespace"; then
        log_info "Updating secret '$secret_name'..."
        kubectl delete secret "$secret_name" -n "$namespace"
    else
        log_info "Creating secret '$secret_name'..."
    fi

    kubectl create secret generic "$secret_name" -n "$namespace" "${key_values[@]}"
}

# Get service external IP or LoadBalancer URL
get_service_url() {
    local service=$1
    local namespace=$2
    local max_attempts=10
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        local external_ip=$(kubectl get service "$service" -n "$namespace" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
        local external_hostname=$(kubectl get service "$service" -n "$namespace" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)

        if [ -n "$external_ip" ]; then
            echo "http://${external_ip}"
            return 0
        elif [ -n "$external_hostname" ]; then
            echo "http://${external_hostname}"
            return 0
        fi

        if [ $attempt -eq 1 ]; then
            log_info "Waiting for external IP for service '$service'..."
        fi

        sleep 3
        ((attempt++))
    done

    # If no external IP, return ClusterIP service URL
    local cluster_ip=$(kubectl get service "$service" -n "$namespace" -o jsonpath='{.spec.clusterIP}' 2>/dev/null)
    local port=$(kubectl get service "$service" -n "$namespace" -o jsonpath='{.spec.ports[0].port}' 2>/dev/null)

    if [ -n "$cluster_ip" ] && [ -n "$port" ]; then
        echo "http://${cluster_ip}:${port} (ClusterIP - internal only)"
    else
        echo "Service not accessible"
    fi
}

# Check if a pod is healthy
check_pod_health() {
    local deployment=$1
    local namespace=$2
    local health_path=${3:-/health}

    log_info "Checking health for '$deployment'..."

    # Get first pod for the deployment
    local pod=$(kubectl get pods -n "$namespace" -l app="$deployment" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

    if [ -z "$pod" ]; then
        log_warning "No pods found for deployment '$deployment'"
        return 1
    fi

    # Check if pod is running and ready (via Kubernetes readiness probe)
    local pod_ready=$(kubectl get pod "$pod" -n "$namespace" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)

    if [ "$pod_ready" = "True" ]; then
        log_success "Health check passed for '$deployment' (pod is ready)"
        return 0
    fi

    # Fallback: Try to check with curl if available
    local port=$(kubectl get pod "$pod" -n "$namespace" -o jsonpath='{.spec.containers[0].ports[0].containerPort}' 2>/dev/null)

    if [ -z "$port" ]; then
        log_warning "Could not determine port for '$deployment', but pod readiness check failed"
        return 1
    fi

    # Check if curl is available in the container
    if kubectl exec "$pod" -n "$namespace" -- which curl &> /dev/null; then
        if kubectl exec "$pod" -n "$namespace" -- curl -sf "http://localhost:${port}${health_path}" &> /dev/null; then
            log_success "Health check passed for '$deployment'"
            return 0
        else
            log_warning "Health check failed for '$deployment' via curl"
            return 1
        fi
    else
        # curl not available, rely on readiness probe
        log_warning "curl not available in container, relying on Kubernetes readiness probe for '$deployment'"
        return 1
    fi
}

# Replace placeholder in file with actual value
replace_placeholder() {
    local file=$1
    local placeholder=$2
    local value=$3

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|${placeholder}|${value}|g" "$file"
    else
        # Linux
        sed -i "s|${placeholder}|${value}|g" "$file"
    fi
}

# Validate environment variable
require_env() {
    local var_name=$1
    local var_value="${!var_name}"

    if [ -z "$var_value" ]; then
        log_error "Required environment variable '$var_name' is not set"
        return 1
    fi
    return 0
}

# Print section header
print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

# Print summary section
print_summary() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  $1${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
}

# =============================================================================
# GCLOUD AUTHENTICATION AND PROJECT VALIDATION
# =============================================================================

# Check if gcloud CLI is installed and available
check_gcloud_installed() {
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed"
        log_error "Install from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    log_info "gcloud CLI is installed"
}

# Check if user is authenticated with gcloud
check_gcloud_auth() {
    log_info "Checking gcloud authentication status..."

    # Check if there's an active account
    local active_account
    active_account=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || echo "")

    if [[ -z "$active_account" ]]; then
        log_error "Not authenticated with gcloud"
        log_error "Run: gcloud auth login"
        return 1
    fi

    log_success "Authenticated as: ${active_account}"
    return 0
}

# Check if GCP project is set in gcloud config
check_project_set() {
    log_info "Checking if GCP project is configured..."

    local project_id
    project_id=$(gcloud config get-value project 2>/dev/null || echo "")

    if [[ -z "$project_id" ]] || [[ "$project_id" == "(unset)" ]]; then
        log_error "GCP project is not set"
        log_error "Run: gcloud config set project YOUR_PROJECT_ID"
        return 1
    fi

    log_success "GCP project set to: ${project_id}"
    return 0
}

# Verify that the specified project exists and is accessible
verify_project_access() {
    local project_id="$1"
    log_info "Verifying access to project: ${project_id}"

    if gcloud projects describe "$project_id" &>/dev/null; then
        log_success "Successfully verified access to project: ${project_id}"
        return 0
    else
        log_error "Cannot access project: ${project_id}"
        log_error "Check if the project exists and you have the necessary permissions"
        return 1
    fi
}

# =============================================================================
# GCP RESOURCE EXISTENCE CHECKS
# =============================================================================

# Check if a GCP resource exists
# Arguments:
#   $1 - Resource type (e.g., "compute", "container", "iam")
#   $2 - Resource subtype (e.g., "instances", "clusters", "service-accounts")
#   $3 - Resource name
#   $4 - (Optional) Additional flags (e.g., "--zone=us-central1-a", "--region=us-central1")
resource_exists() {
    local resource_type="$1"
    local resource_subtype="$2"
    local resource_name="$3"
    local additional_flags="${4:-}"

    log_info "Checking if ${resource_type} ${resource_subtype} '${resource_name}' exists..."

    local command="gcloud ${resource_type} ${resource_subtype} describe ${resource_name}"

    if [[ -n "$additional_flags" ]]; then
        command="${command} ${additional_flags}"
    fi

    if eval "$command" &>/dev/null; then
        log_info "Resource '${resource_name}' exists"
        return 0
    else
        log_info "Resource '${resource_name}' does not exist"
        return 1
    fi
}

# Check if a GKE cluster exists
cluster_exists_gcp() {
    local cluster_name="$1"
    local location="$2"

    # Determine if location is a region or zone
    local location_flag
    if [[ "$location" =~ -[a-z]$ ]]; then
        location_flag="--zone=$location"
    else
        location_flag="--region=$location"
    fi

    resource_exists "container" "clusters" "$cluster_name" "$location_flag"
}

# Check if a service account exists
service_account_exists() {
    local sa_email="$1"

    log_info "Checking if service account '${sa_email}' exists..."

    if gcloud iam service-accounts describe "$sa_email" &>/dev/null; then
        log_info "Service account '${sa_email}' exists"
        return 0
    else
        log_info "Service account '${sa_email}' does not exist"
        return 1
    fi
}

# =============================================================================
# YAML PARSING FUNCTIONS
# =============================================================================

# Parse YAML file and extract value for a given key path
# This function uses yq or Python's PyYAML library for robust YAML parsing
# Arguments:
#   $1 - Path to YAML file
#   $2 - Key path using dot notation (e.g., "cluster.name" or "project_id")
# Example: PROJECT_ID=$(parse_yaml "config/cluster.yaml" "project_id")
parse_yaml() {
    local yaml_file="$1"
    local key_path="$2"

    if [[ ! -f "$yaml_file" ]]; then
        log_error "YAML file not found: ${yaml_file}"
        return 1
    fi

    # Check if yq is available (preferred method)
    if command -v yq &> /dev/null; then
        local yq_path=".${key_path}"
        yq eval "$yq_path" "$yaml_file" 2>/dev/null || echo ""
    # Fallback to Python if yq is not available
    elif command -v python3 &> /dev/null; then
        python3 -c "
import sys
import yaml

try:
    with open('${yaml_file}', 'r') as f:
        data = yaml.safe_load(f)

    # Navigate through nested keys
    keys = '${key_path}'.split('.')
    value = data
    for key in keys:
        if isinstance(value, dict) and key in value:
            value = value[key]
        else:
            sys.exit(1)

    print(value)
except Exception:
    sys.exit(1)
" 2>/dev/null || echo ""
    else
        log_error "Neither 'yq' nor 'python3' is available for YAML parsing"
        log_error "Install yq: https://github.com/mikefarah/yq"
        log_error "Or install Python 3 with PyYAML: pip3 install pyyaml"
        return 1
    fi
}

# Validate that a YAML file exists and is readable
validate_yaml_file() {
    local yaml_file="$1"

    log_info "Validating YAML file: ${yaml_file}"

    if [[ ! -f "$yaml_file" ]]; then
        log_error "YAML file not found: ${yaml_file}"
        return 1
    fi

    if [[ ! -r "$yaml_file" ]]; then
        log_error "YAML file is not readable: ${yaml_file}"
        return 1
    fi

    # Try to parse the file to ensure it's valid YAML
    if command -v yq &> /dev/null; then
        if ! yq eval '.' "$yaml_file" &>/dev/null; then
            log_error "Invalid YAML syntax in file: ${yaml_file}"
            return 1
        fi
    elif command -v python3 &> /dev/null; then
        if ! python3 -c "import yaml; yaml.safe_load(open('${yaml_file}'))" &>/dev/null; then
            log_error "Invalid YAML syntax in file: ${yaml_file}"
            return 1
        fi
    fi

    log_success "YAML file is valid: ${yaml_file}"
    return 0
}

# =============================================================================
# USER CONFIRMATION FUNCTIONS
# =============================================================================

# Prompt user for confirmation before executing a destructive action
# Arguments:
#   $1 - Action description (what will be done)
#   $2 - (Optional) Default answer: "y" or "n" (default: "n")
# Example: confirm_action "Delete the cluster" || exit 0
confirm_action() {
    local action="$1"
    local default="${2:-n}"

    local prompt
    if [[ "$default" == "y" ]]; then
        prompt="${YELLOW}${action} (Y/n):${NC} "
    else
        prompt="${YELLOW}${action} (y/N):${NC} "
    fi

    echo -en "$prompt"
    read -r response

    # Use default if response is empty
    if [[ -z "$response" ]]; then
        response="$default"
    fi

    # Convert to lowercase
    response=$(echo "$response" | tr '[:upper:]' '[:lower:]')

    if [[ "$response" == "y" || "$response" == "yes" ]]; then
        log_info "Action confirmed"
        return 0
    else
        log_warning "Action cancelled by user"
        return 1
    fi
}

# Require explicit confirmation with exact phrase match
# This is for extremely destructive actions (like deleting production resources)
# Arguments:
#   $1 - Resource name that will be affected
#   $2 - Action type (e.g., "delete", "destroy")
# Example: require_confirmation "production-cluster" "delete" || exit 1
require_confirmation() {
    local resource_name="$1"
    local action_type="$2"
    local confirmation_phrase="${action_type} ${resource_name}"

    log_warning "==================================================================="
    log_warning "DESTRUCTIVE ACTION: You are about to ${action_type} '${resource_name}'"
    log_warning "This action cannot be undone!"
    log_warning "==================================================================="

    echo -en "${RED}Type '${confirmation_phrase}' to confirm: ${NC}"
    read -r response

    if [[ "$response" == "$confirmation_phrase" ]]; then
        log_warning "Destructive action confirmed"
        return 0
    else
        log_error "Confirmation failed. Expected: '${confirmation_phrase}'"
        log_error "Received: '${response}'"
        return 1
    fi
}

# =============================================================================
# ADDITIONAL HELPER FUNCTIONS
# =============================================================================

# Wait for a specified number of seconds with a progress indicator
wait_with_progress() {
    local seconds="$1"
    local message="${2:-Waiting}"

    log_info "${message} (${seconds}s)..."

    for ((i=1; i<=seconds; i++)); do
        echo -n "."
        sleep 1
    done
    echo ""

    log_success "Wait complete"
}

# Check if a required command/binary is available
require_command() {
    local command_name="$1"
    local install_instructions="${2:-}"

    if ! command -v "$command_name" &> /dev/null; then
        log_error "Required command '${command_name}' is not installed"
        if [[ -n "$install_instructions" ]]; then
            log_error "$install_instructions"
        fi
        exit 1
    fi
}

# Get the directory where the calling script is located
get_script_dir() {
    local source="${BASH_SOURCE[0]}"
    while [ -h "$source" ]; do
        local dir
        dir="$( cd -P "$( dirname "$source" )" && pwd )"
        source="$(readlink "$source")"
        [[ $source != /* ]] && source="$dir/$source"
    done
    echo "$( cd -P "$( dirname "$source" )" && pwd )"
}

# Log that utils.sh has been loaded
log_info "Loaded utility functions from utils.sh"
