"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/cn";

type ThreadSummary = {
  id: string;
  peerDisplayName: string;
  peerSubtitle: string;
  peerAvatarUrl: string | null;
  peerProfileHref: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  lastMessageSenderId: string | null;
  lastMessageSenderAvatarUrl: string | null;
  lastMessageSenderIsViewer: boolean;
  unread?: boolean;
};

type ThreadDetail = {
  id: string;
  participantLowId: string;
  participantHighId: string;
  peerDisplayName: string;
  peerSubtitle: string;
  peerAvatarUrl: string | null;
  peerProfileHref: string;
  viewerIsParticipantLow: boolean;
};

type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  senderDisplayName: string;
  senderAvatarUrl: string | null;
};

function useNarrowLayout() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return narrow;
}

function formatRelative(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

type VendorMessengerProps = {
  /** `?with=<vendorProfileId>` marketplace vendor */
  vendorProfileIdFromUrl?: string | null;
  /** `?withUser=<userId>` any user (e.g. from community) */
  userIdFromUrl?: string | null;
};

/** Avoid stale thread lists when the other party sends while this tab is open */
const msgFetchInit: RequestInit = { cache: "no-store" };

export function VendorMessenger({
  vendorProfileIdFromUrl = null,
  userIdFromUrl = null,
}: VendorMessengerProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const signedIn = sessionStatus === "authenticated" && !!session?.user?.id;
  const uid = session?.user?.id;

  const narrow = useNarrowLayout();
  const [listOpen, setListOpen] = useState(true);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadMeta, setThreadMeta] = useState<ThreadDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const handledConversationKey = useRef<string | null>(null);

  const refreshThreads = useCallback(async () => {
    if (!signedIn) return;
    const res = await fetch("/api/messages/threads", msgFetchInit);
    const data = (await res.json().catch(() => ({}))) as {
      threads?: ThreadSummary[];
      error?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "Could not load conversations.");
      return;
    }
    setError(null);
    setThreads(data.threads ?? []);
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    setListLoading(true);
    void refreshThreads().finally(() => setListLoading(false));
  }, [signedIn, refreshThreads]);

  const loadThread = useCallback(async (id: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setError(null);
      setThreadLoading(true);
    }
    try {
      const res = await fetch(`/api/messages/threads/${id}`, msgFetchInit);
      const data = (await res.json().catch(() => ({}))) as {
        thread?: ThreadDetail;
        messages?: ChatMessage[];
        error?: string;
      };
      if (!res.ok) {
        if (!opts?.silent) {
          setError(data.error || "Could not load conversation.");
        }
        return;
      }
      setThreadId(id);
      setThreadMeta(data.thread ?? null);
      setMessages(data.messages ?? []);
    } finally {
      if (!opts?.silent) {
        setThreadLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendLoading]);

  const conversationKey =
    vendorProfileIdFromUrl != null
      ? `vendor:${vendorProfileIdFromUrl}`
      : userIdFromUrl != null
        ? `user:${userIdFromUrl}`
        : null;

  useEffect(() => {
    if (!conversationKey) {
      handledConversationKey.current = null;
    }
  }, [conversationKey]);

  useEffect(() => {
    if (!signedIn || !conversationKey) return;
    if (handledConversationKey.current === conversationKey) return;
    handledConversationKey.current = conversationKey;

    (async () => {
      setError(null);
      const body =
        vendorProfileIdFromUrl != null
          ? JSON.stringify({ vendorProfileId: vendorProfileIdFromUrl })
          : JSON.stringify({ userId: userIdFromUrl });
      const res = await fetch("/api/messages/threads", {
        ...msgFetchInit,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = (await res.json().catch(() => ({}))) as {
        thread?: { id: string };
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Could not start conversation.");
        handledConversationKey.current = null;
        return;
      }
      if (data.thread?.id) {
        await refreshThreads();
        setListOpen(false);
        await loadThread(data.thread.id);
        router.replace("/messages/inbox", { scroll: false });
      }
    })();
  }, [
    signedIn,
    conversationKey,
    vendorProfileIdFromUrl,
    userIdFromUrl,
    loadThread,
    refreshThreads,
    router,
  ]);

  useEffect(() => {
    if (!signedIn) return;
    const tick = () => {
      void refreshThreads();
      if (threadId) void loadThread(threadId, { silent: true });
    };
    const id = window.setInterval(tick, 8000);
    return () => window.clearInterval(id);
  }, [signedIn, threadId, refreshThreads, loadThread]);

  useEffect(() => {
    if (!signedIn) return;
    const tick = () => {
      void refreshThreads();
      if (threadId) void loadThread(threadId, { silent: true });
    };
    const onFocus = () => tick();
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [signedIn, threadId, refreshThreads, loadThread]);

  const selectThread = useCallback(
    (id: string) => {
      setListOpen(false);
      void loadThread(id);
    },
    [loadThread]
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sendLoading || !threadId) return;
    setError(null);
    setInput("");
    setSendLoading(true);
    try {
      const res = await fetch(`/api/messages/threads/${threadId}`, {
        ...msgFetchInit,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: ChatMessage;
        error?: string;
      };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not send.");
        setInput(text);
        return;
      }
      setSendSuccess("Sent.");
      window.setTimeout(() => setSendSuccess(null), 4000);
      void refreshThreads();
      await loadThread(threadId);
    } finally {
      setSendLoading(false);
    }
  }, [input, sendLoading, threadId, loadThread, refreshThreads]);

  const sortedThreads = useMemo(() => {
    return [...threads].sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }, [threads]);

  const hasAnyUnread = useMemo(
    () => sortedThreads.some((t) => t.unread),
    [sortedThreads]
  );

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-[min(520px,70vh)] items-center justify-center gap-2 text-sm text-fix-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Loading…
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-fix-border/20 bg-fix-surface p-8 text-center shadow-soft">
        <MessageCircle className="mx-auto h-10 w-10 text-fix-accent" aria-hidden />
        <h2 className="mt-4 text-lg font-semibold text-fix-heading">Sign in to Messages</h2>
        <p className="mt-2 text-sm text-fix-text-muted">
          Chat with vendors, community members, and others you connect with on RootSync.
        </p>
        <ButtonLink href="/login?callbackUrl=%2Fmessages%2Finbox" variant="cta" size="md" className="mt-6">
          Sign in
        </ButtonLink>
      </div>
    );
  }

  const showSidebar = !narrow || listOpen;
  const showChatPanel = !narrow || !listOpen;

  const chatHeader = threadMeta ? (
    <div className="flex items-center gap-3 border-b border-fix-border/15 bg-fix-bg-muted/40 px-3 py-3 sm:px-4">
      {narrow ? (
        <button
          type="button"
          onClick={() => {
            setListOpen(true);
            setThreadId(null);
            setThreadMeta(null);
            setMessages([]);
          }}
          className="rounded-lg p-2 text-fix-heading hover:bg-fix-surface lg:hidden"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : null}
      <Link
        href={threadMeta.peerProfileHref}
        className="shrink-0 rounded-full outline-none ring-fix-cta focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <UserAvatar
          src={threadMeta.peerAvatarUrl}
          name={threadMeta.peerDisplayName}
          size="sm"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={threadMeta.peerProfileHref}
          className="truncate text-sm font-semibold text-fix-heading hover:text-fix-link hover:underline"
        >
          {threadMeta.peerDisplayName}
        </Link>
        <p className="text-xs text-fix-text-muted">{threadMeta.peerSubtitle}</p>
      </div>
    </div>
  ) : (
    <div className="flex items-center border-b border-fix-border/15 bg-fix-bg-muted/40 px-4 py-4">
      <p className="text-sm text-fix-text-muted">Select a conversation</p>
    </div>
  );

  return (
    <div
      className={cn(
        "flex min-h-[min(680px,calc(100dvh-12rem))] flex-col overflow-hidden rounded-2xl border border-fix-border/20 shadow-soft",
        "lg:flex-row"
      )}
    >
      <aside
        className={cn(
          "flex min-h-[min(360px,45vh)] w-full flex-col border-b border-fix-border/15 bg-espresso text-clay lg:min-h-0 lg:w-[300px] lg:shrink-0 lg:border-b-0 lg:border-r",
          !showSidebar && "hidden lg:flex"
        )}
      >
        <div className="border-b border-clay/10 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-clay">
            <span>Messages</span>
            {hasAnyUnread ? (
              <span
                className="inline-flex h-2 w-2 rounded-full bg-gold"
                aria-hidden
                title="You have unread conversations"
              />
            ) : null}
          </h2>
          <p className="mt-0.5 text-xs text-clay/55">Chats with The RootSync Community</p>
        </div>
        <nav
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-4"
          aria-label="Conversations"
        >
          {listLoading && sortedThreads.length === 0 ? (
            <p className="px-2 py-3 text-sm text-clay/55">Loading…</p>
          ) : sortedThreads.length === 0 ? (
            <p className="px-2 py-3 text-sm leading-relaxed text-clay/55">
              Browse the{" "}
              <Link href="/discover" className="underline underline-offset-2 hover:text-clay">
                Discover
              </Link>{" "}
              or{" "}
              <Link href="/community" className="underline underline-offset-2 hover:text-clay">
                community
              </Link>{" "}
              to start a chat.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {sortedThreads.map((t) => {
                const active = threadId === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => selectThread(t.id)}
                      className={cn(
                        "flex w-full gap-3 rounded-lg px-2 py-2.5 text-left transition-colors",
                        active ? "bg-clay/15" : "hover:bg-clay/10"
                      )}
                    >
                      <UserAvatar
                        src={t.lastMessageSenderAvatarUrl ?? t.peerAvatarUrl}
                        name={
                          t.lastMessageSenderIsViewer
                            ? "You"
                            : t.peerDisplayName
                        }
                        size="sm"
                        className="mt-0.5 shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-clay">
                            {t.peerDisplayName}
                          </span>
                          {t.unread ? (
                            <span
                              className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-gold shadow-[0_0_0_2px_rgba(181,137,95,0.35)]"
                              aria-label="Unread messages"
                              title="Unread"
                            />
                          ) : null}
                        </span>
                        {t.lastMessagePreview ? (
                          <span className="mt-0.5 line-clamp-2 block text-xs text-clay/50">
                            {t.lastMessageSenderIsViewer ? "You: " : ""}
                            {t.lastMessagePreview}
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-xs italic text-clay/40">
                            No messages yet
                          </span>
                        )}
                        <span className="mt-1 block text-[11px] text-clay/40">
                          {formatRelative(t.lastMessageAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </aside>

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col bg-fix-surface",
          !showChatPanel && "hidden lg:flex"
        )}
      >
        {chatHeader}

        <div className="max-h-[min(520px,55vh)] min-h-[240px] flex-1 overflow-y-auto px-3 py-4 sm:px-5 lg:max-h-none">
          {error ? (
            <div className="mb-3 rounded-xl border border-bark/20 bg-fix-bg-muted px-3 py-2 text-sm text-bark">
              {error}
            </div>
          ) : null}

          {threadLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-fix-text-muted">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Loading conversation…
            </div>
          ) : !threadId ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageCircle className="h-12 w-12 text-fix-border/40" aria-hidden />
              <p className="mt-4 max-w-sm text-sm text-fix-text-muted">
                Choose a conversation on the left, or start one from the{" "}
                <Link href="/discover" className="font-medium text-fix-link hover:text-fix-link-hover">
                  Discover
                </Link>{" "}
                or{" "}
                <Link href="/community" className="font-medium text-fix-link hover:text-fix-link-hover">
                  community
                </Link>
                .
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {messages.map((m) => {
                const mine = m.senderId === uid;
                const label = mine ? "You" : m.senderDisplayName;
                return (
                  <li
                    key={m.id}
                    className={cn("flex gap-2", mine ? "flex-row-reverse" : "flex-row")}
                  >
                    <UserAvatar
                      src={m.senderAvatarUrl}
                      name={label}
                      size="sm"
                      className="mt-1 shrink-0"
                    />
                    <div
                      className={cn(
                        "flex max-w-[min(100%,20rem)] flex-col",
                        mine ? "items-end" : "items-start",
                      )}
                    >
                      <span className="mb-1 px-1 text-[11px] font-medium text-fix-text-muted">
                        {label}
                      </span>
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                          mine
                            ? "bg-forest/90 text-fix-primary-foreground"
                            : "bg-fix-bg-muted text-fix-text",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p
                          className={cn(
                            "mt-1 text-[10px]",
                            mine ? "text-fix-primary-foreground/70" : "text-fix-text-muted",
                          )}
                        >
                          {new Date(m.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
              {sendLoading ? (
                <li className="flex justify-end">
                  <div className="flex items-center gap-2 rounded-2xl bg-forest/50 px-3.5 py-2 text-xs text-fix-primary-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Sending…
                  </div>
                </li>
              ) : null}
              <div ref={bottomRef} />
            </ul>
          )}
        </div>

        {threadId ? (
          <form
            className="border-t border-fix-border/15 p-3 sm:p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <FormFeedback className="mb-2 px-0" success={sendSuccess} />
            <div className="flex gap-2">
              <label htmlFor="dm-input" className="sr-only">
                Message
              </label>
              <textarea
                id="dm-input"
                rows={2}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setSendSuccess(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Write a message…"
                disabled={sendLoading || threadLoading}
                className="min-h-[44px] flex-1 resize-y rounded-xl border border-fix-border/20 bg-fix-bg-muted/60 px-3 py-2 text-sm text-fix-text placeholder:text-fix-text-muted/70 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber disabled:opacity-60"
              />
              <Button
                type="submit"
                variant="cta"
                size="md"
                disabled={sendLoading || threadLoading || !input.trim()}
                className="shrink-0 self-end"
                aria-label="Send message"
              >
                {sendLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
