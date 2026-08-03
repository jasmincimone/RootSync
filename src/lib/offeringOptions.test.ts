import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatUnitSelectionsSummary,
  validateAndSnapshotUnitSelections,
  type SerializedOfferingOptionGroup,
} from "@/lib/offeringOptions";

const groups: SerializedOfferingOptionGroup[] = [
  {
    id: "g-size",
    sortOrder: 0,
    name: "Size",
    values: [
      { id: "v-s", sortOrder: 0, label: "S", imageUrl: null },
      { id: "v-m", sortOrder: 1, label: "M", imageUrl: null },
    ],
  },
  {
    id: "g-color",
    sortOrder: 1,
    name: "Color",
    values: [
      { id: "v-red", sortOrder: 0, label: "Red", imageUrl: null },
      { id: "v-blue", sortOrder: 1, label: "Blue", imageUrl: null },
    ],
  },
];

describe("validateAndSnapshotUnitSelections", () => {
  it("requires a selection for each unit and group", () => {
    const snap = validateAndSnapshotUnitSelections({
      unitsIncluded: 2,
      optionGroups: groups,
      raw: [
        {
          unit: 1,
          choices: [
            { groupId: "g-size", valueId: "v-s" },
            { groupId: "g-color", valueId: "v-red" },
          ],
        },
        {
          unit: 2,
          choices: [
            { groupId: "g-size", valueId: "v-m" },
            { groupId: "g-color", valueId: "v-blue" },
          ],
        },
      ],
    });
    assert.equal(snap?.length, 2);
    assert.equal(snap?.[0]?.choices[0]?.valueLabel, "S");
    assert.match(
      formatUnitSelectionsSummary(snap),
      /Unit 2: Size: M, Color: Blue/,
    );
  });

  it("rejects incomplete deals", () => {
    assert.throws(
      () =>
        validateAndSnapshotUnitSelections({
          unitsIncluded: 2,
          optionGroups: groups,
          raw: [
            {
              choices: [
                { groupId: "g-size", valueId: "v-s" },
                { groupId: "g-color", valueId: "v-red" },
              ],
            },
          ],
        }),
      /all 2 items/i,
    );
  });
});
