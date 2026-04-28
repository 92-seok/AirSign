interface Props {
  data: (number | null)[];
  className?: string;
  /** SVG stroke color — Tailwind 컬러 클래스 또는 CSS 색상 */
  stroke?: string;
  /** 영역 채우기 (line + area) */
  area?: boolean;
}

const VIEW_WIDTH = 80;
const VIEW_HEIGHT = 24;

export function Sparkline({
  data,
  className = "",
  stroke = "currentColor",
  area = true,
}: Props) {
  const valid = data.filter((v): v is number => v !== null);
  if (valid.length < 2) {
    return (
      <div className={`${className} h-6 lg:h-7 flex items-center justify-center text-[10px] text-muted-foreground/50`}>
        —
      </div>
    );
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;

  const linePoints: string[] = [];
  data.forEach((v, i) => {
    if (v === null) return;
    const x = (i / (data.length - 1)) * VIEW_WIDTH;
    const y = VIEW_HEIGHT - ((v - min) / range) * (VIEW_HEIGHT - 2) - 1;
    linePoints.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  });
  const polyline = linePoints.join(" ");
  const polygon =
    linePoints.length > 1
      ? `0,${VIEW_HEIGHT} ${polyline} ${VIEW_WIDTH},${VIEW_HEIGHT}`
      : "";

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="none"
      className={`${className} w-full h-6 lg:h-7`}
      aria-hidden
    >
      {area && polygon && (
        <polygon points={polygon} fill={stroke} opacity={0.12} />
      )}
      <polyline
        points={polyline}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
