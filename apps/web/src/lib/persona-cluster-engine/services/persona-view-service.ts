/**
 * Persona View Service
 *
 * 페르소나 뷰의 진입점.
 * 클러스터 파인더 결과를 기반으로 검색 행동 기반 PersonaProfile을 추론한다.
 *
 * 동작 흐름:
 * 1. 클러스터 파인더 결과 얻기 (없으면 내부 호출)
 * 2. persona-archetype-builder로 PersonaProfile 추론
 * 3. (선택) LLM으로 persona summary 강화
 * 4. PersonaClusterLink / PersonaJourneyLink 생성
 */

import type {
  PersonaViewRequest,
  PersonaViewResult,
  PersonaViewSummary,
  PersonaArchetype,
  ClusterFinderResult,
} from "../types";
import type { RoadStageType } from "../../journey-engine/types";
import { analyzeClusterFinder } from "./cluster-finder-service";
import { buildPersonaProfiles } from "../builders/persona-archetype-builder";

/**
 * 페르소나 뷰 분석 실행
 */
export async function analyzePersonaView(
  request: PersonaViewRequest,
): Promise<PersonaViewResult> {
  const startTime = Date.now();

  // 1. 클러스터 파인더 결과 얻기
  let clusterResult: ClusterFinderResult;

  if (request.existingClusters) {
    clusterResult = request.existingClusters;
  } else {
    clusterResult = await analyzeClusterFinder({
      seedKeyword: request.seedKeyword,
      maxClusters: 20,
      minClusterSize: 3,
      includeQuestions: true,
      useLLM: request.useLLM,
      existingAnalysis: request.existingAnalysis,
    });
  }

  // 2. PersonaProfile 추론
  const maxPersonas = request.maxPersonas ?? 6;
  const {
    personas,
    personaClusterLinks,
    personaJourneyLinks,
  } = buildPersonaProfiles(
    clusterResult.clusters,
    request.seedKeyword,
    maxPersonas,
  );

  // 3. (선택) LLM으로 summary 강화
  if (request.useLLM && personas.length > 0) {
    await enhanceWithLLM(personas, request.seedKeyword);
  }

  // 4. 요약 생성
  const summary = buildPersonaSummary(
    personas,
    clusterResult,
    startTime,
  );

  // 5. Trace 생성
  const trace = buildTrace(clusterResult, personas, startTime);

  return {
    seedKeyword: request.seedKeyword,
    personas,
    personaClusterLinks,
    personaJourneyLinks,
    summary,
    trace,
  };
}

// ─── LLM 강화 ────────────────────────────────────────────────

async function enhanceWithLLM(
  personas: import("../types").PersonaProfile[],
  seedKeyword: string,
): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return;

  try {
    const personaInfo = personas
      .slice(0, 6)
      .map(
        (p) =>
          `- ${p.label} (${p.archetype}): 키워드=${p.representativeKeywords.slice(0, 5).join(",")}, 질문=${p.typicalQuestions.slice(0, 2).join(",")}`,
      )
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: PERSONA_SUMMARY_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `시드 키워드: "${seedKeyword}"\n\n페르소나:\n${personaInfo}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return;

    const result = JSON.parse(content) as {
      summaries: { archetype: string; summary: string; messagingAngle: string }[];
    };

    // 결과 적용
    for (const item of result.summaries) {
      const persona = personas.find((p) => p.archetype === item.archetype);
      if (persona) {
        persona.summary = item.summary;
        persona.messagingAngle = item.messagingAngle;
      }
    }
  } catch {
    // LLM 실패 시 기존 규칙 기반 요약 유지
  }
}

const PERSONA_SUMMARY_SYSTEM_PROMPT = `당신은 검색 의도 기반 소비자 페르소나 분석 전문가입니다.
각 페르소나에 대해 마케팅에 활용 가능한 요약과 메시지 각도를 작성하세요.

응답 형식 (JSON):
{
  "summaries": [
    {
      "archetype": "information_seeker",
      "summary": "이 페르소나에 대한 2-3문장 요약",
      "messagingAngle": "이 페르소나에게 효과적인 메시지 전략 1문장"
    }
  ]
}

규칙:
- 한국어 사용
- 마케팅/콘텐츠 전략 관점
- 구체적이고 실행 가능한 인사이트
- 각 페르소나별 차별화된 메시지`;

// ─── Summary ──────────────────────────────────────────────────

function buildPersonaSummary(
  personas: import("../types").PersonaProfile[],
  clusterResult: ClusterFinderResult,
  startTime: number,
): PersonaViewSummary {
  // Archetype 분포
  const archetypeDist: Partial<Record<PersonaArchetype, number>> = {};
  for (const persona of personas) {
    archetypeDist[persona.archetype] =
      (archetypeDist[persona.archetype] || 0) + 1;
  }

  // 스테이지 분포
  const stageDist: Partial<Record<RoadStageType, number>> = {};
  for (const persona of personas) {
    stageDist[persona.dominantStage] =
      (stageDist[persona.dominantStage] || 0) + 1;
  }

  // Dominant archetype
  const dominantArchetype = personas.length > 0
    ? personas.reduce((a, b) => (b.percentage > a.percentage ? b : a)).archetype
    : "information_seeker" as PersonaArchetype;

  return {
    totalPersonas: personas.length,
    totalClusters: clusterResult.clusters.length,
    totalKeywords: clusterResult.summary.totalKeywords,
    dominantArchetype,
    archetypeDistribution: archetypeDist,
    stageDistribution: stageDist,
    analyzedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
  };
}

// ─── Trace ────────────────────────────────────────────────────

function buildTrace(
  clusterResult: ClusterFinderResult,
  personas: import("../types").PersonaProfile[],
  startTime: number,
): import("../types").AnalysisTrace {
  return {
    analysisId: `pv-${Date.now()}`,
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    stages: [
      ...clusterResult.trace.stages,
      {
        name: "persona_inference",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        inputCount: clusterResult.clusters.length,
        outputCount: personas.length,
        apiCallCount: 0,
        cacheHitCount: 0,
        errorCount: 0,
      },
    ],
    dataSources: [
      ...clusterResult.trace.dataSources,
      {
        source: "persona_engine",
        callCount: 1,
        cacheHitRate: 0,
        avgLatencyMs: Date.now() - startTime,
      },
    ],
  };
}
