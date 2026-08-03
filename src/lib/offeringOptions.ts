import type { Prisma } from "@prisma/client";

export type OfferingOptionValueInput = {
  label: string;
  imageUrl?: string | null;
  sortOrder: number;
};

export type OfferingOptionGroupInput = {
  name: string;
  sortOrder: number;
  values: OfferingOptionValueInput[];
};

export type SerializedOfferingOptionValue = {
  id: string;
  sortOrder: number;
  label: string;
  imageUrl: string | null;
};

export type SerializedOfferingOptionGroup = {
  id: string;
  sortOrder: number;
  name: string;
  values: SerializedOfferingOptionValue[];
};

export type UnitChoiceSnapshot = {
  groupId: string;
  groupName: string;
  valueId: string;
  valueLabel: string;
};

export type UnitSelectionSnapshot = {
  unit: number;
  choices: UnitChoiceSnapshot[];
};

function parseOptionalUrl(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("Invalid image URL.");
  const trimmed = value.trim();
  return trimmed || null;
}

export function parseOfferingOptionGroupsFromBody(
  body: Record<string, unknown>,
): OfferingOptionGroupInput[] | undefined {
  if (!("optionGroups" in body)) return undefined;
  const raw = body.optionGroups;
  if (!Array.isArray(raw)) {
    throw new Error("optionGroups must be an array.");
  }
  if (raw.length === 0) return [];

  const groups: OfferingOptionGroupInput[] = [];
  raw.forEach((row, groupIndex) => {
    if (!row || typeof row !== "object") return;
    const item = row as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) {
      throw new Error(`Option group ${groupIndex + 1} needs a name (e.g. Size, Color).`);
    }
    const valuesRaw = item.values;
    if (!Array.isArray(valuesRaw) || valuesRaw.length === 0) {
      throw new Error(`Option “${name}” needs at least one choice.`);
    }
    const values: OfferingOptionValueInput[] = [];
    valuesRaw.forEach((valueRow, valueIndex) => {
      if (!valueRow || typeof valueRow !== "object") return;
      const valueItem = valueRow as Record<string, unknown>;
      const label = typeof valueItem.label === "string" ? valueItem.label.trim() : "";
      if (!label) {
        throw new Error(`Option “${name}” choice ${valueIndex + 1} needs a label.`);
      }
      values.push({
        label,
        imageUrl: parseOptionalUrl(valueItem.imageUrl),
        sortOrder:
          typeof valueItem.sortOrder === "number" && Number.isInteger(valueItem.sortOrder)
            ? valueItem.sortOrder
            : valueIndex,
      });
    });
    if (values.length === 0) {
      throw new Error(`Option “${name}” needs at least one choice.`);
    }
    groups.push({
      name,
      sortOrder:
        typeof item.sortOrder === "number" && Number.isInteger(item.sortOrder)
          ? item.sortOrder
          : groupIndex,
      values,
    });
  });

  return groups;
}

export function serializeOfferingOptionGroups(
  groups: Array<{
    id: string;
    sortOrder: number;
    name: string;
    values: Array<{
      id: string;
      sortOrder: number;
      label: string;
      imageUrl: string | null;
    }>;
  }>,
): SerializedOfferingOptionGroup[] {
  return groups.map((group) => ({
    id: group.id,
    sortOrder: group.sortOrder,
    name: group.name,
    values: group.values.map((value) => ({
      id: value.id,
      sortOrder: value.sortOrder,
      label: value.label,
      imageUrl: value.imageUrl,
    })),
  }));
}

export async function syncOfferingOptionGroups(
  tx: Prisma.TransactionClient,
  offeringId: string,
  groups: OfferingOptionGroupInput[] | undefined,
): Promise<void> {
  if (groups === undefined) return;

  await tx.offeringOptionGroup.deleteMany({ where: { offeringId } });
  if (groups.length === 0) return;

  for (const group of groups) {
    await tx.offeringOptionGroup.create({
      data: {
        offeringId,
        name: group.name,
        sortOrder: group.sortOrder,
        values: {
          create: group.values.map((value) => ({
            label: value.label,
            imageUrl: value.imageUrl ?? null,
            sortOrder: value.sortOrder,
          })),
        },
      },
    });
  }
}

export function formatUnitSelectionsSummary(
  selections: UnitSelectionSnapshot[] | null | undefined,
): string {
  if (!selections?.length) return "";
  return selections
    .map((unit) => {
      const choices = unit.choices.map((c) => `${c.groupName}: ${c.valueLabel}`).join(", ");
      return `Unit ${unit.unit}: ${choices}`;
    })
    .join(" · ");
}

/**
 * Validate buyer unitSelections against live option groups and deal unit count.
 * Returns a snapshot suitable for OrderItem.unitSelections (+ Stripe metadata summary).
 */
export function validateAndSnapshotUnitSelections(args: {
  unitsIncluded: number;
  optionGroups: SerializedOfferingOptionGroup[];
  raw: unknown;
}): UnitSelectionSnapshot[] | null {
  const { unitsIncluded, optionGroups, raw } = args;

  if (optionGroups.length === 0) {
    if (raw == null || (Array.isArray(raw) && raw.length === 0)) return null;
    throw new Error("This listing does not accept option selections.");
  }

  if (!Array.isArray(raw)) {
    throw new Error("Choose options for each item in your deal.");
  }

  if (raw.length !== unitsIncluded) {
    throw new Error(
      unitsIncluded === 1
        ? "Choose options for this item."
        : `Choose options for all ${unitsIncluded} items in this deal.`,
    );
  }

  const byGroupId = new Map(optionGroups.map((g) => [g.id, g]));
  const snapshots: UnitSelectionSnapshot[] = [];

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") {
      throw new Error(`Missing choices for item ${i + 1}.`);
    }
    const record = row as Record<string, unknown>;
    const choicesRaw = record.choices;
    if (!Array.isArray(choicesRaw)) {
      throw new Error(`Missing choices for item ${i + 1}.`);
    }

    const chosenByGroup = new Map<string, UnitChoiceSnapshot>();
    for (const choice of choicesRaw) {
      if (!choice || typeof choice !== "object") continue;
      const c = choice as Record<string, unknown>;
      const groupId = typeof c.groupId === "string" ? c.groupId : "";
      const valueId = typeof c.valueId === "string" ? c.valueId : "";
      const group = byGroupId.get(groupId);
      if (!group) {
        throw new Error(`Unknown option on item ${i + 1}. Refresh and try again.`);
      }
      const value = group.values.find((v) => v.id === valueId);
      if (!value) {
        throw new Error(`Invalid choice for “${group.name}” on item ${i + 1}.`);
      }
      chosenByGroup.set(groupId, {
        groupId: group.id,
        groupName: group.name,
        valueId: value.id,
        valueLabel: value.label,
      });
    }

    for (const group of optionGroups) {
      if (!chosenByGroup.has(group.id)) {
        throw new Error(`Pick a ${group.name} for item ${i + 1}.`);
      }
    }

    snapshots.push({
      unit: i + 1,
      choices: optionGroups.map((g) => chosenByGroup.get(g.id)!),
    });
  }

  return snapshots;
}
