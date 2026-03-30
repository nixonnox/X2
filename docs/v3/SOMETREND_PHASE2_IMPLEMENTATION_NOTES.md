# Sometrend Phase 2 Implementation Notes

> Date: 2026-03-16

## 새로 만든 파일

| 파일 | 역할 |
|------|------|
| `components/intelligence/RelatedKeywordMap.tsx` | 연관어 맵 (감성별 색상 + 크기 비례) |
| `components/intelligence/ExportButton.tsx` | CSV 다운로드 버튼 (UTF-8 BOM) |

## 수정한 파일

| 파일 | 변경 |
|------|------|
| `intelligence.ts` router | 2개 endpoint 추가: `relatedKeywords`, `exportData` |
| `intelligence/page.tsx` | 2개 컴포넌트 import + query + 트렌드 탭에 연결 |

## 새 tRPC Endpoints

### relatedKeywords
- **입력:** projectId, keyword, days
- **데이터:** rawSocialMention.topics + intelligenceAnalysisRun.taxonomyMapping
- **출력:** `{ nodes: [{ word, count, sentiment, positive, negative }], centerKeyword }`
- **최대 30개 노드**, count 기준 정렬

### exportData
- **입력:** projectId, keyword, type, days
- **지원 타입:** mention_trend, channel_trend, youtube_summary, benchmark_trend
- **출력:** `{ csv: string, filename: string, rowCount: number }`
- **CSV:** UTF-8 BOM 포함 (엑셀 한국어 호환)

## 연관어 데이터 소스

```
1차: rawSocialMention.topics[] — 멘션에서 추출된 토픽
2차: intelligenceAnalysisRun.taxonomyMapping — 분석 결과의 카테고리
→ 합쳐서 count + sentiment 집계
→ 상위 30개 노드
```

## Export 파일 규칙

| 타입 | 파일명 | 헤더 |
|------|--------|------|
| mention_trend | `{keyword}_소셜반응추이_{days}일.csv` | 날짜,전체,긍정,중립,부정,미분류,반응수준 |
| channel_trend | `{keyword}_채널별추이_{days}일.csv` | 날짜,채널,감성 |
| youtube_summary | `{keyword}_YouTube분석_{days}일.csv` | 날짜,내용,작성자,조회수,좋아요,댓글수,감성 |
| benchmark_trend | `{keyword}_기준비교추이_{days}일.csv` | 날짜,전체점수 |
