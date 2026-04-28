import { apiFetch } from "./api";
import { getToken } from "./auth";

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

const q = (v: string) => encodeURIComponent(v);

export function fetchAirDos() {
  return apiFetch<string[]>("/areas/air/dos", {
    method: "GET",
    token: getToken(),
  });
}

export function fetchAirSis(doName: string) {
  return apiFetch<string[]>(`/areas/air/sis?do=${q(doName)}`, {
    method: "GET",
    token: getToken(),
  });
}

export function fetchAirStations(doName: string, siName: string) {
  return apiFetch<AirStation[]>(
    `/areas/air/stations?do=${q(doName)}&si=${q(siName)}`,
    { method: "GET", token: getToken() },
  );
}

export function fetchWeatherDos() {
  return apiFetch<string[]>("/areas/weather/dos", {
    method: "GET",
    token: getToken(),
  });
}

export function fetchWeatherSis(doName: string) {
  return apiFetch<string[]>(`/areas/weather/sis?do=${q(doName)}`, {
    method: "GET",
    token: getToken(),
  });
}

export function fetchWeatherStations(doName: string, siName: string) {
  return apiFetch<WeatherStation[]>(
    `/areas/weather/stations?do=${q(doName)}&si=${q(siName)}`,
    { method: "GET", token: getToken() },
  );
}
