import { Container } from "@/components/Container";
import { RootSyncChat } from "@/components/RootSyncChat";
import { RootSyncFeatureCards } from "@/components/RootSyncFeatureCards";
import { BrandPngIcon } from "@/components/ui/BrandPngIcon";
import { platformNavIconByHref } from "@/config/platformExploreNav";
import { ROOTSENSE_AI_HREF } from "@/config/rootsensePaths";

export const metadata = {
  title: "RootSense AI",
};

export default function RootSenseAiPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-3xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          <BrandPngIcon
            src={platformNavIconByHref[ROOTSENSE_AI_HREF]}
            alt="RootSense AI"
            size={72}
            className="h-16 w-16 shrink-0 sm:h-[72px] sm:w-[72px]"
          />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-fix-heading sm:text-4xl">
              RootSense AI
            </h1>
            <p className="mt-3 text-base text-fix-text-muted">
              Your AI guide for growing, eating well, and planning a resilient food business—rooted in
              farming, gardening, and healthy food.
            </p>
          </div>
        </div>
      </div>

      <RootSyncFeatureCards />

      <div className="mx-auto w-full max-w-6xl">
        <RootSyncChat />
      </div>
    </Container>
  );
}
