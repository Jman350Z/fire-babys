# SEO Report — firebabys.io (index.html)

Analyzed: October 3, 2026 (live page fetched)

## What's already good ✅
- `<title>`: "Fire Babys — The Fire-Safety Battle Game for Kids" — clear, keyword-rich
- `<meta name="description">` present and well-written
- Open Graph tags: og:title, og:description, og:type=website, og:image
- Twitter card: summary + title + description
- `<html lang="en">`, theme-color, favicon, apple-touch-icon, PWA manifest
- Semantic HTML: nav, section, footer, proper h1/h2 hierarchy
- Mobile viewport meta present

## What's missing ❌ (priority order)

### 1. JSON-LD structured data (HIGH — biggest win for a game site)
No schema.org markup at all. Add a `VideoGame` schema so Google can show rich results:
```json
{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Fire Babys",
  "description": "...",
  "applicationCategory": "Game",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "author": { "@type": "Person", "name": "Jeffery Pruden" },
  "audience": { "@type": "PeopleAudience", "suggestedMinAge": 6 }
}
```

### 2. sitemap.xml (HIGH)
Doesn't exist (404). Create one listing: index.html, play.html, 3d.html, parents.html, characters.html, privacy.html, terms.html, faq.html, press.html, parents-dashboard.html.

### 3. robots.txt (HIGH)
Doesn't exist (404). Minimal version:
```
User-agent: *
Allow: /
Sitemap: https://firebabys.io/sitemap.xml
```

### 4. Canonical URL (MEDIUM)
No `<link rel="canonical">`. Add to every page:
```html
<link rel="canonical" href="https://firebabys.io/">
```

### 5. Missing OG/Twitter tags (MEDIUM)
- `og:url` (https://firebabys.io/)
- `og:site_name` ("Fire Babys")
- `twitter:image` (currently only og:image exists)

### 6. Heading keyword coverage (LOW)
H1/H2s are good ("fire-safety battle game for kids") but could add a variant like "free online game for kids" in body copy for long-tail search.

### 7. Footer internal linking (LOW)
Footer links are minimal. Once the 5 new brand pages go live, add Privacy/Terms/FAQ/Press links to the footer of every page (already included in the new pages' footers).

## Recommended action
Deploy the 5 new brand pages first (they're built and ready), then do one SEO pass: add JSON-LD + canonical + missing OG tags to all pages, create sitemap.xml + robots.txt, and submit the sitemap in Google Search Console.
