// דיגסט יומי — פריטי ברירה שפג תוקפם היום או מחר.
// רץ כל שעה עגולה; שולח רק כשהשעה בישראל היא 10:00 (כדי לא להתעסק עם שעון קיץ).
// הרצה ידנית לבדיקה: POST עם body {"force": true}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const TZ = "Asia/Jerusalem";

/** תאריך YYYY-MM-DD לפי שעון ישראל */
function israelDate(offsetDays = 0): string {
  const now = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function israelHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(
      new Date()
    )
  );
}

function formatHebrewDate(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", { timeZone: TZ }).format(new Date(iso + "T00:00:00Z"));
}

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  const force = body?.force === true;

  if (!force && israelHour() !== 10) {
    return Response.json({ skipped: "not 10:00 in Israel", hour: israelHour() });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = israelDate();
  const tomorrow = israelDate(1);

  const { data: items, error } = await supabase
    .from("legume_items")
    .select("expiry_date, label, legume_types(name)")
    .in("expiry_date", [today, tomorrow])
    .order("expiry_date");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!items?.length) return Response.json({ sent: false, reason: "אין פריטים להתראה" });

  const expiringToday = items.filter((i) => i.expiry_date === today);
  const expiringTomorrow = items.filter((i) => i.expiry_date === tomorrow);

  const describe = (i: typeof items[number]) =>
    // deno-lint-ignore no-explicit-any
    `${(i.legume_types as any)?.name ?? "פריט"}${i.label ? ` (${i.label})` : ""}`;

  const lines: string[] = [];
  if (expiringToday.length) {
    lines.push(`⚠️ פג תוקף היום (${formatHebrewDate(today)}):`);
    lines.push(...expiringToday.map((i) => `• ${describe(i)}`));
  }
  if (expiringTomorrow.length) {
    if (lines.length) lines.push("");
    lines.push(`🔔 פג תוקף מחר (${formatHebrewDate(tomorrow)}):`);
    lines.push(...expiringTomorrow.map((i) => `• ${describe(i)}`));
  }
  const textBody = lines.join("\n");

  const { data: recipients } = await supabase
    .from("notification_recipients")
    .select("channel, value");

  const emails = recipients?.filter((r) => r.channel === "email").map((r) => r.value) ?? [];
  const phones = recipients?.filter((r) => r.channel === "whatsapp").map((r) => r.value) ?? [];

  const results: Record<string, unknown> = {};

  // ---- מייל דרך Gmail SMTP ----
  if (emails.length) {
    try {
      const smtp = new SMTPClient({
        connection: {
          hostname: "smtp.gmail.com",
          port: 465,
          tls: true,
          auth: {
            username: Deno.env.get("GMAIL_SMTP_USER")!,
            password: Deno.env.get("GMAIL_SMTP_APP_PASSWORD")!,
          },
        },
      });

      await smtp.send({
        from: Deno.env.get("GMAIL_SMTP_USER")!,
        to: Deno.env.get("GMAIL_SMTP_USER")!,
        bcc: emails,
        subject: `כשרות מטבח 98 — תזכורת ברירת קטניות (${formatHebrewDate(today)})`,
        content: textBody,
        html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px">
          <h2>תזכורת ברירת קטניות</h2>
          <pre style="font-family:inherit;white-space:pre-wrap">${textBody}</pre>
        </div>`,
      });
      await smtp.close();
      results.email = { sent: emails.length };
    } catch (e) {
      results.email = { error: String(e) };
    }
  }

  // ---- וואטסאפ דרך WhatsApp Cloud API ----
  if (phones.length) {
    const token = Deno.env.get("WHATSAPP_CLOUD_API_TOKEN");
    const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const template = Deno.env.get("WHATSAPP_TEMPLATE_NAME");

    const sent: string[] = [];
    const failed: Record<string, string> = {};

    for (const to of phones) {
      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: to.replace(/^\+/, ""),
            type: "template",
            template: {
              name: template,
              language: { code: "he" },
              // התבנית מצפה לפרמטר אחד: גוף ההודעה. וואטסאפ אוסר ירידות שורה בפרמטר.
              components: [
                {
                  type: "body",
                  parameters: [{ type: "text", text: textBody.replace(/\n+/g, " | ") }],
                },
              ],
            },
          }),
        });
        if (res.ok) sent.push(to);
        else failed[to] = await res.text();
      } catch (e) {
        failed[to] = String(e);
      }
    }
    results.whatsapp = { sent: sent.length, failed };
  }

  await supabase.from("action_logs").insert({
    module: "system",
    action: "digest",
    entity_name: `דיגסט יומי — ${items.length} פריטים`,
    details: { today: expiringToday.length, tomorrow: expiringTomorrow.length, results },
  });

  return Response.json({ sent: true, items: items.length, results });
});
