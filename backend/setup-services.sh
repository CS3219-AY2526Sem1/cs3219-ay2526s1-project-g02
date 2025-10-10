#!/bin/bash

# Script to set up remaining microservices
# Run this from the backend directory

echo "Setting up Matching Service..."

# Create Matching Service files
mkdir -p services/matching-service/src/matching

cat > services/matching-service/src/main.ts <<'EOF'
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN || '*', credentials: true });
  const port = process.env.PORT || 4003;
  await app.listen(port);
  console.log(\`Matching Service is running on: http://localhost:\${port}\`);
}

bootstrap();
EOF

cat > services/matching-service/src/app.module.ts <<'EOF'
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { MatchingModule } from './matching/matching.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: true,
      playground: true,
      introspection: true,
    }),
    MatchingModule,
  ],
})
export class AppModule {}
EOF

cat > services/matching-service/src/matching/matching.module.ts <<'EOF'
import { Module } from '@nestjs/common';
import { MatchingResolver } from './matching.resolver';
import { MatchingService } from './matching.service';
import { MatchingGateway } from './matching.gateway';

@Module({
  providers: [MatchingResolver, MatchingService, MatchingGateway],
  exports: [MatchingService],
})
export class MatchingModule {}
EOF

cat > services/matching-service/src/matching/matching.service.ts <<'EOF'
import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
);

@Injectable()
export class MatchingService {
  private matchingQueue: Map<string, any> = new Map();

  async createMatchRequest(userId: string, preferences: any) {
    const { data, error } = await supabase
      .from('match_requests')
      .insert([{ user_id: userId, ...preferences, status: 'pending' }])
      .select()
      .single();

    if (error) throw new Error(\`Failed to create match request: \${error.message}\`);

    this.matchingQueue.set(userId, data);
    return data;
  }

  async findMatch(userId: string) {
    // TODO: Implement matching algorithm
    return null;
  }

  async getMatchHistory(userId: string) {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .or(\`user1_id.eq.\${userId},user2_id.eq.\${userId}\`);

    if (error) throw new Error(\`Failed to fetch match history: \${error.message}\`);
    return data;
  }
}
EOF

cat > services/matching-service/src/matching/matching.resolver.ts <<'EOF'
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { MatchingService } from './matching.service';

@Resolver('Match')
export class MatchingResolver {
  constructor(private readonly matchingService: MatchingService) {}

  @Query()
  async matchHistory(@Args('userId') userId: string) {
    return this.matchingService.getMatchHistory(userId);
  }

  @Mutation()
  async requestMatch(@Args('userId') userId: string, @Args('preferences') preferences: any) {
    return this.matchingService.createMatchRequest(userId, preferences);
  }
}
EOF

cat > services/matching-service/src/matching/matching.gateway.ts <<'EOF'
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { MatchingService } from './matching.service';

@WebSocketGateway({ cors: true })
export class MatchingGateway {
  constructor(private readonly matchingService: MatchingService) {}

  @SubscribeMessage('joinQueue')
  async handleJoinQueue(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const match = await this.matchingService.createMatchRequest(data.userId, data.preferences);
    client.emit('queueJoined', match);
  }

  @SubscribeMessage('leaveQueue')
  handleLeaveQueue(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    client.emit('queueLeft', { userId: data.userId });
  }
}
EOF

cat > services/matching-service/tsconfig.json <<'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": "./",
    "paths": {
      "@noclue/common": ["../../../common/src"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
EOF

cat > services/matching-service/nest-cli.json <<'EOF'
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
EOF

cat > services/matching-service/.env.example <<'EOF'
PORT=4003
CORS_ORIGIN=http://localhost:3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
USER_SERVICE_URL=http://localhost:4001
QUESTION_SERVICE_URL=http://localhost:4002
EOF

echo "✅ Matching Service created!"

# Create Collaboration Service files
echo "Setting up Collaboration Service..."

mkdir -p services/collaboration-service/src/collaboration

cat > services/collaboration-service/package.json <<'EOF'
{
  "name": "@noclue/collaboration-service",
  "version": "1.0.0",
  "description": "Collaboration Service - Real-time collaborative coding sessions",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,test}/**/*.ts\" --fix"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/graphql": "^12.0.11",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/websockets": "^10.3.0",
    "@nestjs/platform-socket.io": "^10.3.0",
    "@noclue/common": "*",
    "@supabase/supabase-js": "^2.39.3",
    "graphql": "^16.8.1",
    "socket.io": "^4.6.1",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@types/node": "^20.11.0",
    "@types/socket.io": "^3.0.2",
    "typescript": "^5.3.3"
  }
}
EOF

cat > services/collaboration-service/src/main.ts <<'EOF'
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN || '*', credentials: true });
  const port = process.env.PORT || 4004;
  await app.listen(port);
  console.log(\`Collaboration Service is running on: http://localhost:\${port}\`);
}

bootstrap();
EOF

cat > services/collaboration-service/src/app.module.ts <<'EOF'
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { CollaborationModule } from './collaboration/collaboration.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: true,
      playground: true,
      introspection: true,
    }),
    CollaborationModule,
  ],
})
export class AppModule {}
EOF

cat > services/collaboration-service/src/collaboration/collaboration.module.ts <<'EOF'
import { Module } from '@nestjs/common';
import { CollaborationResolver } from './collaboration.resolver';
import { CollaborationService } from './collaboration.service';
import { CollaborationGateway } from './collaboration.gateway';

@Module({
  providers: [CollaborationResolver, CollaborationService, CollaborationGateway],
  exports: [CollaborationService],
})
export class CollaborationModule {}
EOF

cat > services/collaboration-service/src/collaboration/collaboration.service.ts <<'EOF'
import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
);

@Injectable()
export class CollaborationService {
  async createSession(matchId: string) {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{ match_id: matchId, code: '', language: 'javascript', status: 'active' }])
      .select()
      .single();

    if (error) throw new Error(\`Failed to create session: \${error.message}\`);
    return data;
  }

  async getSession(sessionId: string) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw new Error(\`Failed to fetch session: \${error.message}\`);
    return data;
  }

  async updateCode(sessionId: string, code: string) {
    const { data, error } = await supabase
      .from('sessions')
      .update({ code })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw new Error(\`Failed to update code: \${error.message}\`);
    return data;
  }

  async endSession(sessionId: string) {
    const { data, error } = await supabase
      .from('sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw new Error(\`Failed to end session: \${error.message}\`);
    return data;
  }
}
EOF

cat > services/collaboration-service/src/collaboration/collaboration.resolver.ts <<'EOF'
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { CollaborationService } from './collaboration.service';

@Resolver('Session')
export class CollaborationResolver {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Query()
  async session(@Args('id') id: string) {
    return this.collaborationService.getSession(id);
  }

  @Mutation()
  async createSession(@Args('matchId') matchId: string) {
    return this.collaborationService.createSession(matchId);
  }

  @Mutation()
  async endSession(@Args('sessionId') sessionId: string) {
    return this.collaborationService.endSession(sessionId);
  }
}
EOF

cat > services/collaboration-service/src/collaboration/collaboration.gateway.ts <<'EOF'
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CollaborationService } from './collaboration.service';

@WebSocketGateway({ cors: true })
export class CollaborationGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly collaborationService: CollaborationService) {}

  @SubscribeMessage('joinSession')
  handleJoinSession(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    client.join(data.sessionId);
    client.to(data.sessionId).emit('userJoined', { userId: data.userId });
  }

  @SubscribeMessage('codeChange')
  async handleCodeChange(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    await this.collaborationService.updateCode(data.sessionId, data.code);
    client.to(data.sessionId).emit('codeUpdate', { code: data.code, userId: data.userId });
  }

  @SubscribeMessage('chatMessage')
  handleChatMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.server.to(data.sessionId).emit('newMessage', {
      userId: data.userId,
      message: data.message,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('leaveSession')
  handleLeaveSession(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    client.leave(data.sessionId);
    client.to(data.sessionId).emit('userLeft', { userId: data.userId });
  }
}
EOF

cat > services/collaboration-service/tsconfig.json <<'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": "./",
    "paths": {
      "@noclue/common": ["../../../common/src"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
EOF

cat > services/collaboration-service/nest-cli.json <<'EOF'
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
EOF

cat > services/collaboration-service/.env.example <<'EOF'
PORT=4004
CORS_ORIGIN=http://localhost:3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
MATCHING_SERVICE_URL=http://localhost:4003
EOF

echo "✅ Collaboration Service created!"
echo ""
echo "All microservices have been set up!"
echo ""
echo "Next steps:"
echo "1. Run 'npm run install:services' from the backend directory"
echo "2. Set up your .env files for each service"
echo "3. Create the database tables (see backend/MICROSERVICES.md)"
echo "4. Run 'npm run dev:services' to start all services"
