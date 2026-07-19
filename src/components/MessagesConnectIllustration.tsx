import { PlatformIllustrationBanner } from "@/components/PlatformIllustrationBanner";

/**
 * Stay Synced inbox banner — neighbors connecting with helpful technology outdoors.
 */
export function MessagesConnectIllustration({ className }: { className?: string }) {
  return (
    <PlatformIllustrationBanner
      src="/images/platform/messages/stay-synced-connect.png"
      alt="Teens, young adults, and older neighbors talking face-to-face in a community garden — Stay Synced relationships."
      width={1376}
      height={768}
      fit="cover"
      className={className}
    />
  );
}
