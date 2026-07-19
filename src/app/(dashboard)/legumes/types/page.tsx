"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import type { LegumeType } from "@/lib/types";

export default function LegumeTypesPage() {
  const supabase = createClient();

  const [types, setTypes] = useState<LegumeType[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [name, setName] = useState("");
  const [days, setDays] = useState("7");
  const [editing, setEditing] = useState<LegumeType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: types } = await supabase.from("legume_types").select("*").order("name");
    setTypes((types as LegumeType[]) ?? []);

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

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from("legume_types").insert({
      name: name.trim(),
      default_validity_days: Number(days) || 7,
    });
    if (error) {
      setError(error.code === "23505" ? "הסוג כבר קיים" : error.message);
      return;
    }
    setName("");
    setDays("7");
    load();
  }

  async function saveEdit() {
    if (!editing) return;
    setError(null);
    const { error } = await supabase
      .from("legume_types")
      .update({
        name: editing.name.trim(),
        default_validity_days: Number(editing.default_validity_days) || 7,
      })
      .eq("id", editing.id);
    if (error) return setError(error.message);
    setEditing(null);
    load();
  }

  async function remove(t: LegumeType) {
    if (!confirm(`למחוק את הסוג "${t.name}"?`)) return;
    const { error } = await supabase.from("legume_types").delete().eq("id", t.id);
    if (error) {
      setError(
        error.code === "23503"
          ? "לא ניתן למחוק סוג שיש לו פריטים במעקב"
          : error.message
      );
      return;
    }
    load();
  }

  return (
    <div>
      <PageHeader
        title="סוגי קטניות"
        subtitle="זמן תוקף ברירה ברירת־מחדל לכל סוג"
        action={
          <Link href="/legumes">
            <Button variant="ghost">חזרה למעקב</Button>
          </Link>
        }
      />

      <form onSubmit={add} className="flex gap-2 mb-4 items-end">
        <Input
          placeholder="שם הסוג"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="!mt-0"
        />
        <Input
          type="number"
          min="1"
          placeholder="ימים"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          required
          className="!mt-0 w-28"
        />
        <Button type="submit">הוספה</Button>
      </form>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}
      {!isAdmin && !loading && (
        <p className="text-xs text-muted mb-3">
          עריכה ומחיקה של סוגים קיימים זמינות למנהל בלבד.
        </p>
      )}

      <Card>
        {loading ? (
          <EmptyState text="טוען…" />
        ) : types.length === 0 ? (
          <EmptyState text="אין סוגים מוגדרים" />
        ) : (
          <ul className="divide-y divide-border">
            {types.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-4">
                {editing?.id === t.id ? (
                  <>
                    <Input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      className="!mt-0 flex-1"
                    />
                    <Input
                      type="number"
                      min="1"
                      value={String(editing.default_validity_days)}
                      onChange={(e) =>
                        setEditing({ ...editing, default_validity_days: Number(e.target.value) })
                      }
                      className="!mt-0 w-24"
                    />
                    <Button onClick={saveEdit}>שמירה</Button>
                    <Button variant="ghost" onClick={() => setEditing(null)}>
                      ביטול
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium">{t.name}</span>
                    <span className="text-sm text-muted">{t.default_validity_days} ימים</span>
                    {isAdmin && (
                      <div className="flex gap-2 text-sm">
                        <button onClick={() => setEditing(t)} className="text-brand">
                          עריכה
                        </button>
                        <button onClick={() => remove(t)} className="text-danger">
                          מחיקה
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
