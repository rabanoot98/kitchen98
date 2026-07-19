"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, PageHeader } from "@/components/ui";

/**
 * מסך "עוד" — מרכז את מה שלא נכנס לחמשת הטאבים: מסכי משנה, פעולות מנהל ויציאה.
 * קיים רק במובייל; בדסקטופ הפריטים האלה נגישים מהניווט העליון ומכפתורי המסכים.
 */
export default function MorePage() {
  const supabase = createClient();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    setIsAdmin(profile?.role === "admin");
    setName(profile?.full_name ?? user.email ?? "");
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function clearHistory() {
    if (!confirm("למחוק את כל היסטוריית הלוג? פעולה זו אינה הפיכה.")) return;
    const { error } = await supabase
      .from("action_logs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return setError(error.message);
    router.push("/logs");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div>
      <PageHeader title="עוד" subtitle={name ? `מחובר כ־${name}` : undefined} />

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      <Card className="mb-4">
        <ul className="divide-y divide-border">
          <NavRow href="/inventory/categories" label="ניהול קטגוריות" />
          <NavRow href="/legumes/types" label="סוגי קטניות" />
          {isAdmin && <NavRow href="/settings/recipients" label="נמעני התראות" />}
        </ul>
      </Card>

      <Card>
        <ul className="divide-y divide-border">
          {isAdmin && (
            <li>
              <button
                onClick={clearHistory}
                className="w-full text-right px-4 min-h-[52px] text-[15px] text-danger"
              >
                מחיקת היסטוריית הלוג
              </button>
            </li>
          )}
          <li>
            <button
              onClick={signOut}
              className="w-full text-right px-4 min-h-[52px] text-[15px]"
            >
              יציאה
            </button>
          </li>
        </ul>
      </Card>
    </div>
  );
}

function NavRow({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between px-4 min-h-[52px] text-[15px]"
      >
        {label}
        <span className="text-muted">←</span>
      </Link>
    </li>
  );
}
