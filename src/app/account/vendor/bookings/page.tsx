import { VendorBookingsClient } from "@/components/VendorBookingsClient";

export default function VendorBookingsPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-fix-heading">Incoming appointments</h2>
      <p className="mt-1 text-sm text-fix-text-muted">
        Bookings members made for your services — not appointments you booked as a member.
      </p>
      <div className="mt-6">
        <VendorBookingsClient />
      </div>
    </div>
  );
}
