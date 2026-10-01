"use client";

import React, { memo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown, Calendar,
  AlertTriangle, Check, LogOut, User, Settings, Shield,
} from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useFY, FINANCIAL_YEARS, FY_STATUS_CONFIG, type FinancialYear } from "@/lib/fy-store";
import { HrNotificationBell } from "./HrNotificationBell";

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

function AppHeaderInner() {
  const [userData, setUserData] = useState<{ username?: string; email?: string } | null>(null);

  React.useEffect(() => {
    void import("@/services/auth.service").then(({ AuthService }) => {
      setUserData(AuthService.getUserData());
    });
  }, []);

  const username = userData?.username || "Admin";
  const email = userData?.email || "admin@gmail.com";
  const userRole = userData?.username === "Admin" ? "Administrator" : "User";
  const shortName = username.split(" ")[0];
  const initials = username.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <header className="h-12 bg-white border-b border-border/50 flex items-center px-4 gap-3 z-[90] relative flex-shrink-0">
      <FYSelector />

      <div className="flex-1" />

      <HrNotificationBell />

      <Separator orientation="vertical" className="h-5" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 hover:bg-muted/50 rounded-xl px-2 py-1 transition-colors">
            <Avatar className="w-7 h-7">
              <AvatarImage src="" />
              <AvatarFallback className="bg-brand-500 text-white text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left">
              <p className="text-[12px] font-semibold text-foreground leading-tight">{shortName}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{userRole}</p>
            </div>
            <span className="hidden lg:inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-brand-100 text-brand-700 border border-brand-200">
              {initials}
            </span>
            <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-modal">
          <div className="px-3 py-2.5">
            <p className="text-sm font-semibold text-foreground">{username}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
            <span className="inline-flex items-center mt-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-brand-100 text-brand-700 border border-brand-200">
              {userRole}
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
          <DropdownMenuItem
            onClick={() => {
              void import("@/services/auth.service").then(({ AuthService }) => AuthService.logout());
            }}
            className="text-xs gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export const AppHeader = memo(AppHeaderInner);
