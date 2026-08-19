"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FunnelPagePreview } from "@/components/growth/FunnelPagePreview";
import { PulsePostMediaEditor } from "@/components/pulse/PulsePostMediaEditor";
import { PulseRichTextEditor } from "@/components/pulse/PulseRichTextEditor";
import {
  FUNNEL_PAGE_COLORS,
  FUNNEL_PAGE_FONTS,
  FUNNEL_SECTION_SHAPES,
  MAX_FUNNEL_PAGE_MEDIA,
  PAGE_MEDIA_ID,
  absorbSectionMedia,
  addFunnelMedia,
  canMoveFunnelMedia,
  countFunnelMedia,
  createDefaultFunnelPage,
  createFunnelSection,
  listFunnelMedia,
  moveFunnelMedia,
  removeFunnelMedia,
  type FunnelMediaBucketId,
  type FunnelPageContent,
  type FunnelSectionKind,
  type FunnelSectionShape,
} from "@/lib/growth/funnelPage";
import { PulsePostMediaPreviewRow } from "@/components/pulse/PulsePostMediaGallery";
import {
  suggestGrowthPublicSlug,
  vendorFunnelPublicPath,
} from "@/lib/growth/publicPath";

const inputClass =
  "mt-1 w-full rounded-lg border border-fix-border/25 bg-fix-surface px-3 py-2 text-sm text-fix-heading";

export type FunnelMakerDraft = {
  id?: string;
  name: string;
  objective: string;
  description: string;
  ctaLabel: string;
  publicSlug: string;
  page: FunnelPageContent;
};

type SavedFunnel = {
  id: string;
  name: string;
  description: string | null;
  objective: string | null;
  ctaLabel: string | null;
  isActive: boolean;
  assignDiscoverCheckout?: boolean;
  contactCount?: number;
  steps?: Array<{ id: string; label: string; stepType: string; sortOrder?: number }>;
  landingPage?: { slug?: string | null; contentJson: unknown } | null;
};

export function GrowthFunnelMaker({
  draft,
  vendorPublicSlug,
  onCancel,
  onSaved,
}: {
  draft: FunnelMakerDraft;
  vendorPublicSlug: string | null;
  onCancel: () => void;
  onSaved: (funnel: SavedFunnel, page: FunnelPageContent) => void;
}) {
  const [name, setName] = useState(draft.name);
  const [objective, setObjective] = useState(draft.objective);
  const [description, setDescription] = useState(draft.description);
  const [ctaLabel, setCtaLabel] = useState(draft.ctaLabel);
  const [publicSlug, setPublicSlug] = useState(
    draft.publicSlug || suggestGrowthPublicSlug(draft.name),
  );
  const [slugTouched, setSlugTouched] = useState(Boolean(draft.publicSlug));
  const [page, setPage] = useState<FunnelPageContent>(draft.page);
  const [mediaBucket, setMediaBucket] = useState<FunnelMediaBucketId>(PAGE_MEDIA_ID);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const mediaRows = listFunnelMedia(page);
  const funnelPathPrefix = vendorPublicSlug
    ? `rootsync.io/${vendorPublicSlug}/funnels/`
    : "rootsync.io/{profile-url}/funnels/";

  function updateSection(id: string, patch: Partial<(typeof page.sections)[number]>) {
    setPage((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => (section.id === id ? { ...section, ...patch } : section)),
    }));
  }

  function moveSection(id: string, direction: -1 | 1) {
    setPage((prev) => {
      const index = prev.sections.findIndex((section) => section.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.sections.length) return prev;
      const sections = [...prev.sections];
      const [item] = sections.splice(index, 1);
      sections.splice(nextIndex, 0, item);
      return { ...prev, sections };
    });
  }

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-fix-heading">
            {draft.id ? "Edit funnel" : "Create funnel"}
          </h2>
          <p className="mt-1 text-sm text-fix-text-muted">
            Same writing tools as a Pulse post, plus a dedicated Pictures & video block for the
            landing page. Preview updates as you go.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Close
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-fix-text-muted">Funnel name (workspace)</label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => {
                const next = e.target.value;
                setName(next);
                if (!slugTouched) setPublicSlug(suggestGrowthPublicSlug(next));
              }}
            />
            <p className="mt-1 text-xs text-fix-text-muted">
              Shown on this Funnels page and in CRM. Visitors do not see this unless you type it into
              Hero below.
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-fix-text-muted">Objective (workspace)</label>
            <input
              className={inputClass}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Book consultations, sell kits…"
            />
            <p className="mt-1 text-xs text-fix-text-muted">
              Reminder for you. Edit the Hero section for the public headline.
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-fix-text-muted">Internal notes</label>
            <textarea
              className={inputClass + " min-h-[64px]"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="rounded-xl border border-fix-border/15 bg-fix-bg-muted/40 p-4">
            <label htmlFor="funnelPublicSlug" className="block text-sm font-medium text-fix-heading">
              Funnel URL
            </label>
            <p className="mt-1 text-xs text-fix-text-muted">
              Public page people can open. Same idea as a listing URL. Campaigns will use{" "}
              {vendorPublicSlug ? `rootsync.io/${vendorPublicSlug}/campaigns/` : "rootsync.io/{profile-url}/campaigns/"}
              when that module is ready.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="shrink-0 text-sm text-fix-text-muted">{funnelPathPrefix}</span>
              <input
                id="funnelPublicSlug"
                value={publicSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setPublicSlug(e.target.value);
                }}
                placeholder="garden-consultation"
                autoComplete="off"
                spellCheck={false}
                className={inputClass + " !mt-0"}
              />
            </div>
            {!vendorPublicSlug ? (
              <p className="mt-2 text-xs text-fix-text-muted">
                Claim a Profile URL in{" "}
                <a href="/account/vendor/profile" className="text-fix-link underline">
                  Vendor profile
                </a>{" "}
                so this link can go live.
              </p>
            ) : publicSlug.trim() ? (
              <p className="mt-2 text-xs text-fix-text-muted">
                Live at{" "}
                <a
                  href={vendorFunnelPublicPath(vendorPublicSlug, publicSlug.trim())}
                  className="font-medium text-fix-heading underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {funnelPathPrefix}
                  {publicSlug.trim()}
                </a>
              </p>
            ) : (
              <p className="mt-2 text-xs text-fix-text-muted">
                Lowercase letters, numbers, and hyphens. Example: garden-consultation
              </p>
            )}
          </div>

          <Card className="space-y-3 p-3">
            <PulsePostMediaEditor
              items={
                mediaBucket === PAGE_MEDIA_ID
                  ? page.media ?? []
                  : page.sections.find((section) => section.id === mediaBucket)?.media ?? []
              }
              onChange={(items) => {
                setPage((prev) => {
                  const existingIds = new Set(listFunnelMedia(prev).map((row) => row.item.id));
                  let next = prev;
                  for (const item of items) {
                    if (existingIds.has(item.id)) continue;
                    next = addFunnelMedia(next, item, mediaBucket);
                    existingIds.add(item.id);
                  }
                  return next;
                });
              }}
              disabled={pending}
              heading="Pictures & video"
              description="Add several photos or videos, then move each one up or down to place it between sections. Images up to 5 MB, videos up to 50 MB."
              maxItems={MAX_FUNNEL_PAGE_MEDIA}
              itemCount={countFunnelMedia(page)}
              hideItems
            />
            <label className="block text-xs text-fix-text-muted">
              Add new files to
              <select
                className={inputClass}
                value={mediaBucket}
                onChange={(e) => setMediaBucket(e.target.value)}
              >
                <option value={PAGE_MEDIA_ID}>Top of page</option>
                {page.sections.map((section, index) => (
                  <option key={section.id} value={section.id}>
                    {section.kind === "cta"
                      ? `Button ${index + 1}`
                      : section.kind === "band"
                        ? `Shape ${index + 1}`
                        : `${section.kind} ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
            {mediaRows.length === 0 ? (
              <p className="text-sm text-fix-text-muted">No pictures or video yet.</p>
            ) : (
              <ul className="space-y-2">
                {mediaRows.map((row) => {
                  const canUp = canMoveFunnelMedia(page, row.bucketId, row.index, -1);
                  const canDown = canMoveFunnelMedia(page, row.bucketId, row.index, 1);
                  return (
                  <li key={row.item.id}>
                    <PulsePostMediaPreviewRow
                      item={row.item}
                      onRemove={() =>
                        setPage((prev) => removeFunnelMedia(prev, row.bucketId, row.index))
                      }
                      extra={
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={pending || !canUp}
                            onClick={() =>
                              setPage((prev) => moveFunnelMedia(prev, row.bucketId, row.index, -1))
                            }
                          >
                            Up
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={pending || !canDown}
                            onClick={() =>
                              setPage((prev) => moveFunnelMedia(prev, row.bucketId, row.index, 1))
                            }
                          >
                            Down
                          </Button>
                        </>
                      }
                    />
                    <p className="mt-1 px-2 text-xs text-fix-text-muted">{row.locationLabel}</p>
                  </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <div>
            <label className="text-xs font-medium text-fix-text-muted">Button label</label>
            <input
              className={inputClass}
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="Book a consult"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-fix-text-muted">Button link</label>
            <input
              className={inputClass}
              value={page.ctaHref}
              onChange={(e) => setPage((prev) => ({ ...prev, ctaHref: e.target.value }))}
              placeholder="https://…"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-fix-text-muted">Page look</legend>
            <ColorRow
              label="Background"
              value={page.theme.background}
              onChange={(background) =>
                setPage((prev) => ({ ...prev, theme: { ...prev.theme, background } }))
              }
            />
            <ColorRow
              label="Text"
              value={page.theme.textColor}
              onChange={(textColor) =>
                setPage((prev) => ({ ...prev, theme: { ...prev.theme, textColor } }))
              }
            />
            <ColorRow
              label="Button"
              value={page.theme.accent}
              onChange={(accent) => setPage((prev) => ({ ...prev, theme: { ...prev.theme, accent } }))}
            />
            <label className="block text-xs text-fix-text-muted">
              Font
              <select
                className={inputClass}
                value={page.theme.fontFamily}
                onChange={(e) =>
                  setPage((prev) => ({ ...prev, theme: { ...prev.theme, fontFamily: e.target.value } }))
                }
              >
                {FUNNEL_PAGE_FONTS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-fix-heading">Public page</h3>
                <p className="text-xs text-fix-text-muted">
                  Hero and the sections below are what visitors see at your funnel URL.
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {(["hero", "body", "band", "cta"] as FunnelSectionKind[]).map((kind) => (
                  <Button
                    key={kind}
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      setPage((prev) => ({
                        ...prev,
                        sections: [...prev.sections, createFunnelSection(kind)],
                      }))
                    }
                  >
                    Add {kind === "cta" ? "button" : kind === "band" ? "shape" : kind}
                  </Button>
                ))}
              </div>
            </div>

            {page.sections.map((section, index) => (
              <Card key={section.id} className="space-y-3 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
                    {section.kind === "cta"
                      ? "Button block"
                      : section.kind === "band"
                        ? "Shape / band"
                        : section.kind}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending || index === 0}
                      onClick={() => moveSection(section.id, -1)}
                    >
                      Up
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending || index === page.sections.length - 1}
                      onClick={() => moveSection(section.id, 1)}
                    >
                      Down
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending || page.sections.length === 1}
                      onClick={() => {
                        if (mediaBucket === section.id) setMediaBucket(PAGE_MEDIA_ID);
                        setPage((prev) => absorbSectionMedia(prev, section.id));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                {section.kind !== "cta" ? (
                  <PulseRichTextEditor
                    value={section.html}
                    onChange={(html) => updateSection(section.id, { html })}
                    disabled={pending}
                    placeholder={
                      section.kind === "hero"
                        ? "Headline, intro, photos…"
                        : "Write this section — add photos, video, files, and links…"
                    }
                    minHeightClass={section.kind === "hero" ? "min-h-[8rem]" : "min-h-[11rem]"}
                  />
                ) : (
                  <p className="text-sm text-fix-text-muted">
                    The live preview shows your button label and link. Add more button blocks if you
                    want a second call to action.
                  </p>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-fix-text-muted">
                    Section color
                    <input
                      type="color"
                      className="mt-1 h-10 w-full rounded-lg border border-fix-border/25 bg-fix-surface"
                      value={section.background ?? page.theme.background}
                      onChange={(e) => updateSection(section.id, { background: e.target.value })}
                    />
                  </label>
                  <label className="text-xs text-fix-text-muted">
                    Shape
                    <select
                      className={inputClass}
                      value={section.shape ?? "none"}
                      onChange={(e) =>
                        updateSection(section.id, { shape: e.target.value as FunnelSectionShape })
                      }
                    >
                      {FUNNEL_SECTION_SHAPES.map((shape) => (
                        <option key={shape} value={shape}>
                          {shape === "none" ? "Full width" : shape === "split" ? "Split block" : shape}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </Card>
            ))}
          </div>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <Button
            type="button"
            variant="cta"
            size="sm"
            disabled={pending || !name.trim()}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const payload = {
                  name,
                  objective,
                  description,
                  ctaLabel: ctaLabel.trim() || null,
                  publicSlug,
                  page,
                };
                const res = draft.id
                  ? await fetch(`/api/growth/funnels/${draft.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    })
                  : await fetch("/api/growth/funnels", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  setError(data.error ?? "Could not save funnel");
                  return;
                }
                onSaved(data.funnel, page);
              });
            }}
          >
            {pending ? "Saving…" : draft.id ? "Save funnel" : "Create funnel"}
          </Button>
        </div>

        <div className="lg:sticky lg:top-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fix-text-muted">
            Live preview
          </p>
          <FunnelPagePreview page={page} ctaLabel={ctaLabel} />
        </div>
      </div>
    </Card>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-fix-text-muted">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {FUNNEL_PAGE_COLORS.map((color) => (
          <button
            key={`${label}-${color.value}`}
            type="button"
            aria-label={color.label}
            className="h-8 w-8 rounded-full border border-fix-border/25"
            style={{ background: color.value }}
            onClick={() => onChange(color.value)}
          />
        ))}
        <input
          type="color"
          aria-label={`${label} custom`}
          className="h-8 w-10 rounded-md border border-fix-border/25"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export function emptyFunnelDraft(): FunnelMakerDraft {
  return {
    name: "",
    objective: "",
    description: "",
    ctaLabel: "Continue",
    publicSlug: "",
    page: createDefaultFunnelPage(),
  };
}
