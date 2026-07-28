# FlightRadar67 — 5-minute speaker notes

## Files
- `FlightRadar67_Pitch_Deck.pptx` — main deck (widescreen 16:9)
- `assets/demo-walkthrough.mp4` — recorded app walkthrough (~90s)
- `demo-player.html` — open in a browser if you need fullscreen video backup
- `SPEAKER_NOTES_5MIN.md` — this file

## Timing (~300 seconds)

| # | Slide | Seconds | What to say |
|---|---|---|---|
| 1 | Title | 20 | Hook: everyone has looked up at a plane. Introduce FlightRadar67. |
| 2 | Problem | 35 | Flat maps, paywalls, laggy free tools. Enthusiasts underserved. |
| 3 | Solution | 35 | Live ADS-B on a real Cesium globe; trails, routes, RadarAI. |
| 4 | Product shots | 20 | Point at screenshots; tease the live demo. |
| 5 | Demo media | 10 | Or skip — jump to live / play MP4. |
| 6 | Demo script | **75** | **LIVE preferred.** Else play `demo-walkthrough.mp4`. |
| 7 | TAM/SAM/SOM | 30 | Wedge story: big sky → tracking category → our SOM. |
| 8 | PMF | 25 | Spotters + STEM first. |
| 9 | Model | 20 | Free → Plus → Pro/Edu → API. |
| 10 | GTM | 20 | Communities → Shorts → Edu kits. |
| 11 | Competition | 15 | Don’t out-scale FR24; out-experience free tier. |
| 12 | Ask | 15 | Feedback, intros, design partners. Close line. |

## Live demo checklist
1. `npm run dev` already running → http://localhost:3000
2. Hard refresh before walking on stage
3. Click a busy jet over SEQ; wait for route + trail
4. Pan to show Earth occlusion
5. If Wi‑Fi dies → `demo-player.html` or embedded MP4 on slide 5

## Rebuild
```powershell
cd pitch
node capture-demo.mjs   # optional re-record
python build_deck.py
```
