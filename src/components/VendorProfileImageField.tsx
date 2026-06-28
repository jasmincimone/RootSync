"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";

import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/ui/FormFeedback";

type Props = {
  imageUrl: string;
  displayName: string;
  onImageUrlChange: (url: string) => void;
  disabled?: boolean;
};

export function VendorProfileImageField({
  imageUrl,
  displayName,
  onImageUrlChange,
  disabled = false,
}: Props) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/vendor/profile/avatar/upload", {
        method: "POST",
        body: fd,
      });
      const raw = await res.text();
      let data: { url?: string; error?: string; hint?: string } = {};
      if (raw) {
        try {
          data = JSON.parse(raw) as typeof data;
        } catch {
          throw new Error(`Upload failed (${res.status}).`);
        }
      }
      if (!res.ok) {
        throw new Error([data.error, data.hint].filter(Boolean).join(" ") || "Upload failed.");
      }
      if (!data.url) {
        throw new Error("Upload succeeded but no URL was returned.");
      }
      onImageUrlChange(data.url);
      setSuccess("Profile photo saved.");
      await updateSession();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-fix-heading">Profile photo</div>
      <p className="text-xs text-fix-text-muted">
        Shown on your marketplace vendor page and in the site header when you are signed in.
        JPEG, PNG, WebP, or GIF · max 5 MB.
      </p>
      <FormFeedback success={success} error={error} />
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar src={imageUrl} name={displayName} size="xl" />
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={disabled || uploading}
            onChange={onFileChange}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                Uploading…
              </>
            ) : (
              <>
                <ImagePlus className="mr-1.5 h-4 w-4" aria-hidden />
                {imageUrl ? "Change photo" : "Upload photo"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
