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
  // getSession (לא getUser) בכוונה: ה-middleware כבר אימת את המשתמש מול השרת
  // בכל בקשה (getUser) והפנה החוצה מי שלא מחובר — כאן מספיק לקרוא מה-cookie
  // בלי סיבוב רשת נוסף.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", session.user.id)
    .single();

  return (
    <>
      <Nav
        name={profile?.full_name ?? session.user.email ?? ""}
        role={(profile?.role as Role) ?? "worker"}
      />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">{children}</main>
    </>
  );
}
