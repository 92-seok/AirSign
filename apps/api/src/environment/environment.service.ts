import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type KhaiGrade = 'good' | 'moderate' | 'unhealthy' | 'hazardous';

export interface AirQualityData {
  date: string;
  areaCode: number;
  areaName: string | null;
  region: string | null;
  pm25: number | null;
  pm10: number | null;
  o3: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  khai: number | null;
  khaiGrade: KhaiGrade | null;
}

export interface WeatherData {
  date: string;
  areaCode: number;
  region: string | null;
  temp: number | null;
  humi: number | null;
  rain: number | null;
  wspeed: number | null;
  wdire: number | null;
}

export interface AirTrendPoint {
  hour: string;
  pm25: number | null;
  pm10: number | null;
  o3: number | null;
}

export interface WeatherTrendPoint {
  hour: string;
  temp: number | null;
  humi: number | null;
}

export interface DashboardTrend {
  air: AirTrendPoint[];
  weather: WeatherTrendPoint[];
}

export interface DashboardEnvironment {
  airQuality: AirQualityData | null;
  weather: WeatherData | null;
  trend: DashboardTrend;
}

interface EquipAreaRow {
  JHAir: number | null;
  JHWeather: number | null;
}
interface JhAirRow {
  JHDate: string;
  JHAreaCode: number;
  pm25: string | null;
  pm10: string | null;
  o3: string | null;
  no2: string | null;
  so2: string | null;
  co: string | null;
  khai: string | null;
}
interface JhAreaAirRow {
  JHAreaCode: number;
  JHAirName: string | null;
  JHDo: string | null;
  JHSi: string | null;
}
interface JhWeatherRow {
  JHDate: string;
  JHAreaCode: number;
  temp: number | null;
  humi: number | null;
  rain: number | null;
  wspeed: number | null;
  wdire: number | null;
}
interface JhAreaWeatherRow {
  JHAreaCode: number;
  JHDo: string | null;
  JHSi: string | null;
  JHEup: string | null;
}

interface AirTrendRow {
  hour: string;
  pm25_avg: string | null;
  pm10_avg: string | null;
  o3_avg: string | null;
}
interface WeatherTrendRow {
  hour: string;
  temp_avg: number | null;
  humi_avg: number | null;
}

@Injectable()
export class EnvironmentService {
  private readonly superRootId: string;

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    config: ConfigService,
  ) {
    this.superRootId = config.get<string>('SUPER_ROOT_ID') ?? '';
  }

  async getDashboardEnvironment(rootId: string): Promise<DashboardEnvironment> {
    const isSuper = !!this.superRootId && rootId === this.superRootId;

    const equipQuery = isSuper
      ? `SELECT JHAir, JHWeather FROM jhequip
           WHERE (JHAir > 0 OR JHWeather > 0) ORDER BY JHECode ASC LIMIT 1`
      : `SELECT JHAir, JHWeather FROM jhequip
           WHERE JHRootId = ? AND (JHAir > 0 OR JHWeather > 0)
           ORDER BY JHECode ASC LIMIT 1`;
    const equipRows = await this.ds.query<EquipAreaRow[]>(
      equipQuery,
      isSuper ? [] : [rootId],
    );
    const equip = equipRows[0];
    if (!equip) {
      return {
        airQuality: null,
        weather: null,
        trend: { air: [], weather: [] },
      };
    }

    const [airQuality, weather, airTrend, weatherTrend] = await Promise.all([
      equip.JHAir ? this.fetchAirQuality(equip.JHAir) : Promise.resolve(null),
      equip.JHWeather
        ? this.fetchWeather(equip.JHWeather)
        : Promise.resolve(null),
      equip.JHAir ? this.fetchAirTrend(equip.JHAir) : Promise.resolve([]),
      equip.JHWeather
        ? this.fetchWeatherTrend(equip.JHWeather)
        : Promise.resolve([]),
    ]);

    return {
      airQuality,
      weather,
      trend: { air: airTrend, weather: weatherTrend },
    };
  }

  /** 최근 24시간 jhair 시간별 평균 */
  private async fetchAirTrend(areaCode: number): Promise<AirTrendPoint[]> {
    const since = formatLocal(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const rows = await this.ds.query<AirTrendRow[]>(
      `SELECT
         DATE_FORMAT(JHDate, '%Y-%m-%d %H:00') AS hour,
         AVG(CAST(NULLIF(pm25, '') AS DECIMAL(10,2))) AS pm25_avg,
         AVG(CAST(NULLIF(pm10, '') AS DECIMAL(10,2))) AS pm10_avg,
         AVG(CAST(NULLIF(o3,   '') AS DECIMAL(10,3))) AS o3_avg
       FROM jhair
       WHERE JHAreaCode = ? AND JHDate >= ?
       GROUP BY hour
       ORDER BY hour ASC`,
      [areaCode, since],
    );
    return rows.map((r) => ({
      hour: r.hour,
      pm25: toNum(r.pm25_avg),
      pm10: toNum(r.pm10_avg),
      o3: toNum(r.o3_avg),
    }));
  }

  /** 최근 24시간 jhweather 시간별 평균 */
  private async fetchWeatherTrend(
    areaCode: number,
  ): Promise<WeatherTrendPoint[]> {
    const since = formatLocal(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const rows = await this.ds.query<WeatherTrendRow[]>(
      `SELECT
         DATE_FORMAT(JHDate, '%Y-%m-%d %H:00') AS hour,
         AVG(temp) AS temp_avg,
         AVG(humi) AS humi_avg
       FROM jhweather
       WHERE JHAreaCode = ? AND JHDate >= ?
       GROUP BY hour
       ORDER BY hour ASC`,
      [areaCode, since],
    );
    return rows.map((r) => ({
      hour: r.hour,
      temp: r.temp_avg !== null ? Number(r.temp_avg) : null,
      humi: r.humi_avg !== null ? Number(r.humi_avg) : null,
    }));
  }

  private async fetchAirQuality(
    areaCode: number,
  ): Promise<AirQualityData | null> {
    const areaRows = await this.ds.query<JhAreaAirRow[]>(
      'SELECT JHAreaCode, JHAirName, JHDo, JHSi FROM jharea_air WHERE JHAreaCode = ? LIMIT 1',
      [areaCode],
    );
    const dataRows = await this.ds.query<JhAirRow[]>(
      `SELECT JHDate, JHAreaCode, pm25, pm10, o3, no2, so2, co, khai
         FROM jhair WHERE JHAreaCode = ?
         ORDER BY JHDate DESC LIMIT 1`,
      [areaCode],
    );
    const data = dataRows[0];
    if (!data) return null;

    const area = areaRows[0];
    const khai = parseFloat(data.khai ?? '');
    return {
      date: data.JHDate,
      areaCode: data.JHAreaCode,
      areaName: area?.JHAirName ?? null,
      region: area ? joinRegion(area.JHDo, area.JHSi) : null,
      pm25: toNum(data.pm25),
      pm10: toNum(data.pm10),
      o3: toNum(data.o3),
      no2: toNum(data.no2),
      so2: toNum(data.so2),
      co: toNum(data.co),
      khai: Number.isFinite(khai) ? khai : null,
      khaiGrade: Number.isFinite(khai) ? toKhaiGrade(khai) : null,
    };
  }

  private async fetchWeather(areaCode: number): Promise<WeatherData | null> {
    const areaRows = await this.ds.query<JhAreaWeatherRow[]>(
      'SELECT JHAreaCode, JHDo, JHSi, JHEup FROM jharea_weather WHERE JHAreaCode = ? LIMIT 1',
      [areaCode],
    );
    const dataRows = await this.ds.query<JhWeatherRow[]>(
      `SELECT JHDate, JHAreaCode, temp, humi, rain, wspeed, wdire
         FROM jhweather WHERE JHAreaCode = ?
         ORDER BY JHDate DESC LIMIT 1`,
      [areaCode],
    );
    const data = dataRows[0];
    if (!data) return null;

    const area = areaRows[0];
    return {
      date: data.JHDate,
      areaCode: data.JHAreaCode,
      region: area ? joinRegion(area.JHDo, area.JHSi, area.JHEup) : null,
      temp: data.temp,
      humi: data.humi,
      rain: data.rain,
      wspeed: data.wspeed,
      wdire: data.wdire,
    };
  }
}

function toNum(s: string | null): number | null {
  if (s === null || s === undefined || s === '') return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function formatLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

function joinRegion(...parts: (string | null)[]): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * KHAI(통합대기환경지수) 등급
 *   0~50 좋음 / 51~100 보통 / 101~250 나쁨 / 251+ 매우 나쁨
 */
function toKhaiGrade(v: number): KhaiGrade {
  if (v <= 50) return 'good';
  if (v <= 100) return 'moderate';
  if (v <= 250) return 'unhealthy';
  return 'hazardous';
}
