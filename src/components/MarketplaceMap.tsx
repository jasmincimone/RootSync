"use client";

import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";

export type MarketplaceMapVendor = {
  id: string;
  displayName: string;
  latitude: number;
  longitude: number;
};

const PIN_HTML =
  '<span style="display:block;width:26px;height:26px;border-radius:9999px;background:#044730;border:3px solid #fff;box-shadow:0 2px 10px rgba(52,42,15,.35)"></span>';

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
  vendors: MarketplaceMapVendor[];
  compact?: boolean;
};

export function MarketplaceMap({ vendors, compact }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const heightClass = compact ? "h-[280px] max-h-[40vh]" : "h-[420px] max-h-[55vh]";

  const pinIcon = useMemo(
    () =>
      L.divIcon({
        className: "marketplace-map-pin",
        html: PIN_HTML,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
        popupAnchor: [0, -26],
      }),
    []
  );

  const vendorKey = useMemo(
    () => vendors.map((v) => `${v.id}:${v.latitude},${v.longitude}`).join("|"),
    [vendors]
  );

  useEffect(() => {
    const el = containerRef.current as LeafletElement | null;
    if (!el) return;

    clearLeafletContainer(el);

    const map = L.map(el, { scrollWheelZoom: true }).setView([39.8283, -98.5795], 4);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const points: [number, number][] = [];
    for (const vendor of vendors) {
      points.push([vendor.latitude, vendor.longitude]);
      const marker = L.marker([vendor.latitude, vendor.longitude], { icon: pinIcon }).addTo(
        map
      );
      const name = escapeHtml(vendor.displayName);
      const href = `/discover/vendors/${vendor.id}`;
      marker.bindPopup(
        `<a href="${href}" class="block min-w-[160px] text-fix-text hover:opacity-90" style="color:inherit;text-decoration:none">
          <span style="font-weight:600;color:#2c2416">${name}</span>
          <span style="display:block;margin-top:4px;font-size:0.875rem;font-weight:500;color:#044730">View profile →</span>
        </a>`
      );
    }

    if (points.length === 0) {
      map.setView([39.8283, -98.5795], 4);
    } else if (points.length === 1) {
      map.setView(points[0], 11);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 });
    }

    return () => {
      map.remove();
      clearLeafletContainer(el);
    };
  }, [vendorKey, pinIcon]);

  return (
    <div className="overflow-hidden rounded-2xl border border-fix-border/20 shadow-soft">
      <div ref={containerRef} className={`z-0 w-full ${heightClass}`} />
    </div>
  );
}
