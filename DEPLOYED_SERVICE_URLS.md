# Deployed Service URLs

## Production Service Endpoints

All services are now publicly accessible via LoadBalancer IPs.

### Frontend
- **URL**: http://34.135.186.244
- **Type**: LoadBalancer
- **Port**: 80 (HTTP)

### Backend Microservices

#### User Service
- **URL**: http://34.67.192.126:4001
- **GraphQL**: http://34.67.192.126:4001/graphql
- **Health**: http://34.67.192.126:4001/health
- **Type**: LoadBalancer

#### Question Service
- **URL**: http://34.16.114.117:4002
- **GraphQL**: http://34.16.114.117:4002/graphql
- **Health**: http://34.16.114.117:4002/health
- **Type**: LoadBalancer

#### Matching Service
- **URL**: http://34.123.68.82:4003
- **GraphQL**: http://34.123.68.82:4003/graphql
- **Health**: http://34.123.68.82:4003/health
- **WebSocket**: ws://34.123.68.82:4003
- **Type**: LoadBalancer

#### Collaboration Service
- **URL**: http://104.198.77.205:4004
- **GraphQL**: http://104.198.77.205:4004/graphql
- **Health**: http://104.198.77.205:4004/health
- **WebSocket**: ws://104.198.77.205:4004
- **Yjs WebSocket**: ws://104.198.77.205:1234
- **Type**: LoadBalancer

#### LLM Service
- **URL**: http://34.121.74.235:4005
- **Health**: http://34.121.74.235:4005/health
- **Explain**: POST http://34.121.74.235:4005/explain-question
- **Chat**: POST http://34.121.74.235:4005/chat
- **Type**: LoadBalancer

## Frontend Environment Configuration

The frontend is configured with these environment variables:

```bash
NEXT_PUBLIC_USER_GRAPHQL_URL=http://34.67.192.126:4001/graphql
NEXT_PUBLIC_QUESTION_GRAPHQL_URL=http://34.16.114.117:4002/graphql
NEXT_PUBLIC_MATCHING_GRAPHQL_URL=http://34.123.68.82:4003/graphql
NEXT_PUBLIC_COLLABORATION_GRAPHQL_URL=http://104.198.77.205:4004/graphql
NEXT_PUBLIC_LLM_SERVICE_URL=http://34.121.74.235:4005
NEXT_PUBLIC_MATCHING_SERVICE_URL=http://34.123.68.82:4003
NEXT_PUBLIC_GRAPHQL_URL=http://34.67.192.126:4001/graphql  # Legacy fallback
```

## Testing

### Test Health Endpoints

```bash
# User Service
curl http://34.67.192.126:4001/health

# Question Service
curl http://34.16.114.117:4002/health

# Matching Service
curl http://34.123.68.82:4003/health

# Collaboration Service
curl http://104.198.77.205:4004/health

# LLM Service
curl http://34.121.74.235:4005/health
```

### Test GraphQL Endpoints

```bash
# User Service GraphQL
curl -X POST http://34.67.192.126:4001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'

# Question Service GraphQL  
curl -X POST http://34.16.114.117:4002/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

### Access Frontend

Open in browser: **http://34.135.186.244**

The frontend will now successfully connect to all backend services!

## Cost Note

⚠️ **LoadBalancer Cost**: ~$18/month per LoadBalancer
- Frontend: $18/month
- User Service: $18/month
- Question Service: $18/month
- Matching Service: $18/month
- Collaboration Service: $18/month
- LLM Service: $18/month

**Total**: ~$108/month for LoadBalancers

### Cost Optimization (Future)

Consider using an **Ingress controller** instead to reduce to 1 LoadBalancer (~$18/month total):
- One LoadBalancer for all services
- Path-based routing (e.g., `/api/user/*`, `/api/question/*`)
- Save ~$90/month

## Security Note

⚠️ Services are currently exposed on HTTP (not HTTPS). For production:
1. Set up Ingress with TLS/SSL certificates
2. Use Google-managed SSL certificates
3. Configure custom domain
4. Enable CORS properly

## Monitoring

Check service status:
```bash
kubectl get services -n noclue-app
kubectl get pods -n noclue-app
kubectl logs -f deployment/SERVICE_NAME -n noclue-app
```

