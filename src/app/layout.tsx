import type { Metadata } from "next";
import { Caveat, Inter } from "next/font/google";
import { getServerSession } from "next-auth";

import { Providers } from "@/components/Providers";
import { SkipLink } from "@/components/SkipLink";
import { SiteChrome } from "@/components/SiteChrome";
import { SiteFooter } from "@/components/SiteFooter";
import { authOptions } from "@/lib/authOptions";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const caveat = Caveat({ subsets: ["latin"], display: "swap", variable: "--font-caveat" });

export const metadata: Metadata = {
  title: {
    default: "RootSync",
    template: "%s • RootSync"
  },
  description:
    "RootSync is a marketplace and community platform — discover local vendors, book services, and connect with creators.",
  metadataBase: new URL("https://rootsync.io"),
  icons: {
    icon: [{ url: "/images/brand/rootsync-platform-symbol.png?v=6", type: "image/png" }],
    apple: [{ url: "/images/brand/rootsync-platform-symbol.png?v=6", type: "image/png" }],
  },
  openGraph: {
    title: "RootSync, Inc.",
    description:
      "Marketplace, community, & connection for local vendors and makers.",
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
    <html lang="en" className={`${inter.className} ${caveat.variable}`}>
      <body>
        <Providers session={session}>
          <div className="flex min-h-dvh flex-col bg-fix-bg text-fix-text">
            <SkipLink />
            <SiteChrome session={session} />
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

