# Core Node sprite pipeline

Manifest-driven pipeline for turning one Save Point A-pose into a game-ready
belt-scroller walk. You get the A-frame, then lock four directions from it:
front, back, three-quarter right, three-quarter left. The sides are sidewalk
three-quarter, not a flat profile — a little off is fine. Walks are posed from
those locks with the licensed GegX 12-frame cadence. It uses Save Point Comfy at
`127.0.0.1:8188`; it never
starts Comfy, deploys, commits, pushes, or changes Save Point production.

## First pack

`charlie-arcade.json` locks:

- pink high ponytail and black bow
- Charlie's face, brows, eyeliner, skin tone, and proportions
- gray off-shoulder cropped sweater
- black shorts and belt, never a skirt
- black combat boots
- 12-frame walks using the licensed GegX cadence
- source-art rigging that preserves each character's generated body and clothes
- locked front, back, three-quarter right, and three-quarter left from the A-frame
- one stable idle per direction
- 96px transparent frames, one palette, one ground line

The current Gemini-derived `public/charlie/kk` pack is comparison material and
fallback only. This pipeline publishes to a different versioned folder.

## Run

```powershell
& .\scripts\sprite-pipeline\build.ps1 -Stage preflight
& .\scripts\sprite-pipeline\build.ps1 -Stage lock
& .\scripts\sprite-pipeline\build.ps1 -Stage template
& .\scripts\sprite-pipeline\build.ps1 -Stage walk
& .\scripts\sprite-pipeline\build.ps1 -Stage process
& .\scripts\sprite-pipeline\build.ps1 -Stage qa
& .\scripts\sprite-pipeline\build.ps1 -Stage publish
```

Or run all stages:

```powershell
& .\scripts\sprite-pipeline\build.ps1 -Stage all
```

`-Force` rebuilds versioned work-stage outputs. Existing public fallback assets
are never deleted.

## Outputs

Work and QA:

```text
logs/characters/charlie-brawler-v2/
  generated-views/down.png
  generated-views/right.png
  generated-views/left.png
  generated-views/up.png
  templates/walk-right/frame-1..12.png
  move-walk-right/frame-1..12.png
  walk-right96/1..12.png
  walk-left96/1..12.png
  walk-down96/1..12.png
  walk-up96/1..12.png
  idle-right96/1.png
  idle-left96/1.png
  qa/report.json
  qa/contact-sheet.jpg
```

Approved public pack:

```text
public/charlie/brawler-v1/
  identity-lock.png
  right-1..12.png
  left-1..12.png
  down-1..12.png
  up-1..12.png
  right-idle-1.png
  left-idle-1.png
  walk-sheet.png
  idle-sheet.png
  manifest.json
  qa-report.json
  qa-contact-sheet.jpg
```

## Gates

Publication refuses to run unless QA passes:

- exact frame counts
- common 96px canvas and ground line
- exact right-to-left pixel mirrors
- distinct authored front and back views for depth movement
- stable head registration and one shared foot line
- unique frames, consecutive motion, leg travel, and loop-seam continuity
- source-view palette retention for every direction
- generated contact sheet for human likeness review

Punch and kick templates are intentionally outside v1. Walking must pass first.
