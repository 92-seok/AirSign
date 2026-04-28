"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthGuard } from "@/components/auth-guard";
import { EquipDetail } from "@/components/equip-detail";
import { EquipList } from "@/components/equip-list";
import { KakaoMap } from "@/components/kakao-map";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import { fetchDashboard, type EquipDashboardItem } from "@/lib/equip-api";
import { useAuthUser } from "@/lib/use-auth";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const user = useAuthUser();
  const [equips, setEquips] = useState<EquipDashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchDashboard();
        if (!cancelled) setEquips(data);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? err.message
            : "장비 목록을 불러올 수 없습니다.";
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = useCallback(() => {
    clearSession();
    window.location.href = "/login";
  }, []);

  const handleSelect = useCallback((e: EquipDashboardItem) => {
    setSelectedCode(e.code);
    setDrawerOpen(true);
  }, []);

  const selected = equips.find((e) => e.code === selectedCode) ?? null;
  const fineCount = equips.filter((e) => e.status === "fine").length;
  const badCount = equips.filter((e) => e.status === "bad").length;
  const unknownCount = equips.filter((e) => e.status === "unknown").length;

  return (
    <div className="h-svh flex flex-col overflow-hidden">
      {/* Header — 모바일 컴팩트 */}
      <header className="shrink-0 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 h-12 sm:h-14">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-7 rounded-md bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500 shrink-0" />
            <div className="font-semibold text-sm tracking-tight">AirSign</div>
            <span className="text-xs text-muted-foreground hidden md:inline truncate">
              미세먼지 전광판 통합 관리
            </span>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <div className="text-right leading-none hidden sm:block">
                <div className="text-xs font-medium">
                  {user.name?.trim() || user.id}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {user.role || "—"}
                </div>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {/* Main — 풀 지도 + 사이드바/드로어 */}
      <div className="flex-1 relative overflow-hidden">
        <KakaoMap
          equips={equips}
          selectedCode={selectedCode}
          onMarkerClick={handleSelect}
          className="absolute inset-0"
        />

        {/* 좌상단 floating 통계 chips */}
        <div className="absolute top-3 left-3 right-3 lg:right-[26rem] flex flex-wrap gap-2 pointer-events-none">
          <StatChip label="전체" value={equips.length} dotClass="bg-foreground/40" loading={loading} />
          <StatChip label="정상" value={fineCount} dotClass="bg-emerald-500" loading={loading} />
          <StatChip label="이상" value={badCount} dotClass="bg-rose-500" loading={loading} />
          <StatChip label="미수신" value={unknownCount} dotClass="bg-zinc-400" loading={loading} />
        </div>

        {/* 데스크톱 사이드바 (lg+) */}
        <aside className="hidden lg:flex absolute top-0 right-0 bottom-0 w-96 bg-background/95 backdrop-blur border-l flex-col z-10">
          <div className="px-4 py-4 border-b shrink-0">
            <h2 className="text-sm font-semibold">장비 정보 및 상태</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              마커 또는 항목 클릭 시 상세 표시
            </p>
          </div>

          {selected && (
            <div className="p-4 border-b shrink-0">
              <EquipDetail equip={selected} />
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <EquipList
              equips={equips}
              loading={loading}
              selectedCode={selectedCode}
              onSelect={handleSelect}
            />
          </div>
        </aside>

        {/* 모바일: 항상 화면 하단에 떠있는 핸들 (선택 장비 카드 또는 토글 버튼) */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden absolute bottom-4 left-3 right-3 rounded-xl border bg-background/95 backdrop-blur shadow-lg px-4 py-3 flex items-center gap-3 active:bg-muted/40 transition-colors z-10"
          aria-label="장비 목록 열기"
        >
          {selected ? (
            <>
              <span
                className={`size-2.5 rounded-full shrink-0 ${
                  selected.status === "fine"
                    ? "bg-emerald-500"
                    : selected.status === "bad"
                      ? "bg-rose-500"
                      : "bg-zinc-400"
                }`}
              />
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium truncate">
                  {selected.name || `장비 #${selected.code}`}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  탭하여 상세 / 전체 목록 보기
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="size-2.5 rounded-full bg-foreground/40 shrink-0" />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">
                  {loading ? "장비 정보 불러오는 중…" : `장비 ${equips.length}대`}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  탭하여 목록 보기
                </div>
              </div>
            </>
          )}
          <span className="text-muted-foreground text-lg leading-none">▴</span>
        </button>

        {/* 모바일 드로어 backdrop + 시트 */}
        <div
          aria-hidden={!drawerOpen}
          onClick={() => setDrawerOpen(false)}
          className={`lg:hidden absolute inset-0 bg-black/30 transition-opacity z-20 ${
            drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        />
        <div
          role="dialog"
          aria-label="장비 정보 패널"
          className={`lg:hidden absolute bottom-0 left-0 right-0 max-h-[82vh] flex flex-col bg-background rounded-t-2xl border-t shadow-2xl transition-transform duration-200 z-30 ${
            drawerOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="py-3 flex justify-center"
            aria-label="닫기"
          >
            <span className="h-1 w-10 rounded-full bg-muted-foreground/40" />
          </button>
          {selected && (
            <div className="px-4 pb-3 shrink-0">
              <EquipDetail equip={selected} />
            </div>
          )}
          <div className="px-1 pb-2 border-t pt-2 text-xs text-muted-foreground sticky top-0 bg-background z-10 flex items-center justify-between">
            <span className="px-3">장비 목록 ({equips.length}대)</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <EquipList
              equips={equips}
              loading={loading}
              selectedCode={selectedCode}
              onSelect={(e) => {
                setSelectedCode(e.code);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  dotClass,
  loading,
}: {
  label: string;
  value: number;
  dotClass: string;
  loading: boolean;
}) {
  return (
    <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-background/95 backdrop-blur border px-3 py-1.5 shadow-sm">
      <span className={`size-1.5 rounded-full ${dotClass}`} />
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">
        {loading ? "—" : value}
      </span>
    </div>
  );
}
