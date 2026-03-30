# Intelligence A/B Comparison Spec

> A/B 비교 분석의 입력 모드, IntelligenceComparisonService 설계, 차이 타입 정의, 점수 산출, UI 시각화 규칙을 정리한 문서.

---

## 1. A/B 비교 입력 모드

### 1.1 비교 모드 종류

| 모드 | 설명 | Side A 입력 | Side B 입력 |
|---|---|---|---|
| `keyword_vs_keyword` | 서로 다른 키워드의 분석 결과 비교 | seedKeyword A | seedKeyword B |
| `industry_vs_industry` | 동일 키워드, 다른 산업군 기준으로 비교 | industryType A | industryType B |
| `period_vs_period` | 동일 키워드, 다른 기간의 분석 결과 비교 | period A (from~to) | period B (from~to) |

### 1.2 입력 타입

```typescript
interface ComparisonInput {
  mode: 'keyword_vs_keyword' | 'industry_vs_industry' | 'period_vs_period';
  sideA: ComparisonSideInput;
  sideB: ComparisonSideInput;
}

interface ComparisonSideInput {
  seedKeyword: string;
  industryType?: string;
  period?: { from: Date; to: Date };
}
```

---

## 2. IntelligenceComparisonService

### 2.1 개요

- 위치: `packages/api/src/services/intelligence/intelligence-comparison.service.ts`
- 역할: 두 분석 Side를 각각 실행하고, 결과 간 차이를 구조화하여 반환

### 2.2 compare() 메서드

```typescript
class IntelligenceComparisonService {
  async compare(input: ComparisonInput): Promise<ComparisonResult> {
    // 1. Side A 분석 실행
    const sideA = await this.analyzeSide(input.sideA);

    // 2. Side B 분석 실행
    const sideB = await this.analyzeSide(input.sideB);

    // 3. 차이 분석
    const keyDifferences = this.computeKeyDifferences(sideA, sideB);
    const highlightedChanges = this.extractHighlightedChanges(sideA, sideB);
    const actionDeltas = this.computeActionDeltas(sideA, sideB);
    const overallScore = this.computeOverallDifferenceScore(keyDifferences);

    return {
      sideA,
      sideB,
      keyDifferences,
      highlightedChanges,
      actionDeltas,
      overallDifferenceScore: overallScore,
    };
  }
}
```

### 2.3 의존 서비스

- SignalFusionEngine: 각 Side의 신호 융합 실행
- BenchmarkEngine: 각 Side의 벤치마크 데이터 산출
- TopicTaxonomyMapper: 토픽 분류 비교
- LiveSocialMentionBridgeService: 소셜 멘션 비교 (선택적)

---

## 3. ComparisonSide 타입

```typescript
interface ComparisonSide {
  label: string;                  // UI 표시 레이블 (예: "사이드 A: 화장품")
  seedKeyword: string;            // 분석 키워드
  industryType?: string;          // 산업군
  fusionResult: SignalFusionResult; // signal fusion 결과 전체
  metadata: ComparisonSideMetadata;
}

interface ComparisonSideMetadata {
  analyzedAt: Date;               // 분석 실행 시각
  dataSourceCount: number;        // 사용된 데이터 소스 수
  coverageRatio: number;          // 소셜 데이터 커버리지 (0.0~1.0)
  period?: { from: Date; to: Date }; // 분석 기간
  signalQuality: 'HIGH' | 'MEDIUM' | 'LOW'; // 신호 품질 등급
}
```

---

## 4. KeyDifference 타입

### 4.1 구조

```typescript
interface KeyDifference {
  category: string;               // 차이가 발생한 영역 (taxonomy, benchmark, social, signal)
  field: string;                  // 구체적 필드명
  sideAValue: string | number;    // Side A 값
  sideBValue: string | number;    // Side B 값
  level: DifferenceLevel;         // 차이 심각도
  deltaDirection: DeltaDirection; // 변화 방향
  description: string;            // 사람이 읽을 수 있는 설명
}
```

### 4.2 DifferenceLevel

```typescript
type DifferenceLevel = 'CRITICAL' | 'WARNING' | 'INFO' | 'NEUTRAL';
```

| Level | 의미 | UI 색상 |
|---|---|---|
| `CRITICAL` | 핵심 지표의 큰 차이 (전략 재검토 필요) | Red (`#EF4444`) |
| `WARNING` | 주목할 만한 차이 (모니터링 필요) | Amber (`#F59E0B`) |
| `INFO` | 참고할 만한 차이 | Blue (`#3B82F6`) |
| `NEUTRAL` | 미미한 차이 또는 동일 | Gray (`#6B7280`) |

### 4.3 DeltaDirection

```typescript
type DeltaDirection = 'UP' | 'DOWN' | 'NEW' | 'REMOVED' | 'SAME';
```

| Direction | 의미 | 아이콘 |
|---|---|---|
| `UP` | Side B가 Side A보다 높음 | `ArrowUp` |
| `DOWN` | Side B가 Side A보다 낮음 | `ArrowDown` |
| `NEW` | Side B에만 존재 | `PlusCircle` |
| `REMOVED` | Side A에만 존재 (Side B에서 사라짐) | `MinusCircle` |
| `SAME` | 값이 동일 | `Equal` |

---

## 5. HighlightedChange 타입

### 5.1 구조

```typescript
interface HighlightedChange {
  type: HighlightType;
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  relatedDifferences: KeyDifference[];
}

type HighlightType = 'taxonomy' | 'benchmark' | 'social' | 'signal' | 'warning';
```

### 5.2 각 타입별 의미

| Type | 설명 |
|---|---|
| `taxonomy` | 토픽 분류 구조의 차이 (새로운 토픽 출현, 기존 토픽 소멸 등) |
| `benchmark` | 벤치마크 기준값의 차이 (산업 평균 대비 위치 변동) |
| `social` | 소셜 멘션/감성의 차이 (BuzzLevel 변화, 감성 분포 변동) |
| `signal` | 신호 융합 결과의 차이 (신호 강도, 품질 변동) |
| `warning` | 경고 수준의 차이 (새로운 경고 출현, 기존 경고 해소) |

---

## 6. ActionDelta

### 6.1 구조

```typescript
interface ActionDelta {
  newInsights: ActionItem[];        // Side B에서 새로 발견된 인사이트
  removedInsights: ActionItem[];    // Side A에 있었으나 Side B에서 사라진 인사이트
  escalatedWarnings: ActionItem[];  // 심각도가 상승한 경고
  resolvedWarnings: ActionItem[];   // 해소된 경고
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}
```

### 6.2 ActionDelta 활용

- `newInsights`: "Side B에서 새로 발견된 기회"로 표시, 녹색 하이라이트
- `removedInsights`: "더 이상 유효하지 않은 인사이트"로 표시, 회색 처리
- `escalatedWarnings`: "주의 수준이 상승한 항목"으로 표시, 적색 강조
- `resolvedWarnings`: "해소된 경고"로 표시, 녹색 체크 표시

---

## 7. overallDifferenceScore (0–100)

### 7.1 산출 방식

전체 차이 점수는 KeyDifference 배열을 기반으로 가중 합산하여 산출한다.

```
overallDifferenceScore = Σ (difference.weight × levelScore) / maxPossibleScore × 100
```

| DifferenceLevel | levelScore |
|---|---|
| CRITICAL | 10 |
| WARNING | 5 |
| INFO | 2 |
| NEUTRAL | 0 |

### 7.2 점수 해석 기준

| 점수 범위 | 해석 | UI 표시 |
|---|---|---|
| 0–20 | 거의 동일 | 녹색 링 게이지 |
| 21–40 | 미미한 차이 | 연녹색 링 게이지 |
| 41–60 | 주목할 만한 차이 | 황색 링 게이지 |
| 61–80 | 큰 차이 | 주황색 링 게이지 |
| 81–100 | 극단적 차이 | 적색 링 게이지 |

---

## 8. UI 시각화 규칙

### 8.1 DifferenceScoreBanner

- **형태**: Ring Gauge (원형 게이지)
- **위치**: 비교 결과 페이지 최상단
- **내용**: overallDifferenceScore (0–100) 수치 + 해석 텍스트
- **색상**: 점수 범위에 따라 녹색 → 적색 그라데이션
- **보조 정보**: "N개의 핵심 차이점 발견" 텍스트

### 8.2 DifferenceCard

- **형태**: 카드 리스트
- **내용**: 각 KeyDifference를 개별 카드로 표시
- **색상**: DifferenceLevel에 따른 좌측 보더 색상
  - CRITICAL: Red 보더
  - WARNING: Amber 보더
  - INFO: Blue 보더
  - NEUTRAL: Gray 보더
- **레이아웃**: category 아이콘 | field 이름 | Side A 값 ↔ Side B 값 | deltaDirection 아이콘
- **정렬**: CRITICAL → WARNING → INFO → NEUTRAL 순서

### 8.3 HighlightCard

- **형태**: 접을 수 있는 카드 (collapsible)
- **내용**: HighlightedChange 각 항목
- **헤더**: type 아이콘 + title + impact 배지
- **본문**: description + 관련 KeyDifference 미니 리스트
- **그룹핑**: type별로 그룹화하여 표시

### 8.4 ActionDeltaPanel

- **형태**: 4분할 패널
- **레이아웃**:

| 새로운 인사이트 (newInsights) | 사라진 인사이트 (removedInsights) |
|---|---|
| **심각도 상승 경고 (escalatedWarnings)** | **해소된 경고 (resolvedWarnings)** |

- **각 셀**: ActionItem 리스트, priority 배지 포함
- **빈 셀**: "해당 항목 없음" placeholder 표시

### 8.5 Side-by-side SignalSummaryCard

- **형태**: 좌우 분할 카드
- **왼쪽**: Side A의 SignalFusionResult 요약
- **오른쪽**: Side B의 SignalFusionResult 요약
- **각 Side 표시 항목**:
  - Signal Quality 배지 (HIGH / MEDIUM / LOW)
  - 주요 신호 강도 바 차트
  - 데이터 소스 수
  - Coverage Ratio
  - 분석 시각
- **연결선**: 동일 지표 간 차이가 큰 항목에 시각적 연결선 표시 (CRITICAL/WARNING일 때)

---

## 9. 관련 문서

- [INTELLIGENCE_ROUTE_ARCHITECTURE.md](./INTELLIGENCE_ROUTE_ARCHITECTURE.md)
- [LIVE_SOCIAL_MENTION_RUNTIME_SPEC.md](./LIVE_SOCIAL_MENTION_RUNTIME_SPEC.md)
- [INTELLIGENCE_ROUTE_IMPLEMENTATION_NOTES.md](./INTELLIGENCE_ROUTE_IMPLEMENTATION_NOTES.md)
- [VERTICAL_COMPARISON_UI_SPEC.md](./VERTICAL_COMPARISON_UI_SPEC.md)
