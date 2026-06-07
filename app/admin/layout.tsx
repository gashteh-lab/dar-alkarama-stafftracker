// app/admin/layout.tsx
import { redirect } from "next/navigation";
import { getSession, hasRole } from "@/lib/auth";
import AdminShellV2 from "@/components/admin/AdminShellV2";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, "ADMIN")) redirect("/dashboard");
  return <AdminShellV2 session={session}>{children}</AdminShellV2>;
}
