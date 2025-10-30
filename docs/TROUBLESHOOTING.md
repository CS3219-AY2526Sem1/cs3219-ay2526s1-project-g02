# Troubleshooting Guide

Quick solutions for common NoClue deployment issues.

## Quick Diagnostics

```bash
# Check everything
kubectl get all -n noclue-app
kubectl get events -n noclue-app --sort-by='.lastTimestamp'

# Check specific service
kubectl get pods -n noclue-app -l app=user-service
kubectl describe pod POD_NAME -n noclue-app
kubectl logs POD_NAME -n noclue-app --tail=100
```

## Pod Issues

### Pods Not Starting (Pending)

**Symptom**: Pods stuck in `Pending` state

```bash
# Check pod details
kubectl describe pod POD_NAME -n noclue-app

# Common causes:
# 1. Insufficient resources
kubectl top nodes
kubectl describe nodes

# 2. Image pull issues
kubectl get events -n noclue-app | grep -i pull
```

**Fix**:
```bash
# Scale down other services
kubectl scale deployment/frontend --replicas=1 -n noclue-app

# Or add more nodes
gcloud container clusters resize noclue-cluster --num-nodes=3 --zone=us-central1-a
```

### Pods Crashing (CrashLoopBackOff)

**Symptom**: Pods repeatedly restarting

```bash
# Check logs from crashed pod
kubectl logs POD_NAME -n noclue-app --previous

# Check current logs
kubectl logs -f POD_NAME -n noclue-app
```

**Common causes**:

1. **Missing environment variables**
```bash
# Check secrets exist
kubectl get secrets -n noclue-app

# Verify secret content (keys only, not values)
kubectl get secret supabase-secrets -n noclue-app -o json | jq '.data | keys'

# Expected keys:
# - SUPABASE_URL
# - SUPABASE_SECRET_KEY
# - SUPABASE_PUBLISHABLE_KEY
```

**Fix**:
```bash
# Recreate secret
kubectl delete secret supabase-secrets -n noclue-app
kubectl create secret generic supabase-secrets \
  --from-literal=SUPABASE_URL="https://xxx.supabase.co" \
  --from-literal=SUPABASE_SECRET_KEY="sb_secret_xxx" \
  --from-literal=SUPABASE_PUBLISHABLE_KEY="sb_publishable_xxx" \
  -n noclue-app

# Restart pods
kubectl rollout restart deployment/user-service -n noclue-app
```

2. **Health check failures**
```bash
# Check health endpoint
kubectl exec -n noclue-app deployment/user-service -- curl -v http://localhost:4001/health

# If fails, check if endpoint exists in code
# Expected response: {"status":"ok","service":"user-service"}
```

**Fix**: Add health endpoint to service:
```typescript
// src/main.ts or src/index.ts
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'user-service' });
});
```

3. **Database connection errors**
```bash
# Test Supabase connectivity
kubectl exec -n noclue-app deployment/user-service -- \
  curl -H "apikey: sb_publishable_xxx" \
  "https://xxx.supabase.co/rest/v1/"
```

### Pods Running But Not Ready

**Symptom**: Pods show `0/1 READY`

```bash
# Check readiness probe
kubectl describe pod POD_NAME -n noclue-app | grep -A 10 Readiness

# Check events
kubectl get events -n noclue-app | grep POD_NAME
```

**Fix**:
```bash
# Increase probe delays
kubectl edit deployment user-service -n noclue-app

# Update:
readinessProbe:
  initialDelaySeconds: 30  # Increase from 10
  periodSeconds: 10
```

## Image Issues

### ImagePullBackOff

**Symptom**: Can't pull Docker images from GCR

```bash
# Check image exists
gcloud container images list --repository=gcr.io/$GCP_PROJECT_ID

# Check image tags
gcloud container images list-tags gcr.io/$GCP_PROJECT_ID/user-service
```

**Fix**:
```bash
# Fix 1: Update image path in deployment
kubectl edit deployment user-service -n noclue-app
# Change: gcr.io/PROJECT_ID/user-service:latest
# To: gcr.io/ACTUAL_PROJECT_ID/user-service:latest

# Fix 2: Rebuild and push image
docker build -f Dockerfile.user-service -t gcr.io/$GCP_PROJECT_ID/user-service:latest .
docker push gcr.io/$GCP_PROJECT_ID/user-service:latest

# Force pull new image
kubectl rollout restart deployment/user-service -n noclue-app
```

### Wrong Image Version

**Symptom**: Old version still running

```bash
# Check current image
kubectl get deployment user-service -n noclue-app -o jsonpath='{.spec.template.spec.containers[0].image}'

# Check pod image
kubectl get pods -n noclue-app -o jsonpath='{.items[*].spec.containers[*].image}'
```

**Fix**:
```bash
# Force update
kubectl set image deployment/user-service \
  user-service=gcr.io/$GCP_PROJECT_ID/user-service:latest \
  -n noclue-app

# Or rollout with pull
kubectl rollout restart deployment/user-service -n noclue-app
```

## Service Connectivity Issues

### Frontend Can't Reach Backend

**Symptom**: Frontend shows connection errors

```bash
# Check frontend logs
kubectl logs -f deployment/frontend -n noclue-app

# Check backend service exists
kubectl get svc -n noclue-app
```

**Fix**:
```bash
# Check frontend environment variables
kubectl exec deployment/frontend -n noclue-app -- env | grep SERVICE_URL

# Should show internal DNS:
# USER_SERVICE_URL=http://user-service.noclue-app.svc.cluster.local:4001

# Test connectivity from frontend pod
kubectl exec -it deployment/frontend -n noclue-app -- \
  curl http://user-service.noclue-app.svc.cluster.local:4001/health
```

### Service-to-Service Communication Fails

**Symptom**: Matching service can't reach user service

```bash
# Test DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -n noclue-app -- \
  nslookup user-service.noclue-app.svc.cluster.local

# Test HTTP connectivity
kubectl exec -it deployment/matching-service -n noclue-app -- \
  curl -v http://user-service.noclue-app.svc.cluster.local:4001/health
```

**Fix**:
```bash
# Verify service selector matches pod labels
kubectl get svc user-service -n noclue-app -o yaml | grep selector
kubectl get pods -n noclue-app --show-labels | grep user-service

# Should match: app=user-service
```

### LoadBalancer IP Pending

**Symptom**: Frontend service has no external IP

```bash
# Check service status
kubectl get svc frontend-service -n noclue-app

# If EXTERNAL-IP shows <pending>:
kubectl describe svc frontend-service -n noclue-app
```

**Fix**:
```bash
# Wait 2-3 minutes for GCP to provision
kubectl get svc frontend-service -n noclue-app -w

# If still pending after 5 min, check events
kubectl get events -n noclue-app | grep frontend-service

# Check GCP quotas
gcloud compute project-info describe --project=$GCP_PROJECT_ID
```

## Permission Issues

### Unauthorized GCR Access

**Symptom**: `unauthorized: You don't have the needed permissions`

```bash
# Check service account permissions
gcloud projects get-iam-policy $GCP_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-actions@*"
```

**Fix**:
```bash
# Re-add permissions
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:github-actions@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/container.developer"

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:github-actions@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

### Can't Connect to GKE Cluster

**Symptom**: `Unable to connect to the server`

```bash
# Re-authenticate
gcloud auth login
gcloud auth application-default login

# Update kubeconfig
gcloud container clusters get-credentials noclue-cluster \
  --zone=us-central1-a \
  --project=$GCP_PROJECT_ID

# Verify
kubectl cluster-info
```

## Resource Issues

### Out of Memory (OOMKilled)

**Symptom**: Pods killed with `OOMKilled`

```bash
# Check pod status
kubectl get pods -n noclue-app

# Check resource usage
kubectl top pods -n noclue-app
```

**Fix**:
```bash
# Increase memory limits
kubectl edit deployment user-service -n noclue-app

# Update:
resources:
  requests:
    memory: "512Mi"  # Increase from 256Mi
  limits:
    memory: "1Gi"    # Increase from 512Mi
```

### CPU Throttling

**Symptom**: Services slow, high CPU usage

```bash
# Check CPU usage
kubectl top pods -n noclue-app
kubectl top nodes
```

**Fix**:
```bash
# Increase CPU limits
kubectl edit deployment user-service -n noclue-app

# Update:
resources:
  requests:
    cpu: "500m"    # Increase from 250m
  limits:
    cpu: "1000m"   # Increase from 500m

# Or add more replicas
kubectl scale deployment/user-service --replicas=3 -n noclue-app
```

## Network Issues

### CORS Errors

**Symptom**: Browser shows CORS errors

```bash
# Check backend CORS configuration
kubectl logs deployment/user-service -n noclue-app | grep -i cors

# Check CORS_ORIGIN environment variable
kubectl exec deployment/user-service -n noclue-app -- env | grep CORS
```

**Fix**:
```bash
# Update CORS origin
kubectl set env deployment/user-service \
  CORS_ORIGIN=https://your-frontend-domain.com \
  -n noclue-app

# Or edit deployment
kubectl edit deployment user-service -n noclue-app
```

### WebSocket Connection Fails

**Symptom**: Matching/Collaboration WebSocket fails

```bash
# Check service type
kubectl get svc matching-service -n noclue-app -o yaml | grep type

# Check logs
kubectl logs -f deployment/matching-service -n noclue-app
```

**Fix**:
```yaml
# Ensure WebSocket services use LoadBalancer
# Edit k8s/matching-service-service.yaml:
spec:
  type: LoadBalancer
  ports:
  - port: 4003
    targetPort: 4003
```

## CI/CD Issues

### GitHub Actions Fails

**Check workflow logs**:
1. Go to GitHub > Actions
2. Click failed workflow
3. Expand failed step

**Common fixes**:

```bash
# Fix 1: Update GitHub Secret
# Settings > Secrets > Update GCP_SA_KEY

# Fix 2: Re-authenticate GCP
gcloud auth login
gcloud projects list

# Fix 3: Check cluster exists
gcloud container clusters list --project=$GCP_PROJECT_ID
```

### Deployment Timeout

**Symptom**: `rollout status` times out

```bash
# Check rollout status
kubectl rollout status deployment/user-service -n noclue-app

# Check pod events
kubectl get events -n noclue-app --sort-by='.lastTimestamp' | tail -20
```

**Fix**:
```bash
# Cancel bad rollout
kubectl rollout undo deployment/user-service -n noclue-app

# Or manually delete failing pods
kubectl delete pod POD_NAME -n noclue-app
```

## Database Issues

### Supabase Connection Timeout

**Symptom**: Services can't connect to Supabase

```bash
# Test connection from pod
kubectl exec -it deployment/user-service -n noclue-app -- \
  curl -v https://xxx.supabase.co/rest/v1/

# Check secret values
kubectl get secret supabase-secrets -n noclue-app \
  -o jsonpath='{.data.SUPABASE_URL}' | base64 -d && echo
```

**Fix**:
```bash
# Verify Supabase project is running
# Check: https://supabase.com/dashboard

# Update secrets with correct values
kubectl delete secret supabase-secrets -n noclue-app
kubectl create secret generic supabase-secrets \
  --from-literal=SUPABASE_URL="https://xxx.supabase.co" \
  --from-literal=SUPABASE_SECRET_KEY="sb_secret_xxx" \
  -n noclue-app

kubectl rollout restart deployment/user-service -n noclue-app
```

## Debug Tools

### Interactive Pod Shell

```bash
# Access pod shell
kubectl exec -it POD_NAME -n noclue-app -- /bin/sh

# Or specific deployment
kubectl exec -it deployment/user-service -n noclue-app -- /bin/sh

# Inside pod, test:
curl localhost:4001/health
env | grep SUPABASE
```

### Port Forwarding

```bash
# Forward backend service to local
kubectl port-forward deployment/user-service 4001:4001 -n noclue-app

# Test locally
curl http://localhost:4001/health
```

### Debug Pod

```bash
# Run debug pod with tools
kubectl run debug -it --rm --image=nicolaka/netshoot -n noclue-app -- /bin/bash

# Inside debug pod:
curl http://user-service.noclue-app.svc.cluster.local:4001/health
nslookup user-service.noclue-app.svc.cluster.local
ping user-service.noclue-app.svc.cluster.local
```

### Log Streaming

```bash
# Stream logs from all replicas
kubectl logs -f -l app=user-service -n noclue-app --all-containers

# Stream with timestamps
kubectl logs -f deployment/user-service -n noclue-app --timestamps

# Stream from previous crashed container
kubectl logs POD_NAME -n noclue-app --previous
```

## Monitoring

### Check Cluster Health

```bash
# Node status
kubectl get nodes
kubectl describe nodes

# Resource usage
kubectl top nodes
kubectl top pods -n noclue-app

# Cluster info
kubectl cluster-info
kubectl get componentstatuses
```

### Check Service Endpoints

```bash
# View endpoints
kubectl get endpoints -n noclue-app

# Should show pod IPs:
# user-service   10.0.0.1:4001,10.0.0.2:4001
```

### View Recent Events

```bash
# All events (last 30 minutes)
kubectl get events -n noclue-app --sort-by='.lastTimestamp'

# Warning events only
kubectl get events -n noclue-app --field-selector type=Warning

# For specific pod
kubectl get events -n noclue-app --field-selector involvedObject.name=POD_NAME
```

## Emergency Commands

### Complete Restart

```bash
# Restart all deployments
kubectl rollout restart deployment -n noclue-app

# Or one by one
kubectl rollout restart deployment/frontend -n noclue-app
kubectl rollout restart deployment/user-service -n noclue-app
kubectl rollout restart deployment/question-service -n noclue-app
kubectl rollout restart deployment/matching-service -n noclue-app
kubectl rollout restart deployment/collaboration-service -n noclue-app
```

### Delete and Redeploy

```bash
# Delete all resources
kubectl delete all --all -n noclue-app

# Keep namespace and secrets, delete everything else
kubectl delete deployment,service,pod --all -n noclue-app

# Redeploy
kubectl apply -f k8s/ -n noclue-app
```

### Scale to Zero

```bash
# Stop all services (emergency maintenance)
kubectl scale deployment --all --replicas=0 -n noclue-app

# Start again
kubectl scale deployment --all --replicas=2 -n noclue-app
```

## Getting Help

### Collect Debug Info

```bash
# Create debug report
kubectl get all -n noclue-app > debug-report.txt
kubectl describe pods -n noclue-app >> debug-report.txt
kubectl get events -n noclue-app >> debug-report.txt
kubectl logs -l app=user-service -n noclue-app --tail=100 >> debug-report.txt
```

### Useful Links

- GKE Dashboard: https://console.cloud.google.com/kubernetes
- GCP Logs: https://console.cloud.google.com/logs
- Supabase Dashboard: https://supabase.com/dashboard
- GitHub Actions: https://github.com/YOUR_ORG/noclue/actions

### Support Channels

- Check [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) for emergency procedures
- Review [SETUP.md](./SETUP.md) for configuration details
- Open GitHub issue with debug report attached
