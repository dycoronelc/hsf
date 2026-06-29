import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { syncGeoCatalog } from './init/sync-geo-catalog';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const dataSource = app.get(DataSource);
    await syncGeoCatalog(dataSource);
  } catch (error) {
    console.error('✗ Error sincronizando catálogo geo:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
