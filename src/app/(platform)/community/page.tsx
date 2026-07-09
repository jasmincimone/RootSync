import { redirect } from "next/navigation";

/** Legacy URL — forwards to Pulse. */
export default function CommunityRedirectPage() {
  redirect("/pulse");
}
