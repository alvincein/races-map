# Caching Architecture

This document details the caching and data-refresh mechanisms implemented across the codebase to optimize database performance, client responsiveness, and static page loading.

---

## 1. Database Query Cache (Server-side In-memory)
* **Description:** Caches the list of races and their sub-races fetched from Supabase.
* **Implementation:** [fetchRacesCached](file:///Users/theo/Documents/Projects/races-map/src/lib/races.ts#L73) in [races.ts](file:///Users/theo/Documents/Projects/races-map/src/lib/races.ts).
* **Data Cached:** An array of `RaceWithSubRaces`.
* **Duration:** **1 minute** (`const CACHE_TTL_MS = 60000`).
* **Purpose:** Prevents multiple concurrent API requests from slamming the database during Next.js builds or parallel user sessions.

---

## 2. Page-level Cache (ISR) and CDN
* **Description:** Pages are prerendered and served from Vercel's cache; they refresh on demand through `/api/revalidate`, which the race-scraper calls after each nightly import (`POST`, `REVALIDATE_SECRET`) and Vercel Cron calls daily at 03:30 UTC (`GET`, `CRON_SECRET`, see `vercel.json`).
* **Implementation:**
  * **Race detail pages:** `revalidate = false` in [page.tsx](src/app/race/[slug]/page.tsx) — refreshed only when the scraper passes the race's id. Timed revalidation across ~600 pages blew through the free-tier ISR write quota before.
  * **Home, `/agones`, `/agones/[hub]`:** `revalidate = 86400`, and refreshed on every `/api/revalidate` call (their race lists and month gating depend on the calendar).
  * **`/api/races`:** `force-static` + `revalidate = false`, refreshed on every `/api/revalidate` call.
  * **Sitemap:** **not ISR.** [sitemap.xml/route.ts](src/app/sitemap.xml/route.ts) renders per request and Vercel's CDN caches it for an hour (`s-maxage=3600, stale-while-revalidate=86400`). See the Gotchas entry on why it can't be ISR.
* **Bypass Shortcut:** A client-side key event handler listens for `Ctrl/Cmd + Shift + R` to fetch live data directly from the Supabase client, bypassing the cached ISR page context (see [HomeClient.tsx](file:///Users/theo/Documents/Projects/races-map/src/components/HomeClient.tsx#L123-L137)).

---

## 3. User Favorites Cache (Client-side Persistent)
* **Description:** Stores the user's selected favorite race IDs.
* **Implementation:** [useFavorites](file:///Users/theo/Documents/Projects/races-map/src/lib/useFavorites.ts#L5) in [useFavorites.ts](file:///Users/theo/Documents/Projects/races-map/src/lib/useFavorites.ts).
* **Data Cached:** Array of race ID strings.
* **Duration:** **Indefinite / Permanent** (persisted using `localStorage` under the key `'races_favorites'`).

---

## 4. User Geolocation (Client-side Component-scoped)
* **Description:** Remembers the user's fetched GPS coordinates.
* **Implementation:** `userLocationRef` inside [useGeolocation.ts](file:///Users/theo/Documents/Projects/races-map/src/components/Map/useGeolocation.ts#L22).
* **Data Cached:** Coordinates object `{ lat: number, lng: number }`.
* **Duration:** **Temporary (Lifecycle-scoped)**. Stored in a React ref, lasting only until the component or page is unmounted. Re-triggering geolocation uses this cache to re-pan the map instantly.

---

## 5. GPX Route Fetching (Explicit Cache Bypassing)
* **Description:** Fetches the geojson tracks/polylines and elevation data for sub-races.
* **Implementation:** [fetchRaceRoute](file:///Users/theo/Documents/Projects/races-map/src/lib/routes.ts#L30) in [routes.ts](file:///Users/theo/Documents/Projects/races-map/src/lib/routes.ts).
* **Data Type:** JSON files containing polylines and elevation profiles from the Supabase Storage bucket.
* **Cache Behavior:** **No Cache (Explicit Cache Bypassing)**. A timestamp query parameter (`?t=${Date.now()}`) is appended to the request URL to bypass CDN and browser-level caches, ensuring the client always obtains the newest GPX route geometry.
