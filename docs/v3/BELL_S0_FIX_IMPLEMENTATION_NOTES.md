# Bell S0 Fix Implementation Notes

> Date: 2026-03-16
> Status: S0 RESOLVED — Bell은 이미 완전 구현됨. 이번 단계에서 검증 + Dashboard 동기화 확인 + UX 문구 개선 수행.

## 검증 결과 요약

### 프론트엔드 (15/15 PASS)

| 항목 | 상태 |
|------|------|
| Bell onClick → dropdown | PASS |
| bellOpen state 제어 | PASS |
| notification.unreadCount (30초 폴링) | PASS |
| notification.list (bellOpen 시) | PASS |
| markRead + onSuccess invalidate | PASS |
| markAllRead + onSuccess invalidate | PASS |
| 뱃지 (0=숨김, 1-9=숫자, 9+=9+) | PASS |
| Loading 상태 | PASS |
| Error 상태 | PASS |
| Empty 상태 | PASS |
| 항목 클릭 → markRead + router.push | PASS |
| "모두 읽음" 버튼 | PASS |
| "알림 전체 보기" 링크 | PASS |
| 항목 표시 (title/message/priority/source/time/unread) | PASS |
| UX 문구 해요체 | PASS (이번 세션 수정) |

### 백엔드 (6/6 PASS)

| 항목 | 상태 |
|------|------|
| notification router 등록 (root.ts line 30) | PASS |
| list endpoint (Prisma, 필터, 페이지네이션) | PASS |
| markRead endpoint (isRead=true, readAt) | PASS |
| markAllRead endpoint (bulk update) | PASS |
| unreadCount endpoint (COUNT isRead=false) | PASS |
| createAlertNotification (DB, sourceType, actionUrl, sourceId) | PASS |

### Dashboard 동기화 (3/3 PASS)

| 항목 | 상태 |
|------|------|
| Dashboard가 notification.unreadCount 사용 | PASS (line 485-489) |
| Bell과 같은 query key | PASS |
| mutation invalidate 시 동시 갱신 | PASS |

## 이번 세션에서 수정한 내용

### Dashboard UX 문구 개선
| 기존 | 교정 |
|------|------|
| Intelligence Hub | 인사이트 허브 |
| Intelligence 인사이트 | 키워드 분석 인사이트 |
| A/B 비교 | 비교 분석 |
| 아직 분석한 키워드가 없습니다. Intelligence Hub에서 시작하세요. | 아직 분석한 키워드가 없어요. 여기서 첫 분석을 시작해보세요. |
| 이상 신호 없음 | 새 알림이 없어요 |
| Low confidence N건 | 낮은 신뢰도 N건 |
| 수집 상태: N/M 파이프라인 실패 | 데이터 수집 N/M건 실패 |

## S0 Blocker 해소 근거

1. **Bell dropdown은 완전히 구현됨** — onClick, list, markRead, markAllRead, deep link, 상태 UI
2. **Source of truth가 통일됨** — Bell, Dashboard, /notifications 모두 `notification.unreadCount` 사용
3. **Signal hint 문자열 카운트가 main path에 없음**
4. **읽음 처리 후 즉시 모든 소비자 갱신** — mutation onSuccess에서 invalidate
5. **DB persistence 기반** — Prisma를 통한 실제 DB 조회/수정

## 남은 과제 (S0 아님)

| 항목 | 우선순위 | 설명 |
|------|---------|------|
| Deep link 확장 | MEDIUM | 비교 결과, 리포트, 수집 실패 등 추가 actionUrl |
| WebSocket 실시간 | LOW | 현재 30초 폴링, 향후 WebSocket 전환 가능 |
| 배치 읽음 처리 | LOW | 선택 항목만 일괄 읽음 |
| 알림 삭제/보관 | LOW | 현재 읽음 처리만, 삭제는 미구현 |
