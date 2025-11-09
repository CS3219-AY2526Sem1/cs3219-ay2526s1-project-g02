#!/bin/bash

# Setup Workload Identity for GKE Pub/Sub Access
# This script configures Workload Identity for microservices to access Pub/Sub

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Setting up Workload Identity for Pub/Sub${NC}"
echo ""

# Check if GCP_PROJECT_ID is set
if [ -z "$GCP_PROJECT_ID" ]; then
    echo -e "${RED}❌ Error: GCP_PROJECT_ID environment variable is required${NC}"
    echo "Usage: GCP_PROJECT_ID=your-project-id $0"
    exit 1
fi

echo -e "${YELLOW}Project ID: ${GCP_PROJECT_ID}${NC}"
echo ""

# Configuration
CLUSTER_NAME="${CLUSTER_NAME:-noclue-cluster}"
ZONE="${ZONE:-us-central1-a}"
NAMESPACE="${NAMESPACE:-noclue-app}"
GSA_NAME="pubsub-service"
GSA_EMAIL="${GSA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

SERVICES=("matching-service" "question-service" "collaboration-service")

echo -e "${BLUE}Configuration:${NC}"
echo "  Cluster: ${CLUSTER_NAME}"
echo "  Zone: ${ZONE}"
echo "  Namespace: ${NAMESPACE}"
echo "  Google SA: ${GSA_EMAIL}"
echo ""

# Step 1: Check if Workload Identity is enabled
echo "📋 Step 1: Checking Workload Identity on cluster..."
WI_POOL=$(gcloud container clusters describe ${CLUSTER_NAME} \
    --zone=${ZONE} \
    --project=${GCP_PROJECT_ID} \
    --format="value(workloadIdentityConfig.workloadPool)" 2>/dev/null || echo "")

if [ -z "$WI_POOL" ]; then
    echo -e "${YELLOW}   ⚠️  Workload Identity not enabled. Enabling now...${NC}"
    echo "   This may take 5-10 minutes..."
    
    gcloud container clusters update ${CLUSTER_NAME} \
        --workload-pool=${GCP_PROJECT_ID}.svc.id.goog \
        --zone=${ZONE} \
        --project=${GCP_PROJECT_ID}
    
    echo "   Updating node pool..."
    gcloud container node-pools update default-pool \
        --cluster=${CLUSTER_NAME} \
        --workload-metadata=GKE_METADATA \
        --zone=${ZONE} \
        --project=${GCP_PROJECT_ID}
    
    echo -e "${GREEN}   ✅ Workload Identity enabled${NC}"
else
    echo -e "${GREEN}   ✅ Workload Identity already enabled: ${WI_POOL}${NC}"
fi
echo ""

# Step 2: Create Google Service Account
echo "📋 Step 2: Creating Google Service Account..."
if gcloud iam service-accounts describe ${GSA_EMAIL} --project=${GCP_PROJECT_ID} &>/dev/null; then
    echo -e "${GREEN}   ℹ️  Service account already exists${NC}"
else
    gcloud iam service-accounts create ${GSA_NAME} \
        --display-name="Pub/Sub Service Account for Microservices" \
        --project=${GCP_PROJECT_ID}
    echo -e "${GREEN}   ✅ Service account created${NC}"
fi
echo ""

# Step 3: Grant Pub/Sub permissions
echo "📋 Step 3: Granting Pub/Sub permissions..."
ROLES=(
    "roles/pubsub.publisher"
    "roles/pubsub.subscriber"
    "roles/pubsub.viewer"
)

for ROLE in "${ROLES[@]}"; do
    echo "   Adding role: ${ROLE}"
    gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
        --member="serviceAccount:${GSA_EMAIL}" \
        --role="${ROLE}" \
        --condition=None \
        --quiet &>/dev/null || echo "   ℹ️  Role already exists"
done
echo -e "${GREEN}   ✅ Permissions granted${NC}"
echo ""

# Step 4: Ensure namespace exists
echo "📋 Step 4: Ensuring namespace exists..."
if kubectl get namespace ${NAMESPACE} &>/dev/null; then
    echo -e "${GREEN}   ✅ Namespace exists: ${NAMESPACE}${NC}"
else
    kubectl create namespace ${NAMESPACE}
    echo -e "${GREEN}   ✅ Namespace created: ${NAMESPACE}${NC}"
fi
echo ""

# Step 5: Create Kubernetes Service Accounts
echo "📋 Step 5: Creating Kubernetes Service Accounts..."
for SERVICE in "${SERVICES[@]}"; do
    KSA_NAME="${SERVICE}-sa"
    
    if kubectl get serviceaccount ${KSA_NAME} -n ${NAMESPACE} &>/dev/null; then
        echo "   ℹ️  ${KSA_NAME} already exists"
    else
        kubectl create serviceaccount ${KSA_NAME} -n ${NAMESPACE}
        echo -e "${GREEN}   ✅ Created ${KSA_NAME}${NC}"
    fi
done
echo ""

# Step 6: Bind K8s SA to Google SA
echo "📋 Step 6: Binding Kubernetes SA to Google SA..."
for SERVICE in "${SERVICES[@]}"; do
    KSA_NAME="${SERVICE}-sa"
    
    echo "   Binding ${KSA_NAME}..."
    
    # Add IAM policy binding
    gcloud iam service-accounts add-iam-policy-binding ${GSA_EMAIL} \
        --role roles/iam.workloadIdentityUser \
        --member "serviceAccount:${GCP_PROJECT_ID}.svc.id.goog[${NAMESPACE}/${KSA_NAME}]" \
        --project=${GCP_PROJECT_ID} \
        --quiet &>/dev/null || echo "   ℹ️  Binding already exists"
    
    # Annotate the Kubernetes service account
    kubectl annotate serviceaccount ${KSA_NAME} \
        -n ${NAMESPACE} \
        iam.gke.io/gcp-service-account=${GSA_EMAIL} \
        --overwrite &>/dev/null
    
    echo -e "${GREEN}   ✅ ${KSA_NAME} bound to ${GSA_EMAIL}${NC}"
done
echo ""

# Step 7: Create ConfigMap with project ID
echo "📋 Step 7: Creating ConfigMap..."
kubectl create configmap pubsub-config \
    --from-literal=GCP_PROJECT_ID=${GCP_PROJECT_ID} \
    -n ${NAMESPACE} \
    --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}   ✅ ConfigMap 'pubsub-config' created/updated${NC}"
echo ""

# Step 8: Verify setup
echo "📋 Step 8: Verifying setup..."
for SERVICE in "${SERVICES[@]}"; do
    KSA_NAME="${SERVICE}-sa"
    
    ANNOTATION=$(kubectl get serviceaccount ${KSA_NAME} -n ${NAMESPACE} \
        -o jsonpath='{.metadata.annotations.iam\.gke\.io/gcp-service-account}' 2>/dev/null || echo "")
    
    if [ "$ANNOTATION" = "$GSA_EMAIL" ]; then
        echo -e "${GREEN}   ✅ ${KSA_NAME} correctly annotated${NC}"
    else
        echo -e "${RED}   ❌ ${KSA_NAME} annotation missing or incorrect${NC}"
    fi
done
echo ""

echo -e "${GREEN}✅ Workload Identity setup complete!${NC}"
echo ""
echo "📋 Summary:"
echo "   Google SA: ${GSA_EMAIL}"
echo "   Kubernetes SAs:"
for SERVICE in "${SERVICES[@]}"; do
    echo "     - ${SERVICE}-sa"
done
echo "   Namespace: ${NAMESPACE}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Update deployment manifests to use service accounts:"
echo "   spec:"
echo "     template:"
echo "       spec:"
echo "         serviceAccountName: SERVICE-NAME-sa"
echo ""
echo "2. Remove GCP_KEY_FILENAME env var from deployments (not needed)"
echo ""
echo "3. Deploy services:"
echo "   kubectl apply -f k8s/ -n ${NAMESPACE}"
echo ""
echo "4. Verify authentication in a pod:"
echo "   kubectl exec -it deployment/matching-service -n ${NAMESPACE} -- gcloud auth list"
echo ""
echo -e "${YELLOW}⚠️  Note: Delete any existing 'pubsub-key' secret as it's no longer needed:${NC}"
echo "   kubectl delete secret pubsub-key -n ${NAMESPACE}"

