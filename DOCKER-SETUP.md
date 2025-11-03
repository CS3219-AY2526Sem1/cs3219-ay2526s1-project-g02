# Docker Setup for NoClue Development

This guide explains how to run the entire NoClue application stack using Docker Compose.

## 🚀 Quick Start

### Prerequisites

- Docker Desktop installed and running
- Your Supabase credentials (already configured in `.env.docker`)

### Start Everything

```bash
# Make the helper script executable (first time only)
chmod +x docker-compose.sh

# Start all services
./docker-compose.sh up
```

That's it! The entire application is now running:

- **Frontend**: http://localhost:3000
- **User Service**: http://localhost:4001
- **Question Service**: http://localhost:4002
- **Matching Service**: http://localhost:4003
- **Collaboration Service**: http://localhost:4004

### Stop Everything

```bash
./docker-compose.sh down
```

---

## 📚 Helper Script Commands

The `docker-compose.sh` script provides convenient commands:

### Starting & Stopping

```bash
./docker-compose.sh up        # Start all services
./docker-compose.sh down      # Stop all services
./docker-compose.sh restart   # Restart all services
```

### Building

```bash
./docker-compose.sh build     # Build all services
./docker-compose.sh rebuild   # Rebuild from scratch (no cache)
```

### Monitoring

```bash
./docker-compose.sh ps        # Show running services
./docker-compose.sh logs      # View all logs (follow mode)
./docker-compose.sh logs user-service  # View specific service logs
```

### Debugging

```bash
./docker-compose.sh shell user-service     # Open shell in container
./docker-compose.sh shell frontend         # Open shell in frontend
```

### Cleanup

```bash
./docker-compose.sh clean     # Stop services and remove volumes
```

---

## 🔧 Manual Docker Compose Commands

If you prefer to use `docker-compose` directly:

```bash
# Start services
docker-compose --env-file .env.docker up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild a specific service
docker-compose build user-service

# Restart a specific service
docker-compose restart user-service
```

---

## 🏗️ Architecture

The Docker Compose setup includes:

### Services

1. **user-service** (Port 4001)
   - User authentication and management
   - GraphQL endpoint at `/graphql`

2. **question-service** (Port 4002)
   - Question bank and retrieval

3. **matching-service** (Port 4003)
   - User matching for collaborative sessions

4. **collaboration-service** (Port 4004)
   - Real-time collaboration with Yjs
   - WebSocket port: 1234

5. **frontend** (Port 3000)
   - Next.js application

### Network

All services are connected via a Docker bridge network (`noclue-network`) and can communicate with each other using service names.

### Health Checks

Each service has health checks that ensure:
- Service is responsive
- Health endpoint returns 200 OK
- Auto-restart on failure

---

## 🔐 Environment Variables

The `.env.docker` file contains all necessary configuration:

```env
SUPABASE_URL=https://ycfsdvlowgsvxngtekwc.supabase.co
SUPABASE_KEY=sb_publishable_...
SUPABASE_SERVICE_KEY=sb_secret_...
NODE_ENV=production
CORS_ORIGIN=http://localhost:3000
```

⚠️ **Note**: This file contains your actual credentials and is committed to the repo. For team development, consider:
- Using `.env.docker.local` (gitignored)
- Using Docker secrets for production
- Using environment-specific files

---

## 🐛 Troubleshooting

### Services won't start

```bash
# Check service status
./docker-compose.sh ps

# View logs for errors
./docker-compose.sh logs

# Rebuild from scratch
./docker-compose.sh rebuild
./docker-compose.sh up
```

### Port conflicts

If ports are already in use:

```bash
# Check what's using the port
lsof -i :3000
lsof -i :4001

# Kill the process or change ports in docker-compose.yml
```

### Service can't connect to another service

```bash
# Check if all services are running
./docker-compose.sh ps

# Check network connectivity
./docker-compose.sh shell user-service
# Inside container:
curl http://question-service:4002/health
```

### Memory issues

Docker may run out of memory:

```bash
# Check Docker Desktop settings
# Increase memory allocation to at least 4GB

# Or reduce services by commenting out in docker-compose.yml
```

### Rebuild after code changes

```bash
# Rebuild specific service
docker-compose build user-service
./docker-compose.sh restart

# Or rebuild everything
./docker-compose.sh rebuild
./docker-compose.sh up
```

---

## 🔄 Development Workflow

### Making Changes

1. **Code changes are not automatically reflected** - Docker containers run the built code
2. After making changes, rebuild the service:

```bash
./docker-compose.sh rebuild
./docker-compose.sh up
```

### For rapid development with hot-reload

Use npm scripts instead of Docker:

```bash
# Terminal 1 - User Service
npm run dev:user

# Terminal 2 - Question Service
npm run dev:question

# Terminal 3 - Matching Service
npm run dev:matching

# Terminal 4 - Collaboration Service
npm run dev:collaboration

# Terminal 5 - Frontend
npm run dev:frontend
```

### When to use Docker vs npm

**Use Docker when:**
- Testing production-like environment
- Ensuring consistency across team
- Running full integration tests
- Demonstrating the complete system

**Use npm when:**
- Actively developing a specific service
- Need hot-reload for faster iteration
- Debugging code changes

---

## 📊 Monitoring Services

### Check Service Health

```bash
# User Service
curl http://localhost:4001/health

# Question Service
curl http://localhost:4002/health

# Matching Service
curl http://localhost:4003/health

# Collaboration Service
curl http://localhost:4004/health
```

### View Service Logs

```bash
# All services
./docker-compose.sh logs

# Specific service
./docker-compose.sh logs user-service -f

# Last 100 lines
docker-compose logs --tail=100 user-service
```

### Resource Usage

```bash
# View container stats
docker stats

# Check Docker Desktop dashboard for detailed metrics
```

---

## 🚢 Additional Infrastructure

### Kafka & Redis (Optional)

If your services use Kafka or Redis:

```bash
# Start Kafka infrastructure
docker-compose -f docker-compose.kafka.yml up -d

# This starts:
# - Zookeeper (port 2181)
# - Kafka (port 9092)
# - Kafka UI (port 8080)
# - Redis (port 6379)

# Access Kafka UI
open http://localhost:8080
```

---

## 🎯 Next Steps

1. **Start the stack**: `./docker-compose.sh up`
2. **Open frontend**: http://localhost:3000
3. **Test GraphQL**: http://localhost:4001/graphql
4. **View logs**: `./docker-compose.sh logs`
5. **Stop when done**: `./docker-compose.sh down`

For local development with hot-reload, see the main README for npm commands.
