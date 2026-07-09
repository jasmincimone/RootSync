import { MAX_PULSE_POST_MEDIA, type PulsePostMediaItem } from "@/config/pulsePostMedia";
import {
  extractPulseMediaFromHtml,
  pulsePostHasVisibleContent,
  pulsePostPlainText,
  sanitizePulsePostHtml,
} from "@/lib/pulsePostHtml";

const MAX_HTML_LENGTH = 48_000;

export const PULSE_POST_ERROR_CODES = {
  EMPTY: "EMPTY",
  NO_VISIBLE_CONTENT: "NO_VISIBLE_CONTENT",
  CONTENT_FILTERED: "CONTENT_FILTERED",
  MEDIA_NOT_ALLOWED: "MEDIA_NOT_ALLOWED",
  TOO_MANY_ATTACHMENTS: "TOO_MANY_ATTACHMENTS",
  CONTENT_TOO_LONG: "CONTENT_TOO_LONG",
  DB_SCHEMA_OUTDATED: "DB_SCHEMA_OUTDATED",
  SERVER_ERROR: "SERVER_ERROR",
} as const;

export type PulsePostErrorCode = (typeof PULSE_POST_ERROR_CODES)[keyof typeof PULSE_POST_ERROR_CODES];

export type PulsePostApiError = {
  error: string;
  code?: PulsePostErrorCode;
  hint?: string;
  details?: string[];
};

export type PulsePostValidationOk = {
  ok: true;
  content: string;
  media: PulsePostMediaItem[];
};

export type PulsePostValidationFail = {
  ok: false;
} & PulsePostApiError;

export type PulsePostValidationResult = PulsePostValidationOk | PulsePostValidationFail;

function countRawMediaTags(html: string): number {
  const images = (html.match(/<img[\s>]/gi) ?? []).length;
  const videos = (html.match(/<video[\s>]/gi) ?? []).length;
  const files = (html.match(/data-pulse-file/i) ?? []).length;
  return images + videos + files;
}

function buildNoVisibleContentFailure(rawContent: string, content: string): PulsePostValidationFail {
  const details: string[] = [];
  const rawText = pulsePostPlainText(rawContent);
  const cleanText = pulsePostPlainText(content);
  const rawMediaCount = countRawMediaTags(rawContent);
  const savedMediaCount = extractPulseMediaFromHtml(content).length;

  if (rawText.length > 0 && cleanText.length === 0) {
    details.push("Your text was removed by content safety filtering. Try simpler formatting or plain text.");
  } else if (rawText.length > cleanText.length + 40) {
    details.push("Some of your text or styling was removed by content safety filtering.");
  }

  if (rawMediaCount > 0 && savedMediaCount === 0) {
    details.push(
      "One or more attachments could not be saved. Re-upload photos and videos, or use supported file types.",
    );
  } else if (rawMediaCount > savedMediaCount) {
    details.push(
      `${rawMediaCount - savedMediaCount} attachment(s) were dropped because their links are not allowed.`,
    );
  }

  if (rawText.trim().length === 0 && rawMediaCount === 0) {
    return {
      ok: false,
      code: PULSE_POST_ERROR_CODES.EMPTY,
      error: "Add text or at least one photo, video, or file.",
      hint: "Type in the editor or use the Photo/video or File buttons to attach media.",
      details: details.length > 0 ? details : undefined,
    };
  }

  return {
    ok: false,
    code: PULSE_POST_ERROR_CODES.NO_VISIBLE_CONTENT,
    error: "This Pulse does not have any publishable content after processing.",
    hint: "Add text, re-upload attachments, or simplify formatting, then try again.",
    details: details.length > 0 ? details : undefined,
  };
}

export function validatePulsePostForPublish(rawContent: string): PulsePostValidationResult {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: PULSE_POST_ERROR_CODES.EMPTY,
      error: "Add text or at least one photo, video, or file.",
      hint: "Type in the editor or attach media before publishing.",
    };
  }

  if (trimmed.length > MAX_HTML_LENGTH) {
    return {
      ok: false,
      code: PULSE_POST_ERROR_CODES.CONTENT_TOO_LONG,
      error: `This Pulse is too long (${trimmed.length.toLocaleString()} characters).`,
      hint: `Shorten your post to under ${MAX_HTML_LENGTH.toLocaleString()} characters, or remove some attachments.`,
    };
  }

  const content = sanitizePulsePostHtml(rawContent);
  if (content.length >= MAX_HTML_LENGTH) {
    return {
      ok: false,
      code: PULSE_POST_ERROR_CODES.CONTENT_TOO_LONG,
      error: "This Pulse is too long after formatting.",
      hint: "Remove some text, images, or styling and try again.",
    };
  }

  const media = extractPulseMediaFromHtml(content);
  const rawMediaCount = countRawMediaTags(rawContent);

  if (media.length > MAX_PULSE_POST_MEDIA) {
    return {
      ok: false,
      code: PULSE_POST_ERROR_CODES.TOO_MANY_ATTACHMENTS,
      error: `Too many attachments (${media.length}). Maximum is ${MAX_PULSE_POST_MEDIA}.`,
      hint: "Remove extra photos, videos, or files before publishing.",
    };
  }

  if (!pulsePostHasVisibleContent(content)) {
    return buildNoVisibleContentFailure(rawContent, content);
  }

  if (rawMediaCount > media.length && media.length > 0) {
    return {
      ok: false,
      code: PULSE_POST_ERROR_CODES.MEDIA_NOT_ALLOWED,
      error: "Some attachments use links that are not allowed.",
      hint: "Upload files with the editor buttons instead of pasting external links.",
      details: [
        `${rawMediaCount - media.length} attachment(s) were not saved.`,
        "Only uploads from this site or trusted https:// links are supported.",
      ],
    };
  }

  return { ok: true, content, media };
}

export function validatePulsePostForDraft(rawContent: string): PulsePostValidationResult {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: PULSE_POST_ERROR_CODES.EMPTY,
      error: "Nothing to save yet.",
      hint: "Add text or an attachment before saving a draft.",
    };
  }

  if (trimmed.length > MAX_HTML_LENGTH) {
    return {
      ok: false,
      code: PULSE_POST_ERROR_CODES.CONTENT_TOO_LONG,
      error: `This draft is too long (${trimmed.length.toLocaleString()} characters).`,
      hint: `Shorten it to under ${MAX_HTML_LENGTH.toLocaleString()} characters before saving.`,
    };
  }

  const content = sanitizePulsePostHtml(rawContent);
  const media = extractPulseMediaFromHtml(content);
  return { ok: true, content, media };
}

export function pulsePostErrorFromUnknown(error: unknown): PulsePostApiError {
  const message = error instanceof Error ? error.message : String(error);

  if (/Unknown argument [`']status[`']/.test(message)) {
    return {
      error: "The app server is using an outdated Prisma client.",
      code: PULSE_POST_ERROR_CODES.DB_SCHEMA_OUTDATED,
      hint: "Stop the dev server, run `npx prisma generate`, then start it again (`npm run dev`).",
      details: [message],
    };
  }

  if (
    message.includes("mediaJson") ||
    message.includes("CommunityPost.status") ||
    (message.includes("column") && message.includes("does not exist")) ||
    message.includes("P2022")
  ) {
    return {
      error: "Pulse database schema is out of date.",
      code: PULSE_POST_ERROR_CODES.DB_SCHEMA_OUTDATED,
      hint: "From the project root run: npm run db:migrate — then restart the dev server and try again.",
      details: [message],
    };
  }

  return {
    error: "Something went wrong while saving your Pulse.",
    code: PULSE_POST_ERROR_CODES.SERVER_ERROR,
    hint: "Check your connection and try again. If this keeps happening, contact support.",
    details: process.env.NODE_ENV === "development" ? [message] : undefined,
  };
}
