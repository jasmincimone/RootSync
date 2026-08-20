import { escapeHtml } from "@/lib/growth/campaignHtml";

export type CampaignMessageContent = {
  headline: string;
  bodyHtml: string;
  ctaLabel: string;
  previewText: string;
  subject: string;
};

export function escapeCampaignText(value: string): string {
  return escapeHtml(value);
}

export function wrapCampaignEmail(args: {
  origin: string;
  trackingToken: string;
  subject: string;
  previewText?: string | null;
  headline?: string | null;
  heroImageUrl?: string | null;
  bodyHtml: string;
  ctaLabel?: string | null;
  clickUrl: string;
  unsubscribeUrl: string;
  openPixelUrl: string;
  senderName?: string | null;
}): string {
  const heroImage = args.heroImageUrl?.trim()
    ? `<img src="${escapeHtml(args.heroImageUrl.trim())}" alt="" style="display:block;width:100%;max-width:560px;height:auto;border-radius:12px 12px 0 0;margin:0 0 20px;" />`
    : "";
  const headline = args.headline?.trim()
    ? `<h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.2;color:#342a0f;margin:0 0 16px;">${escapeHtml(args.headline.trim())}</h1>`
    : "";
  const cta = args.ctaLabel?.trim()
    ? `<p style="margin:28px 0 8px;"><a href="${escapeHtml(args.clickUrl)}" style="display:inline-block;background:#044730;color:#F8F4EE;text-decoration:none;border-radius:999px;padding:12px 22px;font-family:Inter,sans-serif;font-size:15px;">${escapeHtml(args.ctaLabel.trim())}</a></p>`
    : "";
  const preview = args.previewText?.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(args.previewText.trim())}</div>`
    : "";

  return `<!DOCTYPE html>
<html><body style="margin:0;background:#F8F4EE;padding:24px;">
${preview}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Georgia,serif;color:#342a0f;">
  <tr><td>
    ${heroImage}
    <div style="padding:${heroImage ? "0 32px 32px" : "32px"};">
    ${headline}
    <div style="font-size:16px;line-height:1.6;">${args.bodyHtml}</div>
    ${cta}
    <p style="margin-top:36px;font-size:12px;line-height:1.5;color:#7A8B63;font-family:Inter,sans-serif;">
      Sent by ${escapeHtml(args.senderName?.trim() || "RootSync")}.
      <a href="${escapeHtml(args.unsubscribeUrl)}" style="color:#7A8B63;">Unsubscribe</a>
    </p>
    <img src="${escapeHtml(args.openPixelUrl)}" width="1" height="1" alt="" style="display:block;border:0;" />
    </div>
  </td></tr>
</table>
</body></html>`;
}

export function plainTextToCampaignHtml(text: string): string {
  const escaped = escapeHtml(text.trim());
  if (!escaped) return "<p></p>";
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br />")}</p>`)
    .join("");
}
