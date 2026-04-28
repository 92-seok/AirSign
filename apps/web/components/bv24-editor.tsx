"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

interface Props {
  initialBright: number[];
  initialVolume: number[];
  submitting: boolean;
  onSubmit: (bright: number[], volume: number[]) => void | Promise<void>;
  onCancel?: () => void;
}

const PRESETS = [0, 30, 50, 80, 100];

export function BV24Editor({
  initialBright,
  initialVolume,
  submitting,
  onSubmit,
  onCancel,
}: Props) {
  const [bright, setBright] = useState(initialBright);
  const [volume, setVolume] = useState(initialVolume);

  const updateBright = (h: number, v: number) => {
    const next = [...bright];
    next[h] = clamp(v);
    setBright(next);
  };
  const updateVolume = (h: number, v: number) => {
    const next = [...volume];
    next[h] = clamp(v);
    setVolume(next);
  };
  const applyAllBright = (v: number) =>
    setBright(Array.from({ length: 24 }, () => v));
  const applyAllVolume = (v: number) =>
    setVolume(Array.from({ length: 24 }, () => v));

  return (
    <div className="space-y-4">
      {/* 24시간 시각화 */}
      <div className="rounded-xl border bg-card p-5 space-y-5 shadow-sm">
        <BarRow
          label="밝기"
          values={bright}
          color="bg-sky-500"
          textColor="text-sky-700 dark:text-sky-300"
        />
        <BarRow
          label="볼륨"
          values={volume}
          color="bg-amber-500"
          textColor="text-amber-700 dark:text-amber-300"
        />
      </div>

      {/* 빠른 적용 */}
      <div className="rounded-xl border bg-card p-5 space-y-3 shadow-sm">
        <h3 className="text-sm font-semibold">빠른 적용</h3>
        <PresetRow
          label="밝기"
          onApply={applyAllBright}
          submitting={submitting}
        />
        <PresetRow
          label="볼륨"
          onApply={applyAllVolume}
          submitting={submitting}
        />
      </div>

      {/* 24시간 편집 표 */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="grid grid-cols-[60px_1fr_60px_1fr_60px] bg-gradient-to-r from-sky-50 via-cyan-50 to-sky-50 dark:from-sky-950/40 dark:via-cyan-950/30 dark:to-sky-950/40 border-b border-sky-200 dark:border-sky-800/40 px-4 py-3 text-sm font-semibold text-sky-800 dark:text-sky-200">
          <div>시간</div>
          <div>밝기</div>
          <div className="text-right">%</div>
          <div>볼륨</div>
          <div className="text-right">%</div>
        </div>
        <div className="divide-y">
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="grid grid-cols-[60px_1fr_60px_1fr_60px] gap-3 px-4 py-2.5 items-center text-sm"
            >
              <div className="font-mono text-sm">
                {String(h).padStart(2, "0")}시
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={bright[h]}
                onChange={(e) => updateBright(h, Number(e.target.value))}
                disabled={submitting}
                className="w-full accent-sky-500"
                aria-label={`${h}시 밝기`}
              />
              <input
                type="number"
                min={0}
                max={100}
                value={bright[h]}
                onChange={(e) => updateBright(h, Number(e.target.value))}
                disabled={submitting}
                className="w-14 h-8 rounded border border-input bg-background px-2 text-right tabular-nums text-sm font-mono"
              />
              <input
                type="range"
                min={0}
                max={100}
                value={volume[h]}
                onChange={(e) => updateVolume(h, Number(e.target.value))}
                disabled={submitting}
                className="w-full accent-amber-500"
                aria-label={`${h}시 볼륨`}
              />
              <input
                type="number"
                min={0}
                max={100}
                value={volume[h]}
                onChange={(e) => updateVolume(h, Number(e.target.value))}
                disabled={submitting}
                className="w-14 h-8 rounded border border-input bg-background px-2 text-right tabular-nums text-sm font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            취소
          </Button>
        )}
        <Button
          type="button"
          onClick={() => void onSubmit(bright, volume)}
          disabled={submitting}
        >
          {submitting ? "저장 중…" : "저장"}
        </Button>
      </div>
    </div>
  );
}

function BarRow({
  label,
  values,
  color,
  textColor,
}: {
  label: string;
  values: number[];
  color: string;
  textColor: string;
}) {
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / 24);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className={`text-sm font-semibold ${textColor}`}>{label}</span>
        <span className="text-sm text-muted-foreground">평균 {avg}%</span>
      </div>
      <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-0.5 h-16">
        {values.map((v, h) => (
          <div
            key={h}
            className="flex flex-col gap-1 min-w-0"
            title={`${String(h).padStart(2, "0")}시 — ${v}%`}
          >
            <div className="flex-1 bg-muted/60 rounded-sm relative overflow-hidden">
              <div
                className={`${color} absolute bottom-0 inset-x-0 transition-all duration-150`}
                style={{ height: `${v}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-mono text-center leading-none">
              {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PresetRow({
  label,
  onApply,
  submitting,
}: {
  label: string;
  onApply: (v: number) => void;
  submitting: boolean;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground w-12 shrink-0">
        {label}
      </span>
      {PRESETS.map((p) => (
        <Button
          key={p}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onApply(p)}
          disabled={submitting}
        >
          {p}%
        </Button>
      ))}
    </div>
  );
}

function clamp(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}
