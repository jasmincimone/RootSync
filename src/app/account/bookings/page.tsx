import { MemberBookingsClient } from "@/components/MemberBookingsClient";
import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";

export default function AccountBookingsPage() {
  return (
    <AccountSubpageBody description="Services you booked as a member — appointments with marketplace vendors.">
      <MemberBookingsClient />
    </AccountSubpageBody>
  );
}
