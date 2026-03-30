# Next Prompt Minimum Set

> 앞으로 실제 요청해야 하는 최소 프롬프트 목록.
> 이미 완료+검증된 19개 작업은 제외.

## 구현 프롬프트 (4건)

### 1. P0 Schema Migration 일괄 처리
```
delivery_logs.executionId를 nullable로, JobType에 MENTION_COLLECT/SNAPSHOT_GEN 추가,
prisma migrate dev + prisma generate 실행
```
→ P0 3건 한 번에 처리

### 2. P0 Retry BullMQ 전환
```
IntelligenceAlertService의 setTimeout 기반 retry를
BullMQ delayed job으로 전환
```

### 3. P1 Project Settings 완성
```
notification router에 projectId 추가 +
Settings UI에 프로젝트 드롭다운 + webhook 테스트 버튼
```

### 4. P1 Sentiment DB 저장 + Worker 연동
```
rawSocialMention에 sentiment 결과 저장 +
Analyzer worker processCollection에서 sentiment 호출
```

## 검증 프롬프트 (1건)

### 5. Master QA/QC 전 전체 통합 검증
```
P0 4건 수정 후 전체 시스템 E2E 검증:
DB → history → scheduled → sentiment → retention → alert → notification → delivery
```

## 합계: **5개 프롬프트**

이후 P2 (polish)는 선택적.
