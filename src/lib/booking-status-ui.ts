/**
 * Shared booking / care-request status presentation for all portals.
 */

export type RecordTone = "sage" | "warm" | "alert" | "muted";

export type PortalAudience = "patient" | "giver" | "admin";

export type StatusPresentation = {
  label: string;
  tone: RecordTone;
  cta: string;
};

export function bookingStatusPresentation(
  status: string,
  audience: PortalAudience = "patient",
): StatusPresentation {
  switch (status) {
    case "PENDING_PROVIDER":
      if (audience === "giver") {
        return {
          label: "Needs your response",
          tone: "warm",
          cta: "Review details",
        };
      }
      if (audience === "admin") {
        return {
          label: "Awaiting professional",
          tone: "warm",
          cta: "Open booking",
        };
      }
      return {
        label: "Awaiting professional",
        tone: "warm",
        cta: "View request",
      };
    case "PENDING_PAYMENT":
      if (audience === "giver") {
        return {
          label: "Awaiting payment",
          tone: "alert",
          cta: "View visit",
        };
      }
      if (audience === "admin") {
        return { label: "Pay to confirm", tone: "alert", cta: "Open booking" };
      }
      return { label: "Pay to confirm", tone: "alert", cta: "Pay now" };
    case "CONFIRMED":
      return {
        label: "Confirmed",
        tone: "sage",
        cta: audience === "admin" ? "Open booking" : "View visit",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        tone: "muted",
        cta: audience === "admin" ? "Open booking" : "View visit",
      };
    case "DECLINED":
      if (audience === "patient") {
        return { label: "Declined", tone: "alert", cta: "Choose another" };
      }
      return {
        label: "Declined",
        tone: "alert",
        cta: audience === "admin" ? "Open booking" : "View request",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        tone: "muted",
        cta: audience === "admin" ? "Open booking" : "View request",
      };
    default:
      return {
        label: status.replaceAll("_", " "),
        tone: "muted",
        cta: audience === "admin" ? "Open" : "View request",
      };
  }
}

export function caseStatusPresentation(caseStatus: string): StatusPresentation {
  if (caseStatus === "OPEN") {
    return {
      label: "Needs a professional",
      tone: "sage",
      cta: "Find verified professionals",
    };
  }
  return {
    label: caseStatus.replaceAll("_", " "),
    tone: "muted",
    cta: "View request",
  };
}

export function verificationStatusPresentation(
  status: string,
): StatusPresentation {
  switch (status) {
    case "UNDER_REVIEW":
      return { label: "Under review", tone: "warm", cta: "Open review" };
    case "PENDING":
      return { label: "Pending", tone: "warm", cta: "Open review" };
    case "APPROVED":
      return { label: "Approved", tone: "sage", cta: "Open profile" };
    case "REJECTED":
      return { label: "Rejected", tone: "alert", cta: "Open review" };
    default:
      return {
        label: status.replaceAll("_", " "),
        tone: "muted",
        cta: "Open",
      };
  }
}
