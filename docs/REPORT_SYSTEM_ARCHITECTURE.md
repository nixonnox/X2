# Report Automation System — Architecture

## Overview

X2의 리포트 자동 생성 + 스케줄링 + 이메일/공유 링크 시스템.

## Architecture Layers

```
┌─────────────────────────────────────────┐
│  Pages (Next.js App Router)             │
│  /insights/reports, /new, /[id],        │
│  /schedules, /reports/shared/[token]    │
├─────────────────────────────────────────┤
│  Components                             │
│  ReportListTable, ReportKpiGrid,        │
│  ReportSectionCard, ShareLinkCard,      │
│  EmailSendDialog, ReportScheduleTable   │
├─────────────────────────────────────────┤
│  Services (lib/reports/)                │
│  report-builder, report-repository,     │
│  report-scheduler, report-delivery      │
├─────────────────────────────────────────┤
│  Types & Mock Data                      │
│  types.ts, mock-data.ts                 │
└─────────────────────────────────────────┘
```

## Key Types

- `Report` — 메인 엔티티 (sections, kpiSummary, insights, actions)
- `ReportSchedule` — 스케줄 설정 (frequency, dayOfWeek, hour, recipients)
- `ReportDelivery` — 발송 이력 (email, share_link, download)
- `ReportShareLink` — 공유 링크 (token, accessScope, viewCount)

## Report Types

| Type           | Label         | Description          |
| -------------- | ------------- | -------------------- |
| weekly_report  | 주간 리포트   | 지난 7일간 채널 성과 |
| monthly_report | 월간 리포트   | 지난 1개월 종합 분석 |
| custom_report  | 커스텀 리포트 | 자유 기간/섹션 선택  |

## Section Types (10)

overview, kpi_summary, key_findings, channel_analysis, comment_analysis, competitor_analysis, social_listening, ai_insights, recommended_actions, appendix

## Services

### ReportBuilder

- `buildReport(input)` — 섹션 조합 + KPI/인사이트/액션 생성
- 10개 섹션 composer 함수

### ReportRepository

- In-memory CRUD, status management, status logs
- Pre-populated with 5 mock reports

### ReportScheduleService

- 스케줄 CRUD, toggle, getDue()
- Pre-populated with weekly/monthly mock schedules

### ReportDeliveryService

- MockEmailProvider (dev mode, always succeeds)
- ResendEmailProvider scaffold (production)
- ShareLinkService with token generation, expiry, view counting

## Routes

| Path                          | Description        |
| ----------------------------- | ------------------ |
| `/insights/reports`           | 리포트 목록        |
| `/insights/reports/new`       | 리포트 생성        |
| `/insights/reports/[id]`      | 리포트 상세/프리뷰 |
| `/insights/reports/schedules` | 스케줄 관리        |
| `/reports/shared/[token]`     | 공개 공유 뷰어     |

## Production Migration

1. Prisma 모델 추가 (Report, ReportSection, ReportSchedule, etc.)
2. ReportRepository → Prisma 기반 구현
3. MockEmailProvider → ResendEmailProvider
4. ShareLinkService → DB 저장
5. ReportScheduleService → cron job / BullMQ 연동
