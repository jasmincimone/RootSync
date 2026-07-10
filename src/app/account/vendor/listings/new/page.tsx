import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { VendorOfferingForm } from "@/components/VendorOfferingForm";
import { LISTING_TYPE } from "@/lib/roles";

type WizardStepKey = "basics" | "details" | "options" | "checkout" | "publish";

const WIZARD_STEPS = new Set<WizardStepKey>([
  "basics",
  "details",
  "options",
  "checkout",
  "publish",
]);

export default async function NewVendorListingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; step?: string }>;
}) {
  const params = await searchParams;
  const type =
    typeof params.type === "string" &&
    Object.values(LISTING_TYPE).includes(params.type as (typeof LISTING_TYPE)[keyof typeof LISTING_TYPE])
      ? params.type
      : undefined;
  const step =
    typeof params.step === "string" && WIZARD_STEPS.has(params.step as WizardStepKey)
      ? (params.step as WizardStepKey)
      : undefined;

  return (
    <AccountSubpageBody description="Create a product, service, resource, or event listing for Discover.">
      <VendorOfferingForm
        mode="create"
        defaultListingType={type}
        initialWizardStep={step}
      />
    </AccountSubpageBody>
  );
}
