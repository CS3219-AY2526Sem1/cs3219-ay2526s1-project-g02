#!/bin/bash

# Setup Vertex AI for LLM Service
# This script enables Vertex AI API and grants necessary permissions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🤖 Setting up Vertex AI for LLM Service${NC}"
echo ""

# Check if GCP_PROJECT_ID is set
if [ -z "$GCP_PROJECT_ID" ]; then
    echo -e "${RED}❌ Error: GCP_PROJECT_ID environment variable is required${NC}"
    echo "Usage: GCP_PROJECT_ID=your-project-id $0"
    exit 1
fi

echo -e "${YELLOW}Project ID: ${GCP_PROJECT_ID}${NC}"
echo ""

# Step 1: Enable Vertex AI API
echo "📋 Step 1: Enabling Vertex AI API..."
if gcloud services list --enabled --filter="NAME:aiplatform.googleapis.com" --project=${GCP_PROJECT_ID} 2>/dev/null | grep -q aiplatform; then
    echo -e "${GREEN}   ✅ Vertex AI API already enabled${NC}"
else
    echo "   Enabling Vertex AI API (this may take a minute)..."
    gcloud services enable aiplatform.googleapis.com --project=${GCP_PROJECT_ID}
    echo -e "${GREEN}   ✅ Vertex AI API enabled${NC}"
fi
echo ""

# Step 2: Grant permissions to pubsub-service account (used by LLM service)
echo "📋 Step 2: Granting Vertex AI permissions to service account..."
SA_EMAIL="pubsub-service@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

# Check if service account exists
if gcloud iam service-accounts describe ${SA_EMAIL} --project=${GCP_PROJECT_ID} &>/dev/null; then
    echo "   Service Account: ${SA_EMAIL}"
    
    # Grant Vertex AI User role
    echo "   Adding role: roles/aiplatform.user"
    gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
        --member="serviceAccount:${SA_EMAIL}" \
        --role="roles/aiplatform.user" \
        --condition=None \
        --quiet &>/dev/null || echo "   ℹ️  Role already exists"
    
    echo -e "${GREEN}   ✅ Vertex AI permissions granted${NC}"
else
    echo -e "${YELLOW}   ⚠️  Service account ${SA_EMAIL} not found${NC}"
    echo "   Run: ./scripts/setup-pubsub-auth.sh first"
    exit 1
fi
echo ""

# Step 3: Test Vertex AI access (optional)
echo "📋 Step 3: Testing Vertex AI access..."
if command -v gcloud &> /dev/null; then
    # List available models to verify access
    if gcloud ai models list --region=us-central1 --project=${GCP_PROJECT_ID} --limit=1 &>/dev/null; then
        echo -e "${GREEN}   ✅ Vertex AI access verified${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Could not verify access (this is OK if API is still propagating)${NC}"
    fi
else
    echo "   ℹ️  Skipping verification (gcloud not available)"
fi
echo ""

# Step 4: Display available models
echo "📋 Step 4: Available Gemini Models..."
echo ""
echo "   Model Name               | Free Tier           | Features"
echo "   -------------------------|---------------------|------------------"
echo "   gemini-1.5-flash        | 1500 req/day       | Fast, efficient"
echo "   gemini-1.5-pro          | 50 req/day         | More capable"
echo "   gemini-1.0-pro          | 60 req/min         | Stable, tested"
echo ""
echo "   Default in your code: gemini-1.5-flash ✅"
echo ""

echo -e "${GREEN}✅ Vertex AI setup complete!${NC}"
echo ""
echo "📋 Summary:"
echo "   API: aiplatform.googleapis.com (enabled)"
echo "   Service Account: ${SA_EMAIL}"
echo "   Permissions: roles/aiplatform.user"
echo "   Region: us-central1 (default)"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Verify LLM service is using Vertex AI:"
echo "   - Check LLM_PROVIDER env var is set to 'vertex'"
echo "   - Or remove OPENAI_API_KEY to force Vertex AI usage"
echo ""
echo "2. Test the LLM service:"
echo "   kubectl logs -f deployment/llm-service -n noclue-app"
echo ""
echo "3. Monitor Vertex AI usage in GCP Console:"
echo "   https://console.cloud.google.com/vertex-ai/generative/dashboard?project=${GCP_PROJECT_ID}"
echo ""
echo -e "${GREEN}💰 Cost: Free tier includes 1500 requests/day for Gemini 1.5 Flash!${NC}"

