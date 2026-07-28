# RootSync Terminal (Stripe Reader M2)

This companion app is required because the **M2 is a Bluetooth reader**. Stripe’s Dashboard cannot drive it for Connect destination charges the way a Wi‑Fi smart reader can. RootSync’s web POS still works for phone/tablet Checkout; this app is specifically for the M2 you already bought.

## What you need
- iPhone (recommended) or Android phone with Bluetooth
- Stripe Reader M2 charged/paired nearby
- Approved RootSync vendor + Payment Hub Connect account
- Mac with Xcode (for iOS) or Android Studio
- Node 20+

## 1. Backend (already in RootSync)
Deploy / run RootSync with:
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (same mode: test or live)
- `NEXTAUTH_SECRET`
- Optional but recommended: `STRIPE_TERMINAL_LOCATION_ID=tml_…`  
  Create once in Stripe Dashboard (platform account) → **Terminal → Locations**, then paste the id.

Enable webhook event `payment_intent.succeeded` on your existing Stripe webhook (in addition to `checkout.session.completed`).

## 2. Install & run the app (physical device)
```bash
cd apps/terminal-pos
npm install
npx expo prebuild
npx expo run:ios --device
# or
npx expo run:android --device
```

Expo Go will **not** work — Terminal needs a development build.

## 3. Use it
1. Open **RootSync Terminal** on your phone  
2. API URL: `https://rootsync.io` (or your local tunnel / LAN URL)  
3. Sign in with vendor email/password  
4. **Scan for M2** → **Connect**  
5. Enter amount → **Charge on M2** → customer taps/inserts  

Money flow matches Discover: charge on RootSync platform → transfer to Urban Roots Connect `acct_…`.

## Troubleshooting
- **No readers found:** Bluetooth on, M2 awake, grant Location + Bluetooth permissions, stand close.  
- **Connect fails / wrong location:** Set `STRIPE_TERMINAL_LOCATION_ID` on the server; re-login.  
- **Nothing in Urban Roots Payments tab:** Expected for destination charges — check **platform** Payments + connected account **balances/transfers**. Use **View Dashboard as** the Connect account from RootSync.  
- **Two Urban Roots accounts:** Always match Payment Hub’s `acct_…`.

## Counter POS without the app
Vendor web → **In-person POS → Counter** still works today for phone/tablet Checkout if the M2 isn’t handy.
