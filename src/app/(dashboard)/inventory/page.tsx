"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, EmptyState, Input, Modal, PageHeader, Select } from "@/components/ui";
import { UNITS, type Category, type Product } from "@/lib/types";

type Draft = {
  id?: string;
  name: string;
  quantity: string;
  unit: string;
  category_id: string;
};

const EMPTY: Draft = { name: "", quantity: "0", unit: UNITS[0], category_id: "" };

export default function InventoryPage() {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      supabase
        .from("products")
        .select("*, categories(name)")
        .order("name"),
      supabase.from("categories").select("id, name").order("name"),
    ]);
    if (p.error) setError(p.error.message);
    setProducts((p.data as Product[]) ?? []);
    setCategories((c.data as Category[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!draft) return;
    setError(null);

    const payload = {
      name: draft.name.trim(),
      quantity: Number(draft.quantity) || 0,
      unit: draft.unit,
      category_id: draft.category_id || null,
    };

    const { error } = draft.id
      ? await supabase.from("products").update(payload).eq("id", draft.id)
      : await supabase.from("products").insert(payload);

    if (error) return setError(error.message);
    setDraft(null);
    load();
  }

  async function remove(p: Product) {
    if (!confirm(`למחוק את "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return setError(error.message);
    load();
  }

  /** שינוי כמות מהיר מהרשימה, בלי לפתוח את חלון העריכה */
  async function adjust(p: Product, delta: number) {
    const next = Math.max(0, Number(p.quantity) + delta);
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, quantity: next } : x)));
    const { error } = await supabase.from("products").update({ quantity: next }).eq("id", p.id);
    if (error) {
      setError(error.message);
      load();
    }
  }

  const visible = products.filter(
    (p) =>
      (!filter || p.category_id === filter) &&
      (!search || p.name.includes(search.trim()))
  );

  return (
    <div>
      <PageHeader
        title="ניהול מלאי מחסן"
        subtitle={`${products.length} מוצרים`}
        action={
          <div className="flex gap-2">
            <Link href="/inventory/categories">
              <Button variant="ghost">קטגוריות</Button>
            </Link>
            <Button onClick={() => setDraft({ ...EMPTY })}>מוצר חדש</Button>
          </div>
        }
      />

      <div className="flex gap-3 mb-4">
        <Input
          placeholder="חיפוש מוצר…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="!mt-0"
        />
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="!mt-0">
          <option value="">כל הקטגוריות</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      <Card>
        {loading ? (
          <EmptyState text="טוען…" />
        ) : visible.length === 0 ? (
          <EmptyState text="אין מוצרים להצגה" />
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted">{p.categories?.name ?? "ללא קטגוריה"}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => adjust(p, -1)}
                    className="w-8 h-8 rounded-lg border border-border text-lg leading-none hover:bg-background"
                    aria-label="הפחתה"
                  >
                    −
                  </button>
                  <span className="w-24 text-center text-sm tabular-nums">
                    {p.quantity} {p.unit}
                  </span>
                  <button
                    onClick={() => adjust(p, 1)}
                    className="w-8 h-8 rounded-lg border border-border text-lg leading-none hover:bg-background"
                    aria-label="הוספה"
                  >
                    +
                  </button>
                </div>

                <div className="flex gap-2 text-sm">
                  <button
                    onClick={() =>
                      setDraft({
                        id: p.id,
                        name: p.name,
                        quantity: String(p.quantity),
                        unit: p.unit,
                        category_id: p.category_id ?? "",
                      })
                    }
                    className="text-brand"
                  >
                    עריכה
                  </button>
                  <button onClick={() => remove(p)} className="text-danger">
                    מחיקה
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={!!draft}
        title={draft?.id ? "עריכת מוצר" : "מוצר חדש"}
        onClose={() => setDraft(null)}
      >
        {draft && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="space-y-3"
          >
            <Input
              label="שם המוצר"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="כמות"
                type="number"
                step="any"
                min="0"
                value={draft.quantity}
                onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
                required
              />
              <Select
                label="יחידת מידה"
                value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </div>
            <Select
              label="קטגוריה"
              value={draft.category_id}
              onChange={(e) => setDraft({ ...draft, category_id: e.target.value })}
            >
              <option value="">ללא קטגוריה</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1">
                שמירה
              </Button>
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                ביטול
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
