import type { Session } from "next-auth";

import { PulseTickerStrip } from "@/components/pulse/PulseTickerStrip";
import { SiteHeader } from "@/components/SiteHeader";

type Props = {
  session: Session | null;
};

/** Sticky site header + Pulse ticker sub-header (Bloomberg-style ecosystem strip). */
export function SiteChrome({ session }: Props) {
  return (
    <div className="sticky top-0 z-50">
      <SiteHeader />
      <PulseTickerStrip session={session} />
    </div>
  );
}
