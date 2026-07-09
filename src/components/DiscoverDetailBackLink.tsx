import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { resolveDiscoverBackLink } from "@/lib/discoverReturn";

type Props = {
  returnTo?: string | null;
  variant?: "link" | "button";
  className?: string;
};

export function DiscoverDetailBackLink({
  returnTo,
  variant = "link",
  className,
}: Props) {
  const { href, label } = resolveDiscoverBackLink(returnTo);

  if (variant === "button") {
    return (
      <ButtonLink href={href} variant="ghost" size="sm" className={className}>
        {label}
      </ButtonLink>
    );
  }

  return (
    <Link href={href} className={className ?? "text-sm font-medium text-fix-link hover:text-fix-link-hover"}>
      {label}
    </Link>
  );
}
