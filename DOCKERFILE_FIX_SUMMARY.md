# Dockerfile Fixes Summary

## Problem

The Docker builds were failing with the following error:

```
ERROR: failed to solve: builder: failed to resolve source metadata for docker.io/library/builder:latest:
pull access denied, repository does not exist or may require authorization
```

## Root Cause

The Dockerfiles were using `--from=builder` in the COPY commands, but:

1. **Matching Service**: The build stage was named `service-builder`, not `builder`
2. **Collaboration Service**: Used multiple stages (`common-builder`, `service-builder`) but referenced non-existent `builder`
3. **User Service**: Same issue as collaboration service
4. **Question Service**: Already correct

Additionally, there were inefficiencies and inconsistencies:
- Multiple separate build stages that could be combined
- Copying `node_modules` instead of installing production deps in the final stage
- Duplicate build commands
- Missing WORKDIR before CMD, causing the node command to fail

## Solution

All Dockerfiles have been standardized to follow the same pattern:

### Standardized Two-Stage Build Pattern

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace configuration
COPY package*.json ./
COPY common ./common
COPY backend/services/<SERVICE_NAME> ./backend/services/<SERVICE_NAME>

# Install all dependencies
RUN npm install

# Build common package first
RUN npm run build:common

# Build service
WORKDIR /app/backend/services/<SERVICE_NAME>
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy workspace structure
COPY package*.json ./
COPY --from=builder /app/common ./common
COPY --from=builder /app/backend/services/<SERVICE_NAME>/dist ./backend/services/<SERVICE_NAME>/dist
COPY --from=builder /app/backend/services/<SERVICE_NAME>/package*.json ./backend/services/<SERVICE_NAME>/
COPY --from=builder /app/backend/services/<SERVICE_NAME>/.env* ./backend/services/<SERVICE_NAME>/

# Install production dependencies only
RUN npm install --workspace=@noclue/common --workspace=@noclue/<SERVICE_NAME> --omit=dev

EXPOSE <PORT>
ENV PORT=<PORT>

WORKDIR /app/backend/services/<SERVICE_NAME>
CMD ["node", "dist/main.js"]
```

## Key Improvements

### 1. Consistent Stage Naming
- ✅ All build stages now named `builder`
- ✅ All production stages named `runner`
- ✅ No confusion with stage references

### 2. Proper Workspace Usage
- ✅ Uses npm workspaces for dependency management
- ✅ Single `npm install` command at root level
- ✅ Automatically handles `@noclue/common` linking

### 3. Optimized Layer Caching
- ✅ Copies only necessary files for each stage
- ✅ Separates build and runtime dependencies
- ✅ Smaller final image size

### 4. Production-Ready
- ✅ Only production dependencies in final image
- ✅ Proper environment variable handling
- ✅ Correct working directory for CMD

### 5. Multi-Service Support
- ✅ All services use the same pattern
- ✅ Easy to maintain and update
- ✅ Consistent behavior across services

## Files Modified

1. ✅ `Dockerfile.matching-service` - Complete rewrite, fixed stage naming and structure
2. ✅ `Dockerfile.collaboration-service` - Complete rewrite, removed node_modules copy, fixed structure
3. ✅ `Dockerfile.user-service` - Complete rewrite, standardized to match pattern
4. ✅ `Dockerfile.question-service` - Minor cleanup (removed duplicate .env copy)

## Service-Specific Details

### Matching Service (Port 4003)
```dockerfile
EXPOSE 4003
ENV PORT=4003
```
- Single port for HTTP/GraphQL

### Question Service (Port 4002)
```dockerfile
EXPOSE 4002
ENV PORT=4002
```
- Single port for HTTP/GraphQL

### User Service (Port 4001)
```dockerfile
EXPOSE 4001
ENV PORT=4001
```
- Single port for HTTP/GraphQL

### Collaboration Service (Ports 4004, 1234)
```dockerfile
EXPOSE 4004 1234
ENV PORT=4004
ENV YJS_PORT=1234
```
- Port 4004: HTTP/GraphQL
- Port 1234: Yjs WebSocket collaboration

## Testing

To test the Docker builds:

```bash
# Build individual services
docker build -f Dockerfile.matching-service -t matching-service:latest .
docker build -f Dockerfile.question-service -t question-service:latest .
docker build -f Dockerfile.user-service -t user-service:latest .
docker build -f Dockerfile.collaboration-service -t collaboration-service:latest .

# Or build all at once (in CI/CD)
for service in matching question user collaboration; do
  docker build -f Dockerfile.${service}-service -t ${service}-service:latest .
done
```

## Expected Build Flow

1. **Stage 1 (builder)**:
   - Install all dependencies (dev + production)
   - Build common package (includes schema.graphql copy)
   - Build service TypeScript code
   - ~500MB image size

2. **Stage 2 (runner)**:
   - Copy only built artifacts
   - Install production dependencies only
   - Final image ~150-200MB

## Benefits

- ✅ Faster builds with better caching
- ✅ Smaller production images
- ✅ No dev dependencies in production
- ✅ Consistent across all services
- ✅ Works with npm workspaces
- ✅ Includes schema.graphql from common package
- ✅ Proper working directory for execution

## CI/CD Integration

The Dockerfiles are now ready for CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Build and push images
  run: |
    docker build -f Dockerfile.matching-service -t gcr.io/$PROJECT/matching-service:$TAG .
    docker build -f Dockerfile.question-service -t gcr.io/$PROJECT/question-service:$TAG .
    docker build -f Dockerfile.user-service -t gcr.io/$PROJECT/user-service:$TAG .
    docker build -f Dockerfile.collaboration-service -t gcr.io/$PROJECT/collaboration-service:$TAG .
```

## Related Fixes

This Dockerfile standardization works in conjunction with:
- ✅ Common package build fix (schema.graphql copy)
- ✅ Jest configuration fix (transform patterns)
- ✅ Pub/Sub integration (new dependencies handled correctly)

All services should now build successfully in CI/CD! 🚀
