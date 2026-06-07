// app/(staff)/layout.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import StaffShellFinal from "@/components/layout/StaffShellFinal";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <StaffShellFinal session={session}>{children}</StaffShellFinal>;
}
