# Tablet Layout Refinement Spec -- Intelligence Page

## Overview

This document specifies the tablet breakpoint refinements applied to the
Intelligence page and its associated components. The primary goal was to close
the visual gap between the `sm` (640 px) and `lg` (1024 px) breakpoints by
introducing explicit `md` (768 px) rules so that tablet-sized viewports receive
a purposeful layout rather than falling back to the mobile column stack.

---

## Breakpoint Strategy

### Before

| Token | Width | Usage on Intelligence page |
|-------|-------|---------------------------|
| `sm:` | 640 px | Sporadically used for grids and flex |
| `md:` | 768 px | **Not used** |
| `lg:` | 1024 px | Desktop grid and sidebar activation |

The 384 px range between `sm` and `lg` had no dedicated handling, causing
768-1023 px devices (iPad portrait, small Surface, Android tablets) to render
either a cramped desktop grid or an over-stretched mobile stack.

### After

| Token | Width | Role |
|-------|-------|------|
| `sm:` | 640 px | Reserved for small utility tweaks (not used in intelligence pages) |
| `md:` | 768 px | **Tablet layout** -- 2-column grids, intermediate sizing |
| `lg:` | 1024 px | Desktop layout -- 3-column grids, static sidebar |

All former `sm:` responsive classes on the Intelligence page were migrated to
`md:` so that the tablet tier is the first breakpoint where layout shifts occur.

---

## Page-Level Changes (`intelligence/page.tsx`)

### Main Grid

```
- grid-cols-1 lg:grid-cols-3
+ grid-cols-1 md:grid-cols-2 lg:grid-cols-3
```

On tablets the page now shows a 2-column grid, giving the main content area and
the sidebar region a balanced split before the full 3-column desktop layout
activates.

### Main Content Column Span

```
- lg:col-span-2
+ md:col-span-1 lg:col-span-2
```

At the `md` breakpoint the main content occupies a single column of the
2-column grid. At `lg` it spans two columns of the 3-column grid, restoring the
desktop proportion.

### Hub Quick Cards

```
- grid-cols-2 sm:grid-cols-4
+ grid-cols-2 md:grid-cols-4
```

The four hub quick-action cards now expand from a 2-column mobile grid to a
4-column row at the tablet breakpoint instead of at `sm`.

### Input Section Flex

```
- sm:flex-row sm:items-center sm:justify-between
+ md:flex-row md:items-center md:justify-between
```

The search/filter input bar switches to a horizontal layout at `md` rather than
`sm`, preventing a cramped horizontal arrangement on small phones held in
landscape.

### Empty State Cards

```
- grid-cols-1 sm:grid-cols-3
+ grid-cols-1 md:grid-cols-3
```

When no data is available the placeholder cards display in a 3-column grid
starting at the tablet breakpoint.

### Gap Progression

```
- gap-4 lg:gap-6
+ gap-4 md:gap-5 lg:gap-6
```

A three-step gap progression was introduced:

| Viewport | Gap |
|----------|-----|
| Mobile (< 768 px) | `gap-4` (16 px) |
| Tablet (768-1023 px) | `gap-5` (20 px) |
| Desktop (>= 1024 px) | `gap-6` (24 px) |

This provides slightly more breathing room on tablets without jumping straight
to the desktop spacing.

---

## Component-Level Changes

### IntelligenceSummaryCards

```
- sm:grid-cols-4
+ md:grid-cols-4
```

The four summary metric cards (e.g. reach, engagement, growth, score) switch
from a stacked layout to a 4-column row at the `md` breakpoint.

### BenchmarkDifferentialRing

```
- sm:flex-row
+ md:flex-row
```

The ring visualisation and its legend/description sit side-by-side starting at
768 px, giving the chart more horizontal space on tablets.

### LiveMentionStatusPanel

```
- sm:grid-cols-4  ->  md:grid-cols-4
- sm:grid-cols-3  ->  md:grid-cols-3
```

Both the status indicator row (4 columns) and the mention card grid (3 columns)
now transition at `md`. This avoids the awkward in-between state where four tiny
status pills would appear on a 640 px screen.

### IntelligenceRadialGraph

```
- sm:max-w-[500px]
+ md:max-w-[440px] lg:max-w-[500px]
```

The radial graph container is constrained to 440 px on tablets and 500 px on
desktop. This prevents the chart from consuming too much of the 2-column tablet
grid while still rendering at a comfortable size.

### EvidenceSidePanel

```
- (no md rules)
+ md:  triggers sidebar mode switch
+ md:w-[340px] lg:w-[400px]
```

The evidence panel now activates its sidebar presentation at `md`, using a
narrower 340 px width on tablets and the full 400 px on desktop. This gives
users access to the side panel on tablets without it dominating the viewport.

### BenchmarkTrendChart

```
- h-[280px]  (fixed)
+ h-[240px] md:h-[280px] lg:h-[320px]
```

Chart height is now responsive:

| Viewport | Height |
|----------|--------|
| Mobile | 240 px |
| Tablet | 280 px |
| Desktop | 320 px |

This ensures the chart is readable on smaller screens while taking advantage of
the extra vertical space available on larger displays.

---

## Visual Summary

```
Mobile (< 768 px)        Tablet (768-1023 px)       Desktop (>= 1024 px)
+------------------+     +----------+----------+    +-------+----------+----+
|   1 column       |     | main     | sidebar  |    | main (col-span-2)| sb |
|   stacked        |     | col-1    | col-2    |    |                  |    |
|   gap-4          |     | gap-5    |          |    | gap-6            |    |
+------------------+     +----------+----------+    +-------+----------+----+
```

---

## References

- Tailwind CSS default breakpoints: https://tailwindcss.com/docs/responsive-design
- Related spec: `TABLET_COMPARE_REFINEMENT_SPEC.md` (compare page changes)
- Implementation notes: `TABLET_REFINEMENT_IMPLEMENTATION_NOTES.md`
