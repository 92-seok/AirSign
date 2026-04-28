"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";
import { EnvironmentStrip } from "@/components/environment-strip";
import { EquipDetail } from "@/components/equip-detail";
import { EquipList } from "@/components/equip-list";
import { KakaoMap } from "@/components/kakao-map";
import { ApiError } from "@/lib/api";
import {
  fetchDashboardEnvironment,
  type DashboardEnvironment,
} from "@/lib/environment-api";
import { fetchDashboard, type EquipDashboardItem } from "@/lib/equip-api";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const [equips, setEquips] = useState<EquipDashboardItem[]>([]);
  const [environment, setEnvironment] = useState<DashboardEnvironment>({
    airQuality: null,
    weather: null,
    trend: { air: [], weather: [] },
  });
  const [equipsLoading, setEquipsLoading] = useState(true);
  const [envLoading, setEnvLoading] = useState(true);
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
        if (!cancelled) setEquipsLoading(false);
      }
    })();
    void (async () => {
      try {
        const data = await fetchDashboardEnvironment();
        if (!cancelled) setEnvironment(data);
      } catch (err) {
        if (cancelled) return;
        if (process.env.NODE_ENV !== "production") {
          console.error("[env]", err);
        }
      } finally {
        if (!cancelled) setEnvLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
      <AppHeader />

      {/* 환경 정보 행 — 살짝 다른 톤으로 분리 */}
      <section className="shrink-0 border-b bg-muted/30 z-20">
        <div className="px-3 sm:px-5 lg:px-7 py-3 lg:py-4">
          <EnvironmentStrip
            air={environment.airQuality}
            weather={environment.weather}
            airTrend={environment.trend.air}
            weatherTrend={environment.trend.weather}
            loading={envLoading}
          />
        </div>
      </section>

      {/* Main — 풀 지도 + 사이드바/드로어 */}
      <div className="flex-1 relative overflow-hidden">
        <KakaoMap
          equips={equips}
          selectedCode={selectedCode}
          onMarkerClick={handleSelect}
          className="absolute inset-0"
        />

        {/* 좌상단 floating 통계 chips */}
        <div className="absolute top-3 lg:top-4 left-3 lg:left-4 right-3 lg:right-[28rem] flex flex-wrap gap-2 lg:gap-2.5 pointer-events-none">
          <StatChip label="전체" value={equips.length} dotClass="bg-foreground/40" loading={equipsLoading} />
          <StatChip label="정상" value={fineCount} dotClass="bg-emerald-500" loading={equipsLoading} />
          <StatChip label="이상" value={badCount} dotClass="bg-rose-500" loading={equipsLoading} />
          <StatChip label="미수신" value={unknownCount} dotClass="bg-zinc-400" loading={equipsLoading} />
        </div>

        {/* 데스크톱 사이드바 (lg+) */}
        <aside className="hidden lg:flex absolute top-0 right-0 bottom-0 w-[28rem] bg-background/95 backdrop-blur border-l flex-col z-10">
          <div className="px-5 py-5 border-b shrink-0">
            <h2 className="text-base font-semibold">장비 정보 및 상태</h2>
            <p className="text-xs text-muted-foreground mt-1">
              마커 또는 항목 클릭 시 상세 표시
            </p>
          </div>

          {selected && (
            <div className="p-5 border-b shrink-0">
              <EquipDetail equip={selected} />
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <EquipList
              equips={equips}
              loading={equipsLoading}
              selectedCode={selectedCode}
              onSelect={handleSelect}
            />
          </div>
        </aside>

        {/* 모바일 핸들 */}
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
                  {equipsLoading ? "장비 정보 불러오는 중…" : `장비 ${equips.length}대`}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  탭하여 목록 보기
                </div>
              </div>
            </>
          )}
          <span className="text-muted-foreground text-lg leading-none">▴</span>
        </button>

        {/* 모바일 드로어 */}
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
              loading={equipsLoading}
              selectedCode={selectedCode}
              onSelect={(e) => setSelectedCode(e.code)}
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
    <div className="pointer-events-auto inline-flex items-center gap-2 lg:gap-2.5 rounded-full bg-background/95 backdrop-blur border px-3 lg:px-4 py-1.5 lg:py-2 shadow-sm">
      <span className={`size-1.5 lg:size-2 rounded-full ${dotClass}`} />
      <span className="text-[11px] lg:text-xs text-muted-foreground">
        {label}
      </span>
      <span className="text-sm lg:text-base font-semibold tabular-nums">
        {loading ? "—" : value}
      </span>
    </div>
  );
}
