import { EmergencyBanner } from "@/components/emergency-banner";
import { SiteFooter } from "@/components/site-footer";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col pb-24">
      <EmergencyBanner />
      {children}
      <SiteFooter />
    </div>
  );
}
