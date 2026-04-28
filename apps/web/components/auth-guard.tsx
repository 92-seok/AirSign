"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthToken } from "@/lib/use-auth";

interface Props {
  children: React.ReactNode;
}

export function AuthGuard({ children }: Props) {
  const router = useRouter();
  const token = useAuthToken();

  useEffect(() => {
    if (!token) {
      router.replace("/login");
    }
  }, [token, router]);

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        세션 확인 중…
      </div>
    );
  }

  return <>{children}</>;
}
