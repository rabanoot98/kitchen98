-- תיקון באג: הפונקציה נכשלה עם "record new has no field last_rechecked_at"
-- בכל עדכון בטבלת products (מלאי), כי הביטוי המשולב עם AND ניגש לשדה
-- new.last_rechecked_at גם כשהטבלה היא לא legume_items. הפתרון: לבדוק את
-- שם הטבלה קודם ב-IF נפרד, כדי שהשדה ייבדק רק כשהוא באמת קיים בשורה.

create or replace function public.log_action()
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
    v_action := 'update';
    -- "בררתי מחדש" הוא update שבו התאריך אופס — מסומן בנפרד לצורך הלוג.
    -- הבדיקה על tg_table_name חייבת להיות ב-IF נפרד ולא באותו ביטוי AND,
    -- אחרת PL/pgSQL מנסה לפענח את new.last_rechecked_at גם עבור טבלאות
    -- אחרות (כמו products) שאין בהן שדה כזה, וזה נכשל.
    if tg_table_name = 'legume_items' then
      if new.last_rechecked_at is distinct from old.last_rechecked_at then
        v_action := 'recheck';
      end if;
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
