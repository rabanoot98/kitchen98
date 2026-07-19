"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, ChipRow, EmptyState, PageHeader } from "@/components/ui";
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

const ACTION_TONE: Record<ActionLog["action"], string> = {
  create: "bg-ok-tint text-ok",
  update: "bg-brand-soft text-brand",
  delete: "bg-danger-tint text-danger",
  recheck: "bg-warn-tint text-warn",
  digest: "bg-background text-muted",
};

const MODULE_FILTERS = [
  { value: "", label: "כל המודולים" },
  { value: "inventory", label: "מלאי" },
  { value: "legumes", label: "ברירת קטניות" },
  { value: "system", label: "מערכת" },
];

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
          // במובייל הפעולה ההרסנית יושבת במסך "עוד", לא בראש הרשימה
          isAdmin ? (
            <Button variant="danger" onClick={clearHistory} className="hidden sm:block">
              מחיקת היסטוריה
            </Button>
          ) : undefined
        }
      />

      <div className="mb-3">
        <ChipRow
          label="סינון לפי מודול"
          value={moduleFilter}
          onChange={setModuleFilter}
          options={MODULE_FILTERS}
        />
      </div>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      <Card className="!border-0 !bg-transparent sm:!border sm:!bg-surface">
        {loading ? (
          <EmptyState text="טוען…" />
        ) : visible.length === 0 ? (
          <EmptyState text="אין פעולות מתועדות" />
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((l) => (
              <li key={l.id} className="flex items-center gap-2.5 py-[13px] sm:px-4">
                <Badge tone={ACTION_TONE[l.action]}>{ACTION_LABEL[l.action]}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{l.entity_name ?? "—"}</p>
                  <p className="text-[11.5px] text-muted mt-0.5">
                    {MODULE_LABEL[l.module]} · {l.profiles?.full_name ?? "מערכת"}
                  </p>
                </div>
                <span className="text-[11px] text-tab-inactive whitespace-nowrap">
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
