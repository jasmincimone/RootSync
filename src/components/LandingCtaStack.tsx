import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type StackProps = {
  children: React.ReactNode;
  className?: string;
};

/** Centered landing-page CTA column — home + RootSync platform hero. */
export function LandingCtaStack({ children, className }: StackProps) {
  return (
    <div className={cn("mx-auto w-full max-w-md px-4 sm:px-0", className)}>
      <div className="flex flex-col gap-3 [&>*]:min-w-0 [&>*]:w-full sm:[&>*]:translate-x-[calc((2.75rem+0.5rem)/2)]">
        {children}
      </div>
    </div>
  );
}

/** Primary CTA row matched to RoleCtaButton width (reserves the info-icon column). */
export function LandingCtaButtonLink({
  className,
  size = "lg",
  ...props
}: React.ComponentProps<typeof ButtonLink>) {
  return (
    <div className="flex w-full min-w-0 gap-2">
      <ButtonLink
        size={size}
        className={cn("min-w-0 flex-1 uppercase tracking-wide", className)}
        {...props}
      />
      <span className="h-11 w-11 shrink-0" aria-hidden />
    </div>
  );
}
