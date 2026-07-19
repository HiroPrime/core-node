# System: Map & Home Surfaces (CANON)

## Routes

| Route | Surface | Job |
|-------|---------|-----|
| `/` | Home one-pager | Brand, story, Enter Map, By BASICHIRO |
| `/map` | Constellation map | Scroll planets, details, Explore |
| `/planet` | Redirect | Legacy Explore URL → `/` |

## Home (`/`) — first drop

Mobile-first one-pager:

1. Full-bleed arcade space backdrop  
2. Core Node logo (brand-first)  
3. One supporting sentence  
4. **By BASICHIRO**  
5. CTA group: Enter Map → `/map`, Read Signal → `#signal`  
6. Signal section + linked planets list  
7. Footer copyright  

**Hero budget:** no stats soup, no sister schedule grids in the first viewport.

## Map (`/map`)

Split layout (mobile-first, same on desktop):

| Zone | Content |
|------|---------|
| Top | Arcade space + focused planet; camera floats to next node |
| Bottom | Status, name, Mass, Explore |
| Overlay | Left/right arrows vertically centered on full screen with side padding |
| Chrome | Core Node logo top-left (~240–280px) → `/` |
| Footer | `© 2026 Core Node · By BASICHIRO` |

### Navigation locks

- Scroll / swipe / arrow keys / side arrows / dots advance planets.  
- Camera eases to the next planet’s world position.  
- **No ship.**  
- **No random cryptic fragment toasts.**  

## Retired (do not revive without DRAFT + user lock)

- Free-flight WASD ship  
- Day Zero blackout ignition keys as default UX  
- Engine camera shake  

## Explore behavior

- Sister nodes: open external `.nexus` URLs.  
- Core Node Explore: return to `/`.  
