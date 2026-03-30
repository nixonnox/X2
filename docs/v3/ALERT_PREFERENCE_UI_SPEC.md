# Alert Preference UI Spec

## Route

- Path: `/settings/notifications`
- Parent layout: Settings layout (`/settings`)
- Navigation entry: `NAV_ACCOUNT` group, icon `BellRing` (lucide-react), label key `nav.alertSettings`

## Page Structure

Page renders a single `<form>` with four collapsible sections and a sticky save footer.
All fields are controlled via `useState`. Initial values come from `getPreferences` query hydration.

---

## Section 1: 알림 채널 (Notification Channels)

| Field              | Control        | Default | Notes                                      |
| ------------------ | -------------- | ------- | ------------------------------------------ |
| `channelInApp`     | Badge (always) | `true`  | Non-editable. Shown as "항상 활성" badge.   |
| `channelEmail`     | Toggle switch  | `false` | Requires verified email on account.         |
| `channelWebhook`   | Toggle switch  | `false` | Enables URL input below when toggled on.    |
| `webhookUrl`       | Text input     | `""`    | Visible only when `channelWebhook` is true. |

### Webhook URL Input

- Placeholder: `https://hooks.example.com/alerts`
- Validation: must start with `https://`, max 500 chars
- Inline guardrail warning: shown when `channelWebhook` is true but `webhookUrl` is empty
  - Message: "웹훅 URL이 비어 있으면 웹훅 알림이 전송되지 않습니다."
  - Severity: `warning` (yellow banner)

---

## Section 2: 알림 유형 (Alert Types)

Four toggle switches, each with a Korean description label.

| Field                        | Label                  | Description (Korean)                             | Default |
| ---------------------------- | ---------------------- | ------------------------------------------------ | ------- |
| `enableWarningSpike`         | 경고 급증              | "단기간 내 경고가 임계값 이상 발생 시 알림"       | `true`  |
| `enableLowConfidence`        | 낮은 신뢰도            | "분석 신뢰도가 임계값 이하로 떨어질 때 알림"      | `true`  |
| `enableBenchmarkDecline`     | 벤치마크 하락          | "벤치마크 점수가 기준치 이상 하락 시 알림"        | `true`  |
| `enableProviderCoverageLow`  | 데이터 수집 커버리지   | "플랫폼 데이터 수집률이 낮을 때 알림"             | `true`  |

Each toggle is independent. Disabling a type means that alert type is never generated for the user.

---

## Section 3: 임계값 (Thresholds)

| Field                          | Control         | Range     | Step | Default | Unit     |
| ------------------------------ | --------------- | --------- | ---- | ------- | -------- |
| `warningSpike_minCount`        | Number input    | 1 - 20    | 1    | 3       | 건       |
| `lowConfidence_threshold`      | Slider + label  | 0.1 - 0.9 | 0.05 | 0.4     | (ratio)  |
| `benchmarkDecline_threshold`   | Number input    | 5 - 50    | 1    | 15      | points   |

### Inline Guardrail Warnings (Thresholds)

These appear immediately as the user changes the value, before saving.

| Condition                         | Warning Message                                              |
| --------------------------------- | ------------------------------------------------------------ |
| `warningSpike_minCount < 2`       | "매우 낮은 값입니다. 알림이 과도하게 발생할 수 있습니다."     |
| `lowConfidence_threshold > 0.7`   | "높은 임계값은 대부분의 분석 결과에 알림을 발생시킵니다."     |
| `benchmarkDecline_threshold < 5`  | "작은 변동에도 알림이 발생합니다. 10 이상을 권장합니다."      |

---

## Section 4: 제한 설정 (Rate Limits)

| Field                    | Control      | Range       | Step | Default | Unit |
| ------------------------ | ------------ | ----------- | ---- | ------- | ---- |
| `globalCooldownMinutes`  | Number input | 10 - 1440   | 10   | 60      | 분   |
| `maxAlertsPerDay`        | Number input | 1 - 100     | 1    | 20      | 건   |

### Inline Guardrail Warnings (Rate Limits)

| Condition                    | Warning Message                                          |
| ---------------------------- | -------------------------------------------------------- |
| `globalCooldownMinutes < 30` | "짧은 쿨다운은 알림 폭주를 유발할 수 있습니다."           |
| `maxAlertsPerDay > 50`       | "일일 알림 수가 많으면 알림 피로를 유발할 수 있습니다."    |

---

## Server-Side Guardrail Warnings

The `savePreferences` mutation returns a `warnings: string[]` array.
After a successful save, if `warnings.length > 0`, each warning is displayed as a yellow toast.

Possible server-side warnings:

- `"cooldown_too_short"` - 쿨다운이 30분 미만
- `"max_alerts_too_high"` - 일일 제한이 50건 초과
- `"confidence_too_high"` - 신뢰도 임계값이 0.7 초과
- `"decline_too_low"` - 벤치마크 하락 임계값이 5 미만
- `"webhook_no_url"` - 웹훅 활성화 상태에서 URL 미입력

These are warnings only; the save still succeeds.

---

## Save Button

- Position: sticky footer bar at bottom of form
- Label: "저장" (Save)
- States:
  - `idle` - primary button, enabled when form is dirty
  - `loading` - spinner + "저장 중..." text, disabled
  - `success` - green toast "알림 설정이 저장되었습니다." (auto-dismiss 3s)
  - `error` - red toast with error message from mutation

Dirty detection: compare current form state snapshot against hydrated initial state.

---

## Form Hydration (Query to Form State)

The `getPreferences` query returns a flat object:

```
{ channelEmail, channelWebhook, webhookUrl, enableWarningSpike, ... }
```

The UI maps this to a nested form state structure:

```ts
type FormState = {
  channels: { inApp: true; email: boolean; webhook: boolean; webhookUrl: string };
  types: { warningSpike: boolean; lowConfidence: boolean; benchmarkDecline: boolean; providerCoverageLow: boolean };
  thresholds: { warningSpike_minCount: number; lowConfidence_threshold: number; benchmarkDecline_threshold: number };
  limits: { globalCooldownMinutes: number; maxAlertsPerDay: number };
};
```

Mapping logic (flat to nested):

- `channelEmail` -> `channels.email`
- `channelWebhook` -> `channels.webhook`
- `webhookUrl` -> `channels.webhookUrl`
- `enableWarningSpike` -> `types.warningSpike`
- `enableLowConfidence` -> `types.lowConfidence`
- `enableBenchmarkDecline` -> `types.benchmarkDecline`
- `enableProviderCoverageLow` -> `types.providerCoverageLow`
- Threshold and limit fields map 1:1 by name into their respective groups.

When no preference record exists, the query returns defaults with `isDefault: true`.
The form hydrates identically regardless of whether the record exists.

---

## Save (Form State to API)

On submit, the nested form state is flattened back to the API input shape:

- `channels.email` -> `channelEmail`
- `channels.webhook` -> `channelWebhook`
- `channels.webhookUrl` -> `webhookUrl`
- `types.warningSpike` -> `enableWarningSpike`
- (and so on for all fields)

The mutation call: `trpc.alertPreference.savePreferences.mutate(flatInput)`

---

## Accessibility

- All toggle switches have `aria-label` with the Korean description
- Slider for `lowConfidence_threshold` has `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
- Form sections use `<fieldset>` + `<legend>` for screen reader grouping
- Save button disabled state uses `aria-disabled` and `aria-busy` during loading

---

## Mobile Layout

- Sections stack vertically with 16px gap
- Sticky save footer is 56px height with safe-area padding
- Slider touch target is minimum 44px height
- Toggle switches are right-aligned within each row
