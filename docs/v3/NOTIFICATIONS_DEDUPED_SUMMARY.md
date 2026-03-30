# Notifications Deduped Summary

> Date: 2026-03-16
> **핵심 기능 모두 완료. 추가 구현 불필요.**

## 완료 항목 (10개 → 건너뛰기)

| 기능 | 상태 |
|------|------|
| /notifications 전체 페이지 | DONE — 5개 필터 + pagination + 읽음 처리 |
| Bell dropdown (10개 최근 알림) | DONE — unreadCount + markRead + markAllRead |
| Bell → /notifications 링크 | DONE — "알림 전체 보기" |
| sourceType 필터 | DONE — Intelligence / 시스템 |
| 중요도 필터 | DONE — 긴급/중요/일반/낮음 |
| 읽음/안읽음 필터 | DONE |
| 기간 필터 | DONE — 오늘/7일/30일/전체 |
| 텍스트 검색 | DONE |
| Pagination | DONE — prev/next + page indicator |
| UX 문구 해요체 | DONE — 13개 파일 |

## 미구현 항목 (S3 후순위)

| 기능 | 우선순위 | 이유 |
|------|---------|------|
| Project 범위 필터 | S3 | notification에 projectId 직접 컬럼 없음 (sourceId 파싱 필요) |
| Dismiss/snooze | S3 | isDismissed 필드 없음, schema 변경 필요 |
| WebSocket 실시간 | S3 | 30초 polling으로 충분, 구조 변경 큼 |
| Browser notification | S3 | Service Worker + Permission API 필요 |

## 이번 구현: 0건

추가 코드 작업 불필요. 운영형 notification center가 이미 usable 상태.
