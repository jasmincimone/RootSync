# Static images (`public/images/`)

Files here are served from the site root. Reference them with paths like `/images/home/hero-product-lineup.png`.

**Vendor and listing photos are not stored in this folder.** Approved vendors upload profile photos, listing images, and carousel media through the app. Those URLs are saved in the database (and on Vercel Blob in production). See Discover at `/discover` and vendor pages at `/discover/vendors/[id]`.

---

## Folder structure

### `home/`

Marketing imagery for the public homepage.

| File | Used on |
|------|---------|
| `hero-product-lineup.png` | Homepage hero (`src/app/page.tsx`) |

---

### `platform/`

Illustrations and icons for RootSync platform pages and marketing UI.

#### `platform/features/`

Icons for the RootSync platform feature explorer (Discover, RootSync AI, Messages, Community).

| File | Feature |
|------|---------|
| `marketplace.png` | Discover |
| `rootsync-ai.png` | RootSync AI |
| `messages.png` | Messages |
| `community.png` | Community |
| `courses.png` | Reserved (coming soon) |
| `downloads.png` | Reserved (coming soon) |
| `grid-preview.png` | Layout / preview asset |

#### `platform/rootsync/`

| File | Used on |
|------|---------|
| `logo.png` | RootSync landing, RootSync AI, About |
| `hero-mark.png` | RootSync AI page |

#### `platform/community/`

| File | Used on |
|------|---------|
| `farm-illustration.png` | Community page banner |

#### `platform/messages/`

| File | Used on |
|------|---------|
| `community-connect.png` | Messages inbox illustration |

#### Other `platform/*/` folders

`courses/`, `downloads/`, `maps/`, and `marketplace/` hold placeholders (`.gitkeep`) for future page art.

---

### `site/`

Reserved for site-wide assets (favicon sources, shared marks, etc.). Currently empty aside from `.gitkeep`.

---

## Conventions

- Use lowercase filenames with hyphens: `farm-illustration.png`
- Prefer `.png` or `.webp` for UI art; `.jpg` for photos
- In Next.js, use `/images/...` in `<img>` tags or `next/image` `src` props
- After adding or renaming files, grep the repo for the old path to update references

## What lives outside this folder

| Asset type | Where it is stored |
|------------|-------------------|
| Vendor profile photo | `VendorProfile.imageUrl` (upload via Account → Vendor profile) |
| Member avatar | `User.imageUrl` (upload via Account settings) |
| Listing image | `Offering.imageUrl` (upload via vendor offering form) |
| Vendor page carousel | `ShopPage` carousel JSON + Blob uploads |
| Local dev listing uploads | `public/uploads/` (gitignored; production uses Vercel Blob) |
