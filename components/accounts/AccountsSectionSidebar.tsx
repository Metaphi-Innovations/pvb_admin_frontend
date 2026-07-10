"use client";

import React, { memo, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ACCOUNTS_NAV_GROUPS,
  isAccountsNavActive,
  resolveAccountsNavGroupId,
  type AccountsNavGroup,
  type AccountsNavGroupId,
} from "@/lib/accounts/accounts-nav";
import {
  ACCOUNTS_SIDEBAR_NAV_ITEM_ACTIVE_CLASS,
  ACCOUNTS_SIDEBAR_NAV_ITEM_CLASS,
  ACCOUNTS_SIDEBAR_STICKY_HEAD_CLASS,
} from "@/lib/accounts/accounts-typography";
import { AccountsSidebarModuleHeader } from "./AccountsSidebarModuleHeader";
import { useAccountsSidebar } from "./AccountsSidebarContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** COA tree — code-split; mounts only when Chart of Accounts section is active. */
const CoaSidebarNavTree = dynamic(
  () => import("./CoaSidebarNav").then((m) => ({ default: m.CoaSidebarNavTree })),
  { ssr: false, loading: () => <CoaSidebarSkeleton /> },
);

function CoaSidebarSkeleton({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className={cn("py-2 space-y-2", collapsed ? "px-1.5" : "px-3")}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-muted/60 animate-pulse rounded mx-auto"
          style={{ width: collapsed ? "1.5rem" : `${72 - i * 10}%` }}
        />
      ))}
    </div>
  );
}

const SectionNavLink = memo(function SectionNavLink({
  href,
  label,
  icon: ItemIcon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: AccountsNavGroup["items"][number]["icon"];
  active: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? undefined : label}
      className={cn(
        ACCOUNTS_SIDEBAR_NAV_ITEM_CLASS,
        active && ACCOUNTS_SIDEBAR_NAV_ITEM_ACTIVE_CLASS,
        collapsed && "is-collapsed",
      )}
    >
      <ItemIcon
        className={cn(
          "w-4 h-4 flex-shrink-0",
          active ? "text-brand-600" : "text-muted-foreground",
        )}
      />
      <span>{label}</span>
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
});

/** Flat link list for Transactions / Receivables / Payables / Banking / Reports. */
const FlatSectionMenu = memo(function FlatSectionMenu({
  group,
  collapsed,
}: {
  group: AccountsNavGroup;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const { toggleCollapsed } = useAccountsSidebar();

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className={cn(ACCOUNTS_SIDEBAR_STICKY_HEAD_CLASS, collapsed && "pb-1")}>
        <AccountsSidebarModuleHeader
          title={group.label}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </div>
      <nav
        aria-label={group.label}
        className={cn(
          "accounts-sidebar-section-scroll overflow-y-auto overscroll-contain max-h-full min-h-0",
          collapsed ? "px-1.5 pt-1 pb-2 space-y-1" : "px-3 pt-2 pb-3 space-y-0.5",
        )}
      >
        {group.items.map((item) => (
          <SectionNavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isAccountsNavActive(pathname, item.href)}
            collapsed={collapsed}
          />
        ))}
      </nav>
    </div>
  );
});

/** Chart of Accounts — title + search sticky; tree scrolls below. */
const CoaSectionSidebar = memo(function CoaSectionSidebar({
  title,
  collapsed,
}: {
  title: string;
  collapsed: boolean;
}) {
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <CoaSidebarNavTree moduleTitle={title} collapsed={collapsed} />
    </div>
  );
});

function getNavGroup(sectionId: AccountsNavGroupId): AccountsNavGroup {
  return ACCOUNTS_NAV_GROUPS.find((g) => g.id === sectionId) ?? ACCOUNTS_NAV_GROUPS[0];
}

/**
 * Contextual left rail — renders ONLY the active Accounts sub-module.
 * Top navbar selects the module; this sidebar never lists all six sections.
 */
export const AccountsSectionSidebar = memo(function AccountsSectionSidebar({
  sectionId,
  collapsed,
}: {
  sectionId: AccountsNavGroupId;
  collapsed: boolean;
}) {
  const group = useMemo(() => getNavGroup(sectionId), [sectionId]);

  if (sectionId === "coa") {
    return <CoaSectionSidebar title={group.label} collapsed={collapsed} />;
  }

  return <FlatSectionMenu group={group} collapsed={collapsed} />;
});

/** Active Accounts section from the current route (driven by top navbar navigation). */
export function useActiveAccountsSectionId(): AccountsNavGroupId {
  const pathname = usePathname();
  return useMemo(() => resolveAccountsNavGroupId(pathname), [pathname]);
}
