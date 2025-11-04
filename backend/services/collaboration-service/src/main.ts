import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { YjsServer } from './collaboration/yjs.server';
import { EventBusService } from './event-bus/event-bus.service';
import { CollaborationService } from './collaboration/collaboration.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN || '*', credentials: true });
  
  // Wire up services
  const eventBusService = app.get(EventBusService);
  const collaborationService = app.get(CollaborationService);
  
  // Initialize Y.js WebSocket server
  const yjsPort = process.env.YJS_PORT || 1234;
  const yjsServer = new YjsServer(Number(yjsPort), collaborationService);
  
  // Register handler for QuestionAssigned events
  eventBusService.registerQuestionAssignedHandler(async (payload) => {
    // 1. Create session in Supabase
    const session = await collaborationService.createSessionFromQuestion(payload);
    
    // 2. Initialize YJS session for this session
    await yjsServer.createSessionDocument(session.id);
    
    // 3. Publish session_started event
    await eventBusService.publishSessionEvent({
      matchId: payload.matchId,
      eventType: 'session_started',
      timestamp: new Date().toISOString(),
    });
  });
  
  const port = process.env.PORT || 4004;
  await app.listen(port);
  console.log(`Collaboration Service is running on: http://localhost:${port}`);
  console.log(`Y.js WebSocket server is running on: ws://localhost:${yjsPort}`);
}

bootstrap();
