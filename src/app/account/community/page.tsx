import { redirect } from "next/navigation";

/** Legacy account URL — forwards to My Pulses. */
export default function AccountCommunityRedirectPage() {
  redirect("/account/pulses");
}
