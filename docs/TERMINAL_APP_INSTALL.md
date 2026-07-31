# RootSync Terminal — download & install guide

This document covers **how vendors get the RootSync Terminal app** on their phone, and **how RootSync platform ops build and distribute it**.

The app lives in `apps/terminal-pos`. It is **not** available in Expo Go. Stripe Terminal requires a **custom native build** (development build, TestFlight, or App Store / Play Store).

Related: [TERMINAL_POS.md](./TERMINAL_POS.md) (product/ops), [apps/terminal-pos/README.md](../apps/terminal-pos/README.md) (dev quickstart).

Vendor-facing copy on the site: **Account → Vendor → In-person POS → Install RootSync Terminal** (`/account/vendor/pos/install`).

---

## Quick answer for vendors

1. Finish **Payment Hub** on [rootsync.io](https://rootsync.io) (approved vendor + Stripe Connect ready).  
2. Open **Account → Vendor → In-person POS → Install RootSync Terminal**.  
3. Install via the **TestFlight / App Store link** RootSync publishes (or accept an email invite).  
4. Open **RootSync Terminal** → API URL `https://rootsync.io` → sign in with your **vendor email/password**.  
5. Allow Bluetooth + Location when asked.  
6. Buy/charge a **Stripe Reader M2**, then **Scan for M2** inside the app (do **not** pair in iPhone Settings → Bluetooth).

Until the install link exists, use **Counter** checkout on the website (no app, no M2).

---

## Why you can’t use Expo Go

| App type | Works with M2? |
|----------|----------------|
| Expo Go | **No** — missing native Stripe Terminal modules |
| Custom build (dev / TestFlight / store) | **Yes** |
| Website Counter POS | Card / Apple Pay on phone — **no M2** |

Bundle ID (iOS): `io.rootsync.terminalpos`  
Android package: `io.rootsync.terminalpos`

---

## Distribution options (platform)

Choose one path and stick to it for vendors.

### Option A — TestFlight (recommended for early vendors)

**Best for:** inviting many vendors without the App Store review cycle.

#### A1. One-time Apple setup
1. Enroll in [Apple Developer Program](https://developer.apple.com/programs/) ($99/year).  
2. In [App Store Connect](https://appstoreconnect.apple.com/) → **My Apps** → **+** → New App.  
   - Platform: iOS  
   - Name: RootSync Terminal (or similar)  
   - Bundle ID: create/select `io.rootsync.terminalpos`  
   - SKU: e.g. `rootsync-terminal-pos`  
3. Install **Xcode** on a Mac (same major version that can build the project).  
4. Create an **App Store Connect API key** (Users and Access → Keys) if using EAS, *or* sign in to Xcode with the Apple ID.

#### A2. Build with EAS (recommended)
From the repo:

```bash
cd apps/terminal-pos
npm install
npm install -g eas-cli   # if needed
eas login
eas build:configure      # creates eas.json if missing
```

Create/update `eas.json` roughly as:

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "production": {
      "ios": { "resourceClass": "m-medium" },
      "android": { "buildType": "app-bundle" }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "resourceClass": "m-medium" }
    }
  },
  "submit": {
    "production": {}
  }
}
```

Then:

```bash
# iOS build for TestFlight
eas build --platform ios --profile production

# When the build finishes, submit to App Store Connect
eas submit --platform ios --latest
```

In App Store Connect → your app → **TestFlight**:
1. Wait for processing (often 5–30 minutes).  
2. Add **Internal testers** (App Store Connect users) or **External testers** (email list; may need Beta App Review once).  
3. Testers install **TestFlight** from the App Store, accept the invite email/link, then install **RootSync Terminal**.

#### A3. Publish the install link for self-serve
1. In TestFlight, copy the **public link** (if enabled) or the invite URL you send vendors.  
2. In Vercel → Production → Environment Variables set:

   `NEXT_PUBLIC_TERMINAL_APP_URL=<that https link>`

3. Redeploy.  
4. Vendors then see **Get RootSync Terminal** on `/account/vendor/pos` and `/account/vendor/pos/install`.

---

### Option B — App Store / Play Store (public)

**Best for:** fully self-serve at scale.

1. Complete TestFlight external testing / store listing, screenshots, privacy policy, support URL.  
2. Submit for App Review (Stripe Terminal + Bluetooth + Location usage strings are already in `app.json`).  
3. After approval, set `NEXT_PUBLIC_TERMINAL_APP_URL` to the App Store URL.  
4. Android: `eas build --platform android` + Play Console upload; set the same env to the Play listing if you support Android.

---

### Option C — Direct USB install from a Mac (developer / single device)

**Best for:** RootSync staff machines and early debugging — **not** scalable for every vendor.

```bash
cd apps/terminal-pos
npm install
npx expo prebuild
npx expo start --dev-client   # keep Metro running for JS updates
# other terminal:
npx expo run:ios --device
```

On the iPhone:
1. Trust the computer if prompted.  
2. If “Untrusted Developer”: **Settings → General → VPN & Device Management** → trust the Apple Development certificate.  
3. Open **RootSync Terminal**, keep the phone on the same Wi‑Fi as the Mac if using a local API URL.

For production API, leave API URL as `https://rootsync.io` even on a USB-installed build.

---

### Option D — Ad Hoc / Internal distribution IPA

**Best for:** a small fixed list of devices without TestFlight.

1. Register each vendor’s device UDID in the Apple Developer portal.  
2. Create an Ad Hoc provisioning profile.  
3. `eas build --profile preview` (or Xcode Archive → Ad Hoc).  
4. Distribute the `.ipa` via a secure link or Apple Configurator.  

Device list must be updated whenever a new phone is added — prefer TestFlight instead.

---

## Vendor install checklist (copy/paste for support)

Send this to a vendor after Connect is ready:

```
RootSync Terminal (M2 card reader)

1) On rootsync.io → Account → Vendor → Payment Hub
   Finish Stripe until payouts/charges are ready.

2) Account → Vendor → In-person POS → “Install RootSync Terminal”
   Follow the install link (TestFlight or App Store).

3) Install Apple’s “TestFlight” app if we sent a TestFlight invite,
   open the invite email, then install RootSync Terminal.

4) Open RootSync Terminal
   • API URL: https://rootsync.io
   • Email + password: same as your RootSync vendor login

5) Allow Bluetooth and Location when iOS asks.

6) Stripe Reader M2
   • Charge the reader (4 green lights when you press power).
   • Do NOT pair it in Settings → Bluetooth.
   • In the app: Charge tab → Scan for M2 → wait for connect.
   • First connect may update firmware for 5–15 minutes — keep the app open.

7) Charge a listing or custom amount. Sales + receipts are on the Sales tab.
   Share/Print works with AirPrint and apps like Phomemo.
```

---

## First launch screens (what “good” looks like)

1. **Login** — display name after success; Connect `acct_…` shown.  
2. **Charge** — Scan for M2 / listings / custom amount.  
3. **Sales** — recent orders, receipt preview, email / SMS / Share·Print.  

If login fails: vendor not approved, wrong password, or Connect not ready.  
If listings empty: Sync from Stripe or set listings **ACTIVE** in Vendor → Listings.  
If connect hangs: forget M2 in iOS Bluetooth settings, power-cycle reader, don’t interrupt firmware update.

---

## Permissions the app will request

| Permission | Why |
|------------|-----|
| Bluetooth | Talk to Stripe Reader M2 |
| Location (While Using) | Required by Stripe Terminal SDK for card-present |
| Local network (dev builds) | Optional — only if debugging against a LAN Next.js server |

---

## Platform ops checklist before inviting vendors

- [ ] Production RootSync has Terminal connection-token + terminal-intent APIs deployed  
- [ ] Stripe platform: Terminal enabled + Location (`STRIPE_TERMINAL_LOCATION_ID`)  
- [ ] Webhook includes `payment_intent.succeeded`  
- [ ] Stripe key can create `card_present` PaymentIntents (RAK permissions or `sk_live_`)  
- [ ] TestFlight (or store) build uploaded and processing complete  
- [ ] `NEXT_PUBLIC_TERMINAL_APP_URL` set on Vercel Production + redeployed  
- [ ] At least one end-to-end charge on a real M2 with a test vendor account  
- [ ] Support blurb (section above) ready to paste into email/SMS  

---

## Updating the app for vendors

When you ship Terminal app JS/native changes:

1. **JS-only** (Metro / OTA if configured): TestFlight users may need a new binary for native Stripe SDK upgrades.  
2. **Native / SDK bump:** new `eas build` + TestFlight upload; bump `version` in `app.json`.  
3. Tell vendors: open TestFlight → update RootSync Terminal.

---

## Android notes

Android is supported in `app.json` (`io.rootsync.terminalpos`), but the primary early path is **iPhone + M2**. For Play:

```bash
eas build --platform android --profile production
```

Upload the AAB to Play Console (internal testing track first), then point `NEXT_PUBLIC_TERMINAL_APP_URL` at the Play listing or keep separate iOS/Android URLs later.

---

## Related links

- Vendor UI: `/account/vendor/pos` · `/account/vendor/pos/install`  
- Admin POS readiness: `/account/admin/vendors`  
- Code: `apps/terminal-pos/`  
- Money ops: [MONEY_OPS_RUNBOOK.md](./MONEY_OPS_RUNBOOK.md) §8  
