import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";

export const metadata = {
  title: "Install RootSync Terminal",
};

const INSTALL_URL = process.env.NEXT_PUBLIC_TERMINAL_APP_URL?.trim() || null;

/**
 * Vendor-facing install documentation for the M2 companion app.
 * Full ops detail also lives in docs/TERMINAL_APP_INSTALL.md.
 */
export default async function VendorPosInstallPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/vendor/pos/install");
  }

  const profile = await prisma.vendorProfile.findUnique({
    where: { userId: session.user.id },
    select: { status: true },
  });

  if (!profile) {
    redirect("/account/vendor/apply");
  }

  if (session.user.role !== ROLES.VENDOR || profile.status !== VENDOR_STATUS.APPROVED) {
    redirect("/account/vendor");
  }

  return (
    <AccountSubpageBody description="Download and set up RootSync Terminal for the Stripe Reader M2.">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-sm text-fix-text-muted">
            <Link href="/account/vendor/pos" className="font-medium text-fix-link hover:text-fix-link-hover">
              ← Back to In-person POS
            </Link>
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-fix-heading">
            Install RootSync Terminal
          </h1>
          <p className="mt-2 text-sm text-fix-text-muted">
            This phone app connects to your Stripe Reader M2 over Bluetooth. It is separate from the
            RootSync website.
          </p>
        </div>

        <Card className="space-y-3 border-amber-700/25 bg-amber-50/80 p-5">
          <h2 className="text-sm font-semibold text-fix-heading">
            Seeing “Unavailable” in the App Store?
          </h2>
          <p className="text-sm text-fix-text">
            RootSync Terminal is <strong className="font-semibold text-fix-heading">not a public
            App Store listing</strong> yet. Searching the App Store (or opening a generic store
            link) commonly shows <strong className="font-semibold text-fix-heading">Unavailable</strong>
            — that is expected, not a broken checkout.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-fix-text-muted">
            <li>
              Do <strong className="text-fix-heading">not</strong> use Expo Go — it will not run
              this app.
            </li>
            <li>
              Take card payments now on the website:{" "}
              <Link href="/account/vendor/pos" className="font-medium text-fix-link">
                Counter POS
              </Link>{" "}
              (no M2 app required).
            </li>
            <li>
              Install the companion app only via a RootSync{" "}
              <strong className="text-fix-heading">TestFlight</strong> invite or the official
              install link below (once published).
            </li>
          </ul>
        </Card>

        <Card className="space-y-3 border-forest/20 bg-forest/5 p-5">
          <h2 className="text-sm font-semibold text-fix-heading">Before you install</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-fix-text-muted">
            <li>
              Your vendor account is <strong className="text-fix-heading">approved</strong>.
            </li>
            <li>
              <Link href="/account/vendor/payments" className="font-medium text-fix-link">
                Payment Hub
              </Link>{" "}
              is finished (Stripe Connect can accept charges and payouts).
            </li>
            <li>
              You have an iPhone with Bluetooth (Android support may follow; ask RootSync if you need
              it).
            </li>
            <li>
              Optional but recommended: a charged{" "}
              <strong className="text-fix-heading">Stripe Reader M2</strong>.
            </li>
          </ol>
          <p className="text-xs text-fix-text-muted">
            No reader yet? Use{" "}
            <Link href="/account/vendor/pos" className="font-medium text-fix-link">
              Counter checkout
            </Link>{" "}
            on your phone or tablet — no app download required.
          </p>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-base font-semibold text-fix-heading">1. Download the app</h2>
          {INSTALL_URL ? (
            <>
              <p className="text-sm text-fix-text-muted">
                Use the official RootSync install link below. On iPhone this is usually{" "}
                <strong className="text-fix-heading">TestFlight</strong> (install Apple’s TestFlight
                app first if prompted) or the App Store.
              </p>
              <ButtonLink href={INSTALL_URL} variant="cta" size="sm" className="inline-flex">
                Download / open install link
              </ButtonLink>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-fix-text-muted">
                <li>Tap the button above on the phone you will use at your stall or counter.</li>
                <li>
                  If TestFlight opens: accept the invitation, then tap <strong>Install</strong> on
                  RootSync Terminal.
                </li>
                <li>
                  If the App Store opens: tap <strong>Get</strong> / <strong>Install</strong>.
                </li>
                <li>
                  Wait until the home screen shows the <strong>RootSync Terminal</strong> icon.
                </li>
              </ol>
            </>
          ) : (
            <>
              <p className="text-sm text-fix-text-muted">
                RootSync has not published a public install link yet. Ask the RootSync team for a{" "}
                <strong className="text-fix-heading">TestFlight invite</strong> to your Apple ID
                email, or wait until the App Store listing is live.
              </p>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-fix-text-muted">
                <li>Install Apple’s free <strong>TestFlight</strong> app from the App Store.</li>
                <li>Open the invite email from RootSync / App Store Connect on your iPhone.</li>
                <li>Tap <strong>View in TestFlight</strong> → <strong>Accept</strong> → <strong>Install</strong>.</li>
                <li>Open <strong>RootSync Terminal</strong> from your home screen.</li>
              </ol>
            </>
          )}
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-base font-semibold text-fix-heading">2. First launch &amp; sign-in</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-fix-text-muted">
            <li>Open <strong className="text-fix-heading">RootSync Terminal</strong>.</li>
            <li>
              API URL: leave or set <code className="rounded bg-fix-bg-muted px-1 text-xs">https://rootsync.io</code>
            </li>
            <li>
              Sign in with the <strong className="text-fix-heading">same email and password</strong>{" "}
              you use on the RootSync website (vendor account).
            </li>
            <li>
              When iOS asks, allow <strong className="text-fix-heading">Bluetooth</strong> and{" "}
              <strong className="text-fix-heading">Location While Using</strong> — Stripe requires
              both for the card reader.
            </li>
            <li>
              You should see your shop name and Connect account id (
              <code className="text-xs">acct_…</code>).
            </li>
          </ol>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-base font-semibold text-fix-heading">3. Connect the Stripe Reader M2</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-fix-text-muted">
            <li>Charge the M2 until the battery indicators look full.</li>
            <li>
              Wake the reader (press the power button). Lights should animate / show ready.
            </li>
            <li>
              <strong className="text-fix-heading">Do not</strong> pair the reader under iPhone{" "}
              <strong>Settings → Bluetooth</strong>. If it already appears there as Connected, tap
              the ⓘ → <strong>Forget This Device</strong>.
            </li>
            <li>
              In RootSync Terminal → <strong>Charge</strong> → <strong>Scan for M2</strong>.
            </li>
            <li>
              When the reader appears, connect (the app may auto-connect). Accept any Pair prompt
              from the app — not from Settings.
            </li>
            <li>
              The <strong className="text-fix-heading">first</strong> successful connection often
              installs required firmware (about <strong>5–15 minutes</strong>). Keep the app open,
              phone unlocked, and next to the reader until progress reaches 100%. Do not force-quit
              or tap Cancel during the update.
            </li>
          </ol>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-base font-semibold text-fix-heading">4. Take a payment</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-fix-text-muted">
            <li>
              On the website, set listings to <strong className="text-fix-heading">ACTIVE</strong>,
              or in the app tap <strong>Sync from Stripe</strong> / <strong>Refresh listings</strong>.
            </li>
            <li>Tap a listing or enter a custom amount → present the card on the M2.</li>
            <li>
              Open the <strong className="text-fix-heading">Sales</strong> tab for history, on-screen
              receipt, email, SMS, or <strong>Share / Print</strong> (AirPrint, Phomemo, etc.).
            </li>
          </ol>
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="text-base font-semibold text-fix-heading">Troubleshooting</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-fix-text-muted">
            <li>
              <strong className="text-fix-heading">App Store says Unavailable:</strong> expected —
              the app is not public yet. Use Counter POS on the website, or install via TestFlight /
              the RootSync link on this page — not Expo Go or a store search.
            </li>
            <li>
              <strong className="text-fix-heading">Can’t find the app in the App Store:</strong> use
              the install / TestFlight link from RootSync — it is not a generic public listing until
              published.
            </li>
            <li>
              <strong className="text-fix-heading">Untrusted Developer:</strong> Settings → General →
              VPN &amp; Device Management → trust the developer profile (USB/dev installs only).
            </li>
            <li>
              <strong className="text-fix-heading">Login fails:</strong> confirm Payment Hub is
              complete and you are using your vendor password.
            </li>
            <li>
              <strong className="text-fix-heading">No readers found:</strong> Bluetooth on, M2 awake,
              stand close, grant Location + Bluetooth.
            </li>
            <li>
              <strong className="text-fix-heading">Stuck on Connecting:</strong> Forget the M2 in
              Settings → Bluetooth, power-cycle the reader, scan again inside the app only.
            </li>
            <li>
              <strong className="text-fix-heading">Empty listings:</strong> ACTIVE status in Vendor →
              Listings, or Sync from Stripe in the app.
            </li>
          </ul>
        </Card>

        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/account/vendor/pos" variant="secondary" size="sm">
            Back to In-person POS
          </ButtonLink>
          <ButtonLink href="/account/vendor/payments" variant="secondary" size="sm">
            Payment Hub
          </ButtonLink>
        </div>
      </div>
    </AccountSubpageBody>
  );
}
