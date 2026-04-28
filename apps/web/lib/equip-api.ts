import { apiFetch } from "./api";
import { getToken } from "./auth";

export type EquipStatus = "fine" | "bad" | "unknown";

export interface EquipDashboardItem {
  code: number;
  name: string;
  cate: string;
  rootId: string;
  displayType: string;
  ip: string;
  port: string;
  lat: number | null;
  lng: number | null;
  addr: string;
  onOff: string;
  lastDate: string;
  status: EquipStatus;
}

export interface EquipListItem extends EquipDashboardItem {
  subIp: string;
  bright: string;
  volume: string;
  weather: number | null;
  air: number | null;
  firmware: string;
}

export interface EquipDetailItem extends EquipListItem {
  content: string;
  image: string;
  c2Mac: string;
  c10Id: string;
}

export interface EquipPayload {
  name: string;
  cate?: string;
  ip?: string;
  port?: string;
  subIp?: string;
  addr?: string;
  lat?: string;
  lng?: string;
  displayType?: string;
  weather?: number;
  air?: number;
  bright?: string;
  volume?: string;
  firmware?: string;
  onOff?: string;
}

export function fetchDashboard() {
  return apiFetch<EquipDashboardItem[]>("/equip/dashboard", {
    method: "GET",
    token: getToken(),
  });
}

export function fetchEquipList() {
  return apiFetch<EquipListItem[]>("/equip", {
    method: "GET",
    token: getToken(),
  });
}

export function fetchEquip(code: number) {
  return apiFetch<EquipDetailItem>(`/equip/${code}`, {
    method: "GET",
    token: getToken(),
  });
}

export function createEquip(body: EquipPayload) {
  return apiFetch<EquipDetailItem>("/equip", {
    method: "POST",
    body,
    token: getToken(),
  });
}

export function updateEquip(code: number, body: Partial<EquipPayload>) {
  return apiFetch<EquipDetailItem>(`/equip/${code}`, {
    method: "PUT",
    body,
    token: getToken(),
  });
}

export function deleteEquip(code: number) {
  return apiFetch<void>(`/equip/${code}`, {
    method: "DELETE",
    token: getToken(),
  });
}

export function updateEquipBV(
  code: number,
  body: { bright: number[]; volume: number[] },
) {
  return apiFetch<EquipDetailItem>(`/equip/${code}/bv`, {
    method: "PUT",
    body,
    token: getToken(),
  });
}

export interface DevicePushResult {
  ok: boolean;
  status: number;
  body: string;
  durationMs: number;
}

/** 현재 DB의 밝기·볼륨을 단말로 즉시 송출 (POST /config) */
export function sendEquipConfig(code: number) {
  return apiFetch<DevicePushResult>(`/equip/${code}/send-config`, {
    method: "POST",
    token: getToken(),
  });
}

export interface EquipStatusItem {
  date: string;
  ldate: string | null;
  mac: string | null;
  ip: string | null;
  rev: string | null;
  c10: string | null;
}

export interface EquipStatusDailyCount {
  date: string;
  count: number;
}

export interface EquipStatusHistory {
  total: number;
  since: string;
  until: string;
  daily: EquipStatusDailyCount[];
  items: EquipStatusItem[];
}

export function fetchEquipStatus(code: number) {
  return apiFetch<EquipStatusHistory>(`/equip/${code}/status`, {
    method: "GET",
    token: getToken(),
  });
}

/**
 * '|' 구분 24개 정수 → number[]
 * 누락/오류 시 fallback 값(기본 50)으로 채움
 */
export function parseBVString(
  s: string | null | undefined,
  fallback = 50,
): number[] {
  if (!s) return Array.from({ length: 24 }, () => fallback);
  const parts = s.split("|").map((p) => {
    const n = parseInt(p, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(100, n));
  });
  while (parts.length < 24) parts.push(fallback);
  return parts.slice(0, 24);
}

export interface CategoryOption {
  code: number;
  name: string;
  order: number | null;
}

export interface DisplayOption {
  code: string;
  name: string;
  sizeX: string | null;
  sizeY: string | null;
}

export function fetchCategories() {
  return apiFetch<CategoryOption[]>("/equip/categories", {
    method: "GET",
    token: getToken(),
  });
}

export function fetchDisplayTypes() {
  return apiFetch<DisplayOption[]>("/equip/display-types", {
    method: "GET",
    token: getToken(),
  });
}
