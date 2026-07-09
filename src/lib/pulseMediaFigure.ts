const MIN_WIDTH_PCT = 20;
const MAX_WIDTH_PCT = 100;

export type PulseMediaAlign = "left" | "center" | "right";
export type PulseMediaFit = "cover" | "contain";

export function findPulseMediaFigure(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  const figure = target.closest("figure.pulse-embed");
  return figure instanceof HTMLElement ? figure : null;
}

export function getMediaElement(figure: HTMLElement): HTMLImageElement | HTMLVideoElement | null {
  return figure.querySelector("img, video");
}

export function isVideoFigure(figure: HTMLElement): boolean {
  return figure.classList.contains("pulse-embed-video");
}

export function applyFigureWidthPercent(figure: HTMLElement, percent: number): number {
  const clamped = Math.min(MAX_WIDTH_PCT, Math.max(MIN_WIDTH_PCT, Math.round(percent)));
  figure.style.width = `${clamped}%`;
  figure.style.maxWidth = "100%";
  return clamped;
}

export function applyFigureAlign(figure: HTMLElement, align: PulseMediaAlign): void {
  if (align === "left") {
    figure.style.marginLeft = "0";
    figure.style.marginRight = "auto";
  } else if (align === "right") {
    figure.style.marginLeft = "auto";
    figure.style.marginRight = "0";
  } else {
    figure.style.marginLeft = "auto";
    figure.style.marginRight = "auto";
  }
}

export function applyMediaObjectFit(figure: HTMLElement, fit: PulseMediaFit): void {
  const media = getMediaElement(figure);
  if (!media) return;
  media.style.objectFit = fit;
  media.style.width = "100%";
  media.style.height = fit === "cover" ? "auto" : "auto";
  media.style.maxHeight = fit === "cover" ? "min(420px, 70vh)" : "min(480px, 75vh)";
  if (media instanceof HTMLVideoElement) {
    media.style.background = "#000";
  }
}

export function readFigureWidthPercent(figure: HTMLElement, editorWidth: number): number {
  const inline = figure.style.width;
  const match = inline.match(/^(\d{1,3})%$/);
  if (match) return Number(match[1]);
  if (editorWidth > 0) {
    const rect = figure.getBoundingClientRect();
    return Math.round((rect.width / editorWidth) * 100);
  }
  return 100;
}

export function clearEditorSelectionClasses(root: HTMLElement): void {
  root.querySelectorAll("figure.pulse-embed-selected").forEach((el) => {
    el.classList.remove("pulse-embed-selected");
  });
}

export function preparePulseHtmlForSave(html: string): string {
  return html.replace(/\spulse-embed-selected/g, "");
}
