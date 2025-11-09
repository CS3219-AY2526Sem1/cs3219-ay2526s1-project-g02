#!/bin/bash
#
# SSL/HTTPS Setup Script for NoClue Platform
# This script sets up HTTPS for the GKE cluster
#
# Usage:
#   ./scripts/setup-ssl.sh [OPTIONS]
#
# Options:
#   --domain DOMAIN    Use domain name with Google-managed certificate
#   --self-signed      Use self-signed certificate (for IP-based access)
#   --ip IP_ADDRESS    Specify the LoadBalancer IP address
#   --help             Show this help message
#

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
NAMESPACE="${NAMESPACE:-noclue-app}"
CERT_NAME="noclue-tls-secret"
USE_SELF_SIGNED=false
DOMAIN=""
LOAD_BALANCER_IP=""

# Print colored output
log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✓ ${NC}$1"
}

log_warning() {
    echo -e "${YELLOW}⚠ ${NC}$1"
}

log_error() {
    echo -e "${RED}✗ ${NC}$1"
}

log_step() {
    echo ""
    echo -e "${BLUE}==>${NC} $1"
    echo ""
}

# Show help
show_help() {
    cat << EOF
SSL/HTTPS Setup Script for NoClue Platform

Usage: $0 [OPTIONS]

Options:
    --domain DOMAIN       Use domain name with Google-managed certificate
                         (e.g., --domain noclue.yourdomain.com)
    
    --self-signed        Use self-signed certificate (for IP-based access)
                         This is useful for development or when you don't have a domain
    
    --ip IP_ADDRESS      Specify the LoadBalancer IP address (required for self-signed)
    
    --namespace NS       Kubernetes namespace (default: noclue-app)
    
    --help              Show this help message

Examples:
    # Setup with domain name (recommended for production)
    $0 --domain noclue.yourdomain.com

    # Setup with self-signed certificate using IP
    $0 --self-signed --ip 34.135.186.244

    # Get LoadBalancer IP automatically
    $0 --self-signed

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --self-signed)
            USE_SELF_SIGNED=true
            shift
            ;;
        --ip)
            LOAD_BALANCER_IP="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate options
if [[ -z "$DOMAIN" ]] && [[ "$USE_SELF_SIGNED" != "true" ]]; then
    log_error "Either --domain or --self-signed must be specified"
    show_help
    exit 1
fi

# Main execution
log_step "SSL/HTTPS Setup for NoClue Platform"

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    log_error "kubectl is not configured or cluster is not accessible"
    exit 1
fi

log_success "kubectl is configured"

# Check if namespace exists
if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
    log_error "Namespace $NAMESPACE does not exist"
    exit 1
fi

log_success "Namespace $NAMESPACE exists"

# Setup based on certificate type
if [[ "$USE_SELF_SIGNED" == "true" ]]; then
    log_step "Setting up self-signed certificate"
    
    # Get LoadBalancer IP if not provided
    if [[ -z "$LOAD_BALANCER_IP" ]]; then
        log_info "Getting LoadBalancer IP from frontend-service..."
        LOAD_BALANCER_IP=$(kubectl get service frontend-service -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
        
        if [[ -z "$LOAD_BALANCER_IP" ]]; then
            log_error "Could not get LoadBalancer IP. Please specify with --ip option"
            exit 1
        fi
    fi
    
    log_info "Using IP address: $LOAD_BALANCER_IP"
    
    # Generate self-signed certificate
    log_info "Generating self-signed certificate..."
    
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    # Create OpenSSL config
    cat > openssl.cnf << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C = US
ST = State
L = City
O = NoClue
OU = Development
CN = $LOAD_BALANCER_IP

[v3_req]
subjectAltName = @alt_names

[alt_names]
IP.1 = $LOAD_BALANCER_IP
EOF
    
    # Generate private key and certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout tls.key \
        -out tls.crt \
        -config openssl.cnf
    
    log_success "Certificate generated"
    
    # Create Kubernetes secret
    log_info "Creating Kubernetes secret..."
    kubectl create secret tls "$CERT_NAME" \
        --cert=tls.crt \
        --key=tls.key \
        -n "$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log_success "TLS secret created: $CERT_NAME"
    
    # Cleanup
    cd - > /dev/null
    rm -rf "$TEMP_DIR"
    
    log_warning "Self-signed certificate is being used. Browsers will show security warnings."
    log_info "This is normal and expected. Click 'Advanced' and proceed to continue."
    
else
    log_step "Setting up Google-managed certificate with domain: $DOMAIN"
    
    # Update managed certificate with actual domain
    log_info "Creating ManagedCertificate resource..."
    
    cat <<EOF | kubectl apply -f -
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: noclue-ssl-cert
  namespace: $NAMESPACE
spec:
  domains:
    - $DOMAIN
EOF
    
    log_success "ManagedCertificate created"
    log_warning "Google-managed certificate can take 10-15 minutes to provision"
    log_info "Make sure your domain's DNS A record points to the LoadBalancer IP"
fi

# Apply frontend config for HTTP to HTTPS redirect
log_step "Applying FrontendConfig for HTTP to HTTPS redirect"

kubectl apply -f k8s/frontend-config.yaml

log_success "FrontendConfig applied"

# Apply or update ingress
log_step "Updating Ingress configuration"

kubectl apply -f k8s/ingress.yaml

log_success "Ingress updated"

# Show status
log_step "SSL Setup Complete!"

if [[ "$USE_SELF_SIGNED" == "true" ]]; then
    echo ""
    log_info "Access your application at: https://$LOAD_BALANCER_IP"
    log_warning "Your browser will show a security warning for self-signed certificates"
    log_info "This is expected and safe for development/testing"
    echo ""
    log_info "To avoid warnings in production, use a domain with Google-managed certificate:"
    log_info "  $0 --domain yourdomain.com"
else
    echo ""
    log_info "Google-managed certificate is being provisioned for: $DOMAIN"
    log_info "This can take 10-15 minutes. Check status with:"
    echo ""
    echo "  kubectl describe managedcertificate noclue-ssl-cert -n $NAMESPACE"
    echo ""
    log_info "Once provisioned, your site will be accessible at: https://$DOMAIN"
fi

echo ""
log_info "Check ingress status:"
echo "  kubectl get ingress noclue-ingress -n $NAMESPACE"
echo ""
log_info "Check certificate status:"
echo "  kubectl get secret $CERT_NAME -n $NAMESPACE"
echo ""

log_success "Setup complete!"

