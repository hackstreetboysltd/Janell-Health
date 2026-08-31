"use client";

import dynamic from "next/dynamic";
import type { MapCaregiver } from "@/components/caregiver-map";

const CaregiverMap = dynamic(
  () => import("@/components/caregiver-map").then((m) => m.CaregiverMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh items-center justify-center bg-mist/40 text-ink/50">
        Loading map…
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
