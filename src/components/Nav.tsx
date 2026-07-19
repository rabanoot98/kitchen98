"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";
import { BoxIcon, GrainIcon, HomeIcon, ListIcon, MoreIcon } from "@/components/icons";

const LINKS = [
  { href: "/", label: "ראשי" },
  { href: "/inventory", label: "מלאי מחסן" },
  { href: "/legumes", label: "ברירת קטניות" },
  { href: "/logs", label: "לוג פעולות" },
  { href: "/settings/recipients", label: "נמענים", adminOnly: true },
  { href: "/settings/users", label: "הרשאות", adminOnly: true },
];

const TABS = [
  { href: "/", label: "ראשי", Icon: HomeIcon },
  { href: "/inventory", label: "מלאי", Icon: BoxIcon },
  { href: "/legumes", label: "קטניות", Icon: GrainIcon },
  { href: "/logs", label: "לוג", Icon: ListIcon },
  { href: "/more", label: "עוד", Icon: MoreIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

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
    <>
      {/* ניווט עליון — דסקטופ בלבד */}
      <header className="hidden sm:block bg-surface border-b border-border sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <span className="font-bold whitespace-nowrap">כשרות מטבח 98</span>

          <nav className="flex-1 flex gap-1 overflow-x-auto">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
                  isActive(pathname, l.href)
                    ? "bg-brand-soft text-brand font-medium"
                    : "text-muted hover:bg-background"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 whitespace-nowrap">
            <span className="text-sm text-muted">
              {name}
              {role === "admin" && " · מנהל"}
            </span>
            <button onClick={signOut} className="text-sm text-muted hover:text-danger">
              יציאה
            </button>
          </div>
        </div>
      </header>

      {/* סרגל טאבים תחתון — מובייל בלבד */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border flex justify-around items-center h-[72px] pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 min-w-11 min-h-11 px-2 ${
                active ? "text-brand font-bold" : "text-tab-inactive font-normal"
              }`}
            >
              <Icon />
              <span className="text-[10.5px] leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
