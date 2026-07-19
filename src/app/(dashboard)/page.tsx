import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { legumeStatus } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ count: productCount }, { data: items }] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("legume_items").select("expiry_date"),
  ]);

  const needsAttention = (items ?? []).filter(
    (i) => legumeStatus(i.expiry_date).key !== "ok"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ברוכים הבאים</h1>
        <p className="text-sm text-muted mt-1">בחר מודול כדי להתחיל</p>
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
          alert={needsAttention > 0}
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
  alert,
}: {
  href: string;
  title: string;
  desc: string;
  stat: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className="block bg-surface border border-border rounded-2xl p-6 hover:border-brand transition-colors"
    >
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-sm text-muted mt-1">{desc}</p>
      <p className={`text-sm mt-4 font-medium ${alert ? "text-warn" : "text-brand"}`}>{stat}</p>
    </Link>
  );
}
