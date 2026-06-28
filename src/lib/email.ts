import { Resend } from "resend";

import { formatPrice } from "@/lib/format";

function appOrigin(): string {
  const u = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return u.replace(/\/$/, "");
}

export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[email] RESEND_API_KEY missing; password reset link:", `${appOrigin()}/reset-password?token=${rawToken}`);
    }
    return { ok: false, error: "Email is not configured." };
  }
  const from = process.env.EMAIL_FROM;
  if (!from) {
    return { ok: false, error: "EMAIL_FROM is not set." };
  }
  const url = `${appOrigin()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: "Reset your password",
    html: `<p>We received a request to reset your password.</p><p><a href="${url}">Reset password</a></p><p>If you didn’t ask for this, you can ignore this email.</p>`,
  });
  if (error) {
    console.error("[email] Resend error:", error);
    return { ok: false, error: "Could not send email." };
  }
  return { ok: true };
}

export async function sendLoginOtpEmail(
  to: string,
  code: string
): Promise<{ ok: boolean; error?: string; devBypass?: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[email] RESEND_API_KEY missing; login OTP for", to, ":", code);
      return { ok: true, devBypass: true };
    }
    return { ok: false, error: "Email is not configured." };
  }
  const from = process.env.EMAIL_FROM;
  if (!from) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[email] EMAIL_FROM missing; login OTP for", to, ":", code);
      return { ok: true, devBypass: true };
    }
    return { ok: false, error: "EMAIL_FROM is not set." };
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: "Your sign-in code",
    html: `<p>Your sign-in code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
  });
  if (error) {
    console.error("[email] Resend error:", error);
    return { ok: false, error: "Could not send email." };
  }
  return { ok: true };
}

function formatBookingWhen(start: Date, end: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const endFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return `${fmt.format(start)} – ${endFmt.format(end)}`;
}

export type BookingConfirmationEmailInput = {
  memberEmail: string;
  vendorEmail: string;
  serviceTitle: string;
  vendorName: string;
  memberName: string | null;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  timeZone: string;
  meetLink: string | null;
  calendarHtmlLink: string | null;
  bookingId: string;
};

export async function sendBookingConfirmationEmail(
  input: BookingConfirmationEmailInput,
): Promise<{ ok: boolean; error?: string; devBypass?: boolean }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const when = formatBookingWhen(
    input.scheduledStartAt,
    input.scheduledEndAt,
    input.timeZone,
  );
  const bookingsUrl = `${appOrigin()}/account/bookings`;

  const meetBlock = input.meetLink
    ? `<p><strong>Google Meet:</strong> <a href="${input.meetLink}">${input.meetLink}</a></p>`
    : "";
  const calendarBlock = input.calendarHtmlLink
    ? `<p><a href="${input.calendarHtmlLink}">View in Google Calendar</a></p>`
    : "";

  const memberHtml = `
    <p>Hi${input.memberName ? ` ${input.memberName}` : ""},</p>
    <p>Your booking for <strong>${input.serviceTitle}</strong> with <strong>${input.vendorName}</strong> is confirmed.</p>
    <p><strong>When:</strong> ${when}</p>
    ${meetBlock}
    ${calendarBlock}
    <p>We also sent a Google Calendar invitation to your email when a video session is included.</p>
    <p><a href="${bookingsUrl}">View your bookings</a></p>
  `;

  const vendorHtml = `
    <p>You have a new confirmed booking for <strong>${input.serviceTitle}</strong>.</p>
    <p><strong>Member:</strong> ${input.memberName || input.memberEmail} (${input.memberEmail})</p>
    <p><strong>When:</strong> ${when}</p>
    ${meetBlock}
    ${calendarBlock}
    <p>A calendar invitation was sent to your email when a video session is included.</p>
    <p><a href="${appOrigin()}/account/vendor/bookings">View incoming appointments</a></p>
  `;

  if (!key || !from) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[email] booking confirmation (dev):", {
        member: input.memberEmail,
        vendor: input.vendorEmail,
        when,
        meet: input.meetLink,
      });
      return { ok: true, devBypass: true };
    }
    return { ok: false, error: "Email is not configured." };
  }

  const resend = new Resend(key);
  const subject = `Booking confirmed: ${input.serviceTitle}`;

  const [memberResult, vendorResult] = await Promise.all([
    resend.emails.send({
      from,
      to: [input.memberEmail],
      subject,
      html: memberHtml,
    }),
    resend.emails.send({
      from,
      to: [input.vendorEmail],
      subject: `New booking: ${input.serviceTitle}`,
      html: vendorHtml,
    }),
  ]);

  if (memberResult.error || vendorResult.error) {
    console.error("[email] booking confirmation error:", memberResult.error || vendorResult.error);
    return { ok: false, error: "Could not send booking confirmation email." };
  }

  return { ok: true };
}

export type BookingCancellationEmailInput = {
  memberEmail: string;
  vendorEmail: string;
  serviceTitle: string;
  vendorName: string;
  memberName: string | null;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  timeZone: string;
  cancelledBy: "member" | "vendor";
  reason?: string;
  bookingId: string;
  refundAmountCents?: number;
};

export async function sendBookingCancellationEmail(
  input: BookingCancellationEmailInput,
): Promise<{ ok: boolean; error?: string; devBypass?: boolean }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const when = formatBookingWhen(
    input.scheduledStartAt,
    input.scheduledEndAt,
    input.timeZone,
  );
  const cancelledByLabel = input.cancelledBy === "member" ? "the member" : "the vendor";
  const reasonLine = input.reason?.trim()
    ? `<p><strong>Reason:</strong> ${input.reason.trim()}</p>`
    : "";
  const refundLine =
    input.refundAmountCents != null && input.refundAmountCents > 0
      ? `<p>A full refund of <strong>${formatPrice(input.refundAmountCents)}</strong> has been issued to the member's original payment method. It may take 5–10 business days to appear.</p>`
      : "";

  const memberRefundLine =
    input.refundAmountCents != null && input.refundAmountCents > 0
      ? `<p>A full refund of <strong>${formatPrice(input.refundAmountCents)}</strong> has been issued to your original payment method. It may take 5–10 business days to appear.</p>`
      : "";

  const memberHtml = `
    <p>Hi${input.memberName ? ` ${input.memberName}` : ""},</p>
    <p>Your booking for <strong>${input.serviceTitle}</strong> with <strong>${input.vendorName}</strong> was cancelled by ${cancelledByLabel}.</p>
    <p><strong>Was scheduled for:</strong> ${when}</p>
    ${reasonLine}
    ${memberRefundLine}
    <p><a href="${appOrigin()}/account/bookings">View your bookings</a></p>
  `;

  const vendorHtml = `
    <p>The booking for <strong>${input.serviceTitle}</strong> with <strong>${input.memberName || input.memberEmail}</strong> was cancelled by ${cancelledByLabel}.</p>
    <p><strong>Was scheduled for:</strong> ${when}</p>
    ${reasonLine}
    ${refundLine}
    <p><a href="${appOrigin()}/account/vendor/bookings">View incoming appointments</a></p>
  `;

  if (!key || !from) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[email] booking cancellation (dev):", {
        member: input.memberEmail,
        vendor: input.vendorEmail,
        when,
        cancelledBy: input.cancelledBy,
      });
      return { ok: true, devBypass: true };
    }
    return { ok: false, error: "Email is not configured." };
  }

  const resend = new Resend(key);
  const subject = `Booking cancelled: ${input.serviceTitle}`;

  const [memberResult, vendorResult] = await Promise.all([
    resend.emails.send({
      from,
      to: [input.memberEmail],
      subject,
      html: memberHtml,
    }),
    resend.emails.send({
      from,
      to: [input.vendorEmail],
      subject: `Cancelled: ${input.serviceTitle}`,
      html: vendorHtml,
    }),
  ]);

  if (memberResult.error || vendorResult.error) {
    console.error("[email] booking cancellation error:", memberResult.error || vendorResult.error);
    return { ok: false, error: "Could not send cancellation email." };
  }

  return { ok: true };
}
