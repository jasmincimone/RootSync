"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

/** Signs out without navigating to NextAuth's GET /api/auth/signout confirmation page (which pollutes browser history). */
export function AccountSignOutButton() {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        void signOut({ callbackUrl: "/" });
      }}
      className="text-fix-text-muted hover:text-fix-heading disabled:opacity-50"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
