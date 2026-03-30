"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Layers,
  Users,
  Route,
  FileText,
  BarChart3,
  Lightbulb,
} from "lucide-react";

type TaxonomyCategory = {
  category: string;
  clusterCount: number;
};

type DataBlock = {
  blockType: string;
  title: string;
  taxonomyTags?: string[];
};

type Props = {
  seedKeyword: string;
  industryType: string;
  taxonomyCategories: TaxonomyCategory[];
  dataBlocks: DataBlock[];
  signalQuality: {
    hasClusterData: boolean;
    hasSocialData: boolean;
    hasBenchmarkData: boolean;
    overallRichness: string;
  };
  onNodeClick?: (node: { type: string; label: string }) => void;
};

const industryColors: Record<string, { primary: string; secondary: string }> = {
  beauty: { primary: "#ec4899", secondary: "#fbcfe8" },
  food: { primary: "#f97316", secondary: "#fed7aa" },
  tech: { primary: "#3b82f6", secondary: "#bfdbfe" },
  health: { primary: "#10b981", secondary: "#a7f3d0" },
  finance: { primary: "#6366f1", secondary: "#c7d2fe" },
  education: { primary: "#8b5cf6", secondary: "#ddd6fe" },
  fashion: { primary: "#f43f5e", secondary: "#fecdd3" },
  default: { primary: "#6b7280", secondary: "#d1d5db" },
};

const blockTypeIcons: Record<string, string> = {
  CLUSTER: "CL",
  PERSONA: "PE",
  PATH: "PT",
  JOURNEY: "JR",
  INSIGHT: "IN",
  EVIDENCE: "EV",
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function IntelligenceRadialGraph({
  seedKeyword,
  industryType,
  taxonomyCategories,
  dataBlocks,
  signalQuality,
  onNodeClick,
}: Props) {
  const [hoveredNode, setHoveredNode] = useState<{
    type: string;
    label: string;
    detail?: string;
    x: number;
    y: number;
  } | null>(null);

  const colors = industryColors[industryType] ?? industryColors.default!;

  const svgSize = 500;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const centerR = 30;
  const ring1R = 130;
  const ring2R = 210;

  const maxCluster = useMemo(
    () =>
      Math.max(
        1,
        ...taxonomyCategories.map((c) => c.clusterCount)
      ),
    [taxonomyCategories]
  );

  // Taxonomy node positions
  const taxonomyNodes = useMemo(() => {
    const count = taxonomyCategories.length;
    if (count === 0) return [];
    const angleStep = 360 / count;
    return taxonomyCategories.map((cat, i) => {
      const angle = i * angleStep;
      const pos = polarToCartesian(cx, cy, ring1R, angle);
      const nodeSize = 8 + (cat.clusterCount / maxCluster) * 14;
      return { ...cat, angle, ...pos, size: nodeSize };
    });
  }, [taxonomyCategories, cx, cy, maxCluster]);

  // Data block node positions (2nd ring)
  const blockNodes = useMemo(() => {
    if (dataBlocks.length === 0) return [];
    const count = dataBlocks.length;
    const angleStep = 360 / count;
    return dataBlocks.map((block, i) => {
      const angle = i * angleStep + (taxonomyCategories.length > 0 ? angleStep / 3 : 0);
      const pos = polarToCartesian(cx, cy, ring2R, angle);
      return { ...block, angle, ...pos };
    });
  }, [dataBlocks, cx, cy, taxonomyCategories.length]);

  // Connections from blocks to taxonomy nodes
  const blockConnections = useMemo(() => {
    const connections: {
      block: (typeof blockNodes)[0];
      taxonomy: (typeof taxonomyNodes)[0];
    }[] = [];
    blockNodes.forEach((block) => {
      if (block.taxonomyTags) {
        block.taxonomyTags.forEach((tag) => {
          const taxNode = taxonomyNodes.find((t) => t.category === tag);
          if (taxNode) {
            connections.push({ block, taxonomy: taxNode });
          }
        });
      }
    });
    return connections;
  }, [blockNodes, taxonomyNodes]);

  const handleNodeClick = useCallback(
    (type: string, label: string) => {
      onNodeClick?.({ type, label });
    },
    [onNodeClick]
  );

  const lowConfidence = signalQuality.overallRichness === "MINIMAL";

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-[var(--muted-foreground)]" />
        <span className="text-[12px] font-semibold text-[var(--foreground)]">
          인텔리전스 방사형 그래프
        </span>
      </div>

      <div className="relative w-full aspect-square max-w-[320px] md:max-w-[440px] lg:max-w-[500px] mx-auto overflow-hidden">
        <svg
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          width="100%"
          height="100%"
          style={{ maxWidth: "100%", maxHeight: "100%" }}
          className="overflow-visible"
        >
          {/* Guide rings */}
          <circle
            cx={cx}
            cy={cy}
            r={ring1R}
            fill="none"
            stroke="var(--border)"
            strokeWidth="0.5"
            strokeDasharray="4 4"
            opacity={0.5}
          />
          <circle
            cx={cx}
            cy={cy}
            r={ring2R}
            fill="none"
            stroke="var(--border)"
            strokeWidth="0.5"
            strokeDasharray="4 4"
            opacity={0.3}
          />

          {/* Connections: center → taxonomy */}
          {taxonomyNodes.map((node, i) => (
            <line
              key={`conn-center-${i}`}
              x1={cx}
              y1={cy}
              x2={node.x}
              y2={node.y}
              stroke={
                node.clusterCount > 0 ? colors.primary : "var(--border)"
              }
              strokeWidth={node.clusterCount > 0 ? 1 : 0.5}
              strokeDasharray={node.clusterCount > 0 ? "none" : "3 3"}
              opacity={0.3}
            />
          ))}

          {/* Connections: blocks → taxonomy */}
          {blockConnections.map((conn, i) => (
            <line
              key={`conn-block-${i}`}
              x1={conn.block.x}
              y1={conn.block.y}
              x2={conn.taxonomy.x}
              y2={conn.taxonomy.y}
              stroke="var(--border)"
              strokeWidth={0.5}
              opacity={0.25}
            />
          ))}

          {/* Center node - seed keyword */}
          <defs>
            <filter id="center-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <radialGradient id="center-grad">
              <stop offset="0%" stopColor={colors.primary} stopOpacity={0.15} />
              <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
            </radialGradient>
          </defs>

          {/* Glow behind center */}
          <circle cx={cx} cy={cy} r={centerR + 15} fill="url(#center-grad)" />

          <circle
            cx={cx}
            cy={cy}
            r={centerR}
            fill={colors.primary}
            opacity={0.9}
            filter="url(#center-glow)"
            className="cursor-pointer"
            onClick={() => handleNodeClick("seed", seedKeyword)}
          />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="11"
            fontWeight="600"
            className="pointer-events-none select-none"
          >
            {seedKeyword.length > 8
              ? seedKeyword.slice(0, 7) + "..."
              : seedKeyword}
          </text>

          {/* Taxonomy category nodes (1st ring) */}
          {taxonomyNodes.map((node, i) => {
            const isActive = node.clusterCount > 0;
            const isHovered =
              hoveredNode?.type === "taxonomy" &&
              hoveredNode?.label === node.category;

            return (
              <g
                key={`tax-${i}`}
                className="cursor-pointer"
                onMouseEnter={() =>
                  setHoveredNode({
                    type: "taxonomy",
                    label: node.category,
                    detail: `클러스터: ${node.clusterCount}`,
                    x: node.x,
                    y: node.y,
                  })
                }
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleNodeClick("taxonomy", node.category)}
              >
                {/* Invisible touch target (min 22px radius = 44px diameter) */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={Math.max(node.size, 22)}
                  fill="transparent"
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size}
                  fill={isActive ? colors.primary : "none"}
                  stroke={isActive ? colors.primary : "var(--border)"}
                  strokeWidth={isActive ? 1.5 : 1}
                  strokeDasharray={isActive ? "none" : "3 3"}
                  opacity={isHovered ? 1 : isActive ? 0.75 : 0.4}
                  className="transition-opacity duration-200"
                />
                {/* Social signal indicator */}
                {signalQuality.hasSocialData && isActive && (
                  <circle
                    cx={node.x + node.size - 2}
                    cy={node.y - node.size + 2}
                    r={3}
                    fill="#3b82f6"
                    stroke="white"
                    strokeWidth={1}
                  />
                )}
                {/* Low confidence indicator */}
                {lowConfidence && isActive && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size + 3}
                    fill="none"
                    stroke="#d97706"
                    strokeWidth={0.8}
                    strokeDasharray="2 2"
                    opacity={0.6}
                  />
                )}
                {/* Label */}
                <text
                  x={node.x}
                  y={node.y + node.size + 12}
                  textAnchor="middle"
                  fill={
                    isActive
                      ? "var(--foreground)"
                      : "var(--muted-foreground)"
                  }
                  fontSize="8"
                  opacity={isHovered ? 1 : 0.8}
                  className="pointer-events-none select-none"
                >
                  {node.category.length > 8
                    ? node.category.slice(0, 7) + "..."
                    : node.category}
                </text>
              </g>
            );
          })}

          {/* Data block nodes (2nd ring) */}
          {blockNodes.map((block, i) => {
            const isHovered =
              hoveredNode?.type === "block" &&
              hoveredNode?.label === block.title;
            const iconLabel =
              blockTypeIcons[block.blockType] ?? block.blockType.slice(0, 2);

            return (
              <g
                key={`block-${i}`}
                className="cursor-pointer"
                onMouseEnter={() =>
                  setHoveredNode({
                    type: "block",
                    label: block.title,
                    detail: block.blockType,
                    x: block.x,
                    y: block.y,
                  })
                }
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleNodeClick("block", block.title)}
              >
                {/* Invisible touch target (44x44px minimum) */}
                <rect
                  x={block.x - 22}
                  y={block.y - 22}
                  width={44}
                  height={44}
                  fill="transparent"
                />
                <rect
                  x={block.x - 14}
                  y={block.y - 10}
                  width={28}
                  height={20}
                  rx={4}
                  fill={isHovered ? colors.secondary : "var(--card)"}
                  stroke={isHovered ? colors.primary : "var(--border)"}
                  strokeWidth={1}
                  className="transition-all duration-200"
                />
                <text
                  x={block.x}
                  y={block.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--foreground)"
                  fontSize="7"
                  fontWeight="500"
                  className="pointer-events-none select-none"
                >
                  {iconLabel}
                </text>
                <text
                  x={block.x}
                  y={block.y + 18}
                  textAnchor="middle"
                  fill="var(--muted-foreground)"
                  fontSize="7"
                  className="pointer-events-none select-none"
                >
                  {block.title.length > 10
                    ? block.title.slice(0, 9) + "..."
                    : block.title}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredNode && (
          <div
            className="absolute bg-[var(--popover)] border border-[var(--border)] rounded-lg shadow-lg px-3 py-2 z-10 pointer-events-none min-w-[120px]"
            style={{
              left: Math.min(
                hoveredNode.x * (1) + 20,
                svgSize - 150
              ),
              top: Math.max(hoveredNode.y * (1) - 30, 0),
            }}
          >
            <p className="text-[11px] font-semibold text-[var(--foreground)]">
              {hoveredNode.label}
            </p>
            {hoveredNode.detail && (
              <p className="text-[10px] text-[var(--muted-foreground)]">
                {hoveredNode.detail}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-1">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: colors.primary }}
          />
          <span className="text-[9px] text-[var(--muted-foreground)]">
            활성 카테고리
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full border border-dashed border-gray-400" />
          <span className="text-[9px] text-[var(--muted-foreground)]">
            비활성 카테고리
          </span>
        </div>
        {signalQuality.hasSocialData && (
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="text-[9px] text-[var(--muted-foreground)]">
              소셜 시그널
            </span>
          </div>
        )}
        {lowConfidence && (
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full border border-dashed border-amber-500" />
            <span className="text-[9px] text-[var(--muted-foreground)]">
              낮은 신뢰도
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
