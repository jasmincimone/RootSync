import { redirect } from "next/navigation";

import { ROOTSENSE_AI_HREF } from "@/config/rootsensePaths";

/** Legacy path — canonical route is `/rootsense-ai`. */
export default function RootSyncAiLegacyRedirect() {
  redirect(ROOTSENSE_AI_HREF);
}
