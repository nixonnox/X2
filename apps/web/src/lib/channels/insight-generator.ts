import type {
  PlatformCode,
  ChannelSnapshot,
  RiskSignal,
  RecommendedAction,
} from "./types";

// ============================================
// Risk Signal Generator
// TODO: 실데이터 연결 - Anthropic AI 분석 또는 실제 KPI 변화 기반 판단으로 교체
// ============================================

export function generateRiskSignals(
  platformCode: PlatformCode,
  snapshot: ChannelSnapshot | undefined,
): RiskSignal[] {
  if (!snapshot) return [];

  // 실데이터가 없는 경우 (모든 지표가 0이면 수집 전 상태)
  const hasRealData =
    (snapshot.audienceCount ?? 0) > 0 ||
    (snapshot.totalContents ?? 0) > 0 ||
    (snapshot.totalViewsOrReach ?? 0) > 0;

  if (!hasRealData) {
    console.warn(
      "[INSIGHT] generateRiskSignals - 실데이터 없음, 수집 안내 표시",
    );
    return [
      {
        id: "no-data",
        title: "데이터 수집이 필요해요",
        description:
          "채널 데이터가 아직 수집되지 않았어요. 플랫폼 API를 연동하면 실제 성과 기반 분석이 시작돼요.",
        severity: "low",
      },
    ];
  }

  const signals: RiskSignal[] = [];

  // 실데이터 기반 규칙 (값이 존재할 때만 판단)
  if (snapshot.growthRate30d != null && snapshot.growthRate30d < 2) {
    signals.push({
      id: "low-growth",
      title: "팔로워 성장 둔화",
      description: `최근 30일간 성장률이 ${snapshot.growthRate30d.toFixed(1)}%로, 건강한 기준인 3-5%에 미치지 못해요. 콘텐츠 전략을 검토해 보세요.`,
      severity: snapshot.growthRate30d < 0 ? "high" : "medium",
      metric: `${snapshot.growthRate30d.toFixed(1)}% / 30일`,
    });
  }

  if (snapshot.engagementRate != null && snapshot.engagementRate < 3) {
    signals.push({
      id: "low-engagement",
      title: "평균 이하 참여율",
      description: `참여율 ${snapshot.engagementRate.toFixed(1)}%로 플랫폼 평균 이하예요. 콘텐츠가 시청자에게 공감을 얻지 못하고 있을 수 있어요.`,
      severity: snapshot.engagementRate < 1.5 ? "high" : "medium",
      metric: `${snapshot.engagementRate.toFixed(1)}%`,
    });
  }

  if (snapshot.uploads30d != null) {
    const lowUploadThreshold = platformCode === "x" ? 30 : 8;
    if (snapshot.uploads30d < lowUploadThreshold) {
      signals.push({
        id: "low-uploads",
        title: "게시 빈도 감소",
        description: `최근 30일간 ${snapshot.uploads30d}개의 게시물만 업로드됐어요. 불규칙한 게시는 알고리즘 노출과 시청자 유지율을 낮출 수 있어요.`,
        severity:
          snapshot.uploads30d < lowUploadThreshold / 2 ? "high" : "medium",
        metric: `${snapshot.uploads30d} / 30일`,
      });
    }
  }

  if (
    platformCode === "youtube" &&
    (snapshot.uploads30d ?? 0) > 0 &&
    (snapshot.totalViewsOrReach ?? 0) > 0
  ) {
    const viewsPerUpload =
      (snapshot.totalViewsOrReach ?? 0) /
      Math.max(snapshot.totalContents ?? 1, 1);
    if (viewsPerUpload < 1000) {
      signals.push({
        id: "low-views-per-video",
        title: "영상당 평균 조회수 낮음",
        description:
          "영상당 평균 조회수가 1,000회 미만이에요. 썸네일, 제목, 콘텐츠 주제를 최적화하여 노출을 개선해 보세요.",
        severity: "medium",
        metric: `평균 ${Math.round(viewsPerUpload)}회`,
      });
    }
  }

  if (
    platformCode === "tiktok" &&
    snapshot.engagementRate != null &&
    snapshot.engagementRate > 0 &&
    snapshot.engagementRate < 5
  ) {
    signals.push({
      id: "tiktok-engagement-drop",
      title: "TikTok 참여율이 플랫폼 평균 이하",
      description:
        "TikTok은 일반적으로 5-10%의 높은 참여율을 보여요. 콘텐츠에 더 강한 후킹과 트렌딩 오디오가 필요할 수 있어요.",
      severity: "medium",
      metric: `${snapshot.engagementRate!.toFixed(1)}%`,
    });
  }

  if (signals.length === 0) {
    signals.push({
      id: "all-clear",
      title: "심각한 문제 없음",
      description:
        "모든 주요 지표가 건강한 범위 내에 있어요. 변화가 있는지 계속 모니터링하세요.",
      severity: "low",
    });
  }

  return signals.slice(0, 3);
}

// ============================================
// Recommended Action Generator
// TODO: 실데이터 연결 - Anthropic AI 분석으로 KPI 변화 기반 맞춤 추천 생성
// ============================================

export function generateRecommendedActions(
  platformCode: PlatformCode,
  snapshot: ChannelSnapshot | undefined,
): RecommendedAction[] {
  if (!snapshot) return [];

  // 실데이터가 없는 경우 (모든 지표가 0이면 수집 전 상태)
  const hasRealData =
    (snapshot.audienceCount ?? 0) > 0 ||
    (snapshot.totalContents ?? 0) > 0 ||
    (snapshot.totalViewsOrReach ?? 0) > 0;

  if (!hasRealData) {
    console.warn(
      "[INSIGHT] generateRecommendedActions - 실데이터 없음, 수집 안내 표시",
    );
    return [
      {
        id: "connect-api",
        title: "플랫폼 API를 연동해 보세요",
        description:
          "API를 연동하면 실제 성과 데이터를 기반으로 맞춤 액션을 추천받을 수 있어요.",
        priority: "high",
        category: "strategy",
      },
    ];
  }

  const actions: RecommendedAction[] = [];

  // 실데이터 기반 추천 (값이 존재할 때만)
  if (snapshot.growthRate30d != null && snapshot.growthRate30d < 5) {
    actions.push({
      id: "boost-growth",
      title: "콘텐츠 게시 빈도 높이기",
      description:
        "게시 빈도를 높이면 알고리즘 배포와 신규 시청자 유입이 개선돼요. 주 3-4회 이상 게시를 목표로 하세요.",
      priority: "high",
      category: "growth",
    });
  }

  if (snapshot.engagementRate != null && snapshot.engagementRate < 4) {
    actions.push({
      id: "boost-engagement",
      title: "시청자 소통 강화",
      description:
        "명확한 CTA를 추가하고, 캡션에 질문을 넣고, 첫 1시간 이내에 댓글에 답변하여 참여도를 높이세요.",
      priority: "high",
      category: "engagement",
    });
  }

  const platformActions = PLATFORM_ACTIONS[platformCode];
  if (platformActions) {
    actions.push(...platformActions);
  }

  if ((snapshot.uploads30d ?? 0) > 15 && (snapshot.engagementRate ?? 0) > 5) {
    actions.push({
      id: "repurpose-top",
      title: "인기 콘텐츠 재활용",
      description:
        "인기 콘텐츠를 다른 플랫폼에 맞게 변환해 보세요. 크로스 포스팅은 최소한의 추가 노력으로 전체 도달률을 높여요.",
      priority: "medium",
      category: "strategy",
    });
  }

  return actions.slice(0, 3);
}

const PLATFORM_ACTIONS: Partial<Record<PlatformCode, RecommendedAction[]>> = {
  youtube: [
    {
      id: "yt-shorts",
      title: "쇼츠 전략 확대",
      description:
        "YouTube 쇼츠는 긴 영상보다 신규 구독자 발견율이 3-5배 높습니다. 쇼츠 비율 40-50%를 목표로 하세요.",
      priority: "medium",
      category: "content",
    },
  ],
  instagram: [
    {
      id: "ig-reels",
      title: "정적 게시물보다 릴스 우선",
      description:
        "릴스는 정적 게시물보다 도달률이 2배 높습니다. 최대 성장을 위해 콘텐츠 비율을 릴스 60%로 조정하세요.",
      priority: "medium",
      category: "content",
    },
  ],
  tiktok: [
    {
      id: "tt-trends",
      title: "트렌딩 사운드 & 포맷 활용",
      description:
        "트렌딩 오디오를 사용한 영상은 배포율이 30% 더 높습니다. 현재 트렌드는 탐색 페이지에서 확인하세요.",
      priority: "medium",
      category: "content",
    },
  ],
  x: [
    {
      id: "x-threads",
      title: "스레드 콘텐츠 늘리기",
      description:
        "긴 형식의 스레드는 단일 게시물보다 참여도가 3배 높습니다. 심층 분석에 스레드를 활용하세요.",
      priority: "medium",
      category: "content",
    },
  ],
};
