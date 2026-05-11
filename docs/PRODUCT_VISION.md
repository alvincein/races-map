# Product Vision

## What this product is

**Greek Running Races** is a single-page, map-first discovery tool for road and trail running events held in Greece. The user opens the site and is presented with a dark, full-screen interactive map of Greece dotted with markers — each marker is an event the user can join. A list of events is overlaid on the left (or, on mobile, a pull-up sheet from the bottom), so the map and the list always agree on what is being shown.

The site is bilingual in spirit but the UI is **written in Greek** (Αγώνες στην Ελλάδα, Δρόμος, Βουνό, Ημιμαραθώνιος, etc.). Race data has both Greek and English fields (`event_name` / `event_name_en`, `description` / `description_en`), but only the Greek values are surfaced in the current UI.

The HTML metadata describes the site in English ("Discover the best road and trail running races across Greece") and the page title is "Greek Running Races" — see [src/app/layout.tsx:19](src/app/layout.tsx:19) — suggesting the audience is conceived of as both Greek and international, even if the rendered UI defaults to Greek.

## Who it's for

Inferred from feature priorities:

- **Recreational and amateur runners in Greece** looking for their next race. The default filter is `upcomingOnly: true` — users come here to plan, not to browse history.
- **Trail runners** in particular get strong product attention: every event with a route file gets an elevation profile with D+ / D- / max / min, the kind of stats a trail runner cares about. Files in `gpx/` are heavily weighted toward mountain races (Olympus, Zagori, Metsovo, Ursa Trail, TeRA, Spartathlon).
- **Tourists / international runners** considering racing while in Greece — implied by the English metadata and the existence of `event_name_en` / `description_en` in the schema, though the UI doesn't yet expose a language toggle.

## The problem it solves

Race information for Greek running events is scattered across federation pages, club sites, social media, and PDF flyers. Two specific frictions this product addresses:

1. **Discovery by geography.** "What's happening near me / near where I'll be on holiday?" is hard to answer from text directories. A map answers it instantly.
2. **Visualizing the course.** For trail and ultra events, knowing the elevation profile is decision-critical — a 21km trail with 1,300m of climb is a completely different commitment from a 21km road race. Most race websites either don't publish a profile or hide it in a PDF. This site shows it inline, synchronized with the map.

The data also implies a third, scraping-shaped problem: race info on the source sites is messy and unreliable. Schema columns like `confidence_score`, `confidence_explanation`, `reviewed`, `needs_rescan`, `rescaned_date`, `scraped_url` (all on the `races` table — see [src/types/database.ts](src/types/database.ts)) reveal that races are gathered by an external scraper and reviewed for quality before publication. The web app is the consumer-facing surface of that pipeline.

## Key principles inferred from design choices

### 1. The map is the primary interface, the list is a companion

The map fills the viewport; the sidebar floats above it as a glass panel. Selecting a marker drives the sidebar; panning the map filters the list (see `onVisibleRacesChange` in [src/components/MapClient.tsx:309-321](src/components/MapClient.tsx:309)). The list never has its own filter state for geography — geography always comes from the map.

### 2. Density without clutter

When markers overlap, they cluster (`useSupercluster`, radius 50, maxZoom 20). When a cluster can't be split further by zooming (>18), it "spiderfies" — expanding into a circular halo of individual markers around the original cluster point ([MapClient.tsx:432-473](src/components/MapClient.tsx:432)). Hovering a cluster reveals up to 10 races without committing to a zoom action ([MapClient.tsx:186-226](src/components/MapClient.tsx:186)).

### 3. Trail/road distinction is first-class

The two event types each get a dedicated icon, gradient, glow color, and badge:
- **Road** = coral (`#FF5733`) + Footprints icon → "Δρόμος"
- **Trail** = gold (`#FFC300`) + Mountain icon → "Βουνό"

This pairing recurs in markers, race cards, detail badges, and filter buttons. The product takes a position that these are different products for different runners.

### 4. Premium/native-feeling UI as a differentiator

`globals.css` invests heavily in glassmorphism (40px blur, saturated, with inset highlights), animated mesh-gradient blobs in the background, marker pulse animations, fly-to camera transitions on selection, drag-to-minimize bottom sheets on mobile, "premium" feel as an explicit goal (see commit message: *"feat: implement race map with premium UI and data enrichment"*). This is unusual for a hobby/utility site and signals the project is positioned closer to a polished consumer app than a directory.

### 5. Mobile is a designed surface, not an afterthought

The sidebar transforms into a draggable bottom sheet on mobile with touch handlers, threshold-based minimize/expand, safe-area insets ([Sidebar.tsx:89-123](src/components/Sidebar.tsx:89), [Sidebar.css:539-588](src/components/Sidebar.css:539)). Desktop-only stats are hidden on small screens. The filter button collapses to a circular FAB. Map labels and hover lists are hidden on mobile to avoid touch/hover ambiguity ([globals.css:212-217](src/app/globals.css:212)).

### 6. Greek-first copy

All visible UI strings are Greek. The Inter font is loaded with both `latin` and `greek` subsets ([layout.tsx:6](src/app/layout.tsx:6)). Dates are formatted with locale `'el-GR'`. This is a deliberate choice — even though English values exist in the database.

### 7. Data shown only when verified

The home page query requires both coordinates **and** at least one sub-race (`sub_races!inner(id)`, `not.is.null` on lat/lng — [src/app/page.tsx:13-18](src/app/page.tsx:13)). Races without locations or without distance details are silently excluded, even though they exist in the database. The principle: better to show fewer races well than to show a marker with no information behind it.
