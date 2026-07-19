# כשרות מטבח 98

ניהול מלאי מחסן + מעקב ברירת קטניות. Next.js 16 + Supabase, ממשק עברית RTL, PWA.

## הקמה

### 1. פרויקט Supabase

1. צור פרויקט חדש ב-[supabase.com](https://supabase.com).
2. ב-SQL Editor — הרץ את התוכן של [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   זה יוצר את כל הטבלאות, ה-RLS, טריגרי הלוג ונתוני הזרע (קטגוריות + אורז/חומוס).
3. Authentication → Providers → הפעל **Email** ו-**Google**
   (ל-Google צריך OAuth Client ב-Google Cloud Console, עם redirect URI ל-`https://<project>.supabase.co/auth/v1/callback`).

### 2. משתני סביבה

```bash
cp .env.example .env.local
```

מלא את `NEXT_PUBLIC_SUPABASE_URL` ו-`NEXT_PUBLIC_SUPABASE_ANON_KEY` מ-Project Settings → API.

### 3. הרצה

```bash
npm install
npm run dev
```

### 4. הגדרת המנהל הראשון

כל משתמש נרשם כ-`worker`. אחרי ההרשמה הראשונה, ב-SQL Editor:

```sql
update public.profiles set role = 'admin' where id = (
  select id from auth.users where email = 'your@email.com'
);
```

### 5. Edge Function לדיגסט היומי

```bash
npx supabase functions deploy daily-digest
npx supabase secrets set GMAIL_SMTP_USER=... GMAIL_SMTP_APP_PASSWORD=... \
  WHATSAPP_CLOUD_API_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=... WHATSAPP_TEMPLATE_NAME=...
```

תזמון (SQL Editor, אחרי הפעלת `pg_cron` ו-`pg_net` ב-Database → Extensions):

```sql
select cron.schedule(
  'daily-digest-hourly',
  '0 * * * *',   -- כל שעה עגולה; הפונקציה עצמה שולחת רק ב-10:00 שעון ישראל
  $$ select net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/daily-digest',
       headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
       body := '{}'::jsonb
     ) $$
);
```

בדיקה ידנית (שולח מיד, בלי לחכות ל-10:00):

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/daily-digest \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" -d '{"force":true}'
```

## הערות מימוש

- **לוג הפעולות נכתב ע"י טריגרים ב-DB**, לא ע"י הלקוח. לטבלת `action_logs` אין policy של `insert`,
  ולכן אי אפשר לזייף שורת לוג או לדלג עליה מצד הלקוח.
- **`is_admin()`** היא `security definer` — בלעדי זה policy על `profiles` שבודקת תפקיד ב-`profiles`
  הייתה נכנסת לרקורסיה אינסופית.
- **Turbopack לא עובד בנתיב הזה.** יש באג ב-Turbopack עם תווים לא-אנגליים בנתיב התיקייה
  (התיקייה "אפליקצייה מטבח 98"), שמפיל את ה-build. לכן `dev` ו-`build` מריצים `--webpack`.
  אם תעביר את הפרויקט לנתיב באנגלית בלבד, אפשר להוריד את הדגל ולהרוויח build מהיר יותר.
- **אייקוני PWA חסרים** — צריך להוסיף `public/icons/icon-192.png` ו-`icon-512.png`.
- אין עדיין service worker; ה-manifest קיים וההתקנה למסך הבית עובדת, אבל בלי תמיכה אופליין.

## מבנה

```
src/app/(dashboard)/   מסכים מוגנים — מלאי, קטניות, לוג, נמענים
src/app/login/         התחברות (אימייל/סיסמה + Google)
src/app/auth/callback/ חילוף קוד OAuth ל-session
src/lib/supabase/      לקוחות browser + server
src/middleware.ts      הגנה על ראוטים + רענון session
supabase/migrations/   סכמה + RLS
supabase/functions/    Edge Function לדיגסט
```
