import { RESOURCE_SUBTYPE, type ResourceSubtype } from "@/lib/roles";

/** Resource subtypes for filtering and vendor intake (classes/workshops → Event listings). */
export const RESOURCE_SUBTYPE_OPTIONS: { value: ResourceSubtype; label: string; hint: string }[] = [
  { value: RESOURCE_SUBTYPE.EBOOK, label: "eBook", hint: "Guides, manuals, illustrated books" },
  { value: RESOURCE_SUBTYPE.BUILD_PLAN, label: "Build plan", hint: "Plans, blueprints, step-by-step builds" },
  { value: RESOURCE_SUBTYPE.GUIDE, label: "Guide", hint: "How-to guides and walkthroughs" },
  { value: RESOURCE_SUBTYPE.CHECKLIST, label: "Checklist", hint: "Printable or digital checklists" },
  { value: RESOURCE_SUBTYPE.TEMPLATE, label: "Template", hint: "Spreadsheets, docs, reusable templates" },
];

export function resourceSubtypeLabel(subtype: string | null | undefined): string | null {
  if (!subtype) return null;
  return RESOURCE_SUBTYPE_OPTIONS.find((o) => o.value === subtype)?.label ?? null;
}
