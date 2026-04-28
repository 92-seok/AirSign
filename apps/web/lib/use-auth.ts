"use client";

import { useMemo, useSyncExternalStore } from "react";

import { type AuthUser, getToken, getUser } from "./auth";

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

export function useAuthToken(): string | null {
  return useSyncExternalStore(
    subscribe,
    getToken,
    () => null,
  );
}

export function useAuthUser(): AuthUser | null {
  const token = useAuthToken();
  return useMemo(() => (token ? getUser() : null), [token]);
}
