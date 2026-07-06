"use client";

import React, { memo } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { PrefetchLink } from "@/components/navigation/PrefetchLink";import { cn } from "@/lib/utils";
import {
  ACCOUNTS_NAV_GROUPS,
  CHART_OF_ACCOUNTS_HREF,
  isAccountsNavActive,
  type AccountsNavGroup,
} from "@/lib/accounts/accounts-nav";
import { ACCOUNTS_SCROLL_PANEL_CLASS } from "@/lib/accounts/accounts-layout-constants";
import { ACCOUNTS_SIDEBAR_GROUP_CLASS, ACCOUNTS_SIDEBAR_ITEM_CLASS } from "@/lib/accounts/accounts-typography";
import { useAccountsAccordion } from "./AccountsAccordionContext";

const CoaSidebarNavTree = dynamic(
  () => import("./CoaSidebarNav").then((m) => ({ default: m.CoaSidebarNavTree })),
  { ssr: false },
);

interface AccountsModuleShellProps {
  children: React.ReactNode;
}

const AccountsSidebarSection = memo(function AccountsSidebarSection({
  group,
  isOpen,
  onToggleSection,
  pathname,
}: {
  group: AccountsNavGroup;
  isOpen: boolean;
  onToggleSection: (sectionId: AccountsNavGroup["id"]) => void;
  pathname: string;
}) {
  const GroupIcon = group.icon;
  const isCoaSection = group.id === "coa";
  const isCoaRoute = pathname.startsWith(CHART_OF_ACCOUNTS_HREF);
  const hasActiveChild = group.items.some((item) => isAccountsNavActive(pathname, item.href));

  return (
    <div
      className={cn(
        "mb-2 rounded-lg border border-border/60 bg-white shadow-sm overflow-hidden",
        isCoaSection && isCoaRoute && isOpen && "ring-1 ring-brand-200/60",
      )}
    >
      <button
        type="button"
        onClick={() => onToggleSection(group.id)}
        aria-expanded={isOpen}
        className={cn(
          "w-full flex items-center gap-2 px-2.5 py-2 transition-colors duration-150",
          isOpen ? "bg-brand-50/50 border-b border-border/50" : "hover:bg-brand-50/40",
          hasActiveChild && !isOpen && "bg-brand-50/60",
        )}
      >
        <span
          className={cn(
            "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0",
            hasActiveChild
              ? "bg-brand-100 text-brand-700"
              : "bg-muted/60 text-muted-foreground",
          )}
        >
          <GroupIcon className="w-4 h-4" />
        </span>
        <span
          className={cn(
            "flex-1 text-left",
            ACCOUNTS_SIDEBAR_GROUP_CLASS,
            hasActiveChild ? "text-brand-800" : "text-[#6B7280]",
          )}
        >
          {group.label}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform duration-150 ease-out will-change-transform",
            isOpen ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      {isOpen && isCoaSection ? <CoaSidebarNavTree /> : null}

      {isOpen && !isCoaSection ? (
        <div className="px-2.5 pb-2 pt-1 space-y-0.5">
          {group.items.map((item) => {
            const active = isAccountsNavActive(pathname, item.href);
            const ItemIcon = item.icon;

            return (
              <PrefetchLink
                key={item.href}
                href={item.href}                className={cn(
                  "group flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-lg leading-snug",
                  ACCOUNTS_SIDEBAR_ITEM_CLASS,
                  active
                    ? "bg-[#FFF3E6] text-brand-800 font-medium"
                    : "text-[#6B7280] hover:bg-brand-50/70 hover:text-brand-800",
                )}
              >
                <ItemIcon
                  className={cn(
                    "w-4 h-4 flex-shrink-0",
                    active ? "text-brand-600" : "text-muted-foreground group-hover:text-brand-600",
                  )}
                />
                <span>{item.label}</span>
              </PrefetchLink>            );
          })}
        </div>
      ) : null}
    </div>
  );
});

export const AccountsModuleShell = memo(function AccountsModuleShell({ children }: AccountsModuleShellProps) {  const pathname = usePathname();
  const { activeAccountsSection, toggleAccountsSection } = useAccountsAccordion();

  return (
    <div className="accounts-module-shell flex h-full min-h-0 w-full overflow-hidden">
      <aside className="accounts-module-sidebar w-[min(380px,32vw)] min-w-[340px] flex-shrink-0 flex flex-col h-full min-h-0 overflow-hidden bg-white border-r border-border/80">
        <div className="flex-shrink-0 px-3 py-3 border-b border-border/60">
          <p className={cn(ACCOUNTS_SIDEBAR_GROUP_CLASS, "text-brand-800")}>Accounting</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Chart of Accounts · Transactions · Receivables · Payables · Banking · Reports
          </p>
        </div>
        <nav
          className={cn(
            ACCOUNTS_SCROLL_PANEL_CLASS,
            "h-0 flex-1 min-h-0 overflow-y-auto overscroll-contain px-2.5 py-3",
          )}
        >
          {ACCOUNTS_NAV_GROUPS.map((group) => (
            <AccountsSidebarSection
              key={group.id}
              group={group}
              pathname={pathname}
              isOpen={activeAccountsSection === group.id}
              onToggleSection={toggleAccountsSection}
            />
          ))}
        </nav>
      </aside>

      <main className="accounts-module-main flex-1 min-w-0 min-h-0 h-full overflow-hidden flex flex-col bg-slate-50/40">
        <div className={cn(ACCOUNTS_SCROLL_PANEL_CLASS, "px-3 py-2")}>{children}</div>
      </main>
    </div>
  );
});