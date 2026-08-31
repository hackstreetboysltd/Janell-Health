export const CARE_SERVICES = [
  { id: "injection", label: "Injection" },
  { id: "wound-care", label: "Wound care" },
  { id: "vitals", label: "Vitals check" },
  { id: "iv-drip", label: "IV drip" },
  { id: "catheter", label: "Catheter care" },
  { id: "physiotherapy", label: "Physiotherapy assist" },
  { id: "medication", label: "Medication administration" },
  { id: "elder-care", label: "Elder care visit" },
  { id: "postnatal", label: "Postnatal check" },
  { id: "other", label: "Other (describe in request)" },
] as const;

export type CareServiceId = (typeof CARE_SERVICES)[number]["id"];
