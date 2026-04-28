"use client";

import { Sparkline } from "@/components/sparkline";
import type {
  AirQualityData,
  AirTrendPoint,
  KhaiGrade,
  WeatherData,
  WeatherTrendPoint,
} from "@/lib/environment-api";

interface KhaiTheme {
  label: string;
  advice: string;
  text: string;
  bg: string;
  ring: string;
  gradient: string;
  stroke: string;
}

const KHAI_META: Record<KhaiGrade, KhaiTheme> = {
  good: {
    label: "좋음",
    advice: "쾌적해요",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/30",
    gradient:
      "from-emerald-500/30 via-emerald-500/8 to-transparent dark:from-emerald-400/25",
    stroke: "#10b981",
  },
  moderate: {
    label: "보통",
    advice: "민감군 주의",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/30",
    gradient:
      "from-amber-500/30 via-amber-500/8 to-transparent dark:from-amber-400/25",
    stroke: "#f59e0b",
  },
  unhealthy: {
    label: "나쁨",
    advice: "마스크 권장",
    text: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-500/15",
    ring: "ring-orange-500/30",
    gradient:
      "from-orange-500/35 via-orange-500/10 to-transparent dark:from-orange-400/30",
    stroke: "#f97316",
  },
  hazardous: {
    label: "매우 나쁨",
    advice: "외출 자제",
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500/15",
    ring: "ring-rose-500/30",
    gradient:
      "from-rose-500/40 via-rose-500/12 to-transparent dark:from-rose-400/35",
    stroke: "#f43f5e",
  },
};

interface Props {
  air: AirQualityData | null;
  weather: WeatherData | null;
  airTrend: AirTrendPoint[];
  weatherTrend: WeatherTrendPoint[];
  loading: boolean;
}

export function EnvironmentStrip({
  air,
  weather,
  airTrend,
  weatherTrend,
  loading,
}: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 lg:gap-3">
      <KhaiCard air={air} loading={loading} />
      <MetricCard
        label="PM2.5"
        unit="㎍/㎥"
        value={air?.pm25 ?? null}
        threshold={pm25Grade}
        spark={airTrend.map((p) => p.pm25)}
        sparkStroke="#0ea5e9"
        loading={loading}
      />
      <MetricCard
        label="PM10"
        unit="㎍/㎥"
        value={air?.pm10 ?? null}
        threshold={pm10Grade}
        spark={airTrend.map((p) => p.pm10)}
        sparkStroke="#06b6d4"
        loading={loading}
      />
      <MetricCard
        label="O₃"
        unit="ppm"
        value={air?.o3 ?? null}
        decimals={3}
        spark={airTrend.map((p) => p.o3)}
        sparkStroke="#8b5cf6"
        loading={loading}
      />
      <MetricCard
        label="기온"
        unit="℃"
        value={weather?.temp ?? null}
        decimals={1}
        spark={weatherTrend.map((p) => p.temp)}
        sparkStroke="#f97316"
        loading={loading}
      />
      <MetricCard
        label="습도"
        unit="%"
        value={weather?.humi ?? null}
        spark={weatherTrend.map((p) => p.humi)}
        sparkStroke="#14b8a6"
        loading={loading}
      />
    </div>
  );
}

function KhaiCard({
  air,
  loading,
}: {
  air: AirQualityData | null;
  loading: boolean;
}) {
  const theme: KhaiTheme | null = air?.khaiGrade
    ? KHAI_META[air.khaiGrade]
    : null;

  return (
    <div
      className={`relative overflow-hidden rounded-lg border bg-card p-2 lg:p-2.5 flex flex-col justify-between gap-1 min-h-[4.5rem] lg:min-h-[5rem] ring-1 ${
        theme?.ring ?? "ring-border"
      }`}
    >
      {theme && (
        <div
          aria-hidden
          className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} pointer-events-none`}
        />
      )}

      <div className="relative flex items-center justify-between gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          KHAI
        </span>
        {theme && (
          <span
            className={`shrink-0 rounded-full px-1.5 py-0 text-[9px] lg:text-[10px] font-semibold ring-1 ${theme.bg} ${theme.text} ${theme.ring}`}
          >
            {theme.label}
          </span>
        )}
      </div>

      <div className="relative flex items-end justify-between gap-1.5">
        <div className="flex items-end gap-1">
          <div
            className={`text-xl lg:text-2xl font-bold tabular-nums leading-none ${
              theme?.text ?? "text-foreground"
            }`}
          >
            {loading ? "—" : (air?.khai?.toFixed(0) ?? "—")}
          </div>
          <div className="text-[9px] text-muted-foreground pb-0.5">
            / 500
          </div>
        </div>
        {theme && (
          <span className={`text-[10px] font-medium ${theme.text}`}>
            {theme.advice}
          </span>
        )}
      </div>
    </div>
  );
}

interface ThresholdResult {
  cls: string;
  label: string;
}

interface MetricProps {
  label: string;
  unit: string;
  value: number | null;
  decimals?: number;
  threshold?: (v: number) => ThresholdResult | null;
  spark?: (number | null)[];
  sparkStroke?: string;
  loading: boolean;
}

function MetricCard({
  label,
  unit,
  value,
  decimals = 0,
  threshold,
  spark,
  sparkStroke = "currentColor",
  loading,
}: MetricProps) {
  const grade = value !== null && threshold ? threshold(value) : null;
  return (
    <div className="rounded-lg border bg-card p-2 lg:p-2.5 flex flex-col justify-between gap-1 min-h-[4.5rem] lg:min-h-[5rem]">
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
        {grade && <span className={`size-1.5 rounded-full ${grade.cls}`} />}
      </div>

      <div className="flex items-end justify-between gap-1.5">
        <div className="flex items-end gap-0.5">
          <span className="text-lg lg:text-xl font-semibold tabular-nums leading-none">
            {loading ? "—" : value !== null ? value.toFixed(decimals) : "—"}
          </span>
          <span className="text-[9px] text-muted-foreground pb-0.5">
            {unit}
          </span>
        </div>
        {spark && spark.length >= 2 ? (
          <Sparkline
            data={spark}
            stroke={sparkStroke}
            className="flex-1 max-w-16"
          />
        ) : grade ? (
          <span className="text-[10px] text-muted-foreground shrink-0">
            {grade.label}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** PM2.5 한국 환경부 등급 (㎍/㎥) */
function pm25Grade(v: number): ThresholdResult {
  if (v <= 15) return { cls: "bg-emerald-500", label: "좋음" };
  if (v <= 35) return { cls: "bg-amber-500", label: "보통" };
  if (v <= 75) return { cls: "bg-orange-500", label: "나쁨" };
  return { cls: "bg-rose-500", label: "매우 나쁨" };
}

/** PM10 한국 환경부 등급 (㎍/㎥) */
function pm10Grade(v: number): ThresholdResult {
  if (v <= 30) return { cls: "bg-emerald-500", label: "좋음" };
  if (v <= 80) return { cls: "bg-amber-500", label: "보통" };
  if (v <= 150) return { cls: "bg-orange-500", label: "나쁨" };
  return { cls: "bg-rose-500", label: "매우 나쁨" };
}

/** 'YYYY-MM-DD HH:MM:SS' → 'HH:MM' (모바일에서도 짧게) */
function formatTime(s: string): string {
  if (!s || s.length < 16) return s;
  return s.slice(11, 16);
}
