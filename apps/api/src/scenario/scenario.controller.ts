import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import type { JwtPayload } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupSendDto } from './dto/group-send.dto';
import { SaveScenarioDto } from './dto/save-scenario.dto';
import { ScenarioService } from './scenario.service';

interface AuthedRequest extends Request {
  user?: JwtPayload;
}

@Controller('scenario')
@UseGuards(JwtAuthGuard)
export class ScenarioController {
  constructor(private readonly scenario: ScenarioService) {}

  @Get('types')
  types() {
    return this.scenario.listTypes();
  }

  /** 권한 있는 모든 장비의 활성 시나리오 (대시보드 표출 스트립) */
  @Get('active')
  activeAll(@Req() req: AuthedRequest) {
    return this.scenario.listActiveAll(req.user?.rootId ?? '');
  }

  @Get('equip/:code')
  listForEquip(
    @Param('code', ParseIntPipe) code: number,
    @Req() req: AuthedRequest,
  ) {
    return this.scenario.listForEquip(code, req.user?.rootId ?? '');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: SaveScenarioDto, @Req() req: AuthedRequest) {
    return this.scenario.createScenario(dto, req.user?.rootId ?? '');
  }

  /** 다수 장비에 동일 시나리오 일괄 등록 */
  @Post('group')
  @HttpCode(HttpStatus.CREATED)
  groupSend(@Body() dto: GroupSendDto, @Req() req: AuthedRequest) {
    return this.scenario.groupSend(dto, req.user?.rootId ?? '');
  }

  /** 해당 장비의 활성 시나리오 일괄 송출 (POST /scenario) */
  @Post('equip/:code/send')
  @HttpCode(HttpStatus.OK)
  sendForEquip(
    @Param('code', ParseIntPipe) code: number,
    @Req() req: AuthedRequest,
  ) {
    return this.scenario.sendForEquip(code, req.user?.rootId ?? '');
  }

  @Put(':scenCode')
  update(
    @Param('scenCode') scenCode: string,
    @Body() dto: SaveScenarioDto,
    @Req() req: AuthedRequest,
  ) {
    return this.scenario.updateScenario(scenCode, dto, req.user?.rootId ?? '');
  }

  @Delete(':scenCode')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('scenCode') scenCode: string, @Req() req: AuthedRequest) {
    return this.scenario.deleteScenario(scenCode, req.user?.rootId ?? '');
  }
}
