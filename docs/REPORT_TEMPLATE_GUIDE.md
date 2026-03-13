# Report Template Guide

## Section Composers

각 섹션은 `report-builder.ts`의 composer 함수로 생성됩니다.

### 기본 섹션 (DEFAULT_SECTIONS)

1. **overview** — 리포트 개요 (기간, 대상, 요약)
2. **kpi_summary** — 핵심 KPI (조회수, 참여율, 팔로워, 댓글, 부정비율, 언급수)
3. **key_findings** — 주요 발견 (핵심 변화, 주의사항)
4. **channel_analysis** — 채널 분석 (플랫폼별 성과)
5. **comment_analysis** — 댓글 분석 (감성, 토픽, 위험 댓글)
6. **ai_insights** — AI 인사이트 (전략적 제안)
7. **recommended_actions** — 추천 액션 (실행 가능한 행동)

### 추가 섹션

8. **competitor_analysis** — 경쟁 분석
9. **social_listening** — 소셜 리스닝
10. **appendix** — 부록

## KPI Summary Structure

```typescript
{
  totalViews: { value, change, changeLabel },
  engagementRate: { value, change, changeLabel },
  followerChange: { value, change, changeLabel },
  commentCount: { value, change, changeLabel },
  negativeRatio: { value, change, changeLabel },
  mentionCount: { value, change, changeLabel },
}
```

## Custom Section 추가

1. `types.ts`의 `SectionType` union에 새 타입 추가
2. `SECTION_LABELS`에 label/description 추가
3. `report-builder.ts`에 composer 함수 구현
4. `SECTION_COMPOSERS` 맵에 등록

## Insight Categories

- `positive` — 긍정적 변화
- `caution` — 주의 필요
- `opportunity` — 기회 영역
- `risk` — 위험 요소

## Action Priorities

- `critical` — 즉시 대응 필요
- `high` — 우선 처리
- `medium` — 일반 우선순위
- `low` — 참고 사항
