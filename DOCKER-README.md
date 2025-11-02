# Docker Setup Guide

This guide explains how to run the NoClue platform using Docker Compose with centralized environment configuration.

## Quick Start

### 1. Set up environment variables

We use a **centralized `.env` file** in the root directory for all Docker services:

```bash
# Copy the template
cp .env.docker .env

# OR use the setup script
./docker-setup.sh
```

### 2. Review and update `.env`

Edit the `.env` file with your actual credentials:

```bash
# Required: Update with your Supabase credentials
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Required: Update for production
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
```

### 3. Build and run

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up

# Or run in detached mode
docker-compose up -d
```

### 4. Access the application

- Frontend: http://localhost:3000
- User Service GraphQL: http://localhost:4001/graphql
- Question Service GraphQL: http://localhost:4002/graphql
- Matching Service GraphQL: http://localhost:4003/graphql
- Collaboration Service GraphQL: http://localhost:4004/graphql

## Environment Configuration

### Centralized `.env` File

All environment variables are now managed in a **single `.env` file** at the root directory. This eliminates the need for separate `.env` files in each service when running with Docker.

**What's included:**

```bash
# Supabase Configuration
SUPABASE_URL=...
SUPABASE_KEY=...
SUPABASE_SERVICE_KEY=...

# GCP Configuration
GCP_PROJECT_ID=noclue-476404

# Redis Configuration (for matching queue)
REDIS_HOST=redis
REDIS_PORT=6379

# Application Configuration
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# NextAuth Configuration
NEXTAUTH_SECRET=...
```

### How It Works

1. **Docker Compose** automatically reads `.env` file from the same directory
2. Variables are referenced in `docker-compose.yml` using `${VARIABLE_NAME}` syntax
3. Each service receives only the environment variables it needs
4. No need to maintain separate `.env` files for each service

## Services Architecture

### Infrastructure Services

- **Redis**: In-memory cache for matching queue
- **Pub/Sub Emulator**: Google Cloud Pub/Sub emulator for local development

### Backend Services

- **User Service** (Port 4001): User authentication and management
- **Question Service** (Port 4002): Question catalog and assignment
- **Matching Service** (Port 4003): User matching algorithm
- **Collaboration Service** (Port 4004): Real-time collaboration sessions

### Frontend

- **Next.js App** (Port 3000): React frontend application

## Development Workflow

### Rebuilding After Changes

If you modify code or environment variables:

```bash
# Rebuild specific service
docker-compose build user-service

# Rebuild all services
docker-compose build

# Rebuild without cache
docker-compose build --no-cache
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f user-service

# Last 100 lines
docker-compose logs --tail=100 -f
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Troubleshooting

### Port 4000 Connection Refused

**Problem**: Frontend tries to connect to port 4000

**Solution**: The default fallback in `next.config.js` has been updated to port 4001. Rebuild the frontend:

```bash
docker-compose build frontend
docker-compose up
```

### Services Can't Connect to Each Other

**Problem**: Services show connection refused errors

**Solution**: Ensure services use Docker network names (e.g., `user-service:4001`) for inter-service communication, not `localhost`.

### Environment Variables Not Updated

**Problem**: Changes to `.env` don't take effect

**Solution**:
1. Stop services: `docker-compose down`
2. Rebuild: `docker-compose build`
3. Restart: `docker-compose up`

For Next.js frontend specifically, environment variables are **baked into the build**, so you must rebuild:

```bash
docker-compose build frontend
```

### Redis Connection Errors

**Problem**: Matching service can't connect to Redis

**Solution**: Ensure Redis service is running:

```bash
docker-compose ps redis
docker-compose logs redis
```

## Local Development vs Docker

### When to Use Docker Compose

- Testing the full stack together
- Reproducing production-like environment
- Sharing setup with team members
- Testing service-to-service communication

### When to Run Services Individually

- Faster development iteration on a single service
- Debugging specific service issues
- Using development tools (debuggers, hot reload)

To run services individually, each service has its own `.env` file in:
- `backend/services/user-service/.env`
- `backend/services/question-service/.env`
- `backend/services/matching-service/.env`
- `backend/services/collaboration-service/.env`

## Production Deployment

For production deployment to GKE:

1. Environment variables are injected via Kubernetes secrets and ConfigMaps
2. Redis uses GCP Memorystore (10.175.68.99:6379)
3. Pub/Sub uses real GCP Pub/Sub (no emulator)
4. See `k8s/` directory for Kubernetes configurations

## Additional Resources

- [Developer Setup Guide](./DEVELOPER-SETUP.md)
- [Setup Complete Documentation](./SETUP-COMPLETE.md)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
