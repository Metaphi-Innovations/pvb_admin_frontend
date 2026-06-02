"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, BookOpen, ShoppingCart, BarChart3,
  UserCheck, Wallet, Wheat, CalendarDays, Monitor, Settings,
  Palette, ChevronDown, Warehouse, ChevronLeft, ChevronRight, type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ── Nav config ────────────────────────────────────────────────────────────────
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";

// ── Nav config ────────────────────────────────────────────────────────────────
interface NavChild {
  label: string;
  href: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  iconOnly?: boolean;
  children?: NavChild[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    id: "warehouse",
    label: "Warehouse",
    icon: Warehouse,
    children: [
      { label: "GRN&QC", href: "/warehouse/grnqc" },
      { label: "Stock Overview", href: "/warehouse/stockoverview" },
      { label: "Dispatch", href: "/warehouse/dispatch" },
      { label: "Packing", href: "/warehouse/packing" },
      { label: "Reorder Level", href: "/warehouse/reorder-level" }
    ],
  },
  {
    id: "user-management",
    label: "User Management",
    icon: Users,
    children: [
      { label: "Geography", href: "/masters/geography" },
      { label: "Department", href: "/user-management/department" },
      { label: "Roles", href: "/user-management/roles" },
      { label: "User", href: "/user-management/employee" },
    ],
  },
  {
    id: "masters",
    label: "Masters",
    icon: BookOpen,
    children: [
      { label: "Categories", href: "/masters/categories" },
      { label: "Customers", href: "/masters/customers" },
      { label: "Products", href: "/masters/products" },
      { label: "Warehouse", href: "/masters/warehouse" },
      { label: "Unit Master", href: "/masters/uom" },
      { label: "HSN", href: "/masters/hsn" },
      { label: "GST", href: "/masters/gst" },
      { label: "TDS", href: "/masters/tds" },
    ],
  },
  {
    id: "procurement",
    label: "Procurement",
    icon: ShoppingCart,
    children: [
      { label: "Purchase Orders", href: "/procurement/orders" },
      { label: "GRN", href: "/procurement/grn" },
      { label: "Vendor Bills", href: "/procurement/bills" },
      { label: "Vendor Returns", href: "/procurement/returns" },
      { label: "Stock Ledger", href: "/procurement/stock" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    icon: BarChart3,
    children: [
      { label: "Sales Orders", href: "/sales/orders" },
      { label: "Invoices", href: "/sales/invoices" },
      { label: "Dispatch", href: "/sales/dispatch" },
      { label: "Collections", href: "/sales/collections" },
      { label: "Targets", href: "/sales/targets" },
      { label: "Beat Plan", href: "/sales/beat-plan" },
    ],
  },
  {
    id: "hr",
    label: "HR",
    icon: UserCheck,
    children: [
      { label: "Employees", href: "/hr/employees" },
      { label: "Attendance", href: "/hr/attendance" },
      { label: "Leave Management", href: "/hr/leaves" },
      { label: "Payroll", href: "/hr/payroll" },
      { label: "Expense Claims", href: "/hr/expenses" },
    ],
  },
  {
    id: "accounts",
    label: "Accounts",
    icon: Wallet,
    children: [
      { label: "Ledger", href: "/accounts/ledger" },
      { label: "Vouchers", href: "/accounts/vouchers" },
      { label: "Outstanding", href: "/accounts/outstanding" },
      { label: "Reports", href: "/accounts/reports" },
    ],
  },
  {
    id: "farmer",
    label: "Farmer",
    icon: Wheat,
    children: [
      { label: "Farmer Registry", href: "/farmer/registry" },
      { label: "Field Surveys", href: "/farmer/surveys" },
      { label: "Crop Calendar", href: "/farmer/crop-calendar" },
      { label: "Input Distribution", href: "/farmer/inputs" },
      { label: "FPO Management", href: "/farmer/fpo" },
    ],
  },
  {
    id: "event",
    label: "Event",
    icon: CalendarDays,
    children: [
      { label: "Events", href: "/events" },
      { label: "Attendance", href: "/events/attendance" },
      { label: "Feedback", href: "/events/feedback" },
    ],
  },
  {
    id: "demo",
    label: "Demo",
    icon: Monitor,
    children: [
      { label: "Listing Demo", href: "/listing-demo" },
      { label: "Form Demo", href: "/form-demo" },
    ],
  },
  {
    id: "template",
    label: "Template",
    icon: Palette,
    href: "/template",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    iconOnly: true,
    href: "/settings",
  },
];

// ── Main component ────────────────────────────────────────────────────────────
export function TopNavbar() {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const isActive = (item: NavItem) => {
    if (item.href) return pathname === item.href || pathname.startsWith(item.href + "/");
    return item.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + "/")) ?? false;
  };

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
      const scrollAmount = clientWidth * 0.6; // Scroll 60% of visible width
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <nav className="h-[56px] bg-white border-b border-border shadow-navbar flex items-center z-50 sticky top-0 w-full overflow-hidden">
        {/* Logo */}
        <Link
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
        </Link>

        {/* Scrollable Container Wrapper */}
        <div className="relative flex-1 min-w-0 h-full flex items-center">
          {/* Left indicator & button */}
          {showLeftArrow && (
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white via-white/80 to-transparent flex items-center pl-2 z-10 pointer-events-none">
              <button
                type="button"
                onClick={() => scroll("left")}
                className="w-7 h-7 rounded-full bg-brand-50 border border-brand-200 shadow-md flex items-center justify-center text-brand-600 hover:bg-brand-100 active:scale-95 transition-all pointer-events-auto"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Nav items — scrollable container */}
          <div
            ref={scrollRef}
            className="flex items-center h-full w-full px-3 gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);

              // Icon-only (Settings)
              if (item.iconOnly) {
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href!}
                        className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center ml-auto transition-all duration-150 flex-shrink-0",
                          active
                            ? "bg-brand-100 text-brand-600"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6}>{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              // Simple link (no children)
              if (item.href && !item.children) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13px] font-medium whitespace-nowrap flex-shrink-0",
                      "transition-all duration-150 cursor-pointer border-l-2",
                      active
                        ? "bg-brand-50 text-brand-700 border-brand-600 font-semibold"
                        : "text-foreground border-transparent hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              }

              // Dropdown — portal-rendered to escape overflow clipping
              return <NavDropdown key={item.id} item={item} active={active} pathname={pathname} />;
            })}
          </div>

          {/* Right indicator & button */}
          {showRightArrow && (
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent flex items-center justify-end pr-2 z-10 pointer-events-none">
              <button
                type="button"
                onClick={() => scroll("right")}
                className="w-7 h-7 rounded-full bg-brand-50 border border-brand-200 shadow-md flex items-center justify-center text-brand-600 hover:bg-brand-100 active:scale-95 transition-all pointer-events-auto"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </nav>
    </TooltipProvider>
  );
}

// ── NavDropdown — portal rendering using Radix DropdownMenu ─────────────────
function NavDropdown({
  item,
  active,
  pathname,
}: {
  item: NavItem;
  active: boolean;
  pathname: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const children = item.children ?? [];
  const useTwoCols = children.length > 4;

  // Close on route change
  useEffect(() => { setIsOpen(false); }, [pathname]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13px] font-medium whitespace-nowrap flex-shrink-0 outline-none select-none",
            "transition-all duration-150 cursor-pointer border-l-2",
            active
              ? "bg-brand-50 text-brand-700 border-brand-600 font-semibold"
              : "text-foreground border-transparent hover:bg-muted/50 hover:text-foreground",
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
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className={cn(
          "bg-white border border-border/60 rounded-xl shadow-lg p-2.5 z-[9999]",
          useTwoCols ? "w-[300px]" : "w-[200px]",
        )}
      >
        <div className={cn("grid gap-x-1 gap-y-0.5", useTwoCols ? "grid-cols-2" : "grid-cols-1")}>
          {children.map((child) => {
            const childActive =
              pathname === child.href || pathname.startsWith(child.href + "/");
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "group flex items-center gap-1.5 px-2.5 py-[7px] rounded-lg",
                  "transition-colors duration-100 cursor-pointer w-full",
                  childActive
                    ? "bg-brand-50 text-brand-700"
                    : "hover:bg-brand-50",
                )}
              >
                <span className="text-brand-400 text-[11px] font-bold leading-none select-none flex-shrink-0">›</span>
                <span
                  className={cn(
                    "text-[13px] font-medium leading-tight transition-colors duration-100 truncate",
                    childActive
                      ? "text-brand-700 font-semibold"
                      : "text-foreground/80 group-hover:text-brand-700 group-hover:font-semibold",
                  )}
                >
                  {child.label}
                </span>
              </Link>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
