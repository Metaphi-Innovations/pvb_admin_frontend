"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACCOUNTS_SIDEBAR_GROUPS,
  isAccountsNavActive,
  resolveAccountsNavGroupId,
  type AccountsNavGroup,
} from "@/lib/accounts/accounts-nav";
import { ACCOUNTS_SCROLL_PANEL_CLASS } from "@/lib/accounts/accounts-layout-constants";
import { seedAccountsDemoData } from "@/lib/accounts/accounts-demo-seed";
import { ensureGstAccountingLedgers } from "@/lib/accounts/gst-accounting";
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
    setOpen(defaultOpen);
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

      {open && (
        <div className="mt-1 ml-1 space-y-0.5 border-l border-border/50 pl-2">
          {group.items.map((item) => {
            const active = isAccountsNavActive(pathname, item.href);
            const ItemIcon = item.icon;

            return (
              <Link
                key={item.href}
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
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AccountsModuleShell({ children }: AccountsModuleShellProps) {
  const pathname = usePathname();

  const activeGroupId = useMemo(() => resolveAccountsNavGroupId(pathname), [pathname]);

  useEffect(() => {
    const run = () => {
      seedAccountsDemoData();
      ensureGstAccountingLedgers();
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }

    const t = window.setTimeout(run, 250);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="accounts-module-shell flex h-full min-h-0 w-full overflow-hidden">
      <aside className="accounts-module-sidebar w-[min(380px,32vw)] min-w-[340px] flex-shrink-0 flex flex-col h-full min-h-0 overflow-hidden bg-white border-r border-border/80">
        <div className="flex-shrink-0 px-3 py-3 border-b border-border/60">
          <p className="text-xs font-semibold text-brand-800">Accounting</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Chart of Accounts · Transactions · Receivables · Payables · Banking · Reports
          </p>
        </div>
        <nav className={cn(ACCOUNTS_SCROLL_PANEL_CLASS, "px-2.5 py-3")}>
          <CoaSidebarNav />
          {ACCOUNTS_SIDEBAR_GROUPS.map((group) => (
            <NavGroup
              key={group.id}
              group={group}
              pathname={pathname}
              defaultOpen={activeGroupId === group.id}
            />
          ))}
        </nav>
      </aside>

      <main className="accounts-module-main flex-1 min-w-0 min-h-0 h-full overflow-hidden flex flex-col bg-slate-50/40">
        <div className={cn(ACCOUNTS_SCROLL_PANEL_CLASS, "px-4 py-3")}>{children}</div>
      </main>
    </div>
  );
}
