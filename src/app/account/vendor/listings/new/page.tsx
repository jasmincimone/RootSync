import { VendorOfferingForm } from "@/components/VendorOfferingForm";

export default function NewVendorListingPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold text-fix-heading">New offering</h2>
      <VendorOfferingForm mode="create" />
    </div>
  );
}
