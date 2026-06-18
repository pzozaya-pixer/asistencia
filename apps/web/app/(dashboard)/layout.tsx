import { MobileShell } from "@/components/mobile-shell";

export default function DashboardGroupLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <MobileShell>{children}</MobileShell>;
}
