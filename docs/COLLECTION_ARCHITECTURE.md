# 소셜 데이터 수집 엔진 아키텍처

## 개요

X2의 소셜 데이터 수집 엔진은 여러 플랫폼에서 채널, 콘텐츠, 댓글, 키워드 언급 데이터를 수집하기 위한 확장 가능한 프레임워크입니다.

## 핵심 원칙

1. **커넥터 인터페이스 기반** — 모든 플랫폼은 공통 `DataConnector` 인터페이스를 구현
2. **관심사 분리** — 커넥터, 작업, 정규화, 스케줄러, 로그가 독립적으로 분리
3. **공통 파이프라인** — API/크롤러 수집 방식이 달라도 동일한 작업 흐름으로 처리
4. **정규화 레이어** — 플랫폼별 응답 형식을 공통 구조로 변환
5. **Mock/Dev 모드** — API 키 없이도 전체 흐름 테스트 가능
6. **최소 core 수정** — 새 플랫폼 추가 시 커넥터만 구현하면 됨

## 전체 구조

```
수집 요청 (수동/스케줄)
  │
  ▼
┌──────────────┐
│  Scheduler   │  예약/주기 실행 관리
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Job Queue   │  우선순위 기반 작업 큐
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Worker     │  작업 실행 + 재시도
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌─────────────────┐
│  Job Runner  │────▶│ Connector       │
│              │     │ Registry        │
│  1. 대상 조회 │     │                 │
│  2. 커넥터 선택│     │ YouTube API     │
│  3. 수집 실행 │     │ Instagram API   │
│  4. 정규화   │     │ TikTok API      │
│  5. 결과 생성 │     │ X API           │
│  6. 로그 기록 │     │ Generic Crawler │
│              │     │ Mock Connector  │
└──────┬───────┘     └─────────────────┘
       │
       ▼
┌──────────────┐
│Normalization │  플랫폼별 → 공통 구조
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Result +    │  저장용 페이로드
│  Log Service │  성공/실패 기록
└──────────────┘
```

## 파일 구조

```
apps/web/src/lib/collection/
├── types.ts              # 모든 타입/인터페이스/상수
├── connectors/
│   ├── base.ts           # BaseConnector 추상 클래스
│   ├── youtube.ts        # YouTube Data API v3
│   ├── instagram.ts      # Instagram Graph API (scaffold)
│   ├── tiktok.ts         # TikTok Research API (scaffold)
│   ├── x.ts              # X API v2 (scaffold)
│   ├── generic-crawler.ts # 범용 크롤러 (scaffold)
│   ├── mock.ts           # Mock 커넥터 (dev/test)
│   └── index.ts
├── registry.ts           # 커넥터 등록/조회/해결
├── normalization.ts      # 정규화 서비스
├── jobs.ts               # 수집 작업 생성/실행
├── scheduler.ts          # 스케줄 관리
├── queue.ts              # 작업 큐 + 워커
├── logs.ts               # 수집 로그 서비스
├── mock-data.ts          # 관리자 UI용 목 데이터
└── index.ts              # 배럴 exports

apps/web/src/components/collection/
├── job-summary-cards.tsx          # 작업 현황 요약 카드
├── job-history-table.tsx          # 수집 작업 히스토리 테이블
├── connector-status-cards.tsx     # 커넥터 상태 카드
├── collection-schedules.tsx       # 스케줄 목록
├── collection-settings-panel.tsx  # 수집 설정 패널
└── index.ts
```

## 수집 도메인

| 도메인  | 설명                                       | 정규화 구조         |
| ------- | ------------------------------------------ | ------------------- |
| Channel | 채널 기본정보, 구독자/팔로워 수, 게시물 수 | `NormalizedChannel` |
| Content | 게시물/영상 목록, 조회수, 반응 수          | `NormalizedContent` |
| Comment | 댓글 목록, 작성자, 반응 수                 | `NormalizedComment` |
| Mention | 키워드 언급, 출처, 감성                    | `NormalizedMention` |

## 플랫폼별 수집 방식

| 플랫폼     | 우선 방식 | 환경변수                 | 비고                              |
| ---------- | --------- | ------------------------ | --------------------------------- |
| YouTube    | API       | `YOUTUBE_API_KEY`        | Data API v3                       |
| Instagram  | API       | `INSTAGRAM_ACCESS_TOKEN` | Graph API, Business 계정 필요     |
| TikTok     | API       | `TIKTOK_ACCESS_TOKEN`    | Research API, 승인 필요           |
| X          | API       | `X_BEARER_TOKEN`         | API v2, 요금제별 접근 범위 상이   |
| Naver Blog | 크롤러    | -                        | 검색 API 또는 웹 수집             |
| Naver Cafe | 크롤러    | -                        | 접근 제한 있을 수 있음            |
| Blog/News  | 크롤러    | -                        | RSS 또는 웹 수집. robots.txt 준수 |
| Community  | 크롤러    | -                        | 사이트별 정책 확인 필요           |

## 보안 및 운영 고려사항

- API 키/토큰은 환경변수로만 관리, 코드에 하드코딩 금지
- Rate limit 정책 준수 (기본 60 req/min)
- robots.txt 및 이용약관 준수
- 비인가 접근이나 정책 우회 구현 금지
- 운영 환경에서는 Redis/BullMQ 기반 큐로 교체 권장
