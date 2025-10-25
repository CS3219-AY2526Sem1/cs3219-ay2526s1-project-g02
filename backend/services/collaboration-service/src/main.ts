import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { YjsServer } from './collaboration/yjs.server';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN || '*', credentials: true });
  
  // Initialize Y.js WebSocket server
  const yjsPort = process.env.YJS_PORT || 1234;
  const yjsServer = new YjsServer(Number(yjsPort));
  
  const port = process.env.PORT || 4004;
  await app.listen(port);
  console.log(`Collaboration Service is running on: http://localhost:${port}`);
  console.log(`Y.js WebSocket server is running on: ws://localhost:${yjsPort}`);
}

bootstrap();
