# Developer Setup Guide

## Prerequisites
- Node.js 20+ and npm 9+
- Docker and Docker Compose (for containerized setup)
- Google Cloud SDK with Pub/Sub emulator (optional, for local development)

## Environment Configuration

### Required Environment Files

Each backend service needs its own `.env` file with credentials. Your developers should update these files:

#### 1. **`backend/services/user-service/.env`**
#### 2. **`backend/services/question-service/.env`**
#### 3. **`backend/services/matching-service/.env`**
#### 4. **`backend/services/collaboration-service/.env`**

### Environment Variables Explained

```bash
# Supabase Configuration (get these from your Supabase project dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_publishable_key          # Publishable/anon key
SUPABASE_SERVICE_KEY=your_service_role_key # Service role key (keep secret!)

# GCP Configuration (for Pub/Sub event messaging between services)
GCP_PROJECT_ID=noclue-476404

# For local development, uncomment this to use Pub/Sub emulator instead of real GCP
# PUBSUB_EMULATOR_HOST=localhost:8085

# Service Configuration
PORT=400X  # Each service has a different port (4001-4004)
NODE_ENV=development

# Other Service URLs (for inter-service communication)
QUESTION_SERVICE_URL=http://localhost:4002
MATCHING_SERVICE_URL=http://localhost:4003
COLLABORATION_SERVICE_URL=http://localhost:4004
USER_SERVICE_URL=http://localhost:4001

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Frontend Environment (`.env.docker` for Docker Compose)

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_publishable_key
SUPABASE_SERVICE_KEY=your_service_role_key

# Application Configuration
NODE_ENV=production
CORS_ORIGIN=http://localhost:3000

# NextAuth Configuration (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-secure-random-string-here
```

**Important URLs Explained:**
- **NEXT_PUBLIC_GRAPHQL_URL**: The GraphQL API endpoint (http://localhost:4001/graphql) - frontend queries data from here
- **NEXTAUTH_SECRET**: Secret key for NextAuth.js to encrypt sessions/JWT tokens (generate with `openssl rand -base64 32`)

---

## Running the Application

### Option 1: Docker Compose (Recommended for Development)

This runs all services in Docker containers with the Pub/Sub emulator included.

```bash
# 1. Make sure .env.docker has your credentials
cp .env.docker .env.docker.local
# Edit .env.docker.local with your actual credentials

# 2. Start all services
./docker-compose.sh up

# Other useful commands:
./docker-compose.sh down    # Stop all services
./docker-compose.sh logs    # View logs
./docker-compose.sh rebuild # Rebuild and restart
```

**Services will be available at:**
- Frontend: http://localhost:3000
- User Service: http://localhost:4001
- Question Service: http://localhost:4002
- Matching Service: http://localhost:4003
- Collaboration Service: http://localhost:4004
- Pub/Sub Emulator: localhost:8085

---

### Option 2: Local Development (Node.js)

Run services directly with Node.js for faster iteration.

#### Step 1: Install Dependencies

```bash
npm install
```

#### Step 2: Build Common Package

```bash
npm run build:common
```

#### Step 3: Start Individual Services

**In separate terminal windows:**

```bash
# Terminal 1: User Service
npm run --workspace=@noclue/user-service start:dev

# Terminal 2: Question Service
npm run --workspace=@noclue/question-service start:dev

# Terminal 3: Matching Service
npm run --workspace=@noclue/matching-service start:dev

# Terminal 4: Collaboration Service
npm run --workspace=@noclue/collaboration-service start:dev

# Terminal 5: Frontend
npm run dev:frontend
```

**Note about Pub/Sub:**
- Services will log errors about Pub/Sub connection failures if the emulator is not running
- This is normal - services will still start and most features will work
- For full functionality, start the Pub/Sub emulator (see below)

#### Optional: Start Pub/Sub Emulator

```bash
# In a separate terminal
./scripts/start-pubsub-emulator.sh

# Then in each service .env file, uncomment:
# PUBSUB_EMULATOR_HOST=localhost:8085
```

---

## Expected Warnings/Errors

When running services locally without Docker, you may see these errors - **they are normal and services will still work**:

### Redis Connection Error
```
Redis Client Error Error: connect ECONNREFUSED ::1:6379
```
**What it means:** Redis is not running locally.
**Impact:** Matching service caching won't work, but basic features still work.
**To fix (optional):**
```bash
# Install Redis and start it
brew install redis
brew services start redis
```

### Pub/Sub Permission Error
```
Error: 7 PERMISSION_DENIED: Caller does not have required permission to use project noclue-476404
```
**What it means:** No Pub/Sub emulator running and no GCP credentials configured.
**Impact:** Inter-service messaging won't work, but most features still work.
**To fix (optional):** Use the Pub/Sub emulator (see below) or configure GCP credentials.

---

## Troubleshooting

### TypeScript Build Errors

If you see "Cannot find module" errors with the wrong path structure:

```bash
# Clean build artifacts
npm run build:common
rm -rf backend/services/*/dist
rm -rf backend/services/*/tsconfig.tsbuildinfo

# Rebuild all services
npm run build --workspace=@noclue/question-service
npm run build --workspace=@noclue/matching-service
npm run build --workspace=@noclue/collaboration-service
```

### Pub/Sub Connection Errors

If services fail with "PERMISSION_DENIED" errors for Pub/Sub:

**Option A: Use Emulator (Recommended for local dev)**
```bash
# 1. Start emulator
./scripts/start-pubsub-emulator.sh

# 2. Uncomment PUBSUB_EMULATOR_HOST in all service .env files
```

**Option B: Use Real GCP (Requires credentials)**
```bash
# 1. Set up GCP service account key
# 2. Add to .env: GCP_KEY_FILENAME=/path/to/service-account-key.json
# 3. Comment out or remove PUBSUB_EMULATOR_HOST
```

### Port Already in Use

```bash
# Find and kill process using port (e.g., 4002)
lsof -ti:4002 | xargs kill -9
```

---

## Project Structure

```
noclue/
├── backend/
│   └── services/
│       ├── user-service/        # Port 4001 - User auth & profiles
│       ├── question-service/    # Port 4002 - Coding questions
│       ├── matching-service/    # Port 4003 - User matching
│       └── collaboration-service/ # Port 4004 - Real-time collab
├── frontend/                    # Port 3000 - Next.js app
├── common/                      # Shared code/types
├── docker-compose.yml           # Docker Compose config
└── scripts/                     # Helper scripts
```

---

## Next Steps

1. **Update environment files** with your Supabase credentials
2. **Choose your development approach:**
   - Docker Compose: `./docker-compose.sh up`
   - Local Node.js: Follow "Option 2" steps above
3. **Open frontend:** http://localhost:3000
4. **Check service health:** Visit http://localhost:4001/health (and 4002, 4003, 4004)

For production deployment, see `DEPLOYMENT.md`.
