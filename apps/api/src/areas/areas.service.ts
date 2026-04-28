import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface AirStation {
  code: number;
  name: string;
  do: string;
  si: string;
}

export interface WeatherStation {
  code: number;
  do: string;
  si: string;
  eup: string;
}

interface DoRow {
  jhDo: string;
}
interface SiRow {
  jhSi: string;
}
interface AirStationRow {
  JHAreaCode: number;
  JHAirName: string | null;
  JHDo: string | null;
  JHSi: string | null;
}
interface WeatherStationRow {
  JHAreaCode: number;
  JHDo: string | null;
  JHSi: string | null;
  JHEup: string | null;
}

@Injectable()
export class AreasService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async listAirDos(): Promise<string[]> {
    const rows = await this.ds.query<DoRow[]>(
      `SELECT DISTINCT JHDo AS jhDo FROM jharea_air
         WHERE JHDo IS NOT NULL AND JHDo <> '' ORDER BY JHDo ASC`,
    );
    return rows.map((r) => r.jhDo);
  }

  async listAirSis(doName: string): Promise<string[]> {
    const rows = await this.ds.query<SiRow[]>(
      `SELECT DISTINCT JHSi AS jhSi FROM jharea_air
         WHERE JHDo = ? AND JHSi IS NOT NULL AND JHSi <> ''
         ORDER BY JHSi ASC`,
      [doName],
    );
    return rows.map((r) => r.jhSi);
  }

  async listAirStations(doName: string, siName: string): Promise<AirStation[]> {
    const rows = await this.ds.query<AirStationRow[]>(
      `SELECT JHAreaCode, JHAirName, JHDo, JHSi FROM jharea_air
         WHERE JHDo = ? AND JHSi = ?
         ORDER BY JHAirName ASC`,
      [doName, siName],
    );
    return rows.map((r) => ({
      code: r.JHAreaCode,
      name: r.JHAirName ?? '',
      do: r.JHDo ?? '',
      si: r.JHSi ?? '',
    }));
  }

  async listWeatherDos(): Promise<string[]> {
    const rows = await this.ds.query<DoRow[]>(
      `SELECT DISTINCT JHDo AS jhDo FROM jharea_weather
         WHERE JHDo IS NOT NULL AND JHDo <> '' ORDER BY JHDo ASC`,
    );
    return rows.map((r) => r.jhDo);
  }

  async listWeatherSis(doName: string): Promise<string[]> {
    const rows = await this.ds.query<SiRow[]>(
      `SELECT DISTINCT JHSi AS jhSi FROM jharea_weather
         WHERE JHDo = ? AND JHSi IS NOT NULL AND JHSi <> ''
         ORDER BY JHSi ASC`,
      [doName],
    );
    return rows.map((r) => r.jhSi);
  }

  async listWeatherStations(
    doName: string,
    siName: string,
  ): Promise<WeatherStation[]> {
    const rows = await this.ds.query<WeatherStationRow[]>(
      `SELECT JHAreaCode, JHDo, JHSi, JHEup FROM jharea_weather
         WHERE JHDo = ? AND JHSi = ?
         ORDER BY JHEup ASC`,
      [doName, siName],
    );
    return rows.map((r) => ({
      code: r.JHAreaCode,
      do: r.JHDo ?? '',
      si: r.JHSi ?? '',
      eup: r.JHEup ?? '',
    }));
  }
}
