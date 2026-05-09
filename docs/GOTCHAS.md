# Gotchas

Non-obvious things, fragile areas, and intentional weirdness. Items are concrete — file:line references included.

---

## Non-standard Next.js

> **Read this first.** [AGENTS.md](AGENTS.md) carries the warning: *"This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."*

`next@16.2.5` and `react@19.2.4` are pinned. Many widely-known Next.js patterns (e.g., `pages/api`, `getServerSideProps`, even some App Router conventions from 14/15) **may not apply**. Before extending routing, caching, server actions, or middleware, consult the docs that ship inside `node_modules/next/dist/docs/`.

---

## The home page query gates more strictly than it appears

[src/app/page.tsx:13-18](src/app/page.tsx:13):

```ts
.select('*, sub_races!inner(id)')
.not('location_lat', 'is', null)
.not('location_lng', 'is', null)
.limit(1000);
```

Three implicit filters that have product consequences:
1. **`!inner` on `sub_races`** — a race with **zero** sub-race rows is silently excluded.
2. **Coordinates required** — un-geocoded races are excluded too.
3. **Hard cap of 1000** — no pagination, no warning. The Greek market is well under this today; don't assume it always will be.

If a maintainer says "I added a race in Supabase but it's not showing up", these are the three places to look first.

---

## Race rows are deduplicated post-query

[src/app/page.tsx:24](src/app/page.tsx:24):

```ts
const uniqueRaces = Array.from(new Map(data.map(item => [item.id, item])).values());
```

The `!inner` join multiplies a parent row by the count of matching children. Supabase returns N rows per race; the dedup keeps whichever Map encountered first. The `*` select pulls only the parent columns (children are nested inside), so all duplicates carry the same data and the chosen winner doesn't matter — **but** changing the select to include child columns would suddenly make this a problem.

---

## The `dates` field is an array, but only `dates[0]` is ever read

Searched across the codebase: every read of `race.dates` is `race.dates[0]`. The "upcoming only" filter checks only the first date ([HomeClient.tsx:88-92](src/components/HomeClient.tsx:88)). The Sidebar header date, the marker label date, the detail hero date — all `dates[0]`.

If a recurring race stores its dates in chronological order, `dates[0]` is its next occurrence. **This convention is not enforced by the schema.** A race with `dates = ['2025-01-01', '2026-04-01']` (out of order) would be filtered as "past".

---

## `--glass-border` is referenced but never declared

Multiple component CSS files reference `var(--glass-border)`:

```css
/* Sidebar.css:16 */ border-bottom: 1px solid var(--glass-border);
/* FilterWidget.css:18 */ border: 1px solid var(--glass-border);
/* MapClient.tsx:541 (inline) */ borderTop: '1px solid var(--glass-border)'
```

But `--glass-border` is **not declared anywhere** in [globals.css](src/app/globals.css) (search confirms only `--bg-main`, `--text-primary`, `--text-secondary`, `--accent-primary`, `--accent-primary-glow`, `--accent-secondary`, `--accent-trail`, `--accent-road`, `--transition-smooth` are defined).

The browser silently treats `var(--glass-border)` as unset, so `1px solid var(--glass-border)` resolves to a `currentColor`-derived border. The visual effect happens to look fine because text-color contrast is similar to the intended border color — but this is a latent bug. **Don't depend on what `--glass-border` resolves to today.**

---

## `selectedRace` is excluded from clustering and rendered as an extra marker

[MapClient.tsx:275-286](src/components/MapClient.tsx:275):

```ts
const points = useMemo(() => {
  return races
    .filter(r => r.location_lat && r.location_lng && r.id !== selectedRace?.id)
    .map(race => ({ ... }));
}, [races, selectedRace?.id]);
```

Then [MapClient.tsx:424-430](src/components/MapClient.tsx:424):

```tsx
{selectedRace && selectedRace.location_lng && selectedRace.location_lat && (
  <RaceMarker race={selectedRace} isSelected={true} ... />
)}
```

The selected race is plucked out of the cluster set so it's always shown as a standalone marker (and so it never gets visually swallowed by a cluster). This is intentional. **Don't try to "simplify" by leaving the selected race in the cluster set** — clusters that contain the selected race would cause it to disappear when zoomed out.

---

## Sub-race route drawing is dependent on `subRaces` AND `selectedSubRaceId`

[MapClient.tsx:342-357](src/components/MapClient.tsx:342) computes `routesToShow` as **all sub-races of the selected race that have a route**, marking only the focused one. Drawing happens at [MapClient.tsx:476-508](src/components/MapClient.tsx:476).

- **All routes show as soon as a race is selected** (even before the user picks a sub-race).
- The non-focused routes are dimmed, not hidden.

Test case: pick a multi-distance event like Zagori — all four Zagori routes (5km, 10km, 21km, 33km) appear stacked on the map immediately. Picking one brightens it.

---

## The "fit to focused route" effect can yank the camera back unexpectedly

[MapClient.tsx:360-375](src/components/MapClient.tsx:360):

```tsx
useEffect(() => {
  if (selectedSubRaceId && mapRef.current) {
    const focusedRoute = routesToShow.find((r: any) => r.isFocused);
    if (focusedRoute) {
      ...mapRef.current?.fitBounds(bounds, { padding: 100, duration: 1500 });
    }
  }
}, [selectedSubRaceId, routesToShow]);
```

`routesToShow` is recomputed whenever `selectedRace`, `selectedSubRaceId`, or `subRaces` change. If `subRaces` resolves *after* the user has manually panned away, the effect re-runs and re-frames the route. This can feel like a bug from the user's perspective. Be aware before adding new triggers.

---

## Empty `src/types/filters.ts`

The file exists with 0 bytes ([src/types/filters.ts](src/types/filters.ts)). It was likely intended to hold `FilterState`, but the type lives in [HomeClient.tsx:12-20](src/components/HomeClient.tsx:12) and is imported from there by `Sidebar.tsx` and `FilterWidget.tsx`. Don't be tempted to "fix" this casually — moving the type changes the import path everywhere it's used.

---

## Stale CSS classes in Sidebar.css

Several classes are defined but no JSX references them. Likely remnants of an earlier sidebar that contained the filter UI inline before `FilterWidget` was extracted, and the elevation stats inline before `ElevationWidget` was extracted. Suspect-stale set:

- Filter remnants: `.filter-toggle-btn`, `.filter-panel`, `.filter-group-row`, `.filter-group label`, `.filter-options`, `.filter-grid`, `.filter-months-grid`, `.month-btn`, `.clear-filters-btn` ([Sidebar.css:74-251](src/components/Sidebar.css:74)).
- Elevation remnants: `.expanded-course-info`, `.ele-meta-grid`, `.ele-meta-item`, `.ele-meta-content`, `.icon-up`, `.icon-avg` ([Sidebar.css:777-826](src/components/Sidebar.css:777)).

Removing them is safe but should be verified by running the app and visually checking the sidebar list, detail view, and filter panel. Don't add new code that depends on them.

---

## Sidebar imports `ElevationProfile` but doesn't render it

[Sidebar.tsx:22](src/components/Sidebar.tsx:22):

```ts
import { ElevationProfile } from './ElevationProfile';
```

Search the rest of `Sidebar.tsx`: `ElevationProfile` is **never used**. The chart is rendered exclusively by `ElevationWidget`, which is mounted by `HomeClient`. The Sidebar import is a leftover.

---

## Several `lucide-react` icons are imported and unused in Sidebar

[Sidebar.tsx:6-20](src/components/Sidebar.tsx:6) imports `Trophy, TrendingUp, Euro, ArrowUpRight, Maximize2` — none appear in the JSX. Same with `useRef` and `useEffect` from React on line 3. ESLint isn't catching this (or isn't configured to fail).

---

## `page.module.css` is unused boilerplate

[src/app/page.module.css](src/app/page.module.css) is the unmodified Create-Next-App template stylesheet. The actual page uses `globals.css`. The module file isn't imported anywhere. Safe to delete; not currently doing harm.

---

## Public SVGs aren't referenced

`public/file.svg`, `public/vercel.svg`, `public/next.svg`, `public/globe.svg`, `public/window.svg` — all CRA-template assets, none referenced from `src/`. Safe to delete.

---

## `process_gpx.py` has hardcoded absolute paths

[scripts/process_gpx.py:6-7](scripts/process_gpx.py:6):

```python
GPX_DIR = '/Users/theo/Documents/Projects/races-map/gpx'
OUTPUT_FILE = '/Users/theo/Documents/Projects/races-map/src/data/raceRoutes.json'
```

If you run this on any other machine or in a worktree, **it will operate on the original checkout's files, not the worktree's**. This is a real footgun in this repo's environment (worktrees under `.claude/worktrees/`).

If you need to regenerate routes from a worktree, edit the paths first or set `os.path.dirname(__file__)`-based paths.

---

## `process_gpx.py` `ID_MAPPING` ↔ `gpx/` files mismatch

The `gpx/` folder has 13 files; `ID_MAPPING` has 10 entries. Three GPX files are present but **not wired up** to any sub-race id:

- `Spartathlon 2025.gpx`
- `Meteora 9km 2025.gpx`
- `Metsovo 24km 2025.gpx` (the 21km variant `metsovo-ursa-trail-2025-21km 3.gpx` *is* mapped)

Several `scripts/find_*.py` and `search_*.py` scripts in the repo look like the maintainer was actively trying to discover the right Supabase IDs but didn't finish. Treat these GPX files as **pending** — running `process_gpx.py` will not include them.

---

## Cluster spiderfy radius is geometric, not chronological

[MapClient.tsx:441-462](src/components/MapClient.tsx:441):

```tsx
const angle = (index / spiderfiedCluster.races.length) * Math.PI * 2;
const radius = 60 + (index * 2);
```

Index ordering comes from `supercluster.getLeaves(clusterId, Infinity)`, which is whatever Supercluster's internal order produces — **not sorted by date or name**. If two cluster items have identical coords, they'll appear at adjacent angles, but other than that the ring order is arbitrary. Don't rely on it.

For a cluster of ~50 races, the outermost pin would be ~160px from center — still on screen but tighter than ideal.

---

## Map click-to-deselect fires even when clicking pins (offset by `stopPropagation`)

[MapClient.tsx:390-394](src/components/MapClient.tsx:390):

```tsx
onClick={(e) => {
  if (spiderfiedCluster) setSpiderfiedCluster(null);
  onDeselect();
}}
```

This runs on every map click. The reason this doesn't break selection is that markers all call `e.originalEvent.stopPropagation()` in their `onClick`:

```tsx
// MapClient.tsx:86
onClick={e => {
  e.originalEvent.stopPropagation();
  onClick(race, lng, lat);
}}
```

**Don't add a marker without `stopPropagation`** or it'll register the click and *then* deselect itself.

---

## React Marker `offset` is in pixels, not degrees

The spiderfy logic uses `offset={[x, y]}` to position fanned pins:

```tsx
<RaceMarker ... offset={[x, y]} ... />
```

`offset` in `react-map-gl/maplibre` is in screen-space pixels, applied after the lng/lat anchor. Don't try to compute spiderfy positions in degrees.

---

## The hardcoded fallback race in `page.tsx` ships its own constants

[src/app/page.tsx:32-46](src/app/page.tsx:32):

```ts
races = [{
  id: "89812f61-0666-48ce-a08a-2af4d72df863",
  event_name: "Half Marathon Mykonos 21km",
  ...
} as unknown as Race];
```

This is the visual default when Supabase is unconfigured (e.g. no `.env.local` in dev). Two consequences:

1. The first time someone runs `npm run dev` without env vars, they see one race in Mykonos. Don't assume "I see one race" means "Supabase is wired and only returned one row."
2. The `as unknown as Race` cast bypasses missing nullable fields. Don't rely on the fallback for testing the full UI — sub-race fetching, detail view, etc., will fail.

---

## ISR + Supabase ANON key in `NEXT_PUBLIC_*` env vars

[src/lib/supabase.ts:4-5](src/lib/supabase.ts:4):

```ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
```

The same client instance handles both server-side ISR and client-side `fetchSubRaces`. `NEXT_PUBLIC_*` env vars are inlined into the client bundle — fine for the publishable key, but **never put a service-role key in `NEXT_PUBLIC_*`**.

The `scripts/*.py` files also hardcode the URL and a `sb_publishable_*` key. That's safe by design (publishable keys are meant to be public), but it does mean both the URL and the publishable key are committed to the repo.

---

## Hover sync between elevation chart and map relies on `hoveredPoint.c`

[ElevationWidget.tsx:6-9](src/components/ElevationWidget.tsx:6):

```ts
interface Point { d: number; e: number; }
```

…but [MapClient.tsx:511-522](src/components/MapClient.tsx:511) reads `hoveredPoint.c`:

```tsx
{hoveredPoint && hoveredPoint.c && (
  <Marker longitude={hoveredPoint.c[0]} latitude={hoveredPoint.c[1]} ...>
```

The `c: [number, number]` field is on the actual data points (`raceRoutes.json` profile entries) but **not in the TypeScript interface**. The `c` field comes from `process_gpx.py:80`:

```python
'profile': [{'d': round(p['dist']), 'e': round(p['ele']), 'c': p['coords']} for p in profile]
```

So the runtime data has `c`, the type definition doesn't. The map-side code reads it via `hoveredPoint && hoveredPoint.c &&` — duck-typing past the type. If you tighten the type to remove `c?`, the map sync marker breaks. The correct fix is to **add `c?: [number, number]` to the `Point` interfaces** in `ElevationProfile.tsx` and `ElevationWidget.tsx`.

`ElevationProfile.tsx`'s `Point` interface ([ElevationProfile.tsx:4-8](src/components/ElevationProfile.tsx:4)) does include `c?: [number, number]` — it's `ElevationWidget.tsx` that's missing it.

---

## Map performance ceiling

With 1000 markers and Supercluster running every render, the map is performant on desktop but can be jittery on mid-range mobile during gestures. The repo already pays for memoization across the board — don't add per-render computation in markers, sidebar cards, or filters.

If race count grows past ~3000, the architecture (full client-side dataset + Supercluster on every change) will need to be reconsidered. The current design assumes the entire dataset fits comfortably in client memory and renders cheaply.

---

## React 19 + non-standard Next.js: hydration considerations

[layout.tsx:34-35](src/app/layout.tsx:34) sets `suppressHydrationWarning` on both `<html>` and `<body>`:

```tsx
<html lang="en" suppressHydrationWarning>
  <body className={inter.variable} suppressHydrationWarning>
```

This is a deliberate choice (likely to suppress a known warning from a browser-extension-injected attribute or a class that differs server/client). **Don't remove these without testing on a real browser** — the warnings will return.

---

## "Πίσω στη λίστα" back button has two distinct destinations

In the Sidebar:
- In **detail mode**, the back button goes back to the list ([Sidebar.tsx:159-166](src/components/Sidebar.tsx:159)).
- In **list mode with `isFiltered`** (i.e., a cluster was spiderfied), the back button label changes to "Εμφάνιση όλων των αγώνων" and resets to the unfiltered list ([Sidebar.tsx:319-322](src/components/Sidebar.tsx:319)).

Both call the same `onBack` (which calls `handleDeselect`). Be careful when changing this — `handleDeselect` clears `selectedRace`, `selectedSubRaceId`, `subRaces`, and `focusedRaces` all at once.

---

## On mobile, the elevation widget overlaps the sidebar drag handle

The `.sidebar-container` is fixed at the bottom on mobile (55vh). The `.elevation-widget` is also fixed at the bottom (`position: fixed; bottom: 0`) when an elevation profile is active. They overlap. The product compensates by **automatically minimizing the sidebar** when a sub-race is selected ([HomeClient.tsx:131](src/components/HomeClient.tsx:131)) — without that, the elevation widget would be hidden underneath.

If you change the sub-race selection flow to *not* minimize the sidebar, the mobile experience breaks.

---

## `dates[0]` parsed as a `Date` assumes ISO format

[HomeClient.tsx:83](src/components/HomeClient.tsx:83):

```ts
const raceMonth = new Date(race.dates[0]).getMonth();
```

If a date string like `"2026-04-01"` is parsed by `new Date()`, the result is interpreted as UTC midnight. In timezones west of UTC, `getMonth()` could return the previous month. **Greek timezone (UTC+2/+3) is east of UTC, so this works in the production audience's timezone**, but a developer in California at 22:00 local time would see month-off-by-one.

---

## ESLint not run on build

[package.json:5-10](package.json:5):

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```

`next build` does not invoke `eslint` automatically. Lint must be run manually with `npm run lint`. CI doesn't exist in this repo, so unused imports and dead code accumulate (see the unused Lucide icons in Sidebar above).

---

## `dragRotate={true}` on the map

[MapClient.tsx:389](src/components/MapClient.tsx:389) explicitly enables drag-to-rotate on desktop and three-finger-rotate on mobile. There's **no in-UI control to reset bearing back to north** other than the conditional reset-view button. If a user rotates the map and then deselects, they may feel "stuck" with a tilted view. The reset-view button only appears when zoomed past 7 or with a race selected — at zoom 5–7 with no selection, no reset button is shown.
