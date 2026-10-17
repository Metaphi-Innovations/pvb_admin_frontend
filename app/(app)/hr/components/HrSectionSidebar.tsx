"use client";

import React, { memo, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HR_NAV_GROUPS,
  getHrGroupLandingHref,
  hrGroupIsExpandable,
  isHrNavActive,
  resolveHrNavGroupId,
  type HrNavGroup,
  type HrNavGroupId,
  type HrNavLink,
} from "@/lib/hr/hr-nav";
import { HrSidebarModuleHeader } from "./HrSidebarModuleHeader";
import { useHrSidebar } from "./HrSidebarContext";
import { HrSettingsSidebar } from "./HrSettingsSidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigationPendingOptional } from "@/components/navigation/NavigationPendingContext";

/** Sidebar links never prefetch — page chunks load on navigation only. */
const HR_SIDEBAR_PREFETCH = false;

function PageNavLink({
  href,
  label,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  const pending = useNavigationPendingOptional();
  const isPending = pending?.isHrefPending(href) ?? false;
  const isDisabled = isPending && !active;

  const link = (
    <Link
      href={href}
      scroll={false}
      prefetch={HR_SIDEBAR_PREFETCH}
      aria-current={active ? "page" : undefined}
      aria-disabled={isDisabled || undefined}
      aria-label={collapsed ? label : undefined}
      onClick={(e) => {
        if (isDisabled) {
          e.preventDefault();
          return;
        }
        pending?.navigateTo(href, label, e);
      }}
      className={cn(
        "hr-sidebar-page-item",
        active && "is-active",
        collapsed && "is-collapsed",
        isDisabled && "pointer-events-none opacity-60",
      )}
    >
      {isPending ? (
        <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin text-brand-600" aria-hidden />
      ) : (
        <span className={cn("hr-sidebar-page-dot", active && "is-active")} aria-hidden />
      )}
      <span className="truncate">{label}</span>
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
}

function ModuleLeafLink({
  href,
  label,
  icon: ItemIcon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: HrNavLink["icon"];
  active: boolean;
  collapsed: boolean;
}) {
  const pending = useNavigationPendingOptional();
  const isPending = pending?.isHrefPending(href) ?? false;
  const isDisabled = isPending && !active;

  const link = (
    <Link
      href={href}
      scroll={false}
      prefetch={HR_SIDEBAR_PREFETCH}
      aria-current={active ? "page" : undefined}
      aria-disabled={isDisabled || undefined}
      aria-label={collapsed ? label : undefined}
      onClick={(e) => {
        if (isDisabled) {
          e.preventDefault();
          return;
        }
        pending?.navigateTo(href, label, e);
      }}
      className={cn(
        "hr-sidebar-module-item",
        active && "is-active",
        collapsed && "is-collapsed",
        isDisabled && "pointer-events-none opacity-60",
      )}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin text-brand-600" aria-hidden />
      ) : (
        <ItemIcon
          className={cn("w-4 h-4 flex-shrink-0", active ? "text-brand-600" : "text-muted-foreground")}
        />
      )}
      <span className="truncate">{label}</span>
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
}

function ModuleGroup({
  group,
  activeSectionId,
  expanded,
  onToggle,
  collapsed,
  search,
  pathname,
}: {
  group: HrNavGroup;
  activeSectionId: HrNavGroupId;
  expanded: boolean;
  onToggle: () => void;
  collapsed: boolean;
  search: string;
  pathname: string;
}) {
  const pending = useNavigationPendingOptional();
  const expandable = hrGroupIsExpandable(group);
  const landing = getHrGroupLandingHref(group);
  const sectionActive = activeSectionId === group.id;
  const GroupIcon = group.icon;

  // Leaf modules (HR Letters, Offboarding, Settings) — one destination, navigate on click
  if (!expandable) {
    const item = group.items[0];
    if (!item) return null;
    return (
      <ModuleLeafLink
        href={item.href}
        label={group.label}
        icon={group.icon}
        active={sectionActive || isHrNavActive(pathname, item.href, search)}
        collapsed={collapsed}
      />
    );
  }

  // Collapsed rail: icon navigates to module landing (children not visible)
  if (collapsed) {
    const link = (
      <Link
        href={landing}
        scroll={false}
        prefetch={HR_SIDEBAR_PREFETCH}
        aria-current={sectionActive ? "page" : undefined}
        aria-label={group.label}
        onClick={(e) => pending?.navigateTo(landing, group.label, e)}
        className={cn(
          "hr-sidebar-module-item is-collapsed",
          sectionActive && "is-active",
        )}
      >
        <GroupIcon
          className={cn(
            "w-4 h-4 flex-shrink-0",
            sectionActive ? "text-brand-600" : "text-muted-foreground",
          )}
        />
        <span className="truncate">{group.label}</span>
      </Link>
    );
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {group.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Expandable module: row toggles children only — does NOT navigate / load pages
  return (
    <div className="space-y-0.5">
      <button
        type="button"
        className={cn(
          "hr-sidebar-module-toggle",
          sectionActive && "is-section-active",
          expanded && "is-expanded",
        )}
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <GroupIcon
          className={cn(
            "w-4 h-4 flex-shrink-0",
            sectionActive ? "text-brand-600" : "text-muted-foreground",
          )}
        />
        <span className="truncate flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {expanded && (
        <div className="hr-sidebar-nested" role="group" aria-label={group.label}>
          {group.items.map((item) => (
            <PageNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={isHrNavActive(pathname, item.href, search)}
              collapsed={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HrModulesNav({
  collapsed,
  activeSectionId,
}: {
  collapsed: boolean;
  activeSectionId: HrNavGroupId;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const { toggleCollapsed } = useHrSidebar();
  const [expandedId, setExpandedId] = useState<HrNavGroupId | null>(
    hrGroupIsExpandable(HR_NAV_GROUPS.find((g) => g.id === activeSectionId) ?? HR_NAV_GROUPS[0])
      ? activeSectionId
      : null,
  );

  // Route wins: follow active section; leaf modules leave accordion closed
  useEffect(() => {
    const group = HR_NAV_GROUPS.find((g) => g.id === activeSectionId);
    if (group && hrGroupIsExpandable(group)) {
      setExpandedId(activeSectionId);
    } else {
      setExpandedId(null);
    }
  }, [activeSectionId]);

  const groups = useMemo(() => HR_NAV_GROUPS, []);

  const handleToggle = (id: HrNavGroupId) => {
    // Accordion: open this group only; close others (including previous)
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden w-full">
      <div className={cn("hr-sidebar-sticky-head", collapsed && "pb-1")}>
        <HrSidebarModuleHeader
          title="Workspace"
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </div>
      <nav
        aria-label="HR modules"
        className={cn(
          "overflow-y-auto overscroll-contain max-h-full min-h-0",
          collapsed ? "px-1.5 pt-1 pb-2 space-y-1" : "px-2 pt-1.5 pb-3 space-y-0.5",
        )}
      >
        {groups.map((group) => (
          <ModuleGroup
            key={group.id}
            group={group}
            activeSectionId={activeSectionId}
            expanded={expandedId === group.id}
            onToggle={() => handleToggle(group.id)}
            collapsed={collapsed}
            search={search}
            pathname={pathname}
          />
        ))}
      </nav>
    </div>
  );
}

export function useActiveHrSectionId(): HrNavGroupId {
  const pathname = usePathname();
  return useMemo(() => resolveHrNavGroupId(pathname), [pathname]);
}

/**
 * Persistent HR left rail — navigation metadata only.
 * Does not import or mount HR page clients. Settings catalog swaps in on /hr/settings/*.
 */
export const HrSectionSidebar = memo(function HrSectionSidebar({
  sectionId,
  collapsed,
}: {
  sectionId: HrNavGroupId;
  collapsed: boolean;
}) {
  if (sectionId === "settings") {
    return <HrSettingsSidebar collapsed={collapsed} />;
  }
  return <HrModulesNav collapsed={collapsed} activeSectionId={sectionId} />;
});
