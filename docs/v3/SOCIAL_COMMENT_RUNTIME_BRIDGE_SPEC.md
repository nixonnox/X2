# Social/Comment Runtime Bridge Spec

## 개요

소셜/댓글 신호가 vertical intelligence runtime에 어떻게 전달되는지를 정의한다. 프론트엔드에서 수집한 댓글/감성 데이터가 백엔드의 signal fusion 파이프라인을 거쳐 업종별 인사이트로 변환되는 전체 경로를 기술한다.

---

## 데이터 소스

### comment.sentimentStats (tRPC)

- 프로젝트별 감성 분포 통계
- 반환값: positive / neutral / negative 카운트

### comment.listByProject (tRPC)

- 프로젝트별 댓글 상세 목록
- 각 댓글 속성: `topic`, `sentiment`, `isRisk`, `isQuestion`

---

## 변환 파이프라인

### 프론트엔드

```
useCurrentProject() → projectId
→ comment.sentimentStats.useQuery() → 감성 통계
→ comment.listByProject.useQuery() → 댓글 목록
→ socialDataPayload 변환 (useMemo)
  - sentiment: {
      total,
      positive,
      neutral,
      negative,
      topNegativeTopics,
      topPositiveTopics
    }
  - commentTopics: [{
      topic,
      count,
      sentiment,
      isQuestion,
      isRisk,
      riskLevel
    }]
→ applyMutation.mutate({ socialData: socialDataPayload })
```

### 백엔드 — vertical-document.ts apply 엔드포인트

```
input.socialData
→ verticalSignalFusion.fuse({ socialData: input.socialData })
→ VerticalSocialCommentIntegrationService.integrate()
→ 업종별 evidence / insight / warning 생성
→ fusionResult.additionalEvidence / Insights / Warnings로 merge
→ generate() 입력에 포함
→ 문서 결과에 반영
```

---

## 업종별 차이

각 업종별로 소셜/댓글 데이터에서 추출하는 시그널 유형이 다르다.

### BEAUTY

| 시그널 | 설명 |
|--------|------|
| INGREDIENT_INTEREST | 성분에 대한 관심 감지 |
| 효능 질문 | 제품 효능 관련 질문 추출 |
| 트러블 경고 | 피부 트러블/부작용 관련 경고 |

### FNB

| 시그널 | 설명 |
|--------|------|
| MENU_INTEREST | 특정 메뉴에 대한 관심 감지 |
| 맛 반응 | 맛 관련 긍정/부정 반응 |
| 위생 경고 | 위생 관련 부정적 언급 경고 |

### FINANCE

| 시그널 | 설명 |
|--------|------|
| CONDITION_ANALYSIS | 금융 상품 조건 분석 |
| 신뢰 우려 | 기관/상품 신뢰도 관련 우려 |
| 사기 경고 | 사기/피싱 관련 언급 경고 |

### ENTERTAINMENT

| 시그널 | 설명 |
|--------|------|
| BUZZ_TIMING | 버즈 발생 타이밍 감지 |
| 팬덤 반응 | 팬덤 커뮤니티 반응 분석 |
| 논란 경고 | 논란/이슈 관련 언급 경고 |

---

## 미전달 시 (socialData = undefined)

`socialData`가 전달되지 않은 경우의 동작:

- Signal fusion에서 social 소스 **생략**
- `signalQuality.hasSocialData = false`
- UI에서 **"소셜/댓글 데이터 없음"** 상태로 표시
- 나머지 시그널(검색/벤치마크)만으로 분석 진행
- Intelligence 요약에서 social 관련 카드는 비활성 처리

---

## 데이터 품질 판정

감성 데이터 총 건수에 따라 품질 등급을 결정한다.

| 건수 | 등급 | 설명 |
|------|------|------|
| 50건 이상 | **HIGH** | 충분한 데이터, 높은 신뢰도 |
| 10 ~ 49건 | **MEDIUM** | 기본 분석 가능, 중간 신뢰도 |
| 1 ~ 9건 | **LOW** | 제한적 분석, 낮은 신뢰도 |
| 0건 | **NONE** | 분석 불가, 소셜 시그널 비활성 |
