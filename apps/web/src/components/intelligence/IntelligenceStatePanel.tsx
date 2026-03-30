"use client";

import { useState } from "react";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Search,
  MessageCircle,
  MessagesSquare,
  ChevronDown,
  ChevronUp,
  XCircle,
  ShieldAlert,
} from "lucide-react";

type Props = {
  isLoading?: boolean;
  isEmpty?: boolean;
  isPartial?: boolean;
  isStaleBased?: boolean;
  isMockOnly?: boolean;
  confidence: number;
  signalQuality: {
    hasClusterData: boolean;
    hasSocialData: boolean;
    hasBenchmarkData: boolean;
    overallRichness: string;
  };
  warnings?: string[];
};

type PanelState = {
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  message: string;
};

function resolveState(props: Props): PanelState {
  if (props.isLoading) {
    return {
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />,
      message: "분석하고 있어요",
    };
  }

  if (props.isEmpty) {
    return {
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
      icon: <XCircle className="h-4 w-4 text-red-500" />,
      message: "아직 데이터가 없어요. 키워드를 분석하면 여기에 결과가 나타나요.",
    };
  }

  if (props.isMockOnly) {
    return {
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
      icon: <ShieldAlert className="h-4 w-4 text-red-500" />,
      message:
        "샘플 데이터로 보여드리고 있어요. 실제 결과와 다를 수 있어요.",
    };
  }

  if (props.confidence < 0.5) {
    return {
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      message: "신뢰도가 낮아요. 참고용으로 봐주세요.",
    };
  }

  if (props.isStaleBased) {
    return {
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      message:
        "최신 데이터는 아니에요. 흐름을 볼 때 참고해 주세요.",
    };
  }

  if (props.isPartial) {
    return {
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: <Info className="h-4 w-4 text-amber-500" />,
      message: "일부 데이터만 먼저 반영했어요.",
    };
  }

  return {
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    message: "분석을 마쳤어요.",
  };
}

export function IntelligenceStatePanel(props: Props) {
  const [expanded, setExpanded] = useState(false);
  const state = resolveState(props);
  const { signalQuality, confidence, warnings } = props;

  const signals = [
    {
      key: "search",
      label: "검색",
      active: signalQuality.hasClusterData,
      icon: <Search className="h-3 w-3" />,
    },
    {
      key: "social",
      label: "소셜",
      active: signalQuality.hasSocialData,
      icon: <MessageCircle className="h-3 w-3" />,
    },
    {
      key: "comment",
      label: "댓글",
      active: signalQuality.hasBenchmarkData,
      icon: <MessagesSquare className="h-3 w-3" />,
    },
  ];

  const confidencePercent = Math.round(confidence * 100);

  return (
    <div
      className={`rounded-lg border px-4 py-2.5 ${state.bg} ${state.border} transition-all`}
    >
      {/* Main strip */}
      <div className="flex items-center gap-3">
        {state.icon}
        <span className={`text-[12px] font-medium ${state.color} flex-1`}>
          {state.message}
        </span>

        {/* Signal availability icons */}
        <div className="flex items-center gap-1.5">
          {signals.map((s) => (
            <div
              key={s.key}
              className="flex items-center gap-0.5"
              title={`${s.label}: ${s.active ? "연결됨" : "미연결"}`}
            >
              <span
                className={
                  s.active ? "text-emerald-600" : "text-gray-400"
                }
              >
                {s.icon}
              </span>
              <span
                className={`text-[9px] ${
                  s.active ? "text-emerald-600" : "text-gray-400"
                }`}
              >
                {s.active ? "\u2713" : "\u2717"}
              </span>
            </div>
          ))}
        </div>

        {/* Confidence mini badge */}
        {!props.isLoading && !props.isEmpty && (
          <span
            className={`badge text-[10px] font-medium ${
              confidencePercent >= 70
                ? "bg-emerald-100 text-emerald-700"
                : confidencePercent >= 40
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
            }`}
          >
            {confidencePercent}%
          </span>
        )}

        {/* Expand toggle */}
        {!props.isLoading && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && !props.isLoading && (
        <div className="mt-2 pt-2 border-t border-[var(--border)] space-y-2">
          {/* Signal detail */}
          <div className="flex flex-wrap gap-3">
            {signals.map((s) => (
              <div
                key={s.key}
                className={`flex items-center gap-1.5 rounded px-2 py-1 text-[10px] ${
                  s.active
                    ? "bg-emerald-100/50 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {s.icon}
                <span>{s.label}</span>
                <span className="font-medium">
                  {s.active ? "연결됨" : "미연결"}
                </span>
              </div>
            ))}
          </div>

          {/* Richness + confidence */}
          <div className="flex items-center gap-4 text-[10px] text-[var(--muted-foreground)]">
            <span>
              데이터 풍부도:{" "}
              <b className="text-[var(--foreground)]">
                {signalQuality.overallRichness === "RICH" ? "풍부해요" : signalQuality.overallRichness === "MODERATE" ? "보통이에요" : "최소한이에요"}
              </b>
            </span>
            <span>
              신뢰도:{" "}
              <b className="text-[var(--foreground)]">
                {confidencePercent}%
              </b>
            </span>
          </div>

          {/* Warnings */}
          {warnings && warnings.length > 0 && (
            <div className="space-y-1">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <AlertTriangle className="h-3 w-3 mt-0.5 text-amber-500 shrink-0" />
                  <span className="text-[10px] text-amber-700">{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
