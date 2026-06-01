"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Search, Bell, HelpCircle, ChevronDown, MapPin, Globe,
  LogOut, User, Settings, Shield, CheckSquare, Calendar,
  AlertTriangle, Check, type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { CountBadge } from "@/components/ui/StatusBadge";
import { Separator } from "@/components/ui/separator";
import { useFY, FINANCIAL_YEARS, FY_STATUS_CONFIG, type FinancialYear } from "@/lib/fy-store";

// ── Sample data ───────────────────────────────────────────────────────────────
const STATES = ["All States", "Maharashtra", "Karnataka", "Madhya Pradesh", "Rajasthan", "Gujarat"];
const TERRITORIES = ["All Territories", "Pune North", "Pune South", "Nashik", "Aurangabad", "Kolhapur"];

const NOTIFICATIONS = [
  { id: 1, type: "approval", title: "PO #2340 awaiting approval",     time: "2 min ago",  read: false },
  { id: 2, type: "alert",    title: "Stock below reorder: Urea 50kg", time: "15 min ago", read: false },
  { id: 3, type: "info",     title: "Farmer survey #1123 submitted",  time: "1 hr ago",   read: false },
  { id: 4, type: "success",  title: "Invoice INV-0088 paid",          time: "3 hr ago",   read: true  },
  { id: 5, type: "info",     title: "New distributor onboarded",      time: "Yesterday",  read: true  },
];

const PENDING_APPROVALS = [
  { label: "Purchase Orders", count: 4,  href: "/procurement/orders?status=pending" },
  { label: "Expense Claims",  count: 7,  href: "/hr/expenses?status=pending"        },
  { label: "Leave Requests",  count: 2,  href: "/hr/leaves?status=pending"          },
  { label: "New Farmers",     count: 12, href: "/farmer/registry?status=pending"    },
];

const totalPending = PENDING_APPROVALS.reduce((s, a) => s + a.count, 0);
const unreadCount  = NOTIFICATIONS.filter((n) => !n.read).length;

// ── FY Status Badge ───────────────────────────────────────────────────────────
function FYStatusBadge({ status, compact = false }: { status: string; compact?: boolean }) {
  const c = FY_STATUS_CONFIG[status as keyof typeof FY_STATUS_CONFIG] ?? FY_STATUS_CONFIG.closed;
  if (compact) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border",
        c.bg, c.color, c.border,
      )}>
        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", c.dot, status === "live" && "animate-pulse")} />
        {c.label}
      </span>
    );
  }
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
      c.bg, c.color, c.border,
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", c.dot, status === "live" && "animate-pulse")} />
      {c.label}
    </span>
  );
}

// ── FY Switch Dialog ──────────────────────────────────────────────────────────
function FYSwitchDialog({
  open,
  onClose,
  pendingFY,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  pendingFY: FinancialYear | null;
  onConfirm: () => void;
}) {
  if (!pendingFY) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            Switch Financial Year?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Switching to{" "}
            <span className="font-semibold text-foreground">{pendingFY.label}</span>{" "}
            will reload the dashboard data for that period.
          </p>

          {/* FY preview card */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
            <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{pendingFY.label}</p>
              <p className="text-xs text-muted-foreground">{pendingFY.start} – {pendingFY.end}</p>
            </div>
            <FYStatusBadge status={pendingFY.status} />
          </div>

          {pendingFY.status === "closed" && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              ⚠ This financial year is closed. Data will be read-only.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
            onClick={onConfirm}
          >
            <Check className="w-3.5 h-3.5" /> Switch FY
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── FY Selector (trigger + dropdown) ─────────────────────────────────────────
function FYSelector() {
  const { selectedFY, setSelectedFY } = useFY();
  const [pendingFY, setPendingFY] = useState<FinancialYear | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSelect = (fy: FinancialYear) => {
    if (fy.id === selectedFY.id) return;
    setPendingFY(fy);
    setDialogOpen(true);
  };

  const handleConfirm = () => {
    if (pendingFY) {
      setSelectedFY(pendingFY);
    }
    setDialogOpen(false);
    setPendingFY(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 text-[12px] font-medium text-foreground hover:text-brand-600 transition-colors whitespace-nowrap group">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground group-hover:text-brand-500 transition-colors" />
            <span className="hidden sm:inline font-semibold">{selectedFY.label}</span>
            <FYStatusBadge status={selectedFY.status} compact />
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-2">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 pb-1">
            Financial Year
          </DropdownMenuLabel>
          {FINANCIAL_YEARS.map((fy) => {
            const c = FY_STATUS_CONFIG[fy.status];
            const isSelected = fy.id === selectedFY.id;
            return (
              <button
                key={fy.id}
                onClick={() => handleSelect(fy)}
                className={cn(
                  "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors border-l-2 cursor-pointer",
                  isSelected ? "bg-brand-50 border-brand-600" : "border-transparent hover:bg-muted/60",
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0",
                  isSelected ? "bg-brand-100" : "bg-muted",
                )}>
                  <Calendar className={cn("w-3.5 h-3.5", isSelected ? "text-brand-600" : "text-muted-foreground")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-semibold", isSelected ? "text-brand-700" : "text-foreground")}>
                    {fy.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{fy.start} – {fy.end}</p>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0",
                  c.bg, c.color, c.border,
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", c.dot, fy.status === "live" && "animate-pulse")} />
                  {c.label}
                </span>
              </button>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <FYSwitchDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setPendingFY(null); }}
        pendingFY={pendingFY}
        onConfirm={handleConfirm}
      />
    </>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
export function AppHeader() {
  const [selectedState,     setSelectedState]     = useState("All States");
  const [selectedTerritory, setSelectedTerritory] = useState("All Territories");

  return (
    <TooltipProvider delayDuration={300}>
      <header className="h-12 bg-white border-b border-border/50 flex items-center px-4 gap-3 z-30 sticky top-[56px]">

        {/* Global search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-xs rounded-input bg-muted/40 border-transparent focus:bg-white focus:border-border"
            placeholder="Search farmer, order, distributor, product…"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted/60 border border-border rounded px-1 py-0.5">
            ⌘K
          </kbd>
        </div>

        <Separator orientation="vertical" className="h-5" />

        {/* Financial Year selector */}
        <FYSelector />

        <Separator orientation="vertical" className="h-5" />

        {/* State selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 text-[12px] font-medium text-foreground hover:text-brand-600 transition-colors whitespace-nowrap">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">{selectedState}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44 p-2">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 pb-1">
              State
            </DropdownMenuLabel>
            {STATES.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedState(s)}
                className={cn(
                  "w-full flex items-center px-2.5 py-2 rounded-lg text-xs text-left transition-colors border-l-2 cursor-pointer",
                  selectedState === s
                    ? "bg-brand-50 text-brand-700 border-brand-600 font-semibold"
                    : "text-foreground border-transparent hover:bg-muted/50",
                )}
              >
                {s}
              </button>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Territory selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 text-[12px] font-medium text-foreground hover:text-brand-600 transition-colors whitespace-nowrap">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden md:inline">{selectedTerritory}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 p-2">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 pb-1">
              Territory
            </DropdownMenuLabel>
            {TERRITORIES.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTerritory(t)}
                className={cn(
                  "w-full flex items-center px-2.5 py-2 rounded-lg text-xs text-left transition-colors border-l-2 cursor-pointer",
                  selectedTerritory === t
                    ? "bg-brand-50 text-brand-700 border-brand-600 font-semibold"
                    : "text-foreground border-transparent hover:bg-muted/50",
                )}
              >
                {t}
              </button>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Pending approvals */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative flex items-center gap-1.5 text-[12px] font-medium text-foreground hover:text-brand-600 transition-colors whitespace-nowrap">
              <CheckSquare className="w-4 h-4 text-muted-foreground" />
              <span className="hidden sm:inline">Approvals</span>
              {totalPending > 0 && <CountBadge count={totalPending} variant="amber" />}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-64 p-3 rounded-modal">
            <p className="text-xs font-semibold text-foreground mb-2.5">Pending Approvals</p>
            <div className="space-y-0.5">
              {PENDING_APPROVALS.map((a) => (
                <a
                  key={a.label}
                  href={a.href}
                  className="flex items-center justify-between px-2.5 py-2.5 rounded-lg border-l-2 border-transparent hover:bg-muted/50 hover:border-brand-400 transition-all cursor-pointer group"
                >
                  <span className="text-xs text-foreground group-hover:font-medium">{a.label}</span>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5 flex-shrink-0">
                    {a.count}
                  </span>
                </a>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Notification bell */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-white" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-80 p-0 rounded-modal overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              <button className="text-[11px] text-brand-600 hover:underline font-medium">Mark all read</button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {NOTIFICATIONS.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {}}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 border-b border-border/50 border-l-2 transition-all text-left cursor-pointer",
                    !n.read
                      ? "bg-brand-50/40 border-brand-300 hover:bg-brand-50/60"
                      : "border-transparent hover:bg-muted/30",
                  )}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                    n.read ? "bg-muted-foreground/30" : "bg-brand-500",
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs leading-relaxed", !n.read && "font-medium text-foreground")}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{n.time}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-border">
              <button className="w-full text-center text-xs text-brand-600 font-medium hover:underline">
                View all notifications
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Help */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Help & Support</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5" />

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-muted/50 rounded-xl px-2 py-1 transition-colors">
              <Avatar className="w-7 h-7">
                <AvatarImage src="" />
                <AvatarFallback className="bg-brand-500 text-white text-xs font-bold">RS</AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-[12px] font-semibold text-foreground leading-tight">Rajesh S.</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Area Sales Manager</p>
              </div>
              <span className="hidden lg:inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-brand-100 text-brand-700 border border-brand-200">
                ASM
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-modal">
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold text-foreground">Rajesh Sharma</p>
              <p className="text-xs text-muted-foreground">rajesh.sharma@dharitrisutra.com</p>
              <span className="inline-flex items-center mt-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-brand-100 text-brand-700 border border-brand-200">
                Area Sales Manager
              </span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
              <User className="w-3.5 h-3.5" /> My Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
              <Settings className="w-3.5 h-3.5" /> Account Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
              <Shield className="w-3.5 h-3.5" /> Change Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
    </TooltipProvider>
  );
}
