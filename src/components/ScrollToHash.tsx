"use client";

import { useEffect } from "react";

/**
 * Next.js client navigations often skip native hash scrolling.
 * On mount, jump to the URL fragment when present.
 */
export function ScrollToHash() {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    el.scrollIntoView({ block: "start" });
  }, []);
  return null;
}
