# Comprehensive SEO Strategy for Races Map

Achieving perfect SEO for a map-based Single Page Application (SPA) like yours requires bridging the gap between an interactive, client-heavy experience and search engines' need for parseable, server-rendered content. Currently, the entire app operates under a single route (`/`), which means search engines only see the homepage and none of the individual races.

Here is the step-by-step strategy to transform your Next.js application into an SEO powerhouse.

---

## 1. Architectural Changes: Dynamic Routing for Races
To index individual races, every race *must* have its own unique URL (e.g., `/race/[id]`).

### Implementation (Next.js App Router):
- **Intercepting & Parallel Routes**: Next.js 13+ supports intercepting routes (`@modal/(.)race/[id]`). This allows you to show the race details in your `Sidebar` or a modal *over* the map without losing the map state when navigating client-side, while still providing a unique URL.
- **Standalone Pages**: If a user hits `/race/[id]` directly from Google, Next.js will render the full map page with the specific race already selected and open in the sidebar.

## 2. Server-Side Metadata (`generateMetadata`)
With individual URLs in place, you can generate rich, dynamic metadata for every race.

### Implementation:
Create a `generateMetadata` function inside your new `/app/race/[id]/page.tsx` file:
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const race = await fetchRaceById(params.id);
  return {
    title: `${race.name} - Greek Running Races`,
    description: `Join the ${race.name} on ${race.date}. View route, elevation profile, and register.`,
    openGraph: {
      title: race.name,
      images: [race.cover_image_url], // Dynamically generated or fetched
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
    }
  };
}
```

## 3. Structured Data (JSON-LD)
Structured data helps Google understand that your pages represent actual events, allowing you to appear in the Google Events carousel.

### Implementation:
Inject a JSON-LD script tag in the race page representing a `SportsEvent`.
```html
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "name": race.name,
    "startDate": race.date,
    "location": {
      "@type": "Place",
      "name": race.location_name,
      "address": race.location_address
    },
    "image": [race.image_url],
    "description": race.description
  }) }}
/>
```

## 4. Crawlability (`sitemap.ts` & `robots.txt`)
Search engines need a roadmap to find all your race pages.

### Implementation:
- **`app/sitemap.ts`**: Use Next.js dynamic sitemap generation. Fetch all race IDs from Supabase and return an array of URLs (`https://yourdomain.com/race/1`, `https://yourdomain.com/race/2`, etc.) with their `lastModified` dates.
- **`app/robots.txt.ts`**: Allow crawling for all endpoints and point directly to your generated sitemap.

## 5. Semantic HTML & On-Page SEO
Ensure the content within the sidebar is semantically structured, even though it's part of a complex interactive UI.

### Implementation:
- Use proper `<h1>` tags for the Race Name in the sidebar.
- Ensure only **one** `<h1>` is rendered on the screen at any time.
- Use `<h2>` for sub-races and `<h3>` for logistical details.
- Add descriptive `alt` text to all map markers and UI icons.

## 6. Core Web Vitals (Performance SEO)
Google ranks pages based on loading speed and layout stability. Map libraries (like MapLibre/Mapbox) are heavy and can hurt your scores.

### Implementation:
- **Lazy Load the Map**: Defer the loading of the MapClient until after the main UI/Sidebar has painted, or use `next/dynamic` to split the bundle.
- **Font Optimization**: You are already using `next/font/google`, which is perfect. Ensure `display: swap` is applied.
- **Preload Critical Assets**: If you have hero images or essential icons, use `<link rel="preload">`.

## Summary Roadmap for Execution:
1. **Refactor Routing**: Move from state-based selection to URL-based selection (`/race/[id]`).
2. **Add Metadata**: Implement `generateMetadata` for the new routes.
3. **Inject JSON-LD**: Add structured data for `SportsEvent`.
4. **Generate Sitemap**: Implement `sitemap.ts` to expose all races.
5. **Optimize Map Load**: Ensure the heavy map bundle doesn't block the initial page paint.
