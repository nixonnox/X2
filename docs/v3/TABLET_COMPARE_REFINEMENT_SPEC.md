# Tablet Layout Refinement Spec -- Compare Page

## Overview

This document covers the tablet breakpoint changes applied to the Compare page.
The same `md:` (768 px) strategy used on the Intelligence page was carried over
here so that the two pages share a consistent responsive behaviour. Every
occurrence of `sm:grid-cols-2` was migrated to `md:grid-cols-2`, and flex
utilities were updated accordingly.

---

## Motivation

The Compare page presents side-by-side data for two channels (the "A/B"
pattern). On viewports between 640 px and 1023 px the previous `sm:` rules
created a 2-column grid that was too narrow for the comparison cards, especially
when long channel names or multi-line metrics were involved. Shifting the
2-column activation to `md:` (768 px) ensures at least 384 px per column, which
comfortably fits the card content.

---

## Changes

### A/B Input Grid

```
- sm:grid-cols-2
+ md:grid-cols-2
```

The two channel input fields (Channel A and Channel B) now stack vertically on
screens narrower than 768 px and sit side-by-side from the tablet breakpoint
onward. This gives each input field the full viewport width on phones, making
the autocomplete dropdown easier to interact with on touch devices.

### Compare Input Flex Container

```
- sm:flex-row sm:items-center
+ md:flex-row md:items-center
```

The container that wraps the comparison controls (date range picker, compare
button, swap button) switches from a vertical stack to a horizontal row at
`md`. This aligns with the Intelligence page input section behaviour and keeps
the controls accessible on narrow viewports without horizontal overflow.

### Difference Cards Grid

```
- sm:grid-cols-2
+ md:grid-cols-2
```

The grid of metric difference cards (showing delta values between Channel A and
Channel B) transitions from a single-column layout to two columns at `md`.
Each card displays a metric label, both channel values, and a delta indicator;
the wider column width at 768 px ensures all three data points fit without
truncation.

### Signal Summary Grid

```
- sm:grid-cols-2
+ md:grid-cols-2
```

The signal summary section at the bottom of the Compare page lists aggregated
signals (positive, negative, neutral) in card form. Like the difference cards
above, this grid now activates its 2-column layout at the `md` breakpoint.

### Score Ring Layout

The overall score ring and its surrounding content use `md:` for the tablet
2-column presentation. The ring visualisation sits in the first column while
the score breakdown occupies the second, giving both elements adequate space
on a 768 px viewport.

```
- sm:grid-cols-2
+ md:grid-cols-2
```

This applies to the wrapper grid that contains the score ring and the
difference summary. On mobile the ring appears above the summary; on tablet
and above they sit side-by-side.

### Difference Grid within Score Section

```
- sm:grid-cols-2
+ md:grid-cols-2
```

Inside the score section, individual metric deltas (engagement rate delta,
growth delta, etc.) are arranged in a 2-column grid starting at `md`. This
keeps the deltas scannable without requiring horizontal scrolling.

---

## Breakpoint Mapping (Compare Page)

| Element | Mobile (< 768 px) | Tablet (>= 768 px) | Desktop (>= 1024 px) |
|---------|--------------------|---------------------|-----------------------|
| A/B inputs | stacked | 2-column | 2-column |
| Controls bar | vertical | horizontal row | horizontal row |
| Difference cards | 1 column | 2 columns | 2 columns |
| Signal summary | 1 column | 2 columns | 2 columns |
| Score ring + delta | stacked | 2-column | 2-column |

All transitions now occur at the same `md:` boundary, eliminating the mixed
`sm:`/`lg:` behaviour that previously caused layout inconsistencies.

---

## Relationship to Intelligence Page Changes

The Compare page shares several low-level components with the Intelligence page
(e.g. metric cards, score rings). Where those components received their own
`md:` updates (documented in `TABLET_LAYOUT_REFINEMENT_SPEC.md`), the Compare
page benefits automatically. The changes listed in this document are specific
to the Compare page's own layout containers and grids.

---

## Gap and Spacing

The Compare page follows the same gap progression introduced on the
Intelligence page:

| Viewport | Gap |
|----------|-----|
| Mobile (< 768 px) | `gap-4` (16 px) |
| Tablet (768-1023 px) | `gap-5` (20 px) |
| Desktop (>= 1024 px) | `gap-6` (24 px) |

This was applied to the outer page wrapper and the card grids to maintain
consistent spacing across both pages.

---

## Touch Considerations

- At `md:` the 2-column cards are each roughly 360 px wide, leaving comfortable
  48 px touch targets for interactive elements (buttons, links, toggles).
- The stacked mobile layout (< 768 px) ensures cards span the full width,
  avoiding accidental taps on adjacent cards.
- The compare swap button remains centered between the two input fields at
  `md:` and shifts to an inline position in the horizontal controls bar.

---

## Testing Guidance

1. **iPad portrait (768 px)**: Verify both A/B inputs appear side-by-side and
   the difference cards render in a clean 2-column grid.
2. **Galaxy Tab S (800 px landscape)**: Confirm the score ring and delta
   summary split evenly.
3. **iPhone 14 Pro Max (430 px)**: Everything should remain single-column with
   no horizontal overflow.
4. **Desktop (>= 1024 px)**: No visual regression from previous desktop layout.

---

## References

- Intelligence page spec: `TABLET_LAYOUT_REFINEMENT_SPEC.md`
- Implementation notes: `TABLET_REFINEMENT_IMPLEMENTATION_NOTES.md`
- Tailwind CSS breakpoints: https://tailwindcss.com/docs/responsive-design
