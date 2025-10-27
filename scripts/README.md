# NoClue Deployment Scripts

This directory contains scripts for deploying the NoClue microservices platform to Kubernetes.

## Scripts Overview

### 1. `utils.sh`
Common utility functions used by other deployment scripts.

**Features:**
- Color-coded logging (info, success, warning, error)
- Cluster connectivity checks
- Namespace management
- Deployment readiness waiting
- Secret management helpers
- Health check functions
- Service URL retrieval
- YAML parsing (with yq or Python fallback)
- GCP authentication validation
- Confirmation prompts for destructive actions

**Usage:**
```bash
# Source in other scripts
source "$(dirname "$0")/utils.sh"
```

---

## GKE Cluster Management Scripts

### 2. `setup-gke.sh`
Creates and configures a GKE cluster based on configuration from `config/cluster.yaml`.

**Features:**
- Idempotent cluster creation (safe to run multiple times)
- Reads all configuration from YAML file
- Validates prerequisites and authentication
- Configures kubectl automatically
- Creates application namespace
- Displays detailed cluster information

**Prerequisites:**
- `gcloud` CLI installed and authenticated
- `kubectl` installed
- `yq` installed (for YAML parsing: `brew install yq`)
- Appropriate GCP permissions

**Usage:**
```bash
# Basic usage (uses default config/cluster.yaml)
./scripts/setup-gke.sh

# With custom config file
./scripts/setup-gke.sh path/to/custom-cluster.yaml
```

**What it does:**
1. Validates prerequisites and authentication
2. Loads configuration from cluster.yaml
3. Checks if cluster already exists (idempotent)
4. Creates GKE cluster with specified settings
5. Configures kubectl context
6. Creates application namespace
7. Displays cluster information and next steps

**Example Output:**
```
Cluster Details:
  Project:     noclue-476404
  Cluster:     noclue-cluster
  Zone:        us-central1-a
  Namespace:   noclue-app

Next Steps:
  1. Deploy your applications: kubectl apply -f k8s/
  2. Check cluster health: ./scripts/health-check.sh
```

### 3. `teardown.sh`
Safely deletes a GKE cluster and all associated resources.

**Features:**
- Requires explicit confirmation with cluster name
- Lists all resources before deletion
- Deletes Kubernetes resources before cluster
- Cleans up kubectl contexts
- Multiple safety confirmations

**Prerequisites:**
- Same as setup-gke.sh

**Usage:**
```bash
# Basic usage
./scripts/teardown.sh

# With custom config file
./scripts/teardown.sh path/to/custom-cluster.yaml
```

**Safety Features:**
- Must type exact cluster name to confirm
- Shows all resources that will be deleted
- Requires final "yes" confirmation
- Cannot be undone - use with caution!

**What it does:**
1. Loads cluster configuration
2. Checks if cluster exists
3. Lists all resources to be deleted
4. Requires confirmation with cluster name
5. Deletes Kubernetes resources (deployments, services, etc.)
6. Deletes GKE cluster
7. Cleans up kubectl configuration

**Example:**
```bash
./scripts/teardown.sh

# You will be prompted:
# Type 'noclue-cluster' to confirm:
# noclue-cluster
# Are you absolutely sure? (type 'yes' to proceed):
# yes
```

### 4. `health-check.sh`
Performs comprehensive health checks on a running GKE cluster.

**Features:**
- Cluster connectivity verification
- Node status and resource usage
- Pod health and restart counts
- Service endpoint verification
- Deployment readiness checks
- DNS and API connectivity tests
- Detailed health report with pass/fail/warning status

**Prerequisites:**
- Same as setup-gke.sh
- Cluster must be running

**Usage:**
```bash
# Basic usage
./scripts/health-check.sh

# With custom config file
./scripts/health-check.sh path/to/custom-cluster.yaml
```

**What it checks:**
1. **Cluster Status** - Is cluster running?
2. **Node Health** - Are all nodes ready?
3. **Namespace** - Does the application namespace exist?
4. **Pods** - Are all pods running? Any excessive restarts?
5. **Services** - Do services have endpoints?
6. **Deployments** - Are deployments fully ready?
7. **PVCs** - Are persistent volume claims bound?
8. **Connectivity** - DNS resolution and API access working?

**Example Output:**
```
Health Check Results:
  Passed:   15
  Failed:   0
  Warnings: 2
  Total:    17

All Health Checks Passed with Warnings
Cluster is operational but has some warnings
```

**Exit Codes:**
- 0: All checks passed (or passed with warnings)
- 1: One or more critical checks failed

---

## Configuration File

### `config/cluster.yaml`
Central configuration file for GKE cluster settings.

**Location:** `/config/cluster.yaml`

**Key Sections:**
```yaml
project_id: noclue-476404

cluster:
  name: noclue-cluster
  region: us-central1
  zone: us-central1-a
  network: default
  subnet: default
  namespace: noclue-app

nodePool:
  machineType: e2-small
  diskSizeGb: 30
  initialNodeCount: 1
  minNodes: 1
  maxNodes: 1
  preemptible: false
  serviceAccount: noclue-cluster-sa@...
```

**Customization:**
- Modify cluster settings in cluster.yaml
- All scripts read from this file
- No need to edit script files

---

## Quick Start Guide

### Initial Cluster Setup
```bash
# 1. Authenticate with GCP
gcloud auth login
gcloud config set project noclue-476404

# 2. Install prerequisites
brew install yq kubectl
brew install --cask google-cloud-sdk

# 3. Create cluster
./scripts/setup-gke.sh

# 4. Verify cluster health
./scripts/health-check.sh

# 5. Deploy services
./scripts/deploy-services.sh
```

### Daily Operations
```bash
# Check cluster health
./scripts/health-check.sh

# Deploy/update services
./scripts/deploy-services.sh

# View pods
kubectl get pods -n noclue-app

# View logs
kubectl logs -n noclue-app deployment/user-service -f
```

### Cluster Teardown
```bash
# When you're done with the cluster
./scripts/teardown.sh
```

---

### 2. `deploy-services.sh`
Main deployment script for deploying all services to Kubernetes.

**Features:**
- Automated Kubernetes secret creation from environment variables
- Manifest preparation and PROJECT_ID replacement
- Ordered service deployment (backend → frontend)
- Rolling updates for existing deployments
- Health checks after deployment
- Service URL display
- Comprehensive error handling

**Prerequisites:**
- `kubectl` configured to access your cluster
- `gcloud` CLI (optional, for GKE)
- Kubernetes cluster up and running

**Usage:**

#### Basic Deployment (No External Secrets)
```bash
# Using secrets.yaml file
./deploy-services.sh
```

#### Deployment with Environment Variables (Recommended for CI/CD)
```bash
# Set Supabase credentials
export SUPABASE_URL='https://xxxxx.supabase.co'
export SUPABASE_SECRET_KEY='sb_secret_xxxxx'
export SUPABASE_PUBLISHABLE_KEY='sb_publishable_xxxxx'

# Deploy with GCP project ID
export GCP_PROJECT_ID='your-gcp-project-id'
./deploy-services.sh
```

#### Deployment with Command Line Arguments
```bash
./deploy-services.sh \
  --project-id your-gcp-project-id \
  --namespace noclue-app \
  --cluster-name noclue-cluster \
  --zone us-central1-a
```

#### Show Help
```bash
./deploy-services.sh --help
```

## Deployment Process

The script follows this order:

1. **Prerequisites Check**
   - Verifies `kubectl` is installed
   - Checks `gcloud` availability (optional)

2. **Cluster Connectivity**
   - Validates connection to Kubernetes cluster
   - Displays current context

3. **Namespace Setup**
   - Creates namespace if it doesn't exist
   - Uses `noclue-app` by default

4. **Secret Management**
   - Creates Kubernetes secrets from environment variables
   - Falls back to `secrets.yaml` if env vars not set
   - Validates no placeholder values remain

5. **Manifest Preparation**
   - Replaces `PROJECT_ID` placeholder in deployment manifests
   - Creates temporary manifests with actual values

6. **Service Deployment**
   - Applies Kubernetes Services first
   - Ensures network endpoints are ready

7. **Application Deployment**
   - Deploys in order: user → question → matching → collaboration → frontend
   - Applies rolling updates for existing deployments

8. **Readiness Verification**
   - Waits for all deployments to become ready (5 min timeout per service)
   - Shows pod status on failures

9. **Health Checks**
   - Verifies `/health` endpoint on backend services
   - Checks `/` on frontend
   - Reports success/failure count

10. **Service URLs**
    - Displays external URLs (if LoadBalancer type)
    - Shows internal cluster URLs
    - Provides service type information

## Environment Variables

### Required for Secret Creation (CI/CD)
```bash
SUPABASE_URL                    # Supabase project URL
SUPABASE_SECRET_KEY             # Supabase secret key (backend)
SUPABASE_PUBLISHABLE_KEY        # Supabase publishable key (frontend)
```

### Optional Configuration
```bash
GCP_PROJECT_ID                  # GCP project ID (for image paths)
CLUSTER_NAME                    # Kubernetes cluster name
ZONE                            # GCP zone
```

## Examples

### Local Development Deployment
```bash
# Ensure kubectl is configured
kubectl config current-context

# Deploy using secrets.yaml
./deploy-services.sh
```

### Production Deployment
```bash
# Set production credentials
export SUPABASE_URL='https://prod.supabase.co'
export SUPABASE_SECRET_KEY='sb_secret_prod_xxx'
export SUPABASE_PUBLISHABLE_KEY='sb_publishable_prod_xxx'
export GCP_PROJECT_ID='noclue-476404'

# Deploy
./deploy-services.sh --namespace noclue-app
```

### CI/CD Pipeline (GitHub Actions)
```yaml
- name: Deploy to Kubernetes
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SECRET_KEY: ${{ secrets.SUPABASE_SECRET_KEY }}
    SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_PUBLISHABLE_KEY }}
    GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  run: |
    ./scripts/deploy-services.sh
```

### Update Single Service
```bash
# The script handles rolling updates automatically
# Just run the deployment script again after updating your code
./deploy-services.sh --project-id your-project
```

## Troubleshooting

### Deployment Fails with "Cannot connect to cluster"
```bash
# For GKE, configure kubectl
gcloud container clusters get-credentials noclue-cluster \
  --zone us-central1-a \
  --project your-project-id

# Verify connection
kubectl cluster-info
```

### Secret Creation Fails
```bash
# Check if secrets contain placeholders
grep -r "REPLACE_IN_CICD" ../k8s/secrets.yaml

# Set environment variables instead
export SUPABASE_URL='...'
export SUPABASE_SECRET_KEY='...'
export SUPABASE_PUBLISHABLE_KEY='...'
```

### Deployment Not Ready
```bash
# Check pod status
kubectl get pods -n noclue-app

# Check logs
kubectl logs -n noclue-app deployment/user-service --tail=50

# Describe pod for events
kubectl describe pod POD_NAME -n noclue-app
```

### Health Check Failures
```bash
# Verify health endpoint exists in your services
curl http://localhost:4001/health

# Check pod logs for errors
kubectl logs -n noclue-app -l app=user-service

# Port forward and test locally
kubectl port-forward -n noclue-app deployment/user-service 4001:4001
curl http://localhost:4001/health
```

### Image Pull Errors
```bash
# Verify images exist in GCR
gcloud container images list --repository=gcr.io/PROJECT_ID

# Check image pull secrets
kubectl get secrets -n noclue-app

# For GKE, ensure cluster has correct permissions
# (Usually handled by default service account)
```

## Monitoring Deployments

### Watch Pod Status
```bash
kubectl get pods -n noclue-app -w
```

### View Logs
```bash
# Single service
kubectl logs -n noclue-app deployment/user-service -f

# All replicas of a service
kubectl logs -n noclue-app -l app=user-service --tail=100 -f
```

### Check Rollout Status
```bash
kubectl rollout status deployment/user-service -n noclue-app
```

### View Recent Events
```bash
kubectl get events -n noclue-app --sort-by='.lastTimestamp'
```

## Rolling Back Deployments

### View Rollout History
```bash
kubectl rollout history deployment/user-service -n noclue-app
```

### Rollback to Previous Version
```bash
kubectl rollout undo deployment/user-service -n noclue-app
```

### Rollback to Specific Revision
```bash
kubectl rollout undo deployment/user-service -n noclue-app --to-revision=2
```

## Scaling Services

### Manual Scaling
```bash
# Scale up
kubectl scale deployment/user-service --replicas=3 -n noclue-app

# Scale down
kubectl scale deployment/user-service --replicas=1 -n noclue-app
```

### Auto-scaling (HPA)
```bash
# Create horizontal pod autoscaler
kubectl autoscale deployment/user-service \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n noclue-app
```

## Useful Commands

### Restart a Deployment
```bash
kubectl rollout restart deployment/user-service -n noclue-app
```

### Update a Secret
```bash
# Delete and recreate
kubectl delete secret supabase-secrets -n noclue-app
kubectl create secret generic supabase-secrets -n noclue-app \
  --from-literal=SUPABASE_URL='...' \
  --from-literal=SUPABASE_SECRET_KEY='...' \
  --from-literal=SUPABASE_PUBLISHABLE_KEY='...'

# Restart deployments to pick up new secret
kubectl rollout restart deployment/user-service -n noclue-app
```

### Port Forward to Service
```bash
# Frontend
kubectl port-forward -n noclue-app deployment/frontend 3000:3000

# User service
kubectl port-forward -n noclue-app deployment/user-service 4001:4001
```

### Delete All Resources
```bash
# Delete entire namespace (careful!)
kubectl delete namespace noclue-app

# Delete specific deployments
kubectl delete deployment --all -n noclue-app
```

## Integration with CI/CD

### GitHub Actions Example
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GKE

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}

      - name: Configure kubectl
        run: |
          gcloud container clusters get-credentials noclue-cluster \
            --zone us-central1-a \
            --project ${{ secrets.GCP_PROJECT_ID }}

      - name: Deploy Services
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SECRET_KEY: ${{ secrets.SUPABASE_SECRET_KEY }}
          SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_PUBLISHABLE_KEY }}
          GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
        run: |
          chmod +x ./scripts/deploy-services.sh
          ./scripts/deploy-services.sh
```

## Best Practices

1. **Always test in a staging environment first**
   - Use different namespaces for staging/production
   - Example: `--namespace noclue-staging`

2. **Monitor deployments**
   - Watch logs during deployment
   - Set up alerting for pod failures

3. **Use environment variables for secrets in CI/CD**
   - Never commit secrets to Git
   - Use GitHub Secrets, GitLab Variables, etc.

4. **Keep rollback ready**
   - Check rollout history before deploying
   - Know how to quickly rollback

5. **Verify health checks**
   - Ensure all services have `/health` endpoints
   - Test health checks locally before deploying

6. **Resource limits**
   - Monitor resource usage
   - Adjust requests/limits in deployment manifests

## Support

For issues or questions:
- Check logs: `kubectl logs -n noclue-app deployment/SERVICE_NAME`
- View events: `kubectl get events -n noclue-app`
- Describe resources: `kubectl describe deployment SERVICE_NAME -n noclue-app`
- See [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) for detailed information

## Related Documentation

- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - Complete deployment guide
- [KUBERNETES_SERVICE_DISCOVERY.md](../KUBERNETES_SERVICE_DISCOVERY.md) - K8s networking
- [SERVICE_COMMUNICATION.md](../SERVICE_COMMUNICATION.md) - Inter-service communication
- [LOCAL_SUPABASE_SETUP.md](../LOCAL_SUPABASE_SETUP.md) - Local development setup
