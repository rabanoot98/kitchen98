"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

const LINKS = [
  { href: "/", label: "ראשי" },
  { href: "/inventory", label: "מלאי מחסן" },
  { href: "/legumes", label: "ברירת קטניות" },
  { href: "/logs", label: "לוג פעולות" },
  { href: "/settings/recipients", label: "נמענים", adminOnly: true },
];

export default function Nav({ name, role }: { name: string; role: Role }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const links = LINKS.filter((l) => !l.adminOnly || role === "admin");

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
        <span className="font-bold whitespace-nowrap">כשרות מטבח 98</span>

        <nav className="flex-1 flex gap-1 overflow-x-auto">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
                  active ? "bg-brand-soft text-brand font-medium" : "text-muted hover:bg-background"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 whitespace-nowrap">
          <span className="text-sm text-muted hidden sm:inline">
            {name}
            {role === "admin" && " · מנהל"}
          </span>
          <button onClick={signOut} className="text-sm text-muted hover:text-danger">
            יציאה
          </button>
        </div>
      </div>
    </header>
  );
}
