import { cn } from "@/lib/cn";

const handClass = "font-handwriting font-semibold";
const freeClass = cn(handClass, "text-forest");
const strikeClass = cn(handClass, "text-red-600 line-through decoration-red-600/80");

/** Shown in vendor CTA info popovers (home + RootSync landing). */
export const VENDOR_STARTUP_PROMO_NOTICE =
  "RootSync vendor accounts are available at no charge for a limited time during our startup phase. This promotional period is subject to change; standard subscription fees will apply when it ends. RootSync will provide advance notice before any paid vendor plans take effect.";

export function MemberPricingSuffix() {
  return (
    <span className={cn(freeClass, "text-xl leading-none sm:text-2xl")} aria-label="Free">
      FREE
    </span>
  );
}

export function VendorPricingSuffix({ asterisk = false }: { asterisk?: boolean }) {
  return (
    <span className="inline-flex items-baseline justify-center gap-1.5">
      <span className={cn(strikeClass, "text-xl leading-none sm:text-2xl")} aria-hidden>
        $3/mo | $30/yr
      </span>
      <span
        className={cn(freeClass, "text-xl leading-none sm:text-2xl")}
        aria-label={asterisk ? "Free, limited-time promotional offer" : "Free"}
      >
        FREE{asterisk ? "*" : ""}
      </span>
    </span>
  );
}
