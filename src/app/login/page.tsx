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
    <main className="flex-1 grid place-items-center p-6">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-7 shadow-sm">
        <h1 className="text-2xl font-bold text-center">כשרות מטבח 98</h1>
        <p className="text-sm text-muted text-center mt-1">
          {mode === "signin" ? "התחברות למערכת" : "יצירת חשבון חדש"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          {mode === "signup" && (
            <Field
              label="שם מלא"
              value={fullName}
              onChange={setFullName}
              type="text"
              required
            />
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
            className="w-full bg-brand text-white rounded-lg py-2.5 font-medium disabled:opacity-50"
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
          className="w-full border border-border rounded-lg py-2.5 font-medium hover:bg-background"
        >
          התחברות עם Google
        </button>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="w-full text-sm text-brand mt-5"
        >
          {mode === "signin" ? "אין לך חשבון? הרשמה" : "כבר יש לך חשבון? התחברות"}
        </button>
      </div>
    </main>
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
      <span className="text-sm text-muted">{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-border rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
