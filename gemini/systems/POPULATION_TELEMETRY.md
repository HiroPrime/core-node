# System: Population Telemetry (CANON intent / partial ship)

## Metric lock

All Population tracking = **unique visitor count**.

Response shape every sister site must expose:

```json
{ "population": 2286, "metric": "Population" }
```

## Aggregation

- Core Node `GET /api/population` fetches each site’s `/api/stats`.  
- Endpoints locked in `src/lib/site-stats.ts`.  
- Map HUD may **hide Population** while wiring is unfinished — do not invent alternate metrics in UI copy.

## Sister sources (intent)

| Node | Source intent |
|------|----------------|
| Prime Portal | Unique visitors via that app’s stats route |
| Grimm Fracture | Unique visitors via that app’s stats route |
| Nexus Prime | Unique visitors (e.g. `site_metrics.total_unique_visitors`) |
| Save Point | Unique visitors via that app’s stats route |
| Core Node | Unique visitors when local tracking exists (stub OK) |

## Rules for Gemini

1. Do not propose User Accounts / Subscribers as the shipping Population label.  
2. Do not invent fake live numbers in marketing UI.  
3. Failure mode: return `population: 0` with HTTP 200 — resilience over drama.  
4. Label unfinished Population UX as `DRAFT` until the user unhides the HUD.  
