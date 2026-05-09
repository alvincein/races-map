# Features

All features are accessed from a single page. There is no auth, no account, no checkout — the user lands and starts exploring. Strings below are quoted in the language the user actually sees (Greek).

## 1. Map exploration

### Full-screen interactive map of Greece
- Opens centered on Greece (lng 23.7275, lat 37.9838) at zoom 5.5 with a 30° pitch — see [MapClient.tsx:253-259](src/components/MapClient.tsx:253).
- The user can pan, zoom, rotate, and tilt the camera with mouse, touch, or the navigation control in the bottom-right corner.
- Background mesh blobs (coral / gold) drift behind the map and through the glass panels for depth.

### Switching map style
- A "Layers" button (top-right) opens a vertical menu with four base maps: **Σκούρο** (dark), **Φωτεινό** (light), **Χάρτης** (Voyager), **Δορυφόρος** (Esri satellite).
- Selecting a style swaps the basemap immediately while keeping markers, routes, and current selection in place.

### Reset view
- On mobile only, a "Maximize" button appears next to the layers button **whenever the user is zoomed in past 7 or has selected a race**. Tapping it flies the camera back to the initial Greece overview ([MapClient.tsx:531-539](src/components/MapClient.tsx:531)).

## 2. Race markers

### Single-race pin
- Each race with coordinates becomes one pin. Pins are color-coded:
  - **Coral with a Footprints icon** for road races.
  - **Gold with a Mountain icon** for trail races.
- Hovering a pin (desktop) reveals a glass label card showing: race name, max distance in kilometers, first scheduled date in Greek short format ("3 Νοε"), and the place / city.
- Hovering also enlarges the pin and a soft pulse animation plays on the selected pin.
- Hover labels are hidden on mobile — see [globals.css:212-217](src/app/globals.css:212).

### Cluster markers
- When markers overlap at the current zoom, they collapse into a translucent circle showing the count. Clusters are produced client-side by Supercluster.
- **Hovering a cluster** (desktop) shows a popup titled "Αγώνες στην περιοχή" listing up to 10 of the races inside. If there are more, the popup ends with "...και N ακόμα". Each row in the popup is clickable and selects that race directly.
- **Clicking a cluster** zooms the map in to the cluster's expansion zoom (capped at 18). If the cluster cannot be split further (expansion zoom > 18), instead the cluster "spiderfies" — markers fan out in a ring around the cluster point with dashed connector lines, so each can be inspected individually.

### Selecting a race from the map
- Clicking any pin (single or cluster member) flies the camera to that point at zoom 12 with a 45° pitch over 1 second, opens the race detail in the sidebar, and fetches the race's sub-races from Supabase.

## 3. Sidebar — list view

### "Αγώνες στην Ελλάδα" panel
- Default state: a glass panel pinned top-left on desktop. Mobile: a bottom sheet at 55vh height.
- Header has the title and a search input.
- Below: a scrollable vertical list of race cards. Cards are sorted by first race date (ascending; undated races sink to the bottom).

### Race card
- Each card shows: a "Δρόμος" or "Βουνό" badge (color-coded), the first scheduled date, race name, and place/city (or "TBD" if missing).
- Hovering animates the card up by 4px with a subtle scale and a faint radial highlight following the cursor ([Sidebar.css:865-876](src/components/Sidebar.css:865)).
- Clicking a card opens the detail view and fires the same fly-to behavior as clicking a marker.

### Searching
- The text field filters cards in real time. Match is case-insensitive and runs against `event_name` and `location_place` (not city, not region, not description). Empty state: "Δεν βρέθηκαν αγώνες."

### List ↔ map sync
- The list shows only races whose markers are currently visible on the map (computed via map bounds and a 400ms debounce — [MapClient.tsx:309-321](src/components/MapClient.tsx:309)). Panning the map prunes the list. The user never explicitly opts in.

### Cluster-focus mode
- After clicking (spiderfying) a cluster, the sidebar header changes to "Αγώνες σε αυτή την τοποθεσία" with an "Εμφάνιση όλων των αγώνων" back button. Only the races in that cluster are listed.

## 4. Sidebar — detail view

When a race is selected (from map, cluster popup, or list card), the sidebar transitions into detail mode:

### Hero section
- Trail/road badge.
- Race name.
- Three meta rows: full long-form date ("19 Απριλίου 2026"), location_place (or city, or "Ελλάδα" as fallback), and region if present.
- "Πίσω στη λίστα" back button at the top.

### Description
- Section titled "Πληροφορίες Εκδήλωσης".
- Shows `description` (Greek) or falls back to `description_en`. If neither, "No description available for this event."
- Long descriptions (>250 chars) are truncated with a "Περισσότερα" / "Λιγότερα" toggle.

### Available routes ("Διαθέσιμες Διαδρομές")
- Lists every sub-race fetched for this event.
- Each sub-race card shows a localized name (mapping `category` like `marathon` → "Μαραθώνιος", `half-marathon` → "Ημιμαραθώνιος", `ultra-marathon` → "Ultra", `kids-run` → "Παιδικός Αγώνας"; falls back to distance like `21km` or category name) — see [Sidebar.tsx:223-232](src/components/Sidebar.tsx:223).
- Each card shows: distance, elevation gain (from the bundled GPX route if available, otherwise the DB value), and price in euros.
- Sub-races whose `id` matches an entry in `raceRoutes.json` get a blue "Διαδρομή" badge and a left-edge accent — these are clickable to load the route on the map.

### Loading state
- "Φόρτωση αποστάσεων..." while sub-races are being fetched. If none exist, "Δεν έχουν καταχωρηθεί συγκεκριμένες αποστάσεις."

### Action button
- "Επίσημη Ιστοσελίδα" button at the bottom links to `event_url` or, as a fallback, `scraped_url`. Opens in a new tab.

## 5. Course visualization

### Drawing routes on the map
- Selecting a race renders **all** of its sub-race routes (those with bundled GPX data) as colored lines on the map. Each is assigned one of 8 warm-tone colors (`ROUTE_COLORS` in [MapClient.tsx:11-20](src/components/MapClient.tsx:11)) cycled by index.
- When no specific sub-race is focused, all lines render at full opacity (0.8). When one is focused, the focused line is brightened (opacity 1, width 6) and the others dim to 15% to put the focused one in the foreground. The focused line also gets a soft glow halo via a second blurred line layer.

### Selecting a sub-race
- Clicking a sub-race card with a "Διαδρομή" badge:
  - Fits the map to the bounding box of that route with 100px padding over a 1.5s flight.
  - Minimizes the sidebar (especially helpful on mobile).
  - Opens the **Elevation Widget** at the bottom of the screen.

### Elevation widget
- Glass panel anchored along the bottom of the map. Title: "Ανάλυση Διαδρομής".
- Displays: total distance, **D+** (gain, green), **D-** (loss, red), and on desktop also max and min altitude.
- Below the stats, an SVG area chart with gradient fill renders the elevation profile (~200 sample points). The X axis is distance in km, the Y axis is elevation, both labeled.
- Hovering or dragging on the chart shows a vertical cursor + a circle marker on the curve, plus a "Hover indicator" pill at the top with the exact distance and elevation under the cursor.
- The same hovered point pushes a **synchronized pulsing marker on the map** at the GPS coordinate ([MapClient.tsx:511-522](src/components/MapClient.tsx:511)) — moving the cursor along the chart traces the location along the route on the map.
- A close (X) button dismisses the widget and unselects the route.

## 6. Filtering

A "Φίλτρα" button (top-right on desktop, bottom-right circular FAB on mobile) opens a glass dropdown panel titled "Φίλτρα Αγώνων". A small dot ("filter badge") appears on the trigger when any filter is active.

### Time filters ("Χρονική Περίοδος")
- **Toggle switch: "Μόνο Μελλοντικοί"** — defaults ON. When on, races whose first date is in the past are hidden.
- **Buttons: Όλοι / 3 Μήνες / 6 Μήνες / Εύρος** — restrict to upcoming 3 months, 6 months, or all time.
- Selecting "Εύρος" reveals two date pickers (Από / Έως) for a custom range.

### Course type filter ("Τύπος Διαδρομής")
- Three exclusive buttons: **Όλοι / Δρόμος / Βουνό**.

### Distance filter ("Αποστάσεις")
- Five toggleable pills: 5χλμ-10χλμ, 10χλμ-20χλμ, Ημιμαραθώνιος, Μαραθώνιος, Ultra. Multiple may be active at once.
- Buckets are inclusive on the upper bound and based on `max_distance` (meters): 5k=≤5000, 10k=5001–12000, 21k=12001–25000, 42k=25001–45000, ultra=>45000 — see [HomeClient.tsx:69-75](src/components/HomeClient.tsx:69).

### Month filter ("Μήνες Διεξαγωγής")
- Twelve toggleable month pills (Ιαν..Δεκ). The race must have a `dates[0]` whose calendar month matches one of the selected months.

### Footer actions
- "Επαναφορά" resets all filters to defaults.
- "Εφαρμογή" closes the panel (filters apply live as you toggle, so this is purely UI confirmation).

## 7. Mobile interactions

### Bottom sheet drag
- The sidebar's drag handle (centered horizontal pill at the top) supports touch-drag. Dragging down beyond 100px minimizes the sheet to 40px height, hiding everything but the handle. Dragging up from minimized state restores it.
- Tapping the handle also toggles minimize/restore.

### "Εμφάνιση Λίστας" button
- When the sheet is minimized, a glass button overlays the screen with this label, providing a tap-to-restore alternative to the drag handle.

### Mobile-only behaviors
- Marker hover labels and cluster hover popups are hidden (no hover state on touch).
- Map navigation controls (zoom buttons) are hidden — gestures only.
- Reset-view button shown only when zoomed/selected.
- Filter button collapses to circular FAB; the panel becomes a fixed bottom drawer.
- Elevation widget becomes a fixed full-width bottom bar with safe-area inset padding.

## 8. Data fallbacks

### Empty Supabase
- If the Supabase env vars are missing, or the query errors out, the page falls back to a single hardcoded race ("Half Marathon Mykonos 21km") so the UI still renders something — see [src/app/page.tsx:31-47](src/app/page.tsx:31). This is a developer-facing safety net rather than a product feature.

### ISR refresh
- The home page revalidates server-side every hour (`export const revalidate = 3600`). Race data is cached for that long; updates from the data pipeline propagate within an hour without a deploy.
