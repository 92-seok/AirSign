import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';

@Module({
  imports: [AuthModule],
  controllers: [AreasController],
  providers: [AreasService],
})
export class AreasModule {}
