import { LegalPage } from "@/components/legal-page";

export default function ConductPage() {
  return (
    <LegalPage title="Professional conduct">
      <p>All Janell Health verified professionals agree to:</p>
      <ul>
        <li>Arrive on time for confirmed visits or notify the patient early.</li>
        <li>Maintain patient confidentiality and dignity.</li>
        <li>Work only within their training, registration, and scope.</li>
        <li>Never request off-platform payment to avoid platform safeguards.</li>
        <li>Report unsafe situations to Janell Health support immediately.</li>
      </ul>
      <p>
        Violations may result in suspension or removal from the platform.
        Patients may report concerns from their booking page or via{" "}
        <a href="/support">support</a>.
      </p>
    </LegalPage>
  );
}
