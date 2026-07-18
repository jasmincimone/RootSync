"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

import { PulseIcon } from "@/components/pulse/PulseIcon";
import { usePulseToast } from "@/components/pulse/PulseToastProvider";
import { cn } from "@/lib/cn";

type Props = {
  postId: string;
  authorId: string;
  initialCount: number;
  initialGiven: boolean;
};

export function GivePulseButton({ postId, authorId, initialCount, initialGiven }: Props) {
  const { data: session, status } = useSession();
  const { checkForNewPulseEvents } = usePulseToast();
  const [count, setCount] = useState(initialCount);
  const [given, setGiven] = useState(initialGiven);
  const [pending, setPending] = useState(false);
  const [heartbeat, setHeartbeat] = useState(false);

  const isOwnPost = session?.user?.id === authorId;
  const signedIn = status === "authenticated" && Boolean(session?.user?.id);

  async function toggle() {
    if (!signedIn || isOwnPost || pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/pulse/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const nextGiven = Boolean(data.given);
      setGiven(nextGiven);
      setCount(typeof data.count === "number" ? data.count : count);
      if (nextGiven) {
        setHeartbeat(true);
        window.setTimeout(() => setHeartbeat(false), 900);
      }
      void checkForNewPulseEvents();
    } finally {
      setPending(false);
    }
  }

  const countLabel = count === 1 ? "1 Pulse" : `${count} Pulses`;

  if (!signedIn) {
    return (
      <p className="mt-4 text-xs text-fix-text-muted">
        <a href={`/login?callbackUrl=/pulse`} className="font-medium text-fix-link hover:text-fix-link-hover">
          Sign in
        </a>{" "}
        to give a Pulse
      </p>
    );
  }

  if (isOwnPost) {
    return (
      <div className="mt-4 flex items-center gap-2 text-xs text-fix-text-muted">
        <PulseIcon size={16} alt="" />
        <span>
          {count === 0 ? "No Pulses yet" : count === 1 ? "Received 1 Pulse" : `Received ${count} Pulses`}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={pending}
      aria-pressed={given}
      className={cn(
        "mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2",
        given
          ? "border-terracotta/40 bg-amber/15 text-espresso"
          : "border-fix-border/20 bg-fix-surface text-fix-text-muted hover:border-terracotta/30 hover:bg-amber/10 hover:text-fix-heading",
        pending && "opacity-60",
      )}
    >
      <PulseIcon
        size={16}
        alt=""
        className={heartbeat ? "pulse-earned-heartbeat" : undefined}
      />
      <span>
        {given
          ? `Pulse given · ${countLabel}`
          : count === 0
            ? "Give a Pulse"
            : `Give a Pulse · ${countLabel}`}
      </span>
    </button>
  );
}
