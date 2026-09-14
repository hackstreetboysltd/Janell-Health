import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>Last updated: September 2026</p>
      <p>
        We collect only what is needed to match, book, and pay for home care —
        not full medical records by default.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Account: name, email, phone.</li>
        <li>Care requests: visit location, schedule, brief care summary.</li>
        <li>Providers: identity and professional documents for verification.</li>
        <li>Payments: M-Pesa transaction references (not card data).</li>
      </ul>
      <h2>How we use it</h2>
      <p>
        To operate the marketplace, verify professionals, process bookings, and
        improve safety. We do not sell personal data.
      </p>
      <h2>Sharing</h2>
      <p>
        After a booking is confirmed, patient and professional contact details
        are shared to coordinate the visit. Attachments are visible only to the
        booked professional.
      </p>
      <h2>Subprocessors</h2>
      <p>
        We use vetted third parties for SMS, M-Pesa, maps, storage, hosting,
        and optional error monitoring. See the full{" "}
        <Link href="/legal/subprocessors" className="text-sage underline">
          subprocessor register
        </Link>{" "}
        and{" "}
        <Link href="/legal/dpa" className="text-sage underline">
          data processing overview
        </Link>
        .
      </p>
      <h2>Retention</h2>
      <p>
        Data is kept only as long as needed for bookings, disputes, and legal
        obligations. OTP codes, old visit notes, dismissed complaints, and
        stale verification documents are purged automatically on a schedule.
      </p>
      <h2>Your rights</h2>
      <p>
        Contact{" "}
        <Link href="/support" className="text-sage underline">
          support
        </Link>{" "}
        to request access, correction, or deletion where applicable under
        Kenyan law. Export and erasure are available in-app when permitted.
      </p>
    </LegalPage>
  );
}
