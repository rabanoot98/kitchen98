"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("categories").select("id, name").order("name");
    setCategories((data as Category[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from("categories").insert({ name: name.trim() });
    if (error) {
      setError(error.code === "23505" ? "הקטגוריה כבר קיימת" : error.message);
      return;
    }
    setName("");
    load();
  }

  async function remove(c: Category) {
    if (!confirm(`למחוק את הקטגוריה "${c.name}"? מוצרים בקטגוריה זו יישארו ללא קטגוריה.`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) return setError(error.message);
    load();
  }

  return (
    <div>
      <PageHeader
        title="ניהול קטגוריות"
        action={
          <Link href="/inventory">
            <Button variant="ghost">חזרה למלאי</Button>
          </Link>
        }
      />

      <form onSubmit={add} className="flex gap-2 mb-4">
        <Input
          placeholder="שם קטגוריה חדשה"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="!mt-0"
        />
        <Button type="submit">הוספה</Button>
      </form>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      <Card>
        {loading ? (
          <EmptyState text="טוען…" />
        ) : categories.length === 0 ? (
          <EmptyState text="אין קטגוריות" />
        ) : (
          <ul className="divide-y divide-border">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between p-4">
                <span>{c.name}</span>
                <button onClick={() => remove(c)} className="text-sm text-danger">
                  מחיקה
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
