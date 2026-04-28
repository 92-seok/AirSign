/**
 * 항상 상대 경로 `/api` 사용 — Next.js rewrites가 NestJS로 프록시.
 * 모바일이 PC 와이파이 IP로 접속해도 fetch가 자기 호스트로 가므로 CORS 우회.
 * NEXT_PUBLIC_API_URL 환경변수가 명시(빈 값이 아닐 때)되면 그 값을 우선 사용.
 *
 * `||` 사용 이유: env 파일에 `NEXT_PUBLIC_API_URL=` 같은 빈 값이 있어도 fallback.
 * (`??`는 빈 문자열을 nullish로 보지 않아 빈 baseURL이 되어 404 발생함)
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string | null;
}

interface ErrorPayload {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export async function apiFetch<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { body, token, headers, ...rest } = opts;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...((headers ?? {}) as Record<string, string>),
  };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const errPayload = payload as ErrorPayload | null;
    const rawMsg = errPayload?.message;
    const message = Array.isArray(rawMsg)
      ? rawMsg.join(", ")
      : (rawMsg ?? `요청 실패 (${res.status})`);
    throw new ApiError(res.status, message, payload);
  }

  return payload as T;
}
