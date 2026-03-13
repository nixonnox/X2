"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Search,
  Loader2,
  GitBranch,
  ArrowRight,
  ArrowLeft,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { PageHeader, ChartCard, EmptyState } from "@/components/shared";
import type {
  IntentGraphData,
  IntentGraphNode,
  TemporalPhase,
  IntentCategory,
  SearchJourneyStage,
} from "@/lib/intent-engine";
import {
  INTENT_CATEGORY_LABELS,
  TEMPORAL_PHASE_LABELS,
  JOURNEY_STAGE_LABELS,
} from "@/lib/intent-engine";

// ── Types ──

type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; keyword: string }
  | { status: "error"; keyword: string; message: string }
  | { status: "success"; keyword: string; data: IntentGraphData };

type PathNode = {
  id: string;
  name: string;
  phase: TemporalPhase;
  intent: IntentCategory;
  volume: number;
  gapScore: number;
  isRising: boolean;
  isSeed: boolean;
  journeyStage?: SearchJourneyStage;
};

type PathEdge = {
  source: string;
  target: string;
  strength: number;
  type: string;
};

type PhaseFilter = "all" | TemporalPhase;
type IntentFilter = "all" | IntentCategory;

// ── Colors ──

const PHASE_COLORS: Record<TemporalPhase, string> = {
  before: "#8b5cf6",
  current: "#3b82f6",
  after: "#10b981",
};

const INTENT_COLORS: Record<IntentCategory, string> = {
  discovery: "#3b82f6",
  comparison: "#f59e0b",
  action: "#10b981",
  troubleshooting: "#ef4444",
  unknown: "#6b7280",
};

// ── Canvas Graph Renderer ──

function PathGraph({
  nodes,
  edges,
  seedKeyword,
  onNodeClick,
  selectedNode,
}: {
  nodes: PathNode[];
  edges: PathEdge[];
  seedKeyword: string;
  onNodeClick: (nodeId: string | null) => void;
  selectedNode: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const nodePositions = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<{
    x: number;
    y: number;
    node: PathNode;
  } | null>(null);

  // Layout: position nodes by temporal phase columns
  const layoutNodes = useCallback(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const width = containerRef.current?.clientWidth ?? 800;
    const height = containerRef.current?.clientHeight ?? 500;

    const phaseColumns: Record<TemporalPhase, PathNode[]> = {
      before: [],
      current: [],
      after: [],
    };

    for (const node of nodes) {
      phaseColumns[node.phase].push(node);
    }

    // Sort each column by volume descending
    for (const phase of ["before", "current", "after"] as TemporalPhase[]) {
      phaseColumns[phase].sort((a, b) => b.volume - a.volume);
    }

    const colX: Record<TemporalPhase, number> = {
      before: width * 0.18,
      current: width * 0.5,
      after: width * 0.82,
    };

    for (const phase of ["before", "current", "after"] as TemporalPhase[]) {
      const col = phaseColumns[phase];
      const totalH = Math.min(col.length, 20) * 36;
      const startY = Math.max(40, (height - totalH) / 2);

      col.slice(0, 20).forEach((node, i) => {
        const jitter = node.isSeed
          ? 0
          : Math.sin(i * 2.7 + node.name.length) * 30;
        positions.set(node.id, {
          x: colX[phase] + jitter,
          y: startY + i * 36,
        });
      });
    }

    nodePositions.current = positions;
  }, [nodes]);

  useEffect(() => {
    layoutNodes();
  }, [layoutNodes]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    const positions = nodePositions.current;

    // Phase column labels
    const phaseLabels: { phase: TemporalPhase; x: number }[] = [
      { phase: "before", x: rect.width * 0.18 },
      { phase: "current", x: rect.width * 0.5 },
      { phase: "after", x: rect.width * 0.82 },
    ];

    for (const { phase, x } of phaseLabels) {
      const label = TEMPORAL_PHASE_LABELS[phase];
      ctx.fillStyle = PHASE_COLORS[phase] + "20";
      ctx.fillRect(x - 80, 0, 160, rect.height / zoom);
      ctx.fillStyle = PHASE_COLORS[phase];
      ctx.font = "bold 12px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(label.label, x, 18);
    }

    // Draw edges
    for (const edge of edges) {
      const sPos = positions.get(edge.source);
      const tPos = positions.get(edge.target);
      if (!sPos || !tPos) continue;

      const isHighlighted =
        selectedNode === edge.source || selectedNode === edge.target;
      ctx.beginPath();
      ctx.strokeStyle = isHighlighted ? "#3b82f6" : "#d1d5db";
      ctx.lineWidth = isHighlighted ? 2 : Math.max(0.5, edge.strength * 2);
      ctx.globalAlpha = isHighlighted ? 0.8 : 0.3;

      // Curved line
      const midX = (sPos.x + tPos.x) / 2;
      const cpOffset = (tPos.x - sPos.x) * 0.2;
      ctx.moveTo(sPos.x, sPos.y);
      ctx.bezierCurveTo(
        midX - cpOffset,
        sPos.y,
        midX + cpOffset,
        tPos.y,
        tPos.x,
        tPos.y,
      );
      ctx.stroke();

      // Arrow head
      if (isHighlighted) {
        const angle = Math.atan2(tPos.y - sPos.y, tPos.x - sPos.x);
        const arrowLen = 6;
        ctx.beginPath();
        ctx.moveTo(tPos.x, tPos.y);
        ctx.lineTo(
          tPos.x - arrowLen * Math.cos(angle - 0.3),
          tPos.y - arrowLen * Math.sin(angle - 0.3),
        );
        ctx.lineTo(
          tPos.x - arrowLen * Math.cos(angle + 0.3),
          tPos.y - arrowLen * Math.sin(angle + 0.3),
        );
        ctx.closePath();
        ctx.fillStyle = "#3b82f6";
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Draw nodes
    for (const node of nodes) {
      const pos = positions.get(node.id);
      if (!pos) continue;

      const isSelected = selectedNode === node.id;
      const isHovered = hoveredNode === node.id;
      const isConnected = selectedNode
        ? edges.some(
            (e) =>
              (e.source === selectedNode && e.target === node.id) ||
              (e.target === selectedNode && e.source === node.id),
          )
        : false;
      const dimmed = selectedNode && !isSelected && !isConnected;

      const radius = node.isSeed
        ? 10
        : Math.max(4, Math.min(8, Math.log2(Math.max(1, node.volume)) * 1.2));

      ctx.globalAlpha = dimmed ? 0.2 : 1;

      // Node circle
      ctx.beginPath();
      ctx.arc(
        pos.x,
        pos.y,
        radius + (isSelected || isHovered ? 2 : 0),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = INTENT_COLORS[node.intent] ?? "#6b7280";
      ctx.fill();

      if (isSelected || isHovered) {
        ctx.strokeStyle = "#1e40af";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (node.isRising) {
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.arc(pos.x + radius + 3, pos.y - radius, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Label
      const showLabel =
        node.isSeed ||
        isSelected ||
        isHovered ||
        isConnected ||
        node.volume > 500;
      if (showLabel) {
        ctx.font = node.isSeed ? "bold 11px system-ui" : "10px system-ui";
        ctx.fillStyle = dimmed ? "#9ca3af" : "#111827";
        ctx.textAlign = "left";
        ctx.fillText(node.name, pos.x + radius + 5, pos.y + 3);
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }, [nodes, edges, zoom, offset, selectedNode, hoveredNode]);

  // Mouse handlers
  const getNodeAt = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const mx = (clientX - rect.left - offset.x) / zoom;
      const my = (clientY - rect.top - offset.y) / zoom;

      for (const node of nodes) {
        const pos = nodePositions.current.get(node.id);
        if (!pos) continue;
        const r = node.isSeed ? 12 : 10;
        if (Math.hypot(mx - pos.x, my - pos.y) < r) return node;
      }
      return null;
    },
    [nodes, offset, zoom],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) {
        setOffset((prev) => ({
          x: prev.x + e.clientX - dragStart.current.x,
          y: prev.y + e.clientY - dragStart.current.y,
        }));
        dragStart.current = { x: e.clientX, y: e.clientY };
        return;
      }
      const node = getNodeAt(e.clientX, e.clientY);
      setHoveredNode(node?.id ?? null);
      if (node) {
        setTooltipInfo({ x: e.clientX, y: e.clientY, node });
      } else {
        setTooltipInfo(null);
      }
    },
    [dragging, getNodeAt],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const node = getNodeAt(e.clientX, e.clientY);
      if (node) {
        onNodeClick(node.id === selectedNode ? null : node.id);
      } else {
        setDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
      }
    },
    [getNodeAt, onNodeClick, selectedNode],
  );

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.max(0.3, Math.min(3, prev - e.deltaY * 0.001)));
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        style={{ width: "100%", height: "100%" }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Zoom controls */}
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <button
          onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
          className="rounded bg-white/80 p-1 shadow hover:bg-white"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
          className="rounded bg-white/80 p-1 shadow hover:bg-white"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
          className="rounded bg-white/80 p-1 shadow hover:bg-white"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tooltip */}
      {tooltipInfo && (
        <div
          className="pointer-events-none absolute z-10 max-w-[220px] rounded-lg border border-[var(--border)] bg-white p-2.5 shadow-lg"
          style={{
            left: Math.min(
              tooltipInfo.x + 12,
              (containerRef.current?.clientWidth ?? 800) - 230,
            ),
            top: Math.max(0, tooltipInfo.y - 60),
          }}
        >
          <p className="text-[12px] font-semibold">{tooltipInfo.node.name}</p>
          <div className="mt-1 space-y-0.5 text-[11px] text-[var(--muted-foreground)]">
            <p>
              의도: {INTENT_CATEGORY_LABELS[tooltipInfo.node.intent]?.label}
            </p>
            <p>단계: {TEMPORAL_PHASE_LABELS[tooltipInfo.node.phase]?.label}</p>
            <p>검색량: {tooltipInfo.node.volume.toLocaleString()}</p>
            <p>갭 스코어: {tooltipInfo.node.gapScore}</p>
            {tooltipInfo.node.isRising && (
              <p className="font-medium text-emerald-600">급상승 키워드</p>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-3 rounded-md bg-white/90 px-3 py-1.5 text-[10px] shadow">
        {(["before", "current", "after"] as TemporalPhase[]).map((phase) => (
          <span key={phase} className="flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: PHASE_COLORS[phase] + "30" }}
            />
            {TEMPORAL_PHASE_LABELS[phase].label}
          </span>
        ))}
        <span className="border-l border-gray-200 pl-2" />
        {(
          Object.entries(INTENT_CATEGORY_LABELS) as [
            IntentCategory,
            { label: string; color: string },
          ][]
        )
          .filter(([key]) => key !== "unknown")
          .map(([key, { label, color }]) => (
            <span key={key} className="flex items-center gap-1">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {label}
            </span>
          ))}
      </div>
    </div>
  );
}

// ── Main Component ──

export default function PathfinderPage() {
  const [inputValue, setInputValue] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("all");
  const [intentFilter, setIntentFilter] = useState<IntentFilter>("all");

  const handleAnalyze = useCallback(
    async (keyword?: string) => {
      const seed = (keyword ?? inputValue).trim();
      if (!seed) return;
      setAnalysis({ status: "loading", keyword: seed });
      setSelectedNode(null);
      try {
        const res = await fetch("/api/intent/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seedKeyword: seed,
            mode: "sync",
            maxDepth: 2,
            maxKeywords: 150,
            platforms: ["youtube", "instagram", "tiktok", "naver_blog"],
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.success || !json.data)
          throw new Error(json.error ?? "분석 결과가 없습니다.");
        setAnalysis({
          status: "success",
          keyword: seed,
          data: json.data as IntentGraphData,
        });
        setInputValue("");
      } catch (err) {
        setAnalysis({
          status: "error",
          keyword: seed,
          message: (err as Error).message,
        });
      }
    },
    [inputValue],
  );

  // Build path nodes and edges from analysis data
  const { pathNodes, pathEdges } = useMemo(() => {
    if (analysis.status !== "success") return { pathNodes: [], pathEdges: [] };
    const { nodes, links } = analysis.data;

    let filtered = nodes;
    if (phaseFilter !== "all")
      filtered = filtered.filter((n) => n.temporalPhase === phaseFilter);
    if (intentFilter !== "all")
      filtered = filtered.filter((n) => n.intentCategory === intentFilter);

    const nodeIds = new Set(filtered.map((n) => n.id));
    // Always include seed
    const seedNode = nodes.find((n) => n.isSeed);
    if (seedNode && !nodeIds.has(seedNode.id)) {
      filtered = [seedNode, ...filtered];
      nodeIds.add(seedNode.id);
    }

    const pathNodes: PathNode[] = filtered.map((n) => ({
      id: n.id,
      name: n.name,
      phase: n.temporalPhase,
      intent: n.intentCategory,
      volume: n.searchVolume,
      gapScore: n.gapScore,
      isRising: n.isRising,
      isSeed: n.isSeed,
      journeyStage: n.journeyStage,
    }));

    const pathEdges: PathEdge[] = links
      .filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target))
      .map((l) => ({
        source: l.source,
        target: l.target,
        strength: l.strength,
        type: l.relationshipType,
      }));

    return { pathNodes, pathEdges };
  }, [analysis, phaseFilter, intentFilter]);

  // Selected node info
  const selectedNodeData = useMemo(() => {
    if (!selectedNode || analysis.status !== "success") return null;
    return analysis.data.nodes.find((n) => n.id === selectedNode) ?? null;
  }, [selectedNode, analysis]);

  // Connected nodes
  const connectedNodes = useMemo(() => {
    if (!selectedNode || analysis.status !== "success")
      return { before: [], after: [] };
    const { links, nodes } = analysis.data;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const before: IntentGraphNode[] = [];
    const after: IntentGraphNode[] = [];

    for (const link of links) {
      if (link.source === selectedNode) {
        const t = nodeMap.get(link.target);
        if (t) after.push(t);
      }
      if (link.target === selectedNode) {
        const s = nodeMap.get(link.source);
        if (s) before.push(s);
      }
    }

    return {
      before: before
        .sort((a, b) => b.searchVolume - a.searchVolume)
        .slice(0, 10),
      after: after.sort((a, b) => b.searchVolume - a.searchVolume).slice(0, 10),
    };
  }, [selectedNode, analysis]);

  // Journey stage distribution
  const journeyStageData = useMemo(() => {
    if (analysis.status !== "success") return [];
    const dist = analysis.data.summary.journeyStageDistribution;
    return Object.entries(JOURNEY_STAGE_LABELS).map(
      ([key, { label, color }]) => ({
        name: label,
        count: dist[key as SearchJourneyStage] ?? 0,
        fill: color,
      }),
    );
  }, [analysis]);

  // Phase distribution
  const phaseDistData = useMemo(() => {
    if (analysis.status !== "success") return [];
    const journey = analysis.data.journey;
    return journey.stages.map((s) => ({
      name: TEMPORAL_PHASE_LABELS[s.phase].label,
      keywords: s.keywords.length,
      avgGap: s.avgGapScore,
      fill: PHASE_COLORS[s.phase],
    }));
  }, [analysis]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="패스파인더"
        description="검색어의 전후 맥락을 네트워크 그래프로 시각화합니다. 소비자의 검색 여정을 추적하세요."
        guide="키워드를 입력하면 해당 키워드 검색 전/후에 사람들이 어떤 키워드를 검색하는지 네트워크로 보여줍니다."
      />

      {/* Input */}
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="검색 여정을 분석할 키워드를 입력하세요"
              className="input w-full pl-8"
              disabled={analysis.status === "loading"}
            />
          </div>
          <button
            onClick={() => handleAnalyze()}
            disabled={!inputValue.trim() || analysis.status === "loading"}
            className="btn-primary flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
          >
            {analysis.status === "loading" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> 분석 중...
              </>
            ) : (
              <>
                <GitBranch className="h-3.5 w-3.5" /> 패스파인더 분석
              </>
            )}
          </button>
        </div>
        {analysis.status === "loading" && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <p className="text-[13px] text-blue-700">
              검색 여정을 분석하고 있습니다...
            </p>
          </div>
        )}
        {analysis.status === "error" && (
          <div className="mt-3 rounded-md bg-red-50 px-3 py-2">
            <p className="text-[13px] text-red-700">
              분석 실패: {analysis.message}
            </p>
          </div>
        )}
      </div>

      {/* Empty */}
      {analysis.status === "idle" && (
        <EmptyState
          icon={GitBranch}
          title="검색 여정을 시각화합니다"
          description="키워드를 입력하면 해당 키워드 검색 전/후의 검색 흐름을 네트워크 그래프로 보여줍니다. 소비자가 어떤 경로로 정보를 탐색하는지 파악하세요."
        />
      )}

      {/* Results */}
      {analysis.status === "success" && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                시드 키워드
              </p>
              <p className="mt-0.5 truncate text-[14px] font-semibold">
                {analysis.keyword}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                전체 노드
              </p>
              <p className="mt-0.5 text-[14px] font-semibold">
                {analysis.data.summary.totalNodes}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                연결 수
              </p>
              <p className="mt-0.5 text-[14px] font-semibold">
                {analysis.data.summary.totalLinks}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                클러스터
              </p>
              <p className="mt-0.5 text-[14px] font-semibold">
                {analysis.data.summary.totalClusters}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                평균 갭 스코어
              </p>
              <p className="mt-0.5 text-[14px] font-semibold">
                {analysis.data.summary.avgGapScore}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            <span className="text-[11px] text-[var(--muted-foreground)]">
              시간적 단계:
            </span>
            {(["all", "before", "current", "after"] as PhaseFilter[]).map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setPhaseFilter(f)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    phaseFilter === f
                      ? "bg-blue-100 text-blue-700"
                      : "hover:bg-[var(--secondary)]/80 bg-[var(--secondary)] text-[var(--muted-foreground)]"
                  }`}
                >
                  {f === "all" ? "전체" : TEMPORAL_PHASE_LABELS[f].label}
                </button>
              ),
            )}
            <span className="ml-2 text-[11px] text-[var(--muted-foreground)]">
              의도:
            </span>
            {(
              [
                "all",
                "discovery",
                "comparison",
                "action",
                "troubleshooting",
              ] as IntentFilter[]
            ).map((f) => (
              <button
                key={f}
                onClick={() => setIntentFilter(f)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  intentFilter === f
                    ? "bg-blue-100 text-blue-700"
                    : "hover:bg-[var(--secondary)]/80 bg-[var(--secondary)] text-[var(--muted-foreground)]"
                }`}
              >
                {f === "all" ? "전체" : INTENT_CATEGORY_LABELS[f]?.label}
              </button>
            ))}
          </div>

          {/* Graph */}
          <div className="card overflow-hidden">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-[13px] font-semibold">검색 여정 네트워크</h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                노드를 클릭하면 연결된 검색어를 확인할 수 있습니다. 드래그로
                이동, 스크롤로 확대/축소할 수 있습니다.
              </p>
            </div>
            <div className="h-[480px]">
              <PathGraph
                nodes={pathNodes}
                edges={pathEdges}
                seedKeyword={analysis.keyword}
                onNodeClick={setSelectedNode}
                selectedNode={selectedNode}
              />
            </div>
          </div>

          {/* Selected Node Detail */}
          {selectedNodeData && (
            <div className="card p-4">
              <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
                <GitBranch className="h-3.5 w-3.5 text-blue-500" />
                &quot;{selectedNodeData.name}&quot; 검색 경로
              </h3>
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Before */}
                <div>
                  <p className="mb-2 flex items-center gap-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                    <ArrowRight className="h-3 w-3" /> 이전에 검색한 키워드
                  </p>
                  {connectedNodes.before.length > 0 ? (
                    <div className="space-y-1">
                      {connectedNodes.before.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => setSelectedNode(n.id)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--secondary)]"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: INTENT_COLORS[n.intentCategory],
                            }}
                          />
                          <span className="flex-1 truncate text-[12px]">
                            {n.name}
                          </span>
                          <span className="text-[10px] text-[var(--muted-foreground)]">
                            {n.searchVolume.toLocaleString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      연결된 이전 키워드 없음
                    </p>
                  )}
                </div>

                {/* Center */}
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                  <p className="mb-2 text-center text-[14px] font-semibold">
                    {selectedNodeData.name}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-[var(--muted-foreground)]">의도</p>
                      <p className="font-medium">
                        {
                          INTENT_CATEGORY_LABELS[
                            selectedNodeData.intentCategory
                          ]?.label
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--muted-foreground)]">단계</p>
                      <p className="font-medium">
                        {
                          TEMPORAL_PHASE_LABELS[selectedNodeData.temporalPhase]
                            ?.label
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--muted-foreground)]">검색량</p>
                      <p className="font-medium">
                        {selectedNodeData.searchVolume.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--muted-foreground)]">
                        갭 스코어
                      </p>
                      <p className="font-medium">{selectedNodeData.gapScore}</p>
                    </div>
                    {selectedNodeData.journeyStage && (
                      <div className="col-span-2">
                        <p className="text-[var(--muted-foreground)]">
                          여정 단계
                        </p>
                        <p className="font-medium">
                          {
                            JOURNEY_STAGE_LABELS[selectedNodeData.journeyStage]
                              ?.label
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* After */}
                <div>
                  <p className="mb-2 flex items-center gap-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                    <ArrowLeft className="h-3 w-3" /> 이후에 검색한 키워드
                  </p>
                  {connectedNodes.after.length > 0 ? (
                    <div className="space-y-1">
                      {connectedNodes.after.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => setSelectedNode(n.id)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--secondary)]"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: INTENT_COLORS[n.intentCategory],
                            }}
                          />
                          <span className="flex-1 truncate text-[12px]">
                            {n.name}
                          </span>
                          <span className="text-[10px] text-[var(--muted-foreground)]">
                            {n.searchVolume.toLocaleString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      연결된 이후 키워드 없음
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard
              title="검색 여정 단계 분포"
              description="소비자 여정 단계별 키워드 수"
            >
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={journeyStageData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-subtle)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                      }}
                    />
                    <Bar dataKey="count" name="키워드 수" radius={[3, 3, 0, 0]}>
                      {journeyStageData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="시간적 단계별 분석"
              description="검색 전/중/후 키워드 분포"
            >
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={phaseDistData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-subtle)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                      }}
                    />
                    <Bar
                      dataKey="keywords"
                      fill="#3b82f6"
                      radius={[3, 3, 0, 0]}
                      name="키워드 수"
                    />
                    <Bar
                      dataKey="avgGap"
                      fill="#10b981"
                      radius={[3, 3, 0, 0]}
                      name="평균 갭 스코어"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Journey Paths */}
          {(analysis.data.journey?.paths?.length ?? 0) > 0 && (
            <div className="card overflow-hidden">
              <div className="border-b border-[var(--border)] px-4 py-3">
                <h3 className="text-[13px] font-semibold">검색 흐름 경로</h3>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  검색 단계 간 전환 빈도를 보여줍니다.
                </p>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {[...(analysis.data.journey?.paths ?? [])]
                  .sort((a, b) => b.weight - a.weight)
                  .slice(0, 10)
                  .map((path, i) => {
                    const fromLabel =
                      TEMPORAL_PHASE_LABELS[path.from as TemporalPhase]
                        ?.label ?? path.from;
                    const toLabel =
                      TEMPORAL_PHASE_LABELS[path.to as TemporalPhase]?.label ??
                      path.to;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <span
                          className="text-[11px] font-medium"
                          style={{
                            color:
                              PHASE_COLORS[path.from as TemporalPhase] ??
                              "#6b7280",
                          }}
                        >
                          {fromLabel}
                        </span>
                        <ArrowRight className="h-3 w-3 text-[var(--muted-foreground)]" />
                        <span
                          className="text-[11px] font-medium"
                          style={{
                            color:
                              PHASE_COLORS[path.to as TemporalPhase] ??
                              "#6b7280",
                          }}
                        >
                          {toLabel}
                        </span>
                        <div className="flex-1" />
                        <div className="flex items-center gap-2">
                          <div
                            className="h-1.5 rounded-full bg-blue-200"
                            style={{ width: Math.max(20, path.weight * 8) }}
                          >
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: "100%" }}
                            />
                          </div>
                          <span className="text-[11px] text-[var(--muted-foreground)]">
                            {path.weight}건
                          </span>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            path.journeyType === "circular"
                              ? "bg-amber-50 text-amber-700"
                              : path.journeyType === "branching"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-gray-50 text-gray-700"
                          }`}
                        >
                          {path.journeyType === "circular"
                            ? "순환"
                            : path.journeyType === "branching"
                              ? "분기"
                              : "직선"}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Top Opportunities */}
          <div className="card overflow-hidden">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-[13px] font-semibold">콘텐츠 기회 Top 5</h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                갭 스코어와 검색량을 종합한 콘텐츠 제작 기회
              </p>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {(analysis.data.summary.topOpportunities ?? []).map((opp, i) => (
                <div
                  key={opp.keyword}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-700">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">
                      {opp.keyword}
                    </p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      {opp.reason}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    {opp.opportunityScore}점
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
