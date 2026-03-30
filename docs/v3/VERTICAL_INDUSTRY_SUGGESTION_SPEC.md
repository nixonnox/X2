# Vertical Industry Suggestion Spec

> 업종 자동 감지 규칙, 점수화 방식, confidence 처리

## 1. 입력

```typescript
type SuggestionInput = {
  seedKeyword: string;        // 필수: 시드 키워드
  clusterTopics?: string[];   // 선택: 클러스터 주제
  category?: string;          // 선택: 카테고리
  relatedKeywords?: string[]; // 선택: 관련 키워드
};
```

## 2. 시그널 소스 (3종)

### 2.1 KEYWORD — seedKeyword/relatedKeywords 매칭

| 조건 | weight |
|------|--------|
| 정확히 일치 (`keyword === dictEntry`) | 1.0 |
| 부분 포함 (`keyword.includes(entry)` or vice versa) | 0.7 |
| relatedKeywords 매칭 | 0.5 × 위 기준 |

업종별 키워드 사전 (발췌):
- **BEAUTY**: 화장품, 스킨케어, 세럼, 레티놀, 콜라겐, 비타민C, 피부타입 등 (32개)
- **FNB**: 맛집, 카페, 메뉴, 배달, 프랜차이즈, 밀키트, 레시피 등 (34개)
- **FINANCE**: 금융, 대출, 금리, 적금, 카드, 증권, 재테크, 수익률 등 (32개)
- **ENTERTAINMENT**: 아이돌, 드라마, 앨범, 팬덤, 컴백, OTT, 게임, 티켓 등 (31개)

### 2.2 CLUSTER — clusterTopics 매칭

| 조건 | weight |
|------|--------|
| cluster 주제가 업종 키워드 포함 | 0.6 |

### 2.3 CATEGORY — category 직접 매핑

| 조건 | weight |
|------|--------|
| 카테고리가 업종에 직접 매핑됨 | 1.5 |

매핑 예시: `cosmetics → BEAUTY`, `food → FNB`, `finance → FINANCE`, `kpop → ENTERTAINMENT`

## 3. 스코어 집계

1. 각 시그널의 weight를 업종별로 합산
2. 최대 스코어로 정규화 (0~1 범위)
3. 1위 업종 결정

## 4. 추천 결정 규칙

| 조건 | 결과 |
|------|------|
| 시그널 0개 | 추천 없음 (suggestedIndustry: null) |
| 1위 스코어 < threshold | 추천 없음 |
| 1위 - 2위 < 0.15 | 추천 없음 (확신 부족) |
| 위 모두 통과 | 1위 업종 추천 |

threshold 차등:
- 금융: **0.50** (오탐 방지 — 금융 키워드가 다른 업종에 섞일 수 있음)
- 나머지: **0.40**

## 5. 출력

```typescript
type IndustrySuggestion = {
  suggestedIndustry: IndustryType | null;
  confidence: number;          // 0~1 (정규화 스코어)
  scores: Record<IndustryType, number>;
  matchedSignals: IndustrySignal[];
  reasoning: string;           // 추천 근거 설명
};
```

## 6. Low Confidence 처리

| confidence | UI 표시 |
|-----------|---------|
| 0.7+ | 녹색 배지 — "현재 키워드 기준으로 가장 유력한 업종은 [X]입니다" |
| 0.4~0.7 | 파란 배지 — "유력하나 신뢰도가 높지 않으므로 다른 업종도 확인해 보세요" |
| 0~0.4 (또는 null) | 황색 배너 — "추천 업종의 신뢰도가 낮아 여러 업종을 함께 비교해보는 것을 권장합니다" |

## 7. 예시

| seedKeyword | 추천 | confidence | 근거 |
|------------|------|-----------|------|
| 레티놀 세럼 | BEAUTY | 1.0 | KEYWORD: 레티놀, 세럼 |
| 프로틴 음료 | FNB | 0.7 | KEYWORD: 음료 |
| 신용카드 혜택 | FINANCE | 1.0 | KEYWORD: 신용카드 |
| BTS 컴백 | ENTERTAINMENT | 1.0 | KEYWORD: 컴백 |
| 건강식품 | null | 0.35 | FNB(0.35) vs BEAUTY(0.3) — 차이 부족 |
