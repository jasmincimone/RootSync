import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";

export type VendorUploadActor = {
  userId: string;
  isAdmin: boolean;
};

export async function authorizeVendorUpload():
  Promise<{ actor: VendorUploadActor } | { response: NextResponse }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      response: NextResponse.json(
        {
          error: "You are not signed in.",
          hint: "Sign in and try again.",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { vendorProfile: true },
  });

  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Account not found.", code: "NO_USER" },
        { status: 403 },
      ),
    };
  }

  const isAdminUser = user.role === ROLES.ADMIN;

  if (!isAdminUser) {
    if (!user.vendorProfile) {
      return {
        response: NextResponse.json(
          {
            error: "No vendor profile on this account.",
            hint: "Complete the vendor application from your account dashboard first.",
            code: "NO_VENDOR_PROFILE",
          },
          { status: 403 },
        ),
      };
    }

    if (user.vendorProfile.status !== VENDOR_STATUS.APPROVED) {
      return {
        response: NextResponse.json(
          {
            error: `Vendor status is "${user.vendorProfile.status}", not approved yet.`,
            hint: "Wait for an admin to approve your vendor application, then try again.",
            code: "VENDOR_NOT_APPROVED",
            details: { vendorStatus: user.vendorProfile.status },
          },
          { status: 403 },
        ),
      };
    }
  }

  const canUpload = user.role === ROLES.VENDOR || user.role === ROLES.ADMIN;
  if (!canUpload) {
    return {
      response: NextResponse.json(
        {
          error: `Your account role is "${user.role}". Uploads require Vendor or Admin.`,
          hint: "Ask an admin to set your role to Vendor in Admin → Users.",
          code: "WRONG_ROLE",
          details: { role: user.role },
        },
        { status: 403 },
      ),
    };
  }

  return { actor: { userId: user.id, isAdmin: isAdminUser } };
}
