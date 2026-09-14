"use client";

import dynamic from "next/dynamic";
import type { MapCaregiver } from "@/components/caregiver-map";

const CaregiverMap = dynamic(
  () => import("@/components/caregiver-map").then((m) => m.CaregiverMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="map-loading flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div
          className="h-10 w-10 animate-pulse rounded-full border-2 border-sage/30 border-t-sage"
          aria-hidden
        />
        <p className="font-display text-lg text-ink/80">Finding verified care nearby</p>
        <p className="max-w-xs text-sm text-ink/50">
          Loading Nairobi map and matching professionals to your visit.
        </p>
      </div>
    ),
  },
);

export function FindMapClient({
  caregivers,
  caseId,
}: {
  caregivers: MapCaregiver[];
  caseId?: string;
}) {
  return <CaregiverMap caregivers={caregivers} caseId={caseId} />;
}
