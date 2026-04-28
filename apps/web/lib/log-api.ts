import { apiFetch } from "./api";
import { getToken } from "./auth";

export type LogResult = "ok" | "fail" | "unknown";

export interface LogItem {
  date: string;
  equipCode: number | null;
  equipName: string | null;
  type: string;
  result: LogResult;
  rawLog: string | null;
  contentPreview: string;
  contentLength: number;
}

export interface LogListResponse {
  items: LogItem[];
  total: number;
  page: number;
  limit: number;
}

interface FetchOpts {
  equip?: number;
  type?: string;
  page?: number;
  limit?: number;
}

export function fetchLogs(opts: FetchOpts = {}) {
  const params = new URLSearchParams();
  if (opts.equip !== undefined) params.set("equip", String(opts.equip));
  if (opts.type) params.set("type", opts.type);
  if (opts.page !== undefined) params.set("page", String(opts.page));
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return apiFetch<LogListResponse>(`/log${qs ? `?${qs}` : ""}`, {
    method: "GET",
    token: getToken(),
  });
}
