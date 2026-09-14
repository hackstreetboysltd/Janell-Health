/** Kenyan mobile numbers → E.164 without + (e.g. 254712345678). */
export function normalizeKenyanPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `254${digits}`;
  return null;
}

export function formatPhoneDisplay(e164: string): string {
  if (e164.startsWith("254") && e164.length === 12) {
    return `0${e164.slice(3)}`;
  }
  return e164;
}

export function syntheticEmailForPhone(phone: string): string {
  return `${phone}@phone.carelink.ke`;
}
