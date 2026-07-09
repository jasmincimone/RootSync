"use client";

import { useCallback, useEffect, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, GripHorizontal } from "lucide-react";

import {
  applyFigureAlign,
  applyFigureWidthPercent,
  applyMediaObjectFit,
  isVideoFigure,
  readFigureWidthPercent,
  type PulseMediaAlign,
  type PulseMediaFit,
} from "@/lib/pulseMediaFigure";
import { cn } from "@/lib/cn";

type Props = {
  figure: HTMLElement;
  editorEl: HTMLElement;
  onChange: () => void;
};

const WIDTH_PRESETS = [
  { label: "S", value: 40 },
  { label: "M", value: 65 },
  { label: "L", value: 85 },
  { label: "Full", value: 100 },
] as const;

function getOverlayBox(figure: HTMLElement, editorEl: HTMLElement) {
  const figureRect = figure.getBoundingClientRect();
  const editorRect = editorEl.getBoundingClientRect();
  return {
    top: figureRect.top - editorRect.top + editorEl.scrollTop,
    left: figureRect.left - editorRect.left + editorEl.scrollLeft,
    width: figureRect.width,
    height: figureRect.height,
  };
}

export function PulseMediaResizeOverlay({ figure, editorEl, onChange }: Props) {
  const [box, setBox] = useState(() => getOverlayBox(figure, editorEl));
  const isVideo = isVideoFigure(figure);

  const refreshBox = useCallback(() => {
    setBox(getOverlayBox(figure, editorEl));
  }, [figure, editorEl]);

  useEffect(() => {
    refreshBox();
    const onScroll = () => refreshBox();
    editorEl.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      editorEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [editorEl, refreshBox]);

  function setWidth(pct: number) {
    applyFigureWidthPercent(figure, pct);
    onChange();
    refreshBox();
  }

  function setAlign(align: PulseMediaAlign) {
    applyFigureAlign(figure, align);
    onChange();
    refreshBox();
  }

  function setFit(fit: PulseMediaFit) {
    applyMediaObjectFit(figure, fit);
    onChange();
    refreshBox();
  }

  function startDrag(clientX: number) {
    const startWidth = figure.getBoundingClientRect().width;
    const editorWidth = editorEl.clientWidth;
    const startX = clientX;

    function onMove(x: number) {
      const delta = x - startX;
      const next = Math.min(editorWidth, Math.max(editorWidth * 0.2, startWidth + delta));
      const pct = (next / editorWidth) * 100;
      applyFigureWidthPercent(figure, pct);
      refreshBox();
    }

    function onMouseMove(e: MouseEvent) {
      onMove(e.clientX);
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches[0]) onMove(e.touches[0].clientX);
    }
    function end() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", end);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", end);
      onChange();
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", end);
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", end);
  }

  const currentWidth = readFigureWidthPercent(figure, editorEl.clientWidth);

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      <div
        className="pointer-events-none absolute rounded-lg ring-2 ring-amber ring-offset-2 ring-offset-fix-surface"
        style={{
          top: box.top,
          left: box.left,
          width: box.width,
          height: box.height,
        }}
      />

      <div
        className="pointer-events-auto absolute flex max-w-[calc(100%-0.5rem)] flex-wrap items-center gap-1 rounded-lg border border-fix-border/20 bg-fix-surface/95 p-1 shadow-soft backdrop-blur-sm"
        style={{
          top: Math.max(4, box.top - 40),
          left: box.left,
        }}
      >
        {WIDTH_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className={cn(
              "rounded px-2 py-1 text-[11px] font-medium",
              currentWidth === preset.value
                ? "bg-forest text-fix-primary-foreground"
                : "text-fix-heading hover:bg-fix-bg-muted",
            )}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setWidth(preset.value)}
          >
            {preset.label}
          </button>
        ))}
        <span className="mx-0.5 h-4 w-px bg-fix-border/30" />
        <button
          type="button"
          title="Align left"
          className="rounded p-1 text-fix-heading hover:bg-fix-bg-muted"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setAlign("left")}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Align center"
          className="rounded p-1 text-fix-heading hover:bg-fix-bg-muted"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setAlign("center")}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Align right"
          className="rounded p-1 text-fix-heading hover:bg-fix-bg-muted"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setAlign("right")}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </button>
        {!isVideo ? (
          <>
            <span className="mx-0.5 h-4 w-px bg-fix-border/30" />
            <button
              type="button"
              className="rounded px-2 py-1 text-[11px] font-medium text-fix-heading hover:bg-fix-bg-muted"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setFit("cover")}
            >
              Cover
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-[11px] font-medium text-fix-heading hover:bg-fix-bg-muted"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setFit("contain")}
            >
              Fit
            </button>
          </>
        ) : (
          <>
            <span className="mx-0.5 h-4 w-px bg-fix-border/30" />
            <button
              type="button"
              className="rounded px-2 py-1 text-[11px] font-medium text-fix-heading hover:bg-fix-bg-muted"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setFit("contain")}
            >
              Fit
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-[11px] font-medium text-fix-heading hover:bg-fix-bg-muted"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setFit("cover")}
            >
              Fill
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        title="Drag to resize"
        className="pointer-events-auto absolute flex h-5 w-5 cursor-se-resize items-center justify-center rounded-full border border-fix-border/30 bg-fix-surface text-fix-heading shadow-soft"
        style={{
          top: box.top + box.height - 10,
          left: box.left + box.width - 10,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startDrag(e.clientX);
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.touches[0]) startDrag(e.touches[0].clientX);
        }}
      >
        <GripHorizontal className="h-3 w-3 rotate-45" />
      </button>
    </div>
  );
}
