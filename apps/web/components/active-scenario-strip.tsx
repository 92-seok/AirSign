"use client";

import { useEffect, useMemo, useState } from "react";

import { LedPreview } from "@/components/led-preview";
import type { EquipListItem } from "@/lib/equip-api";
import {
  fetchActiveScenarios,
  type ScenarioListItem,
} from "@/lib/scenario-api";

interface Props {
  equips: EquipListItem[];
  /** 카드 클릭 시 해당 장비의 시나리오 패널을 연다 */
  onPick: (equipCode: number) => void;
}

interface SlotItem {
  scenario: ScenarioListItem;
  /** ST_002, ST_006 처럼 1 시나리오 → 다중 슬라이드인 경우 인덱스 */
  index: number;
}

/**
 * 표출 중(active/always) 시나리오를 LED 전광판 비율로 가로 1열에 나열.
 * 레거시 표출 시나리오 페이지(`scenDisplay.php`)와 동일한 합성 로직을 사용.
 *
 *   ST_002 (DT_003 세로형) → 슬라이드 2개 (온도/습도 + 풍향/풍속)
 *   ST_006              → viewData "pm25|pm10|..." 갯수만큼 슬라이드
 *   그 외                  → 1 슬라이드
 */
export function ActiveScenarioStrip({ equips, onPick }: Props) {
  const [items, setItems] = useState<ScenarioListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchActiveScenarios();
        if (!cancelled) setItems(data);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const slots: SlotItem[] = useMemo(() => expandSlots(items), [items]);
  const equipMap = useMemo(
    () => new Map(equips.map((e) => [String(e.code), e])),
    [equips],
  );

  return (
    <section className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 border-b bg-gradient-to-r from-emerald-50 via-sky-50 to-cyan-50 dark:from-emerald-950/40 dark:via-sky-950/30 dark:to-cyan-950/40 border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            표출 중 시나리오
          </h2>
          {!loading && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {slots.length}건
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground hidden sm:block">
          카드 클릭 → 장비 시나리오 관리
        </span>
      </div>

      {loading ? (
        <div className="px-4 py-3 flex gap-3 overflow-x-auto">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="shrink-0 w-32 h-56 rounded-md bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground">
          현재 표출 중인 시나리오가 없습니다.
        </div>
      ) : (
        <div className="px-4 py-3 flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory items-start">
          {slots.map((slot, i) => {
            const equipCode = Number(slot.scenario.equipCode);
            const equip = equipMap.get(slot.scenario.equipCode);
            const labelIndex = `${i + 1}`;
            return (
              <button
                key={`${slot.scenario.code}-${slot.index}`}
                type="button"
                onClick={() => onPick(equipCode)}
                className="shrink-0 snap-start group rounded-md border bg-background overflow-hidden hover:border-sky-400 hover:shadow-md transition-all text-left flex flex-col"
              >
                <div className="px-2 pt-1.5 pb-1 flex items-center justify-between gap-2 border-b">
                  <span className="text-[10px] font-mono text-muted-foreground truncate">
                    {labelIndex}. {slot.scenario.name || slot.scenario.code}
                  </span>
                </div>
                <div className="bg-zinc-950 flex items-center justify-center p-1">
                  <LedPreview
                    scenario={slot.scenario}
                    index={slot.index}
                    widthPx={128}
                  />
                </div>
                <div className="px-2 py-1.5 space-y-0.5 border-t">
                  <div className="text-[10px] text-muted-foreground truncate">
                    #{slot.scenario.equipCode} ·{" "}
                    {equip?.name || `장비 ${slot.scenario.equipCode}`}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-mono text-muted-foreground">
                      {slot.scenario.typeCode}
                    </span>
                    <ActiveBadge always={slot.scenario.status === "always"} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ActiveBadge({ always }: { always: boolean }) {
  if (always) {
    return (
      <span className="rounded-full px-1.5 py-0 text-[9px] font-medium bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-1 ring-violet-500/30">
        상시
      </span>
    );
  }
  return (
    <span className="rounded-full px-1.5 py-0 text-[9px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30">
      송출 중
    </span>
  );
}

/**
 * 1 시나리오 → N 슬롯으로 펼침. (ST_002 세로형 = 2슬롯, ST_006 = viewData 항목 수)
 */
function expandSlots(items: ScenarioListItem[]): SlotItem[] {
  const slots: SlotItem[] = [];
  for (const s of items) {
    if (s.typeCode === "ST_002") {
      // DT_003 세로형은 2슬라이드 (온도/습도 + 풍향/풍속), DT_001 가로형은 1슬라이드
      const count = s.equipDisplayCode === "DT_003" ? 2 : 1;
      for (let i = 0; i < count; i++) slots.push({ scenario: s, index: i });
    } else if (s.typeCode === "ST_006") {
      const keys = (s.viewData ?? "")
        .split("|")
        .map((k) => k.trim())
        .filter(Boolean);
      const count = Math.max(1, keys.length);
      for (let i = 0; i < count; i++) slots.push({ scenario: s, index: i });
    } else {
      slots.push({ scenario: s, index: 0 });
    }
  }
  return slots;
}
