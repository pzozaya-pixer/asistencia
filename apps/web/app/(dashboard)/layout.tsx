import { DashboardAuthGate } from "@/components/dashboard-auth-gate";
import { MobileShell } from "@/components/mobile-shell";

export default function DashboardGroupLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DashboardAuthGate>
      <MobileShell>{children}</MobileShell>
    </DashboardAuthGate>
  );
}
