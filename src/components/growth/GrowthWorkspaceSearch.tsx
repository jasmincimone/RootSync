"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";

type SearchHit = {
  kind: "contact" | "campaign" | "funnel";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

function kindLabel(kind: SearchHit["kind"]) {
  if (kind === "contact") return "Contact";
  if (kind === "campaign") return "Campaign";
  return "Funnel";
}

export function GrowthWorkspaceSearch() {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/growth/search?q=${encodeURIComponent(q)}`, {
            signal: controller.signal,
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(typeof data.error === "string" ? data.error : "Search failed");
            setResults([]);
            return;
          }
          const rows = Array.isArray(data.results) ? (data.results as SearchHit[]) : [];
          setResults(rows);
          setError(null);
          setOpen(true);
        } catch (e) {
          if ((e as Error)?.name === "AbortError") return;
          setError("Search failed");
          setResults([]);
        }
      });
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div ref={rootRef} className="relative min-w-[12rem] flex-1">
      <label className="relative block">
        <span className="sr-only">Search growth workspace</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fix-text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          placeholder="Search contacts, campaigns, funnels…"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          className="w-full rounded-full border border-fix-border/15 bg-fix-bg-muted/40 py-2 pl-9 pr-4 text-sm text-fix-heading placeholder:text-fix-text-muted"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim() || results.length > 0) setOpen(true);
          }}
        />
      </label>

      {open && query.trim().length > 0 ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-2xl border border-fix-border/15 bg-fix-surface p-2 shadow-soft"
        >
          {pending && results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-fix-text-muted">Searching…</p>
          ) : null}
          {error ? <p className="px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {!pending && !error && results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-fix-text-muted">No matches.</p>
          ) : null}
          <ul className="space-y-1">
            {results.map((hit) => (
              <li key={`${hit.kind}-${hit.id}`}>
                <Link
                  href={hit.href}
                  role="option"
                  className="block rounded-xl px-3 py-2 hover:bg-fix-bg-muted/60"
                  onClick={() => setOpen(false)}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-fix-text-muted">
                    {kindLabel(hit.kind)}
                  </span>
                  <span className="mt-0.5 block text-sm font-medium text-fix-heading">{hit.title}</span>
                  {hit.subtitle ? (
                    <span className="block truncate text-xs text-fix-text-muted">{hit.subtitle}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
