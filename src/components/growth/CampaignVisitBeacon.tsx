"use client";

import { useEffect } from "react";

export function CampaignVisitBeacon({
  token,
  funnelId,
}: {
  token: string;
  funnelId?: string | null;
}) {
  useEffect(() => {
    fetch("/api/growth/t/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, funnelId: funnelId || null }),
    }).catch(() => undefined);
  }, [funnelId, token]);
  return null;
}
