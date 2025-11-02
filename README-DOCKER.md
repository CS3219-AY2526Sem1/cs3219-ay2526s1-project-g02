# 🐳 Running NoClue with Docker

The easiest way to run the entire NoClue application stack.

## Quick Start

```bash
# 1. Start all services
./docker-compose.sh up

# 2. Open your browser
open http://localhost:3000
```

That's it! All services are now running.

## Services & Ports

| Service       | Port | URL                       | Description                    |
|---------------|------|---------------------------|--------------------------------|
| Frontend      | 3000 | http://localhost:3000     | Next.js web application        |
| User Service  | 4001 | http://localhost:4001     | User auth & GraphQL            |
| Question      | 4002 | http://localhost:4002     | Question bank                  |
| Matching      | 4003 | http://localhost:4003     | User matching                  |
| Collaboration | 4004 | http://localhost:4004     | Real-time collaboration (Yjs)  |

## Common Commands

```bash
# Start services
./docker-compose.sh up

# Stop services
./docker-compose.sh down

# View logs
./docker-compose.sh logs
./docker-compose.sh logs user-service

# Rebuild after code changes
./docker-compose.sh rebuild
./docker-compose.sh up

# Show running services
./docker-compose.sh ps

# Open shell in a container
./docker-compose.sh shell user-service

# Clean up everything
./docker-compose.sh clean
```

## Help

For detailed documentation, see [DOCKER-SETUP.md](./DOCKER-SETUP.md)

```bash
# Show all available commands
./docker-compose.sh help
```

## Troubleshooting

### Services won't start?
```bash
./docker-compose.sh logs
```

### Need to rebuild?
```bash
./docker-compose.sh rebuild
./docker-compose.sh up
```

### Port already in use?
Check what's using the port and stop it:
```bash
lsof -i :3000
lsof -i :4001
```

## Development vs Docker

**Use Docker for:**
- ✅ Quick demos
- ✅ Testing full stack
- ✅ Consistent environment
- ✅ CI/CD testing

**Use npm for:**
- ✅ Active development
- ✅ Hot reload
- ✅ Faster iteration
- ✅ Debugging

See main README for npm development setup.
