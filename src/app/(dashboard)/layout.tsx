import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import type { Role } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return (
    <>
      <Nav
        name={profile?.full_name ?? user.email ?? ""}
        role={(profile?.role as Role) ?? "worker"}
      />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">{children}</main>
    </>
  );
}
