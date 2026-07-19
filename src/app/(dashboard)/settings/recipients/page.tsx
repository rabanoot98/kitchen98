"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
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
        <PageHeader title="נמעני התראות" />
        <Card>
          <EmptyState text="דף זה זמין למנהלים בלבד." />
        </Card>
      </div>
    );
  }

  const emails = recipients.filter((r) => r.channel === "email");
  const phones = recipients.filter((r) => r.channel === "whatsapp");

  return (
    <div className="space-y-6">
      <PageHeader
        title="נמעני התראות"
        subtitle="מקבלים דיגסט יומי ב-10:00 על פריטים שפג תוקפם היום או מחר"
      />

      {error && <p className="text-sm text-danger">{error}</p>}

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
      <h2 className="font-bold mb-3">{title}</h2>
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
          className="!mt-0"
        />
        <Button type="submit">הוספה</Button>
      </form>

      <Card>
        {items.length === 0 ? (
          <EmptyState text={empty} />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((r) => (
              <li key={r.id} className="flex items-center justify-between p-4">
                <span dir="ltr" className="text-sm">
                  {r.value}
                </span>
                <button onClick={() => onRemove(r)} className="text-sm text-danger">
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
