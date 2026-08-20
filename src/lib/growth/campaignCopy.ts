import OpenAI from "openai";

import { CAMPAIGN_OBJECTIVE_CARDS } from "@/lib/growth/campaignTypes";
import { plainTextToCampaignHtml } from "@/lib/growth/campaignMessage";

export type CampaignCopyDraft = {
  subject: string;
  previewText: string;
  headline: string;
  bodyHtml: string;
  ctaLabel: string;
};

function extractJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function generateCampaignCopy(args: {
  businessName: string;
  objective: string | null;
  destinationLabel: string | null;
  audienceSummary: string;
  emphasize?: string | null;
  tone?: string | null;
}): Promise<CampaignCopyDraft> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Rootie is not configured yet. Add OPENAI_API_KEY to generate copy.");
  }

  const objectiveLabel =
    CAMPAIGN_OBJECTIVE_CARDS.find((card) => card.id === args.objective)?.title ?? "a custom campaign";
  const tone = args.tone?.trim() || "friendly";
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.7,
    max_tokens: 900,
    messages: [
      {
        role: "system",
        content:
          "You are Rootie, RootSense AI for RootSync. Write local, calm, community-first marketing copy. Never invent discounts, reviews, or medical claims. Return JSON only.",
      },
      {
        role: "user",
        content: [
          `Business: ${args.businessName}`,
          `Objective: ${objectiveLabel}`,
          `Destination: ${args.destinationLabel || "not selected"}`,
          `Audience: ${args.audienceSummary}`,
          `Tone: ${tone}`,
          args.emphasize?.trim() ? `Emphasize: ${args.emphasize.trim()}` : "",
          `Return JSON with keys: subject, previewText, headline, body (plain text paragraphs), ctaLabel.`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  const parsed = extractJsonObject(text);
  const subject =
    (typeof parsed?.subject === "string" && parsed.subject.trim()) ||
    `${args.businessName} — ${objectiveLabel}`;
  const previewText =
    (typeof parsed?.previewText === "string" && parsed.previewText.trim()) ||
    "A note from your local RootSync vendor.";
  const headline =
    (typeof parsed?.headline === "string" && parsed.headline.trim()) || args.businessName;
  const body =
    (typeof parsed?.body === "string" && parsed.body.trim()) ||
    "We saved a spot for you. Tap below when you are ready.";
  const ctaLabel =
    (typeof parsed?.ctaLabel === "string" && parsed.ctaLabel.trim()) || "Continue";

  return {
    subject: subject.slice(0, 140),
    previewText: previewText.slice(0, 160),
    headline: headline.slice(0, 120),
    bodyHtml: plainTextToCampaignHtml(body),
    ctaLabel: ctaLabel.slice(0, 48),
  };
}
