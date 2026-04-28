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

export function fetchDashboard() {
  return apiFetch<EquipDashboardItem[]>("/equip/dashboard", {
    method: "GET",
    token: getToken(),
  });
}
