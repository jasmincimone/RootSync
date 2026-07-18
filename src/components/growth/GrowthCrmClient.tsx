"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { GROWTH_CONTACT_STATUS_LABELS } from "@/lib/growth/roles";
import { Users } from "lucide-react";

export type GrowthCrmContactRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  leadSource: string | null;
  funnel: { id: string; name: string } | null;
  noteCount: number;
  updatedAt: string;
};

const STATUS_OPTIONS = Object.entries(GROWTH_CONTACT_STATUS_LABELS);

const inputClass =
  "mt-1 w-full rounded-lg border border-fix-border/25 bg-fix-surface px-3 py-2 text-sm text-fix-heading";

export function GrowthCrmClient({ initialContacts }: { initialContacts: GrowthCrmContactRow[] }) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("NEW_LEAD");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-fix-heading">Add contact</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-fix-text-muted">Name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-fix-text-muted">Email</label>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-fix-text-muted">Phone</label>
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-fix-text-muted">Status</label>
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button
          type="button"
          variant="cta"
          size="sm"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await fetch("/api/growth/contacts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, phone: phone || null, status }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                setError(data.error ?? "Could not create contact");
                return;
              }
              setName("");
              setEmail("");
              setPhone("");
              setStatus("NEW_LEAD");
              router.refresh();
              const c = data.contact;
              setContacts((prev) => [
                {
                  id: c.id,
                  name: c.name,
                  email: c.email,
                  phone: c.phone,
                  status: c.status,
                  leadSource: c.leadSource,
                  funnel: null,
                  noteCount: 0,
                  updatedAt: c.updatedAt,
                },
                ...prev,
              ]);
            });
          }}
        >
          Save contact
        </Button>
      </Card>

      {contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add your first CRM contact to start tracking relationships."
        />
      ) : (
        <ul className="space-y-3">
          {contacts.map((contact) => (
            <li key={contact.id}>
              <Card className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link
                    href={`/account/growth/crm/${contact.id}`}
                    className="font-semibold text-fix-heading hover:text-fix-link"
                  >
                    {contact.name}
                  </Link>
                  <p className="mt-0.5 text-sm text-fix-text-muted">{contact.email}</p>
                  <p className="mt-1 text-xs text-fix-text-muted">
                    {GROWTH_CONTACT_STATUS_LABELS[
                      contact.status as keyof typeof GROWTH_CONTACT_STATUS_LABELS
                    ] ?? contact.status}
                    {contact.funnel ? ` · ${contact.funnel.name}` : ""}
                    {contact.noteCount ? ` · ${contact.noteCount} notes` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await fetch(`/api/growth/contacts/${contact.id}`, {
                        method: "DELETE",
                      });
                      if (res.ok) {
                        setContacts((prev) => prev.filter((c) => c.id !== contact.id));
                        router.refresh();
                      }
                    });
                  }}
                >
                  Remove
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
