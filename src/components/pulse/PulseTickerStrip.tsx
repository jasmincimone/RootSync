import type { Session } from "next-auth";

import { PulseTickerBar } from "@/components/pulse/PulseTickerBar";
import { isAdmin } from "@/lib/permissions";
import {
  loadPersonalTickerItems,
  loadPlatformTickerItems,
  type TickerItem,
} from "@/lib/pulse/ticker";

type Props = {
  session: Session | null;
};

export async function PulseTickerStrip({ session }: Props) {
  const userId = session?.user?.id;

  let platformItems: TickerItem[] = [];
  let personalItems: TickerItem[] = [];

  try {
    [platformItems, personalItems] = await Promise.all([
      loadPlatformTickerItems(),
      userId ? loadPersonalTickerItems(userId) : Promise.resolve([]),
    ]);
  } catch {
    platformItems = [];
  }

  return (
    <PulseTickerBar
      platformItems={platformItems}
      personalItems={personalItems}
      isAdmin={isAdmin(session)}
    />
  );
}
