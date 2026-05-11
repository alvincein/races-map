# Open Questions

Things that look unfinished, ambiguous, or where intent could not be inferred from the code alone. Each item names the file/lines so a future contributor can investigate.

## Product intent

### Is the product Greek-only or multilingual?
The DB schema has `event_name_en`, `description_en`, and `event_name_translations` (JSON) — see [src/types/database.ts:33-37](src/types/database.ts:33). The HTML metadata is English ("Discover the best road and trail running races across Greece" — [src/app/layout.tsx:20](src/app/layout.tsx:20)). The Inter font is loaded with the `greek` subset. But the rendered UI is hard-coded Greek strings; there is no language toggle anywhere. **Was a language switcher planned but deferred, or is the product positioned as Greek-UI / English-SEO?**

### Who maintains the source data?
The `races` table has `scraped_url`, `source_id`, `confidence_score`, `confidence_explanation`, `reviewed`, `needs_rescan`, `rescaned_date` ([src/types/database.ts:21-39](src/types/database.ts:21)) — clearly there's a scraping/review pipeline upstream. **None of that pipeline lives in this repo.** Where is it? Is data quality the user's pain or just the maintainer's?

### Is the kids race / family race a target audience?
The sub-race name mapping in [Sidebar.tsx:223-232](src/components/Sidebar.tsx:223) includes `kids-run` → "Παιδικός Αγώνας", but no other code suggests this is a marketed audience. Could be inherited from the source data ontology rather than a deliberate product choice.

## Features that look incomplete or vestigial

### `src/types/filters.ts` is empty (0 lines)
Yet [src/components/HomeClient.tsx:12-20](src/components/HomeClient.tsx:12) defines `FilterState` inline and exports it from `HomeClient`. It looks like the type was meant to live in the dedicated file but never moved. **Is `filters.ts` reserved for future expansion, or is it dead?**

### Several CSS class names that have no consumer
- `.expanded-course-info`, `.ele-meta-grid`, `.ele-meta-item`, `.ele-meta-content`, `.icon-up`, `.icon-avg` (all in [Sidebar.css:777-826](src/components/Sidebar.css:777)) — no JSX in `Sidebar.tsx` references them. Likely remnants of a previous detail-view design where elevation stats lived in the sidebar before the dedicated `ElevationWidget` was extracted.
- `.filter-toggle-btn`, `.filter-panel`, `.filter-group-row`, `.filter-group label`, `.filter-options`, `.filter-grid`, `.filter-months-grid`, `.month-btn`, `.clear-filters-btn` (all in [Sidebar.css:74-251](src/components/Sidebar.css:74)) — these were likely an earlier inline filter UI inside the Sidebar that has since moved to the standalone `FilterWidget` component.
- The `FilterWidget` itself uses different class names (`.filter-trigger-btn`, `.filter-dropdown-panel`, `.option-btn`, `.month-pill`, `.clear-all-btn`).

**Should the obsolete CSS be deleted, or is something still relying on it?**

### `src/app/page.module.css` is the unmodified Next.js boilerplate
142 lines of CSS for a default Create-Next-App landing page that is never imported. The actual styles live in `globals.css`. **Safe to delete?**

### Several lucide-react icons are imported but unused
[Sidebar.tsx:6-20](src/components/Sidebar.tsx:6) imports `Trophy`, `TrendingUp`, `Euro`, `ArrowUpRight`, `Maximize2` — none appear in the JSX. Same for `useRef` and `useEffect` from React. Looks like leftovers from refactors.

### The Spartathlon, Athens Marathon Authentic, and Meteora 9km GPX files are bundled but not in `raceRoutes.json`'s ID mapping
Comparing `gpx/` (13 files) against [scripts/process_gpx.py:93-104](scripts/process_gpx.py:93) (10 entries):
- `Spartathlon 2025.gpx` — not mapped to a sub-race id.
- `Meteora 9km 2025.gpx` — not mapped.
- `Metsovo 24km 2025.gpx` — not mapped (only the Metsovo Ursa 21km is mapped via a different filename).

The `find_missing_races.py` and `search_*.py` scripts hint that the maintainer was actively trying to locate these races' Supabase IDs but hadn't finalized the mapping. **Are these races intentionally pending, or were the IDs found but never wired up?**

### `has_multiple_races`, `nearest_city`, `nearest_city_id`, `event_name_translations` schema columns
Defined on the `races` table but **not read anywhere in the client code**. Either driven by the upstream pipeline or planned UI features that haven't shipped. Specifically `nearest_city` could power a "near me" or "nearest large city" view that doesn't exist yet.

### `confidence_score` / `confidence_explanation` not surfaced
These exist on every race but aren't used to filter or sort, and aren't shown to the user. **Should low-confidence races be hidden, marked, or held back to the review pipeline?** Currently they appear identically to high-confidence ones.

## Behavioral / UX ambiguities

### The `useEffect` in MapClient that re-fits to a focused route fires on every `selectedSubRaceId` AND `routesToShow` change
[MapClient.tsx:360-375](src/components/MapClient.tsx:360). If the user manually pans away after a route is loaded, then anything that recomputes `routesToShow` (e.g., a fresh sub-races fetch) will yank the camera back to the route bounds. **Is this intentional sticky-camera behavior, or a bug?**

### Race deduplication on the home page
[src/app/page.tsx:24](src/app/page.tsx:24) deduplicates by `id`, taking the first occurrence. If `sub_races!inner` returns multiple rows per race, the kept row is whichever Supabase returns first — there's no ORDER BY. **In practice this is fine because all rows share the same race columns, but it's a fragile assumption.**

### The "upcoming only" filter checks only `dates[0]`
[HomeClient.tsx:88-92](src/components/HomeClient.tsx:88). A multi-day event whose first date has passed but later dates haven't will be filtered out as "past". **Was this intentional simplification or oversight?**

### `dragRotate={true}` on the Map but no in-UI cue
Mobile users who triple-finger / two-finger rotate the map will tilt it; there's no on-screen reset other than the conditional reset button. Power feature or footgun?

### Cluster spiderfy radius scales with `index`
`radius = 60 + (index * 2)` ([MapClient.tsx:441-462](src/components/MapClient.tsx:441)) — the more items in the cluster, the more they spiral outward. With ~50 items the outermost would be ~160px from the cluster center. **This is geometric, not chronological — is the visual ordering meaningful, or was this just to avoid pin overlap?**

### The home-page query has `.limit(1000)` ([page.tsx:18](src/app/page.tsx:18))
What happens at race #1001? No pagination, no warning, no "more available". Likely fine for the current Greek data scale but a hard ceiling.

### `dates: string[]` as an array
A race can have multiple dates (recurring events?), but only `dates[0]` is ever read. If a race recurs annually, presumably the database stores all known dates and the first one is the next/upcoming — but that's an inferred convention, not an enforced one.

## Maintenance & dev experience

### `process_gpx.py` is run manually, no automation
The mapping from filename → sub-race id is hand-edited at the bottom of the script. There's no CI step, no `npm run` wrapper, and no documentation. **What's the workflow for adding a new GPX route?** Likely: drop the file in `gpx/`, look up the sub-race id in Supabase using one of the `find_*.py` scripts, append to `ID_MAPPING`, run `python3 scripts/process_gpx.py`, commit the regenerated JSON.

### Hardcoded Supabase URL + anon key in scripts
Several `scripts/*.py` files include a Supabase URL + publishable API key in plaintext (e.g. [scripts/list_races.py:4-5](scripts/list_races.py:4)). It's the publishable (sb_publishable_*) key so this is by design, but it does mean the project URL is checked into the repo.

### No tests
No `tests/`, no `__tests__/`, no `vitest`/`jest` in `package.json`. Quality is enforced only through TypeScript `strict: true` and ESLint.

### `AGENTS.md` warns: "This is NOT the Next.js you know"
Next is pinned to `16.2.5` ([package.json:15](package.json:15)) and `react@19.2.4`. The warning suggests the repo intentionally targets a forked/preview Next.js with different conventions, and pulls docs from `node_modules/next/dist/docs/`. **What specific breaking changes apply here, and where are they documented?** A senior agent should not assume Next.js 14/15 patterns translate.
