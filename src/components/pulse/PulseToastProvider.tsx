"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { PulseEarnedToast } from "@/components/pulse/PulseEarnedToast";
import type { PulseEarnedPayload } from "@/lib/pulse/toastMessages";

const SEEN_STORAGE_KEY = "rootsync-pulse-toast-seen";
const MAX_SEEN_IDS = 120;

type ToastItem = PulseEarnedPayload & { key: string };

type PulseToastContextValue = {
  showPulseEarned: (payload: PulseEarnedPayload) => void;
  checkForNewPulseEvents: () => Promise<void>;
};

const PulseToastContext = createContext<PulseToastContextValue | null>(null);

function loadSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as string[];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

function persistSeenIds(ids: Set<string>) {
  try {
    const list = [...ids].slice(-MAX_SEEN_IDS);
    sessionStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function PulseToastProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const lastCheckRef = useRef<number>(Date.now() - 5_000);
  const pollingRef = useRef(false);

  useEffect(() => {
    seenIdsRef.current = loadSeenIds();
  }, []);

  const enqueue = useCallback((payload: PulseEarnedPayload) => {
    if (seenIdsRef.current.has(payload.id)) return;
    seenIdsRef.current.add(payload.id);
    persistSeenIds(seenIdsRef.current);

    setToasts((prev) => {
      if (prev.some((t) => t.id === payload.id)) return prev;
      const next = [...prev, { ...payload, key: payload.id }];
      return next.slice(-3);
    });
  }, []);

  const showPulseEarned = useCallback(
    (payload: PulseEarnedPayload) => {
      enqueue(payload);
    },
    [enqueue],
  );

  const checkForNewPulseEvents = useCallback(async () => {
    if (!session?.user?.id || pollingRef.current) return;
    pollingRef.current = true;
    try {
      const since = new Date(lastCheckRef.current - 1_000).toISOString();
      const exclude = [...seenIdsRef.current].join(",");
      const res = await fetch(
        `/api/pulse/earned?since=${encodeURIComponent(since)}&exclude=${encodeURIComponent(exclude)}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { events: PulseEarnedPayload[] };
      lastCheckRef.current = Date.now();
      for (const event of data.events ?? []) {
        enqueue(event);
      }
    } finally {
      pollingRef.current = false;
    }
  }, [session?.user?.id, enqueue]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    void checkForNewPulseEvents();
  }, [pathname, status, session?.user?.id, checkForNewPulseEvents]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    function onFocus() {
      void checkForNewPulseEvents();
    }

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [status, session?.user?.id, checkForNewPulseEvents]);

  const dismiss = useCallback((key: string) => {
    setToasts((prev) => prev.filter((t) => t.key !== key));
  }, []);

  const value = useMemo(
    () => ({ showPulseEarned, checkForNewPulseEvents }),
    [showPulseEarned, checkForNewPulseEvents],
  );

  return (
    <PulseToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
          aria-label="Pulse notifications"
        >
          {toasts.map((toast) => (
            <PulseEarnedToast
              key={toast.key}
              id={toast.id}
              pulseValue={toast.pulseValue}
              eventType={toast.eventType}
              message={toast.message}
              onDismiss={() => dismiss(toast.key)}
            />
          ))}
        </div>
      ) : null}
    </PulseToastContext.Provider>
  );
}

export function usePulseToast(): PulseToastContextValue {
  const ctx = useContext(PulseToastContext);
  if (!ctx) {
    return {
      showPulseEarned: () => {},
      checkForNewPulseEvents: async () => {},
    };
  }
  return ctx;
}
