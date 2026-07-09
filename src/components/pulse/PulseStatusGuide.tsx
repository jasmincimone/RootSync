"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

import {
  pulseStatusGuideIntro,
  pulseStatusGuideTitle,
  pulseStatusGuideTiers,
  type PulseStatusGuideScope,
} from "@/config/pulseStatusGuide";
import { cn } from "@/lib/cn";

type GuideState = {
  scope: PulseStatusGuideScope;
  currentStatus?: string;
};

type PulseStatusGuideContextValue = {
  openGuide: (scope: PulseStatusGuideScope, currentStatus?: string) => void;
};

const PulseStatusGuideContext = createContext<PulseStatusGuideContextValue | null>(null);

export function usePulseStatusGuide(): PulseStatusGuideContextValue {
  const ctx = useContext(PulseStatusGuideContext);
  if (!ctx) {
    throw new Error("usePulseStatusGuide must be used within PulseStatusGuideProvider");
  }
  return ctx;
}

function PulseStatusGuideModal({
  state,
  onClose,
}: {
  state: GuideState;
  onClose: () => void;
}) {
  const titleId = useId();
  const tiers = pulseStatusGuideTiers(state.scope);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-fix-heading/45 backdrop-blur-[2px]"
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        className="relative z-10 max-h-[min(85vh,640px)] w-full max-w-md overflow-hidden rounded-2xl border border-fix-border/20 bg-fix-surface/95 shadow-soft backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-fix-border/15 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-fix-heading">
              {pulseStatusGuideTitle(state.scope)}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-fix-text-muted">
              {pulseStatusGuideIntro(state.scope)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-fix-text-muted transition-colors hover:bg-fix-bg-muted hover:text-fix-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-amber"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="max-h-[min(60vh,480px)] space-y-3 overflow-y-auto px-5 py-4">
          {tiers.map((tier) => {
            const isCurrent = state.currentStatus === tier.status;
            return (
              <li
                key={tier.status}
                className={cn(
                  "rounded-xl border px-4 py-3",
                  isCurrent
                    ? "border-amber/40 bg-amber/10"
                    : "border-fix-border/10 bg-fix-bg-muted/20",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl leading-none" aria-hidden>
                    {tier.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fix-heading">
                      {tier.label}
                      {isCurrent ? (
                        <span className="ml-2 text-xs font-medium text-amber">(You are here)</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-fix-text-muted">{tier.rangeLabel}</p>
                    <p className="mt-2 text-sm leading-relaxed text-fix-text-muted">
                      {tier.description}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function PulseStatusGuideProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GuideState | null>(null);

  const openGuide = useCallback((scope: PulseStatusGuideScope, currentStatus?: string) => {
    setState({ scope, currentStatus });
  }, []);

  const closeGuide = useCallback(() => setState(null), []);

  return (
    <PulseStatusGuideContext.Provider value={{ openGuide }}>
      {children}
      {state ? <PulseStatusGuideModal state={state} onClose={closeGuide} /> : null}
    </PulseStatusGuideContext.Provider>
  );
}

type LinkProps = {
  scope: PulseStatusGuideScope;
  currentStatus?: string;
  children: React.ReactNode;
  className?: string;
};

export function PulseStatusLink({ scope, currentStatus, children, className }: LinkProps) {
  const { openGuide } = usePulseStatusGuide();

  return (
    <button
      type="button"
      onClick={() => openGuide(scope, currentStatus)}
      className={cn(
        "inline text-left font-medium text-fix-link underline-offset-2 transition-colors hover:text-fix-link-hover hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2",
        className,
      )}
    >
      {children}
    </button>
  );
}
