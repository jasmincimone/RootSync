import { MemberBookingsClient } from "@/components/MemberBookingsClient";

export default function AccountBookingsPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-fix-heading">My bookings</h2>
      <p className="mt-1 text-sm text-fix-text-muted">
        Services you booked as a member — appointments with marketplace vendors.
      </p>
      <div className="mt-6">
        <MemberBookingsClient />
      </div>
    </div>
  );
}
