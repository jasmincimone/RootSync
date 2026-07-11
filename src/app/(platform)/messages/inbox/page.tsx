import { Container } from "@/components/Container";
import { MessagesConnectIllustration } from "@/components/MessagesConnectIllustration";
import { AccountSubpageChrome } from "@/components/account/AccountSubpageChrome";
import { VendorMessenger } from "@/components/VendorMessenger";

export const metadata = {
  title: "Stay Synced",
  description: "Build relationships through conversation on RootSync.",
};

function pickWithParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value[0]?.trim()) return value[0].trim();
  return undefined;
}

const STAY_SYNCED_INTRO =
  "Stay Synced is how relationships grow on RootSync — direct messages, vendor conversations, and consultation chats. Start from Discover, Pulse, or a member profile.";

export default async function MessagesInboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const from = pickWithParam(sp.from);
  const showAccountBack = from === "account";
  const vendorProfileIdFromUrl = pickWithParam(sp.with);
  const userIdFromUrl = pickWithParam(sp.withUser);

  const messenger = (
    <>
      <MessagesConnectIllustration className="mx-auto max-w-md" />
      <VendorMessenger
        vendorProfileIdFromUrl={vendorProfileIdFromUrl}
        userIdFromUrl={userIdFromUrl}
      />
    </>
  );

  return (
    <Container className="py-6 sm:py-10">
      {showAccountBack ? (
        <AccountSubpageChrome
          chrome={{
            backHref: "/account?hub=member-hub",
            backLabel: "Member Hub",
            title: "Stay Synced",
          }}
        >
          <div className="space-y-6">
            <p className="text-base text-fix-text-muted">{STAY_SYNCED_INTRO}</p>
            {messenger}
          </div>
        </AccountSubpageChrome>
      ) : (
        <div className="space-y-6">
          <div className="mb-6 max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight text-fix-heading sm:text-4xl">
              Stay Synced
            </h1>
            <p className="mt-2 text-base text-fix-text-muted">{STAY_SYNCED_INTRO}</p>
          </div>
          {messenger}
        </div>
      )}
    </Container>
  );
}
