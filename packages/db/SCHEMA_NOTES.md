# X2 Database Schema Notes

## 테이블 역할 설명

### Auth (Auth.js 관리)

| 테이블                | 역할                                                                   |
| --------------------- | ---------------------------------------------------------------------- |
| `users`               | 사용자 계정. Auth.js가 관리하며, OAuth/Credentials 로그인 시 자동 생성 |
| `accounts`            | OAuth 프로바이더 연결 정보 (Google, GitHub 등). 1 user : N accounts    |
| `sessions`            | DB 세션 (JWT 모드에서는 미사용)                                        |
| `verification_tokens` | 이메일 인증 토큰                                                       |

### Multi-tenancy

| 테이블              | 역할                                                                   |
| ------------------- | ---------------------------------------------------------------------- |
| `workspaces`        | 팀/조직 단위. 빌링, 사용량 추적의 기본 단위                            |
| `workspace_members` | 워크스페이스-사용자 매핑. OWNER/ADMIN/MEMBER 역할 구분                 |
| `projects`          | 워크스페이스 하위 프로젝트. 채널, 경쟁사, 키워드, 리포트의 스코프 단위 |

### Channels

| 테이블                | 역할                                                                    |
| --------------------- | ----------------------------------------------------------------------- |
| `platforms`           | 지원 플랫폼 마스터 (YouTube, Instagram, TikTok, X). 확장 시 새 row 추가 |
| `channels`            | 등록된 소셜 채널. 프로젝트에 속하며, 콘텐츠/스냅샷의 상위 엔티티        |
| `channel_connections` | OAuth 토큰 저장. API 연동 시 사용. BASIC 채널은 connection 없음         |
| `channel_snapshots`   | 채널 지표의 일별 스냅샷. 구독자, 조회수 등 시계열 데이터                |

### Contents

| 테이블                  | 역할                                                       |
| ----------------------- | ---------------------------------------------------------- |
| `contents`              | 수집된 콘텐츠 (영상, 릴스, 포스트 등). 채널에 속함         |
| `content_metrics_daily` | 콘텐츠별 일별 지표 스냅샷. 조회수/좋아요/댓글 수 변화 추적 |

### Comments

| 테이블             | 역할                                                                      |
| ------------------ | ------------------------------------------------------------------------- |
| `comments`         | 수집된 댓글. 콘텐츠에 속하며, 대댓글은 `isReply`+`parentCommentId`로 구분 |
| `comment_analysis` | 댓글별 AI 분석 결과. 감성, 토픽, 스팸 여부. 1:1 관계                      |

### Keywords & Trends

| 테이블                  | 역할                                         |
| ----------------------- | -------------------------------------------- |
| `keywords`              | 프로젝트별 추적 키워드                       |
| `keyword_metrics_daily` | 키워드의 일별 검색량, 트렌드 방향, 관련 용어 |

### Competitors

| 테이블                | 역할                                                       |
| --------------------- | ---------------------------------------------------------- |
| `competitor_channels` | 경쟁사 채널. 자사 채널과 구조는 유사하나 connection 불필요 |

### AI Insights

| 테이블            | 역할                                                                   |
| ----------------- | ---------------------------------------------------------------------- |
| `insight_reports` | AI 생성 인사이트/리포트. JSON `content` 필드에 구조화된 분석 결과 저장 |
| `insight_actions` | 리포트에서 도출된 실행 가능한 액션 항목                                |

### Data Pipeline

| 테이블           | 역할                                                    |
| ---------------- | ------------------------------------------------------- |
| `scheduled_jobs` | 데이터 수집/분석 스케줄 정의. cron 기반, 워크스페이스별 |

### Billing

| 테이블          | 역할                                              |
| --------------- | ------------------------------------------------- |
| `subscriptions` | Stripe 구독 정보. 워크스페이스당 1개 활성 구독    |
| `usage_metrics` | 워크스페이스별 일별 사용량 집계. 과금 기준 데이터 |

---

## 핵심 관계 구조

```
User ──┬── Account (OAuth)
       └── WorkspaceMember ── Workspace ──┬── Project ──┬── Channel ──┬── ChannelConnection
                                          │             │             ├── ChannelSnapshot
                                          │             │             └── Content ──┬── ContentMetricDaily
                                          │             │                           └── Comment ── CommentAnalysis
                                          │             ├── CompetitorChannel
                                          │             ├── Keyword ── KeywordMetricDaily
                                          │             └── InsightReport ── InsightAction
                                          ├── Subscription
                                          ├── UsageMetric
                                          └── ScheduledJob
```

---

## 설계 전제 (Assumptions)

1. **Workspace가 빌링 단위** — 구독, 사용량 추적 모두 워크스페이스 기준
2. **Project가 분석 스코프** — 채널, 경쟁사, 키워드, 리포트는 프로젝트에 속함
3. **Channel은 Project에 속함** — 동일 채널을 여러 프로젝트에 등록 가능 (별도 row)
4. **시계열 데이터는 일별 집계** — `_daily` 테이블로 날짜별 스냅샷. 시간별 정밀도는 MVP 이후
5. **Comment 대댓글** — 자기참조 없이 `parentCommentId` (String)로 단순화. 깊은 스레드 불필요
6. **InsightReport.content는 JSON** — AI 응답 구조가 유동적이므로 비정형 저장
7. **Platform은 참조 테이블** — enum과 별도로 마스터 테이블 유지하여 메타데이터 확장 가능
8. **ChannelConnection 분리** — BASIC 채널(공개 데이터만)은 connection 없이 동작

---

## MVP 이후로 미룬 항목

### 테이블 수준

- `audit_logs` — 사용자 활동 기록 (생성/수정/삭제 이력)
- `notifications` — 앱 내 알림 시스템
- `webhooks` — 외부 서비스 연동 webhook 설정
- `api_keys` — 워크스페이스별 API 키 관리
- `tags` / `content_tags` — 콘텐츠 태깅 시스템
- `team_invitations` — 팀 초대 관리

### 필드 수준

- `User.timezone`, `User.language` — 사용자 로케일 설정
- `Workspace.logoUrl`, `Workspace.billingEmail` — 워크스페이스 브랜딩
- `Content.transcript` — 영상 자막/스크립트 (AI 분석용)
- `Content.tags`, `Content.categories` — 콘텐츠 분류
- `Channel.demographics` (JSON) — 구독자 인구통계 (연결된 채널만)
- `CompetitorChannel.snapshots` — 경쟁사 시계열 데이터
- `InsightReport.modelVersion` — AI 모델 버전 추적
- `ScheduledJob.runHistory` — 잡 실행 이력 (별도 테이블)
- 시간별(hourly) 메트릭 테이블 — 더 세밀한 시계열 분석
