import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import {
  fetchConnectAccountStatus,
  getConnectStripeClient,
  normalizeStripeConnectAccountId,
  stripeConnectErrorMessage,
  stripeConnectForbiddenHint,
} from "@/lib/stripeConnectDemo";

export const runtime = "nodejs";

/**
 * Recovery endpoint: attach an already-created Stripe connected account (`acct_...`)
 * to the signed-in user if local DB mapping was lost.
 *
 * This demo uses Connect **v2** accounts (`stripe.v2.core.accounts`). Legacy Standard /
 * Express accounts created only under the v1 Accounts API may not retrieve here — use
 * an account created via this app’s “Create connected account” (or the recoverable id
 * from a failed DB save).
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const raw = typeof body?.accountId === "string" ? body.accountId : "";
  const accountId = normalizeStripeConnectAccountId(raw);
  if (!accountId.startsWith("acct_")) {
    return NextResponse.json(
      {
        error:
          "Valid account id required: paste `acct_...` (or a Stripe dashboard URL containing it).",
      },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeConnectAccountId: true },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (user.stripeConnectAccountId === accountId) {
    try {
      const onboarding = await fetchConnectAccountStatus(accountId);
      return NextResponse.json({
        accountId,
        onboarding,
        message: "This account is already linked to your profile.",
      });
    } catch (err) {
      return NextResponse.json(
        {
          error: stripeConnectErrorMessage(err),
          hint:
            "The id is saved locally but Stripe could not load this account. Confirm STRIPE_SECRET_KEY matches the environment where the account was created, and that this is a Connect v2 account from this integration.",
        },
        { status: 502 }
      );
    }
  }

  const stripeClient = getConnectStripeClient();
  try {
    await stripeClient.v2.core.accounts.retrieve(accountId);
  } catch (err) {
    const msg = stripeConnectErrorMessage(err);
    const hint =
      err instanceof Stripe.errors.StripeError && err.statusCode === 403
        ? stripeConnectForbiddenHint(err)
        : err instanceof Stripe.errors.StripeError
          ? "If this account was created outside RootSync (classic Connect only), v2 retrieve will fail — use “Create Stripe account” here, or paste an acct_… created by this app."
          : undefined;
    if (err instanceof Stripe.errors.StripeError) {
      const code = err.statusCode;
      const status =
        typeof code === "number" && code >= 400 && code < 600 ? code : 502;
      return NextResponse.json({ error: msg, hint }, { status });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { stripeConnectAccountId: accountId },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "This Stripe Connect account is already linked to another user. Each `acct_` can only be attached to one app user.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: stripeConnectErrorMessage(err) }, { status: 500 });
  }

  try {
    const onboarding = await fetchConnectAccountStatus(accountId);
    return NextResponse.json({ accountId, onboarding, message: "Connected account linked." });
  } catch (err) {
    return NextResponse.json(
      {
        error: stripeConnectErrorMessage(err),
        hint: "Mapping was saved; refresh the page. If status stays broken, check API keys and that this is a v2 Connect account.",
      },
      { status: 502 }
    );
  }
}
