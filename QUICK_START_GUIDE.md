# Quick Start: Test Your CI/CD and Pub/Sub Fixes

## What Was Fixed

✅ **CI/CD Pipeline**
- Added LLM service Docker build/push
- Added Pub/Sub authentication setup
- Added Pub/Sub topics initialization
- Enabled testing on feature branches (dev, feature/*, fix/*)

✅ **Pub/Sub Authentication**
- Created automated setup script
- Updated all service deployments with credentials
- Added verification to deployment script
- Created comprehensive documentation

## How to Test (3 Simple Steps)

### Step 1: Push to a Test Branch

```bash
# Create a test branch
git checkout -b dev

# Stage all changes
git add .

# Commit
git commit -m "Fix CI/CD and Pub/Sub authentication"

# Push to trigger GitHub Actions
git push origin dev
```

### Step 2: Watch the CI/CD Pipeline

Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/actions

Look for the "Build and Deploy to GKE" workflow running on your `dev` branch.

**The pipeline will**:
1. ✅ Build all Docker images (including LLM service)
2. ✅ Setup Pub/Sub authentication
3. ✅ Create Pub/Sub topics and subscriptions
4. ✅ Deploy all services to GKE

### Step 3: Verify It Works

After deployment completes, check the logs:

```bash
# Check Matching Service
kubectl logs -f deployment/matching-service -n noclue-app | grep PubSub

# Check Question Service
kubectl logs -f deployment/question-service -n noclue-app | grep PubSub

# Check Collaboration Service
kubectl logs -f deployment/collaboration-service -n noclue-app | grep PubSub
```

**You should see**:
```
[PubSub] Initialized with project: noclue-476404
[PubSub] Subscribed to matching-queue-sub
✅ Success!
```

## If You See Errors

### "GCP_PROJECT_ID environment variable is required"

**Issue**: Pub/Sub config not set up

**Fix**:
```bash
# Run locally to test
export GCP_PROJECT_ID="noclue-476404"
./scripts/setup-pubsub-auth.sh
```

### "Permission denied" or "User not authorized"

**Issue**: Service account needs permissions

**Fix**:
```bash
# Re-run setup script
GCP_PROJECT_ID=noclue-476404 ./scripts/setup-pubsub-auth.sh
```

### "Topic not found"

**Issue**: Pub/Sub topics not created

**Fix**:
```bash
# Create topics
npm run setup:pubsub
```

## Manual Testing (Alternative)

If you want to test locally without CI/CD:

```bash
# 1. Setup Pub/Sub authentication
export GCP_PROJECT_ID="noclue-476404"
./scripts/setup-pubsub-auth.sh

# 2. Create topics
npm run setup:pubsub

# 3. Deploy
./scripts/deploy-services.sh

# 4. Check logs
kubectl logs deployment/matching-service -n noclue-app
```

## What Each Microservice Now Has

Each service (Matching, Question, Collaboration) now has:

1. **Environment Variables** (from ConfigMap):
   - `GCP_PROJECT_ID` = your project ID
   - `GCP_KEY_FILENAME` = /etc/gcp/key.json

2. **Service Account Key** (mounted as volume):
   - Path: `/etc/gcp/key.json`
   - Source: Kubernetes secret `pubsub-key`

3. **Can now**:
   - ✅ Publish messages to Pub/Sub topics
   - ✅ Subscribe to Pub/Sub subscriptions
   - ✅ Authenticate automatically

## Complete Documentation

For more details, see:

1. **[CICD_PUBSUB_FIXES_SUMMARY.md](./CICD_PUBSUB_FIXES_SUMMARY.md)** - Complete list of all changes
2. **[docs/PUBSUB_AUTH_SETUP.md](./docs/PUBSUB_AUTH_SETUP.md)** - Production authentication guide
3. **[docs/PUBSUB_INTEGRATION.md](./docs/PUBSUB_INTEGRATION.md)** - Pub/Sub architecture and usage

## Ready to Deploy to Production?

When you're confident everything works:

```bash
# Merge to main
git checkout main
git merge dev
git push origin main

# CI/CD will automatically deploy to production
```

## Questions?

Check the troubleshooting guides:
- [CICD_PUBSUB_FIXES_SUMMARY.md](./CICD_PUBSUB_FIXES_SUMMARY.md) - Common issues
- [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) - General troubleshooting
- [docs/PUBSUB_AUTH_SETUP.md](./docs/PUBSUB_AUTH_SETUP.md) - Pub/Sub specific issues

---

**TL;DR**: Just push to `dev` branch and watch GitHub Actions! Everything is automated. 🚀

