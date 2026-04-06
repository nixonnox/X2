# 커밋 계획서 — 2026-04-06

> 작성: 채팅 Claude 세션 (분석·계획만, 집행 불가)
> 실행 주체: 터미널 Claude Code
> 목적: 워킹카피에 쌓인 393개 uncommitted 변경을 안전한 7개 그룹으로 분할 커밋하여, 롤백 가능한 상태로 정리한다.
> 전제: 이 문서의 모든 명령어는 **터미널 Claude Code** 또는 **수동 PowerShell**에서 실행된다. 채팅 Claude 세션은 sandbox 권한 제약으로 git 쓰기 작업을 할 수 없다.

---

## 사전 확인 (반드시 먼저 읽고 동의할 것)

### 이 계획이 가정하는 상태

작성 시점(2026-04-06 15:57 KST) 기준:

- `HEAD = a1a37b4` ("fix: 설정 페이지 프로젝트 생성 후 자동 이동 + 캐시 갱신")
- `git status --short | wc -l` ≈ 394
- 스테이지 영역에 이미 106개 파일이 올라와 있음 (과거 세션의 잔재, +2735/-3804)
- 104개 파일이 MM 상태 (인덱스와 워킹트리가 다름)
- 인덱스에 `resolve-undo` 메타데이터 손상 있음 (과거 중단된 merge 잔재)
- `.git/AUTO_MERGE` 와 `.git/index.lock` 은 제거 완료됨

### 안전망 (이미 준비됨)

1. **tar 스냅샷**: `.backup/wip-snapshot-2026-04-06.tgz` (7.8 MB)
   - 2026-04-06 15:57 시점의 워킹트리 풀백업 (node_modules, .next, .turbo 제외)
   - 모든 단계가 실패하면 이 tar 로 완전 복원 가능
2. **backup 브랜치**: `backup/wip-2026-04-06`
   - 당시 HEAD(`8efc38c`)를 고정. 현재 HEAD는 그보다 앞선 `a1a37b4`지만, 이 브랜치는 레퍼런스 포인트로 유지.
3. `.gitignore` 에 `.backup/` 추가됨 (추적 대상 아님)

### 실행 원칙

- **각 그룹이 빌드를 깨지 않음을 확인한 뒤 다음 그룹으로** 넘어간다
- 빌드 실패 시 **즉시 중단**하고 원인 파악
- 절대 `--no-verify`, `--force`, `push --force` 금지 (대표님 허락 없이)
- 각 커밋 메시지는 한국어로, 과거 커밋 스타일과 일관되게 (`fix:` / `feat:` / `chore:` / `docs:` 프리픽스)
- 커밋 끝에 `Co-Authored-By` 라인 추가 권장

---

## Phase 0: 인덱스 정리 (커밋 전 필수)

**목적**: 과거 세션의 부분 스테이지(106 파일)와 resolve-undo 잔재를 싹 지우고, 깨끗한 상태에서 새로 스테이지를 쌓는다.

**왜 필요한가**: 현재 스테이지 영역은 *"어느 시점 어떤 세션이 어떤 의도로 add했는지 알 수 없는" 혼재 상태*예요. 이 상태로 커밋하면 나중에 revert할 때 무엇을 복원해야 할지 판단이 불가능해져요. 워킹트리(디스크)의 현재 상태가 대표님이 최종적으로 믿을 수 있는 유일한 근거예요.

### 명령어

```bash
# 1. 현재 상태 기록 (나중에 대조용)
git status --short > .backup/phase0-before-status.txt
git diff --cached --stat > .backup/phase0-before-staged-stat.txt

# 2. 스테이지만 HEAD로 되돌리기 (워킹트리는 건드리지 않음)
git reset HEAD

# 3. 결과 확인 — 이제 MM이 사라지고 M(unstaged)만 있어야 함
git status --short | head -20
git status --short | wc -l   # 여전히 ~394 근처일 것

# 4. MM이 0개인지 확인
git status --short | grep -c '^MM'   # 반드시 0

# 5. resolve-undo 잔재 확인 (이 오류 메시지가 사라지면 성공)
git status 2>&1 | grep -c "resolve-undo"   # 0이면 정상, 여전히 나오면 Phase 0.5 진행
```

### Phase 0.5 — resolve-undo 잔재가 여전히 남아있을 경우

`git reset HEAD` 로도 안 풀리면 인덱스를 강제 재생성:

```bash
# 인덱스 파일 자체를 날리고 재생성 (워킹트리 영향 없음)
mv .git/index .git/index.old-$(date +%s)
git read-tree HEAD
git update-index --refresh || true
git status --short | wc -l

# 잘 되면 백업 삭제 — 아니면 되돌림
# mv .git/index.old-* .git/index   (복구용)
```

> 주의: `git read-tree HEAD` 는 **워킹트리를 건드리지 않아요**. 인덱스만 HEAD 트리로 재구성합니다.

---

## Phase 1: 그룹 1 — 문서 전용 (무위험)

**영역**: `docs/`
**파일 수**: ~268
**위험도**: 🟢 없음
**이유**: 빌드에 영향 0. 실패해도 코드 깨질 일 없음.

### 명령어

```bash
# docs 전체 스테이지
git add docs/

# 확인
git status --short docs/ | head -10
git diff --cached --stat | tail -5

# 커밋
git commit -m "$(cat <<'EOF'
docs: 감사·가이드·알림 문서 대량 업데이트 (v3 + 루트 + shared)

- docs/v3/: 알림 엔진/가드레일/운영 문서 203개 업데이트
- docs/ 루트: 릴리즈 판정, UX 감사, 랜딩 전략 등 신규 14개 + 수정 26개
- docs/shared/: 글로벌 UX 원칙, 백로그, 스코어카드 25개 업데이트

빌드 영향 없음. 커밋 그룹 1/7.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# 상태 확인
git status --short | wc -l   # 394 → 126 정도로 줄어야 함
```

### 검증

- `pnpm typecheck` — 건너뜀 (문서만 변경이므로)
- 다음 단계로 진행

---

## Phase 2: 그룹 2 — 루트 설정·툴링

**영역**: 루트 설정 파일 + `apps/web` 설정
**파일 수**: ~9
**위험도**: 🟡 낮음

### 대상 파일

```
.editorconfig
.env.example
.gitignore
.npmrc
apps/web/.gitignore
apps/web/next.config.ts
apps/web/package.json
pnpm-lock.yaml
pnpm-workspace.yaml
```

### 명령어

```bash
# 개별 스테이지 (와일드카드 금지 — 루트 파일이 섞이는 사고 방지)
git add .editorconfig .env.example .gitignore .npmrc
git add apps/web/.gitignore apps/web/next.config.ts apps/web/package.json
git add pnpm-lock.yaml pnpm-workspace.yaml

# 확인
git diff --cached --stat

# 중요: package.json 과 pnpm-lock.yaml의 버전 상승이 의도된 것인지 스스로 리뷰할 것
# 특히 main dependency (next, react, prisma, trpc) 버전이 점프했는지 체크

# 커밋
git commit -m "$(cat <<'EOF'
chore: 루트/웹앱 설정 및 툴링 업데이트

- .editorconfig, .gitignore, .npmrc 정리
- .env.example 환경 변수 표준화
- apps/web/next.config.ts 빌드 설정 조정
- apps/web/package.json, pnpm-lock.yaml 의존성 동기화

커밋 그룹 2/7.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### 검증

```bash
pnpm install                 # lockfile 일관성 확인
pnpm typecheck 2>&1 | tail -10
```

실패 시: `pnpm-lock.yaml` 이 package.json 과 맞지 않을 수 있음. `pnpm install` 다시 돌리고 재커밋(amend 금지, 새 커밋).

---

## Phase 3: 그룹 3 — 시드·워커·스크립트

**영역**: `scripts/`, `workers/`
**파일 수**: ~2
**위험도**: 🟡 낮음

### 대상 파일

```
scripts/seed-neon.ts                                          (신규)
workers/analyzer/.../vertical-preview-builder.ts              (수정)
```

### 명령어

```bash
git add scripts/seed-neon.ts
git add workers/analyzer/

git diff --cached --stat

git commit -m "$(cat <<'EOF'
feat(ops): Neon 시드 스크립트 및 vertical preview 빌더 추가

- scripts/seed-neon.ts: 실데이터 시드 스크립트 (Neon PostgreSQL)
- workers/analyzer/vertical-preview-builder: vertical 템플릿 preview 생성 로직

커밋 그룹 3/7.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### 검증

```bash
pnpm --filter '@x2/*' typecheck 2>&1 | tail -20
```

---

## Phase 4: 그룹 4 — 백엔드 패키지 (packages/\*)

**영역**: `packages/` 모든 하위
**파일 수**: ~18
**위험도**: 🔴 높음 (백엔드 로직)

### 대상

```
packages/auth/src/config.ts           (88 lines changed)
packages/queue/src/connection.ts
packages/db/**
packages/ai/**
packages/api/**                        (라우터·서비스·리포지토리 10+ files)
packages/social/**
packages/types/**
packages/config/**
packages/ui/**
```

### 명령어

```bash
# 패키지 전체를 한번에 add — packages 는 서로 의존관계가 있으므로 분할하면 빌드 깨짐
git add packages/

git diff --cached --stat | tail -20
git diff --cached packages/auth/src/config.ts | head -100   # 중요 변경 육안 확인

# 커밋
git commit -m "$(cat <<'EOF'
fix(backend): auth/queue/api 패키지 안정성 개선 및 의존성 정비

- packages/auth/config.ts: 세션/토큰 로직 개선 (+88 lines)
- packages/queue/connection.ts: Redis 연결 재시도 로직
- packages/api: 라우터·서비스·리포지토리 정비
- packages/db, ai, social, types, config, ui 동기화

커밋 그룹 4/7. 이 커밋 이후 반드시 typecheck + build 통과 확인.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### 검증 (중요!)

```bash
# 백엔드가 깨지면 프론트는 말할 것도 없음. 반드시 통과 확인.
pnpm typecheck 2>&1 | tee .backup/phase4-typecheck.log | tail -30

# 실패하면 로그 확인 후 수정
# 수정이 커지면 새 브랜치 파서 작업하고 이 커밋은 revert
```

---

## Phase 5: 그룹 5 — 웹앱 공용 lib/middleware

**영역**: `apps/web/src/lib`, `middleware.ts`, `hooks`, `messages`, `types`, `features`
**파일 수**: ~25
**위험도**: 🟠 중

### 명령어

```bash
git add apps/web/src/lib/
git add apps/web/src/middleware.ts
git add apps/web/src/hooks/
git add apps/web/src/messages/
git add apps/web/src/types/
git add apps/web/src/features/

git diff --cached --stat

git commit -m "$(cat <<'EOF'
fix(web): 공용 lib/middleware/hooks/i18n 정비

- src/lib/: 공용 유틸 18개 파일 정비
- src/middleware.ts: 인증·rate limit 경로 업데이트
- src/hooks/useRecordKeyword.ts 신규 추가
- src/messages/: i18n 메시지 2개 파일 업데이트
- src/types, src/features: 공용 타입 동기화

커밋 그룹 5/7.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### 검증

```bash
pnpm --filter web typecheck 2>&1 | tail -20
```

---

## Phase 6: 그룹 6 — 컴포넌트 (하위 영역별로 6개 커밋 분할)

**영역**: `apps/web/src/components/`
**파일 수**: ~51
**위험도**: 🟠 중
**분할 이유**: 한 커밋으로 묶으면 나중에 "어느 컴포넌트 변경이 버그를 일으켰나" 추적이 불가능해짐.

### 6-1. intelligence 컴포넌트 (15개)

```bash
git add apps/web/src/components/intelligence/

git commit -m "$(cat <<'EOF'
fix(components/intelligence): 차트·패널 15개 컴포넌트 정비

AiInsightPanel, AnalysisHistoryPanel, AttributeAnalysisPanel,
BenchmarkDifferentialRing, BenchmarkTrendChart, ChannelTrendChart,
ClusterNetworkGraph, CurrentVsPreviousPanel, EvidenceSidePanel,
HourlyTrendChart, IntelligenceRadialGraph, IntelligenceStatePanel,
IntelligenceSummaryCards, IssueTimeline, KeywordHistoryPanel 등.

커밋 그룹 6-1/7.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### 6-2. channels 컴포넌트 (9개)

```bash
git add apps/web/src/components/channels/
git commit -m "fix(components/channels): 9개 채널 컴포넌트 정비

커밋 그룹 6-2/7.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### 6-3. listening-hub 컴포넌트 (7개)

```bash
git add apps/web/src/components/listening-hub/
git commit -m "fix(components/listening-hub): 8개 섹션 컴포넌트 정비

ClusterSection, IntentSummarySection, ListeningHubLayout,
PathfinderSection, PersonaSection, RoadViewSection, SearchActionSection,
SearchEvidenceSection, SearchInsightSection.

커밋 그룹 6-3/7.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### 6-4. comments 컴포넌트 (6개)

```bash
git add apps/web/src/components/comments/
git commit -m "fix(components/comments): 6개 댓글 컴포넌트 정비

커밋 그룹 6-4/7.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### 6-5. competitors 컴포넌트 (4개)

```bash
git add apps/web/src/components/competitors/
git commit -m "fix(components/competitors): 4개 경쟁사 컴포넌트 정비

커밋 그룹 6-5/7.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### 6-6. 나머지 컴포넌트 (layout, shared, dashboard, landing, insights, collection)

```bash
git add apps/web/src/components/layout/
git add apps/web/src/components/shared/
git add apps/web/src/components/dashboard/
git add apps/web/src/components/landing/
git add apps/web/src/components/insights/
git add apps/web/src/components/collection/

git commit -m "$(cat <<'EOF'
fix(components): layout/shared/dashboard/landing/insights/collection 정비

- layout: 사이드바·헤더 3개 파일
- shared: error-boundary 신규 추가
- dashboard, landing, insights, collection 각 1-2개

커밋 그룹 6-6/7.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### 6 검증

```bash
pnpm --filter web typecheck 2>&1 | tail -20
```

---

## Phase 7: 그룹 7 — 페이지 (가장 위험)

**영역**: `apps/web/src/app/`
**파일 수**: ~49
**위험도**: 🔴 높음 (사용자 경험 직결)

### 분할 전략

허브별로 쪼갠다. 분할 순서는 **독립성이 높은 것부터**.

### 7-1. 인증 페이지

```bash
git add apps/web/src/app/\(auth\)/
git commit -m "fix(pages/auth): 로그인 페이지 정비

커밋 그룹 7-1/7.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### 7-2. API 라우트 (신규 3개 포함)

```bash
git add apps/web/src/app/api/

# 중요: 신규 dev-login/debug-session 라우트는 개발용이므로
# 프로덕션 환경에서 노출되지 않는지 middleware.ts 가드 확인 필수
git diff HEAD apps/web/src/middleware.ts | grep -E "dev-login|debug-session"

git commit -m "$(cat <<'EOF'
feat(api): dev-login/debug-session/quick-add-channel 라우트 추가 + 기존 API 정비

- api/dev-login: 개발 환경 JWT 직접 발급
- api/debug-session: 세션 상태 디버그
- api/quick-add-channel: 빠른 채널 등록
- 기존 search-intelligence/analyze 등 4개 라우트 업데이트

⚠️ dev-login/debug-session는 middleware.ts PUBLIC_PATHS에 있지만
프로덕션에서는 env 가드 필요.

커밋 그룹 7-2/7.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### 7-3. 랜딩/홈 페이지

```bash
# (marketing)/layout.tsx, page.tsx 삭제 스테이지
git add -u apps/web/src/app/\(marketing\)/

# 현재 page.tsx (옛 랜딩) + landing.tsx (dead code) + components/landing 수정분
git add apps/web/src/app/page.tsx
git add apps/web/src/app/landing.tsx

git commit -m "$(cat <<'EOF'
chore(landing): (marketing) 라우트 제거 및 landing.tsx 초안 보관

- (marketing)/layout.tsx, page.tsx 삭제
- app/page.tsx: 기존 Hero/HubCards 랜딩 유지
- app/landing.tsx: 1719줄 신규 랜딩 초안 (현재 import되지 않음 = dead code)

⚠️ landing.tsx는 현재 어디서도 import되지 않습니다. 배선 또는 삭제 결정 필요.
자세한 내용은 docs/P0_BLOCKER_DIAGNOSIS_2026-04-06.md P0-3 섹션 참고.

커밋 그룹 7-3/7.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### 7-4. 대시보드 허브 페이지 (가장 큰 묶음)

```bash
git add apps/web/src/app/\(dashboard\)/

git diff --cached --stat | tail -20

git commit -m "$(cat <<'EOF'
fix(pages/dashboard): 28개 대시보드 페이지 정비

허브별 변경:
- channels/, competitors/, comments/, intelligence/, listening-hub/
- admin/ (AI, collection, pipeline, logs, evals, prompts)
- billing/, reports/, geo-aeo/, cluster-finder/, category-entry/
- insights/, notifications/, settings/, start/, home/, dashboard/

커밋 그룹 7-4/7.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### 7-5. 기타 페이지 (reports 등)

```bash
git add apps/web/src/app/reports/
# 그 외 아직 스테이지 안 된 app/ 파일 전부
git add apps/web/src/app/

git status --short   # 여기서 ?? 만 남아야 함 (추적 안 되는 파일)

git commit -m "fix(pages): reports 및 기타 페이지 마무리 정비

커밋 그룹 7-5/7 (최종).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Phase 7 최종 검증

```bash
# 1. 타입체크
pnpm typecheck 2>&1 | tee .backup/phase7-typecheck.log | tail -30

# 2. 린트
pnpm lint 2>&1 | tee .backup/phase7-lint.log | tail -20

# 3. 프로덕션 빌드
pnpm build 2>&1 | tee .backup/phase7-build.log | tail -50

# 모두 통과하면 마지막 상태 확인
git log --oneline -15
git status --short | head -20
```

---

## Phase 8: 남은 추적되지 않은 파일(`??`) 처리

`git status --short | grep '^??'` 로 남은 것들을 확인하고 선별적으로 처리:

| 파일                                                | 처리                                  |
| --------------------------------------------------- | ------------------------------------- |
| `apps/web/.gitignore`                               | (Phase 2에서 이미 커밋됐어야 함)      |
| `apps/web/src/app/api/debug-session/`               | Phase 7-2 포함                        |
| `apps/web/src/app/api/dev-login/`                   | Phase 7-2 포함                        |
| `apps/web/src/app/api/quick-add-channel/`           | Phase 7-2 포함                        |
| `apps/web/src/components/landing/`                  | Phase 6-6 포함                        |
| `apps/web/src/components/shared/error-boundary.tsx` | Phase 6-6 포함                        |
| `apps/web/src/hooks/useRecordKeyword.ts`            | Phase 5 포함                          |
| `scripts/seed-neon.ts`                              | Phase 3 포함                          |
| `docs/*` 14개                                       | Phase 1 포함                          |
| `.backup/`                                          | gitignore 되어 있어야 함 (추적 안 됨) |

Phase 1-7이 다 끝나면 `git status` 는 깨끗해야 한다. 뭔가 남아있다면 그 파일은 **의도되지 않은 파일**일 가능성이 높으니 개별 판단.

---

## Phase 9: 푸시 (선택)

```bash
# 원격 상태 확인 (pull 필요 여부)
git fetch origin
git log --oneline origin/master..HEAD   # 로컬이 원격보다 앞선 커밋 목록
git log --oneline HEAD..origin/master   # 원격이 로컬보다 앞선 커밋 (보통 0)

# 원격이 앞서있으면 pull (rebase 대신 merge 권장 — 이 repo는 이미 merge 히스토리 있음)
# git pull --no-rebase origin master

# 푸시
git push origin master
```

---

## 실패 복구 시나리오

### 시나리오 A: Phase 4 (백엔드) typecheck 실패

```bash
# 가장 최근 커밋만 되돌리기 (HEAD~1 로 소프트 리셋, 변경 사항은 워킹트리로 돌아옴)
git reset --soft HEAD~1
# 워킹트리에서 수정 → 재커밋
```

### 시나리오 B: Phase 7 (페이지) 빌드 실패

```bash
# 페이지 관련 커밋만 여러 개면 범위 리셋
git log --oneline -10   # 어디까지 되돌릴지 확인
git reset --soft HEAD~3   # 예: 최근 3개 커밋만 되돌림
```

### 시나리오 C: 뭔가 완전히 꼬임

```bash
# tar 백업으로 완전 복원 (최후 수단)
cd /tmp
mkdir -p x2-restore
cd x2-restore
tar xzf /path/to/C/dev/cream/X2/.backup/wip-snapshot-2026-04-06.tgz
# 내용 확인 후 필요한 파일만 수동 복사
```

---

## 요약 체크리스트

- [ ] **Phase 0**: 인덱스 정리 (`git reset HEAD`)
- [ ] **Phase 1**: 문서 커밋 (268 파일) → status 394→126
- [ ] **Phase 2**: 설정 커밋 (9 파일) + `pnpm install`
- [ ] **Phase 3**: 스크립트/워커 커밋 (2 파일)
- [ ] **Phase 4**: 백엔드 패키지 커밋 (18 파일) + `pnpm typecheck` ✅
- [ ] **Phase 5**: 웹앱 공용 커밋 (25 파일)
- [ ] **Phase 6-1~6-6**: 컴포넌트 6개 커밋 분할
- [ ] **Phase 7-1~7-5**: 페이지 5개 커밋 분할 + `pnpm build` ✅
- [ ] **Phase 8**: 남은 파일 선별 처리
- [ ] **Phase 9**: 푸시 (선택, 대표님 확인 후)

---

## 터미널 Claude Code 사용법

이 문서를 터미널 Claude Code에 넘길 때:

```
"docs/COMMIT_PLAN_2026-04-06.md 를 읽고 Phase 0부터 순서대로 집행해줘.
각 Phase가 끝날 때마다 결과를 보여주고, 실패하면 멈춰서 물어봐.
docs/P0_BLOCKER_DIAGNOSIS_2026-04-06.md 도 먼저 읽어서 맥락 파악해."
```

---

## 이 문서의 한계

- 이 계획은 **2026-04-06 15:57 시점의 워킹카피 상태**를 기준으로 작성됐어요. 그 이후 터미널 세션이 추가 변경을 만들었다면 파일 수와 분류가 달라질 수 있어요.
- 실행 전에 `git status --short | wc -l` 로 현재 수를 확인하고, 394에서 크게 벗어나면 이 문서를 한 번 더 갱신해주세요.
- Phase 분할은 **제안**입니다. 터미널 Claude Code가 실제 diff를 보고 더 좋은 분할을 발견하면 그쪽을 따라도 됩니다.
- 가장 중요한 건 "커밋 단위가 작고, 각 단위가 빌드를 깨지 않는 것"이에요.
