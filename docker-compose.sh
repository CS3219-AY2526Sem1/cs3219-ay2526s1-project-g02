#!/bin/bash

# Docker Compose Helper Script for NoClue Development
# This script provides convenient commands for managing the entire application stack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if .env.docker exists
check_env_file() {
    if [ ! -f "$SCRIPT_DIR/.env.docker" ]; then
        echo -e "${RED}Error: .env.docker file not found${NC}"
        echo "Please create .env.docker with your Supabase credentials"
        exit 1
    fi
}

# Print help message
show_help() {
    cat << EOF
${BLUE}NoClue Docker Compose Helper${NC}

Usage: $0 <command>

Commands:
  ${GREEN}up${NC}            Start all services (builds if needed)
  ${GREEN}down${NC}          Stop all services
  ${GREEN}restart${NC}       Restart all services
  ${GREEN}build${NC}         Build all services without starting
  ${GREEN}rebuild${NC}       Rebuild all services from scratch (no cache)
  ${GREEN}logs${NC}          View logs from all services
  ${GREEN}logs <service>${NC} View logs from specific service (e.g., user-service)
  ${GREEN}ps${NC}            Show running services
  ${GREEN}clean${NC}         Stop services and remove volumes
  ${GREEN}shell <service>${NC} Open a shell in a service container
  ${GREEN}help${NC}          Show this help message

Services:
  - user-service
  - question-service
  - matching-service
  - collaboration-service
  - frontend

Examples:
  $0 up                    # Start all services
  $0 logs user-service     # View user service logs
  $0 shell frontend        # Open shell in frontend container
  $0 rebuild               # Rebuild everything from scratch

EOF
}

# Start services
start_services() {
    echo -e "${BLUE}Starting all services...${NC}"
    check_env_file
    docker-compose --env-file .env.docker up -d
    echo -e "${GREEN}✓ All services started!${NC}"
    echo ""
    echo "Services are running at:"
    echo "  Frontend:      http://localhost:3000"
    echo "  User Service:  http://localhost:4001"
    echo "  Question:      http://localhost:4002"
    echo "  Matching:      http://localhost:4003"
    echo "  Collaboration: http://localhost:4004"
    echo ""
    echo "Use '$0 logs' to view logs"
}

# Stop services
stop_services() {
    echo -e "${BLUE}Stopping all services...${NC}"
    docker-compose down
    echo -e "${GREEN}✓ All services stopped${NC}"
}

# Restart services
restart_services() {
    echo -e "${BLUE}Restarting all services...${NC}"
    docker-compose restart
    echo -e "${GREEN}✓ All services restarted${NC}"
}

# Build services
build_services() {
    echo -e "${BLUE}Building all services...${NC}"
    check_env_file
    docker-compose --env-file .env.docker build
    echo -e "${GREEN}✓ Build complete${NC}"
}

# Rebuild services from scratch
rebuild_services() {
    echo -e "${YELLOW}Rebuilding all services from scratch (no cache)...${NC}"
    check_env_file
    docker-compose --env-file .env.docker build --no-cache
    echo -e "${GREEN}✓ Rebuild complete${NC}"
}

# View logs
view_logs() {
    if [ -z "$1" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$1"
    fi
}

# Show running services
show_status() {
    docker-compose ps
}

# Clean up everything
clean_services() {
    echo -e "${YELLOW}Warning: This will stop services and remove volumes${NC}"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Cleaning up...${NC}"
        docker-compose down -v
        echo -e "${GREEN}✓ Cleanup complete${NC}"
    else
        echo "Cancelled"
    fi
}

# Open shell in container
open_shell() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: Please specify a service${NC}"
        echo "Usage: $0 shell <service>"
        echo "Example: $0 shell user-service"
        exit 1
    fi

    docker-compose exec "$1" sh
}

# Main command dispatcher
case "${1:-}" in
    up)
        start_services
        ;;
    down)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    build)
        build_services
        ;;
    rebuild)
        rebuild_services
        ;;
    logs)
        view_logs "${2:-}"
        ;;
    ps)
        show_status
        ;;
    clean)
        clean_services
        ;;
    shell)
        open_shell "${2:-}"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: ${1:-}${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
