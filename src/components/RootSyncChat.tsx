"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, PanelLeft, PenSquare, Send, Trash2, X } from "lucide-react";
import { useSession } from "next-auth/react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { RootSenseJoinGate } from "@/components/RootSenseJoinGate";
import { cn } from "@/lib/cn";

type Msg = { role: "user" | "assistant"; content: string };

type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

function formatChatApiError(data: { error?: string; hint?: string }) {
  const err = typeof data.error === "string" ? data.error : "Request failed.";
  const hint = typeof data.hint === "string" && data.hint.trim() ? `\n\n${data.hint.trim()}` : "";
  return err + hint;
}

const SUGGESTIONS = [
  "What can I grow in my backyard this month based on where I live?",
  "Help me create a backyard that feeds my family.",
  "Find local farms, growers, and sustainability events near me."
];

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

export function RootSyncChat() {
  const { data: session, status: sessionStatus } = useSession();
  const sessionLoading = sessionStatus === "loading";
  const isAuthenticated = sessionStatus === "authenticated" && !!session?.user;
  const signedIn = isAuthenticated && !!session?.user?.id;
  const needsReauth = isAuthenticated && !session?.user?.id;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [joinGateOpen, setJoinGateOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const promptJoin = useCallback(() => {
    setJoinGateOpen(true);
  }, []);

  const sortedConversations = useMemo(() => {
    return [...conversations].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [conversations]);

  const refreshConversations = useCallback(async () => {
    if (!signedIn) return;
    setListError(null);
    try {
      const res = await fetch("/api/rootsync/conversations", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        conversations?: ConversationSummary[];
        error?: string;
      };
      if (!res.ok) {
        setListError(
          data.error ||
            (res.status === 401
              ? "Sign in again to load saved chats."
              : "Could not load your chats. Try refreshing the page.")
        );
        return;
      }
      setConversations(data.conversations ?? []);
    } catch {
      setListError("Network error loading chats. Check your connection and try again.");
    }
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) {
      setConversations([]);
      return;
    }
    setListLoading(true);
    void refreshConversations().finally(() => setListLoading(false));
  }, [signedIn, refreshConversations]);

  useEffect(() => {
    if (needsReauth) {
      setListError("Sign out and sign in again to load your saved chats.");
    }
  }, [needsReauth]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!historyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHistoryOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [historyOpen]);

  const loadConversation = useCallback(async (id: string) => {
    setError(null);
    setThreadLoading(true);
    try {
      const res = await fetch(`/api/rootsync/conversations/${id}`);
      const data = (await res.json().catch(() => ({}))) as {
        messages?: Msg[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Could not load conversation.");
        return;
      }
      setConversationId(id);
      setMessages(data.messages ?? []);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  const newChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
    setInput("");
  }, []);

  const startNewChat = useCallback(() => {
    newChat();
    setHistoryOpen(false);
  }, [newChat]);

  const selectConversation = useCallback(
    (id: string) => {
      void loadConversation(id);
      setHistoryOpen(false);
    },
    [loadConversation],
  );

  const deleteConversation = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm("Delete this conversation? This cannot be undone.")) return;
      const res = await fetch(`/api/rootsync/conversations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Could not delete conversation.");
        return;
      }
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        newChat();
      }
    },
    [conversationId, newChat]
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (!signedIn) {
      promptJoin();
      return;
    }

    setError(null);
    setSendSuccess(null);
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/rootsync/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId ?? undefined,
          message: text,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        conversationId?: string;
        error?: string;
        hint?: string;
      };
      if (!res.ok) {
        setError(formatChatApiError(data));
        setMessages((prev) => prev.slice(0, -1));
        setInput(text);
        return;
      }
      if (!data.message) {
        setError("Empty response from the assistant. Try again.");
        setMessages((prev) => prev.slice(0, -1));
        setInput(text);
        return;
      }
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
      setSendSuccess("Submitted.");
      window.setTimeout(() => setSendSuccess(null), 4000);
      setMessages((prev) => [...prev, { role: "assistant", content: data.message! }]);
      void refreshConversations();
    } catch {
      setError("Network error. Try again.");
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  }, [input, loading, signedIn, conversationId, refreshConversations, promptJoin]);

  const chatPanel = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-fix-surface">
      <div className="border-b border-fix-border/15 bg-fix-bg-muted/40 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-fix-heading">Chat with Rootie</h2>
        <p className="mt-0.5 text-xs text-fix-text-muted">
          Powered by RootSense AI. Ask about growing, local business, community, and sustainable
          living.
          {signedIn
            ? " Your chats are saved to your account."
            : " Join RootSync to start chatting with Rootie."}
        </p>
      </div>

      <div className="max-h-[min(520px,70vh)] min-h-[280px] flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        {threadLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-fix-text-muted">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading conversation…
          </div>
        ) : messages.length === 0 && !loading ? (
          <div className="space-y-4">
            <p className="text-sm text-fix-text-muted">
              Start with a question, or try one of these:
            </p>
            <ul className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!signedIn) {
                        promptJoin();
                        return;
                      }
                      setInput(s);
                    }}
                    className="w-full rounded-xl border border-fix-border/15 bg-fix-surface px-3 py-2.5 text-left text-sm text-fix-link hover:bg-fix-bg-muted"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map((m, i) => (
              <li
                key={`${i}-${m.role}-${m.content.slice(0, 12)}`}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[min(100%,28rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-forest/90 text-fix-primary-foreground"
                      : "bg-fix-bg-muted text-fix-text"
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </li>
            ))}
            {loading ? (
              <li className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-fix-bg-muted px-3.5 py-2.5 text-sm text-fix-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Thinking…
                </div>
              </li>
            ) : null}
            <div ref={bottomRef} />
          </ul>
        )}
      </div>

      {error ? (
        <div className="whitespace-pre-line border-t border-bark/20 bg-fix-bg-muted px-4 py-2 text-sm text-bark sm:px-5">
          {error}
        </div>
      ) : null}

      <form
        className="border-t border-fix-border/15 p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <FormFeedback className="mb-2" success={sendSuccess} />
        <div className="flex gap-2">
          <label htmlFor="rootsync-input" className="sr-only">
            Message to Rootie
          </label>
          <textarea
            id="rootsync-input"
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
            placeholder="What would you like to grow today?"
            disabled={loading || threadLoading}
            className="min-h-[44px] flex-1 resize-y rounded-xl border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-text placeholder:text-fix-text-muted/70 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber disabled:opacity-60"
          />
          <Button
            type="submit"
            variant="cta"
            size="md"
            disabled={loading || threadLoading || !input.trim()}
            className="shrink-0 self-end"
            aria-label="Send message"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </div>
        <p className="mt-2 text-xs text-fix-text-muted">
          AI can make mistakes. Verify important agronomic, legal, or financial decisions with a
          professional.
        </p>
      </form>
    </div>
  );

  const chatSidebarPanel = (
    <>
      <div className="p-2 pt-3">
        <button
          type="button"
          onClick={startNewChat}
          className="flex w-full items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2.5 text-left text-sm font-medium text-clay-muted transition-colors hover:bg-gold/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-warm-brown"
        >
          <PenSquare className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          New chat
        </button>
      </div>

      <div className="px-3 pb-1 pt-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-clay-muted/70">
          Your chats
        </h2>
      </div>

      <nav
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-4"
        aria-label="Saved conversations"
      >
        {listError ? (
          <p className="px-2 py-2 text-sm leading-relaxed text-amber/90">{listError}</p>
        ) : listLoading && sortedConversations.length === 0 ? (
          <p className="px-2 py-3 text-sm text-clay-muted/70">Loading…</p>
        ) : sortedConversations.length === 0 ? (
          <p className="px-2 py-2 text-sm leading-relaxed text-clay-muted/70">
            No chats yet. Start one above.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {sortedConversations.map((c) => {
              const active = conversationId === c.id;
              return (
                <li key={c.id}>
                  <div
                    className={cn(
                      "group relative flex items-center rounded-lg transition-colors",
                      active ? "bg-gold/15" : "hover:bg-gold/10",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => selectConversation(c.id)}
                      className="min-w-0 flex-1 px-3 py-2.5 pr-9 text-left"
                    >
                      <span className="block truncate text-sm text-clay-muted">{c.title}</span>
                      <span className="mt-0.5 block text-[11px] text-clay-muted/60">
                        {formatRelative(c.updatedAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => void deleteConversation(c.id, e)}
                      className={cn(
                        "absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-clay-muted/50",
                        "opacity-0 transition-opacity hover:bg-gold/15 hover:text-clay-muted group-hover:opacity-100",
                        active && "opacity-100",
                      )}
                      aria-label={`Delete ${c.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </>
  );

  const memberChrome = (
    <div
      className={cn(
        "relative mt-10 flex min-h-[min(680px,calc(100dvh-11rem))] flex-row overflow-hidden rounded-2xl border border-fix-border/20 shadow-soft",
      )}
    >
      <div className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-gold/15 bg-warm-brown py-2 lg:hidden">
        <button
          type="button"
          onClick={startNewChat}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-clay-muted transition-colors hover:bg-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          aria-label="New chat"
        >
          <PenSquare className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-clay-muted transition-colors hover:bg-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          aria-label="Open chat history"
        >
          <PanelLeft className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-gold/15 bg-warm-brown lg:flex">
        {chatSidebarPanel}
      </aside>

      {historyOpen ? (
        <>
          <button
            type="button"
            aria-label="Close chat history"
            className="absolute inset-0 z-30 bg-fix-text/35 lg:hidden"
            onClick={() => setHistoryOpen(false)}
          />
          <aside className="absolute inset-y-0 left-11 z-40 flex w-[min(280px,calc(100%-2.75rem))] flex-col border-r border-gold/15 bg-warm-brown shadow-lg lg:hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-gold/15 px-3 py-2.5">
              <span className="text-sm font-semibold text-clay-muted">Chats</span>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-clay-muted transition-colors hover:bg-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                aria-label="Close chat history"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{chatSidebarPanel}</div>
          </aside>
        </>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">{chatPanel}</div>
    </div>
  );

  return (
    <>
      {sessionLoading ? (
        <div className="mt-10 flex min-h-[280px] items-center justify-center rounded-2xl border border-fix-border/20 bg-fix-surface">
          <Loader2 className="h-6 w-6 animate-spin text-fix-text-muted" aria-hidden />
          <span className="sr-only">Loading chat…</span>
        </div>
      ) : isAuthenticated ? (
        memberChrome
      ) : (
        <div className="mt-10">
          <Card className="flex flex-col overflow-hidden border-fix-border/20">{chatPanel}</Card>
        </div>
      )}
      <RootSenseJoinGate open={joinGateOpen} onClose={() => setJoinGateOpen(false)} />
    </>
  );
}
