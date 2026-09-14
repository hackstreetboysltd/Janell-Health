export const INSTITUTION_COOKIE = "carelink_institution";

export function referralLandingPath(slug: string): string {
  return `/referral/${slug}`;
}
