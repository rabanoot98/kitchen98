"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BackHeader, Card, EmptyState, Input } from "@/components/ui";
import type { Recipient } from "@/lib/types";

export default function RecipientsPage() {
  const supabase = createClient();

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notification_recipients")
      .select("*")
      .order("created_at");
    setRecipients((data as Recipient[]) ?? []);

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
    } else {
      setIsAdmin(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(channel: "email" | "whatsapp", value: string) {
    setError(null);
    const trimmed = value.trim();
    if (!trimmed) return;

    if (channel === "whatsapp" && !/^\+\d{9,15}$/.test(trimmed)) {
      setError("מספר וואטסאפ חייב להיות בפורמט בינלאומי, למשל ‎+972501234567");
      return;
    }

    const { error } = await supabase
      .from("notification_recipients")
      .insert({ channel, value: trimmed });

    if (error) {
      setError(error.code === "23505" ? "הנמען כבר קיים ברשימה" : error.message);
      return;
    }
    if (channel === "email") setEmail("");
    else setPhone("");
    load();
  }

  async function remove(r: Recipient) {
    if (!confirm(`להסיר את ${r.value} מרשימת הנמענים?`)) return;
    const { error } = await supabase.from("notification_recipients").delete().eq("id", r.id);
    if (error) return setError(error.message);
    load();
  }

  if (isAdmin === false) {
    return (
      <div>
        <BackHeader title="נמעני התראות" href="/more" />
        <Card>
          <EmptyState text="דף זה זמין למנהלים בלבד." />
        </Card>
      </div>
    );
  }

  const emails = recipients.filter((r) => r.channel === "email");
  const phones = recipients.filter((r) => r.channel === "whatsapp");

  return (
    <div>
      <BackHeader title="נמעני התראות" href="/more" />
      <p className="text-[12.5px] text-muted mb-5 -mt-2">
        מקבלים דיגסט יומי ב-10:00 על פריטים שפג תוקפם היום או מחר
      </p>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      <div className="space-y-6">
        <ChannelSection
          title="כתובות מייל"
          placeholder="name@example.com"
          type="email"
          value={email}
          onChange={setEmail}
          onAdd={() => add("email", email)}
          items={emails}
          onRemove={remove}
          empty="לא הוגדרו כתובות מייל"
        />

        <ChannelSection
          title="מספרי וואטסאפ"
          placeholder="+972501234567"
          type="tel"
          value={phone}
          onChange={setPhone}
          onAdd={() => add("whatsapp", phone)}
          items={phones}
          onRemove={remove}
          empty="לא הוגדרו מספרי וואטסאפ"
        />
      </div>
    </div>
  );
}

function ChannelSection({
  title,
  placeholder,
  type,
  value,
  onChange,
  onAdd,
  items,
  onRemove,
  empty,
}: {
  title: string;
  placeholder: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  items: Recipient[];
  onRemove: (r: Recipient) => void;
  empty: string;
}) {
  return (
    <section>
      <h2 className="font-bold mb-3 text-[15px]">{title}</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd();
        }}
        className="flex gap-2 mb-3"
      >
        <Input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="!mt-0 !h-11"
        />
        <button
          type="submit"
          className="h-11 px-5 shrink-0 rounded-[11px] bg-brand text-white text-sm font-semibold"
        >
          הוספה
        </button>
      </form>

      <Card className="!border-0 !bg-transparent sm:!border sm:!bg-surface">
        {items.length === 0 ? (
          <EmptyState text={empty} />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3.5 sm:px-4">
                <span dir="ltr" className="text-[15px]">
                  {r.value}
                </span>
                <button
                  onClick={() => onRemove(r)}
                  className="text-[13.5px] text-danger min-w-11 h-11 -my-3"
                >
                  הסרה
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
