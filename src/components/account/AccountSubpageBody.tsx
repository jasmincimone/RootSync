import { PageBody } from "@/components/ui/PageBody";

type Props = React.ComponentProps<typeof PageBody>;

/** Account-scoped page body — alias for shared PageBody. */
export function AccountSubpageBody(props: Props) {
  return <PageBody {...props} />;
}
