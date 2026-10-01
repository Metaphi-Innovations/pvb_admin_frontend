"use client";

import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Ban, ChevronDown, AlertTriangle } from "lucide-react";
import type { Customer, CustomerStatus } from "../customer-data";

const STATUS_CFG: Record<
  CustomerStatus,
  { bg: string; text: string; dot: string; label: string }
> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  inactive: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "Inactive" },
  draft: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Draft" },
  blocked: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400", label: "Blocked" },
};

interface CustomerStatusControlProps {
  customer: Customer;
  onStatusChange: (customerId: number, status: CustomerStatus, blockReason?: string) => void;
  /** When false, status is read-only (requires edit permission) */
  canEdit?: boolean;
}

export function CustomerStatusControl({
  customer,
  onStatusChange,
  canEdit = true,
}: CustomerStatusControlProps) {
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockError, setBlockError] = useState("");

  const cfg = STATUS_CFG[customer.status];

  if (!canEdit) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
          cfg.bg,
          cfg.text,
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
        {cfg.label}
      </span>
    );
  }

  const handleToggle = (checked: boolean) => {
    if (customer.status === "blocked" || customer.status === "draft") return;
    onStatusChange(customer.id, checked ? "active" : "inactive");
  };

  const handlePickStatus = (status: CustomerStatus) => {
    if (status === "blocked") {
      setBlockReason(customer.blockReason || "");
      setBlockError("");
      setBlockOpen(true);
      return;
    }
    onStatusChange(customer.id, status);
  };

  const confirmBlock = () => {
    if (!blockReason.trim()) {
      setBlockError("Block reason is required");
      return;
    }
    onStatusChange(customer.id, "blocked", blockReason.trim());
    setBlockOpen(false);
  };

  if (customer.status === "blocked") {
    return (
      <>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium border border-red-200",
                cfg.bg,
                cfg.text,
              )}
            >
              <Ban className="w-3 h-3" />
              Blocked
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-44 p-1">
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-muted/60"
              onClick={() => onStatusChange(customer.id, "active")}
            >
              Unblock → Active
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-muted/60"
              onClick={() => onStatusChange(customer.id, "inactive")}
            >
              Unblock → Inactive
            </button>
          </PopoverContent>
        </Popover>

        <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                Block Customer
              </DialogTitle>
              <DialogDescription>Blocked customers cannot be used in sales orders or invoices.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Block Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={blockReason}
                onChange={(e) => {
                  setBlockReason(e.target.value);
                  setBlockError("");
                }}
                rows={3}
                className={cn("text-sm rounded-lg", blockError && "border-red-400")}
                placeholder="Enter reason for blocking…"
              />
              {blockError && <p className="text-xs text-red-500">{blockError}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setBlockOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={confirmBlock}>
                Block Customer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (customer.status === "draft") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium",
              cfg.bg,
              cfg.text,
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
            Draft
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-40 p-1">
          {(["active", "inactive", "blocked"] as CustomerStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-muted/60 capitalize"
              onClick={() => handlePickStatus(s)}
            >
              Mark {s}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border border-border/80 bg-white hover:bg-muted/30 transition-colors shadow-sm",
              cfg.bg,
              cfg.text,
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
            {cfg.label}
            <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-44 p-1 rounded-xl border border-border bg-white shadow-md z-[300]">
          {customer.status !== "active" && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-muted/60 font-medium"
              onClick={() => handlePickStatus("active")}
            >
              Mark Active
            </button>
          )}
          {customer.status !== "inactive" && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-muted/60 font-medium"
              onClick={() => handlePickStatus("inactive")}
            >
              Mark Inactive
            </button>
          )}
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-muted/60 font-medium"
            onClick={() => handlePickStatus("draft")}
          >
            Mark as Draft
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-muted/60 text-red-600 font-medium border-t border-border/50 mt-1 pt-1.5"
            onClick={() => handlePickStatus("blocked")}
          >
            Block Customer…
          </button>
        </PopoverContent>
      </Popover>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              Block Customer
            </DialogTitle>
            <DialogDescription>
              {customer.customerName} will be blocked from all new transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Block Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={blockReason}
              onChange={(e) => {
                setBlockReason(e.target.value);
                setBlockError("");
              }}
              rows={3}
              className={cn("text-sm rounded-lg", blockError && "border-red-400")}
            />
            {blockError && <p className="text-xs text-red-500">{blockError}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setBlockOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={confirmBlock}>
              Block
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
