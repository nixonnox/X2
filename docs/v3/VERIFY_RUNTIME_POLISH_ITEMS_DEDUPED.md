# Verify: Runtime Polish Items (Deduped)

> Date: 2026-03-16

| 항목 | 상태 | 판단 |
|------|------|------|
| Optimistic updates | **미착수** | S3 — markRead 시 invalidate로 충분, optimistic은 UX 개선용 |
| 타입 안전성 (`as any`) | **일부** | S3 — 기능 동작에 영향 없음, 리팩토링 시 개선 |
| Polling → WebSocket | **미착수** | **보류** — 30초 polling + mutation invalidate로 운영 충분 |
| Browser notification | **미착수** | **보류** — Service Worker 필요, 현재 Bell로 충분 |
| Benchmark 자동 학습 | **미착수** | **Backlog** — 정적 baseline 225줄로 운영 충분 |
| EmptyState 공통 컴포넌트 | **미착수** | S3 — 문구는 적용됨, 컴포넌트 추출만 남음 |
