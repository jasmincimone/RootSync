"use client";

import { useEffect, useState } from "react";

import { PulseIcon } from "@/components/pulse/PulseIcon";
import type { PulseEarnedPayload } from "@/lib/pulse/toastMessages";
import { cn } from "@/lib/cn";

type Props = PulseEarnedPayload & {
  onDismiss: () => void;
};

export function PulseEarnedToast({ pulseValue, message, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const enter = requestAnimationFrame(() => setVisible(true));
    const timer = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(onDismiss, 280);
    }, 4500);
    return () => {
      cancelAnimationFrame(enter);
      window.clearTimeout(timer);
    };
  }, [onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto w-full max-w-sm rounded-2xl border border-fix-border/15 bg-fix-surface px-4 py-3 shadow-soft transition-all duration-300",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="pulse-earned-heartbeat mt-0.5 inline-flex shrink-0 rounded-full bg-amber/15 p-1.5">
          <PulseIcon size={22} alt="Pulse earned" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fix-heading">
            +{pulseValue} Pulse
          </p>
          <p className="mt-0.5 text-sm leading-snug text-fix-text-muted">{message}</p>
        </div>
      </div>
    </div>
  );
}
