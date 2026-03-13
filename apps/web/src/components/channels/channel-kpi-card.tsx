import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import {
  formatCount,
  formatPercent,
  formatGrowth,
} from "@/lib/channels/metric-resolver";

type Props = {
  label: string;
  value: number | null;
  format?: "count" | "percent" | "growth";
  description?: string;
  previousValue?: number | null;
};

export function ChannelKpiCard({
  label,
  value,
  format = "count",
  description,
  previousValue,
}: Props) {
  let formatted: string;
  switch (format) {
    case "percent":
      formatted = formatPercent(value);
      break;
    case "growth":
      formatted = formatGrowth(value);
      break;
    default:
      formatted = formatCount(value);
  }

  const isGrowth = format === "growth";
  const growthColor =
    isGrowth && value != null
      ? value >= 0
        ? "text-emerald-600"
        : "text-red-600"
      : "";

  // Compute change indicator from previousValue
  let changePercent: number | null = null;
  let changeDirection: "up" | "down" | "flat" = "flat";
  if (
    previousValue != null &&
    value != null &&
    previousValue > 0 &&
    format !== "growth"
  ) {
    changePercent = ((value - previousValue) / previousValue) * 100;
    changeDirection =
      changePercent > 0.5 ? "up" : changePercent < -0.5 ? "down" : "flat";
  }

  return (
    <div className="card group relative p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
          {label}
        </p>
        {description && (
          <div className="relative">
            <Info className="h-3 w-3 cursor-help text-[var(--muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="absolute right-0 top-5 z-10 hidden w-48 rounded-md bg-[var(--foreground)] p-2 text-[11px] text-white shadow-lg group-hover:block">
              {description}
            </div>
          </div>
        )}
      </div>

      <p
        className={`mt-2 text-2xl font-semibold text-[var(--foreground)] ${growthColor}`}
      >
        {formatted}
      </p>

      {changePercent != null && (
        <div className="mt-1.5 flex items-center gap-1">
          {changeDirection === "up" && (
            <TrendingUp className="h-3 w-3 text-emerald-600" />
          )}
          {changeDirection === "down" && (
            <TrendingDown className="h-3 w-3 text-red-600" />
          )}
          {changeDirection === "flat" && (
            <Minus className="h-3 w-3 text-[var(--muted-foreground)]" />
          )}
          <span
            className={`text-[11px] font-medium ${
              changeDirection === "up"
                ? "text-emerald-600"
                : changeDirection === "down"
                  ? "text-red-600"
                  : "text-[var(--muted-foreground)]"
            }`}
          >
            {changePercent >= 0 ? "+" : ""}
            {changePercent.toFixed(1)}% vs prev.
          </span>
        </div>
      )}
    </div>
  );
}
