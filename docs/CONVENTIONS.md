# Conventions

Rules followed by the existing code, with anti-patterns called out. Examples are pulled directly from the repo.

---

## Imports and module paths

### Mixed import styles for the `src` tree
The path alias `@/*` → `./src/*` is configured in [tsconfig.json:22-24](tsconfig.json:22). It is used **only in the entry server component** ([src/app/page.tsx:1-3](src/app/page.tsx:1)):

```ts
import { supabase } from '@/lib/supabase';
import HomeClient from '@/components/HomeClient';
import { Race } from '@/types/database';
```

Everywhere else uses **relative imports**:

```ts
// HomeClient.tsx
import { Race, SubRace } from '../types/database';
import { supabase } from '../lib/supabase';
import MapClient from './MapClient';
import raceRoutes from '../data/raceRoutes.json';
```

**Convention:** match the surrounding file. Don't normalize — both styles are intentional in their files. New components in `src/components/` should use relative paths.

### CSS imports are side-effect imports adjacent to the TSX
Each component imports its own stylesheet at the top of the file:

```ts
// FilterWidget.tsx
import './FilterWidget.css';
```

Plus the global stylesheet imported once in `layout.tsx`:

```ts
import "./globals.css";
```

**Don't:** create a `styles/` folder or move CSS far from its consuming component. Don't switch to CSS Modules — `globals.css` defines class names that other component CSS files reference (`.glass-panel`, `.marker-pin`, `--accent-primary`, etc.).

---

## Component file naming and shape

### One component per file, file = component name
- `MapClient.tsx` exports `MapClient` as default.
- `FilterWidget.tsx` exports `FilterWidget` as a **named** export (`export const FilterWidget: React.FC<...>`).
- `Sidebar.tsx`, `HomeClient.tsx`, `MapClient.tsx`: **default exports**.
- `ElevationWidget.tsx`, `ElevationProfile.tsx`, `FilterWidget.tsx`: **named exports**.

**Convention:** mixed. Match the export style used by sibling files in the same area, but default exports are slightly more common for the larger components.

### Internal helper components live inside their parent file
`RaceMarker` and `ClusterMarker` are defined inside `MapClient.tsx` ([MapClient.tsx:68-230](src/components/MapClient.tsx:68)). `RaceCard` is defined inside `Sidebar.tsx` ([Sidebar.tsx:26-54](src/components/Sidebar.tsx:26)).

**Pattern:** if a sub-component is only used by one parent, keep it in the same file. Wrap it in `React.memo` if it's rendered in lists.

```tsx
const RaceCard = React.memo(({ race, isSelected, onClick }: { ... }) => {
  return ( ... );
});
```

**Don't:** extract every sub-component into its own file. Don't create a `MapClient/` or `Sidebar/` directory — the existing flat layout is intentional.

---

## State management

### Single source of truth in `HomeClient`
All cross-cutting state lives in `HomeClient` via `useState`:
- `selectedRace`, `selectedSubRaceId`, `hoveredPoint`, `subRaces`, `isLoadingSubRaces`, `focusedRaces`, `visibleRaces`, `isSidebarMinimized`, `filters`.

State is passed down as props; updates come back via callbacks (`onRaceSelect`, `onClusterClick`, `onVisibleRacesChange`, `onDeselect`, `onFiltersChange`, `onMinimize`, `onHover`, `onClose`).

**Don't:**
- Don't introduce React Context.
- Don't introduce Redux, Zustand, Jotai, or any state library.
- Don't put cross-component state in the URL (no search params yet).
- Don't use `useReducer` here — the component tree is small and `useState` per concern is clearer.

### Locally-scoped state stays local
- `Sidebar` owns `searchTerm`, `isDescriptionExpanded`, `dragY`, `isDragging`, `touchStartY` — none are lifted because no other component needs them.
- `MapClient` owns `currentStyle`, `showStyleMenu`, `spiderfiedCluster`, `viewState`, `bounds`.
- `FilterWidget` owns only `isOpen`.

**Convention:** lift state only when a sibling needs it.

### `useMemo` for derived data; `useCallback` for handlers used across many children
- Filtered/sorted lists, GeoJSON points, route arrays — `useMemo`. Always cite a dependency array.
- Map handlers passed to many markers — `useCallback`.

```tsx
const filteredByControls = useMemo(() => {
  return initialRaces.filter(race => { ... });
}, [initialRaces, filters]);

const handleRaceClick = useCallback((race: Race, lng: number, lat: number) => {
  ...
}, [onRaceSelect]);
```

**Don't:** memoize trivially cheap derivations or every callback — only the ones rendered into many children.

---

## Styling

### CSS custom properties as the design system
Defined once in [globals.css:1-15](src/app/globals.css:1):

```css
:root {
  --bg-main: #0a0a0c;
  --text-primary: #f8f9fa;
  --text-secondary: #a1a1aa;
  --accent-primary: #FF5733;          /* coral, the primary action color */
  --accent-primary-glow: rgba(255, 87, 51, 0.4);
  --accent-secondary: #FFC300;        /* gold, used for trail */
  --accent-trail: #FFC300;
  --accent-road: #FF5733;
  --transition-smooth: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
```

**Convention:** use these vars whenever possible:

```css
.race-badge.road  { color: var(--accent-road); }
.race-badge.trail { color: var(--accent-trail); }
.option-btn.active { background: var(--accent-primary); }
```

**Anti-pattern:** hardcoding hex colors in component styles when a token covers it. Exception: `ROUTE_COLORS` array in [MapClient.tsx:11](src/components/MapClient.tsx:11) — these are genuinely a palette for cycling, not theme colors.

**Note:** `--glass-border` is referenced widely in component CSS (e.g. [Sidebar.css:16](src/components/Sidebar.css:16), [FilterWidget.css:18](src/components/FilterWidget.css:18)) but **not declared in globals.css**. It resolves to the browser default (transparent) — see GOTCHAS. Do not introduce code that depends on its specific value.

### `.glass-panel` is the universal frosted-glass mixin
Applied everywhere that should have the dark-translucent treatment:

```tsx
<div className="sidebar-container glass-panel">...</div>
<button className="filter-trigger-btn glass-panel">...</button>
<div className="cluster-hover-list glass-panel animation-slide-up">...</div>
```

**Convention:** if a panel/dropdown/popup needs the design language, add `glass-panel`. Don't reimplement the backdrop-filter and border manually.

### Mobile breakpoints
The repo uses two breakpoints, repeated in each component CSS:
- `@media (max-width: 768px)` — phones / small tablets, the primary "mobile" mode.
- `@media (max-width: 380px)` — small phones, occasional tightening.

**Don't:** introduce new arbitrary breakpoints. Don't use `min-width` queries — the repo is mobile-aware-but-desktop-first.

### Color coding for race types
Always:
- **Road = `--accent-primary` / `#FF5733` / coral.**
- **Trail = `--accent-trail` / `#FFC300` / gold.**

Mirrored in:
- Marker icon backgrounds (`.marker-road`, `.marker-trail` in [globals.css:105-106](src/app/globals.css:105)).
- Race badges (`.race-badge.road`, `.race-badge.trail`).
- Lucide icons: `Footprints` for road, `Mountain` for trail.

**Anti-pattern:** swapping the icon set or using the colors for unrelated UI states (no green-for-success/red-for-error elsewhere — the only red/green pair is D+/D- on the elevation widget).

---

## Localization

### UI strings are inline Greek
No i18n framework. Strings sit directly in JSX:

```tsx
<button>Επίσημη Ιστοσελίδα</button>
<h1>Αγώνες στην Ελλάδα</h1>
```

Greek month abbreviations are hardcoded in [FilterWidget.tsx:14-17](src/components/FilterWidget.tsx:14):

```tsx
const months = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιούν', 'Ιούλ', 'Αύγ', 'Σεπ', 'Οκτ', 'Νοέ', 'Δεκ'];
```

**Convention:** when adding UI strings, write them in Greek inline. Don't introduce English-language strings into the rendered UI without first establishing whether i18n is desired (see OPEN_QUESTIONS).

### Dates use `'el-GR'`
Always:

```tsx
new Date(race.dates[0]).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })
new Date(selectedRace.dates[0]).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' })
```

**Anti-pattern:** raw ISO display, `toLocaleString()` without locale, or any English month name.

---

## Type usage

### Strict TypeScript with frequent `as any` escape hatches
`tsconfig.json` has `"strict": true`. But the code uses `as any` in several places to access dynamically-keyed data:

```tsx
const hasElevation = !!(selectedSubRaceId && (raceRoutes as any)[selectedSubRaceId]);
const routeData = (raceRoutes as any)[sub.id];
```

**Convention:** the `raceRoutes` JSON has dynamic UUID keys, so `as any` is the pragmatic escape. If you want to do better, type it as `Record<string, RouteEntry>` once and use that type.

### Race / SubRace types come from the generated-style Database type
[src/types/database.ts](src/types/database.ts) defines a `Database` type and exports `Race` and `SubRace` helpers:

```ts
export type Race = Database['public']['Tables']['races']['Row'];
export type SubRace = Database['public']['Tables']['sub_races']['Row'];
```

**Convention:** add new tables to `Database['public']['Tables']` and re-export a helper alias. Do not import row types from somewhere else.

### `FilterState` interface lives in the consumer that owns it
Despite there being an empty `src/types/filters.ts` file, `FilterState` is declared in [HomeClient.tsx:12-20](src/components/HomeClient.tsx:12) and imported from there by both `Sidebar` and `FilterWidget`:

```ts
import { FilterState } from './HomeClient';
```

**Convention:** for state that is owned by exactly one component, define the type in that component file. Don't move it preemptively.

---

## Map and geography

### Coordinates are always `[lng, lat]` order, lat-required-non-null at query time
- The Supabase query filters `not('location_lat', 'is', null).not('location_lng', 'is', null)` so any race that reaches the client has both coordinates.
- After that, code uses non-null assertion: `race.location_lng!`, `race.location_lat!` — see [MapClient.tsx:277-285](src/components/MapClient.tsx:277).

**Convention:** trust the query gate; no need for null-checks once a race is in `initialRaces`.

### GeoJSON LineStrings, MapLibre
Routes are GeoJSON Features with `LineString` geometry, fed into `<Source type="geojson">` + `<Layer type="line">`. Layer paint is overridden per render based on focus state:

```tsx
paint={{
  'line-color': color,
  'line-width': isFocused ? 6 : 4,
  'line-opacity': isFocused ? 1 : (hasSelection ? 0.15 : 0.8)
}}
```

**Anti-pattern:** drawing routes via SVG over the map (loses pan/zoom alignment), or as DOM polylines.

### Camera transitions use `flyTo` / `fitBounds` with a duration
Selection always animates:

```tsx
mapRef.current?.flyTo({
  center: [lng, lat],
  zoom: 12,
  pitch: 45,
  duration: 1000
});
```

**Convention:** never `setViewState` directly to teleport. Use the imperative MapLibre handle for animations (1000–1500ms typical).

---

## Performance patterns

### Memoize anything rendered in a list
- `RaceMarker` and `ClusterMarker` are `React.memo` ([MapClient.tsx:68](src/components/MapClient.tsx:68), [MapClient.tsx:122](src/components/MapClient.tsx:122)).
- `RaceCard` is `React.memo` ([Sidebar.tsx:26](src/components/Sidebar.tsx:26)).

**Anti-pattern:** rendering 1000 markers without memoization.

### Debounce expensive map → list updates
The map's `onMoveEnd` updates bounds, then a 400ms `setTimeout` filters the in-bounds races:

```tsx
useEffect(() => {
  if (!bounds) return;
  const timer = setTimeout(() => { ... onVisibleRacesChange(filtered); }, 400);
  return () => clearTimeout(timer);
}, [bounds, races, onVisibleRacesChange]);
```

**Convention:** if a derived computation runs on every map gesture, debounce.

### Cluster leaves are fetched lazy on hover
The `ClusterMarker` only calls `supercluster.getLeaves(clusterId, 10)` on `mouseenter`. **Don't** prefetch leaves for every cluster on render.

---

## Anti-patterns to avoid

### Don't bypass `HomeClient` for cross-component state
For example, don't make `MapClient` query Supabase for sub-races — that's `HomeClient`'s job. The map should remain a presentational/projection component.

### Don't introduce a router for filter state
Filters are entirely client-side. There's no `useSearchParams` integration. Adding URL params for shareable filter state would be reasonable, but it would be a deliberate architectural change — not a refactor.

### Don't add new top-level pages without considering the architecture
The current product is one page. Adding `/race/[id]` would require migrating away from the in-memory selection state. Discuss before doing.

### Don't add a CSS framework
Tailwind, styled-components, emotion, etc. would conflict with the global CSS variables and the explicit class-name conventions across files.

### Don't store secrets server-side without `.env*`
The `.gitignore` excludes `.env*` files. The Supabase URL and **publishable** anon key are the only credentials needed; keep service-role keys out of the repo entirely. Note: the `scripts/*.py` files do hardcode the publishable key — that is by design, since it's safe to expose.

### Don't run `process_gpx.py` on CI without first generalizing the paths
The script has hardcoded absolute paths to `/Users/theo/...`. It is meant to be run locally. If you want CI generation, parameterize the paths first.

### Don't use the `Inter` font with only Latin subset
[layout.tsx:6](src/app/layout.tsx:6) loads `subsets: ["latin", "greek"]`. Greek glyphs are required for the visible UI.

### Don't forget the empty `src/types/filters.ts`
If you do extract `FilterState` into a shared types file, **rename the file** (e.g., delete `filters.ts` and create something explicitly typed) or fill it with the actual type. A 0-byte committed file is the kind of thing that gets misinterpreted by future contributors.

---

## Code style

### Function components, no classes
Always.

### Arrow function consts for components
```tsx
export const FilterWidget: React.FC<FilterWidgetProps> = ({ filters, onChange }) => { ... };
```

…or `function` declarations for default-exported top-level components:

```tsx
export default function HomeClient({ initialRaces }: HomeClientProps) { ... }
```

Both are present. Match the surrounding file.

### No comments unless they justify *why*
Existing comments are sparse and explanatory:

```tsx
// We only fetch races that have coordinates AND have at least one sub-race
// 150ms buffer to reach the list
// Slightly longer debounce for smoothness
```

**Don't** add comments that restate the code. **Do** add a one-liner when a number, threshold, or workaround would otherwise be inscrutable.

### Greek strings are inline; English text is reserved for code identifiers
Variable, function, and component names are English. UI strings are Greek. Don't mix.
