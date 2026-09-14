import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export default function SubprocessorsPage() {
  return (
    <LegalPage title="Subprocessor register">
      <p>Last updated: September 2026</p>
      <p>
        Janell Health uses trusted third parties to operate the marketplace. Each
        receives only the data needed for its function. See also our{" "}
        <Link href="/legal/privacy" className="text-sage underline">
          Privacy policy
        </Link>{" "}
        and{" "}
        <Link href="/legal/dpa" className="text-sage underline">
          DPA overview
        </Link>
        .
      </p>

      <div className="not-prose mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-mist">
              <th className="py-2 pr-3 font-semibold">Provider</th>
              <th className="py-2 pr-3 font-semibold">Purpose</th>
              <th className="py-2 font-semibold">Data</th>
            </tr>
          </thead>
          <tbody className="text-ink/75">
            <tr className="border-b border-mist/70">
              <td className="py-2.5 pr-3 font-medium">Safaricom (M-Pesa)</td>
              <td className="py-2.5 pr-3">STK push &amp; payment callbacks</td>
              <td className="py-2.5">Phone, amount, transaction refs</td>
            </tr>
            <tr className="border-b border-mist/70">
              <td className="py-2.5 pr-3 font-medium">Africa&apos;s Talking</td>
              <td className="py-2.5 pr-3">SMS one-time codes</td>
              <td className="py-2.5">Phone number</td>
            </tr>
            <tr className="border-b border-mist/70">
              <td className="py-2.5 pr-3 font-medium">Google (optional)</td>
              <td className="py-2.5 pr-3">Sign-in with Google</td>
              <td className="py-2.5">Name, email, profile image</td>
            </tr>
            <tr className="border-b border-mist/70">
              <td className="py-2.5 pr-3 font-medium">Sentry (optional)</td>
              <td className="py-2.5 pr-3">Error monitoring</td>
              <td className="py-2.5">Scrubbed logs, request metadata</td>
            </tr>
            <tr className="border-b border-mist/70">
              <td className="py-2.5 pr-3 font-medium">Cloud storage</td>
              <td className="py-2.5 pr-3">Attachments &amp; verification docs</td>
              <td className="py-2.5">Uploaded files</td>
            </tr>
            <tr className="border-b border-mist/70">
              <td className="py-2.5 pr-3 font-medium">Database host</td>
              <td className="py-2.5 pr-3">PostgreSQL</td>
              <td className="py-2.5">Account &amp; booking data</td>
            </tr>
            <tr className="border-b border-mist/70">
              <td className="py-2.5 pr-3 font-medium">Photon / OpenStreetMap</td>
              <td className="py-2.5 pr-3">Address search &amp; maps</td>
              <td className="py-2.5">Place search queries</td>
            </tr>
            <tr>
              <td className="py-2.5 pr-3 font-medium">Hosting provider</td>
              <td className="py-2.5 pr-3">App runtime</td>
              <td className="py-2.5">HTTP logs, session cookies</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="mt-8">Changes</h2>
      <p>
        We update this register when subprocessors change. Material changes are
        reflected in the privacy policy.
      </p>
      <h2>Contact</h2>
      <p>
        Questions:{" "}
        <Link href="/support" className="text-sage underline">
          Support
        </Link>
        .
      </p>
    </LegalPage>
  );
}
