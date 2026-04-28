"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { ActiveScenarioStrip } from "@/components/active-scenario-strip";
import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";
import { EnvironmentStrip } from "@/components/environment-strip";
import { EquipSheet, type SheetPanel } from "@/components/equip-sheet";
import { GroupSendSheet } from "@/components/group-send-sheet";
import { KakaoMap } from "@/components/kakao-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import {
  fetchDashboardEnvironment,
  type DashboardEnvironment,
} from "@/lib/environment-api";
import {
  deleteEquip,
  fetchEquip,
  fetchEquipList,
  type EquipDashboardItem,
  type EquipDetailItem,
  type EquipListItem,
  type EquipStatus,
} from "@/lib/equip-api";

const TABLE_COLS = 8;

export default function EquipListPage() {
  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <Content />
      </Suspense>
    </AuthGuard>
  );
}

const VALID_PANELS: SheetPanel[] = [
  "overview",
  "scenario",
  "status",
  "bv",
  "edit",
  "new",
];

function parsePanel(raw: string | null): SheetPanel | null {
  if (raw && (VALID_PANELS as string[]).includes(raw))
    return raw as SheetPanel;
  return null;
}

function Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code");
  const panelParam = parsePanel(searchParams.get("panel"));
  const sheetCode = codeParam ? Number(codeParam) : null;
  const sheetPanel = panelParam;

  const [items, setItems] = useState<EquipListItem[]>([]);
  const [environment, setEnvironment] = useState<DashboardEnvironment>({
    airQuality: null,
    weather: null,
    trend: { air: [], weather: [] },
  });
  const [loading, setLoading] = useState(true);
  const [envLoading, setEnvLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [deletingCode, setDeletingCode] = useState<number | null>(null);
  const [expandedCode, setExpandedCode] = useState<number | null>(null);
  const [selectedCode, setSelectedCode] = useState<number | null>(null);
  const [groupSendOpen, setGroupSendOpen] = useState(false);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

  const refresh = useCallback(async () => {
    try {
      const data = await fetchEquipList();
      setItems(data);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "장비 목록을 불러올 수 없습니다.";
      toast.error(msg);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchEquipList();
        if (!cancelled) setItems(data);
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.addr.toLowerCase().includes(q) ||
        e.ip.toLowerCase().includes(q) ||
        e.cate.toLowerCase().includes(q),
    );
  }, [items, query]);

  const counts = useMemo(() => {
    const by = (s: EquipStatus) => items.filter((e) => e.status === s).length;
    return {
      total: items.length,
      fine: by("fine"),
      bad: by("bad"),
      unknown: by("unknown"),
    };
  }, [items]);

  // 시트 URL 쿼리 동기화
  const setSheet = useCallback(
    (code: number | null, panel: SheetPanel | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (panel === null) {
        params.delete("panel");
        params.delete("code");
      } else {
        if (code !== null) params.set("code", String(code));
        else params.delete("code");
        params.set("panel", panel);
      }
      const qs = params.toString();
      router.replace(qs ? `/equip?${qs}` : "/equip", { scroll: false });
    },
    [router, searchParams],
  );

  const openSheet = (code: number, panel: SheetPanel) =>
    setSheet(code, panel);
  const closeSheet = () => setSheet(null, null);

  // 지도 마커 ↔ 테이블 행 양방향 선택
  const handleMarkerClick = (e: EquipDashboardItem) => {
    setSelectedCode(e.code);
    setExpandedCode(e.code);
    const row = rowRefs.current.get(e.code);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleRowToggle = (code: number) => {
    setExpandedCode((prev) => (prev === code ? null : code));
    setSelectedCode(code);
  };

  const handleDelete = async (e: EquipListItem) => {
    if (
      !window.confirm(
        `[${e.name || `장비 #${e.code}`}] 장비를 정말 삭제하시겠습니까?\n이 동작은 되돌릴 수 없습니다.`,
      )
    ) {
      return;
    }
    setDeletingCode(e.code);
    try {
      await deleteEquip(e.code);
      toast.success("장비를 삭제했습니다.");
      if (expandedCode === e.code) setExpandedCode(null);
      if (selectedCode === e.code) setSelectedCode(null);
      await refresh();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "장비 삭제에 실패했습니다.";
      toast.error(msg);
    } finally {
      setDeletingCode(null);
    }
  };

  const selected = items.find((e) => e.code === selectedCode) ?? null;

  return (
    <div className="min-h-svh flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-5 lg:py-7 space-y-5 lg:space-y-6">
        {/* ───── 환경 정보 스트립 ───── */}
        <section>
          <EnvironmentStrip
            air={environment.airQuality}
            weather={environment.weather}
            airTrend={environment.trend.air}
            weatherTrend={environment.trend.weather}
            loading={envLoading}
          />
        </section>

        {/* ───── 지도 + 빠른 정보 ───── */}
        <section className="grid grid-cols-1 lg:grid-cols-[7fr_5fr] gap-4">
          {/* 지도 카드 */}
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b bg-gradient-to-r from-sky-50 via-cyan-50 to-sky-50 dark:from-sky-950/40 dark:via-cyan-950/30 dark:to-sky-950/40 border-sky-200 dark:border-sky-800/40 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-sky-800 dark:text-sky-200">
                장비 분포 지도
              </h2>
              <span className="text-xs text-muted-foreground">
                마커 클릭 시 행 강조
              </span>
            </div>
            <div className="relative h-[360px] lg:h-[420px]">
              <KakaoMap
                equips={items}
                selectedCode={selectedCode}
                onMarkerClick={handleMarkerClick}
                className="absolute inset-0"
              />
            </div>
          </div>

          {/* 장비 정보 카드 */}
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm flex flex-col">
            <div className="px-4 py-2.5 border-b bg-gradient-to-r from-sky-50 via-cyan-50 to-sky-50 dark:from-sky-950/40 dark:via-cyan-950/30 dark:to-sky-950/40 border-sky-200 dark:border-sky-800/40">
              <h2 className="text-sm font-semibold text-sky-800 dark:text-sky-200">
                장비 정보
              </h2>
            </div>
            <div className="p-3 lg:p-4 space-y-3 flex-1">
              <div className="grid grid-cols-4 gap-1.5">
                <StatBox label="전체" value={counts.total} dot="bg-sky-500" loading={loading} />
                <StatBox label="정상" value={counts.fine} dot="bg-emerald-500" loading={loading} />
                <StatBox label="이상" value={counts.bad} dot="bg-rose-500" loading={loading} />
                <StatBox label="미수신" value={counts.unknown} dot="bg-zinc-400" loading={loading} />
              </div>

              <div className="border-t pt-3">
                {selected ? (
                  <SelectedEquipMini
                    equip={selected}
                    onDelete={() => handleDelete(selected)}
                    deleting={deletingCode === selected.code}
                    onOpenPanel={(p) => openSheet(selected.code, p)}
                  />
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    지도 마커 또는 테이블 행을 선택하면
                    <br />상세 정보가 표시됩니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ───── 표출 중 시나리오 가로 스트립 ───── */}
        <section>
          <ActiveScenarioStrip
            equips={items}
            onPick={(equipCode) => {
              setSelectedCode(equipCode);
              setExpandedCode(equipCode);
              openSheet(equipCode, "scenario");
            }}
          />
        </section>

        {/* ───── 장비 테이블 ───── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 dark:from-sky-400 dark:via-cyan-400 dark:to-emerald-400 bg-clip-text text-transparent">
                장비 관리
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                전체 {counts.total}대 · 행 클릭 시 상세 펼침
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="이름·주소·IP·카테고리 검색…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 max-w-xs"
              />
              <Button
                variant="outline"
                size="default"
                onClick={() => setGroupSendOpen(true)}
                disabled={items.length === 0}
              >
                그룹 송출
              </Button>
              <Button
                size="default"
                onClick={() => setSheet(null, "new")}
              >
                + 등록
              </Button>
            </div>
          </div>

          {loading ? (
            <SkeletonView />
          ) : filtered.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            <>
              {/* 데스크탑/태블릿 — 테이블 */}
              <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-sky-50 via-cyan-50 to-sky-50 dark:from-sky-950/40 dark:via-cyan-950/30 dark:to-sky-950/40 text-sm border-b border-sky-200 dark:border-sky-800/40">
                      <tr>
                        <Th className="w-10" />
                        <Th className="w-16">#</Th>
                        <Th>이름</Th>
                        <Th className="w-20">상태</Th>
                        <Th>디스플레이</Th>
                        <Th>IP : Port</Th>
                        <Th>주소</Th>
                        <Th className="text-right">마지막 통신</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.map((e) => (
                        <Fragment key={e.code}>
                          <EquipRow
                            item={e}
                            expanded={expandedCode === e.code}
                            highlighted={selectedCode === e.code}
                            registerRow={(el) => {
                              if (el) rowRefs.current.set(e.code, el);
                              else rowRefs.current.delete(e.code);
                            }}
                            onClick={() => handleRowToggle(e.code)}
                          />
                          {expandedCode === e.code && (
                            <ExpandedRow
                              code={e.code}
                              deleting={deletingCode === e.code}
                              onDelete={() => handleDelete(e)}
                              onOpenPanel={(p) => openSheet(e.code, p)}
                            />
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 모바일 — 카드 */}
              <ul className="md:hidden grid grid-cols-1 gap-3">
                {filtered.map((e) => (
                  <EquipCard
                    key={e.code}
                    item={e}
                    expanded={expandedCode === e.code}
                    deleting={deletingCode === e.code}
                    onToggle={() => handleRowToggle(e.code)}
                    onDelete={() => handleDelete(e)}
                    onOpenPanel={(p) => openSheet(e.code, p)}
                  />
                ))}
              </ul>
            </>
          )}
        </section>
      </main>

      {/* ───── 통합 시트 (BV / 상태이력 / 수정 / 등록) ───── */}
      <EquipSheet
        code={sheetCode}
        panel={sheetPanel}
        onClose={closeSheet}
        onPanelChange={(p) => setSheet(sheetCode, p)}
        onMutated={() => void refresh()}
      />

      {/* ───── 그룹 송출 시트 ───── */}
      <GroupSendSheet
        open={groupSendOpen}
        equips={items}
        onClose={() => setGroupSendOpen(false)}
        onCompleted={() => void refresh()}
      />
    </div>
  );
}

/* ─────────────────────────────────────── 빠른 정보 카드 ──────────────── */

function StatBox({
  label,
  value,
  dot,
  loading,
}: {
  label: string;
  value: number;
  dot: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-md border bg-background px-2 py-1.5 flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <span className={`size-1.5 rounded-full ${dot}`} />
        {label}
      </div>
      <div className="text-base font-semibold tabular-nums leading-none">
        {loading ? "—" : value}
      </div>
    </div>
  );
}

function SelectedEquipMini({
  equip,
  onDelete,
  deleting,
  onOpenPanel,
}: {
  equip: EquipListItem;
  onDelete: () => void;
  deleting: boolean;
  onOpenPanel: (panel: SheetPanel) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold truncate min-w-0 flex-1">
          {equip.name || `장비 #${equip.code}`}
        </h3>
        <StatusBadge status={equip.status} />
      </div>

      <div className="text-xs text-muted-foreground tabular-nums">
        마지막 통신{" "}
        <span className="font-medium text-foreground">
          {formatDate(equip.lastDate)}
        </span>
      </div>

      <div className="flex items-center gap-1.5 pt-2 border-t flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenPanel("scenario")}
        >
          시나리오
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenPanel("status")}
        >
          상태 이력
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenPanel("bv")}
        >
          밝기·볼륨
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenPanel("edit")}
        >
          수정
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={deleting}
        >
          {deleting ? "삭제…" : "삭제"}
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── 테이블 ──────────────────────── */

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-5 py-3.5 font-semibold text-left text-sky-800 dark:text-sky-200 whitespace-nowrap text-sm ${className}`}
    >
      {children}
    </th>
  );
}

function EquipRow({
  item,
  expanded,
  highlighted,
  registerRow,
  onClick,
}: {
  item: EquipListItem;
  expanded: boolean;
  highlighted: boolean;
  registerRow: (el: HTMLTableRowElement | null) => void;
  onClick: () => void;
}) {
  return (
    <tr
      ref={registerRow}
      onClick={onClick}
      className={`transition-colors text-sm cursor-pointer ${
        expanded
          ? "bg-sky-50/70 dark:bg-sky-950/30"
          : highlighted
            ? "bg-sky-50/40 dark:bg-sky-950/15"
            : "hover:bg-muted/25"
      }`}
    >
      <td className="px-5 py-3.5 text-muted-foreground">
        <Chevron expanded={expanded} />
      </td>
      <td className="px-5 py-3.5 text-sm text-muted-foreground tabular-nums">
        #{item.code}
      </td>
      <td className="px-5 py-3.5 min-w-0">
        <div className="font-semibold truncate max-w-[18rem]">
          {item.name || `장비 #${item.code}`}
        </div>
        {item.cate && (
          <div className="text-sm text-muted-foreground mt-0.5">
            {item.cate}
          </div>
        )}
      </td>
      <td className="px-5 py-3.5">
        <StatusBadge status={item.status} />
      </td>
      <td className="px-5 py-3.5 text-sm text-muted-foreground">
        {item.displayType || "—"}
      </td>
      <td className="px-5 py-3.5 font-mono text-sm whitespace-nowrap text-muted-foreground">
        {item.ip ? `${item.ip}:${item.port}` : "—"}
      </td>
      <td className="px-5 py-3.5 text-sm text-muted-foreground max-w-[20rem]">
        <div className="truncate">{item.addr || "—"}</div>
      </td>
      <td className="px-5 py-3.5 text-sm tabular-nums whitespace-nowrap text-right text-muted-foreground">
        {formatDate(item.lastDate)}
      </td>
    </tr>
  );
}

function ExpandedRow({
  code,
  deleting,
  onDelete,
  onOpenPanel,
}: {
  code: number;
  deleting: boolean;
  onDelete: () => void;
  onOpenPanel: (panel: SheetPanel) => void;
}) {
  return (
    <tr className="bg-muted/15">
      <td colSpan={TABLE_COLS} className="p-0">
        <ExpandedDetail
          code={code}
          deleting={deleting}
          onDelete={onDelete}
          onOpenPanel={onOpenPanel}
        />
      </td>
    </tr>
  );
}

function ExpandedDetail({
  code,
  deleting,
  onDelete,
  onOpenPanel,
}: {
  code: number;
  deleting: boolean;
  onDelete: () => void;
  onOpenPanel: (panel: SheetPanel) => void;
}) {
  const [detail, setDetail] = useState<EquipDetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchEquip(code);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "상세 정보를 불러올 수 없습니다.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (loading) {
    return (
      <div className="px-6 py-6 text-sm text-muted-foreground">
        상세 정보 불러오는 중…
      </div>
    );
  }
  if (error || !detail) {
    return (
      <div className="px-6 py-6 text-sm text-rose-600">
        {error ?? "장비를 찾을 수 없습니다."}
      </div>
    );
  }

  return (
    <div className="px-5 py-5 lg:px-8 lg:py-6 space-y-4 bg-gradient-to-br from-muted/40 via-muted/15 to-background">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <DetailCard title="기본 정보" accent={ACCENT.sky}>
          <DetailItem label="장비 코드" value={`#${detail.code}`} mono />
          <DetailItem label="이름" value={detail.name || "—"} />
          <DetailItem label="카테고리" value={detail.cate || "—"} />
          <DetailItem label="디스플레이" value={detail.displayType || "—"} />
        </DetailCard>

        <DetailCard title="네트워크" accent={ACCENT.violet}>
          <DetailItem
            label="IP : Port"
            value={detail.ip ? `${detail.ip}:${detail.port}` : "—"}
            mono
          />
          <DetailItem label="Sub IP" value={detail.subIp || "—"} mono />
          <DetailItem label="C2 MAC" value={detail.c2Mac || "—"} mono />
          <DetailItem label="C10 ID" value={detail.c10Id || "—"} mono />
        </DetailCard>

        <DetailCard title="설치 위치" accent={ACCENT.emerald}>
          <DetailItem label="주소" value={detail.addr || "—"} />
          <DetailItem
            label="위도"
            value={detail.lat !== null ? String(detail.lat) : "—"}
            mono
          />
          <DetailItem
            label="경도"
            value={detail.lng !== null ? String(detail.lng) : "—"}
            mono
          />
        </DetailCard>

        <DetailCard title="측정소 · 운영" accent={ACCENT.amber}>
          <DetailItem
            label="대기 코드"
            value={detail.air !== null ? String(detail.air) : "—"}
            mono
          />
          <DetailItem
            label="기상 코드"
            value={detail.weather !== null ? String(detail.weather) : "—"}
            mono
          />
          <DetailItem label="전원" value={detail.onOff || "—"} />
          <DetailItem label="펌웨어" value={detail.firmware || "—"} />
          <DetailItem
            label="마지막 통신"
            value={formatDate(detail.lastDate) || "—"}
          />
        </DetailCard>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => onOpenPanel("status")}>
          상태 이력
        </Button>
        <Button variant="outline" size="sm" onClick={() => onOpenPanel("bv")}>
          밝기·볼륨
        </Button>
        <Button variant="outline" size="sm" onClick={() => onOpenPanel("edit")}>
          수정
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={deleting}
        >
          {deleting ? "삭제 중…" : "삭제"}
        </Button>
      </div>
    </div>
  );
}

interface AccentTheme {
  border: string;
  bg: string;
  text: string;
  dot: string;
}

const ACCENT: Record<"sky" | "violet" | "emerald" | "amber", AccentTheme> = {
  sky: {
    border: "border-sky-500",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    text: "text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  violet: {
    border: "border-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    text: "text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  emerald: {
    border: "border-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  amber: {
    border: "border-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
};

function DetailCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: AccentTheme;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border bg-background overflow-hidden shadow-sm border-l-4 ${accent.border}`}
    >
      <div
        className={`flex items-center gap-2 px-4 py-2.5 border-b ${accent.bg}`}
      >
        <span className={`size-1.5 rounded-full ${accent.dot}`} />
        <span className={`text-sm font-semibold ${accent.text}`}>{title}</span>
      </div>
      <dl className="px-4 py-2.5 divide-y divide-border/60">{children}</dl>
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd
        className={`min-w-0 truncate text-right ${mono ? "font-mono" : ""}`}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <span
      className={`inline-block transition-transform text-[10px] ${
        expanded ? "rotate-90" : ""
      }`}
      aria-hidden
    >
      ▶
    </span>
  );
}

function EquipCard({
  item,
  expanded,
  deleting,
  onToggle,
  onDelete,
  onOpenPanel,
}: {
  item: EquipListItem;
  expanded: boolean;
  deleting: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onOpenPanel: (panel: SheetPanel) => void;
}) {
  return (
    <li className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full text-left p-4 transition-colors ${
          expanded ? "bg-sky-50/70 dark:bg-sky-950/30" : "active:bg-muted/40"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-muted-foreground">
              #{item.code}
              {item.cate && ` · ${item.cate}`}
            </div>
            <h3 className="text-base font-semibold truncate mt-0.5">
              {item.name || `장비 #${item.code}`}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={item.status} />
            <Chevron expanded={expanded} />
          </div>
        </div>

        {item.addr && (
          <div className="text-xs text-muted-foreground line-clamp-1 mt-2">
            📍 {item.addr}
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t">
          <ExpandedDetail
            code={item.code}
            deleting={deleting}
            onDelete={onDelete}
            onOpenPanel={onOpenPanel}
          />
        </div>
      )}
    </li>
  );
}

function StatusBadge({ status }: { status: EquipStatus }) {
  const map: Record<EquipStatus, { label: string; cls: string }> = {
    fine: {
      label: "정상",
      cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/30",
    },
    bad: {
      label: "이상",
      cls: "bg-rose-500/10 text-rose-700 dark:text-rose-400 ring-rose-500/30",
    },
    unknown: {
      label: "미수신",
      cls: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 ring-zinc-500/30",
    },
  };
  const m = map[status];
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] lg:text-xs font-medium ring-1 ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

function SkeletonView() {
  return (
    <>
      <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
        <div className="bg-muted/40 h-12 border-b" />
        <div className="divide-y">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="px-5 py-4 flex items-center gap-3 animate-pulse"
            >
              <div className="h-3 bg-muted rounded w-3 shrink-0" />
              <div className="h-3 bg-muted rounded w-10 shrink-0" />
              <div className="h-4 bg-muted rounded flex-1 max-w-[16rem]" />
              <div className="h-5 bg-muted rounded w-14 shrink-0" />
              <div className="h-3 bg-muted/60 rounded w-32 shrink-0 hidden lg:block" />
              <div className="h-3 bg-muted/60 rounded flex-1 hidden xl:block" />
              <div className="h-3 bg-muted/60 rounded w-24 shrink-0 hidden lg:block" />
            </div>
          ))}
        </div>
      </div>

      <ul className="md:hidden grid grid-cols-1 gap-3">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="rounded-xl border bg-card p-4 space-y-2 animate-pulse"
          >
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-3 bg-muted/60 rounded w-full" />
          </li>
        ))}
      </ul>
    </>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed bg-card/50 p-10 lg:p-16 text-center">
      <h2 className="text-base lg:text-lg font-semibold">
        {query ? "검색 결과가 없습니다" : "등록된 장비가 없습니다"}
      </h2>
      <p className="text-xs lg:text-sm text-muted-foreground mt-2">
        {query
          ? "다른 검색어를 시도해보세요."
          : "+ 등록 버튼을 눌러 첫 장비를 추가해주세요."}
      </p>
    </div>
  );
}

function formatDate(s: string): string {
  if (!s || s.length < 16) return "—";
  return `${s.slice(2, 10).replace(/-/g, "/")} ${s.slice(11, 16)}`;
}
