"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { GripVertical } from "lucide-react";

import { FormSection } from "@/components/FormSection";
import { ImageCropModal } from "@/components/ImageCropModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FunnelStudioPreview } from "@/components/growth/FunnelStudioPreview";
import { PulsePostMediaEditor } from "@/components/pulse/PulsePostMediaEditor";
import { PulseRichTextEditor } from "@/components/pulse/PulseRichTextEditor";
import {
  FUNNEL_PAGE_COLORS,
  FUNNEL_PAGE_FONTS,
  FUNNEL_PAGE_GRADIENTS,
  FUNNEL_SECTION_KINDS,
  FUNNEL_SECTION_SHAPES,
  MAX_FUNNEL_PAGE_MEDIA,
  PAGE_MEDIA_ID,
  absorbSectionMedia,
  addFunnelMedia,
  canMoveFunnelMedia,
  countFunnelMedia,
  createDefaultFunnelPage,
  createFunnelSection,
  funnelSectionKindName,
  listFunnelMedia,
  moveFunnelMedia,
  removeFunnelMedia,
  reorderFunnelMediaFlat,
  reorderFunnelSections,
  type FunnelMediaBucketId,
  type FunnelPageContent,
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
  onSaved,
}: {
  draft: FunnelMakerDraft;
  vendorPublicSlug: string | null;
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
  const [bgCropSrc, setBgCropSrc] = useState<string | null>(null);
  const [bgUploading, setBgUploading] = useState(false);
  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [dragMediaFlatIndex, setDragMediaFlatIndex] = useState<number | null>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
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
      return reorderFunnelSections(prev, index, nextIndex);
    });
  }

  const editor = (
    <>
      <div className="space-y-4">
          <FormSection
            title="Basics"
            description="Workspace name, URL, and primary button — visitors see the page sections below."
            defaultOpen
          >

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
                <Link href="/account/vendor/profile" className="text-fix-link underline">
                  Vendor profile
                </Link>{" "}
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


          </FormSection>

          <FormSection
            title="Pictures & video"
            description="Gallery blocks you place between sections — not the same as photos embedded in rich text."
            defaultOpen
          >
            <div className="rounded-xl border border-fix-border/15 bg-fix-bg-muted/50 p-3 text-xs text-fix-text-muted">
              <p className="font-medium text-fix-heading">Gallery vs inline media</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>
                  <span className="font-medium text-fix-text">Pictures &amp; video</span> (below): carousel
                  blocks at the top of the page or inside a section — pick the destination in the dropdown.
                </li>
                <li>
                  <span className="font-medium text-fix-text">Rich text toolbar</span>: embed photos inside a
                  section&apos;s story (great for body copy, not for image + text layouts).
                </li>
                <li>
                  For <span className="font-medium text-fix-text">Image + text</span> sections, add the photo
                  here and assign it to that section.
                </li>
              </ul>
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
              enableImageCrop
              heading="Pictures & video"
              description="Add photos (with crop), videos, or files, then move each one up or down between sections."
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
                    {funnelSectionKindName(section.kind)} {index + 1}
                  </option>
                ))}
              </select>
            </label>
            {mediaRows.length === 0 ? (
              <p className="text-sm text-fix-text-muted">No pictures or video yet.</p>
            ) : (
              <ul className="space-y-2">
                {mediaRows.map((row, flatIndex) => {
                  const canUp = canMoveFunnelMedia(page, row.bucketId, row.index, -1);
                  const canDown = canMoveFunnelMedia(page, row.bucketId, row.index, 1);
                  const draggingMedia = dragMediaFlatIndex === flatIndex;
                  return (
                  <li
                    key={row.item.id}
                    className={draggingMedia ? "opacity-60" : undefined}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      if (dragMediaFlatIndex == null || dragMediaFlatIndex === flatIndex) return;
                      e.preventDefault();
                      setPage((prev) => reorderFunnelMediaFlat(prev, dragMediaFlatIndex, flatIndex));
                      setDragMediaFlatIndex(null);
                    }}
                  >
                    <div className="flex items-start gap-1">
                      <button
                        type="button"
                        draggable
                        aria-label="Drag to reorder media"
                        className="mt-2 shrink-0 cursor-grab rounded p-1 text-fix-text-muted hover:bg-fix-bg-muted active:cursor-grabbing"
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          setDragMediaFlatIndex(flatIndex);
                        }}
                        onDragEnd={() => setDragMediaFlatIndex(null)}
                      >
                        <GripVertical className="h-4 w-4" aria-hidden />
                      </button>
                      <div className="min-w-0 flex-1">
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
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </Card>
          </FormSection>

          <FormSection
            title="Theme"
            description="Colors, font, gradient presets, and optional full-page background image."
            defaultOpen
          >
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

            <div className="space-y-2 border-t border-fix-border/15 pt-3">
              <p className="text-xs font-medium text-fix-text-muted">Background gradient (optional)</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={
                    !page.theme.backgroundGradient
                      ? "rounded-full border-2 border-forest px-3 py-1 text-xs font-medium text-fix-heading"
                      : "rounded-full border border-fix-border/25 px-3 py-1 text-xs text-fix-text-muted"
                  }
                  onClick={() =>
                    setPage((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, backgroundGradient: null },
                    }))
                  }
                >
                  None
                </button>
                {FUNNEL_PAGE_GRADIENTS.map((gradient) => (
                  <button
                    key={gradient.id}
                    type="button"
                    title={gradient.label}
                    aria-label={gradient.label}
                    className={
                      page.theme.backgroundGradient === gradient.id
                        ? "h-9 w-14 rounded-lg border-2 border-forest ring-2 ring-forest/30"
                        : "h-9 w-14 rounded-lg border border-fix-border/25"
                    }
                    style={{ background: gradient.css }}
                    onClick={() =>
                      setPage((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, backgroundGradient: gradient.id },
                      }))
                    }
                  />
                ))}
              </div>
              <p className="text-xs text-fix-text-muted">
                Soft presets from the RootSync palette. Layered under a background photo if you add one.
              </p>
            </div>

            <div className="space-y-2 border-t border-fix-border/15 pt-3">
              <p className="text-xs text-fix-text-muted">
                Covers the full page behind your sections. Solid background color still shows as a fallback.
              </p>
              {page.theme.backgroundImageUrl ? (
                <div className="flex flex-wrap items-center gap-2">
                  <img
                    src={page.theme.backgroundImageUrl}
                    alt=""
                    className="h-16 w-28 rounded-lg object-cover ring-1 ring-fix-border/20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending || bgUploading}
                    onClick={() =>
                      setPage((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, backgroundImageUrl: null },
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ) : null}
              <input
                ref={bgImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setBgCropSrc(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending || bgUploading}
                onClick={() => bgImageInputRef.current?.click()}
              >
                {bgUploading ? "Uploading…" : page.theme.backgroundImageUrl ? "Replace background image" : "Add background image"}
              </Button>
            </div>

          </fieldset>
          </FormSection>

          <FormSection
            title="Public page sections"
            description="Hero, FAQ, quotes, image + text, shapes, and buttons visitors see at your funnel URL."
            defaultOpen
          >
<div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-fix-heading">Public page</h3>
                <p className="text-xs text-fix-text-muted">
                  Hero and the sections below are what visitors see at your funnel URL.
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {FUNNEL_SECTION_KINDS.map((kind) => (
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
                    Add {funnelSectionKindName(kind)}
                  </Button>
                ))}
              </div>
            </div>

            {page.sections.map((section, index) => (
              <Card
                key={section.id}
                className={dragSectionId === section.id ? "space-y-3 p-3 opacity-60" : "space-y-3 p-3"}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  if (!dragSectionId || dragSectionId === section.id) return;
                  e.preventDefault();
                  const fromIndex = page.sections.findIndex((item) => item.id === dragSectionId);
                  if (fromIndex < 0) return;
                  setPage((prev) => reorderFunnelSections(prev, fromIndex, index));
                  setDragSectionId(null);
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1">
                    <button
                      type="button"
                      draggable
                      aria-label="Drag to reorder section"
                      className="shrink-0 cursor-grab rounded p-1 text-fix-text-muted hover:bg-fix-bg-muted active:cursor-grabbing"
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        setDragSectionId(section.id);
                      }}
                      onDragEnd={() => setDragSectionId(null)}
                    >
                      <GripVertical className="h-4 w-4" aria-hidden />
                    </button>
                  <p className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
                    {funnelSectionKindName(section.kind)} block
                  </p>
                  </div>
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
                        : section.kind === "faq"
                          ? "Use headings for questions and paragraphs for answers…"
                          : section.kind === "quote"
                            ? "Pull quote and attribution…"
                            : section.kind === "imageText"
                              ? "Headline and copy beside your gallery photo…"
                              : "Write this section — add photos, video, files, and links…"
                    }
                    minHeightClass={
                      section.kind === "hero"
                        ? "min-h-[8rem]"
                        : section.kind === "faq"
                          ? "min-h-[12rem]"
                          : "min-h-[11rem]"
                    }
                  />
                ) : (
                  <p className="text-sm text-fix-text-muted">
                    The live preview shows your button label and link. Add more button blocks if you
                    want a second call to action.
                  </p>
                )}
                {section.kind === "imageText" ? (
                  <p className="text-xs text-fix-text-muted">
                    Add the side image in Pictures &amp; video → assign to this section.
                  </p>
                ) : null}
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

          </FormSection>

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
    </>
  );

  const preview = (
    <div className="xl:sticky xl:top-4">
      <FunnelStudioPreview page={page} ctaLabel={ctaLabel} />
    </div>
  );

  const layout = (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      {editor}
      {preview}
    </div>
  );

  const cropModal =
    bgCropSrc ? (
        <ImageCropModal
          imageSrc={bgCropSrc}
          initialAspect={16 / 9}
          onCancel={() => setBgCropSrc(null)}
          onCrop={async (blob) => {
            setBgCropSrc(null);
            setBgUploading(true);
            setError(null);
            try {
              const fd = new FormData();
              fd.set("file", blob, "funnel-bg.jpg");
              const res = await fetch("/api/community/posts/upload", { method: "POST", body: fd });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                setError(typeof data.error === "string" ? data.error : "Background upload failed");
                return;
              }
              if (typeof data.url !== "string") {
                setError("Background upload failed");
                return;
              }
              setPage((prev) => ({
                ...prev,
                theme: { ...prev.theme, backgroundImageUrl: data.url },
              }));
            } catch {
              setError("Background upload failed");
            } finally {
              setBgUploading(false);
            }
          }}
        />
      ) : null;

  return (
    <>
      {layout}
      {cropModal}
    </>
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
