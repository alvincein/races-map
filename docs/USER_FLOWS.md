# User Flows

These are the journeys users actually take through the app. Triggers are user actions; outcomes are the visible end-state. State changes are tied to specific files where useful.

---

## Flow 1: Land on the site

**Trigger:** User opens the URL.

**What happens:**
1. The Next.js server fetches up to 1000 races from Supabase (`races` joined with `sub_races!inner` to require at least one distance, and only those with non-null lat/lng — see [src/app/page.tsx:13](src/app/page.tsx:13)).
2. The page is rendered with ISR caching (revalidate 3600s).
3. Browser receives an HTML document with markers and list pre-baked into the client bundle.
4. The map mounts centered on Greece at zoom 5.5, pitched 30°. Mesh-gradient blobs animate in the background. The sidebar slides in with the race list, sorted by date.
5. The default filter `upcomingOnly: true` is applied, so past races are hidden.

**Outcome:** The user sees a map of Greece with clusters and pins for upcoming races, plus a list on the left (or pull-up on mobile).

---

## Flow 2: Browse races by panning the map

**Trigger:** User pans / zooms the map.

**What happens:**
1. As the camera moves, `onMoveEnd` fires `updateBounds` which captures the new viewport bounds ([MapClient.tsx:295-307](src/components/MapClient.tsx:295)).
2. After a 400ms debounce, the in-bounds subset of races is published via `onVisibleRacesChange` ([MapClient.tsx:309-321](src/components/MapClient.tsx:309)).
3. `HomeClient` passes that subset (intersected with the active filters) to the sidebar.
4. The sidebar's race list updates to show only what's currently on screen.

**Outcome:** The list and the map are always pointing at the same set of races. The user can scroll the list to discover races they hadn't noticed on the map.

---

## Flow 3: Open a race's detail

**Trigger:** Any of:
- Click a single pin on the map.
- Click a card in the sidebar list.
- Click a row inside a cluster's hover popup.

**What happens:**
1. `handleRaceSelect` runs ([HomeClient.tsx:120-125](src/components/HomeClient.tsx:120)): sets `selectedRace`, clears any previously focused sub-race, un-minimizes the sidebar, and triggers `fetchSubRaces` to query `sub_races` for the race id.
2. If the trigger was on the map, the camera flies to the race coordinates at zoom 12 with a 45° pitch over 1 second.
3. The sidebar swaps to detail mode showing the race name, badges, dates, place, region, description (with read-more if long), and a loading state for sub-races.
4. When sub-races resolve, they render as cards. Cards whose `sub.id` matches a key in `raceRoutes.json` show a "Διαδρομή" badge — these have bundled GPX route data.

**Outcome:** The user sees full race information and can read on, click an external link, or pick a specific sub-race route.

---

## Flow 4: Visualize a sub-race's course

**Trigger:** User clicks a sub-race card that has a "Διαδρομή" badge.

**What happens:**
1. `handleSubRaceSelect` runs ([HomeClient.tsx:127-133](src/components/HomeClient.tsx:127)). The sub-race id is set as `selectedSubRaceId` and the sidebar is auto-minimized so the map and chart get visual priority.
2. `MapClient` looks up the route in `raceRoutes.json` via the sub-race id and renders its GeoJSON LineString as a colored map layer. Other sub-race routes for the same race are rendered too, but dimmed. The focused route gets a glow underlay.
3. A `useEffect` computes the bounding box of the focused route's coordinates and `fitBounds` flies the camera to encompass the whole line with 100px padding ([MapClient.tsx:360-375](src/components/MapClient.tsx:360)).
4. The Elevation Widget mounts at the bottom of the viewport with stats + an SVG profile rendered from the route's `profile` array.

**Outcome:** The user sees the course drawn on the terrain, knows the climbing/descent profile, and can compare distance/elevation across the race's sub-races.

---

## Flow 5: Inspect a specific km of a course

**Trigger:** User hovers (desktop) or drags a finger (mobile) along the elevation chart.

**What happens:**
1. The SVG handler computes the closest point in the `profile` array by horizontal proportion ([ElevationProfile.tsx:53-73](src/components/ElevationProfile.tsx:53)) and calls `onHover` with that point.
2. The hover state propagates up to `HomeClient`, which re-renders both the chart and the map.
3. The chart displays a vertical guide line + a marker dot on the curve, plus a floating pill showing "Απόσταση: X.XXkm" and "Υψόμετρο: Ym".
4. On the map, a pulsing white dot appears at the GPS coordinate corresponding to that profile point ([MapClient.tsx:511-522](src/components/MapClient.tsx:511)).

**Outcome:** The user sees both *where on the course* and *at what altitude* they would be at that point — useful for understanding the climb structure of a trail/ultra event.

---

## Flow 6: Apply filters

**Trigger:** User clicks the "Φίλτρα" button (top-right on desktop, bottom-right FAB on mobile).

**What happens:**
1. The Filter dropdown panel opens.
2. The user toggles upcoming-only, picks a date range (or custom dates), picks Road/Trail, picks distance buckets, and/or picks months.
3. Each toggle calls `onChange` with a new `FilterState`. `HomeClient` recomputes `filteredByControls` (memoized) over `initialRaces` ([HomeClient.tsx:61-118](src/components/HomeClient.tsx:61)).
4. Markers, clusters, and the sidebar list all update simultaneously.
5. A small accent-colored dot appears on the filter trigger button to indicate active filters.

**Outcome:** The user narrows down to relevant races. They can hit "Επαναφορά" to clear, or "Εφαρμογή" to dismiss the panel.

---

## Flow 7: Drill into a dense cluster

**Trigger:** User clicks a cluster marker.

**What happens (branch A — splittable cluster):**
- The map flies to a higher zoom level computed by Supercluster's `getClusterExpansionZoom`, capped at 18. The cluster breaks apart into smaller clusters or individual pins.

**What happens (branch B — unsplittable cluster, expansion zoom > 18):**
- All races in the cluster are pulled out via `getLeaves(clusterId, Infinity)`.
- The cluster "spiderfies" into a circular ring of individual pins around the original point ([MapClient.tsx:432-473](src/components/MapClient.tsx:432)). Dashed SVG lines connect each pin back to the center.
- `onClusterClick` notifies `HomeClient`, which sets `focusedRaces` to that subset.
- The sidebar header changes to "Αγώνες σε αυτή την τοποθεσία" with an "Εμφάνιση όλων των αγώνων" back button. The list shows only the cluster's races.

**Outcome:** The user can pick a single race out of an otherwise unbreakable pile (e.g. multiple sub-events at the same start line).

---

## Flow 8: Search by name or place

**Trigger:** User types in the sidebar search box.

**What happens:**
1. The `searchTerm` state updates as the user types.
2. `filteredRaces` (memoized in [Sidebar.tsx:125-136](src/components/Sidebar.tsx:125)) re-runs: case-insensitive substring match against `event_name` and `location_place`.
3. The list shrinks live. Empty state shows "Δεν βρέθηκαν αγώνες."
4. The map is **not** affected — search is list-only.

**Outcome:** The user finds a known race quickly without having to locate it on the map.

---

## Flow 9: Open the official race website

**Trigger:** User clicks "Επίσημη Ιστοσελίδα" inside the detail view.

**What happens:**
- A new browser tab opens at `event_url`, falling back to `scraped_url`, falling back to `#` (no-op) — see [Sidebar.tsx:289-297](src/components/Sidebar.tsx:289).

**Outcome:** The user leaves to the canonical race page (registration, full rules, etc.). This product hands off — it does not handle registration.

---

## Flow 10: Adjust the basemap

**Trigger:** User clicks the "Layers" icon (top-right corner of the map).

**What happens:**
1. A vertical menu slides open with four labeled options: Σκούρο, Φωτεινό, Χάρτης, Δορυφόρος.
2. Picking one calls `setCurrentStyle` ([MapClient.tsx:543](src/components/MapClient.tsx:543)). MapLibre swaps the style URL; markers and route layers re-render onto the new tiles.
3. The menu closes.

**Outcome:** The user picks a basemap suited to their context — satellite to see actual terrain near a trail course, dark to reduce eye strain, light/voyager for road navigation.

---

## Flow 11: Mobile — minimize the sheet to focus on the map

**Trigger (any of):**
- User drags the sidebar's top handle downward by more than 100px.
- User taps the handle.
- User selects a sub-race route (this auto-minimizes — see Flow 4).

**What happens:**
1. The container collapses to 40px tall, exposing the underlying map.
2. The "Εμφάνιση Λίστας" button appears in the corner.
3. Tapping that button (or dragging the handle up by more than 100px) restores the sheet.

**Outcome:** The user can switch fluidly between map exploration and reading race information without losing context.
