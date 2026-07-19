-- כשרות מטבח 98 — סכמה ראשונית
-- מודול מלאי + מודול ברירת קטניות + לוג פעולות + נמעני התראות

-- ============================================================
-- 1. פרופילים
-- ============================================================

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       text not null default 'worker' check (role in ('admin', 'worker')),
  created_at timestamptz not null default now()
);

-- יצירת פרופיל אוטומטית בהרשמה (גם אימייל/סיסמה וגם Google OAuth)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- פונקציית עזר לבדיקת תפקיד admin.
-- security definer כדי לעקוף RLS על profiles ולמנוע רקורסיה אינסופית בפוליסיז.
create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- 2. מודול מלאי
-- ============================================================

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  quantity    numeric not null default 0,
  unit        text not null,
  category_id uuid references public.categories(id) on delete set null,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);

-- ============================================================
-- 3. מודול ברירת קטניות
-- ============================================================

create table public.legume_types (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null unique,
  default_validity_days int not null default 7 check (default_validity_days > 0),
  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now()
);

create table public.legume_items (
  id                uuid primary key default gen_random_uuid(),
  legume_type_id    uuid not null references public.legume_types(id) on delete restrict,
  label             text,
  expiry_date       date not null,
  last_rechecked_at timestamptz not null default now(),
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index legume_items_expiry_date_idx on public.legume_items (expiry_date);

-- ============================================================
-- 4. נמעני התראות
-- ============================================================

create table public.notification_recipients (
  id         uuid primary key default gen_random_uuid(),
  channel    text not null check (channel in ('email', 'whatsapp')),
  value      text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (channel, value)
);

-- ============================================================
-- 5. לוג פעולות
-- ============================================================

create table public.action_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  module      text not null check (module in ('inventory', 'legumes', 'system')),
  action      text not null check (action in ('create', 'update', 'delete', 'recheck', 'digest')),
  entity_name text,
  details     jsonb,
  created_at  timestamptz not null default now()
);

create index action_logs_created_at_idx on public.action_logs (created_at desc);

-- הלוג נכתב ע"י טריגרים בצד ה-DB, לא ע"י הלקוח — כך אי אפשר לפעול בלי להשאיר עקבות.
create function public.log_action()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_module text := tg_argv[0];
  v_action text;
  v_name   text;
  v_row    record;
begin
  if tg_op = 'DELETE' then
    v_action := 'delete';
    v_row := old;
  elsif tg_op = 'INSERT' then
    v_action := 'create';
    v_row := new;
  else
    -- "בררתי מחדש" הוא update שבו התאריך אופס — מסומן בנפרד לצורך הלוג
    if tg_table_name = 'legume_items' and new.last_rechecked_at is distinct from old.last_rechecked_at then
      v_action := 'recheck';
    else
      v_action := 'update';
    end if;
    v_row := new;
  end if;

  if tg_table_name = 'legume_items' then
    select lt.name into v_name from public.legume_types lt where lt.id = v_row.legume_type_id;
  else
    v_name := v_row.name;
  end if;

  insert into public.action_logs (user_id, module, action, entity_name, details)
  values (auth.uid(), v_module, v_action, v_name, to_jsonb(v_row));

  return v_row;
end;
$$;

create trigger products_log
  after insert or update or delete on public.products
  for each row execute function public.log_action('inventory');

create trigger categories_log
  after insert or update or delete on public.categories
  for each row execute function public.log_action('inventory');

create trigger legume_types_log
  after insert or update or delete on public.legume_types
  for each row execute function public.log_action('legumes');

create trigger legume_items_log
  after insert or update or delete on public.legume_items
  for each row execute function public.log_action('legumes');

-- עדכון updated_at אוטומטי במוצרים
create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 6. Row Level Security
-- ============================================================

alter table public.profiles                enable row level security;
alter table public.categories              enable row level security;
alter table public.products                enable row level security;
alter table public.legume_types            enable row level security;
alter table public.legume_items            enable row level security;
alter table public.notification_recipients enable row level security;
alter table public.action_logs             enable row level security;

-- profiles: המשתמש רואה את עצמו, admin רואה הכל ומשנה תפקידים
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- categories + products: קריאה לכל מחובר, כתיבה מלאה ל-admin ולעובד
create policy categories_select on public.categories
  for select to authenticated using (true);
create policy categories_write on public.categories
  for all to authenticated using (true) with check (true);

create policy products_select on public.products
  for select to authenticated using (true);
create policy products_write on public.products
  for all to authenticated using (true) with check (true);

-- legume_types: כולם קוראים ומוסיפים; עריכה ומחיקה — admin בלבד
create policy legume_types_select on public.legume_types
  for select to authenticated using (true);
create policy legume_types_insert on public.legume_types
  for insert to authenticated with check (true);
create policy legume_types_update_admin on public.legume_types
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy legume_types_delete_admin on public.legume_types
  for delete to authenticated using (public.is_admin());

-- legume_items: כתיבה מלאה ל-admin ולעובד
create policy legume_items_select on public.legume_items
  for select to authenticated using (true);
create policy legume_items_write on public.legume_items
  for all to authenticated using (true) with check (true);

-- notification_recipients: קריאה לכולם, כתיבה ל-admin בלבד
create policy recipients_select on public.notification_recipients
  for select to authenticated using (true);
create policy recipients_write_admin on public.notification_recipients
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- action_logs: קריאה לכולם, מחיקה ל-admin בלבד.
-- אין פוליסת insert — הכתיבה מגיעה רק מהטריגרים (security definer), כך שאי אפשר לזייף שורות לוג.
create policy action_logs_select on public.action_logs
  for select to authenticated using (true);
create policy action_logs_delete_admin on public.action_logs
  for delete to authenticated using (public.is_admin());

-- ============================================================
-- 7. נתוני זרע
-- ============================================================

insert into public.categories (name) values
  ('יבשים'), ('חלב'), ('בשר'), ('ירקות ופירות'), ('שתייה'), ('חד פעמי'), ('ניקיון'), ('אחר');

insert into public.legume_types (name, default_validity_days) values
  ('אורז', 7), ('חומוס', 7);
