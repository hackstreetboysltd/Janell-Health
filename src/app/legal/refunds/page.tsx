import { LegalPage } from "@/components/legal-page";

export default function RefundsPage() {
  return (
    <LegalPage title="Refunds & cancellation">
      <h2>Before payment</h2>
      <p>
        Booking requests can be declined by the professional at no charge. No
        payment is taken until the professional accepts.
      </p>
      <h2>After payment</h2>
      <p>
        Cancellations more than 24 hours before the scheduled visit may qualify
        for a full refund at Janell Health&apos;s discretion. Late cancellations or
        no-shows may forfeit part or all of the fee to compensate the
        professional.
      </p>
      <h2>Disputes</h2>
      <p>
        Contact <a href="/support">support</a> within 48 hours of a visit with
        details. We review booking records and both parties&apos; statements.
      </p>
      <h2>M-Pesa</h2>
      <p>
        Approved refunds are returned to the original M-Pesa number where
        technically possible.
      </p>
    </LegalPage>
  );
}
