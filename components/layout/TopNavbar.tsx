"use client";

import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, BookOpen, ShoppingCart, BarChart3,
  UserCheck, Wallet, Wheat, CalendarDays, Monitor, Settings,
  Palette, ChevronDown, Warehouse, ChevronLeft, ChevronRight, type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV_ITEMS, type NavGroup, type NavItem } from "@/components/navigation/nav-config";
import { PrefetchLink } from "@/components/navigation/PrefetchLink";
import { prefetchNavChildren } from "@/components/navigation/NavRoutePrefetch";

function navPath(href: string): string {
  return href.split("?")[0];
}

function isNavHrefActive(pathname: string, search: string, href: string): boolean {
  const path = navPath(href);
  const pathMatch = pathname === path || pathname.startsWith(path + "/");
  if (!pathMatch) return false;
  const query = href.includes("?") ? href.split("?")[1] : "";
  if (!query) return true;
  const expected = new URLSearchParams(query);
  const current = new URLSearchParams(search.replace(/^\?/, ""));
  for (const [key, value] of expected.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

function computeNavActive(pathname: string, search: string, item: NavItem): boolean {
  if (item.href && isNavHrefActive(pathname, search, item.href)) return true;
  if (item.groupedChildren) {
    return item.groupedChildren.some((g) =>
      g.children.some((c) => isNavHrefActive(pathname, search, c.href)),
    );
  }
  return item.children?.some((c) => isNavHrefActive(pathname, search, c.href)) ?? false;
}

function activeGroupIndex(pathname: string, search: string, groups: NavGroup[]): number {
  const idx = groups.findIndex((g) =>
    g.children.some((c) => isNavHrefActive(pathname, search, c.href)),
  );
  return idx >= 0 ? idx : 0;
}

export const TopNavbar = memo(function TopNavbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const activeById = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const item of NAV_ITEMS) {
      map.set(item.id, computeNavActive(pathname, search, item));
    }
    return map;
  }, [pathname, search]);

  return (
    <TooltipProvider delayDuration={300}>
      {/*
        IMPORTANT: No overflow-x-auto on the nav items wrapper.
        overflow-x:auto forces overflow-y:auto per CSS spec, which clips
        absolutely-positioned children (dropdowns) that extend below the container.
        We use overflow:visible here and portal-render dropdowns instead.
      */}
      <nav className="h-[56px] bg-white border-b border-border/70 shadow-navbar flex items-center z-[100] sticky top-0 isolate">
        {/* Logo */}
        <PrefetchLink
          href="/dashboard"
          className="flex items-center gap-2.5 px-4 border-r border-border h-full flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center shadow-sm">
            <span className="text-white text-[11px] font-extrabold tracking-tight">DS</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-[13px] font-bold text-brand-700 leading-tight">Dharitri Sutra</p>
            <p className="text-[10px] text-muted-foreground font-medium leading-tight -mt-0.5">Agri ERP</p>
          </div>
        </PrefetchLink>

        {/* Nav items — overflow:visible so portal dropdowns are not clipped */}
        <div className="flex items-center h-full px-1 gap-0.5 flex-1 min-w-0">
          {NAV_ITEMS.map((item) => {
            const active = activeById.get(item.id) ?? false;

            // Icon-only (Settings)
            if (item.iconOnly) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <PrefetchLink
                      href={item.href!}
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center ml-auto transition-all duration-150",
                        active
                          ? "bg-brand-100 text-brand-600"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                    </PrefetchLink>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={6}>{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            // Simple link (no dropdown)
            if (item.href && !item.children && !item.groupedChildren) {
              return (
                <PrefetchLink
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13px] font-medium whitespace-nowrap",
                    "transition-all duration-150 cursor-pointer border-l-2",
                    active
                      ? "nav-active-indicator"
                      : "text-foreground border-transparent hover:bg-brand-50/40 hover:text-brand-700",
                  )}
                >
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {item.label}
                </PrefetchLink>
              );
            }

            // Dropdown — portal-rendered to escape overflow clipping
            return (
              <NavDropdown
                key={item.id}
                item={item}
                active={active}
                pathname={pathname}
                search={search}
              />
            );
          })}
        </div>
      </nav>
    </TooltipProvider>
  );
});

// ── NavDropdown — portaled menu (solid panel, above page content) ───────────

const NavDropdown = memo(function NavDropdown({
  item,
  active,
  pathname,
  search,
}: {
  item: NavItem;
  active: boolean;
  pathname: string;
  search: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const children = item.children ?? [];
  const groupedChildren = item.groupedChildren ?? [];
  const hasGroups = groupedChildren.length > 0;
  const isSidebarMenu = item.menuLayout === "sidebar" && hasGroups;
  const isMasters = item.id === "masters";
  const [hoveredGroup, setHoveredGroup] = useState(0);

  const menuWidth = isSidebarMenu
    ? 760
    : hasGroups
      ? groupedChildren.length > 3
        ? 820
        : 780
      : isMasters
        ? 520
        : 300;

  const updateMenuPosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxLeft = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));
    setMenuPos({ top: rect.bottom + 6, left: maxLeft });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen, menuWidth]);

  useEffect(() => {
    if (!isOpen) return;
    const links = [
      ...children,
      ...groupedChildren.flatMap((g) => g.children),
    ];
    prefetchNavChildren(router, links);
    if (item.href) router.prefetch(item.href);
  }, [isOpen, item.href, children, groupedChildren, router]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isSidebarMenu) {
      setHoveredGroup(activeGroupIndex(pathname, search, groupedChildren));
    }
  }, [isOpen, isSidebarMenu, pathname, search, groupedChildren]);

  // ── Close on route change ────────────────────────────────────────────────
  useEffect(() => { setIsOpen(false); }, [pathname, search]);

  // ── Close on Escape ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  const menuPanel = isOpen ? (
    <div
      ref={menuRef}
      role="menu"
      className={cn(
        "fixed rounded-xl border border-border bg-white p-3 shadow-2xl",
        "animate-in fade-in-0 zoom-in-95 duration-100",
      )}
      style={{
        top: menuPos.top,
        left: menuPos.left,
        width: menuWidth,
        zIndex: 10000,
      }}
    >
      {hasGroups && isSidebarMenu ? (
        <div className="flex min-h-[260px] -m-1 overflow-hidden rounded-lg">
          <div className="w-[272px] flex-shrink-0 bg-muted/25 border-r border-border/80 p-2 space-y-1">
            {groupedChildren.map((group, idx) => {
              const GroupIcon = group.icon;
              const isHovered = hoveredGroup === idx;
              return (
                <button
                  key={group.label}
                  type="button"
                  onMouseEnter={() => setHoveredGroup(idx)}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 transition-all duration-150 outline-none",
                    isHovered
                      ? "bg-white border-border shadow-sm"
                      : "border-transparent hover:bg-white/70",
                  )}
                >
                  <div className="flex gap-3 items-start">
                    {GroupIcon ? (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100/80 border border-brand-100 flex items-center justify-center flex-shrink-0">
                        <GroupIcon className="w-5 h-5 text-brand-600" />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground leading-tight">
                        {group.label}
                      </p>
                      {group.description ? (
                        <p className="text-[11px] text-muted-foreground leading-snug mt-1 line-clamp-2">
                          {group.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex-1 p-4 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
              {groupedChildren[hoveredGroup]?.label}
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
              {groupedChildren[hoveredGroup]?.children.map((child) => {
                const childActive = isNavHrefActive(pathname, search, child.href);
                return (
                  <PrefetchLink
                    key={child.href}
                    href={child.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "group flex items-center gap-2.5 py-2 px-1 rounded-md transition-colors duration-100",
                      childActive ? "text-brand-700" : "text-foreground hover:text-brand-700",
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full border flex-shrink-0 transition-colors",
                        childActive
                          ? "border-brand-600 bg-brand-600"
                          : "border-foreground/30 group-hover:border-brand-500",
                      )}
                    />
                    <span
                      className={cn(
                        "text-[13px] font-medium leading-tight",
                        childActive && "font-semibold",
                      )}
                    >
                      {child.label}
                    </span>
                  </PrefetchLink>
                );
              })}
            </div>
          </div>
        </div>
      ) : hasGroups ? (
        <div className="space-y-2">
          {item.href && item.id === "accounts" && (
            <PrefetchLink
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] font-medium text-brand-700 hover:bg-brand-50"
            >
              <span>Accounts overview</span>
              <span>›</span>
            </PrefetchLink>
          )}
          <div
            className={cn(
              "grid gap-3",
              groupedChildren.length > 3 ? "grid-cols-4" : "grid-cols-3",
            )}
          >
            {groupedChildren.map((group) => (
              <div
                key={group.label}
                className="rounded-lg border border-border/60 bg-white p-2 shadow-sm"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1.5 pb-1.5 mb-1 border-b border-border/50">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.children.map((child) => {
                    const childActive = isNavHrefActive(pathname, search, child.href);
                    return (
                      <PrefetchLink
                        key={child.href}
                        href={child.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "group flex items-center gap-1.5 px-2 py-[7px] rounded-md transition-colors duration-100 cursor-pointer w-full",
                          childActive ? "bg-brand-50 text-brand-700" : "hover:bg-brand-50",
                        )}
                      >
                        <span className="text-brand-400 text-[11px] font-bold leading-none select-none flex-shrink-0">
                          ›
                        </span>
                        <span
                          className={cn(
                            "text-[12px] font-medium leading-tight transition-colors duration-100 truncate",
                            childActive
                              ? "text-brand-700 font-semibold"
                              : "text-foreground group-hover:text-brand-700 group-hover:font-semibold",
                          )}
                        >
                          {child.label}
                        </span>
                      </PrefetchLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-x-2 gap-y-0.5",
            isMasters || children.length > 4 ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          {children.map((child) => {
            const childActive = isNavHrefActive(pathname, search, child.href);
            return (
              <PrefetchLink
                key={child.href}
                href={child.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "group flex items-center gap-1.5 px-2.5 py-[7px] rounded-lg",
                  "transition-colors duration-100 cursor-pointer w-full",
                  childActive ? "bg-brand-50 text-brand-700" : "hover:bg-brand-50",
                )}
              >
                <span className="text-brand-400 text-[11px] font-bold leading-none select-none flex-shrink-0">
                  ›
                </span>
                <span
                  className={cn(
                    "text-[13px] font-medium leading-tight transition-colors duration-100 truncate",
                    childActive
                      ? "text-brand-700 font-semibold"
                      : "text-foreground group-hover:text-brand-700 group-hover:font-semibold",
                  )}
                >
                  {child.label}
                </span>
              </PrefetchLink>
            );
          })}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="relative h-full flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13px] font-medium whitespace-nowrap",
          "transition-all duration-150 cursor-pointer border-l-2 select-none outline-none",
          active
            ? "nav-active-indicator"
            : "text-foreground border-transparent hover:bg-brand-50/40 hover:text-brand-700",
          isOpen && !active && "bg-muted/50 text-foreground border-transparent",
        )}
      >
        <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
        {item.label}
        <ChevronDown
          className={cn(
            "w-3 h-3 ml-0.5 opacity-50 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {typeof document !== "undefined" && menuPanel
        ? createPortal(menuPanel, document.body)
        : null}
    </div>
  );
});
