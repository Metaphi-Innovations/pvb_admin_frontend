"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACCOUNTS_NAV_GROUPS,
  CHART_OF_ACCOUNTS_HREF,
  isAccountsNavActive,
  type AccountsNavGroup,
} from "@/lib/accounts/accounts-nav";
import { CoaSidebarNav } from "./CoaSidebarNav";

interface AccountsModuleShellProps {
  children: React.ReactNode;
}

function NavGroup({
  group,
  defaultOpen,
  pathname,
}: {
  group: AccountsNavGroup;
  defaultOpen: boolean;
  pathname: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const GroupIcon = group.icon;
  const hasActiveChild = group.items.some((item) => isAccountsNavActive(pathname, item.href));

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150",
          hasActiveChild
            ? "text-brand-800 bg-brand-50/60"
            : "text-foreground/80 hover:bg-brand-50/50 hover:text-brand-800",
        )}
      >
        <span
          className={cn(
            "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors",
            hasActiveChild
              ? "bg-brand-100 text-brand-700"
              : "bg-muted/60 text-muted-foreground group-hover:text-brand-600",
          )}
        >
          <GroupIcon className="w-4 h-4" />
        </span>
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-1 ml-1 space-y-0.5 border-l border-border/50 pl-2">
            {group.items.map((item) => {
              const active = isAccountsNavActive(pathname, item.href);
              const ItemIcon = item.icon;
              const isCoaItem = item.href === CHART_OF_ACCOUNTS_HREF;

              return (
                <React.Fragment key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-2.5 pl-2.5 pr-2.5 py-2 rounded-r-lg text-[13px] leading-snug",
                      "border-l-2 -ml-[1px] transition-all duration-150",
                      active
                        ? "border-brand-600 bg-brand-50 text-brand-800 font-semibold"
                        : "border-transparent text-foreground/75 hover:bg-brand-50/70 hover:text-brand-800 hover:border-brand-300",
                    )}
                  >
                    <ItemIcon
                      className={cn(
                        "w-4 h-4 flex-shrink-0 transition-colors",
                        active ? "text-brand-600" : "text-muted-foreground group-hover:text-brand-600",
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                  {isCoaItem && group.id === "masters" && <CoaSidebarNav />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccountsModuleShell({ children }: AccountsModuleShellProps) {
  const pathname = usePathname();

  const activeGroupId = useMemo(() => {
    for (const group of ACCOUNTS_NAV_GROUPS) {
      if (group.items.some((item) => isAccountsNavActive(pathname, item.href))) {
        return group.id;
      }
    }
    return "masters";
  }, [pathname]);

  return (
    <div className="flex flex-1 min-h-0 w-full">
      <aside className="w-[min(380px,32vw)] min-w-[340px] flex-shrink-0 flex flex-col bg-white border-r border-border/80">
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-4">
          {ACCOUNTS_NAV_GROUPS.map((group) => (
            <NavGroup
              key={group.id}
              group={group}
              pathname={pathname}
              defaultOpen={activeGroupId === group.id}
            />
          ))}
        </nav>
      </aside>
      <main className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col bg-slate-50/40 px-4 py-3">
        {children}
      </main>
    </div>
  );
}
