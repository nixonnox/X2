"use client";

import { useState, useMemo } from "react";
import { Target, Info, AlertTriangle } from "lucide-react";

type Comparison = {
  key: string;
  label: string;
  rating: string;
  baseline: number;
  actual: number;
  deviation: number;
  interpretation: string;
};

type Baseline = {
  key: string;
  label: string;
  value: number;
  unit: string;
  description: string;
};

type Props = {
  industryType: string;
  industryLabel: string;
  comparisons: Comparison[] | null;
  baseline: Baseline[];
};

const ratingColors: Record<string, { fill: string; stroke: string; label: string }> = {
  ABOVE: { fill: "#059669", stroke: "#10b981", label: "평균 이상" },
  AVERAGE: { fill: "#2563eb", stroke: "#3b82f6", label: "평균" },
  BELOW: { fill: "#d97706", stroke: "#f59e0b", label: "평균 이하" },
};

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

export function BenchmarkDifferentialRing({
  industryLabel,
  comparisons,
  baseline,
}: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const hasComparisons = comparisons && comparisons.length > 0;

  const overallScore = useMemo(() => {
    if (!comparisons || comparisons.length === 0) return null;
    const aboveCount = comparisons.filter((c) => c.rating === "ABOVE").length;
    const avgCount = comparisons.filter((c) => c.rating === "AVERAGE").length;
    return Math.round(
      ((aboveCount * 1 + avgCount * 0.5) / comparisons.length) * 100
    );
  }, [comparisons]);

  const scoreColor =
    overallScore !== null
      ? overallScore >= 70
        ? "#059669"
        : overallScore >= 40
          ? "#d97706"
          : "#dc2626"
      : "#9ca3af";

  const cx = 150;
  const cy = 150;
  const outerR = 120;
  const innerR = 70;
  const gap = 3;

  const items = hasComparisons ? comparisons : baseline;
  const segmentCount = items.length;
  const segmentAngle = segmentCount > 0 ? 360 / segmentCount : 360;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-[var(--muted-foreground)]" />
        <span className="text-[12px] font-semibold text-[var(--foreground)]">
          벤치마크 비교
        </span>
        <span className="text-[11px] text-[var(--muted-foreground)]">
          {industryLabel}
        </span>
      </div>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
        {/* SVG Ring */}
        <div className="relative shrink-0 w-full max-w-[300px] md:max-w-[260px] mx-auto aspect-square">
          <svg
            viewBox="0 0 300 300"
            width="100%"
            height="100%"
            className="overflow-visible"
          >
            {/* Background circle */}
            <circle
              cx={cx}
              cy={cy}
              r={outerR}
              fill="none"
              stroke="var(--secondary)"
              strokeWidth="1"
            />
            <circle
              cx={cx}
              cy={cy}
              r={innerR}
              fill="none"
              stroke="var(--secondary)"
              strokeWidth="1"
            />

            {/* Segments */}
            {items.map((item, i) => {
              const startAngle = i * segmentAngle + gap / 2;
              const endAngle = (i + 1) * segmentAngle - gap / 2;

              const comp = hasComparisons
                ? (item as Comparison)
                : null;
              const rating = comp?.rating ?? "AVERAGE";
              const colors = ratingColors[rating] ?? ratingColors.AVERAGE!;

              const deviationMag = comp
                ? Math.min(Math.abs(comp.deviation), 50)
                : 0;
              const thickness = hasComparisons
                ? innerR + ((outerR - innerR) * (deviationMag + 10)) / 60
                : (innerR + outerR) / 2;

              const isHovered = hoveredIdx === i;
              const opacity = hoveredIdx === null ? 0.8 : isHovered ? 1 : 0.4;

              const arcPath = describeArc(
                cx,
                cy,
                hasComparisons ? thickness : (innerR + outerR) / 2,
                startAngle,
                endAngle
              );

              const labelPos = polarToCartesian(
                cx,
                cy,
                outerR + 14,
                (startAngle + endAngle) / 2
              );

              return (
                <g
                  key={i}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer"
                >
                  <path
                    d={arcPath}
                    fill="none"
                    stroke={hasComparisons ? colors.stroke : "#9ca3af"}
                    strokeWidth={hasComparisons ? 10 + deviationMag * 0.3 : 8}
                    strokeLinecap="round"
                    opacity={opacity}
                    className="transition-opacity duration-200"
                  />
                  {/* Label */}
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--muted-foreground)"
                    fontSize="9"
                    className="pointer-events-none select-none"
                  >
                    {hasComparisons
                      ? (item as Comparison).label.slice(0, 6)
                      : (item as Baseline).label.slice(0, 6)}
                  </text>
                </g>
              );
            })}

            {/* Center score */}
            <circle cx={cx} cy={cy} r={innerR - 5} fill="var(--card)" />
            <text
              x={cx}
              y={cy - 8}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={scoreColor}
              fontSize="28"
              fontWeight="700"
            >
              {overallScore !== null ? overallScore : "—"}
            </text>
            <text
              x={cx}
              y={cy + 14}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--muted-foreground)"
              fontSize="10"
            >
              {overallScore !== null ? "종합 점수" : "기준 데이터"}
            </text>
          </svg>

          {/* Hover tooltip */}
          {hoveredIdx !== null && (
            <div
              className="absolute bg-[var(--popover)] border border-[var(--border)] rounded-lg shadow-lg px-3 py-2 z-10 pointer-events-none min-w-[180px]"
              style={{ top: 10, left: 310 }}
            >
              {hasComparisons ? (
                <ComparisonTooltip item={comparisons[hoveredIdx]!} />
              ) : (
                <BaselineTooltip item={baseline[hoveredIdx]!} />
              )}
            </div>
          )}
        </div>

        {/* Legend + details */}
        <div className="flex-1 w-full space-y-3 pt-4">
          {hasComparisons ? (
            <>
              {/* Legend */}
              <div className="flex flex-wrap gap-3">
                {Object.entries(ratingColors).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: val.fill }}
                    />
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {val.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Metric list */}
              <div className="space-y-1.5">
                {comparisons.map((c, i) => {
                  const rc = ratingColors[c.rating] ?? ratingColors.AVERAGE!;
                  return (
                    <div
                      key={c.key}
                      className="flex items-center gap-2 text-[11px]"
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: rc.fill }}
                      />
                      <span className="text-[var(--foreground)] font-medium truncate">
                        {c.label}
                      </span>
                      <span className="text-[var(--muted-foreground)] ml-auto">
                        {c.actual} / {c.baseline}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {/* No metrics warning */}
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-amber-800">
                    측정 데이터 없음
                  </p>
                  <p className="text-[10px] text-amber-700 leading-relaxed">
                    현재 클러스터에서 자동 추출된 지표가 없거나, 수동 입력된 측정값이 없습니다.
                    클러스터 데이터가 충분히 수집되면 FAQ 빈도, 비교/리뷰 패턴 등이 자동 계산됩니다.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  업계 기준값 ({baseline.length}개 지표)
                </span>
              </div>
              {baseline.map((b) => (
                <div
                  key={b.key}
                  className="flex items-center justify-between text-[11px] py-1 border-b border-gray-100 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[var(--foreground)]">{b.label}</span>
                    {b.description && (
                      <p className="text-[9px] text-gray-400 truncate">{b.description}</p>
                    )}
                  </div>
                  <span className="text-[var(--muted-foreground)] ml-2 tabular-nums">
                    {b.value}
                    {b.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ComparisonTooltip({ item }: { item: Comparison }) {
  const rc = ratingColors[item.rating] ?? ratingColors.AVERAGE!;
  return (
    <div className="space-y-1">
      <p className="text-[12px] font-semibold text-[var(--foreground)]">
        {item.label}
      </p>
      <div className="flex items-center gap-2">
        <span
          className="badge text-[10px] text-white px-1.5 py-0.5 rounded"
          style={{ backgroundColor: rc.fill }}
        >
          {rc.label}
        </span>
        <span className="text-[10px] text-[var(--muted-foreground)]">
          편차: {item.deviation > 0 ? "+" : ""}
          {item.deviation.toFixed(1)}%
        </span>
      </div>
      <div className="flex gap-4 text-[10px]">
        <span className="text-[var(--muted-foreground)]">
          기준: <b className="text-[var(--foreground)]">{item.baseline}</b>
        </span>
        <span className="text-[var(--muted-foreground)]">
          실제: <b className="text-[var(--foreground)]">{item.actual}</b>
        </span>
      </div>
      <p className="text-[10px] text-[var(--muted-foreground)] leading-snug">
        {item.interpretation}
      </p>
    </div>
  );
}

function BaselineTooltip({ item }: { item: Baseline }) {
  return (
    <div className="space-y-1">
      <p className="text-[12px] font-semibold text-[var(--foreground)]">
        {item.label}
      </p>
      <p className="text-[11px] text-[var(--foreground)]">
        {item.value}
        {item.unit}
      </p>
      <p className="text-[10px] text-[var(--muted-foreground)] leading-snug">
        {item.description}
      </p>
    </div>
  );
}
