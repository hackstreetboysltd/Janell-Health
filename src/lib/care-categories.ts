import type { CareCategory, Profession } from "@prisma/client";

export const CARE_CATEGORIES = [
  { id: "HOME_NURSING", label: "Home nursing" },
  { id: "CAREGIVER", label: "Caregiver" },
  { id: "ELDERLY_CARE", label: "Elderly care" },
  { id: "POST_HOSPITAL", label: "Post-hospital care" },
  { id: "WOUND_CARE", label: "Wound care" },
  { id: "OTHER", label: "Other" },
] as const satisfies ReadonlyArray<{ id: CareCategory; label: string }>;

export const AGE_BANDS = [
  { id: "CHILD", label: "Child (under 18)" },
  { id: "ADULT", label: "Adult (18–64)" },
  { id: "ELDERLY", label: "Elderly (65+)" },
] as const;

export const DURATION_OPTIONS = [
  { minutes: 120, label: "2 hours" },
  { minutes: 240, label: "4 hours" },
  { minutes: 480, label: "8 hours" },
  { minutes: 720, label: "Overnight (12h)" },
] as const;

export const GENDER_PREFERENCES = [
  { id: "NO_PREFERENCE", label: "No preference" },
  { id: "FEMALE", label: "Female professional" },
  { id: "MALE", label: "Male professional" },
] as const;

/** Categories that primarily need a registered nurse. */
const NURSING_CATEGORIES = new Set<CareCategory>([
  "HOME_NURSING",
  "POST_HOSPITAL",
  "WOUND_CARE",
]);

/** Categories that primarily need a non-clinical caregiver. */
const CAREGIVER_CATEGORIES = new Set<CareCategory>([
  "CAREGIVER",
  "ELDERLY_CARE",
]);

export function professionsForCategory(
  category: CareCategory,
): Profession[] | null {
  if (NURSING_CATEGORIES.has(category)) return ["NURSE"];
  if (CAREGIVER_CATEGORIES.has(category)) return ["CAREGIVER"];
  return null;
}

export function categoryLabel(category: CareCategory): string {
  return (
    CARE_CATEGORIES.find((c) => c.id === category)?.label ?? category
  );
}

export function formatDuration(minutes: number): string {
  const match = DURATION_OPTIONS.find((d) => d.minutes === minutes);
  if (match) return match.label;
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return `${minutes} min`;
}

export function formatScheduledAt(date: Date): string {
  return date.toLocaleString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
