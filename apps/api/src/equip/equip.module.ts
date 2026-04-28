import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { EquipController } from './equip.controller';
import { EquipService } from './equip.service';
import { JhEquip } from './jh-equip.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JhEquip]), AuthModule],
  controllers: [EquipController],
  providers: [EquipService],
  exports: [EquipService],
})
export class EquipModule {}
