import type { AuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { normalizeOtpSixDigits, otpCodesEqual } from "@/lib/auth-tokens";
import { ROLES, toVendorStatus } from "@/lib/roles";
import { toNextAuthUser } from "@/lib/sessionUser";
import { CHALLENGE_PURPOSE, TWO_FACTOR_METHOD } from "@/lib/twoFactor";

export const authOptions: AuthOptions = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.trim().toLowerCase() },
          include: { vendorProfile: true },
        });
        if (!user?.passwordHash) return null;
        const ok = verifyPassword(credentials.password, user.passwordHash);
        if (!ok) return null;
        const tf = user.twoFactorMethod || TWO_FACTOR_METHOD.NONE;
        if (tf !== TWO_FACTOR_METHOD.NONE) return null;
        return toNextAuthUser(user);
      },
    }),
    Credentials({
      id: "credentials-2fa",
      name: "credentials-2fa",
      credentials: {
        challengeId: { label: "Challenge", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.challengeId || credentials?.code == null) return null;
        const challengeId = String(credentials.challengeId).trim();
        const code = normalizeOtpSixDigits(String(credentials.code ?? ""));
        if (!challengeId || code.length !== 6) return null;
        const challenge = await prisma.loginChallenge.findUnique({
          where: { id: challengeId },
        });
        if (!challenge || challenge.purpose !== CHALLENGE_PURPOSE.LOGIN) return null;
        if (challenge.consumedAt) return null;
        if (challenge.expiresAt < new Date()) return null;
        if (!otpCodesEqual(challenge.codeHash, code, challenge.id)) return null;
        await prisma.loginChallenge.update({
          where: { id: challenge.id },
          data: { consumedAt: new Date() },
        });
        const user = await prisma.user.findUnique({
          where: { id: challenge.userId },
          include: { vendorProfile: true },
        });
        if (!user) return null;
        return toNextAuthUser(user);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? undefined;
        token.name = user.name ?? undefined;
        token.picture = user.image ?? undefined;
        token.role = user.role ?? ROLES.CUSTOMER;
        token.vendorStatus = toVendorStatus(user.vendorStatus as string | null | undefined);
      } else if (token.id) {
        // Keep JWT in sync with DB (e.g. admin role changes, vendor approval) — token.role alone would stay stale.
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { vendorProfile: true },
        });
        if (u) {
          token.email = u.email ?? undefined;
          token.name = u.name ?? undefined;
          token.picture = u.imageUrl ?? undefined;
          token.role =
            u.role === ROLES.ADMIN || u.role === ROLES.VENDOR || u.role === ROLES.CUSTOMER
              ? u.role
              : ROLES.CUSTOMER;
          token.vendorStatus = toVendorStatus(u.vendorProfile?.status);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null | undefined;
        session.user.image = (token.picture as string | null | undefined) ?? null;
        session.user.role = (token.role as typeof ROLES[keyof typeof ROLES]) ?? ROLES.CUSTOMER;
        session.user.vendorStatus = toVendorStatus(token.vendorStatus as string | null | undefined);
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" as const, maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};
