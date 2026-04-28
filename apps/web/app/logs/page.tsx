"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { fetchEquipList, type EquipListItem } from "@/lib/equip-api";
import {
  fetchLogs,
  type LogItem,
  type LogResult,
} from "@/lib/log-api";

const LIMIT = 50;

const TYPE_OPTIONS = [
  { value: "", label: "전체" },
  { value: "scen-update", label: "시나리오 송출" },
  { value: "param-update", label: "변수 송출" },
  { value: "config", label: "설정 (밝기/볼륨)" },
];

export default function LogsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <Content />
      </Suspense>
    </AuthGuard>
  );
}

function Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const equipParam = searchParams.get("equip");
  const typeParam = searchParams.get("type") ?? "";
  const pageParam = Number(searchParams.get("page") ?? "1");

  const [equips, setEquips] = useState<EquipListItem[]>([]);
  const [items, setItems] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  // 1) 장비 목록 (필터용)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const eqs = await fetchEquipList();
        if (!cancelled) setEquips(eqs);
      } catch {
        // 무시 — 필터만 영향
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) 로그 페치
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) setLoading(true);
    }, 0);
    void (async () => {
      try {
        const data = await fetchLogs({
          equip: equipParam ? Number(equipParam) : undefined,
          type: typeParam || undefined,
          page: pageParam,
          limit: LIMIT,
        });
        if (!cancelled) {
          setItems(data.items);
          setTotal(data.total);
        }
      } catch (err) {
        if (cancelled) return;
        toast.error(
          err instanceof ApiError ? err.message : "이력 조회 실패",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [equipParam, typeParam, pageParam]);

  const setQuery = (next: Partial<Record<string, string>>) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    router.replace(`/logs?${sp.toString()}`, { scroll: false });
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const counts = useMemo(() => {
    const by = (r: LogResult) => items.filter((i) => i.result === r).length;
    return {
      ok: by("ok"),
      fail: by("fail"),
      unknown: by("unknown"),
    };
  }, [items]);

  return (
    <div className="min-h-svh flex flex-col">
      <AppHeader />
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-8 space-y-5">
        <header>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 dark:from-sky-400 dark:via-cyan-400 dark:to-emerald-400 bg-clip-text text-transparent">
            송출 이력
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            장비별 시나리오·변수·설정 송출 이력 조회
          </p>
        </header>

        {/* 필터 */}
        <section className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-sky-50 via-cyan-50 to-sky-50 dark:from-sky-950/40 dark:via-cyan-950/30 dark:to-sky-950/40 border-sky-200 dark:border-sky-800/40">
            <h2 className="text-sm font-semibold text-sky-800 dark:text-sky-200">
              필터
            </h2>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">
                장비
              </label>
              <select
                value={equipParam ?? ""}
                onChange={(e) =>
                  setQuery({ equip: e.target.value, page: "1" })
                }
                className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
              >
                <option value="">전체 장비</option>
                {equips.map((e) => (
                  <option key={e.code} value={String(e.code)}>
                    #{e.code} {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">
                동작 타입
              </label>
              <select
                value={typeParam}
                onChange={(e) => setQuery({ type: e.target.value, page: "1" })}
                className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setQuery({ equip: "", type: "", page: "1" })}
              >
                필터 초기화
              </Button>
            </div>
          </div>
        </section>

        {/* 요약 */}
        <section className="grid grid-cols-3 gap-3">
          <SummaryCard label="현재 페이지 OK" value={counts.ok} dot="bg-emerald-500" />
          <SummaryCard label="실패" value={counts.fail} dot="bg-rose-500" />
          <SummaryCard label="기타" value={counts.unknown} dot="bg-zinc-400" />
        </section>

        {/* 테이블 */}
        <section className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">이력 목록</h3>
            <span className="text-sm text-muted-foreground">
              총 {total.toLocaleString()}건 · {pageParam} / {totalPages} 페이지
            </span>
          </div>
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              불러오는 중…
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              조회 결과가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-sky-50 via-cyan-50 to-sky-50 dark:from-sky-950/40 dark:via-cyan-950/30 dark:to-sky-950/40 text-sm font-semibold text-sky-800 dark:text-sky-200 border-b border-sky-200 dark:border-sky-800/40">
                  <tr>
                    <Th className="w-44">일시</Th>
                    <Th>장비</Th>
                    <Th>동작</Th>
                    <Th>결과</Th>
                    <Th>응답</Th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((it, idx) => (
                    <>
                      <tr
                        key={`${it.date}-${idx}`}
                        onClick={() =>
                          setExpanded((e) => (e === idx ? null : idx))
                        }
                        className="text-sm hover:bg-muted/25 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3 tabular-nums whitespace-nowrap">
                          {it.date.slice(0, 19)}
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-medium truncate max-w-[14rem]">
                            {it.equipName || `장비 #${it.equipCode}`}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            #{it.equipCode}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <TypeBadge type={it.type} />
                        </td>
                        <td className="px-5 py-3">
                          <ResultBadge result={it.result} />
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground max-w-[24rem]">
                          <div className="truncate">{it.rawLog || "—"}</div>
                        </td>
                      </tr>
                      {expanded === idx && (
                        <tr key={`${it.date}-${idx}-detail`}>
                          <td colSpan={5} className="bg-muted/15 p-0">
                            <div className="p-5 space-y-2">
                              <div className="text-xs text-muted-foreground">
                                전송 본문 ({it.contentLength.toLocaleString()}자)
                              </div>
                              <pre className="font-mono text-[11px] text-muted-foreground bg-background border rounded p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-72 overflow-y-auto">
                                {it.contentPreview || "—"}
                                {it.contentLength > 240 && "…(미리보기 240자만)"}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {((pageParam - 1) * LIMIT + 1).toLocaleString()} ~{" "}
                {Math.min(pageParam * LIMIT, total).toLocaleString()} /{" "}
                {total.toLocaleString()}건
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pageParam <= 1}
                  onClick={() => setQuery({ page: String(pageParam - 1) })}
                >
                  이전
                </Button>
                <span className="font-mono text-sm tabular-nums">
                  {pageParam} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pageParam >= totalPages}
                  onClick={() => setQuery({ page: String(pageParam + 1) })}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-5 py-3.5 font-semibold text-left whitespace-nowrap text-sm ${className}`}
    >
      {children}
    </th>
  );
}

function SummaryCard({
  label,
  value,
  dot,
}: {
  label: string;
  value: number;
  dot: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`size-1.5 rounded-full ${dot}`} />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums leading-none">
        {value}
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    "scen-update": {
      label: "시나리오",
      cls: "bg-sky-500/10 text-sky-700 dark:text-sky-400 ring-sky-500/30",
    },
    "param-update": {
      label: "변수",
      cls: "bg-violet-500/10 text-violet-700 dark:text-violet-400 ring-violet-500/30",
    },
    config: {
      label: "설정",
      cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/30",
    },
  };
  const m = map[type] ?? {
    label: type || "—",
    cls: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 ring-zinc-500/30",
  };
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

function ResultBadge({ result }: { result: LogResult }) {
  const map: Record<LogResult, { label: string; cls: string }> = {
    ok: {
      label: "전송",
      cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/30",
    },
    fail: {
      label: "오류",
      cls: "bg-rose-500/10 text-rose-700 dark:text-rose-400 ring-rose-500/30",
    },
    unknown: {
      label: "?",
      cls: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 ring-zinc-500/30",
    },
  };
  const m = map[result];
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${m.cls}`}
    >
      {m.label}
    </span>
  );
}
