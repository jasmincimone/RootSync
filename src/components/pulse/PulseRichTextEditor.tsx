"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  FileUp,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Loader2,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  X,
} from "lucide-react";

import { FormFeedback } from "@/components/ui/FormFeedback";
import { PulseMediaResizeOverlay } from "@/components/pulse/PulseMediaResizeOverlay";
import { cn } from "@/lib/cn";
import {
  applyFigureAlign,
  applyMediaObjectFit,
  clearEditorSelectionClasses,
  findPulseMediaFigure,
  preparePulseHtmlForSave,
} from "@/lib/pulseMediaFigure";

const UPLOAD_ENDPOINT = "/api/community/posts/upload";

const PHOTO_VIDEO_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov";

const FILE_ACCEPT =
  ".pdf,.zip,.epub,.docx,.xlsx,.pptx,.txt,.csv,application/pdf,application/zip,application/epub+zip,text/plain,text/csv";

const FONT_OPTIONS = [
  { label: "Default", value: "Inter, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Handwriting", value: "var(--font-caveat), cursive" },
  { label: "Mono", value: "'Courier New', monospace" },
] as const;

const SIZE_OPTIONS = [
  { label: "Small", value: "14px" },
  { label: "Normal", value: "16px" },
  { label: "Large", value: "20px" },
  { label: "XL", value: "24px" },
] as const;

const COLOR_OPTIONS = [
  { label: "Espresso", value: "#342a0f" },
  { label: "Bark", value: "#59281d" },
  { label: "Forest", value: "#044730" },
  { label: "Gold", value: "#b8895f" },
  { label: "Amber", value: "#e59a28" },
] as const;

const HIGHLIGHT_OPTIONS = [
  { label: "None", value: "transparent" },
  { label: "Clay", value: "#e1cec3" },
  { label: "Gold tint", value: "#f5e8d8" },
  { label: "Mint", value: "#d8efe6" },
] as const;

type Props = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minHeightClass?: string;
};

type ErrorPayload = {
  error?: string;
  hint?: string;
  code?: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toolbarBtn(active = false) {
  return cn(
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-fix-border/20 px-1.5 text-fix-heading transition-colors",
    "hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta disabled:opacity-40",
    active && "bg-fix-bg-muted ring-1 ring-fix-cta/30",
  );
}

export function PulseRichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Write your Pulse — add titles, captions, and context around your photos and videos…",
  minHeightClass = "min-h-[11rem]",
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncingRef = useRef(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFigure, setSelectedFigure] = useState<HTMLElement | null>(null);

  const syncFromDom = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    clearEditorSelectionClasses(el);
    setSelectedFigure(null);
    onChange(preparePulseHtmlForSave(el.innerHTML));
  }, [onChange]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || syncingRef.current) return;
    if (el.innerHTML !== value) {
      syncingRef.current = true;
      el.innerHTML = value || "";
      syncingRef.current = false;
    }
  }, [value]);

  function focusEditor() {
    editorRef.current?.focus();
  }

  function exec(command: string, valueArg?: string) {
    focusEditor();
    document.execCommand(command, false, valueArg);
    syncFromDom();
  }

  function applyBlockStyle(style: Record<string, string>) {
    focusEditor();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    let node: Node | null = range.commonAncestorContainer;
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLElement && /^(P|DIV|H1|H2|H3|H4|BLOCKQUOTE|FIGCAPTION)$/.test(node.tagName)) {
        for (const [key, val] of Object.entries(style)) {
          if (val === "") node.style.removeProperty(key);
          else node.style.setProperty(key, val);
        }
        syncFromDom();
        return;
      }
      node = node.parentNode;
    }
    exec("formatBlock", "p");
    applyBlockStyle(style);
  }

  function insertHtml(html: string) {
    focusEditor();
    const selection = window.getSelection();
    if (!selection) return;

    if (selection.rangeCount === 0 && editorRef.current) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    if (selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const fragment = range.createContextualFragment(html);
    const lastNode = fragment.lastChild;
    range.insertNode(fragment);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    syncFromDom();
  }

  async function uploadAndInsert(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(UPLOAD_ENDPOINT, { method: "POST", body: fd });
      const rawBody = await res.text();
      let parsed: ErrorPayload & {
        url?: string;
        type?: "image" | "video" | "file";
        fileName?: string;
      } = {};
      if (rawBody) {
        try {
          parsed = JSON.parse(rawBody) as typeof parsed;
        } catch {
          parsed = {};
        }
      }
      if (!res.ok) {
        const parts = [parsed.error, parsed.hint, parsed.code ? `(code: ${parsed.code})` : ""]
          .filter(Boolean)
          .join(" ");
        setUploadError(parts || `Upload failed (HTTP ${res.status})`);
        return;
      }
      if (!parsed.url || !parsed.type) {
        setUploadError("Upload succeeded but the server response was invalid.");
        return;
      }

      if (parsed.type === "image") {
        insertHtml(
          `<figure class="pulse-embed pulse-embed-image" style="width: 100%; margin-left: auto; margin-right: auto;"><img src="${escapeHtml(parsed.url)}" alt="" style="width: 100%; object-fit: cover;" /><figcaption>Caption</figcaption></figure><p><br></p>`,
        );
      } else if (parsed.type === "video") {
        insertHtml(
          `<figure class="pulse-embed pulse-embed-video" style="width: 100%; margin-left: auto; margin-right: auto;"><video src="${escapeHtml(parsed.url)}" controls playsinline style="width: 100%; object-fit: contain; background: #000;"></video><figcaption>Caption</figcaption></figure><p><br></p>`,
        );
      } else {
        const name = escapeHtml(parsed.fileName ?? file.name);
        insertHtml(
          `<p><a class="pulse-embed pulse-embed-file" href="${escapeHtml(parsed.url)}" data-pulse-file="1" contenteditable="false">${name}</a></p><p><br></p>`,
        );
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onPhotoVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadAndInsert(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadAndInsert(file);
  }

  function handleEditorClick(e: React.MouseEvent<HTMLDivElement>) {
    const figure = findPulseMediaFigure(e.target);
    const el = editorRef.current;
    if (!el) return;

    clearEditorSelectionClasses(el);
    if (figure && el.contains(figure)) {
      figure.classList.add("pulse-embed-selected");
      if (!figure.style.width) {
        figure.style.width = "100%";
        applyFigureAlign(figure, "center");
      }
      const media = figure.querySelector("img, video");
      if (media instanceof HTMLImageElement && !media.style.objectFit) {
        applyMediaObjectFit(figure, "cover");
      }
      if (media instanceof HTMLVideoElement && !media.style.objectFit) {
        applyMediaObjectFit(figure, "contain");
      }
      setSelectedFigure(figure);
      return;
    }
    setSelectedFigure(null);
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-fix-border/20 bg-fix-bg-muted/30 p-2">
        <div className="flex min-w-max flex-wrap items-center gap-1.5">
          <select
            aria-label="Font"
            disabled={disabled || uploading}
            className="h-8 max-w-[7rem] rounded-md border border-fix-border/20 bg-fix-surface px-2 text-xs"
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) exec("fontName", v);
              e.target.value = "";
            }}
          >
            <option value="">Font</option>
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Font size"
            disabled={disabled || uploading}
            className="h-8 max-w-[6.5rem] rounded-md border border-fix-border/20 bg-fix-surface px-2 text-xs"
            defaultValue=""
            onChange={(e) => {
              const px = e.target.value;
              if (!px) return;
              focusEditor();
              document.execCommand("fontSize", false, "7");
              const fontElements = editorRef.current?.querySelectorAll('font[size="7"]');
              fontElements?.forEach((el) => {
                const span = document.createElement("span");
                span.style.fontSize = px;
                span.innerHTML = el.innerHTML;
                el.replaceWith(span);
              });
              syncFromDom();
              e.target.value = "";
            }}
          >
            <option value="">Size</option>
            {SIZE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Text color"
            disabled={disabled || uploading}
            className="h-8 max-w-[6.5rem] rounded-md border border-fix-border/20 bg-fix-surface px-2 text-xs"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) exec("foreColor", e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">Color</option>
            {COLOR_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Highlight"
            disabled={disabled || uploading}
            className="h-8 max-w-[7rem] rounded-md border border-fix-border/20 bg-fix-surface px-2 text-xs"
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v === "transparent") exec("removeFormat");
              else if (v) exec("backColor", v);
              e.target.value = "";
            }}
          >
            <option value="">Highlight</option>
            {HIGHLIGHT_OPTIONS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>

          <span className="mx-0.5 h-5 w-px bg-fix-border/25" aria-hidden />

          <button type="button" className={toolbarBtn()} disabled={disabled || uploading} onClick={() => exec("bold")} aria-label="Bold">
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarBtn()} disabled={disabled || uploading} onClick={() => exec("italic")} aria-label="Italic">
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarBtn()} disabled={disabled || uploading} onClick={() => exec("underline")} aria-label="Underline">
            <Underline className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarBtn()} disabled={disabled || uploading} onClick={() => exec("strikeThrough")} aria-label="Strikethrough">
            <Strikethrough className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarBtn()} disabled={disabled || uploading} onClick={() => exec("subscript")} aria-label="Subscript">
            <Subscript className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarBtn()} disabled={disabled || uploading} onClick={() => exec("superscript")} aria-label="Superscript">
            <Superscript className="h-3.5 w-3.5" />
          </button>

          <span className="mx-0.5 h-5 w-px bg-fix-border/25" aria-hidden />

          <button type="button" className={toolbarBtn()} disabled={disabled || uploading} onClick={() => applyBlockStyle({ textAlign: "left" })} aria-label="Align left">
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarBtn()} disabled={disabled || uploading} onClick={() => applyBlockStyle({ textAlign: "center" })} aria-label="Align center">
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarBtn()} disabled={disabled || uploading} onClick={() => applyBlockStyle({ textAlign: "right" })} aria-label="Align right">
            <AlignRight className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarBtn()} disabled={disabled || uploading} onClick={() => applyBlockStyle({ textAlign: "" })} aria-label="Clear alignment">
            <X className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarBtn()} disabled={disabled || uploading} onClick={() => exec("indent")} aria-label="Indent">
            <IndentIncrease className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarBtn()} disabled={disabled || uploading} onClick={() => exec("outdent")} aria-label="Outdent">
            <IndentDecrease className="h-3.5 w-3.5" />
          </button>

          <span className="mx-0.5 h-5 w-px bg-fix-border/25" aria-hidden />

          <input
            ref={photoInputRef}
            type="file"
            accept={PHOTO_VIDEO_ACCEPT}
            className="sr-only"
            disabled={disabled || uploading}
            onChange={onPhotoVideoChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept={FILE_ACCEPT}
            className="sr-only"
            disabled={disabled || uploading}
            onChange={onFileChange}
          />

          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => photoInputRef.current?.click()}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-fix-border/20 bg-fix-surface px-2.5 text-xs font-medium text-fix-heading hover:bg-fix-bg-muted"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            Photo / video
          </button>
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-fix-border/20 bg-fix-surface px-2.5 text-xs font-medium text-fix-heading hover:bg-fix-bg-muted"
          >
            <FileUp className="h-3.5 w-3.5" />
            File
          </button>
        </div>
      </div>

      <FormFeedback error={uploadError} />

      <div className="relative">
        <div
          ref={editorRef}
          contentEditable={!disabled && !uploading}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline
          data-placeholder={placeholder}
          onClick={handleEditorClick}
          onInput={() => {
            if (!syncingRef.current) {
              const html = editorRef.current?.innerHTML ?? "";
              onChange(preparePulseHtmlForSave(html));
            }
          }}
          onBlur={(e) => {
            const related = e.relatedTarget;
            const parent = e.currentTarget.parentElement;
            if (related instanceof Node && parent?.contains(related)) return;
            syncFromDom();
          }}
          className={cn(
            "pulse-rich-editor pulse-post-content w-full rounded-xl border border-fix-border/20 bg-fix-surface px-3 py-3 text-sm text-fix-text outline-none",
            "focus:border-amber focus:ring-1 focus:ring-amber",
            minHeightClass,
            (disabled || uploading) && "cursor-not-allowed opacity-60",
          )}
        />
        {selectedFigure && editorRef.current ? (
          <PulseMediaResizeOverlay
            figure={selectedFigure}
            editorEl={editorRef.current}
            onChange={() => {
              if (editorRef.current) {
                onChange(preparePulseHtmlForSave(editorRef.current.innerHTML));
              }
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
