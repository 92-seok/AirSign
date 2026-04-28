"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { clearSession } from "@/lib/auth";
import { useAuthUser } from "@/lib/use-auth";

const NAV_ITEMS = [
  { href: "/equip", label: "장비 관리" },
  { href: "/scenario", label: "시나리오 관리" },
  { href: "/logs", label: "송출 이력" },
];

export function AppHeader() {
  const pathname = usePathname();
  const user = useAuthUser();

  const handleLogout = () => {
    clearSession();
    window.location.href = "/login";
  };

  return (
    <header className="shrink-0 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20 relative">
      {/* 상단 브랜드 그라디언트 라인 */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500" />
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 h-12 sm:h-14 lg:h-16">
        <div className="flex items-center gap-3 lg:gap-5 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 lg:gap-3 shrink-0"
            aria-label="AirSign 대시보드"
          >
            <div className="size-7 lg:size-9 rounded-md lg:rounded-lg bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500" />
            <div className="hidden sm:block font-semibold text-sm lg:text-lg tracking-tight">
              AirSign
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 lg:px-3.5 py-1.5 rounded-md text-xs lg:text-sm transition-colors ${
                    active
                      ? "bg-muted font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2 lg:gap-3">
          {user && (
            <div className="text-right leading-none hidden sm:block">
              <div className="text-xs lg:text-sm font-medium">
                {user.name?.trim() || user.id}
              </div>
              <div className="text-[10px] lg:text-xs text-muted-foreground mt-0.5 lg:mt-1">
                {user.role || "—"}
              </div>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="lg:h-9 lg:px-4 lg:text-sm"
          >
            로그아웃
          </Button>
        </div>
      </div>
    </header>
  );
}
