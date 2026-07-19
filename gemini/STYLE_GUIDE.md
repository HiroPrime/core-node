# Core Node — Style Guide (CANON)

## Master visual style lock (paste into every image / UI prompt)

```
Dark arcade constellation UI: deep void (#030303 / #07060f) with colorful
nebula washes (orange, cyan, magenta, lime), Nexus orange core accent (#FF5F1F),
orbital Core Node logo mark, Galaga-style pixel invaders + asteroids + distant
planets in the background, Orbitron display + Space Grotesk body, mobile-first
split map (space top / details bottom), techy and gamy, NOT light mode,
NOT purple SaaS gradient, NOT flat Material dashboard, NOT cream terracotta,
NOT newspaper broadsheet, NOT photoreal NASA documentary only.
```

## Style pillars

| Pillar | Do | Don’t |
|--------|-----|-------|
| Theme | Dark arcade void + nebula color | Default light SaaS, cream paper |
| Motion | Floating aliens, asteroids, camera pan between planets | Static flat wallpaper only |
| Accent | Nexus orange `#FF5F1F` as brand core | Random purple/indigo AI-slop gradients as hero |
| Type | Orbitron (display) + Space Grotesk (body) | Inter/Roboto/Arial-only corporate |
| Map layout | Top space / bottom details, arrows mid-screen sides | Ship HUD, cryptic random toasts |
| Home hero | Logo/brand first, one line, CTA group, full-bleed space | Stats soup in first viewport |
| Imagery | Colorful universe + orbital mark | Abstract bland gradients as the only idea |

## Palette tokens (shipping)

| Token | Value | Role |
|-------|-------|------|
| `--bg-space` | `#030303` | Base void |
| Void wash | `#07060f` / `#141028` | Arcade backdrop base |
| `--nexus-orange` | `#FF5F1F` | Core brand |
| Prime blue | `#3b82f6` | Prime Portal |
| Fracture red | `#ef4444` | Grimm Fracture |
| Nexus purple | `#a855f7` | Nexus Prime |
| Save magenta | `#FF00FF` | Save Point |
| Nebula cyan | `#22d3ee` / `#67e8f9` | Arcade accents |
| Nebula lime | `#a3e635` | Arcade accents |
| Text | `#ffffff` @ ~70% | Body copy |

## Typography

- **Display:** Orbitron — CORE NODE, section titles, system labels  
- **Body:** Space Grotesk — supporting sentences  
- Pattern: *Orbitron speaks command; Space Grotesk speaks human*

## Logo mark rules

1. Orbital orange rings + solid core + two satellite dots.  
2. Wordmark stacks **CORE / NODE** in orange with soft glow.  
3. Home: large (~280–340px). Map: top-left (~240–280px), links home.  
4. Do not replace with generic hexagon / robot / planet emoji.

## UI language

- **Home hero:** Brand/logo → one supporting sentence → By BASICHIRO → CTA (Enter Map / Read Signal).  
- **Map:** Full-screen vertical center arrows with side padding; scroll/swipe/dots change planet; camera floats to next node.  
- **Details panel:** Status, name, Mass, Explore. Population hidden until unlocked.  
- **Footer:** `© 2026 Core Node · By BASICHIRO`

## Arcade space rules

1. Variety of alien silhouettes (crab, squid, butterfly, bee, saucer, boss).  
2. Asteroids drift; distant planets tinted with sister colors.  
3. Nebulae should feel colorful — not gray void.  
4. Backdrop supports content; never obscures CTAs or logo.

## Consistency checklist

- [ ] Dark void + colorful nebula present  
- [ ] Nexus orange brand signal intact  
- [ ] Orbitron / Space Grotesk pairing respected  
- [ ] Logo matches CoreNodeLogo energy  
- [ ] No purple-on-white AI default look  
- [ ] No ship / cryptic random text on map  
- [ ] Copy uses Mass / Population / Constellation vocabulary  

## Negative prompt block (append often)

```
light mode, white dashboard, purple gradient saas, inter-only corporate ui,
flat material design, cream terracotta portfolio, newspaper broadsheet,
spaceship cockpit hud clutter, random glitch toast spam, toy store pastels,
disney cute, photoreal nasa only, wrong logo redesign, generic hexagon mark
```

## Writing style

- Short punchy command lines.  
- CTAs: *Enter Map / Read Signal / Explore*.  
- Status lines stay uppercase and specific (CENTRAL NODE, TCG ANALYTICS, etc.).  
- Credit: always **By BASICHIRO** on the entry surface.  
