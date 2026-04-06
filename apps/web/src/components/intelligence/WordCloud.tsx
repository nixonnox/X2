"use client";

import { useMemo } from "react";

type Word = {
  text: string;
  value: number;
  sentiment?: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
};

type Props = {
  words: Word[];
  width?: number;
  height?: number;
  maxWords?: number;
};

const SENTIMENT_COLORS = {
  POSITIVE: "#10b981",
  NEGATIVE: "#ef4444",
  NEUTRAL: "#6b7280",
};

/**
 * Simple word cloud using SVG text placement.
 * Words are sized by value and colored by sentiment.
 * Uses spiral placement algorithm for natural distribution.
 */
export function WordCloud({
  words,
  width = 600,
  height = 400,
  maxWords = 60,
}: Props) {
  const placed = useMemo(() => {
    const sorted = [...words]
      .sort((a, b) => b.value - a.value)
      .slice(0, maxWords);

    if (sorted.length === 0) return [];

    const maxVal = sorted[0]!.value;
    const minVal = sorted[sorted.length - 1]?.value ?? 1;
    const range = maxVal - minVal || 1;

    const cx = width / 2;
    const cy = height / 2;
    const occupied: { x: number; y: number; w: number; h: number }[] = [];

    return sorted
      .map((word, i) => {
        // Font size: 12-48px based on value
        const ratio = (word.value - minVal) / range;
        const fontSize = Math.round(12 + ratio * 36);
        const estWidth = word.text.length * fontSize * 0.55;
        const estHeight = fontSize * 1.2;

        // Spiral placement
        let x = cx;
        let y = cy;
        let angle = 0;
        const step = 0.3;
        const radiusStep = 2;
        let found = false;

        for (let t = 0; t < 500 && !found; t++) {
          angle = t * step;
          const r = t * radiusStep * 0.15;
          x = cx + Math.cos(angle) * r;
          y = cy + Math.sin(angle) * r;

          // Bounds check
          if (x - estWidth / 2 < 10 || x + estWidth / 2 > width - 10) continue;
          if (y - estHeight / 2 < 10 || y + estHeight / 2 > height - 10)
            continue;

          // Collision check
          const collides = occupied.some(
            (o) =>
              Math.abs(x - o.x) < (estWidth + o.w) / 2 + 4 &&
              Math.abs(y - o.y) < (estHeight + o.h) / 2 + 2,
          );

          if (!collides) {
            found = true;
            occupied.push({ x, y, w: estWidth, h: estHeight });
          }
        }

        if (!found) return null;

        const color = word.sentiment
          ? SENTIMENT_COLORS[word.sentiment]
          : `hsl(${(i * 37) % 360}, 55%, 45%)`;

        return {
          text: word.text,
          x,
          y,
          fontSize,
          color,
          opacity: 0.7 + ratio * 0.3,
          value: word.value,
          sentiment: word.sentiment,
        };
      })
      .filter(Boolean);
  }, [words, width, height, maxWords]);

  return (
    <svg
      width={width}
      height={height}
      className="rounded-xl border border-gray-200 bg-white"
      viewBox={`0 0 ${width} ${height}`}
    >
      {placed.map((w: any, i: number) => (
        <text
          key={i}
          x={w.x}
          y={w.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={w.fontSize}
          fontWeight={w.fontSize > 30 ? 700 : w.fontSize > 20 ? 600 : 400}
          fill={w.color}
          opacity={w.opacity}
          className="select-none"
        >
          <title>{`${w.text}: ${w.value}${w.sentiment ? ` (${w.sentiment})` : ""}`}</title>
          {w.text}
        </text>
      ))}
      {placed.length === 0 && (
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          fontSize={14}
          fill="#9ca3af"
        >
          데이터 없음
        </text>
      )}
    </svg>
  );
}
