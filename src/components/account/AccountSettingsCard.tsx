import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

type Props = {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

/** Settings section card — warm, rounded panels matching the account hub. */
export function AccountSettingsCard({ id, title, description, children, className }: Props) {
  return (
    <section aria-labelledby={id} className={cn("space-y-3", className)}>
      <div className="px-1">
        <h2 id={id} className="text-sm font-semibold text-fix-heading">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-fix-text-muted">{description}</p> : null}
      </div>
      <Card className="overflow-hidden p-0 shadow-soft">
        <div className="divide-y divide-fix-border/10 p-5 sm:p-6">{children}</div>
      </Card>
    </section>
  );
}

export const accountSettingsInputClass =
  "mt-1.5 w-full max-w-md rounded-xl border border-fix-border/20 bg-fix-bg-muted/30 px-4 py-2.5 text-sm text-fix-text placeholder:text-fix-text-muted/70 focus:border-forest/40 focus:bg-fix-surface focus:outline-none focus:ring-2 focus:ring-forest/15";

export const accountSettingsTextareaClass =
  "mt-1.5 w-full max-w-lg rounded-xl border border-fix-border/20 bg-fix-bg-muted/30 px-4 py-2.5 text-sm text-fix-text placeholder:text-fix-text-muted/70 focus:border-forest/40 focus:bg-fix-surface focus:outline-none focus:ring-2 focus:ring-forest/15";
