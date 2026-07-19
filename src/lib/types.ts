export type Role = "admin" | "worker";

export type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
};

export type Product = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  categories?: { name: string } | null;
};

export type LegumeType = {
  id: string;
  name: string;
  default_validity_days: number;
};

export type LegumeItem = {
  id: string;
  legume_type_id: string;
  label: string | null;
  expiry_date: string;
  last_rechecked_at: string;
  created_at: string;
  legume_types?: { name: string; default_validity_days: number } | null;
};

export type Recipient = {
  id: string;
  channel: "email" | "whatsapp";
  value: string;
  created_at: string;
};

export type ActionLog = {
  id: string;
  user_id: string | null;
  module: "inventory" | "legumes" | "system";
  action: "create" | "update" | "delete" | "recheck" | "digest";
  entity_name: string | null;
  details: unknown;
  created_at: string;
  profiles?: { full_name: string | null } | null;
};

export const UNITS = ["יחידות", 'ק"ג', "קרטונים", "ליטר", "אריזות", "שקים"] as const;

/** סטטוס ברירה לפי מספר הימים שנותרו עד לפקיעת התוקף. */
export function legumeStatus(expiryDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + "T00:00:00");
  const days = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) return { key: "expired", label: "פג תוקף", days } as const;
  if (days === 0) return { key: "today", label: "פג היום", days } as const;
  if (days <= 2) return { key: "soon", label: "פג בקרוב", days } as const;
  return { key: "ok", label: "תקין", days } as const;
}
