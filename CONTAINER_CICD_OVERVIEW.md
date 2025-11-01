# Container & CI/CD Pipeline Overview

## Containerization Strategy

### Multi-Stage Docker Builds
- **Base Image**: Node 20 Alpine (lightweight, production-ready)
- **Architecture**: 3-stage builds for all backend services
  - Stage 1: Build common shared package
  - Stage 2: Build service with dependencies
  - Stage 3: Production runtime (optimized, only dist + node_modules)
- **Services Containerized**:
  - user-service (port 4001)
  - question-service (port 4002)
  - matching-service (port 4003)
  - collaboration-service (port 4004)
  - frontend

### Image Management
- **Registry**: Google Container Registry (GCR)
- **Tagging Strategy**: Dual tags per build
  - `$GITHUB_SHA` (commit-specific for rollback)
  - `latest` (always points to most recent)

## CI/CD Pipeline

### GitHub Actions Workflow
**Trigger**: Push to `main` branch (excludes `.md` files)

**Pipeline Stages**:
1. **Build & Test**
   - Checkout code
   - Install dependencies (`npm ci`)
   - Build common package
   - Run tests

2. **Authenticate & Push**
   - GCP authentication via service account
   - Configure Docker for GCR
   - Build 5 Docker images in parallel
   - Push with SHA + latest tags

3. **Deploy to GKE**
   - Get GKE credentials (cluster: `noclue-cluster`, zone: `us-central1-a`)
   - Run setup script (`setup-gke.sh`)
   - Deploy services script with secrets injection
   - Output service URLs

## Kubernetes Deployment

### Cluster Configuration
- **Platform**: Google Kubernetes Engine (GKE)
- **Namespace**: `noclue-app`
- **Deployment Strategy**: Rolling updates (default K8s behavior)

### Service Architecture
- **Frontend**: LoadBalancer service (public-facing)
- **Backend Services**: ClusterIP (internal service-to-service)
- **Service Discovery**: Kubernetes DNS
  - Example: `http://user-service.noclue-app.svc.cluster.local:4001`

### Configuration & Secrets
- **Secret Management**: Kubernetes Secrets
  - Supabase credentials stored as K8s secrets
  - Injected via `secretRef` and `secretKeyRef`
- **Environment Variables**:
  - Service URLs for inter-service communication
  - Port configurations
  - CORS origins

### Observability
- **Health Checks**:
  - Liveness Probe: `/health` endpoint (30s initial delay, 10s period)
  - Readiness Probe: `/health` endpoint (10s initial delay, 5s period)
- **Resource Limits**:
  - Requests: 128Mi memory, 100m CPU
  - Limits: 256Mi memory, 200m CPU

## Local Development

### Docker Compose Setup
**File**: `docker-compose.kafka.yml`

**Services**:
- **Kafka**: Message broker (port 9092)
- **Zookeeper**: Kafka coordination (port 2181)
- **Redis**: Caching layer (port 6379)
- **Kafka UI**: Web interface for Kafka monitoring (port 8080)

**Network**: Shared bridge network (`kafka-network`)

## Deployment Flow Summary
```
Code Push → GitHub Actions Triggered
    ↓
Build Common Package → Run Tests
    ↓
Build & Push 5 Docker Images to GCR
    ↓
Authenticate to GKE Cluster
    ↓
Deploy/Update K8s Resources
    ↓
Health Checks Pass → Services Live
```

## Key Design Decisions

1. **Multi-stage builds**: Reduces final image size, separates build/runtime dependencies
2. **Commit SHA tagging**: Enables easy rollback to specific versions
3. **Shared common package**: Code reuse across microservices, built once per deploy
4. **Health probes**: Ensures zero-downtime deployments with readiness checks
5. **Resource limits**: Prevents resource exhaustion, enables predictable scaling
6. **ClusterIP for backend**: Security through isolation, only frontend exposed publicly
