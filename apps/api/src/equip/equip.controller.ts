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
import { CreateEquipDto } from './dto/create-equip.dto';
import { UpdateBVDto } from './dto/update-bv.dto';
import { UpdateEquipDto } from './dto/update-equip.dto';
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
    return this.equip.findDashboard(req.user?.rootId ?? '');
  }

  @Get('categories')
  categories() {
    return this.equip.listCategories();
  }

  @Get('display-types')
  displayTypes() {
    return this.equip.listDisplayTypes();
  }

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.equip.findAll(req.user?.rootId ?? '');
  }

  @Get(':code')
  findOne(
    @Param('code', ParseIntPipe) code: number,
    @Req() req: AuthedRequest,
  ) {
    return this.equip.findOne(code, req.user?.rootId ?? '');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEquipDto, @Req() req: AuthedRequest) {
    return this.equip.create(dto, req.user?.rootId ?? '');
  }

  @Put(':code')
  update(
    @Param('code', ParseIntPipe) code: number,
    @Body() dto: UpdateEquipDto,
    @Req() req: AuthedRequest,
  ) {
    return this.equip.update(code, dto, req.user?.rootId ?? '');
  }

  @Put(':code/bv')
  updateBV(
    @Param('code', ParseIntPipe) code: number,
    @Body() dto: UpdateBVDto,
    @Req() req: AuthedRequest,
  ) {
    return this.equip.updateBV(code, dto, req.user?.rootId ?? '');
  }

  /** 현재 DB의 밝기·볼륨을 단말로 즉시 송출 (POST /config) */
  @Post(':code/send-config')
  @HttpCode(HttpStatus.OK)
  sendConfig(
    @Param('code', ParseIntPipe) code: number,
    @Req() req: AuthedRequest,
  ) {
    return this.equip.sendConfigNow(code, req.user?.rootId ?? '');
  }

  @Get(':code/status')
  status(@Param('code', ParseIntPipe) code: number, @Req() req: AuthedRequest) {
    return this.equip.getStatusHistory(code, req.user?.rootId ?? '');
  }

  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('code', ParseIntPipe) code: number, @Req() req: AuthedRequest) {
    return this.equip.remove(code, req.user?.rootId ?? '');
  }
}
