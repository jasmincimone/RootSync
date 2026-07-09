import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { VendorOfferingForm } from "@/components/VendorOfferingForm";

export default function NewVendorListingPage() {
  return (
    <AccountSubpageBody description="Create a product, service, resource, or event listing for Discover.">
      <VendorOfferingForm mode="create" />
    </AccountSubpageBody>
  );
}
