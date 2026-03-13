# Report Scheduling Guide

## Overview

`report-scheduler.ts`의 `ReportScheduleService`가 스케줄 관리를 담당합니다.

## Schedule Frequencies

| Frequency | Label | 설명                |
| --------- | ----- | ------------------- |
| once      | 1회성 | 단발 실행           |
| daily     | 매일  | 매일 지정 시간      |
| weekly    | 매주  | 매주 지정 요일/시간 |
| monthly   | 매월  | 매월 지정 일/시간   |

## Creating a Schedule

```typescript
import { createSchedule, reportScheduleService } from "@/lib/reports";

const schedule = createSchedule({
  name: "주간 성과 리포트",
  reportType: "weekly_report",
  projectName: "X2 Analytics",
  frequency: "weekly",
  dayOfWeek: 1, // 월요일
  hour: 9,
  minute: 0,
  recipients: [{ email: "team@example.com", name: "팀" }],
  autoShare: true,
});

reportScheduleService.add(schedule);
```

## Schedule Management

```typescript
// 전체 스케줄 조회
reportScheduleService.getAll();

// 활성 스케줄만
reportScheduleService.getEnabled();

// 실행 대기 중인 스케줄
reportScheduleService.getDue();

// 활성/비활성 토글
reportScheduleService.toggle(id, false);

// 실행 완료 표시 (nextRunAt 자동 계산)
reportScheduleService.markRun(id);
```

## Production Migration

현재 in-memory 구현 → 아래 방식으로 전환:

1. Prisma `ReportSchedule` 모델 추가
2. BullMQ repeatable job 또는 node-cron 연동
3. `getDue()` → DB 쿼리로 변경
4. `markRun()` → DB 업데이트 + 새 리포트 자동 생성
