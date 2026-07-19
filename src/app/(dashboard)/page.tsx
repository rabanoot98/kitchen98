import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { legumeStatus } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: productCount }, { data: items }, { data: profile }] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("legume_items").select("expiry_date"),
    supabase.from("profiles").select("full_name").eq("id", user?.id ?? "").single(),
  ]);

  const needsAttention = (items ?? []).filter(
    (i) => legumeStatus(i.expiry_date).key !== "ok"
  ).length;

  const initial = (profile?.full_name ?? user?.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-extrabold sm:font-bold">ברוכים הבאים</h1>
          <p className="text-[13px] sm:text-sm text-muted mt-1">בחר מודול כדי להתחיל</p>
        </div>
        <span className="w-[34px] h-[34px] shrink-0 rounded-full bg-brand-soft text-brand font-bold grid place-items-center text-sm">
          {initial}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ModuleCard
          href="/inventory"
          title="ניהול מלאי מחסן"
          desc="מוצרים, כמויות וקטגוריות"
          stat={`${productCount ?? 0} מוצרים`}
        />
        <ModuleCard
          href="/legumes"
          title="מעקב ברירת קטניות"
          desc="תוקף בדיקת חרקים לפי פריט"
          stat={
            needsAttention > 0
              ? `${needsAttention} פריטים דורשים טיפול`
              : `${items?.length ?? 0} פריטים — הכל תקין`
          }
          badge={needsAttention || undefined}
        />
      </div>
    </div>
  );
}

function ModuleCard({
  href,
  title,
  desc,
  stat,
  badge,
}: {
  href: string;
  title: string;
  desc: string;
  stat: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="relative block bg-surface border border-border rounded-[20px] p-5 hover:border-brand transition-colors"
    >
      {badge !== undefined && (
        <span className="absolute top-4 left-4 bg-warn text-white text-xs font-semibold rounded-full min-w-6 h-6 px-2 grid place-items-center">
          {badge}
        </span>
      )}
      <h2 className="text-[17.5px] font-bold">{title}</h2>
      <p className="text-[13.5px] text-muted mt-[5px]">{desc}</p>
      <p className={`text-[14.5px] mt-4 font-semibold ${badge ? "text-warn" : "text-brand"}`}>
        {stat}
      </p>
    </Link>
  );
}
