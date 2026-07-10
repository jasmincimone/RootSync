import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import {
  fetchConnectAccountStatus,
  getConnectStripeClient,
  getDefaultCountry,
  stripeConnectErrorMessage,
  stripeConnectForbiddenHint,
} from "@/lib/stripeConnectDemo";

export const runtime = "nodejs";

/**
 * GET: returns current user's connected account mapping + live onboarding status from Stripe.
 *
 * Step-by-step:
 * 1. Auth the signed-in user.
 * 2. Read `User.stripeConnectAccountId` from PostgreSQL (user → connected account mapping).
 * 3. If mapped, call Accounts v2 retrieve with merchant + requirements includes.
 *    Status is always fetched live from Stripe — we do not cache readiness in the DB.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      stripeConnectAccountId: true,
      stripeSubscriptionStatus: true,
      stripeSubscriptionPriceId: true,
      stripeSubscriptionCurrentPeriodEnd: true,
    },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const subscription = {
    status: user.stripeSubscriptionStatus,
    priceId: user.stripeSubscriptionPriceId,
    currentPeriodEnd: user.stripeSubscriptionCurrentPeriodEnd?.toISOString() ?? null,
  };

  if (!user.stripeConnectAccountId) {
    return NextResponse.json({
      accountId: null,
      onboarding: null,
      subscription,
      message: "No connected account yet. Use POST /api/connect/account to create one.",
    });
  }

  try {
    const onboarding = await fetchConnectAccountStatus(user.stripeConnectAccountId);
    return NextResponse.json({
      accountId: user.stripeConnectAccountId,
      onboarding,
      subscription,
    });
  } catch (err) {
    console.error("[connect/account GET] failed:", err);
    return NextResponse.json(
      {
        error: stripeConnectErrorMessage(err),
        hint: stripeConnectForbiddenHint(err),
        accountId: user.stripeConnectAccountId,
        subscription,
      },
      { status: 502 },
    );
  }
}

/**
 * POST: creates a Connect Accounts v2 connected account and stores user → accountId in DB.
 *
 * IMPORTANT:
 * - Use ONLY the properties below. Never pass top-level `type: 'express' | 'standard' | 'custom'`.
 * - `stripeClient` comes from `getConnectStripeClient()` / `STRIPE_SECRET_KEY`.
 * - PLACEHOLDER: set `STRIPE_SECRET_KEY` in `.env.local` (sk_… or rk_… with Connect permissions).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, stripeConnectAccountId: true },
    });
    if (!user?.email) return NextResponse.json({ error: "User email is required." }, { status: 400 });
    if (user.stripeConnectAccountId) {
      try {
        const onboarding = await fetchConnectAccountStatus(user.stripeConnectAccountId);
        return NextResponse.json(
          { accountId: user.stripeConnectAccountId, onboarding, message: "Connected account already exists." },
          { status: 200 }
        );
      } catch (err) {
        return NextResponse.json(
          {
            error:
              `Your profile is already linked to ${user.stripeConnectAccountId}, but its status could not be loaded.`,
            hint:
              `${stripeConnectErrorMessage(err)} ` +
              "Use 'Clear mapping (dev)' in Connect demo (or DELETE /api/connect/account) to unlink and create a new connected account.",
            accountId: user.stripeConnectAccountId,
          },
          { status: 409 }
        );
      }
    }

    const displayName =
      typeof body?.displayName === "string" && body.displayName.trim()
        ? body.displayName.trim()
        : user.name?.trim() || user.email;
    const contactEmail =
      typeof body?.contactEmail === "string" && body.contactEmail.trim()
        ? body.contactEmail.trim()
        : user.email;

    const stripeClient = getConnectStripeClient();
    // Accounts v2 create — do not pass classic `type` at the top level.
    const account = await stripeClient.v2.core.accounts.create({
      display_name: displayName,
      contact_email: contactEmail,
      identity: {
        country: getDefaultCountry(),
      },
      dashboard: "full",
      defaults: {
        responsibilities: {
          fees_collector: "stripe",
          losses_collector: "stripe",
        },
      },
      configuration: {
        customer: {},
        merchant: {
          capabilities: {
            card_payments: {
              requested: true,
            },
          },
        },
      },
    });

    try {
      // Persist mapping: RootSync User ↔ Stripe connected account id (`acct_…`).
      await prisma.user.update({
        where: { id: userId },
        data: { stripeConnectAccountId: account.id },
      });
    } catch {
      // Recovery path: account exists in Stripe but local mapping failed.
      return NextResponse.json(
        {
          error:
            `Connected account ${account.id} was created in Stripe, but saving local mapping failed. ` +
            "Use POST /api/connect/account/link with this accountId to recover.",
          recoverableAccountId: account.id,
        },
        { status: 500 }
      );
    }

    const onboarding = await fetchConnectAccountStatus(account.id);
    return NextResponse.json({ accountId: account.id, onboarding }, { status: 201 });
  } catch (err) {
    console.error("[connect/account POST] failed:", err);
    return NextResponse.json(
      {
        error: stripeConnectErrorMessage(err) || "Failed to create connected account.",
      },
      { status: 500 }
    );
  }
}

/**
 * Clears the local Connect account mapping so you can create a new test account.
 * Disabled in production unless STRIPE_CONNECT_ALLOW_RESET=true.
 */
export async function DELETE() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allow =
    process.env.NODE_ENV !== "production" || process.env.STRIPE_CONNECT_ALLOW_RESET === "true";
  if (!allow) {
    return NextResponse.json(
      {
        error:
          "Reset is disabled in production. Set STRIPE_CONNECT_ALLOW_RESET=true temporarily if you need to clear mapping.",
      },
      { status: 403 }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { stripeConnectAccountId: null },
  });
  return NextResponse.json({ ok: true, message: "Connect mapping cleared. You can create a new connected account." });
}
