/**
 * Script que conecta a la base de datos y crea las tablas (synchronize).
 * TypeORM crea las tablas automáticamente al conectar con synchronize: true.
 * Útil para Railway: ejecutar como Release Command antes del deploy.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    console.log('✓ Conexión a BD exitosa - tablas creadas (synchronize)');
    await app.close();
  } catch (error) {
    console.error('✗ Error al conectar a la base de datos:', error);
    process.exit(1);
  }
}

bootstrap();
