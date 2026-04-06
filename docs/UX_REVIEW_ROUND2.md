# UX Review Round 2

**Date**: 2026-04-02
**Scope**: Landing, Login, Dashboard, Channels (list/detail/new), Comments pages
**Criteria**: UX Writing (Korean 해요체), Information hierarchy, Empty/Error states, Button labels, Placeholder text, Consistency, User-friendliness

---

## Summary

| Severity | Found | Fixed |
| -------- | ----- | ----- |
| HIGH     | 2     | 2     |
| MEDIUM   | 13    | 13    |
| LOW      | 4     | 0     |

---

## HIGH Issues (Fixed)

### H-1. Landing page CTA links to dev-only endpoint

- **File**: `apps/web/src/app/page.tsx` (lines 40, 244)
- **Before**: `href="/api/dev-login"`
- **After**: `href="/login"`
- **Reason**: Public landing page CTA was pointing to a development-only API endpoint. Real users would bypass authentication or hit an error.

### H-2. Channel detail error exposes developer jargon (.env.local)

- **File**: `apps/web/src/app/(dashboard)/channels/[id]/channel-detail-view.tsx` (line 443)
- **Before**: `API 키가 설정되지 않았습니다. .env.local 파일에 ${envVar}를 추가해주세요.`
- **After**: `플랫폼 연동 설정이 완료되지 않았어요. 관리자에게 문의해 주세요.`
- **Reason**: End users should never see `.env.local` or environment variable names. Error messages must guide users to a recoverable action.

---

## MEDIUM Issues (Fixed)

### M-1. Landing page uses "SEO/AEO" English jargon

- **File**: `apps/web/src/app/page.tsx` (line 193)
- **Before**: `SEO/AEO 담당자`
- **After**: `검색 최적화 담당자`

### M-2. Login page uses 합니다체 instead of 해요체

- **File**: `apps/web/src/app/(auth)/login/page.tsx` (line 63)
- **Before**: `에 동의합니다.`
- **After**: `에 동의하게 돼요.`

### M-3. Channels list "분석 모드" filter uses developer jargon

- **File**: `apps/web/src/app/(dashboard)/channels/channels-list-view.tsx` (lines 25-28)
- **Before**: `URL 기본` / `API 고급` / `수동`
- **After**: `기본 분석` / `고급 분석` / `수동 입력`

### M-4. Channels list table header "모드" is unclear

- **File**: `apps/web/src/app/(dashboard)/channels/channels-list-view.tsx` (line 202)
- **Before**: `모드`
- **After**: `분석 방식`

### M-5. Channels list filter dropdown label mismatch

- **File**: `apps/web/src/app/(dashboard)/channels/channels-list-view.tsx` (line 134)
- **Before**: `전체 모드`
- **After**: `전체 분석 방식`

### M-6. Channel detail all error/status messages use 합니다체

- **File**: `apps/web/src/app/(dashboard)/channels/[id]/channel-detail-view.tsx` (multiple lines)
- **Before**: `데이터 수집에 실패했습니다.` / `데이터 수집 중입니다` / etc.
- **After**: All converted to 해요체 (`실패했어요`, `수집하고 있어요`, etc.)

### M-7. Channel new page placeholder has English "Substack"

- **File**: `apps/web/src/app/(dashboard)/channels/new/page.tsx` (line 510)
- **Before**: `예: 네이버 블로그, Substack...`
- **After**: `예: 네이버 블로그, 브런치, 티스토리...`

### M-8. Channel new page placeholder uses English "Enter"

- **File**: `apps/web/src/app/(dashboard)/channels/new/page.tsx` (line 569)
- **Before**: `태그를 입력하고 Enter`
- **After**: `태그를 입력하고 엔터를 누르세요`

### M-9. Channel new page error messages use 합니다체

- **File**: `apps/web/src/app/(dashboard)/channels/new/page.tsx` (lines 263, 273)
- **Before**: `등록에 실패했습니다.` / `채널 등록 중 오류가 발생했습니다.`
- **After**: `등록에 실패했어요. 다시 시도해 주세요.` / `채널 등록 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.`

### M-10. Comments page empty state uses 합니다체

- **File**: `apps/web/src/app/(dashboard)/comments/page.tsx` (lines 163-165)
- **Before**: `아직 수집된 댓글이 없습니다` / `확인할 수 있습니다`
- **After**: `아직 수집된 댓글이 없어요` / `확인할 수 있어요`

### M-11. Dashboard error messages use 합니다체

- **File**: `apps/web/src/app/(dashboard)/dashboard/dashboard-view.tsx` (lines 125, 129)
- **Before**: `채널 등록에 실패했습니다.` / `네트워크 오류가 발생했습니다.`
- **After**: `채널 등록에 실패했어요.` / `네트워크 오류가 발생했어요. 인터넷 연결을 확인해 주세요.`

### M-12. Channel detail competitive analysis CTA uses 합니다체

- **File**: `apps/web/src/app/(dashboard)/channels/[id]/channel-detail-view.tsx` (line 396)
- **Before**: `이 채널과 경쟁 채널을 비교하여 성장 기회와 전략적 인사이트를 발견하세요.`
- **After**: `이 채널과 경쟁 채널을 비교해서 성장 기회와 전략적 인사이트를 발견해 보세요.`

### M-13. ko.json translation file: systemic 합니다체 inconsistency

- **File**: `apps/web/src/messages/ko.json` (40+ lines)
- **Before**: All description, guide, tooltip, empty state strings used 합니다체
- **After**: All converted to 해요체 for consistency across the entire application

---

## LOW Issues (Not Fixed - Report Only)

### L-1. Landing page footer links are dead

- **File**: `apps/web/src/app/page.tsx` (lines 265-270)
- **Current**: `href="#"` for "이용약관" and "개인정보처리방침"
- **Suggestion**: Link to actual policy pages (`/terms`, `/privacy`) or remove until pages exist.

### L-2. Channel detail chart legend "참여율 %" is redundant

- **File**: `apps/web/src/app/(dashboard)/channels/[id]/channel-detail-view.tsx` (line 254)
- **Current**: `name="참여율 %"` — the `%` is redundant since values already display as percentages
- **Suggestion**: Change to `name="참여율"`

### L-3. Login dev email visible in dev login section

- **File**: `apps/web/src/app/(auth)/login/page.tsx` (line 31)
- **Current**: `빠른 개발자 로그인 (dev@x2.local)` — English email domain visible
- **Note**: This is dev-only (gated by `AUTH_DEV_LOGIN`), so low severity.

### L-4. Channel new page advanced section uses jargon labels

- **File**: `apps/web/src/app/(dashboard)/channels/new/page.tsx` (lines in advanced collapsed section)
- **Current**: Analysis mode labels like "URL 기본분석", "API 고급분석" are still developer-oriented
- **Note**: These are hidden behind "고급 설정 (선택사항)" collapse, so typical users won't see them.

---

## Page-by-Page Assessment

### 1. Landing Page (`apps/web/src/app/page.tsx`)

- **Overall**: Good. Clear hero message, well-structured hub cards, compelling CTAs.
- **Information hierarchy**: Strong. Hero -> Hub cards -> How it works -> Use cases -> CTA footer
- **Empty states**: N/A (static page)
- **Score**: 9/10 after fixes

### 2. Login Page (`apps/web/src/app/(auth)/login/page.tsx` + `login-form.tsx`)

- **Overall**: Clean flow. Social login buttons are clear with Korean labels.
- **Information hierarchy**: Good. Logo -> Social buttons -> Dev login (conditional) -> Sign up link
- **Score**: 8/10 after fixes

### 3. Dashboard (`apps/web/src/app/(dashboard)/dashboard/dashboard-view.tsx`)

- **Overall**: Excellent. Welcome message is warm and action-oriented.
- **Quick start cards**: Clear descriptions with Korean labels
- **Channel summary**: Useful with warning state for no channels
- **Score**: 9/10 after fixes

### 4. Channels List (`apps/web/src/app/(dashboard)/channels/page.tsx` + `channels-list-view.tsx`)

- **Overall**: Good table structure. Filters are comprehensive.
- **Empty state**: Friendly with clear CTA to add first channel
- **Table headers**: Clear Korean labels
- **Score**: 8/10 after fixes

### 5. Channel Detail (`apps/web/src/app/(dashboard)/channels/[id]/channel-detail-view.tsx`)

- **Overall**: Rich detail view with KPIs, charts, insights, and actions.
- **New channel banner**: Well-handled with sync button and progress indicator
- **Error states**: Now properly user-friendly after fixing developer jargon
- **Score**: 8/10 after fixes

### 6. Channel New (`apps/web/src/app/(dashboard)/channels/new/page.tsx`)

- **Overall**: Good URL-first approach. Auto-detection is helpful.
- **Form labels**: Clear and descriptive
- **Step guide sidebar**: Excellent onboarding aid
- **Score**: 8/10 after fixes

### 7. Comments Page (`apps/web/src/app/(dashboard)/comments/page.tsx`)

- **Overall**: Comprehensive dashboard with KPIs, sentiment/topic charts, risk comments.
- **Empty state**: Clear and actionable
- **Chart labels**: All in Korean
- **Score**: 9/10 after fixes

---

## Systemic Findings

1. **합니다체 vs 해요체 inconsistency** was the most pervasive issue. The `ko.json` translation file and all inline strings have been unified to 해요체.

2. **Error messages** were generally too terse and sometimes developer-oriented. Fixed to include recovery guidance ("다시 시도해 주세요", "관리자에게 문의해 주세요").

3. **Developer jargon** leaking into user-facing UI (`.env.local`, `API`, `URL 기본`, `모드`) has been cleaned up in user-visible contexts.

---

---

# UX Review Round 2 - Part 2 (확장 페이지)

**Review date:** 2026-04-02
**Scope:** Listening Hub, Intelligence, Competitors, GEO/AEO, Intent, Pathfinder, Persona, Cluster Finder, Settings, Notifications, Sidebar

---

## Summary (Part 2)

| Severity | Found | Fixed |
| -------- | ----- | ----- |
| HIGH     | 5     | 5     |
| MEDIUM   | 31    | 31    |
| LOW      | 6     | 0     |

---

## 1. Listening Hub (`apps/web/src/app/(dashboard)/listening-hub/page.tsx`)

### FIXED

| #   | Line | Severity | Current                                                  | Fixed                                                                              | Reason                                           |
| --- | ---- | -------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | 85   | HIGH     | `검색 인텔리전스 기반 통합 분석 — 의도 → 클러스터 → ...` | `키워드 하나로 의도, 클러스터, 검색 경로, 페르소나, 인사이트를 한눈에 파악하세요.` | 개발자 용어, 화살표 나열은 첫 방문자가 이해 불가 |
| 2   | 64   | HIGH     | `분석 실패 (${res.status}): ${body.slice(0, 200)}`       | `분석에 실패했어요. 잠시 후 다시 시도해 주세요.`                                   | HTTP status code와 raw body 노출                 |
| 3   | 60   | MEDIUM   | `세션이 만료되었습니다.`                                 | `세션이 만료되었어요.`                                                             | 합니다체 -> 해요체                               |
| 4   | 72   | MEDIUM   | `알 수 없는 오류가 발생했습니다`                         | `알 수 없는 오류가 발생했어요`                                                     | 합니다체 -> 해요체                               |

### LOW (미수정)

| #   | Line | Current                           | Suggestion                   | Reason                               |
| --- | ---- | --------------------------------- | ---------------------------- | ------------------------------------ |
| 5   | 96   | `분석할 시드 키워드를 입력하세요` | `분석할 키워드를 입력하세요` | "시드 키워드"는 일반 사용자에게 생소 |

---

## 2. Intelligence (`apps/web/src/app/(dashboard)/intelligence/page.tsx`)

### FIXED

| #   | Line | Severity | Current                       | Fixed                         | Reason    |
| --- | ---- | -------- | ----------------------------- | ----------------------------- | --------- |
| 6   | 53   | HIGH     | `label: "F&B"`                | `label: "식음료"`             | 영어 약어 |
| 7   | 482  | MEDIUM   | `A/B 비교`                    | `비교 분석`                   | 영어 용어 |
| 8   | 737  | MEDIUM   | `아직 분석 이력이 없습니다`   | `아직 분석 이력이 없어요`     | 합니다체  |
| 9   | 894  | MEDIUM   | `부분 데이터 기반 분석입니다` | `부분 데이터 기반 분석이에요` | 합니다체  |

---

## 3. Competitors

### `page.tsx` - FIXED

| #   | Line | Severity | Current               | Fixed               |
| --- | ---- | -------- | --------------------- | ------------------- |
| 10  | 203  | MEDIUM   | `확인할 수 있습니다.` | `확인할 수 있어요.` |

### `add/page.tsx` - FIXED

| #   | Line | Severity | Current                                      | Fixed                                               |
| --- | ---- | -------- | -------------------------------------------- | --------------------------------------------------- |
| 11  | 200  | MEDIUM   | `placeholder="https://youtube.com/@channel"` | `채널 URL을 붙여넣으세요 (예: youtube.com/@채널명)` |

### `compare/page.tsx` - FIXED

| #   | Line | Severity | Current       | Fixed       |
| --- | ---- | -------- | ------------- | ----------- |
| 12  | 76   | MEDIUM   | `비교합니다.` | `비교해요.` |

### LOW (미수정)

| #   | File         | Line | Current                  | Suggestion                   |
| --- | ------------ | ---- | ------------------------ | ---------------------------- |
| 13  | add/page.tsx | 286  | `{ct.labelEn}` prop name | prop 이름을 `label`로 리네임 |

---

## 4. GEO/AEO (`apps/web/src/app/(dashboard)/geo-aeo/page.tsx`)

### FIXED

| #   | Line    | Severity | Current                                         | Fixed                                     | Reason              |
| --- | ------- | -------- | ----------------------------------------------- | ----------------------------------------- | ------------------- |
| 14  | 201     | HIGH     | `GEO / AEO`                                     | `AI 검색 가시성`                          | 영어 전문 용어      |
| 15  | 632-635 | HIGH     | `구조 (Structure)`, `답변성 (Answerability)` 등 | `구조`, `답변성`, `신뢰도`, `인용 준비도` | 영어 괄호 표기      |
| 16  | 382     | MEDIUM   | `{kw.status}` (raw "ACTIVE")                    | `추적 중` / `일시정지`                    | 영어 enum 직접 노출 |
| 17  | 170     | MEDIUM   | `GEO 점수 분석`                                 | `최적화 점수 분석`                        | 영어 약어           |
| 18  | 627     | MEDIUM   | `종합 GEO 점수`                                 | `종합 최적화 점수`                        | 영어 약어           |
| 19  | 658     | MEDIUM   | `GEO/AEO 최적화 점수를`                         | `AI 검색 최적화 점수를`                   | 영어 약어           |
| 20  | 554     | MEDIUM   | `GEO 최적화` (테이블 헤더)                      | `최적화 여부`                             | 영어 약어           |
| 21  | 612     | MEDIUM   | `실패했습니다.`                                 | `실패했어요.`                             | 합니다체            |
| 22  | 661     | MEDIUM   | `평가합니다`                                    | `평가해요`                                | 합니다체            |
| 23  | 131     | MEDIUM   | `실패했습니다.`                                 | `실패했어요.`                             | 합니다체            |

### LOW (미수정)

| #   | Line | Current                          | Suggestion                 |
| --- | ---- | -------------------------------- | -------------------------- |
| 24  | 392  | `title="Perplexity 스냅샷 수집"` | `title="최신 데이터 수집"` |

---

## 5. Intent (`apps/web/src/app/(dashboard)/intent/page.tsx`)

### FIXED

| #   | Line    | Severity | Current                                        | Fixed                    |
| --- | ------- | -------- | ---------------------------------------------- | ------------------------ |
| 25  | 657     | HIGH     | `{trend}` ("rising"/"stable"/"declining" 영어) | `상승` / `하락` / `유지` |
| 26  | 644     | MEDIUM   | `HOT` (영어 배지)                              | `급상승`                 |
| 27  | 532     | MEDIUM   | `Gap`                                          | `갭`                     |
| 28  | 289     | MEDIUM   | `분석 실패:`                                   | `분석에 실패했어요:`     |
| 29  | 133     | MEDIUM   | `분석 결과가 없습니다.`                        | `분석 결과가 없어요.`    |
| 30  | 281     | MEDIUM   | `분석하고 있습니다...`                         | `분석하고 있어요...`     |
| 31  | 299-300 | MEDIUM   | `분석합니다` / `확인할 수 있습니다`            | 해요체로 변환            |
| 32  | 243     | MEDIUM   | `자동 분류합니다.`                             | `자동 분류해요.`         |

---

## 6. Pathfinder (`apps/web/src/app/(dashboard)/pathfinder/page.tsx`)

### FIXED

| #   | Line | Severity | Current                                          | Fixed                |
| --- | ---- | -------- | ------------------------------------------------ | -------------------- |
| 33  | 539  | MEDIUM   | `시각화합니다` / `보여줍니다`                    | 해요체로 변환        |
| 34  | 577  | MEDIUM   | `분석하고 있습니다...`                           | `분석하고 있어요...` |
| 35  | 586  | MEDIUM   | `시각화합니다` / `보여줍니다`                    | 해요체로 변환        |
| 36  | 671  | MEDIUM   | `확인할 수 있습니다` / `확대/축소할 수 있습니다` | 해요체로 변환        |

---

## 7. Persona (`apps/web/src/app/(dashboard)/persona/page.tsx`)

### FIXED

| #   | Line  | Severity | Current                            | Fixed                 |
| --- | ----- | -------- | ---------------------------------- | --------------------- |
| 37  | 97-98 | MEDIUM   | `분석합니다` / `세분화합니다`      | 해요체로 변환         |
| 38  | 136   | MEDIUM   | `분석하고 있습니다...`             | `분석하고 있어요...`  |
| 39  | 144   | MEDIUM   | `분류합니다`                       | `분류해요`            |
| 40  | 292   | MEDIUM   | `신뢰도가 낮습니다` / `향상됩니다` | `낮아요` / `높아져요` |

---

## 8. Cluster Finder (`apps/web/src/app/(dashboard)/cluster-finder/page.tsx`)

### FIXED

| #   | Line    | Severity | Current                               | Fixed                            |
| --- | ------- | -------- | ------------------------------------- | -------------------------------- |
| 41  | 314     | MEDIUM   | `GPT 분석을 실행할 수 있습니다`       | `AI 분석을 실행할 수 있어요`     |
| 42  | 492-497 | MEDIUM   | `GPT 분석 중...` / `GPT 종합 분석`    | `AI 분석 중...` / `AI 종합 분석` |
| 43  | 345     | MEDIUM   | `GPT 분석 실패:`                      | `AI 분석에 실패했어요:`          |
| 44  | 520     | MEDIUM   | `GPT 분석 결과:`                      | `AI 분석 결과:`                  |
| 45  | 132     | MEDIUM   | `GPT 분석 결과가 없습니다.`           | `AI 분석 결과가 없어요.`         |
| 46  | 142-143 | MEDIUM   | `가시화합니다` / `파악할 수 있습니다` | 해요체로 변환                    |
| 47  | 180     | MEDIUM   | `클러스터링하고 있습니다...`          | `있어요...`                      |
| 48  | 188-189 | MEDIUM   | `그룹핑합니다` / `분석합니다`         | 해요체로 변환                    |
| 49  | 267,280 | MEDIUM   | `탐색합니다` / `표현합니다`           | 해요체로 변환                    |

---

## 9. Settings (`apps/web/src/app/(dashboard)/settings/page.tsx`)

### FIXED

| #   | Line | Severity | Current                 | Fixed                 |
| --- | ---- | -------- | ----------------------- | --------------------- |
| 50  | 121  | MEDIUM   | `슬러그`                | `고유 주소`           |
| 51  | 37   | MEDIUM   | `설정이 저장되었습니다` | `설정이 저장되었어요` |
| 52  | 43   | MEDIUM   | `저장에 실패했습니다`   | `저장에 실패했어요`   |

### LOW (미수정)

| #   | Line | Current      | Suggestion                           |
| --- | ---- | ------------ | ------------------------------------ |
| 53  | 187  | `tc("save")` | 번역 파일에서 `저장하기`로 확인 필요 |

---

## 10. Notifications (`apps/web/src/app/(dashboard)/notifications/page.tsx`)

전체적으로 해요체가 잘 적용되어 있고, empty/error state가 친절하게 구성됨.

### LOW (미수정)

| #   | Line | Current                                | Suggestion                     |
| --- | ---- | -------------------------------------- | ------------------------------ |
| 54  | 383  | `.replace("Intelligence Alert: ", "")` | 서버에서 한국어 제목 생성 권장 |

---

## 11. Sidebar + Constants

### Constants (`apps/web/src/lib/constants.ts`) - FIXED

| #   | Line | Severity | Current                                         | Fixed                               |
| --- | ---- | -------- | ----------------------------------------------- | ----------------------------------- |
| 55  | 2    | MEDIUM   | `"Social Media Analytics & Listening Platform"` | `소셜 미디어 분석 및 리스닝 플랫폼` |

사이드바는 `useTranslations`로 i18n 키 기반이므로 번역 파일에서 관리.

---

## Cross-cutting Observations (Part 2)

1. **합니다체 잔존**: 모든 페이지에서 `합니다/입니다` 체가 산발적으로 남아있었음. 총 31건 교정.
2. **영어 기술 용어 노출**: `F&B`, `GEO/AEO`, `GPT`, `A/B`, `HOT`, `Gap`, `Structure`, `Answerability`, `ACTIVE` 등 12건 교정.
3. **HTTP 에러 코드 노출**: listening-hub에서 raw HTTP status + response body를 사용자에게 그대로 노출하는 보안/UX 이슈 교정.
4. **Empty state 품질**: 전체적으로 actionable하고 친절하게 구성되어 있어 양호.
5. **일관성**: 모든 페이지에서 `분석 시작` / `분석 중...` 패턴이 일관되게 사용됨.
