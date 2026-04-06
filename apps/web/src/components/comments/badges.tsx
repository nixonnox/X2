import {
  ThumbsUp,
  Minus,
  ThumbsDown,
  AlertTriangle,
  ShieldAlert,
  Shield,
  MessageSquare,
  CheckCircle2,
  Clock,
  Eye,
} from "lucide-react";
import type {
  SentimentLabel,
  TopicLabel,
  RiskLevel,
  ResponseStatus,
} from "@/lib/comments/types";
import { getTopicDisplayLabel } from "@/lib/comments";

// ---- Sentiment Badge ----

const SENTIMENT_CONFIG: Record<
  SentimentLabel,
  { icon: typeof ThumbsUp; color: string; bg: string; label: string }
> = {
  positive: {
    icon: ThumbsUp,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    label: "긍정",
  },
  neutral: {
    icon: Minus,
    color: "text-gray-600",
    bg: "bg-gray-50",
    label: "중립",
  },
  negative: {
    icon: ThumbsDown,
    color: "text-red-700",
    bg: "bg-red-50",
    label: "부정",
  },
};

export function SentimentBadge({ sentiment }: { sentiment: SentimentLabel }) {
  const cfg = SENTIMENT_CONFIG[sentiment];
  const Icon = cfg.icon;
  return (
    <span className={`badge ${cfg.bg} ${cfg.color} gap-0.5 text-[10px]`}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

// ---- Topic Badge ----

export function TopicBadge({ topic }: { topic: TopicLabel }) {
  return (
    <span className="badge bg-[var(--secondary)] text-[10px] text-[var(--muted-foreground)]">
      {getTopicDisplayLabel(topic)}
    </span>
  );
}

// ---- Risk Badge ----

const RISK_CONFIG: Record<
  RiskLevel,
  { icon: typeof Shield; color: string; bg: string; label: string }
> = {
  low: {
    icon: Shield,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    label: "낮음",
  },
  medium: {
    icon: AlertTriangle,
    color: "text-amber-700",
    bg: "bg-amber-50",
    label: "보통",
  },
  high: {
    icon: ShieldAlert,
    color: "text-red-700",
    bg: "bg-red-50",
    label: "높음",
  },
};

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const cfg = RISK_CONFIG[risk];
  const Icon = cfg.icon;
  return (
    <span className={`badge ${cfg.bg} ${cfg.color} gap-0.5 text-[10px]`}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

// ---- Response Status Badge ----

const STATUS_CONFIG: Record<
  ResponseStatus,
  { icon: typeof Clock; color: string; bg: string; label: string }
> = {
  unanswered: {
    icon: Clock,
    color: "text-amber-700",
    bg: "bg-amber-50",
    label: "미답변",
  },
  reviewing: {
    icon: Eye,
    color: "text-blue-700",
    bg: "bg-blue-50",
    label: "검토 중",
  },
  responded: {
    icon: CheckCircle2,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    label: "답변 완료",
  },
  dismissed: {
    icon: MessageSquare,
    color: "text-gray-600",
    bg: "bg-gray-100",
    label: "무시됨",
  },
};

export function ResponseStatusBadge({ status }: { status: ResponseStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`badge ${cfg.bg} ${cfg.color} gap-0.5 text-[10px]`}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}
