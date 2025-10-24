# Microservices Architecture

This backend uses a microservices architecture with 4 independent services:

## Services Overview

### 1. User Service (Port 4001)
**Responsibility**: User authentication, profiles, and user management

**Features**:
- User CRUD operations
- User authentication
- Profile management
- Skill level tracking

**Database Tables**:
- `users` (id, email, name, role, skill_level, created_at, updated_at)

### 2. Question Service (Port 4002)
**Responsibility**: Coding questions and problem management

**Features**:
- Question CRUD operations
- Filter by difficulty (Easy, Medium, Hard)
- Filter by category (Arrays, Strings, DP, etc.)
- Test cases management

**Database Tables**:
- `questions` (id, title, description, difficulty, category, examples, constraints, test_cases, created_at, updated_at)

### 3. Matching Service (Port 4003)
**Responsibility**: Match users for collaborative coding sessions

**Features**:
- Real-time matching queue using WebSockets
- Match based on skill level and preferences
- Match history tracking
- Queue status monitoring

**Database Tables**:
- `match_requests` (id, user_id, skill_level, preferred_difficulty, status, created_at)
- `matches` (id, user1_id, user2_id, question_id, status, created_at, ended_at)

**Technology**: Uses Socket.IO for real-time matching

### 4. Collaboration Service (Port 4004)
**Responsibility**: Real-time collaborative coding sessions

**Features**:
- Real-time code editing using WebSockets
- Video/audio chat integration
- Session management
- Code execution (optional)
- Chat messaging

**Database Tables**:
- `sessions` (id, match_id, code, language, status, created_at, ended_at)
- `session_messages` (id, session_id, user_id, message, created_at)

**Technology**: Uses Socket.IO for real-time collaboration

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│                         Port 3000                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ GraphQL / WebSocket
                         │
            ┌────────────┴────────────┐
            │    API Gateway          │
            │    (Optional)           │
            └────────┬───────┬────────┘
                     │       │
        ┌────────────┼───────┼────────────┬───────────────┐
        │            │       │            │               │
        ▼            ▼       ▼            ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│User Service  │ │Question Svc  │ │Matching Svc  │ │Collab Service│
│Port 4001     │ │Port 4002     │ │Port 4003     │ │Port 4004     │
│              │ │              │ │              │ │              │
│- GraphQL     │ │- GraphQL     │ │- GraphQL     │ │- GraphQL     │
│- REST        │ │- REST        │ │- WebSocket   │ │- WebSocket   │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │                │
       └────────────────┴────────────────┴────────────────┘
                                │
                                ▼
                        ┌────────────────┐
                        │   Supabase     │
                        │   PostgreSQL   │
                        └────────────────┘
```

## Service Communication

### GraphQL Federation (Recommended)
Each service exposes a federated GraphQL schema that can be combined using Apollo Federation.

### Direct HTTP/REST
Services can communicate directly via HTTP for simple queries.

### WebSocket
Matching and Collaboration services use WebSocket (Socket.IO) for real-time features.

## Directory Structure

```
backend/
├── services/
│   ├── user-service/
│   │   ├── src/
│   │   │   ├── users/
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── users.resolver.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   └── .env.example
│   │
│   ├── question-service/
│   │   ├── src/
│   │   │   ├── questions/
│   │   │   │   ├── questions.module.ts
│   │   │   │   ├── questions.service.ts
│   │   │   │   └── questions.resolver.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   └── .env.example
│   │
│   ├── matching-service/
│   │   ├── src/
│   │   │   ├── matching/
│   │   │   │   ├── matching.module.ts
│   │   │   │   ├── matching.service.ts
│   │   │   │   ├── matching.resolver.ts
│   │   │   │   └── matching.gateway.ts (WebSocket)
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   └── .env.example
│   │
│   └── collaboration-service/
│       ├── src/
│       │   ├── collaboration/
│       │   │   ├── collaboration.module.ts
│       │   │   ├── collaboration.service.ts
│       │   │   ├── collaboration.resolver.ts
│       │   │   └── collaboration.gateway.ts (WebSocket)
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── package.json
│       ├── tsconfig.json
│       ├── nest-cli.json
│       └── .env.example
│
├── shared/  (Optional - shared utilities)
│   ├── interfaces/
│   ├── decorators/
│   └── utils/
│
├── package.json  (root workspace config)
└── tsconfig.json (shared tsconfig)
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50),
  skill_level VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Questions Table
```sql
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  difficulty VARCHAR(50) NOT NULL,
  category TEXT[] NOT NULL,
  examples TEXT,
  constraints TEXT,
  test_cases JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Match Requests Table
```sql
CREATE TABLE match_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  preferred_language VARCHAR(50) NOT NULL,
  preferred_difficulty VARCHAR(50) NOT NULL,
  preferred_topics JSONB NOT NULL,
  status VARCHAR(50) DEFAULT ‘pending’ NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### Matches Table
```sql
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  code TEXT,
  language VARCHAR(50) DEFAULT 'javascript',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP WITH TIME ZONE
);
```

### Session Messages Table
```sql
CREATE TABLE session_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Development

### Running Individual Services

```bash
# User Service
cd backend/services/user-service
npm install
npm run start:dev

# Question Service
cd backend/services/question-service
npm install
npm run start:dev

# Matching Service
cd backend/services/matching-service
npm install
npm run start:dev

# Collaboration Service
cd backend/services/collaboration-service
npm install
npm run start:dev
```

### Running All Services (from root)

```bash
# Install all dependencies
npm run install:services

# Run all in development mode
npm run dev:services

# Build all services
npm run build:services
```

## Environment Variables

Each service has its own `.env` file:

### User Service (.env)
```env
PORT=4001
CORS_ORIGIN=http://localhost:3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### Question Service (.env)
```env
PORT=4002
CORS_ORIGIN=http://localhost:3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### Matching Service (.env)
```env
PORT=4003
CORS_ORIGIN=http://localhost:3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
USER_SERVICE_URL=http://localhost:4001
QUESTION_SERVICE_URL=http://localhost:4002
```

### Collaboration Service (.env)
```env
PORT=4004
CORS_ORIGIN=http://localhost:3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
MATCHING_SERVICE_URL=http://localhost:4003
```

## Deployment

Each service is deployed independently:

### Docker
Each service has its own Dockerfile in the root:
- `Dockerfile.user-service`
- `Dockerfile.question-service`
- `Dockerfile.matching-service`
- `Dockerfile.collaboration-service`

### Kubernetes
Each service has its own deployment and service manifests in `k8s/`:
- `user-service-deployment.yaml` & `user-service-service.yaml`
- `question-service-deployment.yaml` & `question-service-service.yaml`
- `matching-service-deployment.yaml` & `matching-service-service.yaml`
- `collaboration-service-deployment.yaml` & `collaboration-service-service.yaml`

## Testing

```bash
# Test individual service
cd backend/services/user-service
npm run test

# Test all services
npm run test:services
```

## Adding a New Service

1. Create service directory: `backend/services/new-service`
2. Copy structure from existing service
3. Update `package.json` with service name and dependencies
4. Implement business logic in `src/`
5. Create Dockerfile
6. Create Kubernetes manifests
7. Update GitHub Actions workflow
8. Update this documentation

## Best Practices

1. **Single Responsibility**: Each service handles one domain
2. **Loose Coupling**: Services communicate via well-defined APIs
3. **Independent Deployment**: Each service can be deployed independently
4. **Database per Service**: Each service manages its own data
5. **Async Communication**: Use events/message queues for non-blocking operations
6. **Error Handling**: Implement proper error handling and logging
7. **Health Checks**: Implement health check endpoints
8. **API Versioning**: Version your APIs for backward compatibility

## Monitoring

- Use Cloud Logging for centralized logs
- Implement health check endpoints: `/health`
- Track metrics: request count, latency, error rate
- Set up alerts for critical errors

## Security

- Validate all inputs
- Use environment variables for secrets
- Implement rate limiting
- Use CORS properly
- Implement authentication/authorization
- Keep dependencies updated

## Next Steps

1. Implement complete Matching Service logic
2. Implement complete Collaboration Service logic
3. Add API Gateway (optional but recommended)
4. Implement service discovery
5. Add distributed tracing
6. Implement circuit breakers
7. Add comprehensive testing
8. Set up monitoring and alerting
