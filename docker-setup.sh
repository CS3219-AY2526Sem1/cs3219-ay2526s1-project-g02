#!/bin/bash

# Docker Setup Script for NoClue Platform
# This script sets up the environment for both Docker Compose and local development

set -e

echo "🚀 Setting up NoClue environment..."
echo ""

# ========================================
# 1. Setup root .env for Docker Compose
# ========================================
echo "📦 Setting up Docker Compose environment..."

if [ ! -f .env ]; then
    echo "  📝 Creating .env file from .env.docker..."
    cp .env.docker .env
    echo "  ✅ Root .env file created"
else
    echo "  ℹ️  Root .env file already exists"
    read -p "  Do you want to overwrite it with .env.docker? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp .env.docker .env
        echo "  ✅ Root .env file updated"
    fi
fi

echo ""

# ========================================
# 2. Setup service .env files for local development
# ========================================
echo "💻 Setting up individual service environments..."

SERVICES=(
    "backend/services/user-service"
    "backend/services/question-service"
    "backend/services/matching-service"
    "backend/services/collaboration-service"
)

for service in "${SERVICES[@]}"; do
    service_name=$(basename "$service")

    if [ ! -f "$service/.env" ]; then
        if [ -f "$service/.env.example" ]; then
            echo "  📝 Creating $service_name/.env from .env.example..."
            cp "$service/.env.example" "$service/.env"

            # Update with actual credentials from .env.docker
            echo "  🔧 Updating $service_name/.env with credentials..."

            # Read values from .env.docker
            SUPABASE_URL=$(grep "^SUPABASE_URL=" .env.docker | cut -d '=' -f2)
            SUPABASE_KEY=$(grep "^SUPABASE_KEY=" .env.docker | cut -d '=' -f2)
            SUPABASE_SERVICE_KEY=$(grep "^SUPABASE_SERVICE_KEY=" .env.docker | cut -d '=' -f2)
            GCP_PROJECT_ID=$(grep "^GCP_PROJECT_ID=" .env.docker | cut -d '=' -f2)

            # Update the service .env file
            sed -i.bak "s|^SUPABASE_URL=.*|SUPABASE_URL=$SUPABASE_URL|" "$service/.env"
            sed -i.bak "s|^SUPABASE_KEY=.*|SUPABASE_KEY=$SUPABASE_KEY|" "$service/.env"
            sed -i.bak "s|^SUPABASE_SERVICE_KEY=.*|SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY|" "$service/.env"

            # Add GCP_PROJECT_ID if it doesn't exist
            if ! grep -q "^GCP_PROJECT_ID=" "$service/.env"; then
                echo "" >> "$service/.env"
                echo "# GCP Configuration" >> "$service/.env"
                echo "GCP_PROJECT_ID=$GCP_PROJECT_ID" >> "$service/.env"
                echo "# Use local Pub/Sub emulator for development (uncomment to enable)" >> "$service/.env"
                echo "# PUBSUB_EMULATOR_HOST=localhost:8085" >> "$service/.env"
            fi

            # Clean up backup files
            rm -f "$service/.env.bak"

            echo "  ✅ $service_name/.env created and configured"
        else
            echo "  ⚠️  No .env.example found for $service_name"
        fi
    else
        echo "  ✅ $service_name/.env already exists"
    fi
done

echo ""

# ========================================
# 3. Setup frontend .env if needed
# ========================================
echo "🎨 Setting up frontend environment..."

if [ ! -f "frontend/.env.local" ]; then
    if [ -f "frontend/.env.example" ]; then
        echo "  📝 Creating frontend/.env.local from .env.example..."
        cp "frontend/.env.example" "frontend/.env.local"

        # Update with actual credentials
        SUPABASE_URL=$(grep "^SUPABASE_URL=" .env.docker | cut -d '=' -f2)
        SUPABASE_KEY=$(grep "^SUPABASE_KEY=" .env.docker | cut -d '=' -f2)
        NEXTAUTH_SECRET=$(grep "^NEXTAUTH_SECRET=" .env.docker | cut -d '=' -f2)

        sed -i.bak "s|^NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL|" "frontend/.env.local"
        sed -i.bak "s|^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_KEY|" "frontend/.env.local"
        sed -i.bak "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$NEXTAUTH_SECRET|" "frontend/.env.local"

        rm -f "frontend/.env.local.bak"

        echo "  ✅ frontend/.env.local created and configured"
    fi
else
    echo "  ✅ frontend/.env.local already exists"
fi

echo ""
echo "════════════════════════════════════════"
echo "✨ Setup Complete!"
echo "════════════════════════════════════════"
echo ""
echo "🔧 Environment configuration:"
echo "  - Supabase: $SUPABASE_URL"
echo "  - GCP Project: noclue-476404"
echo "  - Redis: localhost:6379 (local) / redis:6379 (docker)"
echo "  - Pub/Sub: Using emulator"
echo ""
echo "📚 For Docker Compose:"
echo "  1. docker-compose build"
echo "  2. docker-compose up"
echo ""
echo "💻 For local development:"
echo "  1. Make sure Redis is running: redis-server"
echo "  2. Run individual services:"
echo "     - npm run dev:user"
echo "     - npm run dev:question"
echo "     - npm run dev:matching"
echo "     - npm run dev:collaboration"
echo ""
echo "📖 See DOCKER-README.md for more information"
echo ""
