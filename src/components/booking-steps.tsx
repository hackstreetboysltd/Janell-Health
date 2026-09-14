type BookingStepsProps = {
  active: "find" | "request" | "pay";
};

export function BookingSteps({ active }: BookingStepsProps) {
  return (
    <nav className="booking-steps mt-6" aria-label="Booking progress">
      <span data-active={active === "find" ? "true" : "false"}>Find</span>
      <span aria-hidden className="text-ink/25">
        →
      </span>
      <span data-active={active === "request" ? "true" : "false"}>Request</span>
      <span aria-hidden className="text-ink/25">
        →
      </span>
      <span data-active={active === "pay" ? "true" : "false"}>Pay</span>
    </nav>
  );
}
