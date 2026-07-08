import { Container } from "@/components/Container";
import { RootSyncLoader } from "@/components/RootSyncLoader";

type Props = {
  label?: string;
  /** Wrap in Container (default for most route loading UI). */
  contained?: boolean;
};

export function PageLoading({ label = "Loading", contained = true }: Props) {
  const loader = <RootSyncLoader label={label} size="lg" block />;

  if (!contained) return loader;

  return <Container className="px-4 py-10 sm:px-6 sm:py-16">{loader}</Container>;
}
