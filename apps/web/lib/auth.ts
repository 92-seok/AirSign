import { apiFetch } from "./api";

const TOKEN_KEY = "airsign.token";
const USER_KEY = "airsign.user";

export interface AuthUser {
  id: string;
  name: string;
  role: string;
  rootId: string;
  root: string;
}

interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AuthUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function login(id: string, password: string) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: { id, password },
  });
}
