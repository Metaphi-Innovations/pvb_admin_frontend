"use client";

import React, { memo, Suspense, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildSettingsSidebarLinks,
  isSettingsMenuItemActive,
  type SettingsSidebarLink,
} from "../settings/_components/settings-catalog";
import { HR_MODULE_ENTRY_HREF } from "@/lib/hr/hr-nav";
import { HrSidebarModuleHeader } from "./HrSidebarModuleHeader";
import { useHrSidebar } from "./HrSidebarContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigationPendingOptional } from "@/components/navigation/NavigationPendingContext";

const SettingsNavLink = memo(function SettingsNavLink({
  item,
  active,
  collapsed,
}: {
  item: SettingsSidebarLink;
  active: boolean;
  collapsed: boolean;
}) {
  const pending = useNavigationPendingOptional();
  const available = item.status === "available" && !!item.href;
  const isPending = available ? (pending?.isHrefPending(item.href!) ?? false) : false;
  const Icon = item.icon;

  const content = (
    <>
      {isPending ? (
        <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin text-brand-600" aria-hidden />
      ) : (
        <Icon
          className={cn(
            "w-4 h-4 flex-shrink-0",
            active ? "text-brand-600" : available ? "text-muted-foreground" : "text-muted-foreground/45",
          )}
        />
      )}
      <span className="truncate flex-1">{item.label}</span>
      {!available && !collapsed && (
        <Lock className="w-3 h-3 text-muted-foreground/50 shrink-0" aria-hidden />
      )}
    </>
  );

  if (!available) {
    const disabled = (
      <div
        className={cn(
          "hr-sidebar-nav-item is-disabled",
          collapsed && "is-collapsed",
        )}
        title="Coming in a later phase"
        aria-disabled
      >
        {content}
      </div>
    );
    if (!collapsed) return disabled;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-center">{disabled}</div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {item.label} · Soon
        </TooltipContent>
      </Tooltip>
    );
  }

  const link = (
    <Link
      href={item.href!}
      scroll={false}
      prefetch={false}
      aria-current={active ? "page" : undefined}
      aria-disabled={isPending && !active ? true : undefined}
      aria-label={collapsed ? item.label : undefined}
      onClick={(e) => {
        if (isPending && !active) {
          e.preventDefault();
          return;
        }
        pending?.navigateTo(item.href!, item.label, e);
      }}
      className={cn(
        "hr-sidebar-nav-item",
        active && "is-active",
        collapsed && "is-collapsed",
        isPending && !active && "pointer-events-none opacity-60",
      )}
    >
      {content}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
});

function SettingsSidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";
  const links = useMemo(() => buildSettingsSidebarLinks(), []);
  const allHrefs = useMemo(() => links.map((l) => l.href), [links]);

  return (
    <nav
      aria-label="HR Settings"
      className={cn(
        "overflow-y-auto overscroll-contain max-h-full min-h-0",
        collapsed ? "px-1.5 pt-1 pb-2 space-y-1" : "px-2.5 pt-1.5 pb-3 space-y-0.5",
      )}
    >
      {links.map((item) => (
        <React.Fragment key={item.id}>
          {item.sectionLabel && !collapsed && (
            <p className="hr-sidebar-section-label">{item.sectionLabel}</p>
          )}
          <SettingsNavLink
            item={item}
            active={isSettingsMenuItemActive(pathname, search, item.href, allHrefs)}
            collapsed={collapsed}
          />
        </React.Fragment>
      ))}
    </nav>
  );
}

/** Settings-only left rail — full IA from settings catalog (replaces module accordion). */
export const HrSettingsSidebar = memo(function HrSettingsSidebar({
  collapsed,
}: {
  collapsed: boolean;
}) {
  const { toggleCollapsed } = useHrSidebar();
  const pending = useNavigationPendingOptional();

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className={cn("hr-sidebar-sticky-head", collapsed && "pb-1")}>
        <HrSidebarModuleHeader
          title="Settings"
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
        {!collapsed && (
          <Link
            href={HR_MODULE_ENTRY_HREF}
            scroll={false}
            prefetch={false}
            onClick={(e) => pending?.navigateTo(HR_MODULE_ENTRY_HREF, "HR Modules", e)}
            className="mx-2.5 mt-1.5 mb-0.5 flex items-center gap-1.5 px-2 py-1.5 rounded-[10px] text-[11px] font-medium text-muted-foreground hover:text-brand-700 hover:bg-brand-50/60 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden />
            HR Modules
          </Link>
        )}
        {collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={HR_MODULE_ENTRY_HREF}
                scroll={false}
                prefetch={false}
                aria-label="Back to HR Modules"
                onClick={(e) => pending?.navigateTo(HR_MODULE_ENTRY_HREF, "HR Modules", e)}
                className="hr-sidebar-nav-item is-collapsed mx-auto mb-1"
              >
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                <span>Back</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              HR Modules
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <Suspense
        fallback={
          <nav
            aria-label="HR Settings"
            className={cn(
              "overflow-y-auto overscroll-contain max-h-full min-h-0",
              collapsed ? "px-1.5 pt-1 pb-2 space-y-1" : "px-2.5 pt-1.5 pb-3 space-y-0.5",
            )}
          />
        }
      >
        <SettingsSidebarNav collapsed={collapsed} />
      </Suspense>
    </div>
  );
});
