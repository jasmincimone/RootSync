"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { ShopCarouselEditor } from "@/components/ShopCarouselEditor";
import type { ShopMediaCarouselItem } from "@/config/shopMediaCarousel";

type CarouselInitial = {
  canEdit: boolean;
  vendorProfileId: string;
  shopName: string;
  publicUrl: string;
  mediaCarousel: ShopMediaCarouselItem[];
};

async function readJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) {
    return {};
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      res.ok
        ? "Server returned an invalid response."
        : `Request failed (${res.status}). Try refreshing the page.`,
    );
  }
}

type Props = {
  initial?: CarouselInitial;
};

export function VendorShopCarouselForm({ initial }: Props) {
  const [vendorProfileId, setVendorProfileId] = useState<string | null>(
    initial?.vendorProfileId ?? null,
  );
  const [shopName, setShopName] = useState<string | null>(initial?.shopName ?? null);
  const [publicUrl, setPublicUrl] = useState<string | null>(initial?.publicUrl ?? null);
  const [items, setItems] = useState<ShopMediaCarouselItem[]>(initial?.mediaCarousel ?? []);
  const [canEdit, setCanEdit] = useState(initial?.canEdit ?? false);
  const [loading, setLoading] = useState(!initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vendor/shop-page/carousel");
      const data = await readJsonResponse(res);
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to load carousel");
      }

      setCanEdit(!!data.canEdit);
      setVendorProfileId(typeof data.vendorProfileId === "string" ? data.vendorProfileId : null);
      setShopName(typeof data.shopName === "string" ? data.shopName : null);
      setPublicUrl(typeof data.publicUrl === "string" ? data.publicUrl : null);
      setItems(Array.isArray(data.mediaCarousel) ? (data.mediaCarousel as ShopMediaCarouselItem[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading carousel");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initial) {
      void load();
    }
  }, [initial, load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/vendor/shop-page/carousel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaCarousel: items }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Save failed");
      }
      setSuccess("Carousel saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-fix-text-muted">Loading your vendor page…</p>;
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-fix-heading">Vendor page carousel</h3>
        <p className="mt-1 text-xs text-fix-text-muted">
          Images and videos on your public marketplace vendor profile
          {shopName ? ` (${shopName})` : ""}.
          {publicUrl ? (
            <>
              {" "}
              Preview at{" "}
              <a href={publicUrl} className="text-fix-link hover:text-fix-link-hover">
                {publicUrl}
              </a>
            </>
          ) : null}
        </p>
      </div>

      <FormFeedback success={success} error={error} />

      {canEdit ? (
        <>
          <ShopCarouselEditor
            uploadEndpoint="/api/vendor/shop-page/media/upload"
            items={items}
            onChange={setItems}
            disabled={saving}
          />
          <Button type="submit" variant="cta" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save carousel"}
          </Button>
        </>
      ) : (
        <p className="text-xs text-fix-text-muted">
          Carousel editing is available after your vendor application is approved.
          {vendorProfileId ? (
            <>
              {" "}
              If you were approved already, refresh the page or sign out and back in, then try again.
            </>
          ) : null}
        </p>
      )}
    </form>
  );
}
