import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN || '*', credentials: true });
  const port = process.env.PORT || 4003;
  await app.listen(port);
  console.log(`Matching Service is running on: http://localhost:${port}`);
}

bootstrap();
