# Core Node — Product Bible (CANON)

**Format:** Progressive Web App / Constellation Hub  
**Creator:** BasicHiro (Human Command — Development & Creative)  
**Label:** Central Node of the Core Node / Nexus constellation  
**Domain:** corenode.nexus  
**Status:** Active — home one-pager + map carousel shipping; Population telemetry wiring in progress  

---

## Logline

A mobile-first constellation hub that drops users into a colorful arcade universe for Core Node, then lets them scroll planet-to-planet on the map and Explore each sister world — with BasicHiro as the public creative credit.

---

## The Prime Directive (non-negotiable)

1. **Core Node is the central hub** — not a sister product and not a generic portfolio site.
2. **Users land on Core Node first** (`/`), then **Enter Map** (`/map`).
3. Each planet has one clear job (status + Explore). Do not blur sister identities.
4. Look **techy + gamy** — arcade space energy, not cold SaaS dashboard.
5. Brand signal is **Nexus orange** (`#FF5F1F`) + Core Node orbital mark.
6. Public credit: **By BASICHIRO** / © Core Node.
7. Stay unofficial / constellation-framed — no false claims of owning sister IPs beyond Nexus framing.

---

## Vocabulary (use consistently)

| Term | Meaning |
|------|---------|
| **Core Node** | This product / central hub |
| **Constellation** | The linked Nexus worlds |
| **Node / Planet** | A world on the map (Core, Prime Portal, Grimm Fracture, Nexus Prime, Save Point) |
| **Mass** | Display stat for planet “weight” (not Level) |
| **Population** | Unique visitor count from each site’s `/api/stats` (HUD may be hidden) |
| **Map** | `/map` — scroll / arrows float camera between planets |
| **Home / Planet page** | `/` — one-pager entry (legacy `/planet` redirects here) |
| **Explore** | CTA that opens that world’s site |
| **Arcade void** | Animated space backdrop (invaders, asteroids, nebulae, distant planets) |
| **BASICHIRO** | Public producer credit |

**Avoid in new copy:** “dashboard,” “users,” “AI-powered platform,” “Level” (use Mass), ship/flight jargon for the current map UX.

---

## Tone & themes

- Arcade-command presence + constellation wonder  
- Colorful universe, not sterile black void  
- Clear navigation > mystery gatekeeping on the hub  
- Build-in-public / maker energy via BasicHiro credit  
- Sister worlds stay vivid and distinct  

**Not:** purple SaaS landing page, newspaper broadsheet, cream terracotta portfolio, flight-sim HUD clutter.

---

## Command structure (context for Gemini)

### Human Command
- **BasicHiro:** Development, creative direction, shipping decisions  

### AI Infrastructure
- **Director Gem:** Design + direction (default)  
- **Art Director Gem:** Arcade space / logo / planet visuals  

---

## Tech stack (native web)

| Layer | Lock |
|-------|------|
| Frontend | Next.js + Tailwind — mobile-first |
| Deploy | Vercel (`corenode.nexus`) |
| Sister telemetry | Public `GET /api/stats` → Core aggregates via `/api/population` |
| Logo | `CoreNodeLogo` component (SVG mark + wordmark) |
| Space layer | `ArcadeSpaceBackdrop` canvas |

---

## User journey (shipping)

### Phase 1 — Drop-in (Home `/`)
Lands on Core Node one-pager → sees arcade universe + logo → **By BASICHIRO** → Enter Map or Read Signal.

### Phase 2 — Map (`/map`)
Scrolls / arrows / dots between planets → reads status + Mass → Explore opens sister site (Core Explore returns home).

### Phase 3 — Telemetry (partial)
Each sister exposes unique visitors as `population`; Core aggregates. Population HUD remains hidden until wiring is locked.

---

## Sister nodes (display locks)

| Node | Status | Mass | Explore |
|------|--------|------|---------|
| Core Node | CENTRAL NODE | 19 | `/` |
| Prime Portal | TCG ANALYTICS | 34 | primeportal.nexus |
| Grimm Fracture | AI GENERATIVE WEB COMIC | 6 | grimmfracture.nexus |
| Nexus Prime | TECH STACK | 15 | nexusprime.nexus |
| Save Point | FREE ARCADE (RETRO) | 4 | savepoint.nexus |

Colors: Core `#FF5F1F` · Prime `#3b82f6` · Grimm `#ef4444` · Nexus Prime `#a855f7` · Save Point `#FF00FF`

---

## Non-negotiable shipping checklist

- [ ] Entry is Core Node home, not map  
- [ ] Map logo top-left (~200–300px) matches Core Node mark  
- [ ] Footer copyright on map + home  
- [ ] By BASICHIRO visible on home  
- [ ] No ship / random cryptic Dex fragments on map  
- [ ] Population labeled Population (unique visitors) when shown  
