"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

import { OptionChoiceImageField } from "@/components/OptionChoiceImageField";
import { Button } from "@/components/ui/Button";
import type { SerializedOfferingOptionGroup } from "@/lib/offeringOptions";

export type OptionValueDraft = {
  clientKey: string;
  label: string;
  imageUrl: string;
};

export type OptionGroupDraft = {
  clientKey: string;
  name: string;
  values: OptionValueDraft[];
};

const inputClass =
  "mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-text";

function newValue(): OptionValueDraft {
  return { clientKey: crypto.randomUUID(), label: "", imageUrl: "" };
}

function newGroup(): OptionGroupDraft {
  return {
    clientKey: crypto.randomUUID(),
    name: "",
    values: [newValue(), newValue()],
  };
}

export function optionGroupDraftsFromSerialized(
  groups: SerializedOfferingOptionGroup[],
): OptionGroupDraft[] {
  if (groups.length === 0) return [];
  return groups.map((g) => ({
    clientKey: g.id,
    name: g.name,
    values:
      g.values.length > 0
        ? g.values.map((v) => ({
            clientKey: v.id,
            label: v.label,
            imageUrl: v.imageUrl ?? "",
          }))
        : [newValue()],
  }));
}

export function optionGroupDraftsToPayload(drafts: OptionGroupDraft[]) {
  return drafts.map((g, groupIndex) => ({
    name: g.name.trim(),
    sortOrder: groupIndex,
    values: g.values
      .map((v, valueIndex) => ({
        label: v.label.trim(),
        imageUrl: v.imageUrl.trim() || null,
        sortOrder: valueIndex,
      }))
      .filter((v) => v.label),
  }));
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

type Props = {
  groups: OptionGroupDraft[];
  onChange: (groups: OptionGroupDraft[]) => void;
  disabled?: boolean;
};

export function OfferingOptionGroupsEditor({ groups, onChange, disabled }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-fix-heading">Item options</h3>
        <p className="mt-1 text-xs text-fix-text-muted">
          Shared across every deal above. When someone buys Deal 1 with 2 items, they fill these out
          twice (once per item) — e.g. Size + Color for each hat, or Variety for each seed pack.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-fix-text-muted">
          No item options yet. Add Size, Color, Variety, or any choice buyers pick for each item in a
          deal.
        </p>
      ) : (
        <ul className="space-y-4">
          {groups.map((group, groupIndex) => (
            <li
              key={group.clientKey}
              className="space-y-3 rounded-lg border border-fix-border/15 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-fix-text-muted">
                  Item option {groupIndex + 1}
                </span>
                <div className="flex items-center gap-1">
                  {groups.length > 1 ? (
                    <>
                      <button
                        type="button"
                        disabled={disabled || groupIndex === 0}
                        onClick={() => onChange(moveItem(groups, groupIndex, -1))}
                        className="rounded-lg border border-fix-border/20 p-1.5 text-fix-text-muted hover:bg-fix-surface disabled:opacity-40"
                        aria-label={`Move item option ${groupIndex + 1} up`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={disabled || groupIndex === groups.length - 1}
                        onClick={() => onChange(moveItem(groups, groupIndex, 1))}
                        className="rounded-lg border border-fix-border/20 p-1.5 text-fix-text-muted hover:bg-fix-surface disabled:opacity-40"
                        aria-label={`Move item option ${groupIndex + 1} down`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onChange(groups.filter((row) => row.clientKey !== group.clientKey))
                    }
                    className="px-1.5 text-xs text-fix-text-muted hover:text-bark"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fix-text">Name *</label>
                <input
                  value={group.name}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange(
                      groups.map((row) =>
                        row.clientKey === group.clientKey
                          ? { ...row, name: e.target.value }
                          : row,
                      ),
                    )
                  }
                  placeholder="e.g. Size, Color, Variety"
                  className={inputClass}
                />
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-fix-text-muted">Choices</p>
                {group.values.map((value, valueIndex) => (
                  <div
                    key={value.clientKey}
                    className="space-y-2 rounded-lg border border-fix-border/10 bg-fix-bg-muted/20 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <label className="block text-sm font-medium text-fix-text">
                          Label *
                        </label>
                        <input
                          value={value.label}
                          disabled={disabled}
                          onChange={(e) =>
                            onChange(
                              groups.map((row) =>
                                row.clientKey === group.clientKey
                                  ? {
                                      ...row,
                                      values: row.values.map((v) =>
                                        v.clientKey === value.clientKey
                                          ? { ...v, label: e.target.value }
                                          : v,
                                      ),
                                    }
                                  : row,
                              ),
                            )
                          }
                          placeholder={`Choice ${valueIndex + 1}`}
                          className={inputClass}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={disabled || group.values.length <= 1}
                        onClick={() =>
                          onChange(
                            groups.map((row) =>
                              row.clientKey === group.clientKey
                                ? {
                                    ...row,
                                    values: row.values.filter(
                                      (v) => v.clientKey !== value.clientKey,
                                    ),
                                  }
                                : row,
                            ),
                          )
                        }
                        className="mt-6 shrink-0 px-2 text-xs text-fix-text-muted hover:text-bark disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-fix-text">Image (optional)</p>
                      <p className="mt-0.5 text-xs text-fix-text-muted">
                        Upload a photo or paste an image URL.
                      </p>
                      <div className="mt-1.5">
                        <OptionChoiceImageField
                          inputId={`option-image-${group.clientKey}-${value.clientKey}`}
                          imageUrl={value.imageUrl}
                          disabled={disabled}
                          onImageUrlChange={(url) =>
                            onChange(
                              groups.map((row) =>
                                row.clientKey === group.clientKey
                                  ? {
                                      ...row,
                                      values: row.values.map((v) =>
                                        v.clientKey === value.clientKey
                                          ? { ...v, imageUrl: url }
                                          : v,
                                      ),
                                    }
                                  : row,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={disabled}
                  onClick={() =>
                    onChange(
                      groups.map((row) =>
                        row.clientKey === group.clientKey
                          ? { ...row, values: [...row.values, newValue()] }
                          : row,
                      ),
                    )
                  }
                >
                  Add choice
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={() => onChange([...groups, newGroup()])}
      >
        Add item option
      </Button>
    </div>
  );
}
