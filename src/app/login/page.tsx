"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("אימייל או סיסמה שגויים");
      else router.replace("/");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) setError(error.message);
      else if (!data.session) setNotice("נשלח אליך מייל אימות — יש לאשר אותו ואז להתחבר.");
      else router.replace("/");
    }

    setBusy(false);
  }

  async function handleGoogle() {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <main className="flex-1 flex flex-col justify-center p-7 max-w-sm w-full mx-auto">
      <h1 className="text-[23px] font-extrabold text-center">כשרות מטבח 98</h1>
      <p className="text-[13.5px] text-muted text-center mt-1.5 mb-[26px]">
        {mode === "signin" ? "התחברות למערכת" : "יצירת חשבון חדש"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "signup" && (
          <Field label="שם מלא" value={fullName} onChange={setFullName} type="text" required />
        )}
        <Field label="אימייל" value={email} onChange={setEmail} type="email" required />
        <Field
          label="סיסמה"
          value={password}
          onChange={setPassword}
          type="password"
          required
          minLength={6}
        />

        {error && <p className="text-sm text-danger">{error}</p>}
        {notice && <p className="text-sm text-ok">{notice}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full h-[50px] rounded-xl bg-brand text-white font-bold disabled:opacity-50"
        >
          {busy ? "רגע…" : mode === "signin" ? "התחברות" : "הרשמה"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">או</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        onClick={handleGoogle}
        className="w-full h-12 border border-border rounded-xl font-medium hover:bg-background flex items-center justify-center gap-2.5"
      >
        <GoogleMark />
        התחברות עם Google
      </button>

      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setNotice(null);
        }}
        className="w-full text-[13.5px] font-semibold text-brand mt-6"
      >
        {mode === "signin" ? "אין לך חשבון? הרשמה" : "כבר יש לך חשבון? התחברות"}
      </button>
    </main>
  );
}

/** סימן ה-G הרשמי של Google — נדרש ע"י הנחיות המותג לכפתורי התחברות. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block">
      <span className="text-[12.5px] text-muted">{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-[46px] border border-border rounded-[11px] px-3 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
