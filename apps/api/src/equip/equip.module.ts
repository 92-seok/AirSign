import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { DeviceModule } from '../device/device.module';
import { EquipController } from './equip.controller';
import { EquipService } from './equip.service';
import { JhCate } from './jh-cate.entity';
import { JhDisplay } from './jh-display.entity';
import { JhEquip } from './jh-equip.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([JhEquip, JhCate, JhDisplay]),
    AuthModule,
    DeviceModule,
  ],
  controllers: [EquipController],
  providers: [EquipService],
  exports: [EquipService],
})
export class EquipModule {}
