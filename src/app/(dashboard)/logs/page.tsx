"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, EmptyState, PageHeader, Select } from "@/components/ui";
import type { ActionLog } from "@/lib/types";

const ACTION_LABEL: Record<ActionLog["action"], string> = {
  create: "הוספה",
  update: "עדכון",
  delete: "מחיקה",
  recheck: "בררתי מחדש",
  digest: "שליחת דיגסט",
};

const MODULE_LABEL: Record<ActionLog["module"], string> = {
  inventory: "מלאי",
  legumes: "ברירת קטניות",
  system: "מערכת",
};

const ACTION_STYLE: Record<ActionLog["action"], string> = {
  create: "bg-ok/10 text-ok",
  update: "bg-brand-soft text-brand",
  delete: "bg-danger/10 text-danger",
  recheck: "bg-warn/10 text-warn",
  digest: "bg-background text-muted",
};

export default function LogsPage() {
  const supabase = createClient();

  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [moduleFilter, setModuleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("action_logs")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) setError(error.message);
    setLogs((data as ActionLog[]) ?? []);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setIsAdmin(profile?.role === "admin");
    }
    setLoading(false);
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
    load();
  }

  const visible = logs.filter((l) => !moduleFilter || l.module === moduleFilter);

  return (
    <div>
      <PageHeader
        title="לוג פעולות"
        subtitle="300 הפעולות האחרונות"
        action={
          isAdmin ? (
            <Button variant="danger" onClick={clearHistory}>
              מחיקת היסטוריה
            </Button>
          ) : undefined
        }
      />

      <Select
        value={moduleFilter}
        onChange={(e) => setModuleFilter(e.target.value)}
        className="!mt-0 mb-4 max-w-xs"
      >
        <option value="">כל המודולים</option>
        <option value="inventory">מלאי</option>
        <option value="legumes">ברירת קטניות</option>
        <option value="system">מערכת</option>
      </Select>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      <Card>
        {loading ? (
          <EmptyState text="טוען…" />
        ) : visible.length === 0 ? (
          <EmptyState text="אין פעולות מתועדות" />
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((l) => (
              <li key={l.id} className="flex items-center gap-3 p-4">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${
                    ACTION_STYLE[l.action]
                  }`}
                >
                  {ACTION_LABEL[l.action]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{l.entity_name ?? "—"}</p>
                  <p className="text-xs text-muted">
                    {MODULE_LABEL[l.module]} · {l.profiles?.full_name ?? "מערכת"}
                  </p>
                </div>
                <span className="text-xs text-muted whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString("he-IL", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
