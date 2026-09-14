type AvailabilityWindow = {
  availableWeekdaysStart: string;
  availableWeekdaysEnd: string;
  availableWeekendsStart: string;
  availableWeekendsEnd: string;
};

function minutesFromTime(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isWithinAvailability(
  scheduledAt: Date,
  profile: AvailabilityWindow,
): boolean {
  const startStr = isWeekend(scheduledAt)
    ? profile.availableWeekendsStart
    : profile.availableWeekdaysStart;
  const endStr = isWeekend(scheduledAt)
    ? profile.availableWeekendsEnd
    : profile.availableWeekdaysEnd;

  const visitMinutes = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
  const start = minutesFromTime(startStr);
  const end = minutesFromTime(endStr);

  return visitMinutes >= start && visitMinutes <= end;
}

export function availabilityErrorMessage(scheduledAt: Date): string {
  return `Professional is not available at ${scheduledAt.toLocaleString("en-KE", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  })}. Pick another time or provider.`;
}
