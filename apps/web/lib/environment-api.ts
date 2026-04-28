import { apiFetch } from "./api";
import { getToken } from "./auth";

export type KhaiGrade = "good" | "moderate" | "unhealthy" | "hazardous";

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

export function fetchDashboardEnvironment() {
  return apiFetch<DashboardEnvironment>("/dashboard/environment", {
    method: "GET",
    token: getToken(),
  });
}
