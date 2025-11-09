# Pub/Sub Authentication Setup for Production

This guide explains how to configure Google Cloud Pub/Sub authentication for the NoClue microservices in a production GKE environment.

## Overview

Each microservice (Matching, Question, and Collaboration) needs to authenticate with Google Cloud Pub/Sub to publish and subscribe to messages. This document covers two authentication methods:

1. **Service Account Key (Simpler)** - Uses a JSON key file mounted as a Kubernetes secret
2. **Workload Identity (Recommended)** - Uses GKE's Workload Identity for better security

## Prerequisites

- GKE cluster is running
- `kubectl` configured to access your cluster
- `gcloud` CLI installed and authenticated
- GCP project with Pub/Sub API enabled

## Method 1: Service Account Key (Quick Setup)

This method uses a service account JSON key file. It's simpler but less secure than Workload Identity.

### Step 1: Run the Setup Script

The automated script creates everything you need:

```bash
# Set your GCP project ID
export GCP_PROJECT_ID="your-project-id"

# Run the setup script
./scripts/setup-pubsub-auth.sh
```

This script will:
1. Create a service account named `pubsub-service`
2. Grant necessary Pub/Sub permissions (Publisher, Subscriber, Viewer)
3. Generate a JSON key file: `pubsub-service-key.json`
4. Create a Kubernetes secret `pubsub-key` with the key
5. Create a ConfigMap `pubsub-config` with your project ID

### Step 2: Verify Setup

Check that the Kubernetes resources were created:

```bash
# Check the secret
kubectl get secret pubsub-key -n noclue-app
kubectl describe secret pubsub-key -n noclue-app

# Check the configmap
kubectl get configmap pubsub-config -n noclue-app
kubectl get configmap pubsub-config -n noclue-app -o yaml
```

### Step 3: Initialize Pub/Sub Topics

```bash
# Create topics and subscriptions
npm run setup:pubsub
```

### Step 4: Deploy Services

```bash
# Deploy all services (they will now have Pub/Sub credentials)
./scripts/deploy-services.sh
```

### Security Notes

⚠️ **Important**: The `pubsub-service-key.json` file contains sensitive credentials:
- **DO NOT** commit it to git (it's in `.gitignore`)
- Store it securely (e.g., in a password manager or encrypted vault)
- Rotate the key periodically
- Delete the local file after deployment: `rm pubsub-service-key.json`

## Method 2: Workload Identity (Production Best Practice)

Workload Identity allows GKE pods to authenticate as service accounts without using key files.

### Why Use Workload Identity?

✅ No key files to manage or rotate
✅ Better security (no keys to leak)
✅ Easier auditing and permission management
✅ Automatic credential rotation

### Step 1: Enable Workload Identity on Cluster

If you haven't already enabled it:

```bash
# Enable Workload Identity on existing cluster
gcloud container clusters update noclue-cluster \
  --workload-pool=${GCP_PROJECT_ID}.svc.id.goog \
  --zone=us-central1-a

# Update node pool
gcloud container node-pools update default-pool \
  --cluster=noclue-cluster \
  --workload-metadata=GKE_METADATA \
  --zone=us-central1-a
```

### Step 2: Create Google Service Account

```bash
export GCP_PROJECT_ID="your-project-id"
export GSA_NAME="pubsub-service"
export GSA_EMAIL="${GSA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

# Create service account
gcloud iam service-accounts create ${GSA_NAME} \
  --display-name="Pub/Sub Service Account for Microservices" \
  --project=${GCP_PROJECT_ID}

# Grant Pub/Sub permissions
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:${GSA_EMAIL}" \
  --role="roles/pubsub.publisher"

gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:${GSA_EMAIL}" \
  --role="roles/pubsub.subscriber"

gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:${GSA_EMAIL}" \
  --role="roles/pubsub.viewer"
```

### Step 3: Create Kubernetes Service Accounts

```bash
export NAMESPACE="noclue-app"

# Create service accounts for each microservice
for SERVICE in matching-service question-service collaboration-service; do
  kubectl create serviceaccount ${SERVICE}-sa -n ${NAMESPACE} || true
done
```

### Step 4: Bind K8s SA to Google SA

```bash
# Allow Kubernetes service accounts to act as the Google service account
for SERVICE in matching-service question-service collaboration-service; do
  gcloud iam service-accounts add-iam-policy-binding ${GSA_EMAIL} \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:${GCP_PROJECT_ID}.svc.id.goog[${NAMESPACE}/${SERVICE}-sa]" \
    --project=${GCP_PROJECT_ID}
    
  # Annotate the Kubernetes service account
  kubectl annotate serviceaccount ${SERVICE}-sa \
    -n ${NAMESPACE} \
    iam.gke.io/gcp-service-account=${GSA_EMAIL} \
    --overwrite
done
```

### Step 5: Update Deployments to Use Workload Identity

Update each service deployment to use the service account:

```yaml
# Example for matching-service-deployment.yaml
spec:
  template:
    spec:
      serviceAccountName: matching-service-sa  # Add this line
      containers:
      - name: matching-service
        # ... rest of configuration
        env:
        - name: GCP_PROJECT_ID
          value: "your-project-id"
        # Remove GCP_KEY_FILENAME - not needed with Workload Identity
```

Apply changes:

```bash
# Update deployments
kubectl apply -f k8s/matching-service-deployment.yaml
kubectl apply -f k8s/question-service-deployment.yaml
kubectl apply -f k8s/collaboration-service-deployment.yaml
```

### Step 6: Verify Workload Identity

Test that a pod can authenticate:

```bash
# Get a shell in a pod
kubectl exec -it deployment/matching-service -n noclue-app -- /bin/sh

# Inside the pod, test authentication
gcloud auth list
# Should show: pubsub-service@your-project-id.iam.gserviceaccount.com

# Test Pub/Sub access
gcloud pubsub topics list --project=your-project-id
```

## CI/CD Integration

### GitHub Actions Setup

The CI/CD pipeline needs to set up Pub/Sub authentication before deploying:

```yaml
# .github/workflows/deploy.yml
- name: Setup Pub/Sub Authentication
  run: |
    chmod +x ./scripts/setup-pubsub-auth.sh
    ./scripts/setup-pubsub-auth.sh
  env:
    GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
    NAMESPACE: noclue-app

- name: Setup Pub/Sub Topics
  run: |
    npm install -g ts-node
    npm run setup:pubsub
  env:
    GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
```

### Required GitHub Secrets

Ensure these secrets are configured in your GitHub repository:

- `GCP_PROJECT_ID` - Your GCP project ID
- `GCP_SA_KEY` - Service account key with permissions to:
  - Create service accounts
  - Grant IAM permissions
  - Create Kubernetes secrets
  - Create Pub/Sub topics and subscriptions

## Troubleshooting

### Issue: "Permission denied" errors in logs

**Symptoms**: Service logs show authentication failures like:
```
Error: User not authorized to perform this action.
```

**Solutions**:
1. Check service account permissions:
   ```bash
   gcloud projects get-iam-policy ${GCP_PROJECT_ID} \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:pubsub-service@*"
   ```

2. Verify the secret is mounted correctly:
   ```bash
   kubectl exec -it deployment/matching-service -n noclue-app -- \
     cat /etc/gcp/key.json
   ```

### Issue: Services can't find topics

**Symptoms**: Logs show "Topic not found" errors.

**Solutions**:
```bash
# List existing topics
gcloud pubsub topics list --project=${GCP_PROJECT_ID}

# Create topics if missing
npm run setup:pubsub

# Verify subscriptions
gcloud pubsub subscriptions list --project=${GCP_PROJECT_ID}
```

### Issue: Workload Identity not working

**Symptoms**: Pod can't authenticate with error like "Could not load the default credentials".

**Solutions**:
1. Verify Workload Identity is enabled:
   ```bash
   gcloud container clusters describe noclue-cluster \
     --zone=us-central1-a \
     --format="value(workloadIdentityConfig.workloadPool)"
   ```

2. Check service account annotation:
   ```bash
   kubectl get sa matching-service-sa -n noclue-app -o yaml
   ```
   Should show:
   ```yaml
   metadata:
     annotations:
       iam.gke.io/gcp-service-account: pubsub-service@PROJECT.iam.gserviceaccount.com
   ```

3. Verify IAM binding:
   ```bash
   gcloud iam service-accounts get-iam-policy \
     pubsub-service@${GCP_PROJECT_ID}.iam.gserviceaccount.com
   ```

### Issue: Environment variables not set

**Symptoms**: Service logs show "GCP_PROJECT_ID environment variable is required".

**Solutions**:
```bash
# Check if ConfigMap exists
kubectl get configmap pubsub-config -n noclue-app -o yaml

# If missing, create it
kubectl create configmap pubsub-config \
  --from-literal=GCP_PROJECT_ID=${GCP_PROJECT_ID} \
  -n noclue-app
```

## Monitoring

### Check Service Logs

```bash
# Matching Service
kubectl logs -f deployment/matching-service -n noclue-app | grep -i pubsub

# Question Service
kubectl logs -f deployment/question-service -n noclue-app | grep -i pubsub

# Collaboration Service
kubectl logs -f deployment/collaboration-service -n noclue-app | grep -i pubsub
```

Look for log lines like:
```
[PubSub] Initialized with project: your-project-id
[PubSub] Subscribed to matching-queue-sub
[PubSub] Published message xxx to topic matching-queue
```

### Monitor Pub/Sub Metrics

```bash
# Check undelivered messages
gcloud pubsub subscriptions list --project=${GCP_PROJECT_ID}

# Pull a message to test
gcloud pubsub subscriptions pull matching-queue-sub \
  --limit=1 \
  --project=${GCP_PROJECT_ID}
```

## Best Practices

1. **Use Workload Identity in production** - More secure than key files
2. **Rotate service account keys** - If using key files, rotate them every 90 days
3. **Use least privilege** - Grant only the permissions each service needs
4. **Monitor Pub/Sub usage** - Set up alerts for failed publishes/subscriptions
5. **Test in staging first** - Verify Pub/Sub works before deploying to production
6. **Enable audit logging** - Track Pub/Sub API calls for security

## Migration from Service Account Keys to Workload Identity

If you're currently using service account keys and want to migrate to Workload Identity:

1. Follow the Workload Identity setup steps above
2. Update deployments to use Workload Identity
3. Deploy and test thoroughly
4. Once verified, remove the old secret:
   ```bash
   kubectl delete secret pubsub-key -n noclue-app
   ```
5. Delete or disable the old service account keys in GCP Console

## Additional Resources

- [Google Cloud Pub/Sub Documentation](https://cloud.google.com/pubsub/docs)
- [GKE Workload Identity Documentation](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)
- [IAM Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [Pub/Sub Access Control](https://cloud.google.com/pubsub/docs/access-control)

## Support

For issues or questions:
1. Check service logs: `kubectl logs deployment/SERVICE_NAME -n noclue-app`
2. Review this troubleshooting guide
3. Check the main [PUBSUB_INTEGRATION.md](./PUBSUB_INTEGRATION.md) guide
4. Consult [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for general issues

