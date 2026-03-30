# Search Report Section Spec

> 검색 인텔리전스 결과가 리포트에 포함되는 섹션 구조

## 1. 새로운 섹션 타입

| 타입 | 제목 | 역할별 포함 | 내용 |
|------|------|------------|------|
| SEARCH_INTELLIGENCE_OVERVIEW | 검색 인텔리전스 종합 개요 | 전체 | 키워드, 엔진 성공률, 소요 시간, 품질 지표 |
| SEARCH_JOURNEY_ANALYSIS | 검색 여정 분석 | PRACTITIONER/MARKETER/ADMIN | Pathfinder + RoadView 통합 |
| SEARCH_INTENT_CLUSTERS | 검색 의도 클러스터 분석 | PRACTITIONER/MARKETER/ADMIN | 클러스터별 키워드 목록 |
| SEARCH_PERSONA_ANALYSIS | 검색자 페르소나 분석 | PRACTITIONER/MARKETER/ADMIN | 페르소나별 프로필 |
| SEARCH_DATA_QUALITY | 데이터 품질 및 신뢰도 | PRACTITIONER/ADMIN | 소스 현황, 경고, 신뢰도 |

## 2. Role별 섹션 배분

### PRACTITIONER (기술 상세)
1. SEARCH_INTELLIGENCE_OVERVIEW
2. SEARCH_JOURNEY_ANALYSIS
3. SEARCH_INTENT_CLUSTERS
4. SEARCH_PERSONA_ANALYSIS
5. SEARCH_DATA_QUALITY

### MARKETER (실행 중심)
1. SEARCH_INTELLIGENCE_OVERVIEW
2. SEARCH_JOURNEY_ANALYSIS
3. SEARCH_INTENT_CLUSTERS
4. SEARCH_PERSONA_ANALYSIS

### ADMIN (운영 + 품질)
1. SEARCH_INTELLIGENCE_OVERVIEW
2. SEARCH_JOURNEY_ANALYSIS
3. SEARCH_INTENT_CLUSTERS
4. SEARCH_PERSONA_ANALYSIS
5. SEARCH_DATA_QUALITY

### EXECUTIVE (전략 요약)
1. SEARCH_INTELLIGENCE_OVERVIEW (전략적 관점만)

## 3. 내러티브 구조

### SEARCH_INTELLIGENCE_OVERVIEW

```
"${keyword}" 키워드에 대한 검색 인텔리전스 분석이 완료되었습니다.
${engineCount}개 엔진 중 ${successCount}개가 성공적으로 실행되었으며,
전체 분석 소요 시간은 ${duration}초입니다.

데이터 수집: 연관 키워드 ${kwCount}개, SERP 데이터 ${serpStatus},
트렌드 데이터 ${trendStatus}, 질문 데이터 ${questionStatus}.
소스: ${sourceList}.

데이터 신뢰도: ${confidence}% (${level}), 신선도: ${freshnessLabel}.
```

### SEARCH_JOURNEY_ANALYSIS

```
[검색 경로 분석 (Pathfinder)]
"${keyword}"에서 출발하는 검색 여정: ${nodeCount}개 노드, ${pathCount}개 경로.
주요 허브 키워드: ${hubList}.

[사용자 여정 단계 (RoadView)]
${stageCount}단계: ${stageFlow}.
갭 단계: ${weakStageList} — 콘텐츠 보강 권장.
```

### SEARCH_INTENT_CLUSTERS

```
"${keyword}" 관련 검색어가 ${clusterCount}개 의도 클러스터로 분류됨.
• ${label1} (${count1}개 키워드): ${topMembers1}
• ${label2} (${count2}개 키워드): ${topMembers2}
...
```

### SEARCH_PERSONA_ANALYSIS

```
"${keyword}" 검색자가 ${personaCount}개 페르소나로 분류됨.
• ${name1}: ${description1}
• ${name2}: ${description2}
...
```

### SEARCH_DATA_QUALITY

```
분석 ID: ${analysisId}
엔진 버전: ${version}
신뢰도: ${confidence}% (${level})
신선도: ${freshness}
부분 데이터: ${isPartial}
Mock 전용: ${isMockOnly}

[소스 현황]
• ${source1}: ${status1} (${count1}건, ${latency1}ms)
...

[경고]
⚠️ ${warning1}
...
```

## 4. 품질 경고 표시

| 조건 | 표시 방식 |
|------|----------|
| Mock 전용 | 섹션 하단에 `⚠️ 주의: Mock 데이터 기반` 배너 |
| Stale 데이터 | 섹션 하단에 `⚠️ 24시간 경과 — 재분석 권장` |
| confidence < 0.3 | `⚠️ 낮은 신뢰도` + 이유 목록 |
| Partial data | `⚠️ 일부 소스 실패` + 플래그 목록 |

## 5. 기존 ReportType과의 통합

| ReportType | 검색 인텔리전스 섹션 포함 여부 |
|------------|------------------------------|
| WEEKLY_REPORT | ✅ 개요 + 여정 + 클러스터 |
| MONTHLY_REPORT | ✅ 전체 |
| EXECUTIVE_SUMMARY | ✅ 개요만 |
| INTENT_REPORT | ✅ 전체 |
| LISTENING_REPORT | ✅ 개요 + 여정 |
| 기타 | 선택적 포함 |
