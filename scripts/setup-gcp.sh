#!/bin/bash

# GCP Setup Script for NoClue Project
# This script sets up GCP permissions, enables APIs, and creates service accounts

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== GCP Setup for NoClue ===${NC}\n"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    exit 1
fi

# Set project
export PROJECT_ID="noclue-476404"
echo -e "${YELLOW}Setting project: $PROJECT_ID${NC}"
gcloud config set project $PROJECT_ID

# Get user email
export USER_EMAIL=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
echo -e "${GREEN}Your account: $USER_EMAIL${NC}\n"

# Step 1: Grant Owner role
echo -e "${YELLOW}Step 1: Granting Owner role...${NC}"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:$USER_EMAIL" \
  --role="roles/owner" \
  --quiet

# Step 2: Check billing (skipped for education accounts)
echo -e "\n${YELLOW}Step 2: Checking billing...${NC}"
echo -e "${GREEN}✓ Skipping billing check (assuming education billing is enabled)${NC}"
# Education billing accounts often don't work with gcloud billing commands
# If you need to verify: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID

# Step 3: Enable APIs
echo -e "\n${YELLOW}Step 3: Enabling required APIs...${NC}"
gcloud services enable \
  compute.googleapis.com \
  container.googleapis.com \
  containerregistry.googleapis.com \
  artifactregistry.googleapis.com \
  servicenetworking.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  --project=$PROJECT_ID

echo -e "${GREEN}✓ APIs enabled. Waiting for propagation (60 seconds)...${NC}"
sleep 60

# Step 4: Create GKE service account
echo -e "\n${YELLOW}Step 4: Creating GKE service account...${NC}"
if gcloud iam service-accounts describe noclue-cluster-sa@$PROJECT_ID.iam.gserviceaccount.com &> /dev/null; then
    echo -e "${YELLOW}Service account already exists${NC}"
else
    gcloud iam service-accounts create noclue-cluster-sa \
      --display-name="Service Account for GKE cluster noclue-cluster" \
      --project=$PROJECT_ID
    echo -e "${GREEN}✓ GKE service account created${NC}"
fi

# Grant roles to GKE SA
echo -e "${YELLOW}Granting roles to GKE service account...${NC}"
for role in "roles/logging.logWriter" "roles/monitoring.metricWriter" "roles/monitoring.viewer" "roles/storage.objectViewer"; do
    gcloud projects add-iam-policy-binding $PROJECT_ID \
      --member="serviceAccount:noclue-cluster-sa@$PROJECT_ID.iam.gserviceaccount.com" \
      --role="$role" \
      --quiet
done
echo -e "${GREEN}✓ GKE service account roles granted${NC}"

# Step 5: Create GitHub Actions service account
echo -e "\n${YELLOW}Step 5: Creating GitHub Actions service account...${NC}"
if gcloud iam service-accounts describe github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com &> /dev/null; then
    echo -e "${YELLOW}Service account already exists${NC}"
else
    gcloud iam service-accounts create github-actions-sa \
      --display-name="Service Account for GitHub Actions CI/CD" \
      --project=$PROJECT_ID
    echo -e "${GREEN}✓ GitHub Actions service account created${NC}"
fi

# Grant roles to GitHub Actions SA
echo -e "${YELLOW}Granting roles to GitHub Actions service account...${NC}"
for role in "roles/container.developer" "roles/storage.admin" "roles/iam.serviceAccountUser"; do
    gcloud projects add-iam-policy-binding $PROJECT_ID \
      --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
      --role="$role" \
      --quiet
done
echo -e "${GREEN}✓ GitHub Actions service account roles granted${NC}"

# Step 6: Create GitHub Actions key
echo -e "\n${YELLOW}Step 6: Creating GitHub Actions service account key...${NC}"
KEY_FILE=~/github-actions-key-$PROJECT_ID.json

if [ -f "$KEY_FILE" ]; then
    echo -e "${YELLOW}Key file already exists at: $KEY_FILE${NC}"
    echo -e "${YELLOW}Delete it if you want to create a new one${NC}"
else
    gcloud iam service-accounts keys create $KEY_FILE \
      --iam-account=github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com

    echo -e "${GREEN}✓ Key created at: $KEY_FILE${NC}"
    echo -e "\n${YELLOW}=== IMPORTANT: Save this key for GitHub Secrets ===${NC}"
    echo -e "${YELLOW}GitHub Secret Name: GCP_SA_KEY${NC}"
    echo -e "${YELLOW}GitHub Secret Value:${NC}"
    cat $KEY_FILE
    echo -e "\n"
fi

echo -e "\n${GREEN}=== Setup Complete! ===${NC}\n"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Add the GitHub Secret 'GCP_SA_KEY' with the key from: $KEY_FILE"
echo -e "2. Add other GitHub Secrets: SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY"
echo -e "3. Create GKE cluster: ./scripts/setup-gke.sh"
echo -e "4. Deploy services: ./scripts/deploy-services.sh"
echo -e "\n${GREEN}Done! 🚀${NC}\n"
