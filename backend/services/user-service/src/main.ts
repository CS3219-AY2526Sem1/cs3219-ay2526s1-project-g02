import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips unknown fields
      forbidNonWhitelisted: true, // 400 if unknown fields sent
      transform: true, // enables class-transformer
    })
  );
  app.enableCors({ origin: ["http://localhost:3000"] }); // FE dev origin
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
}
bootstrap();
