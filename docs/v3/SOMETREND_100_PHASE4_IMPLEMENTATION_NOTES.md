# Sometrend 100% Phase 4 Implementation Notes

> Date: 2026-03-16

## 새로 만든 파일

| 파일 | 역할 |
|------|------|
| `components/intelligence/RawMentionList.tsx` | 원문 리스트 (필터+페이지네이션+원문링크) |

## 수정한 파일

| 파일 | 변경 |
|------|------|
| `intelligence.ts` router | 1개 endpoint: `rawMentions` |
| `intelligence/page.tsx` | RawMentionList import + query + "실시간 반응" 탭에 drill-down 연결 |

## 새 tRPC Endpoint

### rawMentions
- **입력:** projectId, keyword, days, platform(opt), sentiment(opt), limit, offset
- **출력:** mentions[], total, page, totalPages
- **필터:** platform, sentiment, days
- **페이지네이션:** limit/offset 기반
- **데이터:** rawSocialMention 테이블 직접 조회

## Drill-down 흐름

```
차트/카드에서 분석 결과 확인
  → "실시간 반응" 탭 클릭
    → LiveMentionStatusPanel (요약 + 통계)
    → RawMentionList (원문 리스트)
      → 플랫폼/감성 필터
      → 페이지네이션 (20건씩)
      → 원문 텍스트 + 작성자 + 날짜 + 감성 뱃지
      → 원문 링크 (ExternalLink → postUrl)
```

## 이미 있던 drill-down (건너뛴 것)

| 기능 | 상태 |
|------|------|
| EvidenceSidePanel (669줄) | 완료 — 노드 클릭 → 증거 패널 |
| LiveMentionStatusPanel | 완료 — 실시간 멘션 요약 |
| liveMentions 원문 표시 | 완료 — 최근 8건 |

## 이번에 추가한 것

| 기능 | 설명 |
|------|------|
| rawMentions endpoint | DB 직접 조회, 필터, 페이지네이션 |
| RawMentionList | 전체 원문 리스트 (20건/페이지), 필터 2종, 감성 뱃지, 원문 링크 |
| 차트→근거→원문 흐름 | "실시간 반응" 탭에서 요약→원문 자연스럽게 이어짐 |
