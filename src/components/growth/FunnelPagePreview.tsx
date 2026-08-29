"use client";

import { PulsePostContent } from "@/components/pulse/PulsePostContent";
import { PulsePostMediaGallery } from "@/components/pulse/PulsePostMediaGallery";
import { cn } from "@/lib/cn";
import {
  isLightColor,
  resolveFunnelPageBackgroundStyle,
  type FunnelPageContent,
  type FunnelPageSection,
} from "@/lib/growth/funnelPage";

function sectionClass(section: FunnelPageSection) {
  if (section.shape === "pill") return "rounded-full px-6 py-8";
  if (section.shape === "rounded") return "rounded-3xl px-5 py-6";
  if (section.shape === "split") return "rounded-none border-y border-black/10 px-5 py-6";
  return "px-5 py-5";
}

function SectionContent({
  section,
  page,
  compact,
}: {
  section: FunnelPageSection;
  page: FunnelPageContent;
  compact: boolean;
}) {
  const background = section.background || "transparent";
  const onDark = section.background
    ? !isLightColor(section.background)
    : !isLightColor(page.theme.background);

  if (section.kind === "imageText") {
    return (
      <div className={cn("grid gap-4 sm:grid-cols-2 sm:items-center", sectionClass(section))} style={{ background }}>
        <div className={cn(onDark && section.background ? "text-[#F8F4EE]" : undefined)}>
          {section.media?.length ? (
            <PulsePostMediaGallery media={section.media} className="mt-0" />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-black/15 bg-black/5 text-sm text-fix-text-muted">
              Add a photo in Pictures &amp; video
            </div>
          )}
        </div>
        <PulsePostContent
          html={section.html}
          className={cn("mt-0", compact && "text-xs", onDark && section.background && "[&_*]:text-inherit")}
        />
      </div>
    );
  }

  if (section.kind === "quote") {
    return (
      <div
        className={cn(sectionClass(section), "border-l-4")}
        style={{ background, borderColor: page.theme.accent }}
      >
        <PulsePostContent
          html={section.html}
          className={cn(
            "mt-0 italic [&_blockquote]:border-0 [&_blockquote]:p-0",
            compact && "text-xs",
            onDark && section.background ? "text-[#F8F4EE]" : undefined,
          )}
        />
      </div>
    );
  }

  if (section.kind === "faq") {
    return (
      <div className={sectionClass(section)} style={{ background }}>
        <PulsePostContent
          html={section.html}
          className={cn(
            "mt-0 space-y-4 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3:first-child]:mt-0",
            compact && "text-xs",
            onDark && section.background ? "text-[#F8F4EE]" : undefined,
          )}
        />
      </div>
    );
  }

  if (section.kind === "band" && section.shape === "split") {
    return (
      <div
        className={sectionClass(section)}
        style={{
          background,
          color: onDark && section.background ? "#F8F4EE" : page.theme.textColor,
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-black/10 p-4">
            <PulsePostContent html={section.html} className={cn("mt-0", compact && "text-xs")} />
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            {section.media?.length ? (
              <PulsePostMediaGallery media={section.media} className="mt-0" />
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={sectionClass(section)}
      style={{
        background: section.kind === "band" || section.kind === "hero" ? background : background,
        color: onDark && section.background ? "#F8F4EE" : page.theme.textColor,
      }}
    >
      <PulsePostContent
        html={section.html}
        className={cn(
          "mt-0",
          compact && "text-xs",
          section.kind === "hero" && "[&_h1]:text-3xl [&_h1]:font-semibold",
        )}
      />
      {section.media?.length ? (
        <PulsePostMediaGallery media={section.media} className="mt-3" />
      ) : null}
    </div>
  );
}

export function FunnelPagePreview({
  page,
  ctaLabel,
  className,
  compact = false,
}: {
  page: FunnelPageContent;
  ctaLabel?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const buttonLabel = ctaLabel?.trim() || "Continue";
  const href = page.ctaHref.trim() || "#";
  const pageBackground = resolveFunnelPageBackgroundStyle(page.theme);

  return (
    <div
      className={cn("overflow-hidden rounded-2xl", className)}
      style={{
        ...pageBackground,
        color: page.theme.textColor,
        fontFamily: page.theme.fontFamily,
      }}
    >
      {page.media?.length ? (
        <div className="px-5 pt-5">
          <PulsePostMediaGallery media={page.media} className="mt-0" />
        </div>
      ) : null}
      {page.sections.map((section) => {
        if (section.kind === "cta") {
          const background = section.background || "transparent";
          return (
            <div
              key={section.id}
              className={cn("space-y-3", sectionClass(section))}
              style={{ background }}
            >
              <div className="flex justify-center">
                <a
                  href={href}
                  className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-medium"
                  style={{
                    background: page.theme.accent,
                    color: isLightColor(page.theme.accent) ? "#342a0f" : "#F8F4EE",
                  }}
                  onClick={(event) => {
                    if (href === "#") event.preventDefault();
                  }}
                >
                  {buttonLabel}
                </a>
              </div>
              {section.media?.length ? (
                <PulsePostMediaGallery media={section.media} className="mt-0" />
              ) : null}
            </div>
          );
        }
        return <SectionContent key={section.id} section={section} page={page} compact={compact} />;
      })}
    </div>
  );
}
