"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BackHeader, Card, EmptyState } from "@/components/ui";
import type { Profile, Role } from "@/lib/types";

export default function UsersPage() {
  const supabase = createClient();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsAdmin(false);
      return;
    }
    setMyId(user.id);

    // ה-RLS מחזיר לעובד רק את השורה שלו — אם חזרה יותר משורה אחת, המשתמש מנהל.
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .order("created_at");

    if (error) setError(error.message);

    const rows = (data as Profile[]) ?? [];
    setProfiles(rows);
    setIsAdmin(rows.find((p) => p.id === user.id)?.role === "admin");
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function setRole(profile: Profile, role: Role) {
    if (role === profile.role) return;

    const verb = role === "admin" ? "למנהל" : "לעובד";
    if (!confirm(`לשנות את ההרשאה של ${profile.full_name ?? "המשתמש"} ${verb}?`)) return;

    setError(null);
    setSavingId(profile.id);

    // עדכון אופטימי — נסוג אחורה אם ה-RLS דוחה
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, role } : p)));

    const { error } = await supabase.from("profiles").update({ role }).eq("id", profile.id);

    setSavingId(null);
    if (error) {
      setError(error.message);
      load();
    }
  }

  if (isAdmin === false) {
    return (
      <div>
        <BackHeader title="ניהול הרשאות" href="/more" />
        <Card>
          <EmptyState text="דף זה זמין למנהלים בלבד." />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <BackHeader title="ניהול הרשאות" href="/more" />
      <p className="text-[12.5px] text-muted mb-5 -mt-2">
        מנהל — הרשאה מלאה בשני המודולים, כולל עריכת סוגי קטניות, נמענים ומחיקת לוג.
        עובד — הוספה, עריכה ומחיקה של מוצרים ופריטי מעקב.
      </p>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      <Card className="!border-0 !bg-transparent sm:!border sm:!bg-surface">
        {isAdmin === null ? (
          <EmptyState text="טוען…" />
        ) : profiles.length === 0 ? (
          <EmptyState text="אין משתמשים" />
        ) : (
          <ul className="divide-y divide-border">
            {profiles.map((p) => {
              const isMe = p.id === myId;
              return (
                <li key={p.id} className="flex items-center gap-3 py-3.5 sm:px-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold truncate">
                      {p.full_name ?? "ללא שם"}
                      {isMe && <span className="text-muted font-normal"> · אני</span>}
                    </p>
                    <p className="text-[12.5px] text-muted mt-0.5">
                      {p.role === "admin" ? "מנהל" : "עובד"}
                    </p>
                  </div>

                  {isMe ? (
                    // חסימת שינוי עצמי — מנהל אחרון שמוריד את עצמו נועל את כולם מחוץ להגדרות
                    <span className="text-[12.5px] text-muted shrink-0">לא ניתן לשנות את עצמך</span>
                  ) : (
                    <RoleToggle
                      value={p.role}
                      busy={savingId === p.id}
                      onChange={(role) => setRole(p, role)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function RoleToggle({
  value,
  busy,
  onChange,
}: {
  value: Role;
  busy: boolean;
  onChange: (role: Role) => void;
}) {
  const options: { role: Role; label: string }[] = [
    { role: "worker", label: "עובד" },
    { role: "admin", label: "מנהל" },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="הרשאה"
      className={`flex shrink-0 rounded-[11px] border border-border overflow-hidden ${
        busy ? "opacity-50" : ""
      }`}
    >
      {options.map((o) => {
        const active = o.role === value;
        return (
          <button
            key={o.role}
            role="radio"
            aria-checked={active}
            disabled={busy}
            onClick={() => onChange(o.role)}
            className={`h-11 px-4 text-[13px] ${
              active ? "bg-brand-soft text-brand font-semibold" : "text-muted"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
