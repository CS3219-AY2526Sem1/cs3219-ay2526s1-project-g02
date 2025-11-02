#!/bin/bash

# Docker Setup Script for NoClue Platform
# This script sets up the environment for running with Docker Compose

set -e

echo "🚀 Setting up NoClue Docker environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.docker..."
    cp .env.docker .env
    echo "✅ .env file created"
else
    echo "ℹ️  .env file already exists"
    read -p "Do you want to overwrite it with .env.docker? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp .env.docker .env
        echo "✅ .env file updated"
    fi
fi

echo ""
echo "🔧 Environment configuration:"
echo "  - Supabase: Configured"
echo "  - GCP Project: noclue-476404"
echo "  - Redis: Using docker service"
echo "  - Pub/Sub: Using emulator"
echo ""
echo "📚 Next steps:"
echo "  1. Review and update .env file with your credentials"
echo "  2. Run: docker-compose build"
echo "  3. Run: docker-compose up"
echo ""
echo "✨ Setup complete!"
