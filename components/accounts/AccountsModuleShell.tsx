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
import { syncGstCoaFromMaster } from "@/lib/accounts/gst-coa-sync";
import { ACCOUNTS_SIDEBAR_GROUP_CLASS, ACCOUNTS_SIDEBAR_ITEM_CLASS } from "@/lib/accounts/accounts-typography";
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
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-150",
          ACCOUNTS_SIDEBAR_GROUP_CLASS,
          hasActiveChild
            ? "text-brand-800 bg-brand-50/60"
            : "text-[#6B7280] hover:bg-brand-50/50 hover:text-brand-800",
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
        <div className="mt-1 ml-2 space-y-0.5">
          {group.items.map((item) => {
            const active = isAccountsNavActive(pathname, item.href);
            const ItemIcon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-lg leading-snug",
                  ACCOUNTS_SIDEBAR_ITEM_CLASS,
                  "transition-all duration-150",
                  active
                    ? "bg-[#FFF3E6] text-brand-800 font-medium"
                    : "text-[#6B7280] hover:bg-brand-50/70 hover:text-brand-800",
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
    seedAccountsDemoData();
    syncGstCoaFromMaster();
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "ds_gst_masters") {
        syncGstCoaFromMaster();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="accounts-module-shell flex h-full min-h-0 w-full overflow-hidden">
      <aside className="accounts-module-sidebar w-[min(380px,32vw)] min-w-[340px] flex-shrink-0 flex flex-col h-full min-h-0 overflow-hidden bg-white border-r border-border/80">
        <div className="flex-shrink-0 px-3 py-3 border-b border-border/60">
          <p className={cn(ACCOUNTS_SIDEBAR_GROUP_CLASS, "text-brand-800")}>Accounting</p>
          <p className="text-xs text-slate-500 mt-0.5">
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
        <div className={cn(ACCOUNTS_SCROLL_PANEL_CLASS, "px-3 py-2")}>{children}</div>
      </main>
    </div>
  );
}
