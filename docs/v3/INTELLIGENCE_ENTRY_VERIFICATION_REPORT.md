# Intelligence Entry Verification Report

> **Date**: 2026-03-15
> **Scope**: Navigation entry points, sidebar rendering, dashboard card integration
> **Status**: Partial Pass — 1 S0, 1 S3 issue identified

---

## 1. Verification Summary

| Area | Status | Notes |
|------|--------|-------|
| NAV_SECTIONS intelligence routes | PASS | 3 routes confirmed |
| Sidebar dynamic rendering | PASS | No conditional hiding |
| IntelligenceSummaryCard in dashboard | PASS | Correctly placed |
| tRPC keyword query | PASS | Top 3 recent keywords |
| Warning count display | PASS | Low confidence + signal hints |
| Action buttons | PASS | "분석 시작" + "A/B 비교" |
| Empty state | PASS | Message shown when no keywords |
| Bell icon functionality | **FAIL** | Non-functional, no handler |
| Warning drilldown | **MINOR** | Count shown, no link to details |

---

## 2. Verified Correct Items

### 2.1 NAV_SECTIONS Configuration

| Route | Label | Icon | Present |
|-------|-------|------|---------|
| `/intelligence` | Intelligence Hub | Brain | Yes |
| `/intelligence/compare` | A/B Compare | GitCompare | Yes |
| `/vertical-preview` | Vertical Preview | LayoutGrid | Yes |

The `nav.intelligence` section in `NAV_SECTIONS` contains all 3 routes.
Route definitions match the page components and are correctly ordered in the sidebar group.

### 2.2 Sidebar Rendering

- The sidebar component iterates over `NAV_SECTIONS` dynamically.
- No `if` guard, feature flag, or conditional logic hides the intelligence section.
- The section renders identically for all authenticated users regardless of role.
- Active state highlighting works correctly when navigating between intelligence pages.

### 2.3 IntelligenceSummaryCard — Dashboard Integration

| Property | Expected | Actual | Match |
|----------|----------|--------|-------|
| Placement | `dashboard-view.tsx` | `dashboard-view.tsx` | Yes |
| Data source | `trpc.intelligence.keywords` | `trpc.intelligence.keywords` | Yes |
| Keyword limit | 3 | `take: 3, orderBy: analyzedAt desc` | Yes |
| Warning calc | `confidence < 0.4 OR signal in [warning, risk]` | Same logic | Yes |
| CTA button | "분석 시작" → `/intelligence` | Correct href | Yes |
| Compare link | "A/B 비교" → `/intelligence/compare` | Correct href | Yes |
| Empty state | "아직 분석된 키워드가 없습니다" | Rendered when `keywords.length === 0` | Yes |

### 2.4 Data Flow Verification

```
Dashboard Load
  └─ IntelligenceSummaryCard mount
       └─ trpc.intelligence.keywords.useQuery({ take: 3 })
            └─ Server: prisma.keywordAnalysis.findMany()
                 └─ Returns: keyword, confidence, signals[], analyzedAt
                      └─ Client: compute warningCount, render list
```

All steps in the data flow are connected and functional.

---

## 3. Issues Found

### Issue #1: Bell Icon Non-Functional

| Field | Value |
|-------|-------|
| **Title** | Bell icon in top-bar is non-functional |
| **Severity** | ![S0](https://img.shields.io/badge/severity-S0-red) |
| **Description** | The bell (notification) icon rendered in the top navigation bar has no `onClick` handler, no dropdown menu, and no state management. It is a purely decorative element that implies functionality but delivers none. |
| **Actual Impact** | Users see a notification indicator (red dot badge) but cannot click to view, dismiss, or act on any alerts. This completely blocks the notification consumption path. Alert records created by `IntelligenceAlertService` accumulate in the database with no user-facing outlet. |
| **Quick Fix** | **N** — Requires implementing a dropdown component, notification query endpoint, and read/dismiss state management. |
| **Structural Fix** | **Y** — Build a `NotificationDropdown` component with: (1) `trpc.notification.list` query, (2) mark-as-read mutation, (3) real-time badge count from unread notifications, (4) click-through to source context. |

### Issue #2: Dashboard Card Warning Not Drillable

| Field | Value |
|-------|-------|
| **Title** | Dashboard card shows warning count but no link to alert details |
| **Severity** | ![S3](https://img.shields.io/badge/severity-S3-grey) |
| **Description** | The `IntelligenceSummaryCard` displays a warning count (e.g., "이상 신호 2건") as a static badge. There is no click handler, tooltip, or link that takes the user to a filtered view of those specific warnings. |
| **Actual Impact** | Users see that warnings exist but must manually navigate to the intelligence page and search for flagged keywords. This adds friction but does not block core functionality. |
| **Quick Fix** | **Y** — Add an `onClick` or `<Link>` on the warning badge that navigates to `/intelligence?filter=warnings`. |
| **Structural Fix** | **N** — A quick link is sufficient; no architectural change needed. |

---

## 4. Severity Distribution

| Severity | Count | Items |
|----------|-------|-------|
| ![S0](https://img.shields.io/badge/severity-S0-red) | 1 | Bell icon non-functional |
| ![S1](https://img.shields.io/badge/severity-S1-orange) | 0 | — |
| ![S2](https://img.shields.io/badge/severity-S2-yellow) | 0 | — |
| ![S3](https://img.shields.io/badge/severity-S3-grey) | 1 | Warning count not drillable |

---

## 5. Entry Point Matrix

| Entry Point | Component | Target Route | Functional |
|-------------|-----------|--------------|------------|
| Sidebar — Intelligence Hub | `SidebarNav` | `/intelligence` | Yes |
| Sidebar — Compare | `SidebarNav` | `/intelligence/compare` | Yes |
| Sidebar — Vertical Preview | `SidebarNav` | `/vertical-preview` | Yes |
| Dashboard — "분석 시작" button | `IntelligenceSummaryCard` | `/intelligence` | Yes |
| Dashboard — "A/B 비교" link | `IntelligenceSummaryCard` | `/intelligence/compare` | Yes |
| Dashboard — keyword click | `IntelligenceSummaryCard` | `/intelligence` | Yes |
| Top bar — bell icon | `TopBar` | (none) | **No** |

---

## 6. Recommendations

| Priority | Action | Effort |
|----------|--------|--------|
| P0 | Implement `NotificationDropdown` with real query | 2-3 days |
| P3 | Add warning badge click-through to filtered view | 2 hours |

---

## 7. Test Coverage Notes

- Sidebar route rendering: covered by layout integration tests
- Dashboard card data fetch: covered by tRPC mock tests
- Bell icon: **no test coverage** — no handler to test
- Warning count calculation: unit test exists for confidence threshold logic

---

*Report generated as part of Intelligence Entry verification cycle.*
*Next: INTELLIGENCE_ALERT_RUNTIME_VERIFICATION.md*
