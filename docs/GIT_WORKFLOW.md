# Git Workflow

브랜치 전략, 커밋 메시지, PR 규칙.

## 브랜치 전략

### 주요 브랜치

| 브랜치    | 용도          | 배포            |
| --------- | ------------- | --------------- |
| `main`    | 프로덕션 코드 | Vercel 프로덕션 |
| `develop` | 개발 통합     | Vercel Preview  |

### 작업 브랜치 네이밍

```
{type}/{description}
```

| 타입       | 용도         | 예시                         |
| ---------- | ------------ | ---------------------------- |
| `feat`     | 새 기능      | `feat/channel-list`          |
| `fix`      | 버그 수정    | `fix/login-redirect`         |
| `refactor` | 리팩토링     | `refactor/analytics-service` |
| `docs`     | 문서         | `docs/api-guide`             |
| `chore`    | 설정, 의존성 | `chore/update-deps`          |
| `ui`       | UI 변경      | `ui/dashboard-cards`         |

**규칙**:

- 영문 소문자 + 하이픈
- 짧고 명확하게 (2~4 단어)
- 이슈 번호가 있으면 포함: `feat/42-channel-list`

## 커밋 메시지

### 형식

```
{type}({scope}): {description}
```

### Type

| 타입       | 용도                         |
| ---------- | ---------------------------- |
| `feat`     | 새 기능 추가                 |
| `fix`      | 버그 수정                    |
| `refactor` | 동작 변경 없는 코드 개선     |
| `style`    | 코드 포맷, 공백, 세미콜론 등 |
| `docs`     | 문서 추가/수정               |
| `test`     | 테스트 추가/수정             |
| `chore`    | 빌드, 설정, 의존성 등        |
| `perf`     | 성능 개선                    |

### Scope (선택)

영향을 받는 패키지 또는 기능 영역:

```
feat(channel): add channel URL parser
fix(auth): fix Google OAuth redirect
refactor(api): extract pagination utility
chore(deps): update Next.js to 15.3
docs(readme): update project structure
ui(dashboard): add stat cards
```

### Description 규칙

- **영문** 소문자로 시작, 마침표 없음
- **현재형 동사**로 시작: add, fix, update, remove, refactor
- **50자 이내**
- "무엇을 했는지"가 아니라 "무엇이 변하는지" 관점

```bash
# ✅ 좋음
feat(channel): add YouTube channel import
fix(auth): handle expired OAuth token
refactor(social): extract provider interface
chore: configure lint-staged with husky

# ✗ 나쁨
feat: updated code                    # 너무 모호
fix: Fixed the bug                    # 대문자, 과거형
feat(channel): add YouTube channel import feature to allow users to...  # 너무 김
```

### 본문 (선택)

복잡한 변경이면 빈 줄 후 본문을 추가한다:

```
feat(analytics): add channel growth rate calculation

YouTube 채널의 구독자/조회수 증가율을 일간/주간/월간으로 계산.
analytics_snapshots 테이블의 시계열 데이터를 기반으로 산출한다.
```

### AI와 협업 시 커밋

Claude Code가 작성한 커밋에는 Co-Author를 추가한다:

```
feat(channel): add channel list page

Co-Authored-By: Claude <noreply@anthropic.com>
```

## PR 규칙

### PR 제목

커밋 메시지와 동일한 형식:

```
feat(channel): add channel management page
```

### PR 본문

```markdown
## 요약

- 채널 목록 페이지 추가
- 채널 추가/삭제 기능 구현

## 변경 사항

- `apps/web/src/app/(dashboard)/channels/page.tsx` 추가
- `packages/api/src/routers/channel.ts`에 list, create, delete 프로시저 추가
- `packages/social/src/providers/youtube.ts` YouTube provider 구현

## 테스트

- [ ] 채널 URL 입력으로 YouTube 채널 추가 확인
- [ ] 채널 목록 페이지 정상 렌더링 확인
- [ ] 채널 삭제 후 목록 갱신 확인
```

### PR 크기

- **소형 (권장)**: 파일 10개 이하, 변경 300줄 이하
- **중형**: 파일 20개 이하, 변경 600줄 이하
- **대형 (지양)**: 그 이상 → 분리 가능하면 여러 PR로 나눈다

### 머지 전략

- `develop` ← 작업 브랜치: **Squash and Merge**
- `main` ← `develop`: **Merge Commit**

## Git 사용 규칙

### 절대 하지 않는 것

- `main` 또는 `develop`에 직접 push하지 않는다
- `--force` push하지 않는다 (rescue 상황 제외)
- `.env`, 시크릿, API 키를 커밋하지 않는다
- `node_modules/`를 커밋하지 않는다

### 자주 하는 것

```bash
# 작업 시작 전 최신 develop 동기화
git checkout develop
git pull origin develop
git checkout -b feat/my-feature

# 작업 중 주기적으로 동기화
git fetch origin
git rebase origin/develop

# 커밋 전 확인
pnpm typecheck
pnpm lint
```

### .gitignore 관리

새로운 도구/프레임워크 추가 시 반드시 `.gitignore`에 제외 패턴을 추가한다.
