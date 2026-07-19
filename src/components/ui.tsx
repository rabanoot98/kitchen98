"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-2xl ${className}`}>{children}</div>
  );
}

/**
 * כותרת עמוד. במובייל היא צמודה לקצוות ומופרדת בקו; בדסקטופ נשארת התצוגה הקודמת.
 * `action` מוצג בשורת הכותרת — במובייל רק אם הוא קומפקטי (כפתור פיל), אחרת עדיף FAB.
 */
export function PageHeader({
  title,
  subtitle,
  action,
  avatar,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  avatar?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4 sm:mb-5">
      <div className="min-w-0">
        <h1 className="text-[21px] sm:text-2xl font-extrabold sm:font-bold">{title}</h1>
        {subtitle && <p className="text-[12.5px] sm:text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {action}
        {avatar && (
          <span className="grid sm:hidden w-[34px] h-[34px] rounded-full bg-brand-soft text-brand font-bold place-items-center text-sm">
            {avatar}
          </span>
        )}
      </div>
    </div>
  );
}

/** כותרת של מסך פנימי — חץ חזרה + כותרת, בלי סרגל טאבים מתחת. */
export function BackHeader({ title, href }: { title: string; href: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-3 mb-4 -mt-1">
      <button
        onClick={() => router.push(href)}
        aria-label="חזרה"
        className="w-11 h-11 -mr-3 grid place-items-center text-muted text-xl"
      >
        →
      </button>
      <h1 className="text-[17px] sm:text-2xl font-bold">{title}</h1>
    </div>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: { variant?: "primary" | "ghost" | "danger" | "pill" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: "bg-brand text-white hover:opacity-90 rounded-lg px-3.5 py-2 text-sm font-medium",
    ghost: "border border-border hover:bg-background rounded-lg px-3.5 py-2 text-sm font-medium",
    danger: "text-danger border border-danger/30 hover:bg-danger/5 rounded-lg px-3.5 py-2 text-sm font-medium",
    pill: "border border-border rounded-[10px] px-3 py-1.5 text-[13px] font-semibold text-foreground hover:bg-background",
  }[variant];

  return <button {...props} className={`disabled:opacity-50 ${styles} ${className}`} />;
}

/** כפתור פעולה ראשית צף. מוסתר בדסקטופ — שם הפעולה יושבת בכותרת. */
export function Fab({ onClick, label = "הוספה" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="sm:hidden fixed left-[18px] bottom-[92px] z-30 w-[54px] h-[54px] rounded-full bg-brand text-white text-3xl leading-none grid place-items-center shadow-[0_8px_20px_rgba(29,111,92,.35)] active:scale-95 transition-transform"
    >
      +
    </button>
  );
}

/** שורת צ'יפים נגללת אופקית — מחליפה select במקומות שיש בהם מעט אפשרויות. */
export function ChipRow({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-2 overflow-x-auto overflow-y-hidden no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-1"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`whitespace-nowrap rounded-full px-3.5 h-9 text-[13px] shrink-0 ${
              active
                ? "bg-brand-soft text-brand font-semibold"
                : "bg-surface border border-border text-muted"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * בקרת כמות: מינוס / ערך / פלוס. אזור הנגיעה 44px גם כשהעיגול קטן יותר.
 * כשמועבר `onSet`, הערך האמצעי הופך לשדה שאפשר להקליד לתוכו ישירות —
 * חיוני כשצריך לקפוץ מ-0 ל-40 ולא ללחוץ פלוס ארבעים פעם.
 */
export function Stepper({
  value,
  onStep,
  onSet,
  onCommit,
  suffix,
  boxed = false,
}: {
  value: number | string;
  onStep: (delta: number) => void;
  onSet?: (raw: string) => void;
  /** נקרא ביציאה מהשדה או ב-Enter — לשמירה מושהית במקום על כל הקשה */
  onCommit?: () => void;
  suffix?: string;
  boxed?: boolean;
}) {
  const btn =
    "w-11 h-11 grid place-items-center text-xl leading-none text-foreground shrink-0";
  const circle = "w-10 h-10 rounded-full border border-border grid place-items-center";

  return (
    <div
      className={`flex items-center ${
        boxed ? "h-[46px] border border-border rounded-[11px] px-1 w-full justify-between" : ""
      }`}
    >
      <button type="button" onClick={() => onStep(-1)} aria-label="הפחתה" className={btn}>
        <span className={boxed ? "" : circle}>−</span>
      </button>

      {onSet ? (
        <input
          type="number"
          step="any"
          min="0"
          inputMode="decimal"
          aria-label="כמות"
          value={value}
          onChange={(e) => onSet(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          className="min-w-0 flex-1 w-[54px] bg-transparent !text-center text-[14.5px] font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-brand/30 rounded-md"
        />
      ) : (
        <span className="min-w-[54px] text-center text-[14.5px] font-semibold tabular-nums">
          {value}
          {suffix && ` ${suffix}`}
        </span>
      )}

      <button type="button" onClick={() => onStep(1)} aria-label="הוספה" className={btn}>
        <span className={boxed ? "" : circle}>+</span>
      </button>
    </div>
  );
}

export function Input({
  label,
  className = "",
  ...props
}: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label && <span className="text-[12.5px] text-muted">{label}</span>}
      <input
        {...props}
        className={`mt-1 w-full h-[46px] border border-border rounded-[11px] px-3 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/30 ${className}`}
      />
    </label>
  );
}

export function Select({
  label,
  className = "",
  children,
  ...props
}: { label?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      {label && <span className="text-[12.5px] text-muted">{label}</span>}
      <select
        {...props}
        className={`mt-1 w-full h-[46px] border border-border rounded-[11px] px-3 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/30 ${className}`}
      >
        {children}
      </select>
    </label>
  );
}

/** כפתור שליחה ראשי בטפסים — רוחב מלא, גובה 50. */
export function SubmitButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type={props.type ?? "submit"}
      className="w-full h-[50px] rounded-xl bg-brand text-white font-bold disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-[20px] w-[90vw] max-w-[340px] sm:max-w-md px-5 py-[22px] sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <p className="text-center text-muted py-12 text-sm">{text}</p>;
}

/** תג סטטוס / פעולה — פיל קטן. */
export function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span
      className={`text-[11.5px] font-semibold rounded-full px-2.5 py-1 whitespace-nowrap ${tone}`}
    >
      {children}
    </span>
  );
}
