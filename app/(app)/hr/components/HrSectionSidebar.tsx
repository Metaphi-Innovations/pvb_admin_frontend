"use client";

import React, { memo, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getHrNavGroup,
  isHrNavActive,
  resolveHrNavGroupId,
  type HrNavGroup,
  type HrNavGroupId,
} from "@/lib/hr/hr-nav";
import { HrSidebarModuleHeader } from "./HrSidebarModuleHeader";
import { useHrSidebar } from "./HrSidebarContext";
import { HrSettingsSidebar } from "./HrSettingsSidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigationPendingOptional } from "@/components/navigation/NavigationPendingContext";

const SectionNavLink = memo(function SectionNavLink({
  href,
  label,
  icon: ItemIcon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: HrNavGroup["items"][number]["icon"];
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
      prefetch
      aria-current={active ? "page" : undefined}
      aria-disabled={isDisabled || undefined}
      aria-label={collapsed ? label : undefined}
      onClick={(e) => {
        if (isDisabled) {
          e.preventDefault();
          return;
        }
        // Force App Router push so Soft Nav cannot stall with overlay-only state
        pending?.navigateTo(href, label, e);
      }}
      className={cn(
        "hr-sidebar-nav-item",
        active && "is-active",
        collapsed && "is-collapsed",
        isDisabled && "pointer-events-none opacity-60",
      )}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin text-brand-600" aria-hidden />
      ) : (
        <ItemIcon className={cn("w-4 h-4 flex-shrink-0", active ? "text-brand-600" : "text-muted-foreground")} />
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
});

function FlatSectionMenu({ group, collapsed }: { group: HrNavGroup; collapsed: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const { toggleCollapsed } = useHrSidebar();

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden w-full">
      <div className={cn("hr-sidebar-sticky-head", collapsed && "pb-1")}>
        <HrSidebarModuleHeader
          title={group.label}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </div>
      <nav
        aria-label={group.label}
        className={cn(
          "overflow-y-auto overscroll-contain max-h-full min-h-0",
          collapsed ? "px-1.5 pt-1 pb-2 space-y-1" : "px-2.5 pt-2 pb-3 space-y-0.5",
        )}
      >
        {group.items.map((item) => (
          <React.Fragment key={item.href}>
            {item.sectionLabel && !collapsed && (
              <p className="hr-sidebar-section-label">{item.sectionLabel}</p>
            )}
            <SectionNavLink
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isHrNavActive(pathname, item.href, search)}
              collapsed={collapsed}
            />
          </React.Fragment>
        ))}
      </nav>
    </div>
  );
}

export function useActiveHrSectionId(): HrNavGroupId {
  const pathname = usePathname();
  return useMemo(() => resolveHrNavGroupId(pathname), [pathname]);
}

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
  const group = getHrNavGroup(sectionId);
  return <FlatSectionMenu group={group} collapsed={collapsed} />;
});
