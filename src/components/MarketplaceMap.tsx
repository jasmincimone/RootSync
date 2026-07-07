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
};

export function MarketplaceMap({ pins, compact }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
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

    clearLeafletContainer(el);

    const map = L.map(el, { scrollWheelZoom: true }).setView([32.8407, -83.6324], 7);

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
        pin.kind === "vendor" ? discoverVendorPath(pin.id) : discoverDirectoryPath(pin.id);
      const subtitle =
        pin.kind === "vendor" ? "Verified vendor" : "Directory listing";
      const subtitleColor = pin.kind === "vendor" ? "#044730" : "#b8860b";

      marker.bindPopup(
        `<a href="${href}" class="block min-w-[160px] text-fix-text hover:opacity-90" style="color:inherit;text-decoration:none">
          <span style="font-weight:600;color:#2c2416">${name}</span>
          <span style="display:block;margin-top:4px;font-size:0.75rem;color:${subtitleColor}">${subtitle}</span>
          <span style="display:block;margin-top:4px;font-size:0.875rem;font-weight:500;color:#044730">View profile →</span>
        </a>`,
      );
    }

    if (points.length === 0) {
      map.setView([32.8407, -83.6324], 7);
    } else if (points.length === 1) {
      map.setView(points[0], 11);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 });
    }

    return () => {
      map.remove();
      clearLeafletContainer(el);
    };
  }, [pinKey, vendorIcon, directoryIcon]);

  return (
    <div className="overflow-hidden rounded-2xl border border-fix-border/20 shadow-soft">
      <div ref={containerRef} className={`z-0 w-full ${heightClass}`} />
    </div>
  );
}

export type { DiscoverMapPin };
