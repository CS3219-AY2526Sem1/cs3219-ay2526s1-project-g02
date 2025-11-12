#!/bin/bash

# Kubernetes Deployment Script for NoClue Services
# This script deploys all microservices to a Kubernetes cluster
# Usage: ./deploy-services.sh [--project-id PROJECT_ID]

# Exit on error
set -e
set -o pipefail

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
K8S_DIR="$PROJECT_ROOT/k8s"

# Source utility functions
source "$SCRIPT_DIR/utils.sh"

# Configuration
NAMESPACE="noclue-app"
PROJECT_ID="${GCP_PROJECT_ID:-}"
CLUSTER_NAME="${CLUSTER_NAME:-noclue-cluster}"
ZONE="${ZONE:-us-central1-a}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project-id)
            PROJECT_ID="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --cluster-name)
            CLUSTER_NAME="$2"
            shift 2
            ;;
        --zone)
            ZONE="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --project-id ID      GCP Project ID (or set GCP_PROJECT_ID env var)"
            echo "  --namespace NS       Kubernetes namespace (default: noclue-app)"
            echo "  --cluster-name NAME  GKE cluster name (default: noclue-cluster)"
            echo "  --zone ZONE          GCP zone (default: us-central1-a)"
            echo "  --help               Show this help message"
            echo ""
            echo "Environment Variables for Secrets:"
            echo "  SUPABASE_URL                   Supabase project URL"
            echo "  SUPABASE_SECRET_KEY            Supabase secret key (for backend)"
            echo "  SUPABASE_PUBLISHABLE_KEY       Supabase publishable key (for frontend)"
            echo ""
            echo "Example:"
            echo "  export SUPABASE_URL='https://xxx.supabase.co'"
            echo "  export SUPABASE_SECRET_KEY='sb_secret_xxx'"
            echo "  export SUPABASE_PUBLISHABLE_KEY='sb_publishable_xxx'"
            echo "  ./deploy-services.sh --project-id my-project"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Run '$0 --help' for usage information"
            exit 1
            ;;
    esac
done

# Main deployment function
main() {
    print_header "NoClue Kubernetes Deployment"

    # Step 1: Prerequisites check
    log_step "Step 1: Checking prerequisites..."
    check_kubectl
    check_gcloud

    # Step 2: Check cluster connectivity
    log_step "Step 2: Checking cluster connectivity..."
    check_cluster

    # Step 3: Ensure namespace exists
    log_step "Step 3: Ensuring namespace exists..."
    ensure_namespace "$NAMESPACE"

    # Step 4: Create/Update secrets
    log_step "Step 4: Creating/Updating Kubernetes secrets..."
    create_secrets

    # Step 5: Verify Pub/Sub Configuration
    log_step "Step 5: Verifying Pub/Sub configuration..."
    verify_pubsub_config

    # Step 6: Apply ConfigMaps
    log_step "Step 6: Applying ConfigMaps..."
    apply_configmaps

    # Step 7: Apply Services
    log_step "Step 7: Applying Kubernetes Services..."
    apply_services

    # Step 8: Apply Deployments
    log_step "Step 8: Deploying microservices..."
    deploy_services

    # Step 9: Restart deployments to pull latest images
    log_step "Step 9: Restarting deployments to pull latest images..."
    restart_deployments

    # Step 10: Wait for deployments to be ready
    log_step "Step 10: Waiting for deployments to be ready..."
    wait_for_deployments

    # Step 11: Display service URLs
    log_step "Step 11: Getting service URLs..."
    display_service_urls

    # Final summary
    print_deployment_summary
}

# Create Kubernetes secrets from environment variables
create_secrets() {
    log_info "Creating secrets from environment variables..."

    # Check if environment variables are set
    local use_env_vars=false
    if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SECRET_KEY" ] && [ -n "$SUPABASE_PUBLISHABLE_KEY" ]; then
        use_env_vars=true
        log_success "Using Supabase credentials from environment variables"
    fi

    if [ "$use_env_vars" = true ]; then
        # Build secret creation command
        local secret_args=(
            --from-literal=SUPABASE_URL="$SUPABASE_URL"
            --from-literal=SUPABASE_SECRET_KEY="$SUPABASE_SECRET_KEY"
            --from-literal=SUPABASE_PUBLISHABLE_KEY="$SUPABASE_PUBLISHABLE_KEY"
        )
        
        # Add OpenAI API key if provided
        if [ -n "$OPENAI_API_KEY" ]; then
            secret_args+=(--from-literal=OPENAI_API_KEY="$OPENAI_API_KEY")
            log_info "Including OpenAI API key in secrets"
        else
            log_warning "OPENAI_API_KEY not set - LLM service may not work"
        fi
        
        # Create supabase-secrets from environment variables
        create_or_update_secret "supabase-secrets" "$NAMESPACE" "${secret_args[@]}"

        log_success "Created/Updated 'supabase-secrets' secret"
    else
        # Check if secrets.yaml exists and apply it
        if [ -f "$K8S_DIR/secrets.yaml" ]; then
            log_warning "No environment variables set. Using secrets.yaml"
            log_warning "Make sure secrets.yaml contains valid credentials (not REPLACE_IN_CICD placeholders)"

            # Check if secrets.yaml contains placeholders
            if grep -q "REPLACE_IN_CICD" "$K8S_DIR/secrets.yaml"; then
                log_error "secrets.yaml contains REPLACE_IN_CICD placeholders"
                log_info "Either:"
                log_info "  1. Set environment variables: SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY"
                log_info "  2. Edit $K8S_DIR/secrets.yaml with actual values"
                exit 1
            fi

            kubectl apply -f "$K8S_DIR/secrets.yaml"
            log_success "Applied secrets from secrets.yaml"
        else
            log_error "No secrets found!"
            log_info "Either:"
            log_info "  1. Set environment variables: SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY"
            log_info "  2. Create $K8S_DIR/secrets.yaml"
            exit 1
        fi
    fi
}

# Apply ConfigMaps
apply_configmaps() {
    log_info "Applying ConfigMaps..."
    
    local configmaps=(
        "frontend-url-configmap.yaml"
        "backend-urls-configmap.yaml"
    )
    
    for configmap_file in "${configmaps[@]}"; do
        local configmap_path="$K8S_DIR/$configmap_file"
        if [ -f "$configmap_path" ]; then
            log_info "Applying ConfigMap: $configmap_file"
            kubectl apply -f "$configmap_path"
            log_success "Applied $configmap_file"
        else
            log_warning "ConfigMap file not found: $configmap_path"
        fi
    done
    
    log_success "ConfigMaps applied"
}

# Verify Pub/Sub configuration
verify_pubsub_config() {
    log_info "Checking Pub/Sub configuration..."
    
    local config_ok=true
    
    # Check if pubsub-key secret exists
    if kubectl get secret pubsub-key -n "$NAMESPACE" &>/dev/null; then
        log_success "✓ Pub/Sub secret 'pubsub-key' exists"
    else
        log_warning "⚠️  Pub/Sub secret 'pubsub-key' not found"
        log_info "   Run: ./scripts/setup-pubsub-auth.sh"
        config_ok=false
    fi
    
    # Check if pubsub-config configmap exists
    if kubectl get configmap pubsub-config -n "$NAMESPACE" &>/dev/null; then
        log_success "✓ Pub/Sub ConfigMap 'pubsub-config' exists"
        
        # Verify GCP_PROJECT_ID is set
        local project_id=$(kubectl get configmap pubsub-config -n "$NAMESPACE" -o jsonpath='{.data.GCP_PROJECT_ID}' 2>/dev/null || echo "")
        if [ -n "$project_id" ]; then
            log_success "✓ GCP_PROJECT_ID configured: $project_id"
        else
            log_warning "⚠️  GCP_PROJECT_ID not set in pubsub-config"
            config_ok=false
        fi
    else
        log_warning "⚠️  Pub/Sub ConfigMap 'pubsub-config' not found"
        log_info "   Run: ./scripts/setup-pubsub-auth.sh"
        config_ok=false
    fi
    
    # Check if Pub/Sub topics exist (if gcloud is available)
    if command -v gcloud &> /dev/null && [ -n "${GCP_PROJECT_ID}" ]; then
        log_info "Checking Pub/Sub topics..."
        
        local topics=("matching-queue" "question-queue" "session-queue")
        local topics_ok=true
        
        for topic in "${topics[@]}"; do
            if gcloud pubsub topics describe "$topic" --project="${GCP_PROJECT_ID}" &>/dev/null; then
                log_success "✓ Topic '$topic' exists"
            else
                log_warning "⚠️  Topic '$topic' not found"
                topics_ok=false
            fi
        done
        
        if [ "$topics_ok" = false ]; then
            log_info "   Run: npm run setup:pubsub"
        fi
    else
        log_info "Skipping Pub/Sub topics check (gcloud not available or GCP_PROJECT_ID not set)"
    fi
    
    if [ "$config_ok" = false ]; then
        log_warning "⚠️  Pub/Sub configuration incomplete"
        log_info "Services may fail to publish/subscribe to Pub/Sub"
        log_info ""
        log_info "To fix:"
        log_info "  1. Run: GCP_PROJECT_ID=your-project ./scripts/setup-pubsub-auth.sh"
        log_info "  2. Run: npm run setup:pubsub"
        log_info ""
        
        # In CI/CD environment, continue anyway
        if [ -n "${CI}" ] || [ -n "${GITHUB_ACTIONS}" ]; then
            log_warning "Running in CI/CD - continuing deployment"
        else
            read -p "Continue deployment anyway? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_error "Deployment cancelled by user"
                exit 1
            fi
        fi
    else
        log_success "Pub/Sub configuration verified ✓"
    fi
}

# Prepare deployment manifests (replace PROJECT_ID placeholder)
# prepare_manifests() {
#     if [ -z "$PROJECT_ID" ]; then
#         log_warning "PROJECT_ID not set. Manifests will use 'PROJECT_ID' placeholder"
#         log_info "Set PROJECT_ID with: export GCP_PROJECT_ID='your-project-id'"
#         log_info "Or use: ./deploy-services.sh --project-id your-project-id"
#         log_warning "Continuing with placeholder - this will work if images are already tagged correctly"
#     else
#         log_info "Using PROJECT_ID: $PROJECT_ID"

#         # Create temporary directory for modified manifests
#         TEMP_DIR=$(mktemp -d)
#         trap "rm -rf $TEMP_DIR" EXIT

#         # Copy manifests and replace PROJECT_ID
#         for file in "$K8S_DIR"/*-deployment.yaml; do
#             if [ -f "$file" ]; then
#                 filename=$(basename "$file")
#                 cp "$file" "$TEMP_DIR/$filename"
#                 replace_placeholder "$TEMP_DIR/$filename" "PROJECT_ID" "$PROJECT_ID"
#                 log_info "Prepared manifest: $filename"
#             fi
#         done

#         # Update K8S_DIR to point to temp directory
#         K8S_DIR="$TEMP_DIR"
#     fi
# }

# Apply Kubernetes Services
apply_services() {
    local services=(
        "user-service-service.yaml"
        "question-service-service.yaml"
        "matching-service-service.yaml"
        "collaboration-service-service.yaml"
        "frontend-service.yaml"
    )

    for service_file in "${services[@]}"; do
        local service_path="$PROJECT_ROOT/k8s/$service_file"
        if [ -f "$service_path" ]; then
            log_info "Applying service: $service_file"
            kubectl apply -f "$service_path"
            log_success "Applied $service_file"
        else
            log_warning "Service file not found: $service_path"
        fi
    done
}

# Deploy microservices in order
deploy_services() {
    # Deployment order matters: backend services first, then frontend
    local deployments=(
        "user-service"
        "question-service"
        "matching-service"
        "collaboration-service"
        "frontend"
    )

    for deployment in "${deployments[@]}"; do
        local deployment_file="$K8S_DIR/${deployment}-deployment.yaml"
        local fallback_file="$PROJECT_ROOT/k8s/${deployment}-deployment.yaml"

        # Use temp dir file if it exists, otherwise use original
        if [ -f "$deployment_file" ]; then
            log_info "Deploying: $deployment"
            kubectl apply -f "$deployment_file"
        elif [ -f "$fallback_file" ]; then
            log_info "Deploying: $deployment"
            kubectl apply -f "$fallback_file"
        else
            log_warning "Deployment file not found: ${deployment}-deployment.yaml"
            continue
        fi

        log_success "Applied deployment for $deployment"

        # Small delay between deployments to avoid overwhelming the cluster
        sleep 2
    done
}

# Restart deployments to pull latest images
restart_deployments() {
    # Deployment order matches deploy_services
    local deployments=(
        "user-service"
        "question-service"
        "matching-service"
        "collaboration-service"
        "frontend"
    )

    for deployment in "${deployments[@]}"; do
        # Check if deployment exists
        if ! kubectl get deployment "$deployment" -n "$NAMESPACE" &> /dev/null; then
            log_warning "Deployment '$deployment' not found, skipping restart..."
            continue
        fi

        log_info "Restarting deployment: $deployment"
        kubectl rollout restart deployment/"$deployment" -n "$NAMESPACE"
        log_success "Triggered restart for $deployment"
    done

    log_success "All deployments restarted to pull latest images"
}

# Wait for all deployments to be ready
wait_for_deployments() {
    local deployments=(
        "user-service"
        "question-service"
        "matching-service"
        "collaboration-service"
        "frontend"
    )

    local all_ready=true

    for deployment in "${deployments[@]}"; do
        # Check if deployment exists
        if ! kubectl get deployment "$deployment" -n "$NAMESPACE" &> /dev/null; then
            log_warning "Deployment '$deployment' not found, skipping..."
            continue
        fi

        if ! wait_for_deployment "$deployment" "$NAMESPACE" 300; then
            all_ready=false
            log_error "Deployment '$deployment' failed to become ready"

            # Show pod status for debugging
            log_info "Pod status for $deployment:"
            kubectl get pods -n "$NAMESPACE" -l app="$deployment"

            log_info "Recent events for $deployment:"
            kubectl get events -n "$NAMESPACE" --field-selector involvedObject.name="$deployment" --sort-by='.lastTimestamp' | tail -5
        fi
    done

    if [ "$all_ready" = false ]; then
        log_error "Some deployments failed to become ready"
        log_info "Check logs with: kubectl logs -n $NAMESPACE deployment/SERVICE_NAME"
        exit 1
    fi

    log_success "All deployments are ready!"
}

# Display service URLs
display_service_urls() {
    local services=(
        "user-service"
        "question-service"
        "matching-service"
        "collaboration-service"
        "frontend"
    )

    print_summary "Service URLs"

    for service in "${services[@]}"; do
        local service_name="${service}-service"
        # Frontend service has different naming
        if [ "$service" = "frontend" ]; then
            service_name="frontend-service"
        fi

        if kubectl get service "$service_name" -n "$NAMESPACE" &> /dev/null; then
            local url=$(get_service_url "$service_name" "$NAMESPACE")
            local service_type=$(kubectl get service "$service_name" -n "$NAMESPACE" -o jsonpath='{.spec.type}')

            echo -e "${GREEN}$service${NC}"
            echo "  Type: $service_type"
            echo "  URL:  $url"
            echo ""
        fi
    done

    # Show internal service URLs
    log_info "Internal service URLs (within cluster):"
    echo "  user-service:          http://user-service.${NAMESPACE}.svc.cluster.local:4001"
    echo "  question-service:      http://question-service.${NAMESPACE}.svc.cluster.local:4002"
    echo "  matching-service:      http://matching-service.${NAMESPACE}.svc.cluster.local:4003"
    echo "  collaboration-service: http://collaboration-service.${NAMESPACE}.svc.cluster.local:4004"
    echo ""
}

# Print deployment summary
print_deployment_summary() {
    print_summary "Deployment Complete!"

    log_success "All services deployed successfully to namespace: $NAMESPACE"
    echo ""
    log_info "Next steps:"
    echo "  1. Monitor pods:     kubectl get pods -n $NAMESPACE -w"
    echo "  2. View logs:        kubectl logs -n $NAMESPACE deployment/SERVICE_NAME -f"
    echo "  3. Port forward:     kubectl port-forward -n $NAMESPACE deployment/frontend 3000:3000"
    echo "  4. Check services:   kubectl get services -n $NAMESPACE"
    echo ""
    log_info "Useful commands:"
    echo "  Rollback:            kubectl rollout undo deployment/SERVICE_NAME -n $NAMESPACE"
    echo "  Scale:               kubectl scale deployment/SERVICE_NAME --replicas=3 -n $NAMESPACE"
    echo "  Restart:             kubectl rollout restart deployment/SERVICE_NAME -n $NAMESPACE"
    echo ""

    # Check if any services have external IPs
    local has_external_ip=false
    for service in user-service question-service matching-service collaboration-service frontend; do
        local service_name="${service}"
        if [ "$service" != "frontend" ]; then
            service_name="${service}-service"
        else
            service_name="frontend-service"
        fi

        if kubectl get service "$service_name" -n "$NAMESPACE" &> /dev/null; then
            local service_type=$(kubectl get service "$service_name" -n "$NAMESPACE" -o jsonpath='{.spec.type}')
            if [ "$service_type" = "LoadBalancer" ]; then
                has_external_ip=true
                break
            fi
        fi
    done

    if [ "$has_external_ip" = true ]; then
        log_warning "LoadBalancer services detected. These will incur costs (~\$18/month per LoadBalancer)"
        log_info "Consider using an Ingress controller for cost optimization"
    fi

    log_success "Deployment completed at: $(date)"
}

# Run main function
main
