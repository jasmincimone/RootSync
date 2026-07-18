"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GROWTH_CONTACT_STATUS_LABELS } from "@/lib/growth/roles";

const inputClass =
  "mt-1 w-full rounded-lg border border-fix-border/25 bg-fix-surface px-3 py-2 text-sm text-fix-heading";

type Note = {
  id: string;
  body: string;
  createdAt: string;
  author: { name: string | null; email: string };
};

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  leadSource: string | null;
  notes: Note[];
};

export function GrowthContactDetailClient({ contact }: { contact: Contact }) {
  const router = useRouter();
  const [status, setStatus] = useState(contact.status);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState(contact.notes);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-fix-heading">{contact.name}</h2>
        <p className="text-sm text-fix-text-muted">{contact.email}</p>
        {contact.phone ? <p className="text-sm text-fix-text-muted">{contact.phone}</p> : null}
        <div>
          <label className="text-xs font-medium text-fix-text-muted">Status</label>
          <select
            className={inputClass}
            value={status}
            onChange={(e) => {
              const next = e.target.value;
              setStatus(next);
              startTransition(async () => {
                await fetch(`/api/growth/contacts/${contact.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: next }),
                });
                router.refresh();
              });
            }}
          >
            {Object.entries(GROWTH_CONTACT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="space-y-3 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-fix-heading">Add note</h3>
        <textarea
          className={inputClass + " min-h-[88px]"}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Follow-up, interest, next step…"
        />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending || !note.trim()}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await fetch(`/api/growth/contacts/${contact.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ note }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                setError(data.error ?? "Could not save note");
                return;
              }
              setNotes((prev) => [data.note, ...prev]);
              setNote("");
              router.refresh();
            });
          }}
        >
          Save note
        </Button>
        <ul className="space-y-3 border-t border-fix-border/15 pt-3">
          {notes.length === 0 ? (
            <li className="text-sm text-fix-text-muted">No notes yet.</li>
          ) : (
            notes.map((n) => (
              <li key={n.id} className="text-sm">
                <p className="text-fix-text">{n.body}</p>
                <p className="mt-1 text-xs text-fix-text-muted">
                  {n.author.name || n.author.email} ·{" "}
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}
