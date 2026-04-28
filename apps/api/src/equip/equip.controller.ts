import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import type { JwtPayload } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EquipService } from './equip.service';

interface AuthedRequest extends Request {
  user?: JwtPayload;
}

@Controller('equip')
@UseGuards(JwtAuthGuard)
export class EquipController {
  constructor(private readonly equip: EquipService) {}

  @Get('dashboard')
  dashboard(@Req() req: AuthedRequest) {
    const user = req.user;
    const rootId = user?.rootId ?? '';
    return this.equip.findDashboard(rootId);
  }
}
