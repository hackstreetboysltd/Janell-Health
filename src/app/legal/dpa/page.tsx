import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export default function DpaOverviewPage() {
  return (
    <LegalPage title="Data processing overview">
      <p>Last updated: September 2026</p>
      <p>
        This page summarises how Janell Health processes personal data under the
        Kenya Data Protection Act, 2019. It is an overview for users and
        partners — not a signed contract.
      </p>

      <h2>Who is responsible</h2>
      <p>
        Janell Health is the <strong>data controller</strong> for marketplace
        accounts, bookings, and verification. Listed{" "}
        <Link href="/legal/subprocessors" className="text-sage underline">
          subprocessors
        </Link>{" "}
        act as processors on our instructions.
      </p>

      <h2>Why we process data</h2>
      <ul>
        <li>Authenticate users and manage accounts</li>
        <li>Match patients with verified caregivers and coordinate visits</li>
        <li>Process M-Pesa payments after booking acceptance</li>
        <li>Verify professional credentials</li>
        <li>Handle safety reports and operate the platform securely</li>
      </ul>

      <h2>Security</h2>
      <p>
        We use encryption in transit, access controls, upload scanning, rate
        limits, audit logging, and automated data retention. Details are in our{" "}
        <Link href="/legal/privacy" className="text-sage underline">
          Privacy policy
        </Link>
        .
      </p>

      <h2>Your rights</h2>
      <p>
        Request access, correction, or deletion via{" "}
        <Link href="/support" className="text-sage underline">
          Support
        </Link>
        . In-app export and account erasure are available when no active
        bookings block deletion.
      </p>

      <h2>International transfers</h2>
      <p>
        Some optional services (e.g. error monitoring, cloud regions outside
        Kenya) may process data abroad. We choose regions and vendors with
        appropriate safeguards where available.
      </p>

      <h2>Hospital partners</h2>
      <p>
        Referral institutions may receive their own discharge data under
        separate consent. Janell Health processes only what patients enter when
        booking home care.
      </p>
    </LegalPage>
  );
}
