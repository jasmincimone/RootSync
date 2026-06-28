import type { User } from "next-auth";
import type { User as DbUser, VendorProfile } from "@prisma/client";

import { ROLES, toVendorStatus } from "@/lib/roles";

export function toNextAuthUser(
  user: DbUser & { vendorProfile?: VendorProfile | null }
): User {
  const role =
    user.role === ROLES.ADMIN || user.role === ROLES.VENDOR || user.role === ROLES.CUSTOMER
      ? user.role
      : ROLES.CUSTOMER;
  return {
    id: user.id,
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    image: user.imageUrl ?? undefined,
    role,
    vendorStatus: toVendorStatus(user.vendorProfile?.status),
  };
}
