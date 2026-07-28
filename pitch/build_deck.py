#!/usr/bin/env python3
"""Generate FlightRadar67 5-minute business hackathon pitch deck."""

from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Inches, Pt, Emu

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
OUT = ROOT / "FlightRadar67_Pitch_Deck.pptx"

# Brand
NAVY = RGBColor(0x07, 0x0B, 0x14)
SLATE = RGBColor(0x0F, 0x17, 0x2A)
CYAN = RGBColor(0x22, 0xD3, 0xEE)
AMBER = RGBColor(0xFB, 0xBF, 0x24)
WHITE = RGBColor(0xF8, 0xFA, 0xFC)
MUTED = RGBColor(0x94, 0xA3, 0xB8)
CARD = RGBColor(0x11, 0x1C, 0x2E)
GREEN = RGBColor(0x34, 0xD3, 0x99)


def set_slide_bg(slide, color: RGBColor):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_rect(slide, l, t, w, h, color: RGBColor):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape


def add_round_rect(slide, l, t, w, h, color: RGBColor):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, l, t, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    try:
        shape.adjustments[0] = 0.1
    except Exception:
        pass
    return shape


def textbox(slide, l, t, w, h, text, *, size=18, bold=False, color=WHITE, align=PP_ALIGN.LEFT, font="Calibri"):
    box = slide.shapes.add_textbox(l, t, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.font.name = font
    p.alignment = align
    return box


def add_bullet_block(slide, l, t, w, h, lines, *, size=16, color=WHITE):
    box = slide.shapes.add_textbox(l, t, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line
        p.level = 0
        p.font.size = Pt(size)
        p.font.color.rgb = color
        p.font.name = "Calibri"
        p.space_after = Pt(8)
    return box


def try_picture(slide, path: Path, l, t, w, h):
    if path.exists() and path.stat().st_size > 1000:
        slide.shapes.add_picture(str(path), l, t, width=w, height=h)
        return True
    # placeholder card
    add_round_rect(slide, l, t, w, h, CARD)
    textbox(
        slide,
        l + Inches(0.2),
        t + h / 2 - Inches(0.2),
        w - Inches(0.4),
        Inches(0.4),
        "Live demo screenshot — run capture-demo.mjs",
        size=12,
        color=MUTED,
        align=PP_ALIGN.CENTER,
    )
    return False


def accent_bar(slide):
    add_rect(slide, Inches(0), Inches(0), Inches(0.12), Inches(5.625), CYAN)


def footer(slide, page: int, total: int = 12):
    textbox(
        slide,
        Inches(0.4),
        Inches(5.25),
        Inches(8),
        Inches(0.3),
        f"FlightRadar67  ·  Confidential  ·  {page}/{total}",
        size=10,
        color=MUTED,
    )


def build():
    prs = Presentation()
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(5.625)
    blank = prs.slide_layouts[6]

    # 1. Title
    s = prs.slides.add_slide(blank)
    set_slide_bg(s, NAVY)
    add_rect(s, Inches(0), Inches(0), Inches(10), Inches(5.625), NAVY)
    add_rect(s, Inches(0), Inches(0), Inches(0.18), Inches(5.625), CYAN)
    add_rect(s, Inches(0), Inches(5.35), Inches(10), Inches(0.275), SLATE)
    textbox(s, Inches(0.6), Inches(1.3), Inches(9), Inches(0.4), "FLIGHTRADAR67", size=14, bold=True, color=CYAN)
    textbox(
        s,
        Inches(0.6),
        Inches(1.7),
        Inches(8.8),
        Inches(1.2),
        "The live sky, on a real globe —\nbuilt for enthusiasts who outgrew flat maps.",
        size=32,
        bold=True,
        color=WHITE,
        font="Calibri",
    )
    textbox(
        s,
        Inches(0.6),
        Inches(3.3),
        Inches(8),
        Inches(0.6),
        "Real-time ADS-B · Cesium 3D globe · Routes, trails & RadarAI\n5-minute business pitch",
        size=15,
        color=MUTED,
    )
    textbox(s, Inches(0.6), Inches(5.38), Inches(6), Inches(0.25), "Hackathon · Product & GTM", size=11, color=AMBER)

    # 2. Problem
    s = prs.slides.add_slide(blank)
    set_slide_bg(s, NAVY)
    accent_bar(s)
    textbox(s, Inches(0.5), Inches(0.3), Inches(9), Inches(0.4), "THE PROBLEM", size=12, bold=True, color=CYAN)
    textbox(s, Inches(0.5), Inches(0.7), Inches(9), Inches(0.6), "Aviation curiosity is huge. The tools feel stuck in 2012.", size=26, bold=True)
    cards = [
        ("Flat & opaque", "Legacy trackers bury the globe under ads, paywalls, and 2D tiles that break immersion."),
        ("Enthusiast gap", "Spotters, students & travelers want live context — routes, altitude story, AI answers — not just dots."),
        ("Dev / data friction", "Building on live ADS-B is hard: rate limits, antipodal clutter, laggy markers, incomplete routes."),
    ]
    for i, (title, body) in enumerate(cards):
        x = Inches(0.5) + Inches(i * 3.1)
        add_round_rect(s, x, Inches(1.7), Inches(2.9), Inches(2.6), CARD)
        textbox(s, x + Inches(0.2), Inches(1.9), Inches(2.5), Inches(0.5), title, size=16, bold=True, color=AMBER)
        textbox(s, x + Inches(0.2), Inches(2.5), Inches(2.5), Inches(1.5), body, size=13, color=MUTED)
    footer(s, 2)

    # 3. Solution
    s = prs.slides.add_slide(blank)
    set_slide_bg(s, NAVY)
    accent_bar(s)
    textbox(s, Inches(0.5), Inches(0.3), Inches(9), Inches(0.35), "THE SOLUTION", size=12, bold=True, color=CYAN)
    textbox(s, Inches(0.5), Inches(0.65), Inches(9), Inches(0.5), "FlightRadar67 — premium live flight tracking on a true 3D Earth.", size=22, bold=True)
    bullets = [
        "• Live ADS-B (adsb.lol) with viewport-chunked loading — fast, not whole-planet spam",
        "• CesiumJS globe with altitude-coloured aircraft, smooth motion, horizon occlusion",
        "• Click → real flown path (turns & curves), dep/arr airports, progress & favourites",
        "• RadarAI assistant + analytics for density, airlines, and busy airports",
        "• Auth.js accounts, Prisma/Postgres, Redis, Docker — production-shaped MVP",
    ]
    add_bullet_block(s, Inches(0.5), Inches(1.4), Inches(9), Inches(3.2), bullets, size=16, color=WHITE)
    footer(s, 3)

    # 4. Product demo visuals
    s = prs.slides.add_slide(blank)
    set_slide_bg(s, NAVY)
    accent_bar(s)
    textbox(s, Inches(0.5), Inches(0.25), Inches(9), Inches(0.3), "PRODUCT IN ACTION", size=12, bold=True, color=CYAN)
    textbox(s, Inches(0.5), Inches(0.55), Inches(9), Inches(0.4), "Live globe · select a flight · see the real track", size=20, bold=True)
    try_picture(s, ASSETS / "01-live-globe.png", Inches(0.4), Inches(1.15), Inches(4.6), Inches(2.9))
    try_picture(s, ASSETS / "02-flight-selected.png", Inches(5.15), Inches(1.15), Inches(4.4), Inches(2.9))
    textbox(
        s,
        Inches(0.5),
        Inches(4.2),
        Inches(9),
        Inches(0.7),
        "Also in pitch/assets: demo-walkthrough.webm / .mp4 — play fullscreen during the 75s demo beat.\nJudges respond better to a live click-through; keep this clip as backup.",
        size=12,
        color=MUTED,
    )
    footer(s, 4)

    # 4b Video / gallery slide
    s = prs.slides.add_slide(blank)
    set_slide_bg(s, NAVY)
    accent_bar(s)
    textbox(s, Inches(0.5), Inches(0.25), Inches(9), Inches(0.3), "DEMO MEDIA", size=12, bold=True, color=CYAN)
    textbox(s, Inches(0.5), Inches(0.55), Inches(9), Inches(0.35), "Recorded walkthrough + extra frames", size=20, bold=True)
    try_picture(s, ASSETS / "03-globe-pan.png", Inches(0.4), Inches(1.1), Inches(4.6), Inches(2.7))
    try_picture(s, ASSETS / "05-hero-close.png", Inches(5.15), Inches(1.1), Inches(4.4), Inches(2.7))

    mp4 = ASSETS / "demo-walkthrough.mp4"
    webm = ASSETS / "demo-walkthrough.webm"
    movie = mp4 if mp4.exists() else webm
    if movie.exists():
        try:
            # Embedded movie (PowerPoint prefers MP4/H.264 on Windows)
            poster = ASSETS / "01-live-globe.png"
            kwargs = {}
            if poster.exists():
                kwargs["poster_frame_image"] = str(poster)
            s.shapes.add_movie(
                str(mp4 if mp4.exists() else movie),
                Inches(0.5),
                Inches(3.95),
                Inches(9),
                Inches(1.15),
                **kwargs,
            )
        except Exception as exc:
            textbox(
                s,
                Inches(0.5),
                Inches(4.0),
                Inches(9),
                Inches(0.6),
                f"Open assets/{movie.name} during the demo beat (embed note: {exc}).",
                size=12,
                color=MUTED,
            )
    else:
        textbox(s, Inches(0.5), Inches(4.0), Inches(9), Inches(0.5), "Run node capture-demo.mjs to generate demo-walkthrough video.", size=12, color=MUTED)
    footer(s, 5)
    steps = [
        ("01", "Open the globe over Brisbane — live traffic streams in chunks."),
        ("02", "Click a jet — altitude colour, info card, dep → arr route."),
        ("03", "Show the solid ADS-B trail with real turns (not a straight line)."),
        ("04", "Pan the camera — far-side aircraft stay hidden behind Earth."),
        ("05", "Optional: RadarAI / analytics — ask “busiest airports near me.”"),
    ]
    for i, (num, line) in enumerate(steps):
        y = Inches(0.75) + Inches(i * 0.72)
        add_round_rect(s, Inches(0.5), y, Inches(0.7), Inches(0.55), CARD)
        textbox(s, Inches(0.55), y + Inches(0.1), Inches(0.6), Inches(0.4), num, size=14, bold=True, color=CYAN, align=PP_ALIGN.CENTER)
        textbox(s, Inches(1.4), y + Inches(0.1), Inches(8), Inches(0.45), line, size=15, color=WHITE)
    footer(s, 6)

    # 7. TAM SAM SOM
    s = prs.slides.add_slide(blank)
    set_slide_bg(s, NAVY)
    accent_bar(s)
    textbox(s, Inches(0.5), Inches(0.25), Inches(9), Inches(0.3), "MARKET — TAM · SAM · SOM", size=12, bold=True, color=CYAN)
    textbox(s, Inches(0.5), Inches(0.55), Inches(9), Inches(0.4), "A wedge inside a multi-billion aviation data & attention market.", size=18, bold=True)

    markets = [
        ("TAM", "$12–18B", "Global aviation software, flight data, travel tools & digital aviation media (consumer + B2B)."),
        ("SAM", "$1.5–2.5B", "Live flight tracking, ADS-B platforms, aviation enthusiast apps & APIs in English-speaking + EU/AU markets."),
        ("SOM", "$25–60M", "5-year reachable: freemium consumers + prosumer/API in AU/NZ/SEA → expand to US/EU enthusiasts."),
    ]
    for i, (label, value, body) in enumerate(markets):
        y = Inches(1.2) + Inches(i * 1.15)
        add_round_rect(s, Inches(0.5), y, Inches(9.1), Inches(1.05), CARD)
        textbox(s, Inches(0.7), y + Inches(0.15), Inches(1.2), Inches(0.35), label, size=14, bold=True, color=AMBER)
        textbox(s, Inches(2.0), y + Inches(0.12), Inches(2.2), Inches(0.4), value, size=20, bold=True, color=CYAN)
        textbox(s, Inches(4.3), y + Inches(0.2), Inches(5.1), Inches(0.7), body, size=13, color=MUTED)
    textbox(
        s,
        Inches(0.5),
        Inches(4.7),
        Inches(9),
        Inches(0.35),
        "Sources: industry analyst ranges (aviation IT / travel tech) + FlightRadar24-class comps — directional for pitch, not audited.",
        size=10,
        color=MUTED,
    )
    footer(s, 7)

    # 7. PMF
    s = prs.slides.add_slide(blank)
    set_slide_bg(s, NAVY)
    accent_bar(s)
    textbox(s, Inches(0.5), Inches(0.25), Inches(9), Inches(0.3), "PRODUCT–MARKET FIT", size=12, bold=True, color=CYAN)
    textbox(s, Inches(0.5), Inches(0.55), Inches(9), Inches(0.45), "Who loves this on day one — and why they pay.", size=20, bold=True)

    icps = [
        ("Plane spotters & aviation nerds", "Immersive globe + real trails = shareable wow. High engagement, low CAC via communities."),
        ("Students & STEM clubs", "Live data + RadarAI for learning. School/uni licenses and workshops."),
        ("Travel power users", "Where is my inbound? Beautiful context beats opaque airline apps."),
        ("Indie builders / media", "Future API & embeds — creators need gorgeous live clips."),
    ]
    for i, (title, body) in enumerate(icps):
        col = i % 2
        row = i // 2
        x = Inches(0.5) + Inches(col * 4.7)
        y = Inches(1.2) + Inches(row * 1.6)
        add_round_rect(s, x, y, Inches(4.45), Inches(1.4), CARD)
        textbox(s, x + Inches(0.2), y + Inches(0.2), Inches(4.0), Inches(0.35), title, size=14, bold=True, color=AMBER)
        textbox(s, x + Inches(0.2), y + Inches(0.6), Inches(4.0), Inches(0.65), body, size=13, color=MUTED)
    footer(s, 8)

    # 9. Business model
    s = prs.slides.add_slide(blank)
    set_slide_bg(s, NAVY)
    accent_bar(s)
    textbox(s, Inches(0.5), Inches(0.25), Inches(9), Inches(0.3), "BUSINESS MODEL", size=12, bold=True, color=CYAN)
    textbox(s, Inches(0.5), Inches(0.55), Inches(9), Inches(0.4), "Freemium consumer wedge → pro & data revenue.", size=20, bold=True)
    tiers = [
        ("Free", "$0", "Live map, basic filters, limited history — growth engine."),
        ("Plus", "$6–9/mo", "Full trails, alerts, favourites sync, ad-light experience."),
        ("Pro / Edu", "$19–49/mo", "Analytics, RadarAI priority, classroom seats, export."),
        ("API later", "usage", "B2B widgets & historical traces for media/apps."),
    ]
    for i, (name, price, body) in enumerate(tiers):
        x = Inches(0.4) + Inches(i * 2.4)
        add_round_rect(s, x, Inches(1.3), Inches(2.25), Inches(3.2), CARD)
        textbox(s, x + Inches(0.15), Inches(1.5), Inches(1.95), Inches(0.35), name, size=14, bold=True, color=CYAN)
        textbox(s, x + Inches(0.15), Inches(2.0), Inches(1.95), Inches(0.4), price, size=20, bold=True, color=AMBER)
        textbox(s, x + Inches(0.15), Inches(2.6), Inches(1.95), Inches(1.5), body, size=12, color=MUTED)
    footer(s, 9)

    # 10. GTM
    s = prs.slides.add_slide(blank)
    set_slide_bg(s, NAVY)
    accent_bar(s)
    textbox(s, Inches(0.5), Inches(0.25), Inches(9), Inches(0.3), "GO-TO-MARKET", size=12, bold=True, color=CYAN)
    textbox(s, Inches(0.5), Inches(0.55), Inches(9), Inches(0.4), "Community-led growth, then partnerships.", size=20, bold=True)
    phases = [
        ("Phase 1 — Seed", "AU/NZ aviation Discords, Reddit r/flighttracking, airport spotting groups. Shareable globe clips."),
        ("Phase 2 — Content", "TikTok/YouTube Shorts of dramatic trails & landings. Creator affiliate Plus codes."),
        ("Phase 3 — Edu & B2B", "Pilot STEM kits with schools; approach small airlines/MRO for branded embeds."),
        ("Phase 4 — Platform", "Public API + white-label widget once retention > 30-day D30 target."),
    ]
    for i, (title, body) in enumerate(phases):
        y = Inches(1.15) + Inches(i * 0.85)
        add_rect(s, Inches(0.5), y, Inches(0.08), Inches(0.7), CYAN if i < 2 else AMBER)
        textbox(s, Inches(0.8), y, Inches(8.5), Inches(0.3), title, size=14, bold=True, color=WHITE)
        textbox(s, Inches(0.8), y + Inches(0.3), Inches(8.5), Inches(0.4), body, size=13, color=MUTED)
    footer(s, 10)

    # 11. Competition & moat
    s = prs.slides.add_slide(blank)
    set_slide_bg(s, NAVY)
    accent_bar(s)
    textbox(s, Inches(0.5), Inches(0.25), Inches(9), Inches(0.3), "COMPETITION & DIFFERENTIATION", size=12, bold=True, color=CYAN)
    textbox(s, Inches(0.5), Inches(0.55), Inches(9), Inches(0.4), "We don’t out-ads FlightRadar24 — we out-experience the free tier.", size=18, bold=True)
    rows = [
        ("FlightRadar24 / FR24 apps", "Scale & brand", "We win on 3D immersion, open-data ethos, AI layer for learners"),
        ("ADS-B Exchange / dump1090 UIs", "Raw data power users", "We win on polish, storytelling routes, consumer UX"),
        ("Airline apps", "My booking only", "We win on the whole sky & discovery"),
    ]
    textbox(s, Inches(0.5), Inches(1.2), Inches(2.8), Inches(0.3), "Player", size=12, bold=True, color=AMBER)
    textbox(s, Inches(3.4), Inches(1.2), Inches(2.4), Inches(0.3), "Their strength", size=12, bold=True, color=AMBER)
    textbox(s, Inches(5.9), Inches(1.2), Inches(3.6), Inches(0.3), "Our angle", size=12, bold=True, color=AMBER)
    for i, (a, b, c) in enumerate(rows):
        y = Inches(1.6) + Inches(i * 0.85)
        add_round_rect(s, Inches(0.5), y, Inches(9.1), Inches(0.75), CARD)
        textbox(s, Inches(0.65), y + Inches(0.2), Inches(2.6), Inches(0.4), a, size=12, color=WHITE)
        textbox(s, Inches(3.4), y + Inches(0.2), Inches(2.4), Inches(0.4), b, size=12, color=MUTED)
        textbox(s, Inches(5.9), y + Inches(0.2), Inches(3.5), Inches(0.4), c, size=12, color=CYAN)
    textbox(
        s,
        Inches(0.5),
        Inches(4.4),
        Inches(9),
        Inches(0.5),
        "Early moat: product craft (occlusion, chunked ADS-B, real traces) + community brand in AU/SEA before clones catch up.",
        size=13,
        color=MUTED,
    )
    footer(s, 11)

    # 12. Ask / close
    s = prs.slides.add_slide(blank)
    set_slide_bg(s, NAVY)
    add_rect(s, Inches(0), Inches(0), Inches(0.18), Inches(5.625), CYAN)
    textbox(s, Inches(0.6), Inches(0.8), Inches(9), Inches(0.35), "THE ASK", size=12, bold=True, color=CYAN)
    textbox(
        s,
        Inches(0.6),
        Inches(1.2),
        Inches(8.8),
        Inches(1.0),
        "Validate with judges & mentors — then ship Plus to spotters.",
        size=26,
        bold=True,
        color=WHITE,
    )
    asks = [
        "Feedback on pricing & ICP priority (spotters vs edu)",
        "Intros to aviation clubs / STEM teachers in AU",
        "Design partners for 30-day retention experiment",
    ]
    for i, line in enumerate(asks):
        y = Inches(2.5) + Inches(i * 0.55)
        add_round_rect(s, Inches(0.6), y, Inches(8.5), Inches(0.45), CARD)
        textbox(s, Inches(0.85), y + Inches(0.08), Inches(8), Inches(0.35), f"→  {line}", size=14, color=WHITE)
    textbox(
        s,
        Inches(0.6),
        Inches(4.5),
        Inches(8.5),
        Inches(0.5),
        "FlightRadar67 — see the sky the way it actually moves.",
        size=16,
        bold=True,
        color=AMBER,
    )
    footer(s, 12)

    # Speaker notes file alongside
    notes = ROOT / "SPEAKER_NOTES_5MIN.md"
    notes.write_text(
        """# FlightRadar67 — 5-minute speaker notes

Timing guide (~300 seconds)

1. Title (20s) — Hook: “Everyone has looked up at a plane and wondered.” Introduce FlightRadar67.
2. Problem (35s) — Flat maps, paywalls, laggy free tools. Enthusiasts underserved.
3. Solution (40s) — Live ADS-B on a real Cesium globe; trails, routes, RadarAI.
4–5. Demo (75s) — LIVE if possible. Else play `assets/demo-walkthrough.webm` / screenshots.
6. Market (35s) — TAM → SAM → SOM; we’re aiming the SOM wedge first.
7. PMF (30s) — Spotters + STEM first; travel curiosity second.
8. Model (25s) — Free → Plus → Pro/Edu → API.
9. GTM (25s) — Communities → short-form video → edu kits.
10. Competition (20s) — Don’t out-scale FR24; out-experience free tier.
11. Ask (15s) — Feedback, intros, design partners. Close line.

Backup: if live ADS-B is slow, open a pre-selected flight screenshot slide 4.
""",
        encoding="utf-8",
    )

    prs.save(OUT)
    print(f"Wrote {OUT}")
    print(f"Notes {notes}")


if __name__ == "__main__":
    build()
