# Core Node — Gemini Production Kit

AI-assisted **design & direction** pipeline for **BasicHiro / Core Node** (`corenode.nexus`).

Upload this folder into a Gemini Gem (or paste key files into Gemini knowledge) so every UI brief, copy block, constellation moment, and image prompt pulls from the same locked product canon.

**Source anchors**
- Live app: this repo (`core-node`)
- Entry surface: `/` — Core Node one-pager (arcade universe hero)
- Map surface: `/map` — planet carousel constellation
- Legacy redirect: `/planet` → `/`
- Sister nodes: Prime Portal, Grimm Fracture, Nexus Prime, Save Point

## What this kit solves

| Pain | Fix |
|------|-----|
| Brand voice drifts (generic portfolio vs Nexus hub) | Locked vocabulary in `PRODUCT_BIBLE.md` |
| Space UI looks flat / boring SaaS dark | Style lock in `STYLE_GUIDE.md` (arcade void + orange core) |
| Constellation nodes get renamed / mislabeled | Node locks in `systems/CONSTELLATION.md` |
| Home vs Map jobs blur | Surface locks in `systems/MAP_AND_PLANET.md` |
| Population / stats ideas invent fake metrics | Telemetry locks in `systems/POPULATION_TELEMETRY.md` |
| Slow iteration with Gemini | Sprint + pipeline + feedback loops in `workflows/` |

## Folder map

```
gemini/
  README.md                 ← you are here
  GEM_SYSTEM.md             ← paste as Gem instructions
  PRODUCT_BIBLE.md          ← mission, vocabulary, non-negotiables
  STYLE_GUIDE.md            ← visual + UI language lock
  personas/                 ← brand / voice identity locks
  systems/                  ← constellation, map/home, telemetry
  prompts/                  ← copy-paste prompt blocks
  workflows/                ← how to run sessions day-to-day
```

## Quick start (15 minutes)

1. Create a Gemini Gem named **Core Node Director**.
2. Paste the full contents of `GEM_SYSTEM.md` into the Gem instructions.
3. Attach / upload these as knowledge files (priority order):
   - `PRODUCT_BIBLE.md`
   - `STYLE_GUIDE.md`
   - `personas/BASICHIRO.md`
   - `systems/CONSTELLATION.md`
   - `systems/MAP_AND_PLANET.md`
   - `systems/POPULATION_TELEMETRY.md`
4. Optionally create a second Gem: **Core Node Art Director** with the same style files, focused on arcade space / planet / logo image prompts only.
5. Run session type A from `workflows/IDEA_SPRINT.md`.

## Daily design loop (short)

1. **Idea sprint** (10–20 min) → pick 1 angle  
2. **Brief lock** (20–40 min) → one screen / one node / one campaign  
3. **Copy + UI spec** (iteration loop) → approve / revise  
4. **Visual prompts** from style + logo locks  
5. **Generate → critique → regenerate** (max 3 passes)  
6. **Ship brief to code** → log what locked vs drifted  

Full detail: `workflows/DESIGN_PIPELINE.md`

## Identity IDs (always use these names in prompts)

| ID | Display | Role |
|----|---------|------|
| `BASICHIRO` | BasicHiro / BASICHIRO | Human command — public credit & brand voice |
| `CORE_NODE` | Core Node | Central constellation hub product |
| `CONSTELLATION` | Nexus Constellation | Multi-node ecosystem framing |
| `MAP_SURFACE` | Map | `/map` planet carousel |
| `HOME_SURFACE` | Home / Planet page | `/` one-pager entry |

When prompting Gemini Image:  
**Reference the ID + paste the LOCKED VISUAL BLOCK from that file.** Never paraphrase Core Node branding from memory.

## Canon hierarchy (what wins conflicts)

1. Persona LOCKED VISUAL / VOICE BLOCKS  
2. `PRODUCT_BIBLE.md` non-negotiables  
3. Active system file (`systems/*.md`)  
4. `STYLE_GUIDE.md`  
5. New sprint ideas (must be marked `DRAFT` until you say lock)

### Shipping vs Draft

| Topic | CANON (ship today) | DRAFT (future) |
|-------|--------------------|----------------|
| Entry route | `/` = Core Node one-pager | — |
| Map route | `/map` carousel | Free-flight ship mode (retired) |
| Theme | Dark arcade void + Nexus orange | Light mode |
| Population HUD | Hidden while stats wiring finishes | Live unique-visitor Population |
| Sister Explore links | External `.nexus` domains | Deep cross-auth |

## How to promote a new idea into canon

1. Generate options in an Idea Sprint.  
2. Mark winner as `CANDIDATE`.  
3. After you approve, move it into the matching `systems/` or bible file.  
4. Update persona locks only if brand mark / voice truly changes (rare).

## Reference art in this repo

| Asset | Path / note |
|-------|-------------|
| Core Node logo mark | `src/components/CoreNodeLogo.tsx` (orbital orange SVG + wordmark) |
| Arcade space backdrop | `src/components/ArcadeSpaceBackdrop.tsx` (invaders, asteroids, nebulae) |
| Planet art layers | `/public/planets/*-planet.png` (when present) |

## Production credit (public)

**Heavy design & production:** BasicHiro  
**Generative design & direction assistance:** Gemini  

Gemini accelerates briefs, idea sprints, copy, and consistent UI / space prompting from locked files. Final direction and shipping decisions remain with BasicHiro.
