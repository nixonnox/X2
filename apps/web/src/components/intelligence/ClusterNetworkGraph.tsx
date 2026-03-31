"use client";

import { useMemo, useState, useCallback, useRef } from "react";

type ClusterNode = {
  id: string;
  label: string;
  cluster: number;
  size: number; // 0-1 relative
  isCenter?: boolean;
};

type ClusterEdge = {
  source: string;
  target: string;
  weight: number; // 0-1
};

type Props = {
  clusters: {
    id: string;
    label: string;
    keywords: string[];
    dominantIntent?: string;
  }[];
  seedKeyword: string;
  width?: number;
  height?: number;
};

const CLUSTER_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
  "#f97316", "#84cc16",
];

/**
 * Force-directed style cluster network graph (pure SVG, no D3).
 * Uses simple radial layout with cluster grouping.
 */
export function ClusterNetworkGraph({ clusters, seedKeyword, width = 700, height = 500 }: Props) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { nodes, edges } = useMemo(() => {
    const ns: ClusterNode[] = [];
    const es: ClusterEdge[] = [];
    const cx = width / 2;
    const cy = height / 2;

    // Center node (seed keyword)
    ns.push({
      id: "seed",
      label: seedKeyword,
      cluster: -1,
      size: 1,
      isCenter: true,
    });

    // Distribute clusters in a circle around center
    const clusterAngleStep = (2 * Math.PI) / Math.max(clusters.length, 1);
    const clusterRadius = Math.min(width, height) * 0.32;

    clusters.forEach((cluster, ci) => {
      const clusterAngle = ci * clusterAngleStep - Math.PI / 2;
      const clusterCx = cx + Math.cos(clusterAngle) * clusterRadius;
      const clusterCy = cy + Math.sin(clusterAngle) * clusterRadius;

      // Cluster center node
      const clusterId = `cluster-${ci}`;
      ns.push({
        id: clusterId,
        label: cluster.label,
        cluster: ci,
        size: 0.7,
      });

      // Edge from seed to cluster
      es.push({ source: "seed", target: clusterId, weight: 0.8 });

      // Keyword nodes around cluster center
      const keywords = cluster.keywords.slice(0, 8);
      const kwAngleStep = (2 * Math.PI) / Math.max(keywords.length, 1);
      const kwRadius = 50 + keywords.length * 3;

      keywords.forEach((kw, ki) => {
        const kwAngle = ki * kwAngleStep;
        const kwId = `kw-${ci}-${ki}`;
        ns.push({
          id: kwId,
          label: kw,
          cluster: ci,
          size: 0.3 + (1 - ki / keywords.length) * 0.3,
        });

        // Edge from cluster center to keyword
        es.push({ source: clusterId, target: kwId, weight: 0.4 });
      });
    });

    return { nodes: ns, edges: es };
  }, [clusters, seedKeyword, width, height]);

  // Layout: position nodes
  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    const cx = width / 2;
    const cy = height / 2;

    // Seed at center
    pos.set("seed", { x: cx, y: cy });

    const clusterAngleStep = (2 * Math.PI) / Math.max(clusters.length, 1);
    const clusterRadius = Math.min(width, height) * 0.32;

    clusters.forEach((cluster, ci) => {
      const angle = ci * clusterAngleStep - Math.PI / 2;
      const ccx = cx + Math.cos(angle) * clusterRadius;
      const ccy = cy + Math.sin(angle) * clusterRadius;

      pos.set(`cluster-${ci}`, { x: ccx, y: ccy });

      const keywords = cluster.keywords.slice(0, 8);
      const kwAngleStep = (2 * Math.PI) / Math.max(keywords.length, 1);
      const kwRadius = 45 + keywords.length * 4;

      keywords.forEach((_, ki) => {
        const kwAngle = ki * kwAngleStep;
        pos.set(`kw-${ci}-${ki}`, {
          x: ccx + Math.cos(kwAngle) * kwRadius,
          y: ccy + Math.sin(kwAngle) * kwRadius,
        });
      });
    });

    return pos;
  }, [clusters, width, height]);

  const getNodeRadius = useCallback(
    (node: ClusterNode) => {
      if (node.isCenter) return 20;
      if (node.id.startsWith("cluster-")) return 14;
      return 6 + node.size * 5;
    },
    [],
  );

  const isConnected = useCallback(
    (nodeId: string) => {
      if (!hoveredNode) return true;
      if (nodeId === hoveredNode) return true;
      return edges.some(
        (e) =>
          (e.source === hoveredNode && e.target === nodeId) ||
          (e.target === hoveredNode && e.source === nodeId),
      );
    },
    [hoveredNode, edges],
  );

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="rounded-xl border border-gray-200 bg-white"
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Edges */}
      {edges.map((edge, i) => {
        const s = positions.get(edge.source);
        const t = positions.get(edge.target);
        if (!s || !t) return null;
        const dimmed = hoveredNode && !isConnected(edge.source) && !isConnected(edge.target);
        return (
          <line
            key={`e-${i}`}
            x1={s.x}
            y1={s.y}
            x2={t.x}
            y2={t.y}
            stroke={dimmed ? "#f0f0f0" : "#e5e7eb"}
            strokeWidth={edge.weight * 2}
            opacity={dimmed ? 0.2 : 0.6}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const p = positions.get(node.id);
        if (!p) return null;
        const r = getNodeRadius(node);
        const color = node.isCenter
          ? "#1f2937"
          : CLUSTER_COLORS[node.cluster % CLUSTER_COLORS.length];
        const dimmed = !isConnected(node.id);
        const isHovered = hoveredNode === node.id;

        return (
          <g
            key={node.id}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={r}
              fill={color}
              opacity={dimmed ? 0.15 : isHovered ? 1 : 0.85}
              stroke={isHovered ? "#000" : "white"}
              strokeWidth={isHovered ? 2 : 1}
            />
            {(node.isCenter || node.id.startsWith("cluster-") || isHovered) && (
              <text
                x={p.x}
                y={p.y + r + 12}
                textAnchor="middle"
                fontSize={node.isCenter ? 12 : 10}
                fontWeight={node.isCenter ? 700 : 500}
                fill={dimmed ? "#d1d5db" : "#374151"}
              >
                {node.label.length > 12 ? node.label.slice(0, 12) + "…" : node.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
