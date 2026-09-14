export type KenyaEmergencyContact = {
  id: string;
  name: string;
  phone: string;
  category: string;
  coverage: string;
  keywords: string[];
};

/** Public national / toll-free emergency lines used across Kenya. */
export const KENYA_EMERGENCY_CALLBOOK: KenyaEmergencyContact[] = [
  {
    id: "national-999",
    name: "National Emergency",
    phone: "999",
    category: "Police · Fire · Ambulance",
    coverage: "Nationwide",
    keywords: ["police", "fire", "ambulance", "dispatch", "emergency", "999"],
  },
  {
    id: "national-112",
    name: "National Emergency (GSM)",
    phone: "112",
    category: "Police · Fire · Ambulance",
    coverage: "Nationwide",
    keywords: ["police", "fire", "ambulance", "gsm", "mobile", "112"],
  },
  {
    id: "national-911",
    name: "National Emergency (alternate)",
    phone: "911",
    category: "Police · Fire · Ambulance",
    coverage: "Nationwide",
    keywords: ["police", "fire", "ambulance", "911"],
  },
  {
    id: "sha-922",
    name: "SHA Lifeline Ambulance",
    phone: "922",
    category: "Medical · Ambulance",
    coverage: "Nationwide",
    keywords: ["sha", "ambulance", "medical", "dispatch", "health", "922"],
  },
  {
    id: "red-cross-1199",
    name: "Kenya Red Cross (E-Plus)",
    phone: "1199",
    category: "Medical · Ambulance",
    coverage: "Nationwide",
    keywords: ["red cross", "e-plus", "ambulance", "medical", "1199"],
  },
  {
    id: "red-cross-0700",
    name: "Kenya Red Cross Ambulance",
    phone: "0700 395 395",
    category: "Medical · Ambulance",
    coverage: "Nationwide",
    keywords: ["red cross", "ambulance", "medical", "0700395395"],
  },
  {
    id: "childline-116",
    name: "Childline Kenya",
    phone: "116",
    category: "Child protection",
    coverage: "Nationwide · toll-free",
    keywords: ["child", "abuse", "protection", "childline", "116"],
  },
  {
    id: "gbv-1195",
    name: "National GBV Helpline",
    phone: "1195",
    category: "Gender-based violence",
    coverage: "Nationwide · toll-free",
    keywords: ["gbv", "gender", "violence", "abuse", "women", "1195"],
  },
  {
    id: "missing-child",
    name: "Missing Child Kenya",
    phone: "0800 223 344",
    category: "Child protection",
    coverage: "Nationwide · toll-free",
    keywords: ["missing", "child", "abduction", "0800223344"],
  },
];

export function filterKenyaEmergencyCallbook(
  query: string,
  entries: KenyaEmergencyContact[] = KENYA_EMERGENCY_CALLBOOK,
): KenyaEmergencyContact[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.name,
      entry.phone,
      entry.category,
      entry.coverage,
      ...entry.keywords,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
