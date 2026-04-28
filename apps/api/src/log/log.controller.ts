import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import type { JwtPayload } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LogService } from './log.service';

interface AuthedRequest extends Request {
  user?: JwtPayload;
}

@Controller('log')
@UseGuards(JwtAuthGuard)
export class LogController {
  constructor(private readonly log: LogService) {}

  @Get()
  list(
    @Req() req: AuthedRequest,
    @Query('equip') equipParam?: string,
    @Query('type') type?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.log.list(req.user?.rootId ?? '', {
      equipCode: equipParam ? Number(equipParam) : undefined,
      type: type || undefined,
      page,
      limit,
    });
  }
}
