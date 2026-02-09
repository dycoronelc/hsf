import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogsService } from './catalogs.service';
import { CatalogsController } from './catalogs.controller';
import { Nacionalidad } from './entities/nacionalidad.entity';
import { Provincia } from './entities/provincia.entity';
import { Distrito } from './entities/distrito.entity';
import { Corregimiento } from './entities/corregimiento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Nacionalidad, Provincia, Distrito, Corregimiento])],
  providers: [CatalogsService],
  controllers: [CatalogsController],
  exports: [CatalogsService],
})
export class CatalogsModule {}
