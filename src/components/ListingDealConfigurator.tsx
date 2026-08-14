"use client";

import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { SerializedOfferingOptionGroup } from "@/lib/offeringOptions";

export type ListingDeal = {
  id: string;
  title: string;
  priceCents: number;
  unitsIncluded: number;
  durationMinutes: number | null;
  sku: string | null;
  inventoryQuantity?: number | null;
};

export type UnitSelectionDraft = {
  unit: number;
  choices: Array<{ groupId: string; valueId: string }>;
};

type Props = {
  deals: ListingDeal[];
  optionGroups: SerializedOfferingOptionGroup[];
  selectedDealId: string | null;
  onSelectDeal: (dealId: string) => void;
  unitSelections: UnitSelectionDraft[];
  onChangeUnitSelections: (next: UnitSelectionDraft[]) => void;
  listingType: string;
  className?: string;
};

export function emptyUnitSelections(
  unitsIncluded: number,
  optionGroups: SerializedOfferingOptionGroup[],
): UnitSelectionDraft[] {
  return Array.from({ length: Math.max(1, unitsIncluded) }, (_, i) => ({
    unit: i + 1,
    choices: optionGroups.map((g) => ({
      groupId: g.id,
      valueId: g.values[0]?.id ?? "",
    })),
  }));
}

export function ListingDealConfigurator({
  deals,
  optionGroups,
  selectedDealId,
  onSelectDeal,
  unitSelections,
  onChangeUnitSelections,
  listingType,
  className,
}: Props) {
  const selectedDeal = deals.find((d) => d.id === selectedDealId) ?? null;
  const units = selectedDeal?.unitsIncluded ?? 1;
  const showPerUnit = optionGroups.length > 0 && !!selectedDeal;

  function setChoice(unitIndex: number, groupId: string, valueId: string) {
    onChangeUnitSelections(
      unitSelections.map((row, i) => {
        if (i !== unitIndex) return row;
        const without = row.choices.filter((c) => c.groupId !== groupId);
        return {
          ...row,
          choices: [...without, { groupId, valueId }],
        };
      }),
    );
  }

  return (
    <div className={className}>
      {deals.length > 0 ? (
        <div>
          <p className="text-sm font-semibold text-fix-heading">Choose a deal</p>
          <ul className="mt-3 space-y-2">
            {deals.map((deal) => {
              const selected = selectedDealId === deal.id;
              return (
                <li key={deal.id}>
                  <button
                    type="button"
                    onClick={() => onSelectDeal(deal.id)}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                      selected
                        ? "border-amber/50 bg-amber/10 ring-1 ring-amber/30"
                        : "border-fix-border/20 bg-fix-surface hover:bg-fix-bg-muted",
                    )}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-fix-heading">{deal.title}</span>
                      <span className="font-semibold text-fix-heading">
                        {formatPrice(deal.priceCents)}
                      </span>
                    </div>
                    {deal.unitsIncluded > 1 ? (
                      <p className="mt-1 text-xs font-medium text-fix-text-muted">
                        Includes {deal.unitsIncluded} items
                      </p>
                    ) : null}
                    {listingType === "SERVICE" && deal.durationMinutes ? (
                      <p className="mt-1 text-xs font-medium text-fix-text-muted">
                        {deal.durationMinutes} min session
                      </p>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {showPerUnit ? (
        <div className={deals.length > 0 ? "mt-5" : undefined}>
          <p className="text-sm font-semibold text-fix-heading">
            {units === 1 ? "Your choices" : `Configure each of ${units} items`}
          </p>
          <ul className="mt-3 space-y-4">
            {Array.from({ length: units }, (_, unitIndex) => {
              const row = unitSelections[unitIndex];
              return (
                <li
                  key={`unit-${unitIndex}`}
                  className="rounded-xl border border-fix-border/15 bg-fix-surface px-4 py-3"
                >
                  {units > 1 ? (
                    <p className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
                      Item {unitIndex + 1}
                    </p>
                  ) : null}
                  <div className={cn("space-y-3", units > 1 && "mt-2")}>
                    {optionGroups.map((group) => {
                      const selectedValueId =
                        row?.choices.find((c) => c.groupId === group.id)?.valueId ?? "";
                      const selectedValue = group.values.find((v) => v.id === selectedValueId);
                      const selectId = `opt-${group.id}-u${unitIndex}`;
                      return (
                        <div key={group.id}>
                          <label
                            htmlFor={selectId}
                            className="block text-sm font-medium text-fix-heading"
                          >
                            {group.name}
                          </label>
                          <div className="mt-2 flex items-center gap-2">
                            {selectedValue?.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={selectedValue.imageUrl}
                                alt=""
                                className="h-11 w-11 shrink-0 rounded-lg object-cover"
                              />
                            ) : null}
                            <select
                              id={selectId}
                              value={selectedValueId}
                              onChange={(e) => setChoice(unitIndex, group.id, e.target.value)}
                              className="min-h-11 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2.5 text-base text-fix-text"
                            >
                              {selectedValueId ? null : (
                                <option value="">Select {group.name}</option>
                              )}
                              {group.values.map((value) => (
                                <option key={value.id} value={value.id}>
                                  {value.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
