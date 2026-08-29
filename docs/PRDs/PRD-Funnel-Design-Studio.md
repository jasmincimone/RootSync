---
title: PRD — Funnel Design Studio
version: 0.1
status: Draft
owner: Jasmin Smith
last_updated: 2026-08-26
related:
  - ../adr/ADR-007-growth-workspace.md
  - PRD-Marketing-Funnel.md
  - ../08_DESIGN_SYSTEM.md
---

# PRD: Funnel Design Studio

## Goal

Give vendors a **Pulse-quality page maker** for GrowSpace funnels: live preview, rich sections, cropped media, and theme control — without inventing a second editor stack.

## Current baseline (shipped)

- Sections (hero / body / band / CTA) with reorder
- `PulseRichTextEditor` + gallery media buckets
- Page fonts, solid colors, section shapes
- Side-by-side live preview on large screens
- Public URL `/{vendor}/funnels/{slug}`

## Phases

### Phase 1 — Studio chrome & media polish ✅

- Group maker into `FormSection`s (Basics, Theme, Media, Sections)
- Image crop + aspect picker on funnel image uploads (reuse `ImageCropModal`)
- Optional **page background image** (cover) in addition to solid color

### Phase 2 — Layout depth ✅

- More section layouts: **image + text**, **quote**, **FAQ**
- Soft gradient background presets (design-system safe)
- Clearer dual-media guidance (gallery vs inline embeds)

### Phase 3 — Fullscreen studio

- Dedicated `/account/growth/funnels/[id]/studio` canvas route
- Mobile preview frame toggle
- Drag-and-drop section/media reorder

## Out of scope (for now)

- Custom font uploads
- Freeform shape canvas / absolute positioning
- Separate markdown mode (HTML Pulse editor remains the writing surface)
- Redesigning CRM funnel steps as designed screens

## Success

Vendors can crop images before they appear on the funnel, set a background image, and find Basics / Theme / Media / Sections without scrolling a flat card stack.
