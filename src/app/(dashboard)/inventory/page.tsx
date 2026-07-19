"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Button,
  Card,
  ChipRow,
  EmptyState,
  Fab,
  Input,
  Modal,
  PageHeader,
  Select,
  Stepper,
  SubmitButton,
} from "@/components/ui";
import { UNITS, type Category, type Product } from "@/lib/types";

type Draft = {
  id?: string;
  name: string;
  quantity: string;
  unit: string;
  category_id: string;
};

const EMPTY: Draft = { name: "", quantity: "0", unit: UNITS[0], category_id: "" };

/**
 * כמות בשורת הרשימה: אפשר להקליד ערך ישירות או להשתמש ב-± .
 * ההקלדה מוחזקת מקומית ונשלחת ל-DB רק ביציאה מהשדה או ב-Enter,
 * כדי לא לירות בקשת update על כל תו.
 */
function QuantityCell({
  product,
  onCommit,
}: {
  product: Product;
  onCommit: (next: number) => void;
}) {
  const [text, setText] = useState(String(product.quantity));

  // הערך מהשרת מנצח כשהוא משתנה מבחוץ (טעינה מחדש, לחיצת ±)
  const [lastSeen, setLastSeen] = useState(product.quantity);
  if (product.quantity !== lastSeen) {
    setLastSeen(product.quantity);
    setText(String(product.quantity));
  }

  function commit() {
    const next = Math.max(0, Number(text));
    if (!Number.isFinite(next)) return setText(String(product.quantity));
    setText(String(next));
    onCommit(next);
  }

  return (
    <div className="flex items-center shrink-0">
      <Stepper
        value={text}
        onStep={(delta) => onCommit(Math.max(0, Number(product.quantity) + delta))}
        onSet={setText}
        onCommit={commit}
      />
      <span className="text-[12.5px] text-muted min-w-12 shrink-0">{product.unit}</span>
    </div>
  );
}

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
      supabase.from("products").select("*, categories(name)").order("name"),
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

  /** קביעת כמות מהרשימה, בלי לפתוח את חלון העריכה */
  async function setQuantity(p: Product, next: number) {
    if (next === Number(p.quantity)) return;
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, quantity: next } : x)));
    const { error } = await supabase.from("products").update({ quantity: next }).eq("id", p.id);
    if (error) {
      setError(error.message);
      load();
    }
  }

  const visible = products.filter(
    (p) => (!filter || p.category_id === filter) && (!search || p.name.includes(search.trim()))
  );

  return (
    <div>
      <PageHeader
        title="מלאי מחסן"
        subtitle={`${products.length} מוצרים`}
        action={
          <div className="hidden sm:flex gap-2">
            <Link href="/inventory/categories">
              <Button variant="ghost">קטגוריות</Button>
            </Link>
            <Button onClick={() => setDraft({ ...EMPTY })}>מוצר חדש</Button>
          </div>
        }
      />

      <div className="relative mb-3">
        <Input
          placeholder="חיפוש מוצר…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="!mt-0 !h-11 !bg-background pr-10"
        />
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </div>

      <div className="mb-3">
        <ChipRow
          label="סינון לפי קטגוריה"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "", label: "הכל" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </div>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      <Card className="!border-0 !bg-transparent sm:!border sm:!bg-surface">
        {loading ? (
          <EmptyState text="טוען…" />
        ) : visible.length === 0 ? (
          <EmptyState text="אין מוצרים להצגה" />
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((p) => (
              <li key={p.id} className="flex items-center gap-2 py-3.5 sm:px-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[15.5px] font-semibold truncate">{p.name}</p>
                  <p className="text-[12.5px] text-muted mt-0.5">
                    {p.categories?.name ?? "ללא קטגוריה"}
                  </p>
                  <div className="flex gap-3 text-[13px] mt-1.5">
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
                      className="text-brand py-1.5 pl-1.5"
                    >
                      עריכה
                    </button>
                    <button onClick={() => remove(p)} className="text-danger py-1.5 px-1.5">
                      מחיקה
                    </button>
                  </div>
                </div>

                <QuantityCell product={p} onCommit={(next) => setQuantity(p, next)} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Fab onClick={() => setDraft({ ...EMPTY })} label="מוצר חדש" />

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
              <div>
                <span className="text-[12.5px] text-muted">כמות</span>
                <div className="mt-1">
                  <Stepper
                    boxed
                    value={draft.quantity}
                    onStep={(delta) =>
                      setDraft({
                        ...draft,
                        quantity: String(Math.max(0, (Number(draft.quantity) || 0) + delta)),
                      })
                    }
                    onSet={(raw) => setDraft({ ...draft, quantity: raw })}
                  />
                </div>
              </div>
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

            <div className="pt-2 space-y-2">
              <SubmitButton>שמירה</SubmitButton>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="w-full text-center text-sm text-muted py-2"
              >
                ביטול
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
