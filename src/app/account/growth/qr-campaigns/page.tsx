import { QrCode } from "lucide-react";

import { GrowthModuleShell } from "@/components/growth/GrowthModuleShell";

export default function GrowthQrCampaignsPage() {
  return (
    <GrowthModuleShell
      title="QR Campaigns"
      description="QR codes are central to RootSync — track scans from InvestFest, farmers markets, books, seed kits, and vendor booths."
      icon={QrCode}
      highlights={[
        "InvestFest, workshops, packaging, and booth campaigns",
        "Scan count and conversion tracking",
        "Destination URL and landing page links",
        "New members and revenue attribution",
      ]}
    />
  );
}
