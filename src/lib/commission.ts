/** Platform keeps 10% of booking gross. */
export const PLATFORM_COMMISSION_RATE = 0.1;

export function splitCommission(grossAmount: number) {
  const platformFee = Math.round(grossAmount * PLATFORM_COMMISSION_RATE);
  const caregiverPayout = grossAmount - platformFee;
  return { platformFee, caregiverPayout };
}

export function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}
