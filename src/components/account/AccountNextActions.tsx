import Link from "next/link";

type NextAction = {
  href: string;
  label: string;
  hint: string;
};

type Props = {
  actions: NextAction[];
};

/** Role-aware shortcuts — max 3 primary next steps on Account. */
export function AccountNextActions({ actions }: Props) {
  if (actions.length === 0) return null;
  const shown = actions.slice(0, 3);

  return (
    <section className="mt-6" aria-labelledby="account-up-next-heading">
      <h2 id="account-up-next-heading" className="text-sm font-semibold text-fix-heading">
        Up next
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {shown.map((action) => (
          <li key={action.href}>
            <Link
              href={action.href}
              className="flex h-full flex-col rounded-2xl border border-fix-border/15 bg-fix-surface px-4 py-3 transition-colors hover:border-forest/30 hover:bg-fix-bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2"
            >
              <span className="text-sm font-semibold text-fix-heading">{action.label}</span>
              <span className="mt-1 text-xs leading-relaxed text-fix-text-muted">{action.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
