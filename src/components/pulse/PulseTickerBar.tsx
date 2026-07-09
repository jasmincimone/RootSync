"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Settings2 } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { PulseDashboardManager } from "@/components/pulse/PulseDashboardManager";
import { PulseIcon } from "@/components/pulse/PulseIcon";
import type { DashboardWidgetRow, TickerItem } from "@/lib/pulse/ticker";
import { cn } from "@/lib/cn";

type Props = {
  platformItems: TickerItem[];
  personalItems: TickerItem[];
  isAdmin: boolean;
};

function TickerChip({
  item,
  active,
  onSelect,
}: {
  item: TickerItem;
  active: boolean;
  onSelect: (item: TickerItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded px-2.5 py-1 text-left transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/60",
        active && "bg-white/15",
        item.highlight && "font-medium",
      )}
      aria-pressed={active}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-clay/70">{item.label}</span>
      <span className="text-sm font-semibold text-clay">{item.value}</span>
      {item.sub ? <span className="hidden text-xs text-clay/60 sm:inline">{item.sub}</span> : null}
    </button>
  );
}

function TickerTrack({ items, activeKey, onSelect }: {
  items: TickerItem[];
  activeKey: string | null;
  onSelect: (item: TickerItem) => void;
}) {
  if (items.length === 0) return null;

  const shouldScroll = items.length > 4;
  const displayItems = shouldScroll ? [...items, ...items] : items;

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      <div
        className={cn(
          "flex w-max items-center gap-1 py-0.5",
          shouldScroll && "pulse-ticker-track",
        )}
      >
        {displayItems.map((item, i) => (
          <TickerChip
            key={`${item.key}-${i}`}
            item={item}
            active={activeKey === item.key && i < items.length}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

export function PulseTickerBar({ platformItems, personalItems, isAdmin }: Props) {
  const pathname = usePathname() || "/";
  const panelId = useId();
  const barRef = useRef<HTMLDivElement>(null);

  const isAccount = pathname.startsWith("/account");
  const hideBar = pathname === "/menu" || pathname.startsWith("/login");

  const [selected, setSelected] = useState<TickerItem | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);

  const closePanels = useCallback(() => {
    setSelected(null);
    setPanelOpen(false);
    setManagerOpen(false);
  }, []);

  const handleSelect = useCallback((item: TickerItem) => {
    setManagerOpen(false);
    setSelected((prev) => {
      if (prev?.key === item.key) {
        setPanelOpen(false);
        return null;
      }
      setPanelOpen(true);
      return item;
    });
  }, []);

  useEffect(() => {
    closePanels();
  }, [pathname, closePanels]);

  useEffect(() => {
    if (!panelOpen && !managerOpen) return;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!barRef.current?.contains(e.target as Node)) {
        closePanels();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [panelOpen, managerOpen, closePanels]);

  if (hideBar) return null;

  const hasPersonal = personalItems.length > 0;
  const primaryPersonal = hasPersonal ? personalItems[0] : null;
  const scrollItems = hasPersonal
    ? isAccount
      ? [...personalItems.slice(1), ...platformItems]
      : platformItems
    : platformItems;
  const panelItems = hasPersonal ? [...personalItems, ...platformItems] : platformItems;

  return (
    <div ref={barRef} className="border-b border-forest/40 bg-forest text-clay">
      <div className="flex h-9 items-stretch">
        {hasPersonal && primaryPersonal ? (
          <div className="flex shrink-0 items-center gap-2 border-r border-white/15 bg-bark/40 px-3">
            <PulseIcon size={16} alt="" className="shrink-0 opacity-90" />
            <button
              type="button"
              onClick={() => handleSelect(primaryPersonal)}
              className="inline-flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-clay/70">
                {primaryPersonal.label}
              </span>
              <span className="text-sm font-bold text-amber">{primaryPersonal.value}</span>
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5 border-r border-white/15 px-3">
            <PulseIcon size={16} alt="" className="shrink-0 opacity-90" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-clay/80">
              Ecosystem
            </span>
          </div>
        )}

        <TickerTrack
          items={scrollItems}
          activeKey={selected?.key ?? null}
          onSelect={handleSelect}
        />

        <div className="flex shrink-0 items-stretch border-l border-white/15">
          {isAdmin ? (
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setPanelOpen(false);
                setManagerOpen((o) => !o);
              }}
              className="inline-flex h-full items-center px-2.5 text-clay/80 hover:bg-white/10 hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
              aria-label="Manage dashboard widgets"
              aria-expanded={managerOpen}
            >
              <Settings2 className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setManagerOpen(false);
              if (panelOpen && !selected) {
                closePanels();
              } else {
                setPanelOpen((o) => !o);
                if (!panelOpen) setSelected(null);
              }
            }}
            className="inline-flex h-full items-center gap-1 px-2.5 text-xs font-medium text-clay/80 hover:bg-white/10 hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
            aria-expanded={panelOpen}
            aria-controls={panelId}
          >
            <span className="hidden sm:inline">Details</span>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", panelOpen && "rotate-180")}
              aria-hidden
            />
          </button>
        </div>
      </div>

      {panelOpen ? (
        <div
          id={panelId}
          className="border-t border-white/10 bg-bark/90 px-4 py-3 shadow-inner"
          role="region"
          aria-label="Pulse ticker details"
        >
          {selected ? (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-clay/60">
                  {selected.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-clay">{selected.value}</p>
                {selected.sub ? <p className="mt-0.5 text-sm text-clay/70">{selected.sub}</p> : null}
                {selected.detail ? (
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-clay/80">{selected.detail}</p>
                ) : null}
              </div>
              {selected.href ? (
                <Link
                  href={selected.href}
                  className="rounded-full bg-amber/20 px-3 py-1.5 text-sm font-medium text-clay hover:bg-amber/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
                >
                  {selected.scope === "personal" ? "Open in account" : "Full dashboard"}
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {panelItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="rounded-lg bg-white/5 p-3 text-left hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-clay/60">
                    {item.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-clay">{item.value}</p>
                  {item.sub ? <p className="text-xs text-clay/70">{item.sub}</p> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {managerOpen && isAdmin ? (
        <div className="border-t border-white/10 bg-bark/95 px-4 py-3">
          <PulseDashboardManager onClose={() => setManagerOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
