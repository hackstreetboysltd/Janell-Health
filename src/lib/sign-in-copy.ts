import type { Portal } from "@/lib/portals";

export type SignInPortal = Portal;

export const SIGN_IN_COPY = {
  patient: {
    title: "Family sign in",
    otpHint: "Enter your Kenyan mobile number. We'll text a one-time code.",
    demoHint: "Dev only — use any email to explore the family portal.",
  },
  giver: {
    title: "Caregiver sign in",
    otpHint: "Use the phone number on your professional profile.",
    demoHint: "Dev only — use any email to explore the caregiver portal.",
  },
  admin: {
    title: "Admin sign in",
    otpHint: "Use the phone on your ops account. Access requires ADMIN role.",
    demoHint: "Dev only — sign in with an email whose User.role is ADMIN.",
  },
} as const satisfies Record<
  SignInPortal,
  { title: string; otpHint: string; demoHint: string }
>;
