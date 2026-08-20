"use client";

type Props = {
  id: string;
  vendorName?: string | null;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function CheckoutMarketingOptIn({
  id,
  vendorName,
  checked,
  onChange,
  disabled = false,
}: Props) {
  const vendor = vendorName?.trim() || "this business";

  return (
    <label htmlFor={id} className="flex items-start gap-2.5 text-sm text-fix-text">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 shrink-0"
      />
      <span>
        Send me updates, offers, and tips from <strong className="font-medium">{vendor}</strong>.
        Unsubscribe anytime.
      </span>
    </label>
  );
}
