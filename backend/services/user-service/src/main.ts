import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  app.enableCors({ origin: ["http://localhost:3000"] }); // FE dev origin
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
}
bootstrap();
