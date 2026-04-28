import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { DeviceModule } from '../device/device.module';
import { JhDisplay } from '../equip/jh-display.entity';
import { JhEquip } from '../equip/jh-equip.entity';
import { JhParam } from './jh-param.entity';
import { JhScenType } from './jh-scen-type.entity';
import { JhScenario } from './jh-scenario.entity';
import { ScenarioController } from './scenario.controller';
import { ScenarioService } from './scenario.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JhScenario,
      JhScenType,
      JhEquip,
      JhParam,
      JhDisplay,
    ]),
    AuthModule,
    DeviceModule,
  ],
  controllers: [ScenarioController],
  providers: [ScenarioService],
  exports: [ScenarioService],
})
export class ScenarioModule {}
