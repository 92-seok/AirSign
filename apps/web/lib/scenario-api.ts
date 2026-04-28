import { apiFetch } from "./api";
import { getToken } from "./auth";

export type ScenarioActiveStatus =
  | "active"
  | "scheduled"
  | "expired"
  | "always";

export interface ScenarioTypeOption {
  code: string;
  name: string;
  displayCode: string | null;
  image: string | null;
  order: number | null;
}

export interface ScenarioListItem {
  code: string;
  equipCode: string;
  typeCode: string;
  typeName: string | null;
  typeImage: string | null;
  typeDisplayCode: string | null;
  name: string;
  orderby: number | null;
  startDate: string | null;
  endDate: string | null;
  status: ScenarioActiveStatus;
  hasContent: boolean;
  viewData: string | null;
  text: string | null;
  thumbnailPath: string | null;
  /** 장비의 LED 전광판 코드 (DT_001=가로, DT_003=세로 등) */
  equipDisplayCode: string | null;
  /** 장비의 LED 전광판 픽셀 크기 (X, Y) */
  equipSizeX: number | null;
  equipSizeY: number | null;
  /** jhparam 동적 합성 데이터 (dust_bg, dust_gif, dust_value, weather_temp 등) */
  params: Record<string, string>;
}

export function fetchScenarioTypes() {
  return apiFetch<ScenarioTypeOption[]>("/scenario/types", {
    method: "GET",
    token: getToken(),
  });
}

export function fetchScenariosForEquip(equipCode: number) {
  return apiFetch<ScenarioListItem[]>(`/scenario/equip/${equipCode}`, {
    method: "GET",
    token: getToken(),
  });
}

/** 권한 있는 모든 장비의 활성 시나리오 (대시보드 상단 스트립) */
export function fetchActiveScenarios() {
  return apiFetch<ScenarioListItem[]>("/scenario/active", {
    method: "GET",
    token: getToken(),
  });
}

export function deleteScenario(scenCode: string) {
  return apiFetch<void>(`/scenario/${encodeURIComponent(scenCode)}`, {
    method: "DELETE",
    token: getToken(),
  });
}

export interface ScenarioPayload {
  typeCode: string;
  equipCode: number;
  name: string;
  orderby?: number;
  startDate?: string;
  endDate?: string;
  viewData?: string;
  text?: string;
}

export function createScenario(body: ScenarioPayload) {
  return apiFetch<{ code: string }>("/scenario", {
    method: "POST",
    body,
    token: getToken(),
  });
}

export function updateScenario(scenCode: string, body: ScenarioPayload) {
  return apiFetch<{ code: string }>(
    `/scenario/${encodeURIComponent(scenCode)}`,
    { method: "PUT", body, token: getToken() },
  );
}

export interface DevicePushResult {
  ok: boolean;
  status: number;
  body: string;
  durationMs: number;
}

/** 해당 장비의 활성 시나리오 일괄 송출 */
export function sendScenariosForEquip(equipCode: number) {
  return apiFetch<DevicePushResult>(`/scenario/equip/${equipCode}/send`, {
    method: "POST",
    token: getToken(),
  });
}

export interface GroupSendItemResult {
  equipCode: number;
  scenCode: string | null;
  ok: boolean;
  message?: string;
}

export interface GroupSendPayload {
  equipCodes: number[];
  scenario: ScenarioPayload;
}

/** 다수 장비에 동일 시나리오 일괄 등록 */
export function groupSendScenario(body: GroupSendPayload) {
  return apiFetch<{ results: GroupSendItemResult[] }>("/scenario/group", {
    method: "POST",
    body,
    token: getToken(),
  });
}
