"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";
import { ApiError } from "@/lib/api";
import {
  fetchEquip,
  fetchEquipStatus,
  type EquipDetailItem,
  type EquipStatusHistory,
  type EquipStatusItem,
} from "@/lib/equip-api";

export default function EquipStatusPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  return (
    <AuthGuard>
      <Content code={Number(code)} />
    </AuthGuard>
  );
}

function Content({ code }: { code: number }) {
  const [equip, setEquip] = useState<EquipDetailItem | null>(null);
  const [history, setHistory] = useState<EquipStatusHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [e, h] = await Promise.all([
          fetchEquip(code),
          fetchEquipStatus(code),
        ]);
        if (!cancelled) {
          setEquip(e);
          setHistory(h);
        }
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? err.message
            : "상태 이력을 불러올 수 없습니다.";
        setError(msg);
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="min-h-svh flex flex-col">
      <AppHeader />
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
        <div className="mb-7 lg:mb-9">
          <Link
            href="/equip"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← 장비 목록으로
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-3 bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 dark:from-sky-400 dark:via-cyan-400 dark:to-emerald-400 bg-clip-text text-transparent">
            장비 상태 이력
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {equip
              ? `${equip.name || `장비 #${code}`} · 최근 30일 통신 기록`
              : `장비 #${code}`}
          </p>
        </div>

        {loading ? (
          <SkeletonView />
        ) : error || !history ? (
          <div className="rounded-xl border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {error ?? "상태 이력을 찾을 수 없습니다."}
            </p>
          </div>
        ) : (
          <StatusView history={history} />
        )}
      </main>
    </div>
  );
}

function StatusView({ history }: { history: EquipStatusHistory }) {
  const stats = useMemo(() => {
    const days = history.daily.length;
    const avg = days > 0 ? Math.round(history.total / days) : 0;
    const lastItem = history.items[0];
    const max = history.daily.reduce((m, d) => Math.max(m, d.count), 0);
    return { days, avg, lastItem, max };
  }, [history]);

  return (
    <div className="space-y-4 lg:space-y-5">
      {/* 요약 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="총 수신" value={history.total.toLocaleString()} unit="건" />
        <SummaryCard
          label="기록 일수"
          value={String(stats.days)}
          unit="일 / 30"
        />
        <SummaryCard
          label="일평균"
          value={String(stats.avg)}
          unit="건/일"
        />
        <SummaryCard
          label="최근 통신"
          value={stats.lastItem ? formatDate(stats.lastItem.date) : "—"}
          unit=""
          mono
        />
      </div>

      {/* 일별 막대 그래프 */}
      <DailyChart history={history} max={stats.max} />

      {/* 최근 이력 표 */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">최근 통신 이력</h3>
          <span className="text-sm text-muted-foreground">
            상위 {history.items.length}건
          </span>
        </div>
        {history.items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            최근 30일 내 수신 기록이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-sky-50 via-cyan-50 to-sky-50 dark:from-sky-950/40 dark:via-cyan-950/30 dark:to-sky-950/40 text-sm font-semibold text-sky-800 dark:text-sky-200 border-b border-sky-200 dark:border-sky-800/40">
                <tr>
                  <Th>수신 시각</Th>
                  <Th>마지막 통신</Th>
                  <Th>IP</Th>
                  <Th>MAC</Th>
                  <Th>JHRev</Th>
                  <Th>JHC10</Th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.items.map((it, idx) => (
                  <tr
                    key={`${it.date}-${idx}`}
                    className="text-sm hover:bg-muted/25 transition-colors"
                  >
                    <td className="px-5 py-3 tabular-nums whitespace-nowrap">
                      {formatDate(it.date)}
                    </td>
                    <td className="px-5 py-3 tabular-nums whitespace-nowrap text-muted-foreground">
                      {formatDate(it.ldate)}
                    </td>
                    <td className="px-5 py-3 font-mono text-sm whitespace-nowrap">
                      {it.ip || "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-sm whitespace-nowrap text-muted-foreground">
                      {it.mac || "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-sm text-muted-foreground">
                      {it.rev || "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-sm text-muted-foreground">
                      {it.c10 || "—"}
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

function DailyChart({
  history,
  max,
}: {
  history: EquipStatusHistory;
  max: number;
}) {
  // 30일 그리드 생성 (오늘 기준 -29 ~ 0)
  const grid = useMemo(() => {
    const today = new Date();
    const result: { date: string; count: number }[] = [];
    const map = new Map(history.daily.map((d) => [d.date, d.count]));
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      result.push({ date: key, count: map.get(key) ?? 0 });
    }
    return result;
  }, [history.daily]);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">일별 통신량 (최근 30일)</h3>
        <span className="text-sm text-muted-foreground">
          최대 {max.toLocaleString()}건
        </span>
      </div>
      <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1 h-32">
        {grid.map((d) => {
          const ratio = max > 0 ? d.count / max : 0;
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
                  style={{ height: `${Math.max(ratio * 100, d.count > 0 ? 4 : 0)}%` }}
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
  );
}

function SummaryCard({
  label,
  value,
  unit,
  mono,
}: {
  label: string;
  value: string;
  unit: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 lg:p-5 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={`text-2xl lg:text-3xl font-semibold tabular-nums leading-none ${
            mono ? "font-mono text-base lg:text-lg" : ""
          }`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-sm text-muted-foreground">{unit}</span>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-left whitespace-nowrap">{children}</th>
  );
}

function SkeletonView() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border bg-card p-5 shadow-sm space-y-3"
          >
            <div className="h-3 bg-muted/60 rounded w-1/3" />
            <div className="h-7 bg-muted rounded w-2/3" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-5 h-44 shadow-sm" />
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="bg-muted/40 h-12 border-b" />
        <div className="divide-y">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="px-5 py-3 h-10" />
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDate(s: string | null): string {
  if (!s || s.length < 16) return "—";
  return `${s.slice(0, 10)} ${s.slice(11, 16)}`;
}

// 사용 안 하지만 EquipStatusItem 타입 참조 keep (트리쉐이킹 안전)
export type _Unused = EquipStatusItem;
