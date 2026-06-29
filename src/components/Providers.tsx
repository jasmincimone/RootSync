"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

type Props = {
  children: React.ReactNode;
  /** Passed from the server so the client doesn’t depend on a failing /api/auth/session round-trip. */
  session: Session | null;
};

export function Providers({ children, session }: Props) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
