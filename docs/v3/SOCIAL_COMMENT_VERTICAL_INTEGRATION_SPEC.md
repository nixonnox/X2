# Social/Comment Vertical Integration Spec

> 소셜/댓글 데이터를 업종별로 해석하여 vertical 파이프라인에 주입하는 규칙

## 1. 개요

CommentAnalysisService, ListeningAnalysisService에서 생성된
감성 분석, 토픽 분류, 소셜 멘션 데이터를 업종별로 다르게 해석.

## 2. 입력

```typescript
type SocialCommentData = {
  sentiment?: {
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    topNegativeTopics: string[];
    topPositiveTopics: string[];
  };
  commentTopics?: {
    topic: string;
    count: number;
    sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
    isQuestion: boolean;
    isRisk: boolean;
    riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }[];
  recentMentions?: {
    platform: string;
    text: string;
    sentiment: string;
    topics: string[];
    engagementRate: number;
    publishedAt: string;
  }[];
};
```

## 3. 업종별 해석 규칙

### 3.1 크리티컬 부정 토픽

| 업종 | 크리티컬 키워드 | 해석 |
|------|---------------|------|
| BEAUTY | 트러블, 자극, 부작용, 알레르기, 발진 | 성분 안전성 커뮤니케이션 필요 |
| FNB | 위생, 식중독, 이물질, 벌레, 곰팡이 | 식품 안전 이슈 대응 필요 |
| FINANCE | 사기, 피해, 손실, 불완전판매, 연체 | 신뢰도/투명성 강화 대응 필요 |
| ENTERTAINMENT | 논란, 비매너, 취소, 환불, 사재기 | 위기 대응 커뮤니케이션 필요 |

### 3.2 리스크 에스컬레이션 키워드

크리티컬 토픽과 에스컬레이션 키워드가 동시에 감지되면 → WARNING → CRITICAL 상향.

| 업종 | 에스컬레이션 키워드 |
|------|------------------|
| BEAUTY | 부작용, 알레르기, 소비자원, 리콜, 유해성분 |
| FNB | 식중독, 위생, 식품안전, 벌점, 영업정지 |
| FINANCE | 사기, 불완전판매, 금감원, 소비자보호, 민원 |
| ENTERTAINMENT | 논란, 해체, 탈퇴, 고소, 폭로, 학폭 |

### 3.3 감성 프레이밍

각 업종별로 긍정/부정/중립에 대한 해석 템플릿이 다름:

**BEAUTY**: 성분/효능 맥락 강조
**FNB**: 메뉴/프로모션 맥락 강조
**FINANCE**: 신뢰/정보제공 맥락 강조
**ENTERTAINMENT**: 타이밍/확산 맥락 강조

## 4. 출력

```typescript
type VerticalSocialIntegrationResult = {
  industryType: IndustryType;
  evidenceItems: SocialEvidenceItem[];  // vertical evidence에 추가
  insights: SocialInsight[];            // vertical insight에 추가
  warnings: SocialWarning[];            // vertical warning에 추가
  hasSocialData: boolean;
  socialDataQuality: "HIGH" | "MEDIUM" | "LOW" | "NONE";
};
```

## 5. 데이터 품질 판정

| 조건 | 점수 |
|------|------|
| 감성 분석 50건 이상 | +2 |
| 감성 분석 10~49건 | +1 |
| 토픽 5개 이상 | +2 |
| 토픽 2~4개 | +1 |
| 멘션 20개 이상 | +2 |
| 멘션 5~19개 | +1 |
| **합계 5+** → HIGH | **합계 2~4** → MEDIUM | **합계 0~1** → LOW |

## 6. 인사이트 유형 매핑

소셜/댓글에서 발견된 패턴이 업종별로 다른 인사이트 타입으로 변환됨:

| 패턴 | BEAUTY | FNB | FINANCE | ENTERTAINMENT |
|------|--------|-----|---------|--------------|
| 긍정 트렌드 | INGREDIENT_INTEREST | MENU_INTEREST | CONDITION_ANALYSIS | BUZZ_TIMING |
| 부정 트렌드 | SKIN_CONCERN | VISIT_INTENT | RISK_AWARENESS | FAN_REACTION |
| 질문형 | COMPARISON_INTENT | LOCATION_CONTEXT | PROCEDURE_INTEREST | CONTENT_SPREAD |
| 리스크 | REVIEW_PATTERN | SEASONAL_PATTERN | TRUST_SIGNAL | ENGAGEMENT_PATTERN |

## 7. 기존 서비스와의 관계

| 기존 서비스 | 관계 |
|-----------|------|
| CommentAnalysisService | 입력 소스 (sentiment, topics, risk) |
| ListeningAnalysisService | 입력 소스 (mentions, engagement) |
| FAQService | 질문형 댓글은 FAQ 인사이트로 변환 |
| RiskSignalService | 리스크 토픽은 업종별 에스컬레이션 적용 |
