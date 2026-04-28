"use client";

import { Button } from "@/components/ui/button";
import type {
  ScenarioActiveStatus,
  ScenarioListItem,
} from "@/lib/scenario-api";

interface Props {
  scenario: ScenarioListItem;
  deleting: boolean;
  onDelete: () => void;
  onEdit: () => void;
}

/**
 * 시나리오 한 건을 카드 형태로 표시.
 * 레거시 PHP `scenario.php`의 saveBox 항목 + scenDisplay.php 미리보기를 통합.
 *
 * 표시 항목:
 *   - 타입 아이콘 (썸네일 위)
 *   - 타입 코드 + 한글명
 *   - 시나리오 이름
 *   - 표출 기간 + 상태 배지
 *   - 전송 자산 미리보기 (ST별 fallback)
 *   - 사용자 입력 요약 (ST별 viewData 파싱)
 *   - 액션 (삭제 등)
 */
export function ScenarioCard({
  scenario,
  deleting,
  onDelete,
  onEdit,
}: Props) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm flex flex-col">
      <ThumbnailArea scenario={scenario} />

      <div className="p-4 flex-1 flex flex-col gap-3">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{scenario.typeCode}</span>
              {scenario.typeName && (
                <>
                  <span className="opacity-50">·</span>
                  <span>{scenario.typeName}</span>
                </>
              )}
              {scenario.orderby !== null && (
                <>
                  <span className="opacity-50">·</span>
                  <span>순서 {scenario.orderby}</span>
                </>
              )}
            </div>
            <h3 className="text-sm font-semibold truncate mt-1">
              {scenario.name || scenario.code}
            </h3>
          </div>
          <ScenarioStatusBadge status={scenario.status} />
        </header>

        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider opacity-60 w-10">
              시작
            </span>
            <span className="font-mono tabular-nums">
              {formatRange(scenario.startDate)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider opacity-60 w-10">
              종료
            </span>
            <span className="font-mono tabular-nums">
              {formatRange(scenario.endDate)}
            </span>
          </div>
        </div>

        <ScenarioSummary scenario={scenario} />

        <div className="mt-auto pt-3 border-t flex items-center justify-between gap-2">
          <span
            className="font-mono text-[10px] text-muted-foreground/70 truncate"
            title={scenario.code}
          >
            {scenario.code}
          </span>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={onEdit}>
              수정
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={deleting}
              onClick={onDelete}
            >
              {deleting ? "삭제…" : "삭제"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────── 썸네일 영역 ──────────────────── */

function ThumbnailArea({ scenario }: { scenario: ScenarioListItem }) {
  const { typeCode, viewData, thumbnailPath } = scenario;

  // ST_005 (텍스트 시나리오) — 텍스트 + 색상 직접 렌더
  if (typeCode === "ST_005" && viewData) {
    return <TextThumbnail viewData={viewData} />;
  }

  // ST_010 (전화번호) — 번호 직접 렌더
  if (typeCode === "ST_010" && viewData) {
    return <PhoneThumbnail viewData={viewData} />;
  }

  // ST_003 / ST_008 (동영상) — 비디오 아이콘
  if ((typeCode === "ST_003" || typeCode === "ST_008") && viewData) {
    return <VideoThumbnail viewData={viewData} />;
  }

  // ST_004 / ST_007 / ST_009 (실 이미지)
  if ((typeCode === "ST_004" || typeCode === "ST_007" || typeCode === "ST_009") && thumbnailPath) {
    return <ImageThumbnail src={thumbnailPath} alt={scenario.name} />;
  }

  // ST_001 / ST_002 / ST_006 (카탈로그 정적 이미지)
  if (thumbnailPath) {
    return <ImageThumbnail src={thumbnailPath} alt={scenario.name} catalog />;
  }

  return <FallbackThumbnail label={scenario.typeName || scenario.typeCode} />;
}

function ImageThumbnail({
  src,
  alt,
  catalog = false,
}: {
  src: string;
  alt: string;
  catalog?: boolean;
}) {
  // 레거시 자산 경로는 `MC/image/...` 또는 `/image/...` 형태.
  // 정확한 호스팅은 NestJS 정적 서빙 셋업 후 결정. 일단 `/${path}` 그대로 사용.
  const url = src.startsWith("/") ? src : `/${src}`;
  return (
    <div className="aspect-[16/9] bg-muted relative overflow-hidden">
      <img
        src={url}
        alt={alt}
        className={`absolute inset-0 w-full h-full ${catalog ? "object-contain p-3" : "object-cover"}`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
          const sib = (e.currentTarget as HTMLImageElement)
            .nextElementSibling as HTMLElement | null;
          if (sib) sib.style.display = "flex";
        }}
      />
      <div className="hidden absolute inset-0 items-center justify-center text-xs text-muted-foreground bg-muted">
        이미지 로드 실패
      </div>
    </div>
  );
}

function TextThumbnail({ viewData }: { viewData: string }) {
  const [textRaw, colorRaw] = viewData.split("|");
  const text = (textRaw || "").trim();
  const color = (colorRaw || "").startsWith("#")
    ? colorRaw
    : `#${(colorRaw || "ffffff").replace(/^#/, "")}`;
  return (
    <div className="aspect-[16/9] bg-zinc-900 relative overflow-hidden flex items-center px-4">
      <div
        className="font-bold text-lg whitespace-pre line-clamp-2"
        style={{ color }}
      >
        {text || "(빈 텍스트)"}
      </div>
      <div className="absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] text-white/90">
        <span
          className="size-2 rounded-full ring-1 ring-white/40"
          style={{ background: color }}
        />
        {color.toUpperCase()}
      </div>
    </div>
  );
}

function PhoneThumbnail({ viewData }: { viewData: string }) {
  return (
    <div className="aspect-[16/9] bg-gradient-to-br from-amber-500 to-rose-500 relative overflow-hidden flex items-center justify-center">
      <div className="text-white text-2xl font-bold tabular-nums tracking-wide">
        ☎ {viewData}
      </div>
    </div>
  );
}

function VideoThumbnail({ viewData }: { viewData: string }) {
  const [file, vol] = viewData.split("|");
  return (
    <div className="aspect-[16/9] bg-zinc-900 relative overflow-hidden flex flex-col items-center justify-center text-white/80">
      <svg
        className="size-12 mb-2"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" />
      </svg>
      <div className="text-xs font-mono truncate max-w-[80%]">{file}</div>
      {vol && (
        <div className="text-[10px] text-white/60 mt-1">볼륨 {vol}%</div>
      )}
    </div>
  );
}

function FallbackThumbnail({ label }: { label: string }) {
  return (
    <div className="aspect-[16/9] bg-gradient-to-br from-sky-500/20 via-cyan-500/15 to-emerald-500/20 relative overflow-hidden flex items-center justify-center">
      <div className="text-sm text-muted-foreground font-medium">{label}</div>
    </div>
  );
}

/* ──────────────────── ST별 사용자 입력 요약 ──────────────────── */

function ScenarioSummary({ scenario }: { scenario: ScenarioListItem }) {
  const { typeCode, viewData, text } = scenario;
  if (!viewData && !text) {
    return (
      <div className="text-xs text-muted-foreground">
        타입 카탈로그 시나리오 (사용자 입력 없음)
      </div>
    );
  }

  if (typeCode === "ST_005" && viewData) {
    const [t] = viewData.split("|");
    return (
      <SummaryRow label="텍스트" value={(t || "").trim() || "—"} />
    );
  }
  if (typeCode === "ST_010" && viewData) {
    return <SummaryRow label="번호" value={viewData} mono />;
  }
  if ((typeCode === "ST_003" || typeCode === "ST_008") && viewData) {
    const [file, vol] = viewData.split("|");
    return (
      <div className="space-y-1">
        <SummaryRow label="파일" value={file} mono />
        {vol && <SummaryRow label="볼륨" value={`${vol}%`} />}
      </div>
    );
  }
  if (typeCode === "ST_004" && viewData) {
    return <SummaryRow label="이미지" value={viewData} mono />;
  }
  if (typeCode === "ST_007") {
    const len = (text ?? "").length;
    return (
      <SummaryRow
        label="HTML"
        value={len > 0 ? `${len.toLocaleString()}자` : "—"}
      />
    );
  }
  if (typeCode === "ST_009" && viewData) {
    const [, name, c1] = viewData.split("|");
    return (
      <div className="space-y-1">
        {name && <SummaryRow label="이름" value={name} />}
        {c1 && <SummaryRow label="설명" value={c1} />}
      </div>
    );
  }
  if (typeCode === "ST_006" && viewData) {
    const items = viewData
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    return (
      <div className="flex flex-wrap gap-1">
        {items.map((it) => (
          <span
            key={it}
            className="inline-flex rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/30 px-2 py-0.5 text-[10px] font-medium"
          >
            {it.toUpperCase()}
          </span>
        ))}
      </div>
    );
  }
  return null;
}

function SummaryRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-10 shrink-0">
        {label}
      </span>
      <span
        className={`min-w-0 truncate ${mono ? "font-mono" : "font-medium"}`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

/* ──────────────────── 상태 배지 ──────────────────── */

function ScenarioStatusBadge({ status }: { status: ScenarioActiveStatus }) {
  const map: Record<ScenarioActiveStatus, { label: string; cls: string }> = {
    active: {
      label: "송출 중",
      cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/30",
    },
    scheduled: {
      label: "예약",
      cls: "bg-sky-500/10 text-sky-700 dark:text-sky-400 ring-sky-500/30",
    },
    expired: {
      label: "만료",
      cls: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 ring-zinc-500/30",
    },
    always: {
      label: "상시",
      cls: "bg-violet-500/10 text-violet-700 dark:text-violet-400 ring-violet-500/30",
    },
  };
  const m = map[status];
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

function formatRange(s: string | null): string {
  if (!s || s.length < 13) return "—";
  return s.slice(0, 16);
}
