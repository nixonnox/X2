# Notification List Runtime Verification Report

> **Date**: 2026-03-15
> **Scope**: `notification.list` query usage in Bell dropdown and /notifications page
> **Status**: VERIFIED — No mock data, no placeholder content

---

## 1. Query Usage by Consumer

### Bell Dropdown

| Parameter   | Value           | Notes                              |
|-------------|-----------------|-------------------------------------|
| `page`      | `1`             | First page only                     |
| `pageSize`  | `10`            | Maximum 10 items in dropdown        |
| `enabled`   | `bellOpen`      | Only fetches when dropdown is open  |
| Filters     | none            | No filtering — shows latest 10      |

### /notifications Page

| Parameter    | Value              | Notes                                  |
|--------------|--------------------|----------------------------------------|
| `page`       | current page state | Paginated navigation                   |
| `pageSize`   | `20`               | Full-page list size                     |
| `enabled`    | `true`             | Always active                          |
| `unreadOnly` | filter state       | Toggle for unread-only view            |
| `priority`   | filter state       | Filter by priority level               |
| `sourceType` | filter state       | Filter by source (e.g. Intelligence)   |
| `since`      | filter state       | Date range filter                      |
| `search`     | filter state       | Keyword search across title/message    |

---

## 2. UI State Matrix

### Loading State

| Consumer          | Visual                                   |
|-------------------|------------------------------------------|
| Bell dropdown     | Spinner + "알림을 불러오는 중..." text    |
| /notifications    | Spinner + "알림을 불러오는 중..." text    |

### Error State

| Consumer          | Visual                                         |
|-------------------|-------------------------------------------------|
| Bell dropdown     | Error icon + "알림을 불러올 수 없습니다" + retry button |
| /notifications    | Error icon + message + "다시 시도" retry button |

### Empty State (no notifications exist)

| Consumer          | Visual                                    |
|-------------------|-------------------------------------------|
| Bell dropdown     | "새로운 알림이 없습니다"                   |
| /notifications    | Empty illustration + "알림이 없습니다"     |

### Empty State (filters applied, no match)

| Consumer          | Visual                                         |
|-------------------|-------------------------------------------------|
| /notifications    | "선택한 필터에 해당하는 알림이 없습니다" + clear filters button |

### Items Loaded

| Consumer          | Visual                                    |
|-------------------|-------------------------------------------|
| Bell dropdown     | Scrollable list, max 10 items             |
| /notifications    | Paginated list with filter toolbar        |

---

## 3. Notification Item Fields

Each rendered notification item displays the following fields:

| Field           | Source              | Rendering                                |
|-----------------|---------------------|------------------------------------------|
| `title`         | `item.title`        | Cleaned/sanitised, single line, truncated |
| `message`       | `item.message`      | Secondary text, 2-line clamp             |
| `priority`      | `item.priority`     | Icon (color-coded) + badge label         |
| `source`        | `item.sourceType`   | Badge (e.g. "Intelligence")             |
| `createdAt`     | `item.createdAt`    | Relative time (e.g. "3분 전")            |
| `read`          | `item.read`         | Blue unread dot (visible when `false`)   |
| `actionUrl`     | `item.actionUrl`    | Entire row is clickable link             |

### Priority Icon Mapping

| Priority   | Icon Color | Badge Variant |
|------------|------------|---------------|
| `critical` | Red        | `destructive` |
| `high`     | Orange     | `warning`     |
| `medium`   | Blue       | `default`     |
| `low`      | Gray       | `secondary`   |

### Source Badge Mapping

| Source Type    | Badge Label      | Badge Variant |
|----------------|------------------|---------------|
| `intelligence` | Intelligence     | `outline`     |
| `system`       | System           | `secondary`   |
| `social`       | Social           | `default`     |

---

## 4. Navigation Links

### Bell Dropdown Footer

```
"모든 알림 보기" → router.push("/notifications")
```

The footer link is always visible regardless of notification count.

### Sidebar / Account Navigation

| Nav Group     | Item Label | Icon  | Route            |
|---------------|-----------|-------|------------------|
| `NAV_ACCOUNT` | 알림      | Bell  | `/notifications` |

---

## 5. Data Integrity Checklist

| Check                                     | Result |
|-------------------------------------------|--------|
| No mock notification items                | PASS   |
| No placeholder / lorem ipsum content      | PASS   |
| No hardcoded item arrays                  | PASS   |
| All items from `notification.list` query  | PASS   |
| Empty states use proper conditional logic | PASS   |
| Loading state shows before data arrives   | PASS   |
| Error state includes retry mechanism      | PASS   |

---

## 6. Filter Interaction (Page Only)

| Filter        | UI Control        | Query Param   | Default     |
|---------------|-------------------|---------------|-------------|
| Unread only   | Toggle switch     | `unreadOnly`  | `false`     |
| Priority      | Dropdown select   | `priority`    | all         |
| Source type   | Dropdown select   | `sourceType`  | all         |
| Date range    | Date picker       | `since`       | none        |
| Search        | Text input        | `search`      | empty       |

Changing any filter resets to `page = 1` and triggers a new query.

---

## 7. Pagination (/notifications Page)

| Element          | Behaviour                              |
|------------------|----------------------------------------|
| Previous button  | Disabled on page 1                     |
| Next button      | Disabled on last page                  |
| Page indicator   | "페이지 X / Y"                          |
| Total count      | Displayed in header from query metadata |

---

## 8. Summary

Both the Bell dropdown and /notifications page consume `notification.list`
from tRPC with appropriate parameters. The Bell fetches only when open
(10 items, no filters), while the page supports full filtering and
pagination. All four UI states (loading, error, empty, items) are handled
with proper visual feedback. No mock data or placeholder content exists
anywhere in the notification list rendering pipeline.
