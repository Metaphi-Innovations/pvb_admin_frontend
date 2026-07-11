"use client";

import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, BookOpen, ShoppingCart, BarChart3,
  UserCheck, Wallet, Wheat, CalendarDays, Monitor,
  Palette, ChevronDown, Warehouse, ChevronLeft, ChevronRight, type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV_ITEMS, type NavGroup, type NavItem } from "@/components/navigation/nav-config";
import { arrangeAccountsMegaMenuColumns } from "@/lib/accounts/accounts-nav";
import type { AccountsNavGroupId } from "@/lib/accounts/accounts-nav";
import { PrefetchLink } from "@/components/navigation/PrefetchLink";
import { useNavigationPending } from "@/components/navigation/NavigationPendingContext";
import { ApprovalsButton } from "./ApprovalsButton";
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
    return item.groupedChildren.some(
      (g) =>
        (g.href != null && isNavHrefActive(pathname, search, g.href)) ||
        g.children.some((c) => isNavHrefActive(pathname, search, c.href)),
    );
  }
  return item.children?.some((c) => isNavHrefActive(pathname, search, c.href)) ?? false;
}

function activeGroupIndex(pathname: string, search: string, groups: NavGroup[]): number {
  const byChild = groups.findIndex((g) =>
    g.children.some((c) => isNavHrefActive(pathname, search, c.href)),
  );
  if (byChild >= 0) return byChild;

  const byGroupHref = groups.findIndex(
    (g) => g.href != null && isNavHrefActive(pathname, search, g.href),
  );
  if (byGroupHref >= 0) return byGroupHref;

  return 0;
}

function MegaMenuLink({
  child,
  pathname,
  search,
  onNavigate,
}: {
  child: { label: string; href: string; icon?: React.ComponentType<{ className?: string }>; description?: string };
  pathname: string;
  search: string;
  onNavigate: (href: string, e: React.MouseEvent, label?: string) => void;
}) {
  const childActive = isNavHrefActive(pathname, search, child.href);
  const ChildIcon = child.icon;
  return (
    <PrefetchLink
      href={child.href}
      onClick={(e) => onNavigate(child.href, e, child.label)}
      className={cn(
        "group flex items-start gap-2.5 py-2 px-1 rounded-md transition-colors duration-100 min-w-0",
        childActive ? "bg-brand-50 text-brand-700" : "hover:bg-brand-50/70",
      )}
    >
      {ChildIcon ? (
        <span
          className={cn(
            "w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors mt-0.5",
            childActive
              ? "bg-brand-100 border-brand-200 text-brand-600"
              : "bg-muted/40 border-border/60 text-muted-foreground group-hover:text-brand-600 group-hover:border-brand-200",
          )}
        >
          <ChildIcon className="w-4 h-4" />
        </span>
      ) : (
        <span
          className={cn(
            "w-2 h-2 rounded-full border flex-shrink-0 mt-2 transition-colors",
            childActive
              ? "border-brand-600 bg-brand-600"
              : "border-foreground/30 group-hover:border-brand-500",
          )}
        />
      )}
      <span className="min-w-0 flex-1 pt-0.5">
        <span
          className={cn(
            "block text-[13px] font-medium leading-tight",
            childActive && "font-semibold",
          )}
        >
          {child.label}
        </span>
        {child.description ? (
          <span className="block text-[11px] text-muted-foreground leading-snug mt-1 line-clamp-2">
            {child.description}
          </span>
        ) : null}
      </span>
    </PrefetchLink>
  );
}

function HorizontalTabsMegaMenu({
  item,
  groupedChildren,
  hoveredGroup,
  setHoveredGroup,
  pathname,
  search,
  onNavigate,
}: {
  item: NavItem;
  groupedChildren: NavGroup[];
  hoveredGroup: number;
  setHoveredGroup: (idx: number) => void;
  pathname: string;
  search: string;
  onNavigate: (href: string, e: React.MouseEvent, label?: string) => void;
}) {
  const activeGroup = groupedChildren[hoveredGroup];
  const activeChildren = activeGroup?.children ?? [];
  const columns = arrangeAccountsMegaMenuColumns(
    (activeGroup?.id ?? "coa") as AccountsNavGroupId,
    activeChildren.map((c) => ({
      label: c.label,
      href: c.href,
      icon: c.icon,
      description: c.description,
    })),
  );
  const hasRightColumn = columns.right.length > 0;

  return (
    <div className="flex flex-col min-w-0">
      <div className="flex-shrink-0 border-b border-border/50 bg-white">
        <div className="flex gap-0.5 overflow-x-auto px-1.5 py-1 [scrollbar-width:thin]">
          {groupedChildren.map((group, idx) => {
            const isActive = hoveredGroup === idx;
            const groupHref = group.href ?? group.children[0]?.href;
            return (
              <PrefetchLink
                key={group.label}
                href={groupHref ?? "#"}
                onClick={(e) => groupHref && onNavigate(groupHref, e, group.label)}
                onMouseEnter={() => setHoveredGroup(idx)}
                onFocus={() => setHoveredGroup(idx)}
                className={cn(
                  "px-2 py-0.5 rounded text-[12px] font-medium whitespace-nowrap transition-colors outline-none flex-shrink-0",
                  isActive
                    ? "bg-brand-50 text-brand-700 border border-brand-100 shadow-sm"
                    : "text-muted-foreground hover:text-brand-700 hover:bg-brand-50/60 border border-transparent",
                )}
              >
                {group.label}
              </PrefetchLink>
            );
          })}
        </div>
      </div>

      <div className="px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-0.5">
          {activeGroup?.label}
        </p>
        <div
          className={cn(
            "grid gap-x-4 gap-y-0 max-[640px]:grid-cols-1",
            hasRightColumn ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          <div className="space-y-0 min-w-0">
            {columns.left.map((child) => (
              <MegaMenuLink
                key={child.href}
                child={child}
                pathname={pathname}
                search={search}
                onNavigate={onNavigate}
              />
            ))}
          </div>
          {hasRightColumn ? (
            <div className="space-y-0 min-w-0">
              {columns.right.map((child) => (
                <MegaMenuLink
                  key={child.href}
                  child={child}
                  pathname={pathname}
                  search={search}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const TopNavbar = memo(function TopNavbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const activeById = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const item of NAV_ITEMS) {
      map.set(item.id, computeNavActive(pathname, search, item));
    }
    return map;
  }, [pathname, search]);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 4);
      setShowRightArrow(scrollWidth - scrollLeft - clientWidth > 4);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
    }
    const timer = setTimeout(checkScroll, 100);

    return () => {
      if (el) {
        el.removeEventListener("scroll", checkScroll);
      }
      window.removeEventListener("resize", checkScroll);
      clearTimeout(timer);
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.6;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <nav className="h-[56px] bg-white border-b border-border/70 shadow-navbar flex items-center z-[100] sticky top-0 isolate">
        {/* Logo */}
        <PrefetchLink
          href="/dashboard"
          className="flex items-center px-4 border-r border-border h-full flex-shrink-0"
        >
          <div className="h-10 flex items-center justify-center">
            <Image
              src="/images/dharitri sutra.png"
              alt="Dharitri Sutra Logo"
              width={140}
              height={40}
              className="h-8 w-auto object-contain"
              priority
            />
          </div>
        </PrefetchLink>

        {/* Scrollable Container Wrapper */}
        <div className="flex-1 min-w-0 h-full flex items-center px-2">
          {/* Left button */}
          {showLeftArrow && (
            <div className="flex items-center pr-2 flex-shrink-0 z-10">
              <button
                type="button"
                onClick={() => scroll("left")}
                className="w-7 h-7 rounded-full bg-brand-50 border border-brand-200 shadow-md flex items-center justify-center text-brand-600 hover:bg-brand-100 active:scale-95 transition-all flex-shrink-0"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Nav items — scrollable container */}
          <div
            ref={scrollRef}
            className="flex items-center h-full flex-1 min-w-0 px-1 gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
          >
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
                          "w-9 h-9 rounded-lg flex items-center justify-center ml-auto transition-all duration-150 flex-shrink-0",
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
                      "flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13px] font-medium whitespace-nowrap flex-shrink-0",
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

          {/* Right button */}
          {showRightArrow && (
            <div className="flex items-center pl-2 flex-shrink-0 z-10">
              <button
                type="button"
                onClick={() => scroll("right")}
                className="w-7 h-7 rounded-full bg-brand-50 border border-brand-200 shadow-md flex items-center justify-center text-brand-600 hover:bg-brand-100 active:scale-95 transition-all flex-shrink-0"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Approvals — top nav */}
        <div className="flex items-center h-full flex-shrink-0 pl-2 pr-3 border-l border-border/60">
          <ApprovalsButton />
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
  const { navigateTo } = useNavigationPending();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const children = item.children ?? [];
  const groupedChildren = item.groupedChildren ?? [];
  const hasGroups = groupedChildren.length > 0;
  const isAccountsMenu = item.id === "accounts";
  const isSidebarMenu = item.menuLayout === "sidebar" && hasGroups;
  const isHorizontalTabsMenu = item.menuLayout === "horizontal-tabs" && hasGroups;
  const isMasters = item.id === "masters";
  const [hoveredGroup, setHoveredGroup] = useState(0);
  const [panelWidth, setPanelWidth] = useState(760);

  /** Portaled menu unmounts on close before Link navigation — push explicitly with pending state. */
  const navigateFromMenu = useCallback(
    (href: string, e: React.MouseEvent, label?: string) => {
      if (!href || href === "#") return;
      setIsOpen(false);
      navigateTo(href, label, e);
    },
    [navigateTo],
  );

  const resolveMenuWidth = () => {
    if (isHorizontalTabsMenu) {
      return Math.min(560, Math.max(480, window.innerWidth - 48));
    }
    if (isSidebarMenu) return isAccountsMenu ? 780 : 760;
    if (hasGroups) return groupedChildren.length > 3 ? 820 : 780;
    return isMasters ? 520 : 300;
  };

  const updateMenuPosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = resolveMenuWidth();
    setPanelWidth(width);
    const margin = 24;
    let left = isAccountsMenu ? rect.right - width : rect.left;
    const maxLeft = window.innerWidth - width - margin;
    if (left > maxLeft) left = maxLeft;
    if (left < margin) left = margin;
    setMenuPos({ top: rect.bottom + 6, left });
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
  }, [isOpen, isHorizontalTabsMenu, isSidebarMenu, hasGroups, groupedChildren.length, isMasters]);

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
    if (isOpen && (isSidebarMenu || isHorizontalTabsMenu)) {
      setHoveredGroup(activeGroupIndex(pathname, search, groupedChildren));
    }
  }, [isOpen, isSidebarMenu, isHorizontalTabsMenu, pathname, search, groupedChildren]);

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
        "fixed rounded-xl border border-border bg-white shadow-2xl",
        "animate-in fade-in-0 zoom-in-95 duration-100",
        isHorizontalTabsMenu ? "p-0 overflow-hidden" : "p-3",
      )}
      style={{
        top: menuPos.top,
        left: menuPos.left,
        width: panelWidth,
        maxWidth: "calc(100vw - 48px)",
        zIndex: 10000,
      }}
    >
      {hasGroups && isHorizontalTabsMenu ? (
        <HorizontalTabsMegaMenu
          item={item}
          groupedChildren={groupedChildren}
          hoveredGroup={hoveredGroup}
          setHoveredGroup={setHoveredGroup}
          pathname={pathname}
          search={search}
          onNavigate={navigateFromMenu}
        />
      ) : hasGroups && isSidebarMenu ? (
        <div
          className={cn(
            "flex flex-col -m-1 overflow-hidden rounded-lg",
            isAccountsMenu ? "min-h-[280px]" : "min-h-[260px]",
          )}
        >
          {item.href && !isAccountsMenu && (
            <PrefetchLink
              href={item.href}
              onClick={(e) => navigateFromMenu(item.href!, e, item.label)}
              className="flex items-center justify-between mx-2 mt-2 mb-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-brand-700 hover:bg-brand-50 border border-brand-100/80"
            >
              <span>{item.label} overview</span>
              <span className="text-brand-400">›</span>
            </PrefetchLink>
          )}
          <div className="flex flex-1 min-h-0">
          <div
            className={cn(
              "w-[272px] flex-shrink-0 bg-muted/25 border-r border-border/80 p-2 space-y-1",
            )}
          >
            {groupedChildren.map((group, idx) => {
              const GroupIcon = group.icon;
              const isHovered = hoveredGroup === idx;
              const groupHref = group.href ?? group.children[0]?.href;
              return (
                <PrefetchLink
                  key={group.label}
                  href={groupHref ?? "#"}
                  onClick={(e) => groupHref && navigateFromMenu(groupHref, e, group.label)}
                  onMouseEnter={() => setHoveredGroup(idx)}
                  className={cn(
                    "block w-full text-left rounded-lg border p-3 transition-all duration-150 outline-none",
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
                </PrefetchLink>
              );
            })}
          </div>
          <div className="flex-1 p-4 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
              {groupedChildren[hoveredGroup]?.label}
            </p>
            {isAccountsMenu ? (
              (() => {
                const activeGroup = groupedChildren[hoveredGroup];
                const activeChildren = activeGroup?.children ?? [];
                const columns = arrangeAccountsMegaMenuColumns(
                  (activeGroup?.id ?? "coa") as AccountsNavGroupId,
                  activeChildren.map((c) => ({
                    label: c.label,
                    href: c.href,
                    icon: c.icon,
                    description: c.description,
                  })),
                );
                const hasRightColumn = columns.right.length > 0;
                return (
                  <div
                    className={cn(
                      "grid gap-x-6 gap-y-0.5",
                      hasRightColumn ? "grid-cols-2" : "grid-cols-1",
                    )}
                  >
                    <div className="min-w-0 space-y-0">
                      {columns.left.map((child) => (
                        <MegaMenuLink
                          key={child.href}
                          child={child}
                          pathname={pathname}
                          search={search}
                          onNavigate={navigateFromMenu}
                        />
                      ))}
                    </div>
                    {hasRightColumn ? (
                      <div className="min-w-0 space-y-0">
                        {columns.right.map((child) => (
                          <MegaMenuLink
                            key={child.href}
                            child={child}
                            pathname={pathname}
                            search={search}
                            onNavigate={navigateFromMenu}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })()
            ) : (
            <div
              className={cn(
                "grid gap-x-6 gap-y-0.5",
                (groupedChildren[hoveredGroup]?.children.length ?? 0) > 4
                  ? "grid-cols-1"
                  : "grid-cols-2",
              )}
            >
              {groupedChildren[hoveredGroup]?.children.map((child) => {
                const childActive = isNavHrefActive(pathname, search, child.href);
                return (
                  <PrefetchLink
                    key={child.href}
                    href={child.href}
                    onClick={(e) => navigateFromMenu(child.href, e, child.label)}
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
            )}
          </div>
          </div>
        </div>
      ) : hasGroups ? (
        <div className="space-y-2">
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
                        onClick={(e) => navigateFromMenu(child.href, e, child.label)}
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
                onClick={(e) => navigateFromMenu(child.href, e, child.label)}
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
