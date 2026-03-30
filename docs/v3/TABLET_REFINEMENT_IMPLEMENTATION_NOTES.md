# Tablet Refinement -- Implementation Notes

## Overview

This document records the implementation details, rationale, and known
remaining items for the tablet layout refinements applied to the Intelligence
and Compare pages. It is intended as a reference for future contributors
working on responsive behaviour in the application.

---

## Tailwind Breakpoints Used

All responsive changes use Tailwind CSS default breakpoints. No custom
breakpoint was added to the Tailwind configuration.

| Token | Min-width | Role in this project |
|-------|-----------|----------------------|
| `sm:` | 640 px | Not actively used on intelligence pages |
| `md:` | 768 px | Tablet layout tier |
| `lg:` | 1024 px | Desktop layout tier |
| `xl:` | 1280 px | Not used in these changes |
| `2xl:` | 1536 px | Not used in these changes |

### Why no custom breakpoint?

A 768 px breakpoint matches the exact width of an iPad in portrait mode, which
is the most common tablet viewport. Tailwind already provides this as `md:`, so
adding a custom `tablet:` alias would increase configuration complexity without
any functional benefit. Keeping the default set also makes the codebase more
approachable for developers familiar with Tailwind conventions.

---

## Strategy

### Breakpoint assignment

| Tier | Breakpoint | Purpose |
|------|------------|---------|
| Mobile | default (no prefix) | Single-column stacked layout |
| Tablet | `md:` (768 px) | 2-column grids, intermediate sizing |
| Desktop | `lg:` (1024 px) | 3-column grids, static sidebar, full sizing |

### Removal of `sm:` on intelligence pages

Prior to this refinement, `sm:` was used inconsistently across the Intelligence
and Compare pages. Some grids switched at 640 px, others at 1024 px, and none
at 768 px. The decision was made to remove all `sm:` usage on these pages and
replace it with `md:`. This creates a clean two-step progression (mobile then
tablet then desktop) instead of a fragmented mix.

Note: `sm:` is **not** globally deprecated. Other parts of the application may
still use it where appropriate. The policy applies only to the Intelligence and
Compare page trees.

---

## Grid Progression

The standard grid column progression across breakpoints:

```
Mobile          Tablet (md:)      Desktop (lg:)
1 column   -->  2 columns    -->  3 columns
```

This applies to the main page grid in `intelligence/page.tsx`. Sub-grids
within components may use different column counts (e.g. the summary cards use
a 1 -> 4 progression because four cards fit comfortably at 768 px).

### Column span logic

In a 2-column tablet grid the main content takes 1 column and the sidebar
takes 1 column. In the 3-column desktop grid the main content spans 2 columns
and the sidebar takes 1 column. This keeps the sidebar at a relatively fixed
width while the main content area scales.

---

## Touch Spacing

Gap values follow a three-step progression to account for the difference in
interaction precision between touch and pointer input:

| Viewport | Gap class | Computed value |
|----------|-----------|----------------|
| Mobile (< 768 px) | `gap-4` | 16 px |
| Tablet (768-1023 px) | `gap-5` | 20 px |
| Desktop (>= 1024 px) | `gap-6` | 24 px |

The 4 px increment per tier is subtle but measurable. On mobile, tighter gaps
maximise content density on small screens. On tablets, the slight increase
reduces the chance of mis-taps on adjacent interactive cards. On desktop,
pointer precision allows for the most generous spacing.

---

## Chart Height Progression

The `BenchmarkTrendChart` component now uses responsive height classes:

| Viewport | Class | Height |
|----------|-------|--------|
| Mobile | `h-[240px]` | 240 px |
| Tablet | `md:h-[280px]` | 280 px |
| Desktop | `lg:h-[320px]` | 320 px |

Previously the chart had a fixed `h-[280px]` at all sizes. The mobile height
was reduced to 240 px to prevent the chart from dominating the viewport on
phones (where vertical space is at a premium and users typically scroll
through content). The desktop height was increased to 320 px to take advantage
of the available space and improve data readability.

The 40 px step between tiers was chosen to maintain the chart's aspect ratio
at approximately 2.5:1 across all breakpoints (assuming typical content widths
of 600 px, 700 px, and 800 px respectively).

---

## Evidence Panel Width

The `EvidenceSidePanel` component uses two width tiers:

| Viewport | Class | Width |
|----------|-------|-------|
| Tablet | `md:w-[340px]` | 340 px |
| Desktop | `lg:w-[400px]` | 400 px |

At `md:` the panel activates its sidebar presentation mode (sliding in from
the right). The narrower 340 px width leaves roughly 428 px for the main
content area on a 768 px viewport, which is enough to display a chart or card
grid without horizontal compression.

At `lg:` the panel widens to 400 px. On a 1024 px viewport this leaves 624 px
for main content, and on wider screens the main content area continues to grow
while the panel remains fixed.

---

## Radial Graph Max-Width

The `IntelligenceRadialGraph` received a two-tier max-width:

| Viewport | Class | Max-width |
|----------|-------|-----------|
| Tablet | `md:max-w-[440px]` | 440 px |
| Desktop | `lg:max-w-[500px]` | 500 px |

Previously a single `sm:max-w-[500px]` was used. On a 2-column tablet grid,
500 px would cause the graph to overflow its column. The 440 px tablet cap
ensures the graph fits within a single column of the `md:grid-cols-2` layout
with room for padding.

---

## Known Remaining Items

### Sidebar overlay on tablet

The main navigation sidebar still uses an overlay/drawer pattern at the `md:`
breakpoint. A static (always-visible) sidebar requires `lg:` because the
combined width of the sidebar (~240 px) plus the page content would exceed the
768 px viewport. This is intentional and not considered a regression.

Future consideration: a collapsible icon-only sidebar (~64 px) at `md:` could
provide persistent navigation without consuming too much horizontal space.

### Tab button compact mode

The tab buttons in the Intelligence page header (Overview, Mentions, Benchmark,
etc.) currently use the same padding and font size at all breakpoints. On a
768 px viewport with 5+ tabs, horizontal scrolling may be required.

A compact tab mode (smaller padding, abbreviated labels or icon-only) at `md:`
would eliminate scrolling. This was deferred because it requires design input
on which labels to abbreviate and whether icons alone provide sufficient
affordance.

### Testing coverage

Manual testing was performed on the following devices/viewports:

- iPhone SE (375 px) -- mobile baseline
- iPhone 14 Pro (393 px) -- modern phone
- iPad 10th gen portrait (768 px) -- primary tablet target
- iPad Air landscape (1180 px) -- tablet/desktop boundary
- Desktop 1440 px -- standard desktop

Automated responsive tests (e.g. Playwright viewport parameterisation) have
not yet been added for the `md:` breakpoint. Adding these is recommended
before further responsive work.

---

## File Manifest

The following files were modified as part of this refinement:

| File | Type of change |
|------|---------------|
| `intelligence/page.tsx` | Page grid, gaps, flex utilities |
| `IntelligenceSummaryCards` | Grid columns |
| `BenchmarkDifferentialRing` | Flex direction |
| `LiveMentionStatusPanel` | Grid columns (two grids) |
| `IntelligenceRadialGraph` | Max-width |
| `EvidenceSidePanel` | Width, sidebar activation |
| `BenchmarkTrendChart` | Height |
| Compare page layout | Grid columns, flex utilities |

---

## References

- Intelligence page spec: `TABLET_LAYOUT_REFINEMENT_SPEC.md`
- Compare page spec: `TABLET_COMPARE_REFINEMENT_SPEC.md`
- Tailwind CSS responsive design: https://tailwindcss.com/docs/responsive-design
