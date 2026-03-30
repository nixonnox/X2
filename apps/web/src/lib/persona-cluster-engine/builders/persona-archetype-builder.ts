/**
 * Persona Archetype Builder
 *
 * IntentCluster 배열과 검색 데이터로부터
 * 검색 행동 기반 PersonaProfile을 추론한다.
 *
 * 추론 원칙:
 * - 실제 개인 식별이 아닌, 검색/탐색 맥락 기반 archetype
 * - stage / intent / question / topic / cluster를 조합
 * - 마케팅 메시지/콘텐츠 전략에 바로 활용 가능
 *
 * 동작 흐름:
 * 1. 클러스터를 archetype별로 그룹핑
 * 2. 각 그룹에서 PersonaProfile 생성
 * 3. 특성(trait) 계산
 * 4. 대표 질문/키워드 추출
 * 5. 콘텐츠 전략/메시지 각도 생성
 */

import type { IntentCategory, TemporalPhase } from "../../intent-engine/types";
import type { RoadStageType } from "../../journey-engine/types";
import type {
  IntentCluster,
  PersonaProfile,
  PersonaArchetype,
  PersonaMindset,
  PersonaTrait,
  PersonaTraitAxis,
  PersonaClusterLink,
  PersonaJourneyLink,
} from "../types";
import {
  INTENT_TO_ARCHETYPE,
  SUBINTENT_TO_ARCHETYPE,
  ARCHETYPE_TO_MINDSET,
  PERSONA_ARCHETYPE_LABELS,
  PERSONA_TRAIT_LABELS,
} from "../types";

// ═══════════════════════════════════════════════════════════════
// 메인 빌더 함수
// ═══════════════════════════════════════════════════════════════

/**
 * IntentCluster[] → PersonaProfile[] 추론
 */
export function buildPersonaProfiles(
  clusters: IntentCluster[],
  seedKeyword: string,
  maxPersonas: number = 6,
): {
  personas: PersonaProfile[];
  personaClusterLinks: PersonaClusterLink[];
  personaJourneyLinks: PersonaJourneyLink[];
} {
  if (clusters.length === 0) {
    return { personas: [], personaClusterLinks: [], personaJourneyLinks: [] };
  }

  // 1. 클러스터를 archetype별로 그룹핑
  const archetypeGroups = groupClustersByArchetype(clusters);

  // 2. 각 그룹에서 페르소나 생성
  const personas: PersonaProfile[] = [];
  let totalKeywords = 0;
  for (const cluster of clusters) {
    totalKeywords += cluster.memberCount;
  }

  let personaIndex = 0;
  for (const [archetype, groupClusters] of archetypeGroups) {
    if (personas.length >= maxPersonas) break;

    const persona = buildSinglePersona(
      archetype,
      groupClusters,
      seedKeyword,
      totalKeywords,
      personaIndex,
    );
    personas.push(persona);
    personaIndex++;
  }

  // 3. PersonaClusterLink 생성
  const personaClusterLinks = buildPersonaClusterLinks(personas, clusters);

  // 4. PersonaJourneyLink 생성
  const personaJourneyLinks = buildPersonaJourneyLinks(personas, clusters);

  // 비중 기준 내림차순 정렬
  personas.sort((a, b) => b.percentage - a.percentage);

  return { personas, personaClusterLinks, personaJourneyLinks };
}

// ═══════════════════════════════════════════════════════════════
// 클러스터 → Archetype 그룹핑
// ═══════════════════════════════════════════════════════════════

function groupClustersByArchetype(
  clusters: IntentCluster[],
): Map<PersonaArchetype, IntentCluster[]> {
  const groups = new Map<PersonaArchetype, IntentCluster[]>();

  for (const cluster of clusters) {
    const archetype = inferArchetypeFromCluster(cluster);
    if (!groups.has(archetype)) groups.set(archetype, []);
    groups.get(archetype)!.push(cluster);
  }

  // 크기 순 정렬 (큰 그룹 우선)
  const sorted = new Map(
    [...groups.entries()].sort(
      (a, b) =>
        b[1].reduce((s, c) => s + c.memberCount, 0) -
        a[1].reduce((s, c) => s + c.memberCount, 0),
    ),
  );

  return sorted;
}

/**
 * 클러스터에서 archetype 추론
 *
 * 우선순위:
 * 1. subIntent 기반 (가장 정밀)
 * 2. 클러스터 카테고리 기반
 * 3. 키워드 패턴 기반
 * 4. intent 기본 매핑
 */
function inferArchetypeFromCluster(cluster: IntentCluster): PersonaArchetype {
  // 1. topSubIntent 기반
  if (cluster.metadata.topSubIntents.length > 0) {
    const topSub = cluster.metadata.topSubIntents[0]!.subIntent;
    if (SUBINTENT_TO_ARCHETYPE[topSub]) {
      return SUBINTENT_TO_ARCHETYPE[topSub]!;
    }
  }

  // 2. 클러스터 카테고리 기반
  const categoryMap: Record<string, PersonaArchetype> = {
    exploratory: "information_seeker",
    comparative: "price_comparator",
    price_sensitive: "price_comparator",
    problem_solving: "problem_solver",
    recommendation: "recommendation_seeker",
    action_oriented: "action_taker",
    experience: "experience_sharer",
  };
  if (categoryMap[cluster.category]) {
    return categoryMap[cluster.category]!;
  }

  // 3. 키워드 패턴 기반
  const keywords = cluster.allKeywords.join(" ").toLowerCase();
  if (/트렌드|동향|최신|인기/.test(keywords)) return "trend_follower";
  if (/후기|리뷰|경험|사용기/.test(keywords)) return "review_validator";
  if (/추천|순위|best|top/.test(keywords)) return "recommendation_seeker";
  if (/가격|비용|비교|vs/.test(keywords)) return "price_comparator";
  if (/에러|오류|문제|해결/.test(keywords)) return "problem_solver";
  if (/구매|주문|신청|가입/.test(keywords)) return "action_taker";

  // 4. intent 기본 매핑
  return INTENT_TO_ARCHETYPE[cluster.dominantIntent] ?? "information_seeker";
}

// ═══════════════════════════════════════════════════════════════
// 단일 페르소나 빌드
// ═══════════════════════════════════════════════════════════════

function buildSinglePersona(
  archetype: PersonaArchetype,
  groupClusters: IntentCluster[],
  seedKeyword: string,
  totalKeywords: number,
  index: number,
): PersonaProfile {
  // 집계
  const allKeywords = groupClusters.flatMap((c) => c.representativeKeywords);
  const allQuestions = groupClusters.flatMap((c) => c.representativeQuestions);
  const allThemes = [...new Set(groupClusters.flatMap((c) => c.themes))];
  const clusterKeywordCount = groupClusters.reduce(
    (s, c) => s + c.memberCount,
    0,
  );

  // dominant 값
  const intentCounts = new Map<IntentCategory, number>();
  const phaseCounts = new Map<TemporalPhase, number>();
  const stageCounts = new Map<RoadStageType, number>();

  for (const cluster of groupClusters) {
    for (const [intent, count] of Object.entries(cluster.metadata.intentDistribution)) {
      intentCounts.set(
        intent as IntentCategory,
        (intentCounts.get(intent as IntentCategory) || 0) + count,
      );
    }
    for (const [phase, count] of Object.entries(cluster.metadata.phaseDistribution)) {
      phaseCounts.set(
        phase as TemporalPhase,
        (phaseCounts.get(phase as TemporalPhase) || 0) + count,
      );
    }
    for (const [stage, count] of Object.entries(cluster.metadata.stageDistribution)) {
      stageCounts.set(
        stage as RoadStageType,
        (stageCounts.get(stage as RoadStageType) || 0) + (count as number),
      );
    }
  }

  const dominantIntent = getMaxFromMap(intentCounts) as IntentCategory ?? "discovery";
  const dominantPhase = getMaxFromMap(phaseCounts) as TemporalPhase ?? "current";
  const dominantStage = getMaxFromMap(stageCounts) as RoadStageType ?? "interest";

  // mindset 추론
  const mindset = ARCHETYPE_TO_MINDSET[archetype];

  // traits 계산
  const traits = calculateTraits(archetype, groupClusters, dominantIntent);

  // 메타데이터
  const avgGapScore =
    Math.round(
      (groupClusters.reduce((s, c) => s + c.avgGapScore, 0) /
        groupClusters.length) *
        100,
    ) / 100;
  const avgSearchVolume = Math.round(
    groupClusters.reduce((s, c) => s + c.avgSearchVolume, 0) /
      groupClusters.length,
  );

  // 비중
  const percentage =
    totalKeywords > 0
      ? Math.round((clusterKeywordCount / totalKeywords) * 100)
      : 0;

  // 콘텐츠 전략 & 메시지 각도
  const contentStrategy = generateContentStrategy(archetype, seedKeyword, allThemes);
  const messagingAngle = generateMessagingAngle(archetype, seedKeyword, mindset);

  // 라벨
  const label = PERSONA_ARCHETYPE_LABELS[archetype].label;

  return {
    id: `persona-${index}`,
    label,
    description: generatePersonaDescription(archetype, seedKeyword, dominantPhase),
    archetype,
    mindset,
    dominantIntent,
    dominantPhase,
    dominantStage,
    dominantTopics: allThemes.slice(0, 5),
    typicalQuestions: deduplicateAndSlice(allQuestions, 5),
    representativeKeywords: deduplicateAndSlice(allKeywords, 15),
    likelyStage: dominantStage,
    traits,
    relatedClusterIds: groupClusters.map((c) => c.id),
    contentStrategy,
    messagingAngle,
    percentage,
    confidence: calculateConfidence(groupClusters, clusterKeywordCount),
    summary: generatePersonaSummary(
      archetype,
      seedKeyword,
      dominantIntent,
      dominantPhase,
      allThemes,
      allQuestions,
    ),
    metadata: {
      sourceClusterCount: groupClusters.length,
      totalKeywordCount: clusterKeywordCount,
      avgGapScore,
      avgSearchVolume,
      createdAt: new Date().toISOString(),
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// 특성(Trait) 계산
// ═══════════════════════════════════════════════════════════════

function calculateTraits(
  archetype: PersonaArchetype,
  clusters: IntentCluster[],
  _dominantIntent: IntentCategory,
): PersonaTrait[] {
  // 기본 trait 템플릿 (archetype별)
  const baseTraits: Record<PersonaArchetype, Record<PersonaTraitAxis, number>> = {
    information_seeker:    { information_need: 90, comparison_tendency: 40, action_willingness: 25, problem_awareness: 30, price_sensitivity: 35, trend_interest: 55 },
    price_comparator:      { information_need: 50, comparison_tendency: 90, action_willingness: 55, problem_awareness: 35, price_sensitivity: 95, trend_interest: 40 },
    review_validator:      { information_need: 65, comparison_tendency: 75, action_willingness: 50, problem_awareness: 45, price_sensitivity: 60, trend_interest: 50 },
    problem_solver:        { information_need: 60, comparison_tendency: 30, action_willingness: 70, problem_awareness: 95, price_sensitivity: 30, trend_interest: 20 },
    recommendation_seeker: { information_need: 70, comparison_tendency: 60, action_willingness: 65, problem_awareness: 25, price_sensitivity: 50, trend_interest: 70 },
    trend_follower:        { information_need: 60, comparison_tendency: 45, action_willingness: 50, problem_awareness: 20, price_sensitivity: 40, trend_interest: 95 },
    action_taker:          { information_need: 30, comparison_tendency: 40, action_willingness: 95, problem_awareness: 25, price_sensitivity: 60, trend_interest: 35 },
    experience_sharer:     { information_need: 45, comparison_tendency: 55, action_willingness: 40, problem_awareness: 50, price_sensitivity: 45, trend_interest: 60 },
  };

  const base = baseTraits[archetype];

  // 데이터 기반 보정
  const avgGap = clusters.reduce((s, c) => s + c.avgGapScore, 0) / clusters.length;
  const avgVol = clusters.reduce((s, c) => s + c.avgSearchVolume, 0) / clusters.length;
  const risingRatio = clusters.reduce((s, c) => s + c.risingCount, 0) /
    Math.max(1, clusters.reduce((s, c) => s + c.memberCount, 0));

  const adjustedTraits: Record<PersonaTraitAxis, number> = {
    ...base,
    price_sensitivity: Math.min(100, base.price_sensitivity + (avgGap > 50 ? 10 : -5)),
    trend_interest: Math.min(100, base.trend_interest + (risingRatio > 0.3 ? 15 : 0)),
    action_willingness: Math.min(100, base.action_willingness + (avgVol > 5000 ? 10 : 0)),
  };

  return (Object.entries(adjustedTraits) as [PersonaTraitAxis, number][]).map(
    ([axis, value]) => ({
      axis,
      label: PERSONA_TRAIT_LABELS[axis],
      value: Math.round(Math.min(100, Math.max(0, value))),
    }),
  );
}

// ═══════════════════════════════════════════════════════════════
// PersonaClusterLink / PersonaJourneyLink 빌드
// ═══════════════════════════════════════════════════════════════

function buildPersonaClusterLinks(
  personas: PersonaProfile[],
  clusters: IntentCluster[],
): PersonaClusterLink[] {
  const links: PersonaClusterLink[] = [];

  for (const persona of personas) {
    for (const cluster of clusters) {
      const sharedKeywords = persona.representativeKeywords.filter((kw) =>
        cluster.allKeywords.includes(kw),
      );
      const intentMatch = persona.dominantIntent === cluster.dominantIntent;
      const phaseMatch = persona.dominantPhase === cluster.dominantPhase;

      // 관련성 점수: 키워드 중복 + intent 매칭 + phase 매칭
      let relevance = sharedKeywords.length / Math.max(1, persona.representativeKeywords.length);
      if (intentMatch) relevance += 0.3;
      if (phaseMatch) relevance += 0.2;
      relevance = Math.min(1.0, relevance);

      if (relevance > 0.1 || persona.relatedClusterIds.includes(cluster.id)) {
        links.push({
          personaId: persona.id,
          clusterId: cluster.id,
          relevanceScore: Math.round(relevance * 1000) / 1000,
          sharedKeywordCount: sharedKeywords.length,
          sharedIntentMatch: intentMatch,
          sharedPhaseMatch: phaseMatch,
        });
      }
    }
  }

  return links;
}

function buildPersonaJourneyLinks(
  personas: PersonaProfile[],
  clusters: IntentCluster[],
): PersonaJourneyLink[] {
  const links: PersonaJourneyLink[] = [];
  const stages: RoadStageType[] = [
    "awareness", "interest", "comparison", "decision", "action", "advocacy",
  ];

  for (const persona of personas) {
    // 페르소나에 연결된 클러스터의 스테이지 분포 수집
    const relatedClusters = clusters.filter((c) =>
      persona.relatedClusterIds.includes(c.id),
    );

    const stageKeywordCount: Partial<Record<RoadStageType, number>> = {};
    for (const cluster of relatedClusters) {
      for (const [stage, count] of Object.entries(cluster.metadata.stageDistribution)) {
        stageKeywordCount[stage as RoadStageType] =
          (stageKeywordCount[stage as RoadStageType] || 0) + (count as number);
      }
    }

    const totalKw = Object.values(stageKeywordCount).reduce((s, v) => s + v, 0);

    for (const stage of stages) {
      const count = stageKeywordCount[stage] || 0;
      if (count === 0) continue;

      links.push({
        personaId: persona.id,
        stage,
        relevanceScore: totalKw > 0 ? Math.round((count / totalKw) * 1000) / 1000 : 0,
        keywordCount: count,
        dominantIntent: persona.dominantIntent,
      });
    }
  }

  return links;
}

// ═══════════════════════════════════════════════════════════════
// 텍스트 생성 함수
// ═══════════════════════════════════════════════════════════════

function generatePersonaDescription(
  archetype: PersonaArchetype,
  seedKeyword: string,
  phase: TemporalPhase,
): string {
  const phaseLabels: Record<TemporalPhase, string> = {
    before: "사전 탐색",
    current: "현재 검색",
    after: "사후 검색",
  };
  const desc: Record<PersonaArchetype, string> = {
    information_seeker: `${seedKeyword}에 대해 기초 정보를 수집하고 이해하려는 ${phaseLabels[phase]} 단계의 사용자`,
    price_comparator: `${seedKeyword} 관련 가격과 조건을 꼼꼼히 비교하는 신중한 사용자`,
    review_validator: `${seedKeyword}의 실사용 후기와 평가를 검증하며 확인하는 사용자`,
    problem_solver: `${seedKeyword} 사용 중 발생한 문제를 긴급히 해결하려는 사용자`,
    recommendation_seeker: `${seedKeyword} 관련 추천과 순위를 탐색하며 확신을 얻으려는 사용자`,
    trend_follower: `${seedKeyword}의 최신 트렌드와 인기 동향을 추적하는 사용자`,
    action_taker: `${seedKeyword} 관련 구매/가입 등 즉각적인 행동을 원하는 사용자`,
    experience_sharer: `${seedKeyword} 사용 경험을 찾거나 공유하려는 사용자`,
  };
  return desc[archetype];
}

function generateContentStrategy(
  archetype: PersonaArchetype,
  seedKeyword: string,
  themes: string[],
): string {
  const strategies: Record<PersonaArchetype, string> = {
    information_seeker: "초보자 가이드, 개념 설명 콘텐츠, FAQ 시리즈, 인포그래픽",
    price_comparator: "가격 비교표, VS 콘텐츠, 가성비 가이드, 할인 정보 알림",
    review_validator: "실사용 리뷰, 장단점 분석, 별점 비교, 사용자 인터뷰",
    problem_solver: "문제 해결 가이드, 트러블슈팅 FAQ, 스텝바이스텝 튜토리얼",
    recommendation_seeker: "추천 리스트, 전문가 픽, 상황별 추천, 랭킹 콘텐츠",
    trend_follower: "트렌드 리포트, 최신 뉴스 브리핑, 인기 아이템 소개",
    action_taker: "구매 가이드, 빠른 비교, 프로모션 안내, CTA 중심 랜딩",
    experience_sharer: "사용기 모음, 경험 공유 포럼, 성공/실패 사례, 팁 공유",
  };
  const themeStr = themes.length > 0 ? ` (주제: ${themes.slice(0, 3).join(", ")})` : "";
  return strategies[archetype] + themeStr;
}

function generateMessagingAngle(
  archetype: PersonaArchetype,
  seedKeyword: string,
  _mindset: PersonaMindset,
): string {
  const angles: Record<PersonaArchetype, string> = {
    information_seeker: `"${seedKeyword}, 처음이라면 이것부터 알아보세요" — 진입 장벽을 낮추는 친절한 안내`,
    price_comparator: `"${seedKeyword} 가격 비교, 합리적 선택을 도와드립니다" — 객관적 데이터 기반 비교`,
    review_validator: `"${seedKeyword} 실사용자가 말하는 진짜 후기" — 신뢰할 수 있는 검증된 정보`,
    problem_solver: `"${seedKeyword} 문제, 5분 안에 해결하세요" — 빠르고 정확한 해결책`,
    recommendation_seeker: `"전문가가 추천하는 ${seedKeyword} TOP 5" — 선택을 확신시키는 추천`,
    trend_follower: `"지금 뜨는 ${seedKeyword} 트렌드" — 최신 정보로 앞서가기`,
    action_taker: `"${seedKeyword}, 지금 바로 시작하세요" — 즉각 행동을 유도하는 명확한 CTA`,
    experience_sharer: `"${seedKeyword} 경험담, 먼저 해본 사람들의 이야기" — 공감과 연대`,
  };
  return angles[archetype];
}

function generatePersonaSummary(
  archetype: PersonaArchetype,
  seedKeyword: string,
  dominantIntent: IntentCategory,
  dominantPhase: TemporalPhase,
  themes: string[],
  questions: string[],
): string {
  const archetypeLabel = PERSONA_ARCHETYPE_LABELS[archetype].label;
  const themeStr = themes.slice(0, 3).join(", ");
  const questionStr = questions.slice(0, 2).map((q) => `"${q}"`).join(", ");

  return (
    `${archetypeLabel} 페르소나는 ${seedKeyword} 관련하여 ` +
    `주로 ${themeStr} 주제에 관심을 가지며, ` +
    (questionStr ? `${questionStr} 등의 질문을 가지고 있습니다. ` : "") +
    `마케팅 전략 수립 시 이 그룹의 핵심 니즈에 맞춘 콘텐츠를 우선 제작하는 것을 권장합니다.`
  );
}

// ═══════════════════════════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════════════════════════

function getMaxFromMap<K, V extends number>(map: Map<K, V>): K | undefined {
  if (map.size === 0) return undefined;
  return [...map.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

function deduplicateAndSlice(arr: string[], maxLen: number): string[] {
  return [...new Set(arr)].slice(0, maxLen);
}

function calculateConfidence(
  clusters: IntentCluster[],
  totalKeywords: number,
): number {
  // 신뢰도: 클러스터 수가 많고, 키워드가 많을수록 높음
  const clusterFactor = Math.min(1.0, clusters.length / 3);
  const keywordFactor = Math.min(1.0, totalKeywords / 20);
  return Math.round((clusterFactor * 0.4 + keywordFactor * 0.6) * 100) / 100;
}
