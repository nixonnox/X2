# UI/UX Writing Compliance Report - Korean Language Enforcement

**Date:** 2026-04-02
**Scope:** `apps/web/src/app/`, `apps/web/src/components/`, `apps/web/src/features/`

## Summary

Full pass across 179 `.tsx` files to find and fix remaining English strings in user-facing UI elements. Most of the codebase was already in Korean, with a few scattered English words remaining in labels, status text, and mixed-language strings.

## Changes Made

### 1. `apps/web/src/components/insights/strategy-timeline.tsx`

| Line | Before      | After        |
| ---- | ----------- | ------------ |
| 80   | `Impact:`   | `영향도:`    |
| 84   | `Effort:`   | `난이도:`    |
| 92   | `Actions`   | `실행 항목`  |
| 111  | `Expected:` | `기대 효과:` |

### 2. `apps/web/src/components/comments/risk-comment-card.tsx`

| Line | Before               | After         |
| ---- | -------------------- | ------------- |
| 34   | `High-Risk Comments` | `고위험 댓글` |

### 3. `apps/web/src/app/(dashboard)/admin/ai/page.tsx`

| Line           | Before                    | After                    |
| -------------- | ------------------------- | ------------------------ |
| 82 (mock data) | `"Mock (개발용)"`         | `"모의 (개발용)"`        |
| 194            | `Mock 응답이 사용됩니다`  | `모의 응답이 사용됩니다` |
| 242            | `Mock 응답이 사용됩니다`  | `모의 응답이 사용됩니다` |
| 254            | `AI Provider 상태`        | `AI 제공자 상태`         |
| 282            | `Provider 연결 상태는`    | `제공자 연결 상태는`     |
| 336            | `Provider` (table header) | `제공자`                 |

### 4. `apps/web/src/app/(dashboard)/admin/ai/logs/page.tsx`

| Line | Before                    | After    |
| ---- | ------------------------- | -------- |
| 220  | `Provider` (table header) | `제공자` |

### 5. `apps/web/src/app/(dashboard)/settings/page.tsx`

| Line | Before                  | After                      |
| ---- | ----------------------- | -------------------------- |
| 10   | `value: "My Workspace"` | `value: "내 워크스페이스"` |
| 11   | `label: "Slug"`         | `label: "슬러그"`          |

### 6. `apps/web/src/app/(dashboard)/vertical-preview/page.tsx`

| Line | Before                | After              |
| ---- | --------------------- | ------------------ |
| 541  | `Mock 데이터 기반`    | `모의 데이터 기반` |
| 589  | `Stale 데이터`        | `오래된 데이터`    |
| 598  | `Mock 데이터` (badge) | `모의 데이터`      |

### 7. `apps/web/src/features/vertical-preview/components/VerticalPreviewStatePanel.tsx`

| Line | Before                                   | After                              |
| ---- | ---------------------------------------- | ---------------------------------- |
| 62   | `Mock 데이터 기반`                       | `모의 데이터 기반`                 |
| 65   | `Stale 데이터`                           | `오래된 데이터`                    |
| 68   | `Partial 데이터`                         | `부분 데이터`                      |
| 84   | `Beauty / F&B / Finance / Entertainment` | `뷰티 / F&B / 금융 / 엔터테인먼트` |

### 8. `apps/web/src/app/landing.tsx`

| Line | Before | After  |
| ---- | ------ | ------ |
| 130  | `Beta` | `베타` |

### 9. `apps/web/src/app/(dashboard)/admin/pipeline/page.tsx`

| Line | Before                           | After                        |
| ---- | -------------------------------- | ---------------------------- |
| 94   | `PostgreSQL (X tables)`          | `PostgreSQL (X개 테이블)`    |
| 96   | `Worker 실행 중` / `Worker 중지` | `워커 실행 중` / `워커 중지` |
| 166  | `Worker가 실행되지 않고`         | `워커가 실행되지 않고`       |
| 167  | `Intelligence 허브에서`          | `인텔리전스 허브에서`        |

### 10. `apps/web/src/components/collection/collection-settings-panel.tsx`

| Line | Before               | After                |
| ---- | -------------------- | -------------------- |
| 48   | `Mock 데이터로 수집` | `모의 데이터로 수집` |
| 87   | `Mock 커넥터로`      | `모의 커넥터로`      |
| 108  | `Mock 폴백`          | `모의 폴백`          |
| 111  | `Mock 데이터 사용`   | `모의 데이터 사용`   |

## Intentionally Unchanged

The following English text was reviewed and intentionally left as-is:

| Pattern                                                          | Reason                                     |
| ---------------------------------------------------------------- | ------------------------------------------ |
| `YouTube`, `Instagram`, `TikTok`, `X`                            | Platform brand names                       |
| `Claude`, `OpenAI`, `Anthropic`                                  | AI provider brand names                    |
| `Redis`, `PostgreSQL`                                            | Infrastructure product names               |
| `API`, `URL`, `OAuth`, `GEO`, `AEO`, `GPT`, `SERP`, `FAQ`, `F&B` | Technical acronyms commonly used in Korean |
| `name@company.com`                                               | Email format placeholder                   |
| `https://example.com/webhook`                                    | URL format placeholder                     |
| Variable names (`isStaleBased`, `isPartial`, etc.)               | Code identifiers                           |
| CSS class names                                                  | Styling identifiers                        |
| Import paths                                                     | Module references                          |
| Comments (`// ...`, `{/* ... */}`)                               | Developer-facing only                      |
| `console.log` / `console.error` messages                         | Developer-facing only                      |
| i18n keys (`t("someKey")`)                                       | Translation system references              |
| `.replace("Intelligence Alert: ", "")`                           | Data processing logic, not display text    |

## Methodology

1. Searched all 179 `.tsx` files under `apps/web/src/app/`, `apps/web/src/components/`, and `apps/web/src/features/`
2. Used regex patterns for: button/link text, status labels, empty states, common UI text, placeholders, table headers, section titles, and mixed English-Korean strings
3. Manually reviewed each match to distinguish user-facing text from code identifiers, brand names, and technical terms
4. Applied Korean translations using 해요체 (polite form) where applicable
5. Preserved technical terms commonly used in Korean IT context (API, URL, etc.)
