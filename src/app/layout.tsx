import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";

import { Providers } from "@/components/Providers";
import { SkipLink } from "@/components/SkipLink";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { authOptions } from "@/lib/authOptions";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "The Fix Collective",
    template: "%s • The Fix Collective"
  },
  description:
    "RootSync is a marketplace and community platform — discover local vendors, book services, and connect with creators.",
  metadataBase: new URL("https://thefixcollective.com"),
  openGraph: {
    title: "The Fix Collective",
    description:
      "Marketplace, community, and connection for local vendors and makers.",
    type: "website"
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  // getServerSession throws on non-200 (e.g. bad NEXTAUTH_SECRET vs cookie, corrupt session).
  // Never let that take down the whole app — show the site and log in dev.
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[next-auth] getServerSession failed (check NEXTAUTH_SECRET / clear cookies):", e);
    }
  }

  return (
    <html lang="en" className={inter.className}>
      <body>
        <Providers session={session}>
          <div className="flex min-h-dvh flex-col bg-fix-bg text-fix-text">
            <SkipLink />
            <SiteHeader />
            <main id="main-content" className="flex min-h-0 flex-1 flex-col">
              {children}
            </main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}

