"use client";

import { ArrowRight, Users, AlertTriangle, Clock, User } from "lucide-react";
import Link from "next/link";
import type { EngineExecutionResult } from "@/services/search-intelligence";

type PersonaItem = {
  id?: string;
  label?: string;
  name?: string;
  description?: string;
  percentage?: number;
  archetype?: string;
  archetypeLabel?: string;
  relatedClusterCount?: number;
  confidence?: number;
};

type PersonaData = {
  personas?: PersonaItem[];
  totalPersonas?: number;
};

const PERSONA_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

type PersonaSectionProps = {
  personaResult: EngineExecutionResult<unknown> | undefined;
};

export function PersonaSection({ personaResult }: PersonaSectionProps) {
  if (!personaResult) {
    return (
      <section id="section-persona">
        <div className="card flex flex-col items-center justify-center border-dashed px-6 py-12 text-center">
          <Users className="h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="mt-3 text-[13px] text-[var(--muted-foreground)]">
            분석을 실행하면 페르소나가 여기에 표시됩니다
          </p>
        </div>
      </section>
    );
  }

  const data = personaResult.data as PersonaData | undefined;
  const personas = data?.personas ?? [];
  const confidence = personaResult.trace?.confidence ?? 0;
  const freshness = personaResult.trace?.freshness;

  return (
    <section id="section-persona" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
          페르소나
        </h2>
        <Link
          href="/persona"
          className="flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:underline"
        >
          전체 보기 <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {confidence < 0.3 && (
        <div className="flex items-start gap-2 rounded-md bg-orange-50 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-orange-400" />
          <p className="text-[12px] text-orange-700">
            페르소나 신뢰도가 낮습니다 ({Math.round(confidence * 100)}%).
          </p>
        </div>
      )}
      {freshness === "stale" && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2">
          <Clock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
          <p className="text-[12px] text-amber-700">
            데이터가 오래되었습니다. 최신 분석을 다시 실행하세요.
          </p>
        </div>
      )}

      {!personaResult.success && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">
          페르소나 분석 실패:{" "}
          {typeof personaResult.error === "string"
            ? personaResult.error
            : "알 수 없는 오류"}
        </div>
      )}

      {personaResult.success && personas.length === 0 && (
        <div className="card border-dashed px-6 py-8 text-center">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            페르소나 결과가 없습니다.
          </p>
        </div>
      )}

      {personas.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {personas.map((persona, i) => {
              const color = PERSONA_COLORS[i % PERSONA_COLORS.length];
              const name = persona.label ?? persona.name ?? `페르소나 ${i + 1}`;

              return (
                <div key={persona.id ?? i} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: color }}
                    >
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold">{name}</p>
                        {persona.percentage != null && (
                          <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[11px] font-medium">
                            {persona.percentage}%
                          </span>
                        )}
                      </div>
                      {persona.description && (
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--muted-foreground)]">
                          {persona.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {(persona.archetypeLabel ?? persona.archetype) && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: color + "20",
                          color,
                        }}
                      >
                        {persona.archetypeLabel ?? persona.archetype}
                      </span>
                    )}
                    {persona.relatedClusterCount != null &&
                      persona.relatedClusterCount > 0 && (
                        <Link
                          href="/cluster-finder"
                          className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] hover:underline"
                        >
                          클러스터 {persona.relatedClusterCount}개
                        </Link>
                      )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cross-section CTA */}
          <button
            onClick={() => {
              const el = document.getElementById("section-roadview");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-2 text-[12px] font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            이 페르소나의 여정 단계 보기
            <ArrowRight className="h-3 w-3" />
          </button>
        </>
      )}
    </section>
  );
}
