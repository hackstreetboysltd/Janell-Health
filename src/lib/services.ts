import type { CareCategory, Profession } from "@prisma/client";

export type ServiceGroupId = "nursing" | "caregiving";

export type CareService = {
  id: string;
  label: string;
  shortLabel: string;
  group: ServiceGroupId;
  /** Categories where this service is commonly relevant. */
  categories: CareCategory[];
};

/** Structured service catalog for Janell Health home-care offerings. */
export const CARE_SERVICES = [
  // Nursing
  {
    id: "home-nursing-visit",
    label: "Home nursing visit",
    shortLabel: "Home visit",
    group: "nursing",
    categories: ["HOME_NURSING", "OTHER"],
  },
  {
    id: "vitals",
    label: "Vitals check",
    shortLabel: "Vitals",
    group: "nursing",
    categories: ["HOME_NURSING", "POST_HOSPITAL", "OTHER"],
  },
  {
    id: "medication",
    label: "Medication administration",
    shortLabel: "Medication",
    group: "nursing",
    categories: ["HOME_NURSING", "POST_HOSPITAL", "OTHER"],
  },
  {
    id: "wound-dressing",
    label: "Wound / dressing care",
    shortLabel: "Wound care",
    group: "nursing",
    categories: ["WOUND_CARE", "POST_HOSPITAL", "HOME_NURSING"],
  },
  {
    id: "catheter",
    label: "Catheter care",
    shortLabel: "Catheter",
    group: "nursing",
    categories: ["HOME_NURSING", "POST_HOSPITAL"],
  },
  {
    id: "post-op",
    label: "Post-operative care",
    shortLabel: "Post-op",
    group: "nursing",
    categories: ["POST_HOSPITAL", "WOUND_CARE"],
  },
  {
    id: "post-hospitalization",
    label: "Post-hospitalization support",
    shortLabel: "Post-hospital",
    group: "nursing",
    categories: ["POST_HOSPITAL"],
  },
  {
    id: "chronic-support",
    label: "Chronic condition support",
    shortLabel: "Chronic care",
    group: "nursing",
    categories: ["HOME_NURSING", "OTHER"],
  },
  {
    id: "stroke-neuro",
    label: "Stroke / neuro rehab assist",
    shortLabel: "Stroke / neuro",
    group: "nursing",
    categories: ["POST_HOSPITAL", "HOME_NURSING"],
  },
  {
    id: "palliative",
    label: "Palliative support",
    shortLabel: "Palliative",
    group: "nursing",
    categories: ["HOME_NURSING", "OTHER"],
  },
  {
    id: "bedridden",
    label: "Bedridden patient care",
    shortLabel: "Bedridden care",
    group: "nursing",
    categories: ["HOME_NURSING", "ELDERLY_CARE"],
  },
  {
    id: "maternal-newborn",
    label: "Maternal / newborn (qualified)",
    shortLabel: "Maternal / newborn",
    group: "nursing",
    categories: ["HOME_NURSING", "OTHER"],
  },
  // Caregiving
  {
    id: "bathing",
    label: "Bathing & hygiene",
    shortLabel: "Bathing",
    group: "caregiving",
    categories: ["CAREGIVER", "ELDERLY_CARE"],
  },
  {
    id: "feeding",
    label: "Feeding assistance",
    shortLabel: "Feeding",
    group: "caregiving",
    categories: ["CAREGIVER", "ELDERLY_CARE"],
  },
  {
    id: "mobility",
    label: "Mobility & transfers",
    shortLabel: "Mobility",
    group: "caregiving",
    categories: ["CAREGIVER", "ELDERLY_CARE", "POST_HOSPITAL"],
  },
  {
    id: "companionship",
    label: "Companionship",
    shortLabel: "Companionship",
    group: "caregiving",
    categories: ["CAREGIVER", "ELDERLY_CARE"],
  },
  {
    id: "overnight",
    label: "Overnight stay",
    shortLabel: "Overnight",
    group: "caregiving",
    categories: ["CAREGIVER", "ELDERLY_CARE"],
  },
  {
    id: "daytime",
    label: "Daytime care",
    shortLabel: "Daytime",
    group: "caregiving",
    categories: ["CAREGIVER", "ELDERLY_CARE"],
  },
  {
    id: "household-patient",
    label: "Household (patient-related)",
    shortLabel: "Household",
    group: "caregiving",
    categories: ["CAREGIVER", "ELDERLY_CARE"],
  },
  {
    id: "elder-care-visit",
    label: "Elder care visit",
    shortLabel: "Elder care",
    group: "caregiving",
    categories: ["ELDERLY_CARE"],
  },
  {
    id: "other",
    label: "Other (describe in request)",
    shortLabel: "Other",
    group: "caregiving",
    categories: ["OTHER"],
  },
] as const satisfies ReadonlyArray<CareService>;

export type CareServiceId = (typeof CARE_SERVICES)[number]["id"];

const SERVICE_MAP = new Map(CARE_SERVICES.map((s) => [s.id, s]));

export const SERVICE_GROUPS: { id: ServiceGroupId; label: string }[] = [
  { id: "nursing", label: "Nursing services" },
  { id: "caregiving", label: "Caregiving services" },
];

export function getService(id: string): CareService | undefined {
  return SERVICE_MAP.get(id as CareServiceId);
}

export function serviceLabel(id: string): string {
  return getService(id)?.label ?? id;
}

export function serviceShortLabel(id: string): string {
  return getService(id)?.shortLabel ?? serviceLabel(id);
}

export function servicesForGroup(group: ServiceGroupId): CareService[] {
  return CARE_SERVICES.filter((s) => s.group === group);
}

export function servicesForProfession(profession: Profession): CareService[] {
  if (profession === "NURSE" || profession === "DOCTOR") {
    return CARE_SERVICES.filter((s) => s.group === "nursing");
  }
  return CARE_SERVICES.filter((s) => s.group === "caregiving");
}

export function servicesForCategory(category: CareCategory): CareService[] {
  return CARE_SERVICES.filter((s) =>
    (s.categories as readonly CareCategory[]).includes(category),
  );
}

export function providerOffersAnyService(
  offered: string[],
  requested: string[],
): boolean {
  if (requested.length === 0) return true;
  if (offered.length === 0) return true;
  return requested.some((id) => offered.includes(id));
}

export function defaultServicesForProfession(profession: Profession): string[] {
  return servicesForProfession(profession).slice(0, 4).map((s) => s.id);
}

const CATEGORY_ENUM_IDS = new Set<string>([
  "HOME_NURSING",
  "CAREGIVER",
  "ELDERLY_CARE",
  "POST_HOSPITAL",
  "WOUND_CARE",
  "OTHER",
]);

/** Service IDs from a case record (excludes legacy category-only entries). */
export function requestedServiceIds(services: string[]): string[] {
  return services.filter((id) => !CATEGORY_ENUM_IDS.has(id));
}
