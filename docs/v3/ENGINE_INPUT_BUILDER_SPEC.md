# Engine Input Builder Spec

> Pathfinder / RoadView / Persona / Cluster input builder 상세 구조

## 1. 공통 원칙

1. **입력**: `NormalizedSearchAnalyticsPayload` (유일한 입력 소스)
2. **출력**: 엔진별 `XxxRequest` + `quality` 메타데이터
3. **source-specific 로직 금지**: 빌더는 payload의 정규화된 필드만 사용
4. **confidence 계산**: 각 빌더가 입력 품질을 0-1로 평가
5. **warnings 수집**: 부족한 데이터에 대한 경고를 수집
6. **mock 투명**: mock 데이터든 실데이터든 동일한 빌더 경로

## 2. buildPathfinderInput

### 입력

| 필드 | 소스 | 필수 | 용도 |
|------|------|------|------|
| `payload.seedKeyword` | - | ✅ | 시드 노드 |
| `payload.relatedKeywords` | Autocomplete, Naver, SerpAPI, DFS | ✅ | 그래프 노드 |
| `payload.serpDocuments` | SerpAPI, DFS | 선택 | SERP overlap 기반 엣지 |
| `payload.trendSeries` | Trends, DataLab | 선택 | 트렌드 노드 식별 |
| `payload.intentCandidates` | 파생 | 선택 | 의도 분류 힌트 |

### 출력

```typescript
{
  request: PathfinderRequest;
  quality: {
    totalRelatedKeywords: number;
    hasSerpData: boolean;
    hasTrendData: boolean;
    hasQuestionKeywords: boolean;
    confidence: number;         // 0-1
    warnings: string[];
  };
}
```

### Confidence 계산

| 조건 | 점수 |
|------|------|
| 기본 (related keywords 존재) | +0.3 |
| related keywords ≥ 10 | +0.2 |
| related keywords ≥ 30 | +0.1 |
| SERP 데이터 있음 | +0.2 |
| 트렌드 데이터 있음 | +0.1 |
| 질문 키워드 ≥ 3 | +0.1 |
| **최대** | **1.0** |

## 3. buildRoadViewInput

### 입력

| 필드 | 소스 | 필수 | 용도 |
|------|------|------|------|
| `payload.seedKeyword` | - | ✅ | 시작점 |
| `payload.relatedKeywords` | 전체 | ✅ | 스테이지별 키워드 분류 |
| `options.endKeyword` | 사용자 | 선택 | A→B 경로 분석 |
| `payload.serpDocuments` | SerpAPI, DFS | 선택 | 스테이지 전환 강도 |
| `payload.trendSeries` | Trends, DataLab | 선택 | 시간 기반 흐름 |

### 스테이지 힌트 감지

| 패턴 | 매핑 스테이지 | 정규식 |
|------|-------------|--------|
| 질문형 키워드 | awareness/interest | sourceType === "question"\|"paa" |
| 비교형 키워드 | comparison | `/vs\|비교\|차이/` |
| 행동형 키워드 | decision/action | `/구매\|주문\|신청/` |

### Confidence 계산

| 조건 | 점수 |
|------|------|
| 기본 | +0.2 |
| related keywords ≥ 10 | +0.15 |
| 스테이지 힌트 ≥ 4 | +0.2 |
| SERP 데이터 있음 | +0.15 |
| 트렌드 데이터 있음 | +0.1 |
| 질문 키워드 ≥ 5 | +0.1 |
| endKeyword 지정 | +0.1 |
| **최대** | **1.0** |

## 4. buildClusterInput

### 입력

| 필드 | 소스 | 필수 | 용도 |
|------|------|------|------|
| `payload.relatedKeywords` | 전체 | ✅ | 클러스터 멤버 후보 |
| `payload.serpDocuments` | SerpAPI, DFS | 선택 | Jaccard 유사도 |
| `payload.intentCandidates` | 파생 | 선택 | 의도 기반 그룹핑 |
| `payload.trendSeries` | Trends, DataLab | 선택 | 트렌드 그룹 |

### 출력 특이사항

- `estimatedClusterCount`: 키워드 수 / minClusterSize로 예상 클러스터 수 계산
- `uniqueSourceTypes`: 다양한 소스에서 온 키워드일수록 품질 높음
- `includeQuestions`: 질문 키워드가 3개 이상이면 자동 활성화

### Confidence 계산

| 조건 | 점수 |
|------|------|
| 기본 | +0.2 |
| related keywords ≥ 15 | +0.2 |
| related keywords ≥ 40 | +0.1 |
| SERP overlap 있음 | +0.2 |
| source types ≥ 3 | +0.1 |
| 질문 키워드 ≥ 3 | +0.1 |
| LLM 사용 | +0.1 |
| **최대** | **1.0** |

## 5. buildPersonaInput

### 입력

| 필드 | 소스 | 필수 | 용도 |
|------|------|------|------|
| `payload.relatedKeywords` | 전체 | ✅ | 행동 시그널 추출 |
| `payload.serpDocuments` | SerpAPI, DFS | 선택 | PAA 질문 추출 |
| `existingClusters` | Cluster 엔진 | 선택 | 클러스터 기반 정확도 향상 |

### Archetype 힌트 감지

| 행동 패턴 | 매핑 Archetype | 감지 정규식 |
|----------|---------------|------------|
| 질문형 키워드 + PAA | information_seeker | sourceType === "question"\|"paa" |
| 비교형 키워드 | price_comparator | `/vs\|비교\|차이/` |
| 행동형 키워드 | action_taker | `/구매\|주문\|신청/` |
| 후기/리뷰 키워드 | review_validator | `/후기\|리뷰\|경험/` |
| 가격/할인 키워드 | price_comparator | `/가격\|비용\|할인/` |

### Confidence 계산

| 조건 | 점수 |
|------|------|
| 기본 | +0.15 |
| related keywords ≥ 15 | +0.15 |
| archetype hints ≥ 3 | +0.2 |
| 질문+PAA ≥ 5 | +0.1 |
| cluster 결과 재사용 | +0.2 |
| LLM 사용 | +0.1 |
| SERP 데이터 있음 | +0.1 |
| **최대** | **1.0** |

## 6. 공통 quality 구조

모든 빌더는 아래 공통 필드를 반환:

```typescript
quality: {
  confidence: number;      // 0-1 입력 품질
  warnings: string[];      // 경고 목록
  // + 엔진별 추가 필드
}
```

confidence < 0.3이면 서비스 레이어에서 `lowConfidenceReasons`에 기록.
