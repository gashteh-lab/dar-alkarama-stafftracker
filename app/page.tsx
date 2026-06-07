// app/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function RootPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Redirect to appropriate dashboard
  const redirectMap: Record<string, string> = {
    SUPER_ADMIN: "/admin/dashboard",
    ADMIN:       "/admin/dashboard",
    MANAGER:     "/manager/team",
    STAFF:       "/dashboard",
  };

  redirect(redirectMap[session.role] || "/dashboard");
}
