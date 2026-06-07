// app/(auth)/layout.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // If already logged in, redirect away from auth pages
  const session = await getSession();

  if (session) {
    const redirectMap: Record<string, string> = {
      SUPER_ADMIN: "/admin/dashboard",
      ADMIN:       "/admin/dashboard",
      MANAGER:     "/manager/team",
      STAFF:       "/dashboard",
    };
    redirect(redirectMap[session.role] || "/dashboard");
  }

  return <>{children}</>;
}
