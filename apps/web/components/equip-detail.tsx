"use client";

import type { EquipDashboardItem, EquipStatus } from "@/lib/equip-api";

interface Props {
  equip: EquipDashboardItem;
}

const STATUS_META: Record<EquipStatus, { label: string; cls: string }> = {
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

export function EquipDetail({ equip }: Props) {
  const meta = STATUS_META[equip.status];

  return (
    <div className="rounded-xl border bg-card p-4 lg:p-5 space-y-3 lg:space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs lg:text-sm text-muted-foreground">
            장비 #{equip.code}
            {equip.cate && ` · ${equip.cate}`}
          </div>
          <h3 className="text-base lg:text-lg font-semibold truncate mt-0.5 lg:mt-1">
            {equip.name || `장비 #${equip.code}`}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 lg:px-2.5 py-0.5 lg:py-1 text-[10px] lg:text-xs font-medium ring-1 ${meta.cls}`}
        >
          {meta.label}
        </span>
      </div>

      {equip.addr && (
        <div className="text-xs lg:text-sm text-muted-foreground line-clamp-2">
          {equip.addr}
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-3 lg:gap-x-4 gap-y-2 lg:gap-y-3 text-xs lg:text-sm pt-1">
        <Row label="디스플레이" value={equip.displayType || "—"} />
        <Row label="전원" value={equip.onOff || "—"} />
        <Row label="IP:Port" value={equip.ip ? `${equip.ip}:${equip.port}` : "—"} mono />
        <Row label="마지막 통신" value={formatDate(equip.lastDate)} />
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5 lg:space-y-1 min-w-0">
      <dt className="text-[10px] lg:text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`truncate ${mono ? "font-mono text-[11px] lg:text-xs" : "text-xs lg:text-sm font-medium"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function formatDate(s: string): string {
  if (!s || s.length < 16) return "—";
  return `${s.slice(2, 10).replace(/-/g, "/")} ${s.slice(11, 16)}`;
}
