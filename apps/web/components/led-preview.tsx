"use client";

import type { ScenarioListItem } from "@/lib/scenario-api";

/**
 * 레거시 PHP `_legacy_php/scen/display/dt_001.php`(가로) /
 * `dt_003.php`(세로)의 LED 전광판 미리보기를 React로 포팅.
 *
 * 핵심:
 *   - jhparam 테이블의 동적 데이터를 그대로 사용 (서버에서 params로 전달)
 *   - 이미지 자산은 NestJS 정적 서빙 `/assets/image/view/...` 으로 호스팅
 *     (레거시 PHP의 `/image/view/...` 와 1:1 매칭)
 *   - 색상값은 `#fffXXXXXX` 형태 (앞 3자리 alpha 무시, substr(4, 6))
 */

interface Props {
  scenario: ScenarioListItem;
  /** ST_002, ST_006 처럼 1개 시나리오가 여러 슬라이드를 갖는 경우의 인덱스 */
  index?: number;
  /** 화면에 표시할 폭(px). 비율은 장비 sizeX/Y에 맞게 자동 계산 */
  widthPx?: number;
}

export function LedPreview({ scenario, index = 0, widthPx = 176 }: Props) {
  const sizeX = scenario.equipSizeX ?? 96;
  const sizeY = scenario.equipSizeY ?? 192;
  const ratio = sizeY / sizeX;
  const heightPx = Math.round(widthPx * ratio);
  const isVertical = ratio > 1;

  return (
    <div
      className="relative bg-black overflow-hidden flex items-center justify-center text-white"
      style={{ width: widthPx, height: heightPx }}
    >
      <LedContent
        scenario={scenario}
        index={index}
        widthPx={widthPx}
        heightPx={heightPx}
        isVertical={isVertical}
      />
    </div>
  );
}

interface InnerProps {
  scenario: ScenarioListItem;
  index: number;
  widthPx: number;
  heightPx: number;
  isVertical: boolean;
}

function LedContent({ scenario, index, widthPx, heightPx, isVertical }: InnerProps) {
  const { typeCode, viewData, params } = scenario;

  switch (typeCode) {
    case "ST_001":
      return <DustView params={params} isVertical={isVertical} />;
    case "ST_002":
      return <WeatherView params={params} index={index} isVertical={isVertical} />;
    case "ST_003":
      return <VideoView viewData={viewData} />;
    case "ST_004":
    case "ST_007":
      return <ImageView viewData={viewData} />;
    case "ST_005":
      return <TextMarquee viewData={viewData} isVertical={isVertical} />;
    case "ST_006":
      return <AirView params={params} viewData={viewData} index={index} />;
    case "ST_008":
      return <DustVideoView params={params} isVertical={isVertical} />;
    case "ST_009":
      return (
        <MissingPersonView
          viewData={viewData}
          widthPx={widthPx}
          heightPx={heightPx}
        />
      );
    case "ST_010":
      return <PhoneView viewData={viewData} />;
    default:
      return <FallbackView label={scenario.typeName || typeCode} />;
  }
}

/* ──────────────────── ST 별 렌더러 ──────────────────── */

/** ST_001 미세먼지: 등급 배경 + 캐릭터 GIF + 수치 */
function DustView({
  params,
  isVertical,
}: {
  params: Record<string, string>;
  isVertical: boolean;
}) {
  const bg = assetUrl(params["dust_bg"], "image/view");
  const gif = assetUrl(params["dust_gif"], "image/view");
  const value = params["dust_value"] ?? "";
  const color = colorFromContent(params["dust_color"]);

  return (
    <>
      {bg && <BgImage src={bg} />}
      {gif && (
        <span
          aria-hidden
          className={
            isVertical
              ? "absolute left-[5%] top-[35%] w-[90%] h-[40%] bg-center bg-no-repeat bg-cover"
              : "absolute left-[1%] top-[5%] w-[50%] h-[90%] bg-center bg-no-repeat bg-cover"
          }
          style={{ backgroundImage: `url(${gif})` }}
        />
      )}
      {value && (
        <span
          className={
            isVertical
              ? "absolute right-[6%] bottom-[6%] text-base font-bold tabular-nums"
              : "absolute right-[28%] bottom-[12%] text-lg font-bold tabular-nums"
          }
          style={{ color }}
        >
          {value}
        </span>
      )}
    </>
  );
}

/** ST_002 기상정보: index 0 = 온도/습도, index 1 = 풍향/풍속 */
function WeatherView({
  params,
  index,
  isVertical,
}: {
  params: Record<string, string>;
  index: number;
  isVertical: boolean;
}) {
  const isFirst = index === 0;
  const bg = assetUrl(
    isFirst ? params["weather_bg"] : params["weather_bg2"],
    "image/view",
  );
  const title1 = isFirst ? "온도" : "풍향";
  const title2 = isFirst ? "습도" : "풍속";
  const value1 = isFirst ? params["weather_temp"] : params["weather_dire"];
  const value2 = isFirst ? params["weather_humi"] : params["weather_speed"];

  return (
    <>
      {bg && <BgImage src={bg} />}
      <div
        className={
          isVertical
            ? "relative z-10 flex flex-col items-center justify-end gap-1 pb-3 w-full text-center"
            : "relative z-10 flex flex-col items-start justify-center gap-0.5 pl-[40%] w-full text-left"
        }
      >
        <span className="text-[11px] font-bold text-amber-400">{title1}</span>
        <span className="text-base font-bold text-white tabular-nums">
          {value1 ?? "—"}
        </span>
        <span className="text-[11px] font-bold text-amber-400">{title2}</span>
        <span className="text-base font-bold text-white tabular-nums">
          {value2 ?? "—"}
        </span>
      </div>
    </>
  );
}

/** ST_006 대기정보: viewData = "pm25|pm10|o3|..." 인덱스별로 1슬롯 */
function AirView({
  params,
  viewData,
  index,
}: {
  params: Record<string, string>;
  viewData: string | null;
  index: number;
}) {
  const keys = (viewData ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  const key = keys[index] ?? keys[0] ?? "pm25";
  const bg = assetUrl(params[`air_${key}_bg`], "image/view");
  const value = params[`air_${key}_value`] ?? "";
  const color = colorFromContent(params[`air_${key}_color`]);

  return (
    <>
      {bg && <BgImage src={bg} />}
      {value && (
        <span
          className="absolute left-0 right-0 text-center text-lg font-bold tabular-nums"
          style={{ color, top: "60%" }}
        >
          {value}
        </span>
      )}
    </>
  );
}

/** ST_008 음원미세먼지: 동영상 + 등급 색상 + 수치 */
function DustVideoView({
  params,
  isVertical,
}: {
  params: Record<string, string>;
  isVertical: boolean;
}) {
  const bg = assetUrl(params["dust_bg"], "image/view");
  const movie = assetUrl(params["dust_movie"], "MC");
  const value = params["dust_value"] ?? "";
  const color = colorFromContent(params["dust_color"]);

  return (
    <>
      {bg && <BgImage src={bg} />}
      {movie && (
        <video
          src={movie}
          muted
          autoPlay
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {value && (
        <span
          className={
            isVertical
              ? "absolute right-[6%] bottom-[6%] text-base font-bold tabular-nums z-10"
              : "absolute right-[28%] bottom-[12%] text-lg font-bold tabular-nums z-10"
          }
          style={{ color }}
        >
          {value}
        </span>
      )}
    </>
  );
}

/** ST_003 동영상: viewData = "{file}|{volume}" */
function VideoView({ viewData }: { viewData: string | null }) {
  const file = (viewData ?? "").split("|")[0]?.trim();
  if (!file) return <FallbackView label="동영상 없음" />;
  return (
    <video
      src={assetUrl(file, "MC/video")}
      muted
      autoPlay
      loop
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

/** ST_004 / ST_007 단일 이미지 */
function ImageView({ viewData }: { viewData: string | null }) {
  const file = (viewData ?? "").trim();
  if (!file) return <FallbackView label="이미지 없음" />;
  return <BgImage src={assetUrl(file, "MC/image")} />;
}

/** ST_005 텍스트 (마퀴 효과) */
function TextMarquee({
  viewData,
  isVertical,
}: {
  viewData: string | null;
  isVertical: boolean;
}) {
  const [textRaw, colorRaw] = (viewData ?? "").split("|");
  const text = (textRaw ?? "").replace(/\\n/g, " ").trim() || "(빈 텍스트)";
  const color = (colorRaw ?? "").startsWith("#")
    ? colorRaw
    : `#${(colorRaw || "ffffff").replace(/^#/, "")}`;
  return (
    <span
      className={
        isVertical
          ? "text-sm font-bold whitespace-pre-wrap break-keep px-2 text-center"
          : "text-base font-bold whitespace-pre line-clamp-2 px-3"
      }
      style={{ color }}
    >
      {text}
    </span>
  );
}

/** ST_009 실종자: viewData = "img|이름|내용|부가|추가" */
function MissingPersonView({
  viewData,
  widthPx,
  heightPx,
}: {
  viewData: string | null;
  widthPx: number;
  heightPx: number;
}) {
  const parts = (viewData ?? "").split("|");
  const [img, name, content, sub, third] = parts;
  const photo = img ? assetUrl(img.trim(), "MC/image") : null;
  const isVertical = heightPx > widthPx;
  return (
    <div className="relative w-full h-full">
      {photo && (
        <span
          aria-hidden
          className={
            isVertical
              ? "absolute left-[8%] top-[8%] w-[84%] aspect-square bg-center bg-cover"
              : "absolute left-[5%] top-[10%] w-[40%] h-[80%] bg-center bg-cover"
          }
          style={{ backgroundImage: `url(${photo})` }}
        />
      )}
      <div
        className={
          isVertical
            ? "absolute left-0 right-0 bottom-2 text-center px-1"
            : "absolute right-2 top-2 bottom-2 w-[50%] flex flex-col justify-center px-1"
        }
      >
        {name && (
          <div className="text-sm font-bold text-orange-400 truncate">
            {name}
          </div>
        )}
        {content && (
          <div className="text-[11px] text-white truncate">{content}</div>
        )}
        {sub && (
          <div className="text-[11px] text-white truncate">{sub}</div>
        )}
        {third && (
          <div className="text-[11px] text-white truncate">{third}</div>
        )}
      </div>
    </div>
  );
}

/** ST_010 음원 전화번호 — 레거시는 found2.png 배경에 번호 텍스트 */
function PhoneView({ viewData }: { viewData: string | null }) {
  const num = (viewData ?? "").trim() || "—";
  return (
    <>
      <BgImage src={assetUrl("found2.png", "MC/image")} />
      <span className="absolute left-0 right-0 bottom-3 text-center text-xs font-bold text-white tabular-nums z-10">
        {num}
      </span>
    </>
  );
}

function FallbackView({ label }: { label: string }) {
  return (
    <span className="text-[11px] text-zinc-400 px-2 text-center">{label}</span>
  );
}

/* ──────────────────── 공용 ──────────────────── */

function BgImage({ src }: { src: string }) {
  return (
    <span
      aria-hidden
      className="absolute inset-0 bg-center bg-cover bg-no-repeat"
      style={{ backgroundImage: `url(${src})` }}
    />
  );
}

/**
 * jhparam에 저장된 자산 경로를 NestJS 정적 서빙 URL로 변환.
 *   레거시 PHP: <img src="/image/view/{val}">
 *   신규     : /assets/image/{val}    (NestJS가 _legacy_php/image 를 /assets/image 로 노출)
 */
function assetUrl(content: string | undefined | null, prefix: string): string {
  if (!content) return "";
  const trimmed = content.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // jhparam의 dust_bg 등은 'image/dust_fine_96_192.png' 같은 상대 경로
  // → /assets/{prefix}/{trimmed}
  const cleaned = trimmed.replace(/^\/+/, "");
  return `/assets/${prefix}/${cleaned}`;
}

/**
 * 레거시 색상 코드: '#FFFFAACC' (앞 3자리 alpha + 6자리 RGB).
 * substr(4, 6)으로 RGB만 추출.
 */
function colorFromContent(raw: string | undefined): string {
  if (!raw) return "#ffffff";
  const stripped = raw.replace(/^#/, "");
  if (stripped.length === 9) return `#${stripped.slice(3, 9)}`;
  if (stripped.length === 6) return `#${stripped}`;
  return "#ffffff";
}
