// app/(staff)/layout.tsx
import { redirect }       from "next/navigation";
import { getSession }     from "@/lib/auth";
import StaffShellFinal    from "@/components/layout/StaffShellFinal";
import StandaloneGuard    from "@/components/pwa/StandaloneGuard";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <StandaloneGuard>
      <StaffShellFinal session={session}>{children}</StaffShellFinal>
    </StandaloneGuard>
  );
}

