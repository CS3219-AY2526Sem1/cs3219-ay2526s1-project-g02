# NoClue Setup Guide

Quick setup for NoClue deployment on GKE.

## Prerequisites

### Install Tools
```bash
# macOS
brew install google-cloud-sdk kubectl

# Verify
gcloud --version
kubectl version --client
```

### Accounts Needed
- Google Cloud Platform (billing enabled)
- Supabase account
- GitHub repo admin access

## First-Time Setup

### 1. GCP Project Setup

```bash
# Set project ID
export GCP_PROJECT_ID="your-project-id"
gcloud config set project $GCP_PROJECT_ID

# Enable APIs
gcloud services enable container.googleapis.com compute.googleapis.com

# Authenticate
gcloud auth login
gcloud auth application-default login
```

### 2. Create GKE Cluster

**Option A: Using gcloud CLI**
```bash
# Create cluster (takes ~10 min)
gcloud container clusters create noclue-cluster \
  --zone=us-central1-a \
  --num-nodes=2 \
  --machine-type=e2-small \
  --disk-size=30 \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=3

# Get credentials
gcloud container clusters get-credentials noclue-cluster \
  --zone=us-central1-a
```

**Option B: Using Console**
1. Go to https://console.cloud.google.com/kubernetes
2. Create Cluster > Standard
3. Name: `noclue-cluster`
4. Location: `us-central1-a`
5. Node pool: 2 nodes, e2-small, 30GB disk
6. Enable autoscaling: 1-3 nodes

### 3. Supabase Setup

```bash
# 1. Create project at https://supabase.com/dashboard
# 2. Get credentials from Settings > API

# Save these values:
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxx
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Run database schema in Supabase SQL Editor:
```sql
-- Copy schema from backend/services/*/schema.sql
-- Or use existing schema from DEPLOYMENT_GUIDE.md
```

### 4. Setup Service Account for CI/CD

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant permissions
for role in roles/container.developer roles/storage.admin; do
  gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
    --member="serviceAccount:github-actions@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
    --role="$role"
done

# Create key
gcloud iam service-accounts keys create ~/gcp-key.json \
  --iam-account=github-actions@$GCP_PROJECT_ID.iam.gserviceaccount.com

# Copy key content for GitHub Secrets
cat ~/gcp-key.json
```

### 5. Add GitHub Secrets

Go to `Settings > Secrets and variables > Actions`

Add these secrets:

| Secret Name | Value | Source |
|-------------|-------|--------|
| `GCP_PROJECT_ID` | your-project-id | Your GCP project |
| `GCP_SA_KEY` | JSON key content | Output from above |
| `GKE_CLUSTER` | noclue-cluster | Cluster name |
| `GKE_ZONE` | us-central1-a | Cluster zone |
| `SUPABASE_URL` | https://xxx.supabase.co | Supabase Settings |
| `SUPABASE_SECRET_KEY` | sb_secret_xxx | Supabase Settings |
| `SUPABASE_PUBLISHABLE_KEY` | sb_publishable_xxx | Supabase Settings |

### 6. Create Kubernetes Namespace

```bash
kubectl create namespace noclue-app
```

### 7. Deploy Application

```bash
# Deploy manually
kubectl apply -f k8s/ -n noclue-app

# Or trigger CI/CD
git commit --allow-empty -m "Deploy to GKE"
git push origin main
```

### 8. Get Service URLs

```bash
# Wait for LoadBalancer IP (takes 2-3 min)
kubectl get service frontend-service -n noclue-app -w

# Get all services
kubectl get services -n noclue-app
```

## Local Development Setup

### 1. Clone and Install

```bash
git clone <repo-url>
cd noclue
npm install
npm run build:common
```

### 2. Configure Environment

Create `.env` files:

**frontend/.env.local**
```env
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4001/graphql
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

**backend/services/user-service/.env** (and other services)
```env
PORT=4001
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxx
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 3. Run Services

```bash
# Terminal 1: Backend services
cd backend
npm run dev:services

# Terminal 2: Frontend
cd frontend
npm run dev
```

Access at:
- Frontend: http://localhost:3000
- User Service: http://localhost:4001/graphql
- Question Service: http://localhost:4002/graphql
- Matching Service: http://localhost:4003/graphql
- Collaboration Service: http://localhost:4004/graphql

## Configuration Reference

### Cluster Configuration

Default settings (modify in k8s/*.yaml):

```yaml
# Replicas per service
replicas: 2

# Resources per pod
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Service Ports

| Service | Port | Type |
|---------|------|------|
| Frontend | 3000 | LoadBalancer |
| User Service | 4001 | ClusterIP |
| Question Service | 4002 | ClusterIP |
| Matching Service | 4003 | ClusterIP |
| Collaboration Service | 4004 | ClusterIP |

### Environment Variables

**Production (Kubernetes)**
```yaml
# Secrets (from GitHub Secrets)
- name: SUPABASE_URL
  valueFrom:
    secretKeyRef:
      name: supabase-secrets
      key: SUPABASE_URL

# Service URLs (internal DNS)
- name: USER_SERVICE_URL
  value: "http://user-service.noclue-app.svc.cluster.local:4001"
```

**Development (Local)**
```env
USER_SERVICE_URL=http://localhost:4001
QUESTION_SERVICE_URL=http://localhost:4002
MATCHING_SERVICE_URL=http://localhost:4003
COLLABORATION_SERVICE_URL=http://localhost:4004
```

## Quick Commands

```bash
# Get cluster credentials
gcloud container clusters get-credentials noclue-cluster --zone=us-central1-a

# Check all pods
kubectl get pods -n noclue-app

# Check services
kubectl get svc -n noclue-app

# View logs
kubectl logs -f deployment/user-service -n noclue-app

# Restart deployment
kubectl rollout restart deployment/user-service -n noclue-app

# Scale deployment
kubectl scale deployment/user-service --replicas=3 -n noclue-app

# Port forward for debugging
kubectl port-forward deployment/user-service 4001:4001 -n noclue-app
```

## Cost Estimates

Monthly GKE costs:
- Cluster management: $0-73/month
- 2x e2-small nodes: ~$50/month
- 1x LoadBalancer: ~$18/month
- Storage (30GB): ~$4/month
- **Total: ~$72-145/month**

Reduce costs:
```bash
# Scale down when not in use
kubectl scale deployment --all --replicas=0 -n noclue-app

# Or stop cluster
gcloud container clusters resize noclue-cluster --num-nodes=0 --zone=us-central1-a
```

## Next Steps

- Set up monitoring: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Configure backups: See [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)
- Review security: Enable RBAC, Network Policies
- Add custom domain: Configure Ingress
- Set up alerts: Google Cloud Monitoring

## Common Issues

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for:
- Pod startup failures
- Image pull errors
- Service connectivity issues
- Secret configuration errors
