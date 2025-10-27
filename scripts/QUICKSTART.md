# Quick Start Guide - Deploy to Kubernetes

Get your NoClue services deployed to Kubernetes in minutes.

## Prerequisites

- Kubernetes cluster running (GKE, minikube, etc.)
- `kubectl` installed and configured
- Docker images built and pushed to registry

## Option 1: Quick Deploy (Using secrets.yaml)

```bash
# 1. Edit secrets.yaml with your credentials
nano ../k8s/secrets.yaml

# 2. Deploy everything
./deploy-services.sh
```

## Option 2: Deploy with Environment Variables (Recommended)

```bash
# 1. Set credentials
export SUPABASE_URL='https://xxxxx.supabase.co'
export SUPABASE_SECRET_KEY='sb_secret_xxxxx'
export SUPABASE_PUBLISHABLE_KEY='sb_publishable_xxxxx'
export GCP_PROJECT_ID='your-project-id'

# 2. Deploy
./deploy-services.sh
```

## Option 3: Deploy to GKE

```bash
# 1. Configure kubectl for GKE
gcloud container clusters get-credentials noclue-cluster \
  --zone us-central1-a \
  --project your-project-id

# 2. Set credentials
export SUPABASE_URL='https://xxxxx.supabase.co'
export SUPABASE_SECRET_KEY='sb_secret_xxxxx'
export SUPABASE_PUBLISHABLE_KEY='sb_publishable_xxxxx'
export GCP_PROJECT_ID='your-project-id'

# 3. Deploy
./deploy-services.sh
```

## What Gets Deployed

The script will deploy in this order:

1. **Namespace** - `noclue-app`
2. **Secrets** - Supabase credentials
3. **Services** - Network endpoints
4. **Deployments**:
   - user-service (port 4001)
   - question-service (port 4002)
   - matching-service (port 4003)
   - collaboration-service (port 4004)
   - frontend (port 3000)

## Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n noclue-app

# Check services
kubectl get services -n noclue-app

# View logs
kubectl logs -n noclue-app deployment/user-service

# Port forward to access locally
kubectl port-forward -n noclue-app deployment/frontend 3000:3000
```

## Common Issues

### "Cannot connect to cluster"
```bash
kubectl cluster-info
# If this fails, configure kubectl first
```

### "Secret contains REPLACE_IN_CICD"
```bash
# Use environment variables instead
export SUPABASE_URL='your-url'
export SUPABASE_SECRET_KEY='your-key'
export SUPABASE_PUBLISHABLE_KEY='your-key'
```

### "Deployment not ready"
```bash
# Check pod status
kubectl describe pod POD_NAME -n noclue-app

# Check logs
kubectl logs -n noclue-app deployment/user-service
```

## Next Steps

- Monitor: `kubectl get pods -n noclue-app -w`
- Access: Set up Ingress or LoadBalancer
- Scale: `kubectl scale deployment/user-service --replicas=3 -n noclue-app`
- Update: Re-run `./deploy-services.sh` after code changes

## Full Documentation

See [README.md](./README.md) for complete documentation.
