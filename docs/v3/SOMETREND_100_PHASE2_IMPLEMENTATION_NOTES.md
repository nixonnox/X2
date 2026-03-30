# Sometrend 100% Phase 2 Implementation Notes

> Date: 2026-03-16

## 새로 만든 파일

| 파일 | 역할 |
|------|------|
| `RelatedKeywordChangePanel.tsx` | 연관어 시계열 변화 (신규/상승/하락/사라짐) |
| `SentimentTermsPanel.tsx` | 감성 연관어 (긍정/부정/중립 맥락별) |
| `AttributeAnalysisPanel.tsx` | 속성별 강점/약점 (가격/품질/디자인/서비스/기능) |

## 수정한 파일

| 파일 | 변경 |
|------|------|
| `intelligence.ts` router | 3개 endpoint: `relatedKeywordChange`, `sentimentTerms`, `attributeAnalysis` |
| `intelligence/page.tsx` | 3개 컴포넌트 + 3개 query + 트렌드 탭 배치 |

## 새 tRPC Endpoints

### relatedKeywordChange
- 기간 A(최근 7일) vs 기간 B(그 전 7일) 연관어 비교
- 분류: new / rising / declining / stable / gone
- 조건: cur==0+prev>0 → gone, prev==0+cur>0 → new, cur>prev×1.5 → rising, cur<prev×0.5 → declining

### sentimentTerms
- rawSocialMention에서 sentiment + topics 교차 집계
- 긍정 맥락 top 15 / 부정 맥락 top 15 / 중립 top 15

### attributeAnalysis
- 5가지 속성(가격/품질/디자인/서비스/기능) × 키워드 매칭
- 속성별 total/positive/negative → score (-100~+100)
- strengths (score>20) / weaknesses (score<-20) 자동 분류
- 도메인 확장: ATTRIBUTES 객체에 카테고리 추가만 하면 됨

## 트렌드 탭 최종 구성 (12개 섹션)

```
1. 시간별 추이 + spike detection
2. 이슈 히스토리 타임라인
3. 소셜 반응 추이 (일/주/월)
4. 채널별 반응 추이
5. 연관어 맵 (정적)
6. 연관어 변화 (시계열)     ← 신규
7. 감성 연관어              ← 신규
8. 속성별 강점/약점          ← 신규
9. 데이터 내려받기 (CSV 4종)
10. YouTube 분석
11. 기준 비교 트렌드
12. 키워드 기록
```
