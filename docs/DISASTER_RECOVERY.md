# Disaster Recovery Guide

Emergency procedures for NoClue platform recovery.

## Emergency Contacts

```bash
# GCP Project
PROJECT_ID: [Your project ID]
REGION: us-central1
ZONE: us-central1-a
CLUSTER: noclue-cluster

# Critical URLs
GKE: https://console.cloud.google.com/kubernetes
Logs: https://console.cloud.google.com/logs
Supabase: https://supabase.com/dashboard
```

## Quick Recovery

### Complete Outage - Get Services Back ASAP

```bash
# 1. Check cluster status
gcloud container clusters list --project=$GCP_PROJECT_ID

# 2. Get credentials
gcloud container clusters get-credentials noclue-cluster \
  --zone=us-central1-a --project=$GCP_PROJECT_ID

# 3. Check pods
kubectl get pods -n noclue-app

# 4. Restart everything
kubectl rollout restart deployment --all -n noclue-app

# 5. Monitor recovery
kubectl get pods -n noclue-app -w
```

### Cluster Unreachable

```bash
# Try re-authentication
gcloud auth login
gcloud auth application-default login

# Get fresh credentials
gcloud container clusters get-credentials noclue-cluster \
  --zone=us-central1-a --project=$GCP_PROJECT_ID

# If still fails, check cluster status in console:
# https://console.cloud.google.com/kubernetes
```

## Backup Procedures

### Database Backup (Supabase)

**Automated Backups** (Supabase Pro)
- Enabled by default
- Point-in-time recovery up to 7 days
- Access: Supabase Dashboard > Database > Backups

**Manual Backup**
```bash
# Export schema
pg_dump -h db.xxx.supabase.co \
  -U postgres \
  -d postgres \
  --schema-only \
  > schema_backup_$(date +%Y%m%d).sql

# Export data
pg_dump -h db.xxx.supabase.co \
  -U postgres \
  -d postgres \
  --data-only \
  > data_backup_$(date +%Y%m%d).sql

# Or use Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d).sql
```

### Configuration Backup

```bash
# Backup all K8s resources
kubectl get all -n noclue-app -o yaml > backup_k8s_$(date +%Y%m%d).yaml

# Backup secrets (encrypted at rest)
kubectl get secrets -n noclue-app -o yaml > backup_secrets_$(date +%Y%m%d).yaml

# Backup deployments only
kubectl get deployments -n noclue-app -o yaml > backup_deployments_$(date +%Y%m%d).yaml

# Backup services only
kubectl get services -n noclue-app -o yaml > backup_services_$(date +%Y%m%d).yaml
```

### Container Images Backup

```bash
# List all images
gcloud container images list --repository=gcr.io/$GCP_PROJECT_ID

# List image tags (versions)
gcloud container images list-tags gcr.io/$GCP_PROJECT_ID/user-service

# Pull and archive specific version
docker pull gcr.io/$GCP_PROJECT_ID/user-service:SHA
docker save gcr.io/$GCP_PROJECT_ID/user-service:SHA > user-service-backup.tar

# Push to backup location (optional)
docker tag gcr.io/$GCP_PROJECT_ID/user-service:SHA \
  gcr.io/backup-project/user-service:$(date +%Y%m%d)
docker push gcr.io/backup-project/user-service:$(date +%Y%m%d)
```

## Recovery Procedures

### Restore from Complete Cluster Loss

**Step 1: Recreate Cluster**
```bash
# Create new GKE cluster
gcloud container clusters create noclue-cluster \
  --zone=us-central1-a \
  --num-nodes=2 \
  --machine-type=e2-small \
  --disk-size=30 \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=3 \
  --project=$GCP_PROJECT_ID

# Get credentials
gcloud container clusters get-credentials noclue-cluster \
  --zone=us-central1-a --project=$GCP_PROJECT_ID
```

**Step 2: Restore Namespace & Secrets**
```bash
# Create namespace
kubectl create namespace noclue-app

# Recreate secrets
kubectl create secret generic supabase-secrets \
  --from-literal=SUPABASE_URL="https://xxx.supabase.co" \
  --from-literal=SUPABASE_SECRET_KEY="sb_secret_xxx" \
  --from-literal=SUPABASE_PUBLISHABLE_KEY="sb_publishable_xxx" \
  -n noclue-app
```

**Step 3: Restore Deployments**
```bash
# Option A: From backup
kubectl apply -f backup_k8s_YYYYMMDD.yaml

# Option B: From git
kubectl apply -f k8s/ -n noclue-app

# Option C: Trigger CI/CD
git commit --allow-empty -m "Restore deployment"
git push origin main
```

**Step 4: Verify Recovery**
```bash
# Check all pods running
kubectl get pods -n noclue-app

# Check services have endpoints
kubectl get services -n noclue-app

# Test frontend
kubectl get svc frontend-service -n noclue-app
# Visit external IP in browser
```

### Restore Single Service

```bash
# Delete failed service
kubectl delete deployment user-service -n noclue-app
kubectl delete service user-service -n noclue-app

# Redeploy from manifests
kubectl apply -f k8s/user-service-deployment.yaml
kubectl apply -f k8s/user-service-service.yaml

# Or rollback (see Rollback section)
kubectl rollout undo deployment/user-service -n noclue-app
```

### Restore Database from Backup

**Using Supabase Dashboard** (Recommended)
1. Go to https://supabase.com/dashboard
2. Select project
3. Database > Backups
4. Choose backup point
5. Click "Restore"

**Manual Restore**
```bash
# Restore schema
psql -h db.xxx.supabase.co \
  -U postgres \
  -d postgres \
  < schema_backup_YYYYMMDD.sql

# Restore data
psql -h db.xxx.supabase.co \
  -U postgres \
  -d postgres \
  < data_backup_YYYYMMDD.sql

# Or use Supabase CLI
supabase db restore backup_YYYYMMDD.sql
```

### Restore Secrets

```bash
# From backup file
kubectl apply -f backup_secrets_YYYYMMDD.yaml

# Or recreate manually
kubectl create secret generic supabase-secrets \
  --from-literal=SUPABASE_URL="https://xxx.supabase.co" \
  --from-literal=SUPABASE_SECRET_KEY="sb_secret_xxx" \
  --from-literal=SUPABASE_PUBLISHABLE_KEY="sb_publishable_xxx" \
  -n noclue-app \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart pods to use new secrets
kubectl rollout restart deployment --all -n noclue-app
```

## Rollback Procedures

### Rollback Deployment

```bash
# View rollout history
kubectl rollout history deployment/user-service -n noclue-app

# Rollback to previous version
kubectl rollout undo deployment/user-service -n noclue-app

# Rollback to specific revision
kubectl rollout history deployment/user-service -n noclue-app --revision=3
kubectl rollout undo deployment/user-service -n noclue-app --to-revision=3

# Monitor rollback
kubectl rollout status deployment/user-service -n noclue-app
```

### Rollback All Services

```bash
# Rollback all deployments
for service in frontend user-service question-service matching-service collaboration-service; do
  kubectl rollout undo deployment/$service -n noclue-app
done

# Monitor
kubectl get pods -n noclue-app -w
```

### Rollback to Specific Image Tag

```bash
# List available image tags
gcloud container images list-tags gcr.io/$GCP_PROJECT_ID/user-service

# Update deployment to specific tag
kubectl set image deployment/user-service \
  user-service=gcr.io/$GCP_PROJECT_ID/user-service:GOOD_SHA \
  -n noclue-app

# Or edit deployment
kubectl edit deployment user-service -n noclue-app
# Change image tag to known good version
```

### Rollback GitHub Actions Deployment

```bash
# 1. Find last good commit
git log --oneline

# 2. Revert to that commit
git revert BAD_COMMIT_SHA
git push origin main

# Or hard reset (dangerous)
git reset --hard GOOD_COMMIT_SHA
git push --force origin main

# 3. Wait for CI/CD to deploy
# Watch at: https://github.com/YOUR_ORG/noclue/actions
```

## Data Loss Scenarios

### Accidental Data Deletion

**Immediate Actions**
```bash
# 1. Stop all write operations
kubectl scale deployment --all --replicas=0 -n noclue-app

# 2. Check Supabase audit logs
# Dashboard > Database > Logs

# 3. Restore from point-in-time backup (Supabase Pro)
# Dashboard > Database > Backups > Point-in-time Recovery
```

### Corrupted Database

```bash
# 1. Scale down services
kubectl scale deployment --all --replicas=0 -n noclue-app

# 2. Create backup of current state (even if corrupted)
supabase db dump -f corrupted_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Restore from last good backup
supabase db restore backup_YYYYMMDD.sql

# 4. Scale up services
kubectl scale deployment --all --replicas=2 -n noclue-app
```

### Secret Compromise

```bash
# 1. Immediately rotate secrets in Supabase
# Dashboard > Settings > API > Reset keys

# 2. Update GitHub Secrets
# Settings > Secrets > Update all compromised secrets

# 3. Update Kubernetes secrets
kubectl delete secret supabase-secrets -n noclue-app
kubectl create secret generic supabase-secrets \
  --from-literal=SUPABASE_URL="https://xxx.supabase.co" \
  --from-literal=SUPABASE_SECRET_KEY="NEW_SECRET" \
  --from-literal=SUPABASE_PUBLISHABLE_KEY="NEW_PUBLISHABLE" \
  -n noclue-app

# 4. Force restart all pods
kubectl delete pods --all -n noclue-app

# 5. Rotate GCP service account key
gcloud iam service-accounts keys create ~/new-gcp-key.json \
  --iam-account=github-actions@$GCP_PROJECT_ID.iam.gserviceaccount.com

# Update GitHub Secret GCP_SA_KEY with new key content

# Delete old key
gcloud iam service-accounts keys list \
  --iam-account=github-actions@$GCP_PROJECT_ID.iam.gserviceaccount.com
gcloud iam service-accounts keys delete OLD_KEY_ID \
  --iam-account=github-actions@$GCP_PROJECT_ID.iam.gserviceaccount.com
```

## Incident Response Checklist

### During Incident

- [ ] Assess severity (P0: Complete outage, P1: Degraded, P2: Minor)
- [ ] Notify team via [communication channel]
- [ ] Check GKE cluster status
- [ ] Check pod status: `kubectl get pods -n noclue-app`
- [ ] Check service status: `kubectl get svc -n noclue-app`
- [ ] Check recent events: `kubectl get events -n noclue-app --sort-by='.lastTimestamp'`
- [ ] Collect logs: `kubectl logs -l app=service-name -n noclue-app > incident.log`
- [ ] Document timeline and actions taken

### After Recovery

- [ ] Verify all services operational
- [ ] Check database integrity
- [ ] Review logs for root cause
- [ ] Update runbooks if needed
- [ ] Schedule post-mortem meeting
- [ ] Implement preventive measures
- [ ] Test recovery procedures

## Maintenance Mode

### Enable Maintenance Mode

```bash
# 1. Create maintenance page deployment
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: maintenance
  namespace: noclue-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: maintenance
  template:
    metadata:
      labels:
        app: maintenance
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
EOF

# 2. Scale down all services
kubectl scale deployment frontend user-service question-service \
  matching-service collaboration-service --replicas=0 -n noclue-app

# 3. Point LoadBalancer to maintenance page
kubectl patch service frontend-service -n noclue-app \
  -p '{"spec":{"selector":{"app":"maintenance"}}}'
```

### Disable Maintenance Mode

```bash
# 1. Restore LoadBalancer selector
kubectl patch service frontend-service -n noclue-app \
  -p '{"spec":{"selector":{"app":"frontend"}}}'

# 2. Scale up services
kubectl scale deployment frontend user-service question-service \
  matching-service collaboration-service --replicas=2 -n noclue-app

# 3. Remove maintenance deployment
kubectl delete deployment maintenance -n noclue-app
```

## Prevention

### Regular Health Checks

```bash
# Run weekly
kubectl get nodes
kubectl get pods -n noclue-app
kubectl top nodes
kubectl top pods -n noclue-app
gcloud container images list --repository=gcr.io/$GCP_PROJECT_ID
```

### Automated Backups

**Setup daily backups** (add to cron or GitHub Actions)
```bash
#!/bin/bash
# backup.sh - Run daily

DATE=$(date +%Y%m%d)

# Backup K8s resources
kubectl get all -n noclue-app -o yaml > "backups/k8s_$DATE.yaml"

# Backup database
supabase db dump -f "backups/db_$DATE.sql"

# Upload to GCS
gsutil cp backups/* gs://noclue-backups/
```

### Monitoring Setup

```bash
# Set up Google Cloud Monitoring alerts
# 1. Go to: https://console.cloud.google.com/monitoring
# 2. Create alert policies for:
#    - Pod crash rate > 5%
#    - CPU usage > 80%
#    - Memory usage > 80%
#    - LoadBalancer unhealthy
#    - Disk usage > 80%
```

## Testing Recovery

### Test Recovery Procedures Quarterly

```bash
# 1. Create test namespace
kubectl create namespace test-recovery

# 2. Deploy test service
kubectl apply -f k8s/user-service-deployment.yaml -n test-recovery
kubectl apply -f k8s/user-service-service.yaml -n test-recovery

# 3. Simulate failure
kubectl delete pod -n test-recovery --all

# 4. Verify auto-recovery
kubectl get pods -n test-recovery -w

# 5. Test manual recovery
kubectl rollout undo deployment/user-service -n test-recovery

# 6. Cleanup
kubectl delete namespace test-recovery
```

## Contact Information

### On-Call Rotation
```
Primary: [Name] - [Contact]
Secondary: [Name] - [Contact]
Escalation: [Team Lead] - [Contact]
```

### External Support
```
GCP Support: https://cloud.google.com/support
Supabase Support: https://supabase.com/dashboard (Support tab)
GitHub Support: https://support.github.com
```

## Additional Resources

- [Setup Guide](./SETUP.md) - Initial configuration
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues
- GKE Documentation: https://cloud.google.com/kubernetes-engine/docs
- Supabase Documentation: https://supabase.com/docs
- Kubernetes Documentation: https://kubernetes.io/docs

## Disaster Recovery Metrics

Track these metrics after incidents:
- **RTO (Recovery Time Objective)**: Target < 15 minutes
- **RPO (Recovery Point Objective)**: Target < 5 minutes
- **MTTR (Mean Time To Recovery)**: Track and improve
- **Backup Success Rate**: Target 100%
- **Test Recovery Success Rate**: Target 100%
