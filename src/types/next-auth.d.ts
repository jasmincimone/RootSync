import "next-auth";
import type { Role, VendorStatus } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role: Role;
      vendorStatus?: VendorStatus | null;
    };
  }

  interface User {
    role?: Role;
    vendorStatus?: VendorStatus | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    name?: string | null;
    picture?: string | null;
    role?: Role;
    vendorStatus?: VendorStatus | null;
  }
}
