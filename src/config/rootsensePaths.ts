/** Canonical public route for RootSense AI. Legacy `/rootsyncai` redirects here. */
export const ROOTSENSE_AI_HREF = "/rootsense-ai";

export function isRootSenseAiActive(pathname: string): boolean {
  return (
    pathname === ROOTSENSE_AI_HREF ||
    pathname.startsWith(`${ROOTSENSE_AI_HREF}/`) ||
    pathname === "/rootsyncai" ||
    pathname.startsWith("/rootsyncai/")
  );
}
