# Architecture

## Stack at a glance

| Layer | Choice | Pinned version |
|-------|--------|---------------|
| Framework | Next.js (App Router, RSC + Client Components) | `next@16.2.5` |
| UI runtime | React | `react@19.2.4`, `react-dom@19.2.4` |
| Map | MapLibre GL via `react-map-gl/maplibre` | `maplibre-gl@^5.24.0`, `react-map-gl@^8.1.1` |
| Clustering | Supercluster + `use-supercluster` hook | `supercluster@^8.0.1`, `use-supercluster@^1.2.0` |
| Database | Supabase (Postgres + REST) | `@supabase/supabase-js@^2.105.3` |
| Icons | Lucide React | `lucide-react@^1.14.0` |
| Lint | ESLint flat config + `eslint-config-next` | `eslint@^9` |
| Type checker | TypeScript `strict: true` | `typescript@^5` |
| GPX processing | Python 3 stdlib (`xml.etree`) | not in `package.json`, run by hand |

There is no test framework, no state-management library (Redux/Zustand/etc.), no styled-components/Tailwind/CSS-in-JS — styling is plain CSS with CSS custom properties and global stylesheets imported per component.

`AGENTS.md` (loaded via `CLAUDE.md`) warns that this Next.js is a non-standard build with breaking changes from the publicly documented APIs. Authoritative docs live under `node_modules/next/dist/docs/`. **Do not assume Next 14/15 patterns.**

---

## Three big shapes the system has

### 1. A single page that hydrates with all races

```
┌──────────────────────────────────────────────────────────────────┐
│  src/app/page.tsx           [Server Component]                   │
│   └─ Supabase query: races + sub_races!inner, w/ coordinates    │
│   └─ ISR: revalidate=3600                                        │
│   └─ Passes initialRaces to <HomeClient/>                        │
└────────────────────┬─────────────────────────────────────────────┘
                     │ initialRaces prop
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│  src/components/HomeClient.tsx        [Client Component]          │
│   • Owns: selectedRace, selectedSubRaceId, hoveredPoint,         │
│     subRaces (fetched on selection), focusedRaces, visibleRaces, │
│     filters, isSidebarMinimized                                  │
│   • Computes: filteredByControls (memoized) — applies filter UI  │
│   • Passes state down to MapClient, Sidebar, FilterWidget,       │
│     ElevationWidget                                              │
└──────────────────────────────────────────────────────────────────┘
```

The home page is server-rendered with all races for the initial paint. After hydration, *all* further state lives in the client component tree — there are no further server requests for race data. The only runtime fetches are:

- `fetchSubRaces(raceId)` when a race is selected (inline in `HomeClient` — talks to Supabase directly from the browser).

### 2. Three children of HomeClient drawn over a fullscreen map

```
HomeClient (relative container, 100vw × 100dvh)
├── <div class="mesh-gradient-container"> animated background blobs
├── <MapClient />        — fullscreen MapLibre, markers, clusters, routes
├── <Sidebar />          — glass panel with list / detail; mobile bottom-sheet
├── <FilterWidget />     — top-right (or FAB on mobile) dropdown
└── <ElevationWidget />  — bottom panel, mounted only when sub-race selected
```

These four siblings are all `position: absolute` over the map. They communicate exclusively through props/callbacks owned by `HomeClient`. There is no React Context, no event bus.

### 3. A separate offline data pipeline

```
gpx/*.gpx (curated by maintainer)
        │
        │  python3 scripts/process_gpx.py     (run by hand)
        │   ─ haversine distance, gain/loss aggregation
        │   ─ profile sampled to ~200 points
        │   ─ ID_MAPPING dict (filename → sub_race UUID)
        ▼
src/data/raceRoutes.json           (committed; 10 entries currently)
        │
        ▼ imported as a JSON module
MapClient + Sidebar + ElevationWidget
```

GPX files are *not* fetched at runtime. They're transformed once into a JSON map keyed by Supabase `sub_races.id`. The runtime only does an O(1) lookup `(raceRoutes as any)[subRaceId]`.

This is the only "build step" beyond `next build`, and it is manual.

---

## Data model

Two Supabase tables (typed in [src/types/database.ts](src/types/database.ts)):

### `races` — top-level events
- `id`: uuid
- `event_name`, `event_name_en`, `event_name_translations` (JSON): naming
- `description`, `description_en`: long copy
- `dates: string[]`: ISO date strings; `dates[0]` is treated as the next/primary date
- `max_distance: number | null`: meters; the *longest* sub-race distance (used for filter bucketing)
- `event_type: string | null`: case-insensitive matched against `'road'` / `'trail'`
- `location_lat`, `location_lng`: floats; required for the race to render
- `location_place`, `location_region`, `location_city`: free-text address fragments
- `event_url`, `scraped_url`: outbound link hierarchy (event_url first, scraped_url fallback)
- `nearest_city`, `nearest_city_id`: not used by the client today
- `confidence_score`, `confidence_explanation`, `reviewed`, `needs_rescan`, `rescaned_date`: pipeline metadata, not surfaced
- `has_multiple_races: boolean | null`: not read by the client; presumably set when a race has >1 sub-race
- `source_id`, `created_at`, `updated_at`

### `sub_races` — distances within a race
- `id`: uuid (this is the key into `raceRoutes.json`)
- `race_id`: FK → `races.id`
- `name: string | null`: e.g. "Spartathlon 246km"
- `category: string | null`: enum-like (`marathon`, `half-marathon`, `ultra-marathon`, `kids-run`, …)
- `distance: number | null`: meters
- `elevation: number | null`: gain in meters
- `price: number | null`: euros
- `date: string | null`: per-sub-race date
- `created_at`

The home page query enforces `sub_races!inner(id)` — a race without at least one sub-race never reaches the client.

### Local-only data: `raceRoutes.json`

Keyed by `sub_races.id`. Each value:

```ts
{
  id: string;            // same as the key
  filename: string;      // source GPX filename, debugging only
  stats: {
    distance: number;    // meters
    gain: number;        // meters (D+)
    loss: number;        // meters (D-)
    max_ele: number;
    min_ele: number;
  };
  profile: Array<{
    d: number;           // cumulative distance, meters
    e: number;           // elevation, meters
    c: [number, number]; // [lng, lat] for sync-marker on map
  }>;                    // ~200 sampled points
  geojson: {
    type: "Feature";
    geometry: { type: "LineString"; coordinates: [number, number][] };
    properties: { sub_race_id: string; ...stats };
  };
}
```

The `profile` and `geojson` are derived from the same source GPX but at different fidelities: `profile` is downsampled for chart performance (~200 pts); `geojson.geometry.coordinates` is the full point list for map drawing.

---

## Data flow: input → output

Two paths matter.

### Path A: page load → render

```
[Supabase races+sub_races]
  → src/app/page.tsx (Server, ISR-cached)
  → HomeClient receives initialRaces
  → filtered through FilterState (default: upcomingOnly=true)
  → MapClient projects to clustered points (Supercluster, radius 50)
  → markers/clusters + sidebar list both render
  → onMoveEnd → bounds → setVisibleRaces (debounced 400ms)
    → sidebar list intersects (focused || visibleRaces) ∩ filteredByControls
```

### Path B: user clicks a marker → detail + route + elevation

```
click marker
  → MapClient.handleRaceClick
  → onRaceSelect(race)
  → HomeClient.handleRaceSelect:
       setSelectedRace(race)
       setSelectedSubRaceId(null)
       setIsSidebarMinimized(false)
       fetchSubRaces(race.id)   — Supabase
  → mapRef.flyTo(race coords, zoom 12, pitch 45)
  → Sidebar re-renders in "detail mode"
  → subRaces resolves → cards render with route badges where applicable

click sub-race card with route
  → Sidebar → onSubRaceClick(subId)
  → HomeClient.handleSubRaceSelect:
       setSelectedSubRaceId(subId)
       setIsSidebarMinimized(true)
  → MapClient.routesToShow recomputes; focused route is bright, others dim
  → MapClient effect: fitBounds to focused route's coordinates
  → ElevationWidget mounts (because hasElevation === true on HomeClient)

hover elevation chart
  → ElevationProfile.findClosestPoint(clientX) → onHover(point)
  → HomeClient.setHoveredPoint
  → ElevationProfile re-renders cursor + sync marker on the chart
  → MapClient renders pulsing dot at point.c (lng,lat)
```

---

## Key design decisions and the reasoning behind them

### Why Server Component for the page, Client for everything below
- Race data is largely stable within an hour, so ISR (`revalidate = 3600`) is a perfect fit.
- The full race list goes over the wire **once**, embedded into the initial HTML payload. After that, there's no streaming or pagination — the entire interaction is local.
- This keeps the runtime architecture extremely simple: no APIs, no GraphQL, no SWR/React Query. The only client-side fetch is for sub-races, and only on demand.

### Why one big `HomeClient` instead of context
- All shared state is funneled through `HomeClient` and lives in `useState` hooks. Children are dumb-ish.
- `useMemo` is used aggressively (`filteredByControls`, `points`, `routesToShow`, `filteredRaces`, `RaceCard` memoization, `RaceMarker` memoization) because the markers + cluster recomputation can be expensive at 1000 races.
- React 19 with no concurrency primitives needed; this is a top-down render.

### Why Supercluster over MapLibre's native clustering
- Supercluster runs entirely in JS, so cluster behavior (counts, leaves, spiderfy) is fully controllable from React.
- Clusters need custom DOM (hover popup, count badge with glass styling) — easier to render via `<Marker>` than via map source/layer styling.

### Why fly + tilt on selection
- The 45° pitch + zoom-to-12 transition gives the user a sense of "going there", not just "showing a point". It also reveals terrain context, which matters for trail races. See [MapClient.tsx:332-340](src/components/MapClient.tsx:332).

### Why the spiderfy fallback
- Some Greek races (e.g. multi-distance events at the same start line) have identical coordinates. Pure cluster-zoom can't separate them. The spiderfy ring guarantees that no race is permanently hidden.

### Why a separate JSON for routes instead of a Supabase column
- A typical 40km GPX has thousands of points. Storing them as a Postgres `geography` column or a JSON blob and shipping them per request would be slow.
- The JSON is checked into the bundle (currently ~10 entries), so route data ships as part of the JS chunk and lookups are O(1).
- Tradeoff: adding a new route requires re-running `process_gpx.py` and committing the regenerated JSON.

### Why a Python script for GPX, not Node
- `xml.etree.ElementTree` plus haversine math is a one-screen Python script. The maintainer chose a tool they were comfortable with for a one-off pre-build step. There's nothing tying the data layout to Python — a Node rewrite would be straightforward.

### Why CSS is global / per-component plain CSS
- The aesthetic is a unified "premium glass" theme; CSS custom properties (`--accent-primary`, `--glass-border`, `--text-secondary`) are declared once in `globals.css` and reused everywhere.
- No CSS scoping framework keeps the bundle tiny but means class names must be deliberately namespaced (e.g. `.marker-pin` vs `.race-card` vs `.option-btn`).
- See `GOTCHAS.md` for several stale class names that suggest the global stylesheets have drifted past component refactors.

### Why ISR with 1-hour revalidate, not on-demand revalidation
- New data hits the database via the upstream pipeline; the maintainer doesn't push to revalidate. An hour is a reasonable freshness/load tradeoff for a discovery site.
- The fallback hardcoded race in `page.tsx` ensures the site renders even if Supabase is unconfigured (useful for local dev without `.env.local`).

---

## Cross-cutting concerns

### Performance
- Memoization at every level: `RaceMarker`, `ClusterMarker`, `RaceCard` are `React.memo`. Filter results, points, routes, sorted/filtered list are all `useMemo`.
- The map's bounds → list debounce is 400ms ([MapClient.tsx:319](src/components/MapClient.tsx:319)).
- Cluster hover only fetches leaves on `mouseenter` and caches them — clusters with many items don't pay the cost until the user actually hovers.

### Accessibility
- Limited. The map and most controls are unlabelled for screen readers (icon-only buttons in the layers menu, no `aria-label` on the filter trigger besides a `title`). The close button on the elevation widget has `aria-label="Close"` but that's the exception.

### Mobile considerations
- Hover-based affordances are conditionally hidden in CSS (`@media (max-width: 768px)`).
- Touch handlers are wired manually on the sidebar drag handle and on the elevation SVG.
- Safe-area insets respected (`env(safe-area-inset-bottom)` in Sidebar.css and ElevationWidget.css).
- `viewportFit: 'cover'` and `maximumScale: 1`/`userScalable: false` set in [layout.tsx:10-16](src/app/layout.tsx:10) — implies the maintainer wants iOS-PWA-like behavior with no pinch zoom (the map handles its own zoom).

### Internationalization
- Single language (Greek) at the rendering level; English text in metadata only.
- Dates use `toLocaleDateString('el-GR', …)` in multiple files.
- Inter font loaded with both Latin and Greek subsets ([layout.tsx:6](src/app/layout.tsx:6)).
- No `i18next` or similar; all strings are inline.
