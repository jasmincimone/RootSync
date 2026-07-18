import { redirect } from "next/navigation";

export const metadata = {
  title: "Stay Synced",
};

function pickWithParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value[0]?.trim()) return value[0].trim();
  return undefined;
}

/** `/messages` forwards to the inbox so bookmarks and deep links keep working. */
export default async function MessagesRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const withV = pickWithParam(sp.with);
  const withU = pickWithParam(sp.withUser);
  const from = pickWithParam(sp.from);
  const q = new URLSearchParams();
  if (withV) q.set("with", withV);
  if (withU) q.set("withUser", withU);
  if (from) q.set("from", from);
  const query = q.toString();
  redirect(query ? `/messages/inbox?${query}` : "/messages/inbox");
}
