"use client";

import type { EquipDashboardItem, EquipStatus } from "@/lib/equip-api";

interface Props {
  equips: EquipDashboardItem[];
  loading: boolean;
  selectedCode: number | null;
  onSelect: (equip: EquipDashboardItem) => void;
}

export function EquipList({ equips, loading, selectedCode, onSelect }: Props) {
  if (loading) return <SkeletonRows />;
  if (equips.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        등록된 장비가 없습니다.
      </div>
    );
  }
  return (
    <ul className="divide-y">
      {equips.map((e) => {
        const isSelected = selectedCode === e.code;
        return (
          <li key={e.code}>
            <button
              type="button"
              onClick={() => onSelect(e)}
              className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-3 ${
                isSelected
                  ? "bg-muted/70"
                  : "hover:bg-muted/40 active:bg-muted/60"
              }`}
            >
              <StatusDot status={e.status} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {e.name || `장비 #${e.code}`}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {e.addr || (e.lastDate ? formatShortDate(e.lastDate) : "위치 정보 없음")}
                </div>
              </div>
              <StatusBadge status={e.status} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function StatusDot({ status }: { status: EquipStatus }) {
  const cls =
    status === "fine"
      ? "bg-emerald-500"
      : status === "bad"
        ? "bg-rose-500"
        : "bg-zinc-400";
  return <span className={`mt-1.5 size-2 rounded-full shrink-0 ${cls}`} />;
}

function StatusBadge({ status }: { status: EquipStatus }) {
  const map: Record<EquipStatus, { label: string; cls: string }> = {
    fine: { label: "정상", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
    bad: { label: "이상", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-400" },
    unknown: { label: "미수신", cls: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400" },
  };
  const { label, cls } = map[status];
  return (
    <span
      className={`shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

function SkeletonRows() {
  return (
    <ul className="divide-y">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="px-4 py-3 flex items-start gap-3">
          <span className="mt-1.5 size-2 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-muted rounded w-2/3" />
            <div className="h-2.5 bg-muted/60 rounded w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatShortDate(s: string): string {
  if (!s || s.length < 16) return "";
  return `마지막 통신 ${s.slice(5, 10).replace("-", "/")} ${s.slice(11, 16)}`;
}
