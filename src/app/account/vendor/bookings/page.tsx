import { VendorBookingsClient } from "@/components/VendorBookingsClient";
import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";

export default function VendorBookingsPage() {
  return (
    <AccountSubpageBody description="Bookings members made for your services — not appointments you booked as a member.">
      <VendorBookingsClient />
    </AccountSubpageBody>
  );
}
