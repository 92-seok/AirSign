"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApiError } from "@/lib/api";
import type { EquipListItem } from "@/lib/equip-api";
import {
  fetchScenarioTypes,
  groupSendScenario,
  type GroupSendItemResult,
  type ScenarioPayload,
  type ScenarioTypeOption,
} from "@/lib/scenario-api";

interface Props {
  open: boolean;
  equips: EquipListItem[];
  onClose: () => void;
  /** 선택된 장비들에 시나리오 등록이 끝났을 때 호출 */
  onCompleted?: () => void;
}

export function GroupSendSheet({ open, equips, onClose, onCompleted }: Props) {
  const [types, setTypes] = useState<ScenarioTypeOption[]>([]);

  // 장비 선택
  const [search, setSearch] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<Set<number>>(new Set());

  // 시나리오 폼
  const [name, setName] = useState("");
  const [typeCode, setTypeCode] = useState("");
  const [orderby, setOrderby] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewData, setViewData] = useState("");
  const [text, setText] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<GroupSendItemResult[] | null>(null);

  // 시트 열릴 때마다 폼 초기화 (set-state-in-effect 회피)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setSearch("");
      setSelectedCodes(new Set());
      setName("");
      setTypeCode("");
      setOrderby("");
      setStartDate("");
      setEndDate("");
      setViewData("");
      setText("");
      setResults(null);
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  // 시나리오 타입 1회 로드
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ts = await fetchScenarioTypes();
        if (!cancelled) setTypes(ts);
      } catch {
        // 무시
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEquips = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return equips;
    return equips.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.addr.toLowerCase().includes(q) ||
        e.ip.toLowerCase().includes(q) ||
        e.cate.toLowerCase().includes(q),
    );
  }, [equips, search]);

  const allFilteredSelected =
    filteredEquips.length > 0 &&
    filteredEquips.every((e) => selectedCodes.has(e.code));

  const toggleCode = (code: number) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredEquips.forEach((e) => next.delete(e.code));
      } else {
        filteredEquips.forEach((e) => next.add(e.code));
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedCodes.size === 0) {
      toast.error("적용할 장비를 1대 이상 선택해주세요.");
      return;
    }
    if (!typeCode) {
      toast.error("시나리오 타입을 선택해주세요.");
      return;
    }
    if (!name.trim()) {
      toast.error("이름은 필수입니다.");
      return;
    }
    setSubmitting(true);
    setResults(null);
    try {
      // equipCode는 백엔드가 equipCodes 배열을 펼쳐 각각 채워주므로
      // payload 안에서는 placeholder(0)로 보내도 됩니다.
      const scenario: ScenarioPayload = {
        typeCode,
        equipCode: 0,
        name: name.trim(),
        orderby: orderby ? Number(orderby) : undefined,
        startDate: fromLocalInput(startDate) || undefined,
        endDate: fromLocalInput(endDate) || undefined,
        viewData: viewData.trim() || undefined,
        text: text || undefined,
      };
      const res = await groupSendScenario({
        equipCodes: Array.from(selectedCodes),
        scenario,
      });
      setResults(res.results);

      const okCount = res.results.filter((r) => r.ok).length;
      const failCount = res.results.length - okCount;
      if (failCount === 0) {
        toast.success(`${okCount}대 등록 완료`);
      } else if (okCount === 0) {
        toast.error(`전체 실패 (${failCount}대)`);
      } else {
        toast.warning(`성공 ${okCount}대 · 실패 ${failCount}대`);
      }
      onCompleted?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "그룹 송출에 실패했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl flex flex-col p-0 gap-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-sky-50 via-cyan-50 to-sky-50 dark:from-sky-950/40 dark:via-cyan-950/30 dark:to-sky-950/40">
          <SheetTitle className="text-xl">그룹 송출</SheetTitle>
          <p className="text-sm text-muted-foreground">
            여러 장비에 동일 시나리오를 일괄 등록합니다. (장비별로 개별 등록되어
            언제든 개별 수정이 가능)
          </p>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
        >
          {/* ─── 1. 장비 선택 ─── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-sky-800 dark:text-sky-200">
                1. 적용할 장비 선택{" "}
                <span className="text-rose-500 font-bold">*</span>
              </h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                선택됨: {selectedCodes.size} / 전체 {equips.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="이름·주소·IP·카테고리 검색…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={submitting}
                className="h-9 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleAllFiltered}
                disabled={submitting || filteredEquips.length === 0}
              >
                {allFilteredSelected ? "전체 해제" : "전체 선택"}
              </Button>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border bg-background divide-y">
              {filteredEquips.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  표시할 장비가 없습니다.
                </div>
              ) : (
                filteredEquips.map((e) => {
                  const checked = selectedCodes.has(e.code);
                  return (
                    <label
                      key={e.code}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                        checked
                          ? "bg-sky-50/70 dark:bg-sky-950/30"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCode(e.code)}
                        disabled={submitting}
                        className="size-4 accent-sky-600 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                            #{e.code}
                          </span>
                          <span className="text-sm font-medium truncate">
                            {e.name || `장비 #${e.code}`}
                          </span>
                          {e.cate && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              · {e.cate}
                            </span>
                          )}
                        </div>
                        {e.addr && (
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                            📍 {e.addr}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {e.ip ? `${e.ip}:${e.port}` : "—"}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </section>

          {/* ─── 2. 시나리오 정보 ─── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-sky-800 dark:text-sky-200">
              2. 시나리오 정보
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  타입 <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={typeCode}
                  onChange={(e) => setTypeCode(e.target.value)}
                  disabled={submitting}
                  className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 outline-none disabled:opacity-50"
                >
                  <option value="">선택 안 함</option>
                  {types.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.code} · {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">순서</Label>
                <Input
                  type="number"
                  min={0}
                  value={orderby}
                  onChange={(e) => setOrderby(e.target.value)}
                  disabled={submitting}
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                시나리오 이름 <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 미세먼지 일괄 안내"
                disabled={submitting}
                className="h-10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">시작일시</Label>
                <Input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={submitting}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">종료일시</Label>
                <Input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={submitting}
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                사용자 입력 (viewData)
              </Label>
              <Input
                value={viewData}
                onChange={(e) => setViewData(e.target.value)}
                placeholder="ST별 포맷 (텍스트|색상, 파일명|볼륨, pm25|pm10|... 등)"
                disabled={submitting}
                className="h-10 font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                레거시 PHP 호환 raw 입력. 다음 단계에서 타입별 상세 폼으로 교체됨.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                HTML 본문 (ST_007 전용)
              </Label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={submitting}
                rows={4}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 outline-none font-mono disabled:opacity-50"
                placeholder="<div>...</div>"
              />
            </div>
          </section>

          {/* ─── 3. 결과 ─── */}
          {results && (
            <section className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold">송출 결과</h3>
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {results.map((r) => {
                  const equip = equips.find((e) => e.code === r.equipCode);
                  return (
                    <li
                      key={r.equipCode}
                      className="flex items-center justify-between text-xs gap-2 py-1 border-b last:border-0"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className={`inline-block size-1.5 rounded-full shrink-0 ${
                            r.ok ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        <span className="text-muted-foreground tabular-nums shrink-0">
                          #{r.equipCode}
                        </span>
                        <span className="truncate">
                          {equip?.name || `장비 #${r.equipCode}`}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 font-medium ${
                          r.ok
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {r.ok
                          ? r.scenCode
                            ? `OK · ${r.scenCode}`
                            : "OK"
                          : (r.message ?? "실패")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <div className="flex items-center justify-between gap-2 pt-3 border-t sticky bottom-0 bg-popover -mx-6 px-6 py-3">
            <span className="text-xs text-muted-foreground">
              {selectedCodes.size > 0
                ? `${selectedCodes.size}대에 적용됩니다`
                : "장비를 선택해주세요"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                닫기
              </Button>
              <Button
                type="submit"
                disabled={submitting || selectedCodes.size === 0}
              >
                {submitting ? "송출 중…" : "그룹 송출"}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/** 'YYYY-MM-DDTHH:MM' → 'YYYY-MM-DD HH:MM:00' */
function fromLocalInput(s: string): string {
  if (!s || s.length < 16) return "";
  return `${s.slice(0, 10)} ${s.slice(11, 16)}:00`;
}
