import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AreasService } from './areas.service';

@Controller('areas')
@UseGuards(JwtAuthGuard)
export class AreasController {
  constructor(private readonly areas: AreasService) {}

  @Get('air/dos')
  airDos() {
    return this.areas.listAirDos();
  }

  @Get('air/sis')
  airSis(@Query('do') doName: string) {
    return this.areas.listAirSis(doName ?? '');
  }

  @Get('air/stations')
  airStations(@Query('do') doName: string, @Query('si') siName: string) {
    return this.areas.listAirStations(doName ?? '', siName ?? '');
  }

  @Get('weather/dos')
  weatherDos() {
    return this.areas.listWeatherDos();
  }

  @Get('weather/sis')
  weatherSis(@Query('do') doName: string) {
    return this.areas.listWeatherSis(doName ?? '');
  }

  @Get('weather/stations')
  weatherStations(@Query('do') doName: string, @Query('si') siName: string) {
    return this.areas.listWeatherStations(doName ?? '', siName ?? '');
  }
}
