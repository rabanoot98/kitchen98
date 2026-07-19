"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Fab,
  Input,
  Modal,
  PageHeader,
  Select,
  SubmitButton,
} from "@/components/ui";
import { legumeStatus, type LegumeItem, type LegumeType } from "@/lib/types";

/** תאריך מקומי בפורמט YYYY-MM-DD — לא toISOString, שמחזיר UTC ועלול להזיז יום. */
function toDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateInput(d);
}

const STATUS_TONE = {
  expired: "bg-danger-tint text-danger",
  today: "bg-warn-tint text-warn",
  soon: "bg-warn-tint text-warn",
  ok: "bg-ok-tint text-ok",
} as const;

type Draft = { id?: string; legume_type_id: string; label: string; expiry_date: string };

export default function LegumesPage() {
  const supabase = createClient();

  const [items, setItems] = useState<LegumeItem[]>([]);
  const [types, setTypes] = useState<LegumeType[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [i, t] = await Promise.all([
      supabase
        .from("legume_items")
        .select("*, legume_types(name, default_validity_days)")
        .order("expiry_date"),
      supabase.from("legume_types").select("*").order("name"),
    ]);
    if (i.error) setError(i.error.message);
    setItems((i.data as LegumeItem[]) ?? []);
    setTypes((t.data as LegumeType[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    const first = types[0];
    setDraft({
      legume_type_id: first?.id ?? "",
      label: "",
      expiry_date: addDays(first?.default_validity_days ?? 7),
    });
  }

  /** בבחירת סוג — מציעים מחדש תאריך תפוגה לפי ברירת המחדל שלו */
  function pickType(typeId: string) {
    if (!draft) return;
    const t = types.find((x) => x.id === typeId);
    setDraft({
      ...draft,
      legume_type_id: typeId,
      expiry_date: draft.id ? draft.expiry_date : addDays(t?.default_validity_days ?? 7),
    });
  }

  async function save() {
    if (!draft) return;
    setError(null);

    const payload = {
      legume_type_id: draft.legume_type_id,
      label: draft.label.trim() || null,
      expiry_date: draft.expiry_date,
    };

    const { error } = draft.id
      ? await supabase.from("legume_items").update(payload).eq("id", draft.id)
      : await supabase.from("legume_items").insert(payload);

    if (error) return setError(error.message);
    setDraft(null);
    load();
  }

  async function recheck(item: LegumeItem) {
    const days = item.legume_types?.default_validity_days ?? 7;
    const { error } = await supabase
      .from("legume_items")
      .update({ expiry_date: addDays(days), last_rechecked_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error) return setError(error.message);
    load();
  }

  async function remove(item: LegumeItem) {
    if (!confirm(`למחוק את פריט ה${item.legume_types?.name}?`)) return;
    const { error } = await supabase.from("legume_items").delete().eq("id", item.id);
    if (error) return setError(error.message);
    load();
  }

  return (
    <div>
      <PageHeader
        title="ברירת קטניות"
        subtitle="תוקף בדיקת חרקים לכל פריט"
        action={
          <div className="flex gap-2">
            <Link href="/legumes/types">
              <Button variant="pill">סוגי קטניות</Button>
            </Link>
            <Button onClick={openNew} disabled={types.length === 0} className="hidden sm:block">
              פריט חדש
            </Button>
          </div>
        }
      />

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      <Card className="!border-0 !bg-transparent sm:!border sm:!bg-surface">
        {loading ? (
          <EmptyState text="טוען…" />
        ) : items.length === 0 ? (
          <EmptyState text="אין פריטים במעקב" />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const status = legumeStatus(item.expiry_date);
              return (
                <li key={item.id} className="flex flex-col gap-2 py-4 sm:px-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[15.5px] font-semibold min-w-0 truncate">
                      {item.legume_types?.name}
                      {item.label && (
                        <span className="text-muted font-normal"> · {item.label}</span>
                      )}
                    </p>
                    <Badge tone={STATUS_TONE[status.key]}>{status.label}</Badge>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[12.5px] text-muted">
                      תוקף עד {new Date(item.expiry_date + "T00:00:00").toLocaleDateString("he-IL")}
                      {status.days > 0 && ` · עוד ${status.days} ימים`}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => recheck(item)}
                        className="text-[13px] font-semibold text-brand border border-border rounded-[10px] px-3.5 py-[7px]"
                      >
                        בררתי מחדש
                      </button>
                      <button
                        onClick={() =>
                          setDraft({
                            id: item.id,
                            legume_type_id: item.legume_type_id,
                            label: item.label ?? "",
                            expiry_date: item.expiry_date,
                          })
                        }
                        className="text-[13px] text-brand min-w-11 h-11 -my-2"
                      >
                        עריכה
                      </button>
                      <button
                        onClick={() => remove(item)}
                        className="text-[13px] text-danger min-w-11 h-11 -my-2"
                      >
                        מחיקה
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {types.length > 0 && <Fab onClick={openNew} label="פריט חדש" />}

      <Modal
        open={!!draft}
        title={draft?.id ? "עריכת פריט" : "פריט חדש למעקב"}
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
            <Select
              label="סוג"
              value={draft.legume_type_id}
              onChange={(e) => pickType(e.target.value)}
              required
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.default_validity_days} ימים)
                </option>
              ))}
            </Select>
            <Input
              label="תיאור (אופציונלי)"
              placeholder="למשל: שק מס' 2, מדף עליון"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
            <Input
              label="תאריך תפוגה"
              type="date"
              value={draft.expiry_date}
              onChange={(e) => setDraft({ ...draft, expiry_date: e.target.value })}
              required
            />

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
