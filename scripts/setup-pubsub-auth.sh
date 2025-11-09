#!/bin/bash

# Setup Pub/Sub Authentication for GKE
# This script creates a service account with Pub/Sub permissions for microservices

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Setting up Pub/Sub Authentication for GKE${NC}"
echo ""

# Check if GCP_PROJECT_ID is set
if [ -z "$GCP_PROJECT_ID" ]; then
    echo -e "${RED}❌ Error: GCP_PROJECT_ID environment variable is required${NC}"
    echo "Usage: GCP_PROJECT_ID=your-project-id $0"
    exit 1
fi

echo -e "${YELLOW}Project ID: ${GCP_PROJECT_ID}${NC}"
echo ""

# Service account details
SA_NAME="pubsub-service"
SA_EMAIL="${SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="./pubsub-service-key.json"

# Create service account
echo "📝 Creating service account: ${SA_NAME}"
if gcloud iam service-accounts describe ${SA_EMAIL} --project=${GCP_PROJECT_ID} &>/dev/null; then
    echo "   ℹ️  Service account already exists"
else
    gcloud iam service-accounts create ${SA_NAME} \
        --display-name="Pub/Sub Service Account for Microservices" \
        --project=${GCP_PROJECT_ID}
    echo "   ✅ Service account created"
fi

# Grant Pub/Sub permissions
echo ""
echo "🔑 Granting Pub/Sub permissions..."

ROLES=(
    "roles/pubsub.publisher"
    "roles/pubsub.subscriber"
    "roles/pubsub.viewer"
)

for ROLE in "${ROLES[@]}"; do
    echo "   Adding role: ${ROLE}"
    gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
        --member="serviceAccount:${SA_EMAIL}" \
        --role="${ROLE}" \
        --condition=None \
        --quiet &>/dev/null || echo "   ℹ️  Role already exists"
done

echo "   ✅ Permissions granted"

# Create service account key
echo ""
echo "🔐 Creating service account key..."
if [ -f "${KEY_FILE}" ]; then
    echo -e "${YELLOW}   ⚠️  Key file already exists: ${KEY_FILE}${NC}"
    read -p "   Do you want to create a new key? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   Using existing key file"
    else
        rm -f "${KEY_FILE}"
        gcloud iam service-accounts keys create ${KEY_FILE} \
            --iam-account=${SA_EMAIL} \
            --project=${GCP_PROJECT_ID}
        echo "   ✅ New key created: ${KEY_FILE}"
    fi
else
    gcloud iam service-accounts keys create ${KEY_FILE} \
        --iam-account=${SA_EMAIL} \
        --project=${GCP_PROJECT_ID}
    echo "   ✅ Key created: ${KEY_FILE}"
fi

# Create Kubernetes secret
echo ""
echo "🔧 Creating Kubernetes secret..."
NAMESPACE="${NAMESPACE:-noclue-app}"

# Check if namespace exists
if kubectl get namespace ${NAMESPACE} &>/dev/null; then
    echo "   Using namespace: ${NAMESPACE}"
else
    echo -e "${YELLOW}   ⚠️  Namespace ${NAMESPACE} does not exist. Creating...${NC}"
    kubectl create namespace ${NAMESPACE}
fi

# Delete existing secret if it exists
kubectl delete secret pubsub-key -n ${NAMESPACE} 2>/dev/null || true

# Create secret from key file
kubectl create secret generic pubsub-key \
    --from-file=key.json=${KEY_FILE} \
    -n ${NAMESPACE}

echo "   ✅ Kubernetes secret 'pubsub-key' created in namespace '${NAMESPACE}'"

# Also create a configmap with the project ID
kubectl create configmap pubsub-config \
    --from-literal=GCP_PROJECT_ID=${GCP_PROJECT_ID} \
    -n ${NAMESPACE} \
    --dry-run=client -o yaml | kubectl apply -f -

echo "   ✅ ConfigMap 'pubsub-config' created/updated"

echo ""
echo -e "${GREEN}✅ Pub/Sub authentication setup complete!${NC}"
echo ""
echo "📋 Summary:"
echo "   Service Account: ${SA_EMAIL}"
echo "   Key File: ${KEY_FILE}"
echo "   K8s Secret: pubsub-key (namespace: ${NAMESPACE})"
echo "   K8s ConfigMap: pubsub-config (namespace: ${NAMESPACE})"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Keep ${KEY_FILE} secure and do NOT commit it to git!${NC}"
echo ""
echo "Next steps:"
echo "1. Update your deployment manifests to mount the secret"
echo "2. Set environment variable: GCP_KEY_FILENAME=/etc/gcp/key.json"
echo "3. Deploy your services: kubectl apply -f k8s/ -n ${NAMESPACE}"

