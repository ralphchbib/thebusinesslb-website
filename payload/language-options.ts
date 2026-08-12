/**
 * Phase 9C — shared fixed language list for BusinessProfiles/
 * ProfessionalProfiles' `languages` field (PHASE9C-TECHNICAL-DESIGN.md §A.3).
 * A real, closed vocabulary (not fabricated business/professional data) —
 * the same category of thing as `NetworkAccounts.accountType`'s select.
 */
export const LANGUAGE_OPTIONS = [
  { label: "Arabic", value: "arabic" },
  { label: "English", value: "english" },
  { label: "French", value: "french" },
  { label: "Armenian", value: "armenian" },
  { label: "Kurdish", value: "kurdish" },
  { label: "Other", value: "other" },
] as const;

export const LANGUAGE_VALUES = LANGUAGE_OPTIONS.map((o) => o.value);
