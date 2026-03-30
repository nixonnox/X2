/**
 * Cluster Labeler
 *
 * 클러스터에 의미 있는 라벨을 부여한다.
 * 규칙 기반(기본) + LLM 기반(선택) 두 가지 모드를 지원한다.
 *
 * 규칙 기반: 키워드 패턴, dominant intent/phase, 테마 조합으로 라벨 생성
 * LLM 기반: GPT-4o를 호출하여 자연스러운 한국어 라벨 생성
 */

import type { IntentCluster } from "../types";

// ═══════════════════════════════════════════════════════════════
// 규칙 기반 클러스터 라벨링
// ═══════════════════════════════════════════════════════════════

/**
 * 클러스터에 규칙 기반 라벨을 부여한다.
 * 이미 라벨이 있으면 보강만 수행한다.
 */
export function labelClusters(clusters: IntentCluster[]): IntentCluster[] {
  return clusters.map((cluster) => ({
    ...cluster,
    label: refineLabel(cluster),
    description: refineDescription(cluster),
  }));
}

function refineLabel(cluster: IntentCluster): string {
  const { centroid, representativeKeywords, themes } = cluster;

  // 테마가 있으면 테마 기반 라벨
  if (themes.length > 0 && themes[0] !== `${centroid} 관련 탐색`) {
    return `${centroid} ${themes[0]}`;
  }

  // 대표 키워드에서 공통 패턴 추출
  const commonSuffix = findCommonPattern(representativeKeywords);
  if (commonSuffix) {
    return `${centroid} ${commonSuffix}`;
  }

  return cluster.label;
}

function refineDescription(cluster: IntentCluster): string {
  if (cluster.description && cluster.description.length > 10) {
    return cluster.description;
  }

  const kwPreview = cluster.representativeKeywords.slice(0, 3).join(", ");
  return `"${kwPreview}" 등 ${cluster.memberCount}개 키워드로 구성된 ${cluster.category} 클러스터`;
}

/**
 * 키워드 목록에서 공통 패턴 추출
 */
function findCommonPattern(keywords: string[]): string | null {
  if (keywords.length < 2) return null;

  const patterns: [RegExp, string][] = [
    [/추천|순위|베스트/, "추천"],
    [/비교|vs|차이/, "비교"],
    [/가격|비용|요금/, "가격"],
    [/후기|리뷰|평가/, "후기"],
    [/방법|하는 법|가이드/, "방법"],
    [/에러|오류|문제/, "문제 해결"],
    [/트렌드|동향|최신/, "트렌드"],
    [/구매|주문|신청/, "구매"],
  ];

  for (const [pattern, label] of patterns) {
    const matchCount = keywords.filter((kw) => pattern.test(kw)).length;
    if (matchCount >= Math.ceil(keywords.length * 0.3)) {
      return label;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// LLM 기반 클러스터 라벨링 (GPT-4o)
// ═══════════════════════════════════════════════════════════════

/**
 * LLM을 사용하여 클러스터와 페르소나에 자연스러운 라벨을 부여한다.
 *
 * @returns LLM 결과 또는 null (API 키 없음/오류)
 */
export async function labelWithLLM(
  clusters: IntentCluster[],
  seedKeyword: string,
): Promise<{
  clusterLabels: { clusterId: string; label: string; description: string }[];
  personaSuggestions: { archetype: string; label: string; description: string }[];
} | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = buildLabelingPrompt(clusters, seedKeyword);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: LABELING_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content);
  } catch {
    return null;
  }
}

const LABELING_SYSTEM_PROMPT = `당신은 검색 의도 분석 전문가입니다.
주어진 키워드 클러스터들에 의미 있는 한국어 라벨과 설명을 부여하세요.

응답 형식 (JSON):
{
  "clusterLabels": [
    { "clusterId": "ic-0", "label": "클러스터 라벨", "description": "1줄 설명" }
  ],
  "personaSuggestions": [
    { "archetype": "information_seeker", "label": "맞춤 라벨", "description": "1줄 설명" }
  ]
}

규칙:
- 라벨은 10자 이내로 간결하게
- 설명은 30자 이내
- 마케팅 관점에서 유용한 명명
- 한국어 사용`;

function buildLabelingPrompt(
  clusters: IntentCluster[],
  seedKeyword: string,
): string {
  const clusterInfo = clusters
    .slice(0, 10)
    .map(
      (c) =>
        `- ID: ${c.id}, 카테고리: ${c.category}, 대표 키워드: ${c.representativeKeywords.slice(0, 5).join(", ")}, 질문: ${c.representativeQuestions.slice(0, 2).join(", ")}`,
    )
    .join("\n");

  return `시드 키워드: "${seedKeyword}"

클러스터 목록:
${clusterInfo}

각 클러스터에 적절한 한국어 라벨과 설명을 부여하고,
각 클러스터를 검색하는 사용자 유형(페르소나)도 제안해주세요.`;
}

// ═══════════════════════════════════════════════════════════════
// 페르소나 라벨 정제
// ═══════════════════════════════════════════════════════════════

/**
 * LLM 결과로 페르소나 라벨을 정제한다.
 */
export function applyLLMLabels(
  clusters: IntentCluster[],
  llmResult: NonNullable<Awaited<ReturnType<typeof labelWithLLM>>>,
): IntentCluster[] {
  const labelMap = new Map(
    llmResult.clusterLabels.map((l) => [l.clusterId, l]),
  );

  return clusters.map((cluster) => {
    const llmLabel = labelMap.get(cluster.id);
    if (!llmLabel) return cluster;
    return {
      ...cluster,
      label: llmLabel.label,
      description: llmLabel.description,
    };
  });
}
