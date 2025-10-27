# Kubernetes Deployment Flow

This document visualizes the deployment flow when running `deploy-services.sh`.

## Deployment Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│                    deploy-services.sh START                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Prerequisites Check                                      │
│ ─────────────────────────────────────────────────────────────── │
│ ✓ Check kubectl installed                                        │
│ ✓ Check gcloud installed (optional)                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Cluster Connectivity                                     │
│ ─────────────────────────────────────────────────────────────── │
│ ✓ Verify kubectl can connect to cluster                         │
│ ✓ Display current context                                       │
│ ✓ Validate cluster accessibility                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Namespace Setup                                          │
│ ─────────────────────────────────────────────────────────────── │
│ ✓ Check if 'noclue-app' namespace exists                        │
│ ✓ Create namespace if needed                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Secret Management                                        │
│ ─────────────────────────────────────────────────────────────── │
│ Option A: Environment Variables                                  │
│   ├─ Read SUPABASE_URL                                          │
│   ├─ Read SUPABASE_SECRET_KEY                                   │
│   └─ Read SUPABASE_PUBLISHABLE_KEY                              │
│   └─ Create/Update 'supabase-secrets' in K8s                    │
│                                                                  │
│ Option B: secrets.yaml File                                      │
│   ├─ Validate no REPLACE_IN_CICD placeholders                   │
│   └─ Apply secrets.yaml to cluster                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Manifest Preparation                                     │
│ ─────────────────────────────────────────────────────────────── │
│ ✓ Create temporary directory for modified manifests             │
│ ✓ Copy deployment manifests                                     │
│ ✓ Replace PROJECT_ID placeholder with actual value              │
│ ✓ Update image paths to gcr.io/PROJECT_ID/SERVICE:latest        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: Apply Kubernetes Services                                │
│ ─────────────────────────────────────────────────────────────── │
│ ✓ user-service-service.yaml                                     │
│ ✓ question-service-service.yaml                                 │
│ ✓ matching-service-service.yaml                                 │
│ ✓ collaboration-service-service.yaml                             │
│ ✓ frontend-service.yaml                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 7: Deploy Microservices (In Order)                          │
│ ─────────────────────────────────────────────────────────────── │
│ 1. user-service-deployment.yaml          [Port 4001]            │
│    └─ kubectl apply -f ...                                      │
│    └─ Wait 2s                                                   │
│                                                                  │
│ 2. question-service-deployment.yaml      [Port 4002]            │
│    └─ kubectl apply -f ...                                      │
│    └─ Wait 2s                                                   │
│                                                                  │
│ 3. matching-service-deployment.yaml      [Port 4003]            │
│    └─ kubectl apply -f ...                                      │
│    └─ Wait 2s                                                   │
│                                                                  │
│ 4. collaboration-service-deployment.yaml [Port 4004]            │
│    └─ kubectl apply -f ...                                      │
│    └─ Wait 2s                                                   │
│                                                                  │
│ 5. frontend-deployment.yaml              [Port 3000]            │
│    └─ kubectl apply -f ...                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 8: Wait for Deployments to be Ready                         │
│ ─────────────────────────────────────────────────────────────── │
│ For each deployment (5 minute timeout):                          │
│   ├─ kubectl rollout status deployment/SERVICE                  │
│   ├─ Wait for all replicas to be ready                          │
│   └─ Show pod status if fails                                   │
│                                                                  │
│ ✓ user-service         [2/2 replicas ready]                     │
│ ✓ question-service     [2/2 replicas ready]                     │
│ ✓ matching-service     [2/2 replicas ready]                     │
│ ✓ collaboration-service [2/2 replicas ready]                    │
│ ✓ frontend             [2/2 replicas ready]                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 9: Health Checks                                            │
│ ─────────────────────────────────────────────────────────────── │
│ For each service:                                                │
│   ├─ Get first pod for deployment                               │
│   ├─ Execute: curl http://localhost:PORT/health                 │
│   └─ Report success/failure                                     │
│                                                                  │
│ ✓ user-service         (GET /health)                            │
│ ✓ question-service     (GET /health)                            │
│ ✓ matching-service     (GET /health)                            │
│ ✓ collaboration-service (GET /health)                           │
│ ✓ frontend             (GET /)                                  │
│                                                                  │
│ Summary: 5 passed, 0 failed                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 10: Display Service URLs                                    │
│ ─────────────────────────────────────────────────────────────── │
│ For each service:                                                │
│   ├─ Get service type (ClusterIP/LoadBalancer/NodePort)         │
│   ├─ Get external IP (if LoadBalancer)                          │
│   └─ Display URL                                                │
│                                                                  │
│ user-service:                                                    │
│   Type: ClusterIP                                                │
│   URL:  http://10.x.x.x:4001 (internal only)                    │
│                                                                  │
│ question-service:                                                │
│   Type: ClusterIP                                                │
│   URL:  http://10.x.x.x:4002 (internal only)                    │
│                                                                  │
│ [... similar for other services ...]                            │
│                                                                  │
│ Internal URLs (within cluster):                                  │
│   user-service:          http://user-service.noclue-app...      │
│   question-service:      http://question-service.noclue-app...  │
│   matching-service:      http://matching-service.noclue-app...  │
│   collaboration-service: http://collaboration-service.noclue... │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT SUMMARY                            │
│ ─────────────────────────────────────────────────────────────── │
│ ✓ All services deployed successfully                             │
│ ✓ Namespace: noclue-app                                         │
│ ✓ 5 deployments ready (10 total pods)                           │
│ ✓ 5 services created                                            │
│ ✓ Health checks passed                                          │
│                                                                  │
│ Next Steps:                                                      │
│   • Monitor: kubectl get pods -n noclue-app -w                  │
│   • Logs:    kubectl logs -n noclue-app deployment/SERVICE -f   │
│   • Access:  kubectl port-forward deployment/frontend 3000:3000 │
│                                                                  │
│ Completed at: 2025-10-27 12:57:30                               │
└─────────────────────────────────────────────────────────────────┘
```

## Resource Creation Timeline

```
Time    Action                          Resources Created/Updated
──────  ─────────────────────────────   ────────────────────────────
t+0s    Check prerequisites             -
t+2s    Verify cluster access           -
t+5s    Create namespace                Namespace: noclue-app
t+7s    Create secrets                  Secret: supabase-secrets
t+10s   Apply services                  5x Service resources
t+15s   Deploy user-service             Deployment, 2x Pods
t+45s   Wait for user-service ready     ReplicaSet, 2x Pods running
t+50s   Deploy question-service         Deployment, 2x Pods
t+80s   Wait for question-service       ReplicaSet, 2x Pods running
t+85s   Deploy matching-service         Deployment, 2x Pods
t+115s  Wait for matching-service       ReplicaSet, 2x Pods running
t+120s  Deploy collaboration-service    Deployment, 2x Pods
t+150s  Wait for collaboration-service  ReplicaSet, 2x Pods running
t+155s  Deploy frontend                 Deployment, 2x Pods
t+185s  Wait for frontend ready         ReplicaSet, 2x Pods running
t+190s  Run health checks               5x HTTP requests
t+195s  Display service URLs            -
t+200s  Deployment complete             ✓
```

## Rolling Update Flow

When updating an existing deployment:

```
┌──────────────────────────────────────┐
│  kubectl apply -f deployment.yaml     │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│  Kubernetes Rolling Update           │
│  ────────────────────────────────    │
│  1. Create new ReplicaSet            │
│  2. Start new pod (v2)               │
│  3. Wait for new pod ready           │
│  4. Terminate old pod (v1)           │
│  5. Repeat for all replicas          │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│  Service automatically routes        │
│  traffic to new pods                 │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│  ✓ Zero-downtime deployment          │
└──────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────┐
│  Error occurs during deployment      │
└─────────────────────────────────────┘
              ↓
        ┌─────────┐
        │ Log error│
        └─────────┘
              ↓
   ┌──────────────────────┐
   │ Show troubleshooting │
   │ commands             │
   └──────────────────────┘
              ↓
   ┌──────────────────────┐
   │ Display pod status   │
   │ Display recent events│
   └──────────────────────┘
              ↓
   ┌──────────────────────┐
   │ Exit with error code │
   └──────────────────────┘
```

## Dependencies Between Steps

```
Prerequisites Check ──────┐
                         │
Cluster Connectivity ─────┤
                         │
Namespace Setup ──────────┼──> Secrets Creation
                         │
Manifest Preparation ─────┘
                         │
                         ├──> Services Applied
                         │
                         ├──> Deployments Applied
                         │    │
                         │    ├──> user-service
                         │    ├──> question-service
                         │    ├──> matching-service
                         │    ├──> collaboration-service
                         │    └──> frontend
                         │
                         ├──> Wait for Ready
                         │
                         ├──> Health Checks
                         │
                         └──> Display URLs
```

## Parallel vs Sequential Operations

### Parallel (All at once)
- Applying multiple service manifests
- Waiting for multiple deployments (monitored separately)
- Running health checks across services

### Sequential (One after another)
- Creating namespace before secrets
- Creating secrets before deployments
- Deploying services in order (user → question → matching → collaboration → frontend)
- Waiting for each deployment to be ready before moving to next

## Resource States During Deployment

```
Service States:
┌────────┐    ┌────────┐    ┌────────┐
│ None   │ -> │Created │ -> │ Active │
└────────┘    └────────┘    └────────┘

Deployment States:
┌────────┐    ┌──────────┐    ┌────────────┐    ┌───────┐
│ None   │ -> │Progressing│ -> │Available   │ -> │Ready  │
└────────┘    └──────────┘    └────────────┘    └───────┘

Pod States:
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│Pending  │ -> │Creating │ -> │ Running │ -> │ Ready   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                                              (Passes probes)
```

## Success Criteria

All of the following must be true for successful deployment:

- [x] kubectl is accessible
- [x] Cluster is reachable
- [x] Namespace exists
- [x] Secrets created without errors
- [x] All service manifests applied
- [x] All deployment manifests applied
- [x] All deployments reach "Available" state within timeout
- [x] All pods pass readiness probes
- [x] Health checks return 200 OK (backend services)
- [x] Service endpoints are accessible

## Rollback Points

If deployment fails, you can rollback to previous versions:

```bash
# View rollout history
kubectl rollout history deployment/SERVICE_NAME -n noclue-app

# Rollback to previous version
kubectl rollout undo deployment/SERVICE_NAME -n noclue-app

# Rollback to specific revision
kubectl rollout undo deployment/SERVICE_NAME -n noclue-app --to-revision=2
```

## Monitoring Commands During Deployment

```bash
# Watch pod status in real-time
watch kubectl get pods -n noclue-app

# Stream deployment logs
kubectl logs -f -n noclue-app deployment/user-service

# Check deployment progress
kubectl rollout status deployment/user-service -n noclue-app

# View recent events
kubectl get events -n noclue-app --sort-by='.lastTimestamp'
```
