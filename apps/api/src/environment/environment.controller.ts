import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import type { JwtPayload } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EnvironmentService } from './environment.service';

interface AuthedRequest extends Request {
  user?: JwtPayload;
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class EnvironmentController {
  constructor(private readonly env: EnvironmentService) {}

  @Get('environment')
  environment(@Req() req: AuthedRequest) {
    const rootId = req.user?.rootId ?? '';
    return this.env.getDashboardEnvironment(rootId);
  }
}
