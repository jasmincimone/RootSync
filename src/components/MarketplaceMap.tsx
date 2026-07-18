"use client";

import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";

import type { DiscoverMapPin } from "@/lib/discoverMap";
import { discoverDirectoryPath, discoverVendorPath } from "@/config/discoverPaths";

const VENDOR_PIN_HTML =
  '<span style="display:block;width:26px;height:26px;border-radius:9999px;background:#044730;border:3px solid #fff;box-shadow:0 2px 10px rgba(52,42,15,.35)"></span>';

const DIRECTORY_PIN_HTML =
  '<span style="display:block;width:24px;height:24px;border-radius:9999px;background:#fff;border:3px solid #b8860b;box-shadow:0 2px 10px rgba(52,42,15,.3)"></span>';

type LeafletElement = HTMLDivElement & { _leaflet_id?: number };

function clearLeafletContainer(el: LeafletElement) {
  if (el._leaflet_id != null) {
    delete el._leaflet_id;
  }
  el.innerHTML = "";
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

type Props = {
  pins: DiscoverMapPin[];
  compact?: boolean;
  buildDetailHref?: (pin: DiscoverMapPin) => string;
};

export function MarketplaceMap({ pins, compact, buildDetailHref }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buildDetailHrefRef = useRef(buildDetailHref);
  buildDetailHrefRef.current = buildDetailHref;

  const heightClass = compact ? "h-[280px] max-h-[40vh]" : "h-[420px] max-h-[55vh]";

  const vendorIcon = useMemo(
    () =>
      L.divIcon({
        className: "marketplace-map-pin",
        html: VENDOR_PIN_HTML,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
        popupAnchor: [0, -26],
      }),
    [],
  );

  const directoryIcon = useMemo(
    () =>
      L.divIcon({
        className: "marketplace-map-pin-directory",
        html: DIRECTORY_PIN_HTML,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24],
      }),
    [],
  );

  const pinKey = useMemo(
    () => pins.map((p) => `${p.kind}:${p.id}:${p.latitude},${p.longitude}`).join("|"),
    [pins],
  );

  useEffect(() => {
    const el = containerRef.current as LeafletElement | null;
    if (!el) return;

    let cancelled = false;
    let map: L.Map | null = null;
    let fitFrame = 0;

    clearLeafletContainer(el);

    try {
      map = L.map(el, { scrollWheelZoom: true }).setView([32.8407, -83.6324], 7);
    } catch (err) {
      console.warn("[MarketplaceMap] failed to create map", err);
      return;
    }

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const points: [number, number][] = [];
    for (const pin of pins) {
      points.push([pin.latitude, pin.longitude]);
      const marker = L.marker([pin.latitude, pin.longitude], {
        icon: pin.kind === "vendor" ? vendorIcon : directoryIcon,
      }).addTo(map);

      const name = escapeHtml(pin.label);
      const href =
        buildDetailHrefRef.current?.(pin) ??
        (pin.kind === "vendor"
          ? discoverVendorPath({ id: pin.id, publicSlug: pin.publicSlug })
          : discoverDirectoryPath(pin.id));
      const subtitle = pin.kind === "vendor" ? "Verified vendor" : "Directory listing";
      const subtitleColor = pin.kind === "vendor" ? "#044730" : "#b8860b";

      marker.bindPopup(
        `<a href="${href}" class="block min-w-[160px] text-fix-text hover:opacity-90" style="color:inherit;text-decoration:none">
          <span style="font-weight:600;color:#2c2416">${name}</span>
          <span style="display:block;margin-top:4px;font-size:0.75rem;color:${subtitleColor}">${subtitle}</span>
          <span style="display:block;margin-top:4px;font-size:0.875rem;font-weight:500;color:#044730">View profile →</span>
        </a>`,
      );
    }

    const activeMap = map;
    const applyView = () => {
      if (cancelled || !activeMap || !el.isConnected) return;
      try {
        activeMap.invalidateSize(false);
        if (points.length === 0) {
          activeMap.setView([32.8407, -83.6324], 7);
        } else if (points.length === 1) {
          activeMap.setView(points[0], 11);
        } else {
          activeMap.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 });
        }
      } catch (err) {
        console.warn("[MarketplaceMap] view update skipped", err);
        if (points[0]) {
          try {
            activeMap.setView(points[0], 10);
          } catch {
            /* map already torn down */
          }
        }
      }
    };

    // Wait a frame so layout has non-zero size — avoids Leaflet `_leaflet_pos` crashes.
    fitFrame = window.requestAnimationFrame(() => {
      fitFrame = window.requestAnimationFrame(applyView);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(fitFrame);
      try {
        activeMap.stop();
        activeMap.remove();
      } catch {
        /* already removed */
      }
      clearLeafletContainer(el);
    };
    // buildDetailHref is read via ref so pin/link updates don't remount the map constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pins covered by pinKey
  }, [pinKey, vendorIcon, directoryIcon]);

  return (
    <div className="overflow-hidden rounded-2xl border border-fix-border/20 shadow-soft">
      <div ref={containerRef} className={`z-0 w-full ${heightClass}`} />
    </div>
  );
}

export type { DiscoverMapPin };
