"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { isAccountsNavActive, type AccountsNavLink } from "@/lib/accounts/accounts-nav";
import { ACCOUNTS_SIDEBAR_GROUP_CLASS, ACCOUNTS_SIDEBAR_ITEM_CLASS } from "@/lib/accounts/accounts-typography";

export function ContextualSidebarNav({
  label,
  icon: Icon,
  items,
}: {
  label: string;
  icon: LucideIcon;
  items: AccountsNavLink[];
}) {
  const pathname = usePathname();

  return (
    <div className="px-2.5 py-4">
      <div className="flex items-center gap-2.5 px-2.5 py-2 mb-2">
        <span className="w-7 h-7 rounded-md flex items-center justify-center bg-brand-100 text-brand-700">
          <Icon className="w-4 h-4" />
        </span>
        <span className={cn(ACCOUNTS_SIDEBAR_GROUP_CLASS, "text-brand-800")}>{label}</span>
      </div>
      <nav className="space-y-0.5 border-l border-border/50 ml-3 pl-2">
        {items.map((item) => {
          const active = isAccountsNavActive(pathname, item.href);
          const ItemIcon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-2.5 pl-2.5 pr-2.5 py-2 rounded-r-lg leading-snug",
                ACCOUNTS_SIDEBAR_ITEM_CLASS,
                "border-l-2 -ml-[1px] transition-all duration-150",
                active
                  ? "border-brand-600 bg-brand-50 text-brand-800 font-semibold"
                  : "border-transparent text-slate-600 hover:bg-brand-50/70 hover:text-brand-800 hover:border-brand-300",
              )}
            >
              <ItemIcon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  active ? "text-brand-600" : "text-muted-foreground group-hover:text-brand-600",
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
