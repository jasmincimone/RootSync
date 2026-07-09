"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, KeyRound, ShieldCheck, UserRound } from "lucide-react";

import { AccountProfileImageField } from "@/components/AccountProfileImageField";
import {
  AccountSettingsCard,
  accountSettingsInputClass,
  accountSettingsTextareaClass,
} from "@/components/account/AccountSettingsCard";
import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { SettingsSectionTile } from "@/components/account/settings/SettingsSectionTile";
import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { normalizeOtpSixDigits } from "@/lib/auth-tokens";
import { PASSWORD_POLICY_TEXT } from "@/lib/passwordPolicy";
import { TWO_FACTOR_METHOD } from "@/lib/twoFactor";

type SettingsSectionId = "account" | "password" | "two-factor";

const SETTINGS_SECTIONS: {
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: typeof UserRound;
}[] = [
  {
    id: "account",
    label: "Account information",
    description: "Profile, email, and neighborhoods",
    icon: UserRound,
  },
  {
    id: "password",
    label: "Password",
    description: "Update your sign-in password",
    icon: KeyRound,
  },
  {
    id: "two-factor",
    label: "Two-factor authentication",
    description: "Email, SMS, and security consent",
    icon: ShieldCheck,
  },
];

type SettingsState = {
  email: string;
  name: string | null;
  imageUrl: string | null;
  shopNeighborhoods: string | null;
  createdAt: string;
  twoFactorMethod: string;
  phone: string | null;
  phoneVerifiedAt: string | null;
  consentSmsTwoFactorAt: string | null;
  consentEmailTwoFactorAt: string | null;
  smsTwoFactorSignupConsentAt: string | null;
  marketingOptIn: boolean;
  marketingOptInAt: string | null;
  emailOtpConfigured: boolean;
};

export default function AccountSettingsPage() {
  const { update: updateSession } = useSession();
  const [activeSection, setActiveSection] = useState<SettingsSectionId | null>(null);
  const [data, setData] = useState<SettingsState | null>(null);
  const [loadError, setLoadError] = useState("");

  const [nameInput, setNameInput] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [neighborhoodsInput, setNeighborhoodsInput] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityPassword, setSecurityPassword] = useState("");

  const [phoneInput, setPhoneInput] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  /** Set when the last send-code response indicated real Twilio vs local dev bypass (no SMS). */
  const [phoneVerifyDelivery, setPhoneVerifyDelivery] = useState<"sms" | "dev_bypass" | null>(null);
  /** Last Twilio send metadata so the user can confirm the destination and look up logs. */
  const [lastSmsTrace, setLastSmsTrace] = useState<{ sentTo: string; twilioSid?: string } | null>(null);

  const [agreeSmsTwoFactor, setAgreeSmsTwoFactor] = useState(false);
  const [agreeEmailTwoFactor, setAgreeEmailTwoFactor] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [marketingSaving, setMarketingSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removingPhone, setRemovingPhone] = useState(false);

  const [profileLoading, setProfileLoading] = useState(false);
  const [neighborhoodsLoading, setNeighborhoodsLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordErr, setPasswordErr] = useState("");
  const [tfaMsg, setTfaMsg] = useState("");
  const [tfaErr, setTfaErr] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    const res = await fetch("/api/account/settings");
    if (!res.ok) {
      setLoadError("Could not load settings. Try again or sign out and back in.");
      return;
    }
    const j = (await res.json()) as SettingsState;
    setData(j);
    setNameInput(j.name || "");
    setImageUrl(j.imageUrl || "");
    setNeighborhoodsInput(j.shopNeighborhoods || "");
    setPhoneInput(j.phone || "");
    setMarketingOptIn(Boolean(j.marketingOptIn));
    setAgreeEmailTwoFactor(Boolean(j.consentEmailTwoFactorAt));
    setAgreeSmsTwoFactor(Boolean(j.consentSmsTwoFactorAt));
    setNewEmail("");
    setEmailPassword("");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSaveNeighborhoods = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErr("");
    setProfileMsg("");
    setNeighborhoodsLoading(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopNeighborhoods: neighborhoodsInput }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileErr(typeof j.error === "string" ? j.error : "Could not save neighborhoods.");
        setNeighborhoodsLoading(false);
        return;
      }
      setProfileMsg("Saved.");
      await load();
    } catch {
      setProfileErr("Something went wrong. Check your connection and try again.");
    }
    setNeighborhoodsLoading(false);
  };

  const onSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErr("");
    setProfileMsg("");
    setProfileLoading(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileErr(typeof j.error === "string" ? j.error : "Could not save name.");
        setProfileLoading(false);
        return;
      }
      setProfileMsg("Saved.");
      await load();
      await updateSession?.();
    } catch {
      setProfileErr("Something went wrong. Check your connection and try again.");
    }
    setProfileLoading(false);
  };

  const onChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailErr("");
    setEmailMsg("");
    setEmailLoading(true);
    try {
      const res = await fetch("/api/account/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newEmail: newEmail.trim(),
          currentPassword: emailPassword,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailErr(typeof j.error === "string" ? j.error : "Could not update email.");
        setEmailLoading(false);
        return;
      }
      setEmailMsg("Saved. Use your new email next time you sign in.");
      setNewEmail("");
      setEmailPassword("");
      await load();
      await updateSession?.();
    } catch {
      setEmailErr("Something went wrong. Check your connection and try again.");
    }
    setEmailLoading(false);
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErr("");
    setPasswordMsg("");
    if (newPassword !== confirmPassword) {
      setPasswordErr("New passwords do not match.");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordErr(typeof j.error === "string" ? j.error : "Could not update password.");
        setPasswordLoading(false);
        return;
      }
      setPasswordMsg("Saved.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordErr("Something went wrong. Check your connection and try again.");
    }
    setPasswordLoading(false);
  };

  const onSaveMethod = async (twoFactorMethod: string) => {
    setTfaErr("");
    setTfaMsg("");
    setSaving(true);
    try {
      const res = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          twoFactorMethod,
          currentPassword: securityPassword,
          agreeEmailTwoFactor,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTfaErr(typeof j.error === "string" ? j.error : "Could not update two-factor settings.");
        setSaving(false);
        return;
      }
      setTfaMsg("Saved.");
      await load();
    } catch {
      setTfaErr("Something went wrong. Check your connection and try again.");
    }
    setSaving(false);
  };

  const onSaveMarketingPreference = async () => {
    setTfaErr("");
    setTfaMsg("");
    setMarketingSaving(true);
    try {
      const res = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingOptIn }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTfaErr(typeof j.error === "string" ? j.error : "Could not save preference.");
        setMarketingSaving(false);
        return;
      }
      setTfaMsg("Marketing preference saved.");
      void load();
    } catch {
      setTfaErr("Something went wrong. Check your connection and try again.");
    }
    setMarketingSaving(false);
  };

  const onSendCode = async () => {
    setTfaErr("");
    setTfaMsg("");
    setPhoneVerifyDelivery(null);
    setLastSmsTrace(null);
    setSending(true);
    try {
      const res = await fetch("/api/account/phone/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneInput.trim(),
          agreeToSmsTwoFactor: true,
          marketingOptIn,
          currentPassword: securityPassword,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        challengeId?: string;
        smsDelivery?: string;
        sentTo?: string;
        twilioMessageSid?: string;
        error?: string;
      };
      if (!res.ok) {
        setTfaErr(typeof j.error === "string" ? j.error : "Could not send SMS.");
        setSending(false);
        return;
      }
      setChallengeId(j.challengeId || null);
      setVerifyCode("");
      if (j.smsDelivery === "dev_bypass") {
        setPhoneVerifyDelivery("dev_bypass");
        setTfaMsg(
          "No SMS was sent — Twilio is not configured on this server. Open the terminal where you run `next dev`: the verification code was printed there. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER (or TWILIO_MESSAGING_SERVICE_SID) to .env.local to receive real texts."
        );
        void load();
      } else {
        setPhoneVerifyDelivery("sms");
        setLastSmsTrace({
          sentTo: typeof j.sentTo === "string" ? j.sentTo : "",
          twilioSid: typeof j.twilioMessageSid === "string" ? j.twilioMessageSid : undefined,
        });
        setTfaMsg("Check your phone for the 6-digit code.");
        void load();
      }
    } catch {
      setTfaErr("Something went wrong. Check your connection and try again.");
    }
    setSending(false);
  };

  const onVerify = async () => {
    if (!challengeId) return;
    setTfaErr("");
    setTfaMsg("");
    setVerifying(true);
    try {
      const code = normalizeOtpSixDigits(verifyCode);
      const res = await fetch("/api/account/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTfaErr(typeof j.error === "string" ? j.error : "Verification failed.");
        return;
      }
      setChallengeId(null);
      setVerifyCode("");
      setPhoneVerifyDelivery(null);
      setLastSmsTrace(null);
      setTfaMsg("Saved. Your phone is verified.");
      void load();
    } catch {
      setTfaErr("Something went wrong. Check your connection and try again.");
    } finally {
      setVerifying(false);
    }
  };

  const onRemovePhone = async () => {
    if (!window.confirm("Remove this phone number? SMS two-factor will be turned off if it was enabled.")) {
      return;
    }
    setTfaErr("");
    setTfaMsg("");
    setRemovingPhone(true);
    try {
      const res = await fetch("/api/account/phone/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: securityPassword }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTfaErr(typeof j.error === "string" ? j.error : "Could not remove phone.");
        setRemovingPhone(false);
        return;
      }
      setChallengeId(null);
      setVerifyCode("");
      setPhoneVerifyDelivery(null);
      setLastSmsTrace(null);
      setTfaMsg("Saved. Phone number removed.");
      await load();
    } catch {
      setTfaErr("Something went wrong. Check your connection and try again.");
    }
    setRemovingPhone(false);
  };

  const method = data?.twoFactorMethod || TWO_FACTOR_METHOD.NONE;
  const verified = Boolean(data?.phoneVerifiedAt && data?.phone);
  const hasSecurityOtpConsent =
    agreeEmailTwoFactor ||
    Boolean(data?.consentEmailTwoFactorAt) ||
    Boolean(data?.consentSmsTwoFactorAt);

  if (loadError) {
    return <FormFeedback error={loadError} />;
  }
  if (!data) {
    return <p className="text-sm text-fix-text-muted">Loading…</p>;
  }

  const created = new Date(data.createdAt);
  const memberSince = Number.isNaN(created.getTime())
    ? "—"
    : created.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  const activeMeta = SETTINGS_SECTIONS.find((s) => s.id === activeSection);

  return (
    <AccountSubpageBody
      description={
        activeMeta
          ? activeMeta.description
          : "Choose a section to manage your profile, password, and sign-in security."
      }
    >
      {activeSection ? (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setActiveSection(null)}
            className="inline-flex items-center gap-1.5 rounded-full border border-fix-border/15 bg-fix-surface px-3 py-1.5 text-sm font-medium text-fix-text-muted shadow-soft transition-colors hover:bg-fix-bg-muted hover:text-fix-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Account settings
          </button>

          {activeSection === "account" ? (
      <AccountSettingsCard
        id="account-info-heading"
        title="Account information"
        description="Your display name and email used for sign-in and receipts."
      >
          <AccountProfileImageField
            imageUrl={imageUrl}
            displayName={nameInput || data.email}
            onImageUrlChange={(url) => {
              setImageUrl(url);
              void load();
            }}
          />

          <dl className="mt-6 grid gap-3 border-t border-fix-border/15 pt-6 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-fix-text-muted">Member since</dt>
              <dd className="mt-0.5 font-medium text-fix-text">{memberSince}</dd>
            </div>
            <div>
              <dt className="text-fix-text-muted">Sign-in email</dt>
              <dd className="mt-0.5 break-all font-medium text-fix-text">{data.email}</dd>
            </div>
          </dl>

          <form onSubmit={onSaveName} className="mt-6 space-y-3 border-t border-fix-border/15 pt-6">
            <div>
              <label htmlFor="profile-name" className="block text-sm font-medium text-fix-text">
                Display name
              </label>
              <input
                id="profile-name"
                type="text"
                autoComplete="name"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  setProfileMsg("");
                  setProfileErr("");
                }}
                className={accountSettingsInputClass}
                placeholder="Your name"
              />
            </div>
            <FormFeedback success={profileMsg || null} error={profileErr || null} />
            <Button type="submit" size="sm" variant="primary" disabled={profileLoading}>
              {profileLoading ? "Saving…" : "Save name"}
            </Button>
          </form>

          <form onSubmit={onSaveNeighborhoods} className="mt-6 space-y-3 border-t border-fix-border/15 pt-6">
            <div>
              <label htmlFor="profile-neighborhoods" className="block text-sm font-medium text-fix-text">
                Local neighborhoods
              </label>
              <p className="mt-0.5 text-xs text-fix-text-muted">
                Areas where you shop or want to shop locally — shown on your member profile.
              </p>
              <textarea
                id="profile-neighborhoods"
                rows={3}
                value={neighborhoodsInput}
                onChange={(e) => {
                  setNeighborhoodsInput(e.target.value);
                  setProfileMsg("");
                  setProfileErr("");
                }}
                className={accountSettingsTextareaClass}
                placeholder="e.g. East Austin, Mueller, Downtown"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary" disabled={neighborhoodsLoading}>
              {neighborhoodsLoading ? "Saving…" : "Save neighborhoods"}
            </Button>
          </form>

          <form onSubmit={onChangeEmail} className="mt-6 space-y-3 border-t border-fix-border/15 pt-6">
            <p className="text-sm text-fix-text-muted">
              To change your sign-in email, enter the new address and your current password.
            </p>
            <div>
              <label htmlFor="new-email" className="block text-sm font-medium text-fix-text">
                New email
              </label>
              <input
                id="new-email"
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setEmailMsg("");
                  setEmailErr("");
                }}
                className={accountSettingsInputClass}
                placeholder="new@example.com"
              />
            </div>
            <div>
              <label htmlFor="email-current-pw" className="block text-sm font-medium text-fix-text">
                Current password
              </label>
              <input
                id="email-current-pw"
                type="password"
                autoComplete="current-password"
                value={emailPassword}
                onChange={(e) => {
                  setEmailPassword(e.target.value);
                  setEmailMsg("");
                  setEmailErr("");
                }}
                className={accountSettingsInputClass}
              />
            </div>
            <FormFeedback success={emailMsg || null} error={emailErr || null} />
            <Button type="submit" size="sm" variant="secondary" disabled={emailLoading}>
              {emailLoading ? "Saving…" : "Update email"}
            </Button>
          </form>
      </AccountSettingsCard>
          ) : null}

          {activeSection === "password" ? (
      <AccountSettingsCard
        id="password-heading"
        title="Password"
        description="Use a strong password you don't reuse on other sites. Forgot your password? Use the link on the sign-in page."
      >
          <form onSubmit={onChangePassword} className="max-w-md space-y-3">
            <div>
              <label htmlFor="pw-current" className="block text-sm font-medium text-fix-text">
                Current password
              </label>
              <input
                id="pw-current"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordMsg("");
                  setPasswordErr("");
                }}
                className={accountSettingsInputClass}
              />
            </div>
            <div>
              <label htmlFor="pw-new" className="block text-sm font-medium text-fix-text">
                New password
              </label>
              <input
                id="pw-new"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordMsg("");
                  setPasswordErr("");
                }}
                className={accountSettingsInputClass}
                minLength={12}
              />
              <p className="mt-0.5 text-xs text-fix-text-muted">{PASSWORD_POLICY_TEXT}</p>
            </div>
            <div>
              <label htmlFor="pw-confirm" className="block text-sm font-medium text-fix-text">
                Confirm new password
              </label>
              <input
                id="pw-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordMsg("");
                  setPasswordErr("");
                }}
                className={accountSettingsInputClass}
                minLength={12}
              />
            </div>
            <FormFeedback success={passwordMsg || null} error={passwordErr || null} />
            <Button type="submit" size="sm" variant="primary" disabled={passwordLoading}>
              {passwordLoading ? "Saving…" : "Update password"}
            </Button>
          </form>
      </AccountSettingsCard>
          ) : null}

          {activeSection === "two-factor" ? (
      <AccountSettingsCard
        id="two-factor-heading"
        title="Two-factor authentication"
        description="Add a second step after your password: a code by email or SMS. Choose None to turn it off or start over."
      >
          <div>
          <h3 className="text-sm font-semibold text-fix-heading">Sign-in method</h3>
          <p className="mt-2 text-sm text-fix-text-muted">
            After your password, we&apos;ll ask for a one-time code. <strong>None</strong> resets two-factor to
            password-only sign-in.
          </p>
          {!data.emailOtpConfigured ? (
            <p className="mt-2 rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-fix-text">
              Email code delivery is not configured on this server. Add <code>RESEND_API_KEY</code> and{" "}
              <code>EMAIL_FROM</code> to your environment, then restart/redeploy.
            </p>
          ) : null}
          <div className="mt-4 max-w-md">
            <label htmlFor="security-current-password" className="block text-sm font-medium text-fix-text">
              Current password (required for security changes)
            </label>
            <input
              id="security-current-password"
              type="password"
              autoComplete="current-password"
              value={securityPassword}
              onChange={(e) => {
                setSecurityPassword(e.target.value);
                setTfaErr("");
                setTfaMsg("");
              }}
              className={accountSettingsInputClass}
            />
          </div>
          <p className="mt-3 max-w-lg text-xs text-fix-text-muted">
            To use <strong>Email code</strong> sign-in, agree to security codes by email below (or complete SMS
            verification with SMS security consent—either counts for now).
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              size="sm"
              variant={method === TWO_FACTOR_METHOD.NONE ? "primary" : "secondary"}
              disabled={saving || !securityPassword}
              title={!securityPassword ? "Enter current password first" : undefined}
              onClick={() => void onSaveMethod(TWO_FACTOR_METHOD.NONE)}
            >
              None
            </Button>
            <Button
              type="button"
              size="sm"
              variant={method === TWO_FACTOR_METHOD.EMAIL ? "primary" : "secondary"}
              disabled={saving || !securityPassword || !hasSecurityOtpConsent || !data.emailOtpConfigured}
              title={
                !securityPassword
                  ? "Enter current password first"
                  : !hasSecurityOtpConsent
                    ? "Agree to email or SMS security codes below first"
                    : !data.emailOtpConfigured
                      ? "Configure RESEND_API_KEY and EMAIL_FROM first"
                      : undefined
              }
              onClick={() => void onSaveMethod(TWO_FACTOR_METHOD.EMAIL)}
            >
              Email code
            </Button>
            <Button
              type="button"
              size="sm"
              variant={method === TWO_FACTOR_METHOD.SMS ? "primary" : "secondary"}
              disabled={saving || !verified || !securityPassword}
              onClick={() => void onSaveMethod(TWO_FACTOR_METHOD.SMS)}
              title={!verified ? "Verify a phone number first" : !securityPassword ? "Enter current password first" : undefined}
            >
              SMS code
            </Button>
          </div>
          {!verified && method === TWO_FACTOR_METHOD.SMS && (
            <p className="mt-2 text-xs text-bark">Verify your phone below before SMS two-factor can stay enabled.</p>
          )}
          </div>

          <div className="pt-2">
          <h3 className="text-sm font-semibold text-fix-heading">Phone number &amp; SMS consent</h3>
          <p className="mt-2 text-sm text-fix-text-muted">
            Add a phone number to use SMS verification and SMS two-factor. Review the agreements in the highlighted
            box first—then enter your number and request a code.
          </p>
          {data.smsTwoFactorSignupConsentAt ? (
            <p className="mt-2 text-xs text-fix-text-muted">
              You agreed to SMS/2FA terms when you created this account (record on file).
            </p>
          ) : null}
          <div className="mt-4 max-w-lg space-y-3 rounded-lg border-2 border-amber/40 bg-amber/5 p-4">
            <p className="text-sm font-semibold text-fix-heading">Security codes: email and SMS consent</p>
            <p className="text-xs leading-relaxed text-fix-text-muted">
              One-time sign-in codes go to your email or phone depending on your two-factor method. For now, agreeing to{" "}
              <strong>either</strong> email or SMS security messages satisfies the requirement for email-code sign-in;
              you can record both if you use both channels.
            </p>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-fix-text">
              <input
                type="checkbox"
                checked={agreeSmsTwoFactor}
                onChange={(e) => {
                  setAgreeSmsTwoFactor(e.target.checked);
                  setTfaErr("");
                  setTfaMsg("");
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-fix-border/40 text-amber focus:ring-amber"
              />
              <span>
                I agree to receive SMS/text messages for <strong>account security</strong> (phone verification and sign-in
                codes) and two-factor authentication when enabled. Message and data rates may apply.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-fix-text">
              <input
                type="checkbox"
                checked={agreeEmailTwoFactor}
                onChange={(e) => {
                  setAgreeEmailTwoFactor(e.target.checked);
                  setTfaErr("");
                  setTfaMsg("");
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-fix-border/40 text-amber focus:ring-amber"
              />
              <span>
                I agree to receive <strong>one-time security sign-in codes by email</strong> when email two-factor is
                enabled or when we send a code to your sign-in address for account security.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-fix-text">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => {
                  setMarketingOptIn(e.target.checked);
                  setTfaErr("");
                  setTfaMsg("");
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-fix-border/40 text-amber focus:ring-amber"
              />
              <span>
                I want to receive <strong>optional marketing, promotional, and educational</strong> emails and texts from
                RootSync. I can change this anytime here.
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2 border-t border-amber/20 pt-3">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={marketingSaving}
                onClick={() => void onSaveMarketingPreference()}
              >
                {marketingSaving ? "Saving…" : "Save marketing preference only"}
              </Button>
              <span className="text-xs text-fix-text-muted">
                (Sending a verification code also saves your marketing choice.)
              </span>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <div>
              <label htmlFor="settings-phone" className="block text-sm font-medium text-fix-text">
                Phone number
              </label>
              <p className="mt-0.5 text-xs text-fix-text-muted">
                Use <strong>+1</strong> and country code (e.g. <code className="text-xs">+15551234567</code>) or a{" "}
                <strong>10-digit US/CA</strong> number.
              </p>
              <input
                id="settings-phone"
                type="tel"
                autoComplete="tel"
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value);
                  setTfaMsg("");
                  setTfaErr("");
                }}
                placeholder="+15551234567 or 5551234567"
                className={accountSettingsInputClass}
              />
            </div>
            {data.phoneVerifiedAt && data.phone && (
              <p className="text-xs text-fix-text-muted">Verified: {data.phone}</p>
            )}
            <p className="text-xs text-fix-text-muted">
              Requesting a new code replaces the previous one — always use the latest text.
            </p>
            {phoneVerifyDelivery === "sms" && lastSmsTrace?.sentTo ? (
              <details className="max-w-lg rounded-md border border-fix-border/25 bg-fix-surface/60 px-3 py-2 text-xs text-fix-text-muted">
                <summary className="cursor-pointer font-medium text-fix-text">
                  Not receiving the text?
                </summary>
                <ul className="mt-2 list-disc space-y-1.5 pl-4">
                  <li>
                    We requested delivery to{" "}
                    <strong className="text-fix-text">{lastSmsTrace.sentTo}</strong>. Confirm that matches the device you
                    are checking.
                  </li>
                  <li>
                    <strong>Twilio trial:</strong> add that exact number under{" "}
                    <span className="whitespace-nowrap">Phone Numbers → Manage → Verified Caller IDs</span> in Twilio, or
                    the message will not be delivered.
                  </li>
                  <li>
                    In{" "}
                    <a
                      href="https://console.twilio.com/us1/monitor/logs/sms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fix-link hover:text-fix-link-hover"
                    >
                      Twilio → Monitor → Messaging logs
                    </a>
                    , search for your message
                    {lastSmsTrace.twilioSid ? (
                      <>
                        {" "}
                        (SID{" "}
                        <code className="rounded bg-fix-surface px-1 text-[0.7rem]">{lastSmsTrace.twilioSid}</code>)
                      </>
                    ) : null}
                    . Status <code className="text-[0.7rem]">undelivered</code> or an error code explains carrier
                    rejection (A2P/10DLC, blocked, etc.).
                  </li>
                </ul>
              </details>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={sending || !agreeSmsTwoFactor || !securityPassword}
                title={
                  !agreeSmsTwoFactor
                    ? "Check the box to agree to security SMS first"
                    : !securityPassword
                      ? "Enter current password first"
                      : undefined
                }
                onClick={() => void onSendCode()}
              >
                {sending ? "Sending…" : "Send verification code"}
              </Button>
              {(data.phone || data.phoneVerifiedAt) && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={removingPhone || !securityPassword}
                  title={!securityPassword ? "Enter current password first" : undefined}
                  onClick={() => void onRemovePhone()}
                >
                  {removingPhone ? "Removing…" : "Remove phone"}
                </Button>
              )}
            </div>
            {challengeId && (
              <div className="max-w-md space-y-3">
                {phoneVerifyDelivery === "dev_bypass" ? (
                  <p className="rounded-md border border-amber/50 bg-amber/10 px-3 py-2 text-sm text-fix-text">
                    The code is in your <strong>dev server terminal</strong> (not in Messages). Look for{" "}
                    <code className="rounded bg-fix-surface px-1 text-xs">[sms] Twilio not configured</code> and the line
                    with your code.
                  </p>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label htmlFor="phone-code" className="block text-xs font-medium text-fix-text">
                      {phoneVerifyDelivery === "dev_bypass" ? "Verification code" : "Code from SMS"}
                    </label>
                    <input
                      id="phone-code"
                      type="text"
                      inputMode="numeric"
                      value={verifyCode}
                      onChange={(e) => {
                        setVerifyCode(e.target.value);
                        setTfaMsg("");
                        setTfaErr("");
                      }}
                      className={accountSettingsInputClass}
                      placeholder="6-digit code"
                    />
                  </div>
                  <Button type="button" size="sm" variant="primary" disabled={verifying} onClick={() => void onVerify()}>
                    {verifying ? "Verifying…" : "Verify phone"}
                  </Button>
                </div>
              </div>
            )}
          </div>
          </div>

        <FormFeedback success={tfaMsg || null} error={tfaErr || null} />
      </AccountSettingsCard>
          ) : null}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {SETTINGS_SECTIONS.map((section) => (
              <SettingsSectionTile
                key={section.id}
                label={section.label}
                description={section.description}
                icon={section.icon}
                onClick={() => setActiveSection(section.id)}
              />
            ))}
          </div>
          <p className="text-center text-sm text-fix-text-muted">
            Tap a section to view and update your settings.
          </p>
        </div>
      )}
    </AccountSubpageBody>
  );
}
