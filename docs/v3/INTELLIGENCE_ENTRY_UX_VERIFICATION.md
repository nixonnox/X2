# Intelligence Entry UX Verification Report

> **Date**: 2026-03-15
> **Scope**: User entry flows, navigation paths, UX consistency across intelligence features
> **Status**: Partial Pass — 1 S0, 2 S2, 1 S3 issue identified

---

## 1. Verification Summary

| Area | Status | Notes |
|------|--------|-------|
| Sidebar navigation | PASS | All intelligence routes visible |
| Dashboard summary card | PASS | Keywords, warnings, action buttons |
| Quick keyword access | PASS | Click keyword → intelligence page |
| Compare link availability | PASS | Dashboard card + page header |
| Bell icon interaction | **FAIL** | Red dot shown, not clickable |
| Alert history | **WARN** | No past alert visibility |
| Breadcrumb navigation | **WARN** | Not implemented |
| Badge count accuracy | **MINOR** | Hardcoded, not dynamic |

---

## 2. Entry Flow Analysis

### 2.1 Sidebar Navigation

| Route | Label | Icon | Visible | Clickable | Navigates Correctly |
|-------|-------|------|---------|-----------|---------------------|
| `/intelligence` | Intelligence Hub | Brain | Yes | Yes | Yes |
| `/intelligence/compare` | A/B 비교 | GitCompare | Yes | Yes | Yes |
| `/vertical-preview` | Vertical Preview | LayoutGrid | Yes | Yes | Yes |

**Verification Details:**
- All three routes appear in the sidebar under the "Intelligence" section group.
- No feature flags, role checks, or conditional rendering gates these items.
- Active route highlighting works correctly — clicking "A/B 비교" highlights both the item and the parent group.
- Sidebar collapse state preserves icons and tooltips for all three routes.
- Mobile responsive sidebar (hamburger menu) includes all intelligence items.

### 2.2 Dashboard Summary Card

| Element | Present | Functional | Target |
|---------|---------|------------|--------|
| Keyword list (top 3) | Yes | Yes | Display only |
| Warning count badge | Yes | Yes (static) | No link |
| "분석 시작" button | Yes | Yes | `/intelligence` |
| "A/B 비교" link | Yes | Yes | `/intelligence/compare` |
| Empty state message | Yes | Yes | — |
| Loading skeleton | Yes | Yes | — |
| Error fallback | Yes | Yes | Retry button |

**Data Flow Verification:**

```
User lands on Dashboard
  └─ IntelligenceSummaryCard mounts
       └─ trpc.intelligence.keywords.useQuery({ take: 3, orderBy: 'analyzedAt desc' })
            ├─ Loading: Skeleton UI with 3 placeholder rows
            ├─ Error: "데이터를 불러올 수 없습니다" + retry button
            ├─ Empty: "아직 분석된 키워드가 없습니다" + "분석 시작" CTA
            └─ Data: keyword cards + warning badge + action buttons
```

### 2.3 Quick Keyword Access

| Action | Starting Point | Destination | State Passed |
|--------|---------------|-------------|--------------|
| Click keyword chip | Dashboard card | `/intelligence` | keyword query param (planned) |
| Click "분석 시작" | Dashboard card | `/intelligence` | None |
| Click "A/B 비교" | Dashboard card | `/intelligence/compare` | None |
| Click "A/B 비교" | Intelligence page header | `/intelligence/compare` | Current keyword (planned) |

**Note:** Keyword click currently navigates to `/intelligence` without passing the keyword as a query parameter. The intelligence page does not pre-fill the search box from URL params. This is a minor gap but does not block functionality — users simply re-enter the keyword.

### 2.4 Compare Link Availability

| Location | Link Text | Target | Visible When |
|----------|-----------|--------|-------------|
| Dashboard card footer | "A/B 비교" | `/intelligence/compare` | Keywords exist |
| Intelligence page header | "비교 분석" | `/intelligence/compare` | Always |
| Sidebar | "A/B 비교" | `/intelligence/compare` | Always |

Three distinct entry points to the comparison feature. All functional.

---

## 3. Issues Found

### Issue #1: Bell Icon Creates User Confusion

| Field | Value |
|-------|-------|
| **Title** | Users see red notification dot but cannot click it |
| **Severity** | ![S0](https://img.shields.io/badge/severity-S0-red) |
| **Description** | The top navigation bar renders a bell icon (`Bell` from lucide-react) with a red dot indicator. The red dot is rendered unconditionally (hardcoded `<span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />`). The bell has no `onClick`, no `onKeyDown`, no ARIA attributes, and no dropdown or popover component attached. |
| **Actual Impact** | Users see a persistent red dot suggesting unread notifications. Clicking the bell does nothing. This creates immediate confusion and erodes trust in the interface. Users may believe the app is broken or that they are missing important information. In usability testing, non-functional notification indicators consistently rank as a top frustration point. |
| **Quick Fix** | **N** — The fix requires building a `NotificationDropdown` component, a tRPC query endpoint for fetching notifications, read/unread state management, and dynamic badge counting. This is a multi-component feature, not a simple fix. |
| **Structural Fix** | **Y** — Full implementation plan: (1) `NotificationDropdown` component with virtualized list, (2) `trpc.notification.unreadCount` query for badge, (3) `trpc.notification.markRead` mutation, (4) Click-through routing to source context, (5) Remove hardcoded red dot, replace with dynamic `{unreadCount > 0 && <Badge />}`. |

### Issue #2: No History of Past Alerts

| Field | Value |
|-------|-------|
| **Title** | Dashboard card shows "이상 신호 없음" but no history of past alerts |
| **Severity** | ![S2](https://img.shields.io/badge/severity-S2-yellow) |
| **Description** | The `IntelligenceSummaryCard` warning count reflects only the most recent analysis run's signals. There is no "recent alerts" section, no alert timeline, and no way to see previously triggered alerts. The "이상 신호 없음" (no anomaly signals) message appears when the current top 3 keywords have no low-confidence or warning signals, regardless of historical alert activity. |
| **Actual Impact** | Users have no awareness of past alert activity. A keyword that triggered a `WARNING_SPIKE` yesterday shows no trace of that alert today if the current run is clean. Users cannot track alert patterns over time or verify that the system is actively monitoring. Historical context is lost at the presentation layer even though alert records exist in the database. |
| **Quick Fix** | **Y** — Add a "최근 알림" (recent alerts) section below the warning count that queries the last 5 notification records with `sourceType` matching intelligence conditions. |
| **Structural Fix** | **N** — A simple query addition to the existing card component. No architectural change required. |

### Issue #3: No Breadcrumb or Back-Navigation

| Field | Value |
|-------|-------|
| **Title** | No breadcrumb or back-navigation from intelligence pages |
| **Severity** | ![S2](https://img.shields.io/badge/severity-S2-yellow) |
| **Description** | Intelligence sub-pages (`/intelligence/compare`, `/vertical-preview`) do not render a breadcrumb trail or a "back to Intelligence Hub" link. The only navigation options are the sidebar (which requires knowing the page hierarchy) and the browser's back button. |
| **Actual Impact** | Users navigating from Dashboard → Intelligence Hub → Compare → Vertical Preview lose spatial context. The page hierarchy is flat from a navigation perspective. Users unfamiliar with the sidebar structure may feel lost. This is particularly impactful on mobile where the sidebar is collapsed by default. |
| **Quick Fix** | **Y** — Add a `<Breadcrumb>` component to the intelligence layout that renders the current path: `대시보드 > Intelligence Hub > [current page]`. |
| **Structural Fix** | **N** — Breadcrumb implementation using Next.js layout segments is straightforward and does not require architectural changes. |

### Issue #4: Hardcoded Notification Badge

| Field | Value |
|-------|-------|
| **Title** | Alert badge count on bell icon is always shown (hardcoded dot), not dynamic |
| **Severity** | ![S3](https://img.shields.io/badge/severity-S3-grey) |
| **Description** | The red dot on the bell icon is a hardcoded `<span>` element that renders unconditionally. It does not query the notification table for unread count. It does not change appearance based on alert state. It is always visible, always red, and always the same size. |
| **Actual Impact** | The badge provides zero information. It does not distinguish between "0 unread" and "50 unread." Users cannot use the visual indicator to gauge alert urgency. The always-on dot may cause "notification fatigue" where users learn to ignore the indicator entirely, reducing the effectiveness of future real notifications. |
| **Quick Fix** | **Y** — Replace the hardcoded span with a conditional render: `{unreadCount > 0 && <Badge count={unreadCount} />}`. Requires a `trpc.notification.unreadCount` query (which is also needed for S0 #1). |
| **Structural Fix** | **N** — This is a UI-only change once the query endpoint exists. Part of the S0 #1 fix scope. |

---

## 4. Severity Distribution

| Severity | Count | Items |
|----------|-------|-------|
| ![S0](https://img.shields.io/badge/severity-S0-red) | 1 | Bell icon non-functional |
| ![S1](https://img.shields.io/badge/severity-S1-orange) | 0 | — |
| ![S2](https://img.shields.io/badge/severity-S2-yellow) | 2 | No alert history, no breadcrumbs |
| ![S3](https://img.shields.io/badge/severity-S3-grey) | 1 | Hardcoded badge dot |

---

## 5. Entry Point Coverage Map

| User Goal | Entry Point | Steps | Friction Points |
|-----------|-------------|-------|-----------------|
| "I want to analyze a keyword" | Sidebar → Intelligence Hub | 1 click | None |
| "I want to analyze a keyword" | Dashboard → "분석 시작" | 1 click | None |
| "I want to compare keywords" | Sidebar → A/B 비교 | 1 click | None |
| "I want to compare keywords" | Dashboard → "A/B 비교" | 1 click | None |
| "I want to compare keywords" | Intelligence page → header link | 2 clicks | None |
| "I want to see vertical insights" | Sidebar → Vertical Preview | 1 click | None |
| "I want to check my alerts" | Top bar → bell icon | 1 click | **BLOCKED** (S0) |
| "I want to see past alerts" | (no entry point) | — | **NO PATH** (S2) |
| "I want to go back to hub" | Browser back button | 1 click | No breadcrumb (S2) |

---

## 6. Navigation Flow Diagram

```
┌──────────────────────────────────────────────────────┐
│                     Top Bar                          │
│  [Logo]  [Search]  [Bell ●]  [Profile]               │
│                      ▲                               │
│                      │ BLOCKED (S0: no onClick)      │
└──────────────────────┼───────────────────────────────┘
                       │
┌──────────┐    ┌──────┴──────┐    ┌──────────────────┐
│ Sidebar  │    │  Dashboard  │    │  Intelligence     │
│          │    │             │    │  Hub              │
│ • Hub ───┼────┤ Summary     │    │                   │
│ • Compare┼────┤ Card        ├────► /intelligence     │
│ • Vert.  │    │ • 분석 시작 ├────► /intelligence     │
│          │    │ • A/B 비교  ├────► /compare          │
│          │    │ • Keywords  │    │                   │
└──────────┘    └─────────────┘    └────────┬──────────┘
                                            │
                                   ┌────────▼──────────┐
                                   │  Compare Page     │
                                   │  /intelligence/   │
                                   │  compare          │
                                   │  (no breadcrumb)  │
                                   └────────┬──────────┘
                                            │
                                   ┌────────▼──────────┐
                                   │  Vertical Preview │
                                   │  /vertical-       │
                                   │  preview          │
                                   │  (no breadcrumb)  │
                                   └───────────────────┘
```

---

## 7. Accessibility Audit (Navigation-Related)

| Element | WCAG Criterion | Status | Notes |
|---------|---------------|--------|-------|
| Bell icon | 2.1.1 Keyboard | FAIL | No `onClick`, no `onKeyDown`, no `role="button"` |
| Bell icon | 4.1.2 Name/Role | FAIL | No `aria-label`, no `aria-haspopup` |
| Red dot badge | 1.4.1 Use of Color | FAIL | Color is the only indicator; no text alternative |
| Sidebar links | 2.4.7 Focus Visible | PASS | Focus ring visible on keyboard navigation |
| Dashboard card buttons | 2.4.7 Focus Visible | PASS | Focus ring visible |
| Breadcrumbs | 2.4.8 Location | FAIL | No breadcrumb navigation exists |

---

## 8. Recommendations

| Priority | Action | Effort | Dependencies |
|----------|--------|--------|-------------|
| P0 | Build `NotificationDropdown` + dynamic badge | 2-3 days | tRPC endpoint |
| P2 | Add recent alerts section to dashboard card | 3 hours | notification query |
| P2 | Implement breadcrumb component in intelligence layout | 2 hours | None |
| P3 | Replace hardcoded dot with conditional badge | 30 min | P0 completion |
| P3 | Pass keyword query param on click-through | 1 hour | None |
| P3 | Add ARIA attributes to bell icon | 30 min | P0 completion |

---

## 9. Mobile UX Notes

| Aspect | Desktop | Mobile | Gap |
|--------|---------|--------|-----|
| Sidebar access | Always visible | Hamburger toggle | Acceptable |
| Dashboard card | Full width | Stacked, full width | No gap |
| Bell icon | Top bar, always visible | Top bar, always visible | Same S0 issue |
| Breadcrumbs | Not present | Not present | Same S2 issue |
| Compare page | Side-by-side layout | Stacked cards | Acceptable |

No mobile-specific issues beyond the existing gaps that affect both viewports.

---

## 10. Test Scenarios for Verification

| # | Scenario | Expected | Current |
|---|----------|----------|---------|
| 1 | Click sidebar "Intelligence Hub" | Navigate to `/intelligence` | PASS |
| 2 | Click sidebar "A/B 비교" | Navigate to `/intelligence/compare` | PASS |
| 3 | Click sidebar "Vertical Preview" | Navigate to `/vertical-preview` | PASS |
| 4 | Click dashboard "분석 시작" | Navigate to `/intelligence` | PASS |
| 5 | Click dashboard "A/B 비교" | Navigate to `/intelligence/compare` | PASS |
| 6 | Click dashboard keyword chip | Navigate with keyword param | PARTIAL (no param) |
| 7 | Click bell icon | Open notification dropdown | FAIL |
| 8 | View bell badge | Show unread count | FAIL (hardcoded) |
| 9 | Navigate Compare → Hub | Breadcrumb or back link | FAIL |
| 10 | View dashboard with no keywords | Show empty state | PASS |
| 11 | View dashboard with warnings | Show warning count + badge | PASS |
| 12 | View dashboard after alerts cleared | Show "이상 신호 없음" | PASS (no history) |

---

*Report generated as part of Intelligence Entry UX verification cycle.*
*Companion reports: INTELLIGENCE_ENTRY_VERIFICATION_REPORT.md, INTELLIGENCE_ALERT_RUNTIME_VERIFICATION.md, ALERT_TRIGGER_AND_DELIVERY_GAP_LIST.md*
