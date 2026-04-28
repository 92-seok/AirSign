"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BV24Editor } from "@/components/bv24-editor";
import { EquipForm } from "@/components/equip-form";
import { ScenarioCard } from "@/components/scenario-card";
import { ScenarioFormSheet } from "@/components/scenario-form-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/lib/api";
import {
  createEquip,
  fetchEquip,
  fetchEquipStatus,
  parseBVString,
  sendEquipConfig,
  updateEquip,
  updateEquipBV,
  type EquipDetailItem,
  type EquipPayload,
  type EquipStatus,
  type EquipStatusHistory,
} from "@/lib/equip-api";
import {
  deleteScenario,
  fetchScenariosForEquip,
  sendScenariosForEquip,
  type ScenarioListItem,
} from "@/lib/scenario-api";

export type SheetPanel =
  | "overview"
  | "scenario"
  | "status"
  | "bv"
  | "edit"
  | "new";

interface Props {
  code: number | null;
  panel: SheetPanel | null;
  onClose: () => void;
  onPanelChange: (panel: SheetPanel) => void;
  onMutated: () => void;
}

export function EquipSheet({
  code,
  panel,
  onClose,
  onPanelChange,
  onMutated,
}: Props) {
  const open = panel !== null;
  const isNew = panel === "new";
  const showTabs = !isNew && code !== null;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl flex flex-col p-0 gap-0"
      >
        {isNew ? (
          <NewPanel
            onSuccess={() => {
              onClose();
              onMutated();
            }}
            onCancel={onClose}
          />
        ) : showTabs ? (
          <ExistingPanels
            code={code}
            panel={panel ?? "overview"}
            onPanelChange={onPanelChange}
            onMutated={onMutated}
            onClose={onClose}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/* ──────────────────── 신규 등록 ──────────────────── */

function NewPanel({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload: EquipPayload) => {
    setSubmitting(true);
    try {
      const created = await createEquip(payload);
      toast.success(`장비 #${created.code}을(를) 등록했습니다.`);
      onSuccess();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "장비 등록에 실패했습니다.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b">
        <SheetTitle className="text-xl">장비 등록</SheetTitle>
        <p className="text-sm text-muted-foreground">
          새 LED 전광판 장비 정보를 등록합니다.
        </p>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <EquipForm
          submitting={submitting}
          submitLabel="장비 등록"
          onSubmit={handleSubmit}
          onCancel={onCancel}
        />
      </div>
    </>
  );
}

/* ──────────────────── 기존 장비 — 4 탭 ──────────────────── */

function ExistingPanels({
  code,
  panel,
  onPanelChange,
  onMutated,
  onClose,
}: {
  code: number;
  panel: SheetPanel;
  onPanelChange: (panel: SheetPanel) => void;
  onMutated: () => void;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<EquipDetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try {
      const data = await fetchEquip(code);
      setDetail(data);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "장비 정보를 불러올 수 없습니다.";
      setError(msg);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    }, 0);
    void (async () => {
      try {
        const data = await fetchEquip(code);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "장비 정보를 불러올 수 없습니다.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [code]);

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-3 border-b">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">#{code}</span>
          {detail?.cate && <span>· {detail.cate}</span>}
        </div>
        <SheetTitle className="text-xl">
          {loading
            ? "불러오는 중…"
            : (detail?.name?.trim() || `장비 #${code}`)}
        </SheetTitle>
      </SheetHeader>

      <Tabs
        value={panel}
        onValueChange={(v) => onPanelChange(v as SheetPanel)}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="px-6 pt-3 pb-2 border-b">
          <TabsList className="w-full">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="scenario">시나리오</TabsTrigger>
            <TabsTrigger value="status">상태 이력</TabsTrigger>
            <TabsTrigger value="bv">밝기·볼륨</TabsTrigger>
            <TabsTrigger value="edit">수정</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="overview" className="px-6 py-5">
            <OverviewTab
              detail={detail}
              loading={loading}
              error={error}
              code={code}
            />
          </TabsContent>
          <TabsContent value="scenario" className="px-6 py-5">
            <ScenarioTab code={code} />
          </TabsContent>
          <TabsContent value="status" className="px-6 py-5">
            <StatusTab code={code} />
          </TabsContent>
          <TabsContent value="bv" className="px-6 py-5">
            <BVTab
              detail={detail}
              loading={loading}
              code={code}
              onMutated={() => {
                void reload();
                onMutated();
              }}
              onCancel={onClose}
            />
          </TabsContent>
          <TabsContent value="edit" className="px-6 py-5">
            <EditTab
              detail={detail}
              loading={loading}
              code={code}
              onMutated={() => {
                void reload();
                onMutated();
              }}
              onCancel={onClose}
            />
          </TabsContent>
        </div>
      </Tabs>
    </>
  );
}

/* ──────────────────── 시나리오 탭 ──────────────────── */

function ScenarioTab({ code }: { code: number }) {
  const [items, setItems] = useState<ScenarioListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<ScenarioListItem | null>(null);

  const refresh = async () => {
    try {
      const data = await fetchScenariosForEquip(code);
      setItems(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "시나리오를 불러올 수 없습니다.",
      );
    }
  };

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    }, 0);
    void (async () => {
      try {
        const data = await fetchScenariosForEquip(code);
        if (!cancelled) setItems(data);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "시나리오를 불러올 수 없습니다.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [code]);

  const handleDelete = async (item: ScenarioListItem) => {
    if (
      !window.confirm(
        `시나리오 [${item.name || item.code}]를 삭제하시겠습니까?`,
      )
    )
      return;
    setDeletingCode(item.code);
    try {
      await deleteScenario(item.code);
      toast.success("시나리오를 삭제했습니다.");
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "삭제에 실패했습니다.",
      );
    } finally {
      setDeletingCode(null);
    }
  };

  const [sending, setSending] = useState(false);
  const handleSendAll = async () => {
    setSending(true);
    try {
      const result = await sendScenariosForEquip(code);
      if (result.ok) {
        toast.success(`단말 송출 성공 (${result.durationMs}ms)`);
      } else {
        toast.error(`단말 송출 실패: ${result.body || "응답 없음"}`);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "송출 요청 실패",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-sky-50/40 dark:bg-sky-950/20 p-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">활성 시나리오 단말 송출</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            현재 시간 기준 활성 시나리오만 단말로 즉시 송출 (POST /scenario)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendAll}
          disabled={sending}
        >
          {sending ? "송출 중…" : "지금 송출"}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">송출 시나리오</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            전체 {items.length}개
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setFormInitial(null);
            setFormOpen(true);
          }}
        >
          + 시나리오 추가
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-xl border bg-card overflow-hidden animate-pulse"
            >
              <div className="aspect-[16/9] bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-muted/60 rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-rose-600 py-8 text-center">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
          이 장비에는 등록된 시나리오가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((it) => (
            <ScenarioCard
              key={it.code}
              scenario={it}
              deleting={deletingCode === it.code}
              onDelete={() => handleDelete(it)}
              onEdit={() => {
                setFormInitial(it);
                setFormOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <ScenarioFormSheet
        open={formOpen}
        equipCode={code}
        initial={formInitial}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          void refresh();
        }}
      />
    </div>
  );
}

/* ──────────────────── 개요 탭 ──────────────────── */

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

function OverviewTab({
  detail,
  loading,
  error,
  code,
}: {
  detail: EquipDetailItem | null;
  loading: boolean;
  error: string | null;
  code: number;
}) {
  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        불러오는 중…
      </div>
    );
  }
  if (error || !detail) {
    return (
      <div className="text-sm text-rose-600 py-8 text-center">
        {error ?? "장비를 찾을 수 없습니다."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <DetailCard title="기본 정보" accent={ACCENT.sky}>
        <DetailItem label="장비 코드" value={`#${detail.code}`} mono />
        <DetailItem label="이름" value={detail.name || "—"} />
        <DetailItem label="카테고리" value={detail.cate || "—"} />
        <DetailItem label="디스플레이" value={detail.displayType || "—"} />
        <DetailItem label="상태" value={<EquipStatusBadge status={detail.status} />} />
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

      <div className="sm:col-span-2 flex justify-end pt-2">
        <Link
          href={`/equip/${code}/edit`}
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
          전체 화면으로 수정
        </Link>
      </div>
    </div>
  );
}

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

function EquipStatusBadge({ status }: { status: EquipStatus }) {
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
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

/* ──────────────────── 상태 이력 탭 ──────────────────── */

function StatusTab({ code }: { code: number }) {
  const [history, setHistory] = useState<EquipStatusHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    }, 0);
    void (async () => {
      try {
        const data = await fetchEquipStatus(code);
        if (!cancelled) setHistory(data);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "상태 이력을 불러올 수 없습니다.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [code]);

  const stats = useMemo(() => {
    if (!history) return null;
    const days = history.daily.length;
    const avg = days > 0 ? Math.round(history.total / days) : 0;
    const max = history.daily.reduce((m, d) => Math.max(m, d.count), 0);
    return { days, avg, max };
  }, [history]);

  const grid = useMemo(() => {
    if (!history) return [];
    const today = new Date();
    const map = new Map(history.daily.map((d) => [d.date, d.count]));
    const result: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      result.push({ date: key, count: map.get(key) ?? 0 });
    }
    return result;
  }, [history]);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        불러오는 중…
      </div>
    );
  }
  if (error || !history || !stats) {
    return (
      <div className="text-sm text-rose-600 py-8 text-center">
        {error ?? "상태 이력을 찾을 수 없습니다."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <SummaryBox label="총 수신" value={history.total.toLocaleString()} unit="건" />
        <SummaryBox label="기록 일수" value={String(stats.days)} unit="/ 30일" />
        <SummaryBox label="일평균" value={String(stats.avg)} unit="건/일" />
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">일별 통신량 (최근 30일)</h3>
          <span className="text-xs text-muted-foreground">
            최대 {stats.max.toLocaleString()}건
          </span>
        </div>
        <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1 h-24">
          {grid.map((d) => {
            const ratio = stats.max > 0 ? d.count / stats.max : 0;
            const isWeekend = [0, 6].includes(new Date(d.date).getDay());
            return (
              <div
                key={d.date}
                className="flex flex-col gap-1 min-w-0"
                title={`${d.date} — ${d.count.toLocaleString()}건`}
              >
                <div className="flex-1 bg-muted/50 rounded-sm relative overflow-hidden">
                  <div
                    className={`absolute bottom-0 inset-x-0 transition-all duration-200 ${
                      d.count === 0
                        ? "bg-muted-foreground/20"
                        : "bg-gradient-to-t from-sky-500 to-cyan-400"
                    }`}
                    style={{
                      height: `${Math.max(ratio * 100, d.count > 0 ? 4 : 0)}%`,
                    }}
                  />
                </div>
                <span
                  className={`text-[10px] text-center leading-none font-mono ${
                    isWeekend ? "text-rose-500/70" : "text-muted-foreground"
                  }`}
                >
                  {Number(d.date.slice(8, 10))}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">최근 통신 이력</h3>
          <span className="text-xs text-muted-foreground">
            상위 {history.items.length}건
          </span>
        </div>
        {history.items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            최근 30일 내 수신 기록이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-sky-50 via-cyan-50 to-sky-50 dark:from-sky-950/40 dark:via-cyan-950/30 dark:to-sky-950/40 text-xs font-semibold text-sky-800 dark:text-sky-200 border-b border-sky-200 dark:border-sky-800/40 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left whitespace-nowrap">수신 시각</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">IP</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">MAC</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">JHRev</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.items.map((it, idx) => (
                  <tr
                    key={`${it.date}-${idx}`}
                    className="text-xs hover:bg-muted/25 transition-colors"
                  >
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                      {formatDate(it.date)}
                    </td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">
                      {it.ip || "—"}
                    </td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-muted-foreground">
                      {it.mac || "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {it.rev || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryBox({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-xl font-semibold tabular-nums leading-none">
          {value}
        </span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

/* ──────────────────── 밝기·볼륨 탭 ──────────────────── */

function BVTab({
  detail,
  loading,
  code,
  onMutated,
  onCancel,
}: {
  detail: EquipDetailItem | null;
  loading: boolean;
  code: number;
  onMutated: () => void;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (bright: number[], volume: number[]) => {
    setSubmitting(true);
    try {
      await updateEquipBV(code, { bright, volume });
      toast.success("24시간 밝기·볼륨이 저장되었습니다.");
      onMutated();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "저장에 실패했습니다.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendNow = async () => {
    setSending(true);
    try {
      const result = await sendEquipConfig(code);
      if (result.ok) {
        toast.success(`단말 송출 성공 (${result.durationMs}ms)`);
      } else {
        toast.error(
          `단말 송출 실패: ${result.body || "응답 없음"}`,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "송출 요청 실패",
      );
    } finally {
      setSending(false);
    }
  };

  if (loading || !detail) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        불러오는 중…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-sky-50/40 dark:bg-sky-950/20 p-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">DB 저장 후 단말 송출</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            현재 DB의 밝기·볼륨을 단말로 즉시 송출 (POST /config)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendNow}
          disabled={sending || submitting}
        >
          {sending ? "송출 중…" : "지금 송출"}
        </Button>
      </div>

      <BV24Editor
        initialBright={parseBVString(detail.bright, 80)}
        initialVolume={parseBVString(detail.volume, 50)}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={onCancel}
      />
    </div>
  );
}

/* ──────────────────── 수정 탭 ──────────────────── */

function EditTab({
  detail,
  loading,
  code,
  onMutated,
  onCancel,
}: {
  detail: EquipDetailItem | null;
  loading: boolean;
  code: number;
  onMutated: () => void;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload: EquipPayload) => {
    setSubmitting(true);
    try {
      await updateEquip(code, payload);
      toast.success("장비 정보를 저장했습니다.");
      onMutated();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "수정에 실패했습니다.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !detail) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        불러오는 중…
      </div>
    );
  }

  return (
    <EquipForm
      initial={detail}
      submitting={submitting}
      submitLabel="저장"
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  );
}

/* ──────────────────── 유틸 ──────────────────── */

function formatDate(s: string | null): string {
  if (!s || s.length < 16) return "—";
  return `${s.slice(0, 10)} ${s.slice(11, 16)}`;
}
