import { LegalPage } from "@/components/legal-page";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service">
      <p>Last updated: August 2026</p>
      <p>
        Janell Health connects families with verified home-care professionals in
        Nairobi. By using the platform you agree to these terms.
      </p>
      <h2>Not emergency services</h2>
      <p>
        Janell Health is a marketplace for scheduled home visits. It is not an
        ambulance or emergency response service. In an emergency, call 999 / 112
        or go to the nearest appropriate health facility.
      </p>
      <h2>Your responsibilities</h2>
      <ul>
        <li>Provide accurate visit and contact information.</li>
        <li>Pay agreed fees through the platform payment flow.</li>
        <li>Treat professionals with respect and provide a safe working environment.</li>
      </ul>
      <h2>Professional responsibilities</h2>
      <ul>
        <li>Work within their scope of practice and valid registration.</li>
        <li>Accept or decline requests promptly and honour confirmed visits.</li>
      </ul>
      <h2>Limitation</h2>
      <p>
        Janell Health verifies credentials but does not employ professionals. Clinical
        decisions remain the responsibility of the licensed provider and the
        patient&apos;s own clinicians.
      </p>
    </LegalPage>
  );
}
