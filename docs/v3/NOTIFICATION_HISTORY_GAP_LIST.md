# Notification History Gap List

## Summary

Gap analysis of the notification history page implementation.
No S0 (critical) or S1 (high) issues identified.
2 S2 (medium) and 4 S3 (low) items catalogued below.

---

## S0 — Critical Issues

**None.**

No data loss, security, or crash-level issues identified in the notification
history page implementation. All core flows (list, filter, read, navigate)
function correctly under normal operating conditions.

---

## S1 — High-Priority Issues

**None.**

No significant functional gaps that would block user workflows. The page
correctly loads notifications, applies filters, manages read state, syncs
with the Bell badge, and supports deep-link navigation without errors.

---

## S2 — Medium-Priority Issues

### S2-1: No Project-Scoped Filter

**Description:**
Notifications are scoped to the authenticated user (`userId`) but not to a
specific project. Users with multiple projects see all notifications in a
single unified list regardless of which project generated the alert.

**Impact:**
- Users managing multiple projects cannot isolate notifications per project
- High-volume users may see irrelevant notifications from inactive projects
- Intelligence alerts from different projects are interleaved chronologically

**Current behavior:**
- `where.userId = ctx.session.user.id` is the only ownership filter
- No `projectId` field exists on the Notification model
- No project selector or filter control on the history page UI

**Recommendation:**
- Add optional `projectId` to the Notification model
- Set `projectId` during notification creation from the alert context
- Add a project filter dropdown to the notification history page
- Consider defaulting to the currently active project if one is selected

**Severity justification:**
S2 because it affects usability for multi-project users but does not break
any existing functionality. Single-project users are unaffected.

---

### S2-2: Inconsistent pageSize Between Bell and History

**Description:**
The Bell dropdown requests notifications with `pageSize=10` while the full
notification history page uses `pageSize=20`. This is a minor inconsistency
in the data fetching configuration.

**Impact:**
- Not a functional bug — both surfaces work correctly with their respective sizes
- Bell shows fewer items by design (compact dropdown), history shows more (full page)
- The inconsistency is intentional from a UX perspective but undocumented

**Current behavior:**
- Bell dropdown: `trpc.notification.list.useQuery({ pageSize: 10, ... })`
- History page: `trpc.notification.list.useQuery({ pageSize: 20, ... })`
- Both use the same backend procedure; only the input parameter differs

**Recommendation:**
- Document the intentional pageSize difference in code comments
- Consider extracting pageSize constants: `BELL_PAGE_SIZE = 10`, `HISTORY_PAGE_SIZE = 20`
- No functional change needed; this is a documentation/clarity improvement

**Severity justification:**
S2 because it could cause confusion during maintenance but has no user-facing
impact. The difference is arguably correct UX design (compact vs full view).

---

## S3 — Low-Priority Issues

### S3-1: No Bulk Select or Delete

**Description:**
Users can mark notifications as read (individually or all at once) but cannot
select multiple specific notifications for bulk actions or delete any notifications.

**Impact:**
- Notification list grows indefinitely with no way to remove old items
- Users cannot clean up their notification history
- No checkbox selection UI for granular bulk operations

**Current behavior:**
- `markRead`: marks single notification as read
- `markAllRead`: marks all notifications as read (no selection)
- No `delete` or `bulkDelete` mutation exists
- No checkbox or multi-select UI in the notification list

**Recommendation:**
- Add `notification.delete` and `notification.bulkDelete` mutations
- Add checkbox selection UI with "선택 삭제" bulk action button
- Consider auto-archival policy for notifications older than 90 days
- Lower priority since read/unread management covers the primary use case

---

### S3-2: No Notification Preferences or Settings Page

**Description:**
There is no user-facing settings page to configure notification preferences
such as which alert types to receive, delivery channels, or quiet hours.

**Impact:**
- Users receive all notification types with no opt-out capability
- No way to adjust notification frequency or priority thresholds
- No email/push notification channel configuration available

**Current behavior:**
- All intelligence alerts generate notifications for the keyword owner
- System notifications are generated for all applicable users
- No `NotificationPreference` model or settings UI exists

**Recommendation:**
- Create a notification settings page under account/profile section
- Add `NotificationPreference` model with per-type enable/disable flags
- Consider delivery channel options (in-app, email, push) when applicable
- This is a feature enhancement, not a bug fix

---

### S3-3: No Export Capability (CSV/Excel)

**Description:**
The notification history page does not offer any data export functionality.
Users cannot download their notification history in CSV, Excel, or any other
format for external analysis or record-keeping.

**Impact:**
- Users requiring audit trails must manually review notifications in the UI
- No integration path for external ticketing or reporting systems
- Compliance-sensitive users cannot extract notification records

**Current behavior:**
- Notification list is view-only within the application
- No export button or download action in the UI
- No API endpoint for bulk notification data export

**Recommendation:**
- Add "내보내기" button with CSV and Excel format options
- Reuse existing export infrastructure if available in the platform
- Apply current filter state to exported data set
- Lower priority since notification data is auxiliary, not primary analytics

---

### S3-4: Type Safety — `(data as any)` Assertions

**Description:**
Several locations in the notification components use `(data as any)` type
assertions, bypassing TypeScript's type checking for tRPC response data.

**Impact:**
- Reduced compile-time safety for notification data access
- Potential runtime errors if backend response shape changes
- Inconsistent with the otherwise well-typed tRPC + Prisma stack

**Current behavior:**
- `(data as any).items` or similar patterns in list rendering
- `(data as any).total` for pagination count access
- Type assertions used instead of proper tRPC output type inference

**Recommendation:**
- Define explicit output types for `notification.list` procedure
- Use tRPC's inferred types: `RouterOutput['notification']['list']`
- Remove all `as any` casts in notification-related components
- Add type tests to catch response shape regressions

**Severity justification:**
S3 because the code functions correctly at runtime and the assertions are
a code quality concern rather than a user-facing issue.

---

## Summary Table

| ID   | Severity | Title                                    | Type        |
|------|----------|------------------------------------------|-------------|
| S2-1 | S2       | No project-scoped filter                 | Feature gap |
| S2-2 | S2       | Bell/History pageSize inconsistency      | Consistency |
| S3-1 | S3       | No bulk select/delete                    | Feature gap |
| S3-2 | S3       | No notification preferences/settings     | Feature gap |
| S3-3 | S3       | No export (CSV/Excel)                    | Feature gap |
| S3-4 | S3       | Type safety — `(data as any)` assertions | Code quality|

---

## Conclusion

The notification history page has no critical or high-priority gaps. The two S2
items (project scoping and pageSize inconsistency) are medium-priority improvements
that would enhance multi-project usability and code clarity. The four S3 items
are standard feature enhancements and code quality improvements that can be
addressed in future iterations without blocking any current user workflows.
