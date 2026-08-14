"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { VendorProfileImageField } from "@/components/VendorProfileImageField";
import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/ui/FormFeedback";

type Profile = {
  displayName: string;
  publicSlug: string | null;
  profileImageUrl: string | null;
  bio: string | null;
  contactEmail: string | null;
  pickupLocation: string | null;
  website: string | null;
  shippingFlatCents: number | null;
  offersLocalPickup: boolean;
  latitude: number | null;
  longitude: number | null;
};

export function VendorProfileForm({ initial }: { initial: Profile }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [publicSlug, setPublicSlug] = useState(initial.publicSlug ?? "");
  const [profileImageUrl, setProfileImageUrl] = useState(initial.profileImageUrl ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [contactEmail, setContactEmail] = useState(initial.contactEmail ?? "");
  const [pickupLocation, setPickupLocation] = useState(initial.pickupLocation ?? "");
  const [website, setWebsite] = useState(initial.website ?? "");
  const [shippingDollars, setShippingDollars] = useState(
    initial.shippingFlatCents != null ? (initial.shippingFlatCents / 100).toFixed(2) : "",
  );
  const [offersLocalPickup, setOffersLocalPickup] = useState(initial.offersLocalPickup);
  const [latitude, setLatitude] = useState(
    initial.latitude != null ? String(initial.latitude) : ""
  );
  const [longitude, setLongitude] = useState(
    initial.longitude != null ? String(initial.longitude) : ""
  );
  const [city, setCity] = useState("");
  const [stateUs, setStateUs] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeHint, setGeocodeHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [geoSuccess, setGeoSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleGeocodeLookup() {
    setError(null);
    setGeoSuccess(null);
    setGeocodeHint(null);
    setGeocoding(true);
    try {
      const res = await fetch("/api/vendor/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, state: stateUs }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Lookup failed.");
        return;
      }
      if (typeof data.latitude === "number" && typeof data.longitude === "number") {
        setLatitude(String(data.latitude));
        setLongitude(String(data.longitude));
        setGeocodeHint(
          typeof data.label === "string"
            ? `Approximate location: ${data.label}`
            : "Coordinates filled in below — save your profile to use them on the map."
        );
        setGeoSuccess("Submitted. Coordinates are filled in below — save your profile to keep them.");
      }
    } catch {
      setError("Lookup failed. Check your connection and try again.");
    } finally {
      setGeocoding(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaveSuccess(null);
    setSaving(true);
    try {
      let shippingFlatCents: number | null = null;
      const shippingTrim = shippingDollars.trim();
      if (shippingTrim !== "") {
        const dollars = Number.parseFloat(shippingTrim);
        if (!Number.isFinite(dollars) || dollars < 0 || dollars > 10_000) {
          setError("Standard shipping must be between $0 and $10,000.");
          setSaving(false);
          return;
        }
        shippingFlatCents = Math.round(dollars * 100);
      }

      const res = await fetch("/api/vendor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          publicSlug,
          bio,
          contactEmail,
          pickupLocation,
          website: website.trim() === "" ? null : website.trim(),
          shippingFlatCents,
          offersLocalPickup,
          latitude: latitude.trim() === "" ? null : latitude.trim(),
          longitude: longitude.trim() === "" ? null : longitude.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed.");
        setSaving(false);
        return;
      }
      setSaveSuccess("Saved.");
      router.refresh();
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
      <FormFeedback success={saveSuccess} error={error} />
      <div className="rounded-xl border border-fix-border/15 bg-fix-bg-muted/40 p-4">
        <label htmlFor="publicSlug" className="block text-sm font-medium text-fix-heading">
          Profile URL
        </label>
        <p className="mt-1 text-xs text-fix-text-muted">
          Claim a short link for your storefront. Leave blank to use the default Discover link.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="shrink-0 text-sm text-fix-text-muted">rootsync.io/</span>
          <input
            id="publicSlug"
            value={publicSlug}
            onChange={(e) => setPublicSlug(e.target.value)}
            placeholder="thefixurbanroots"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text sm:min-w-0 sm:flex-1"
          />
        </div>
        <p className="mt-2 text-xs text-fix-text-muted">
          Lowercase letters, numbers, and hyphens only. Example:{" "}
          <span className="font-medium text-fix-heading">thefixurbanroots</span>. Your longer
          Discover URL (/discover/vendors/…) keeps working too.
        </p>
      </div>
      <VendorProfileImageField
        imageUrl={profileImageUrl}
        displayName={displayName}
        onImageUrlChange={setProfileImageUrl}
        disabled={saving}
      />
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-fix-text">
          Display name
        </label>
        <input
          id="displayName"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text"
        />
      </div>
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-fix-text">
          About
        </label>
        <textarea
          id="bio"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text"
        />
      </div>
      <div>
        <label htmlFor="contactEmail" className="block text-sm font-medium text-fix-text">
          Contact email
        </label>
        <input
          id="contactEmail"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text"
        />
      </div>
      <div>
        <label htmlFor="pickupLocation" className="block text-sm font-medium text-fix-text">
          Pickup / region
        </label>
        <input
          id="pickupLocation"
          value={pickupLocation}
          onChange={(e) => setPickupLocation(e.target.value)}
          className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text"
        />
        <p className="mt-1 text-xs text-fix-text-muted">
          Shown on your vendor page and used as the Local pickup label at checkout when enabled.
        </p>
      </div>
      <div className="rounded-xl border border-fix-border/15 bg-fix-bg-muted/40 p-4 space-y-4">
        <div>
          <div className="text-sm font-medium text-fix-heading">Product shipping</div>
          <p className="mt-1 text-xs text-fix-text-muted">
            Buyers choose <strong className="font-medium text-fix-heading">Pickup / in person</strong> or{" "}
            <strong className="font-medium text-fix-heading">Ship / deliver</strong> before checkout.
            This is your default ship rate — leave blank for $0. Heavy listings can override it under
            Product details.
          </p>
        </div>
        <div>
          <label htmlFor="shippingFlat" className="block text-sm font-medium text-fix-text">
            Standard shipping (USD)
          </label>
          <input
            id="shippingFlat"
            type="text"
            inputMode="decimal"
            placeholder="e.g. 8.00"
            value={shippingDollars}
            onChange={(e) => setShippingDollars(e.target.value)}
            className="mt-1 w-full max-w-xs rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text"
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-fix-text">
          <input
            type="checkbox"
            checked={offersLocalPickup}
            onChange={(e) => setOffersLocalPickup(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Offer <strong className="font-medium text-fix-heading">Local pickup</strong> ($0) at
            checkout
          </span>
        </label>
      </div>
      <div>
        <label htmlFor="website" className="block text-sm font-medium text-fix-text">
          Website (optional)
        </label>
        <input
          id="website"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="https://yourfarm.com"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text"
        />
        <p className="mt-1 text-xs text-fix-text-muted">
          Shown on the marketplace vendor section. Use https when possible.
        </p>
      </div>
      <div className="rounded-xl border border-fix-border/15 bg-fix-bg-muted/40 p-4">
        <div className="text-sm font-medium text-fix-heading">City and state (US)</div>
        <p className="mt-1 text-xs text-fix-text-muted">
          We look up an approximate center point for your area and fill in latitude and longitude
          below. You can still edit those numbers by hand.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="geoCity" className="block text-sm font-medium text-fix-text">
              City
            </label>
            <input
              id="geoCity"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Austin"
              className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text"
            />
          </div>
          <div>
            <label htmlFor="geoState" className="block text-sm font-medium text-fix-text">
              State
            </label>
            <input
              id="geoState"
              value={stateUs}
              onChange={(e) => setStateUs(e.target.value)}
              placeholder="e.g. TX or Texas"
              className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text"
            />
          </div>
        </div>
        <div className="mt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={geocoding}
            onClick={handleGeocodeLookup}
          >
            {geocoding ? "Looking up…" : "Look up coordinates"}
          </Button>
        </div>
        <FormFeedback className="mt-2" success={geoSuccess} />
        {geocodeHint ? (
          <p className="mt-2 text-xs text-fix-text-muted">{geocodeHint}</p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="latitude" className="block text-sm font-medium text-fix-text">
            Map latitude (optional)
          </label>
          <input
            id="latitude"
            inputMode="decimal"
            placeholder="e.g. 40.7128"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text"
          />
          <p className="mt-1 text-xs text-fix-text-muted">Decimal degrees (WGS84) for your map pin.</p>
        </div>
        <div>
          <label htmlFor="longitude" className="block text-sm font-medium text-fix-text">
            Map longitude (optional)
          </label>
          <input
            id="longitude"
            inputMode="decimal"
            placeholder="e.g. -74.006"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text"
          />
          <p className="mt-1 text-xs text-fix-text-muted">Leave blank to hide your pin from the map.</p>
        </div>
      </div>
      <Button type="submit" disabled={saving} variant="cta" size="sm">
        {saving ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
