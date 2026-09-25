import type { CareCategory } from "@prisma/client";
import { RecordCard } from "@/components/record-card";
import {
  bookingStatusPresentation,
  caseStatusPresentation,
} from "@/lib/booking-status-ui";
import {
  categoryLabel,
  formatDuration,
  formatScheduledAt,
} from "@/lib/care-categories";
import { requestedServiceIds, serviceLabel } from "@/lib/services";

type BookingStatus =
  | "PENDING_PROVIDER"
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "COMPLETED"
  | "DECLINED"
  | string;

export type CareRequestCardProps = {
  id: string;
  category: CareCategory;
  careSummary: string;
  wantHtml: string;
  scheduledAt: Date;
  durationMinutes: number;
  visitAddress: string;
  services: string[];
  createdAt: Date;
  caseStatus: string;
  booking: { id: string; status: BookingStatus } | null;
  index?: number;
};

function requestTitle(careSummary: string, wantHtml: string): string {
  const plain = careSummary || wantHtml.replace(/<[^>]+>/g, "");
  return plain.trim() || "Care request";
}

export function CareRequestCard({
  id,
  category,
  careSummary,
  wantHtml,
  scheduledAt,
  durationMinutes,
  visitAddress,
  services,
  createdAt,
  caseStatus,
  booking,
  index = 0,
}: CareRequestCardProps) {
  const title = requestTitle(careSummary, wantHtml);
  const status = booking
    ? bookingStatusPresentation(booking.status, "patient")
    : caseStatusPresentation(caseStatus);
  const serviceLabels = requestedServiceIds(services).map(serviceLabel);

  const href =
    booking != null
      ? booking.status === "PENDING_PAYMENT"
        ? `/patient/pay/${booking.id}`
        : booking.status === "DECLINED"
          ? `/patient/find?caseId=${id}`
          : `/patient/bookings/${booking.id}`
      : caseStatus === "OPEN"
        ? `/patient/find?caseId=${id}`
        : null;

  return (
    <RecordCard
      index={index}
      eyebrow={categoryLabel(category)}
      title={title}
      status={status.label}
      tone={status.tone}
      meta={[
        {
          icon: "calendar",
          label: "When",
          text: `${formatScheduledAt(scheduledAt)} · ${formatDuration(durationMinutes)}`,
        },
        {
          icon: "pin",
          label: "Where",
          text: visitAddress,
        },
      ]}
      tags={serviceLabels}
      footerLeft={
        <time dateTime={createdAt.toISOString()}>
          Opened {createdAt.toLocaleDateString("en-KE")}
        </time>
      }
      cta={status.cta}
      href={href}
    />
  );
}
