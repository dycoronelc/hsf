import './pg-utc-timestamps';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';

/**
 * Alinear el proceso Node con UTC para lecturas/escrituras de fechas.
 * Se fuerza siempre: si systemd define TZ=America/Panama, no debe ganarle.
 */
process.env.TZ = 'UTC';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // JSON/urlencoded (formularios sin adjuntos); adjuntos van por multipart en preadmisión
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ limit: '2mb', extended: true }));

  // Enable CORS - allow frontend URL from env or localhost for dev
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const corsOrigins = [frontendUrl, 'http://localhost:3000', 'http://localhost:3001'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  const port = parseInt(process.env.PORT || '8000', 10);
  await app.listen(port);
  console.log(`🚀 Backend running on port ${port}`);
  console.log(`📚 API Documentation: /api`);
  console.log(`🕒 Process TZ=${process.env.TZ} (timestamps without tz → UTC)`);
}

bootstrap();
