import { cn } from "@/lib/cn";

const SYMBOL_SRC = "/rootsync-symbol.png?v=4";

const SIZE_PX = {
  sm: 40,
  md: 64,
  lg: 96,
} as const;

type Props = {
  label?: string;
  size?: keyof typeof SIZE_PX;
  className?: string;
  /** Center in a min-height region (route loading, full sections). */
  block?: boolean;
};

export function RootSyncLoader({
  label = "Loading",
  size = "md",
  className,
  block = false,
}: Props) {
  const px = SIZE_PX[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        block && "min-h-[12rem] w-full py-10",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      {/* Native img keeps PNG alpha; next/image optimization can flatten transparency. */}
      <img
        src={SYMBOL_SRC}
        alt=""
        width={px}
        height={px}
        decoding="async"
        className="rootsync-loader bg-transparent motion-reduce:animate-none"
        style={{ width: px, height: px }}
      />
      {label ? (
        <p className="text-sm text-fix-text-muted">{label}</p>
      ) : null}
    </div>
  );
}
