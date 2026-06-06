"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Package,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  CheckCircle,
} from "lucide-react";

interface PRSidebarProps {
  status?: "draft" | "pending_approval" | "approved" | "rejected";
  totalItems?: number;
  totalQuantity?: number;
  estimatedValue?: string;
  vendorCount?: number;
  className?: string;
}

export function PRSidebar({
  status = "pending_approval",
  totalItems = 3,
  totalQuantity = 1100,
  estimatedValue = "₹2,45,000",
  vendorCount = 2,
  className,
}: PRSidebarProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Summary Card */}
      <SummaryCard
        totalItems={totalItems}
        totalQuantity={totalQuantity}
        estimatedValue={estimatedValue}
        vendorCount={vendorCount}
      />

      {/* Status Card */}
      <StatusCard status={status} />

      {/* Approval Chain Card */}
      <ApprovalChainCard />

      {/* Activity Timeline Card */}
      <ActivityTimelineCard />
    </div>
  );
}

// ============================================================================
// SUMMARY CARD
// ============================================================================

interface SummaryCardProps {
  totalItems: number;
  totalQuantity: number;
  estimatedValue: string;
  vendorCount: number;
}

function SummaryCard({
  totalItems,
  totalQuantity,
  estimatedValue,
  vendorCount,
}: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
        Summary
      </p>
      <div className="space-y-2.5">
        <SummaryRow icon={Package} label="Items" value={String(totalItems)} />
        <SummaryRow icon={TrendingUp} label="Quantity" value={String(totalQuantity)} />
        <SummaryRow icon={CheckCircle2} label="Est. Value" value={estimatedValue} highlight />
        <SummaryRow icon={Users} label="Vendors" value={String(vendorCount)} />
      </div>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      </div>
      <span
        className={cn(
          "text-xs font-semibold whitespace-nowrap",
          highlight ? "text-brand-700" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// STATUS CARD
// ============================================================================

interface StatusCardProps {
  status: "draft" | "pending_approval" | "approved" | "rejected";
}

function StatusCard({ status }: StatusCardProps) {
  const config: Record<
    string,
    {
      bg: string;
      text: string;
      icon: React.ComponentType<{ className?: string }>;
      label: string;
      description: string;
      nextAction: string;
    }
  > = {
    draft: {
      bg: "bg-slate-50",
      text: "text-slate-700",
      icon: AlertCircle,
      label: "Draft",
      description: "Not submitted yet",
      nextAction: "Submit for approval",
    },
    pending_approval: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      icon: Clock,
      label: "Pending Approval",
      description: "Awaiting approval",
      nextAction: "TM approval pending",
    },
    approved: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      icon: CheckCircle,
      label: "Approved",
      description: "Ready for conversion",
      nextAction: "Create PO",
    },
    rejected: {
      bg: "bg-red-50",
      text: "text-red-700",
      icon: AlertCircle,
      label: "Rejected",
      description: "Changes needed",
      nextAction: "Edit and resubmit",
    },
  };

  const cfg = config[status];
  const Icon = cfg.icon;

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-3">
      <div className="flex items-start gap-2.5 mb-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", cfg.bg)}>
          <Icon className={cn("w-4 h-4", cfg.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-xs font-semibold", cfg.text)}>{cfg.label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{cfg.description}</p>
        </div>
      </div>
      <div className="pt-2.5 border-t border-border/50">
        <p className="text-[11px] text-muted-foreground mb-1.5">Next action</p>
        <p className="text-xs font-medium text-foreground">{cfg.nextAction}</p>
      </div>
    </div>
  );
}

// ============================================================================
// APPROVAL CHAIN CARD
// ============================================================================

interface ApprovalStep {
  role: string;
  name: string;
  status: "approved" | "pending" | "waiting";
  date?: string;
}

const APPROVAL_STEPS: ApprovalStep[] = [
  { role: "TM", name: "Rajesh Kumar", status: "approved", date: "05-Jun" },
  { role: "ASM", name: "Priya Singh", status: "approved", date: "06-Jun" },
  { role: "RSM", name: "Vikram Patel", status: "pending", date: undefined },
  { role: "ZSM", name: "Arjun Verma", status: "waiting", date: undefined },
];

function ApprovalChainCard() {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
        Approval Chain
      </p>
      <div className="space-y-2">
        {APPROVAL_STEPS.map((step, idx) => (
          <div key={step.role}>
            <ApprovalStep step={step} />
            {idx < APPROVAL_STEPS.length - 1 && (
              <div className="flex justify-center py-1.5">
                <ChevronRight className="w-3 h-3 text-border rotate-90" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ApprovalStep({ step }: { step: ApprovalStep }) {
  const statusConfig: Record<
    string,
    { bg: string; dot: string; text: string }
  > = {
    approved: {
      bg: "bg-emerald-50",
      dot: "bg-emerald-500",
      text: "text-emerald-700",
    },
    pending: {
      bg: "bg-amber-50",
      dot: "bg-amber-500",
      text: "text-amber-700",
    },
    waiting: {
      bg: "bg-slate-100",
      dot: "bg-slate-400",
      text: "text-slate-600",
    },
  };

  const cfg = statusConfig[step.status];

  return (
    <div className={cn("rounded-lg p-2.5 flex items-center gap-2.5", cfg.bg)}>
      {/* Avatar / Initials */}
      <div className="w-7 h-7 rounded-full bg-white border border-border/60 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-foreground">
        {step.role}
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-[11px] font-semibold", cfg.text)}>{step.name}</p>
        <p className="text-[10px] text-muted-foreground">{step.role}</p>
      </div>
      {/* Status indicator */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
        {step.date && (
          <span className="text-[10px] text-muted-foreground font-medium">{step.date}</span>
        )}
        {step.status === "pending" && (
          <span className="text-[10px] font-medium text-amber-700">Now</span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ACTIVITY TIMELINE CARD
// ============================================================================

interface TimelineEntry {
  date: string;
  action: string;
  user: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "emerald" | "amber" | "blue" | "slate";
}

const TIMELINE_ENTRIES: TimelineEntry[] = [
  {
    date: "05-Jun 10:30 AM",
    action: "PR Created",
    user: "Rajesh Kumar",
    icon: CheckCircle,
    color: "blue",
  },
  {
    date: "05-Jun 02:15 PM",
    action: "Submitted for Approval",
    user: "Rajesh Kumar",
    icon: CheckCircle,
    color: "blue",
  },
  {
    date: "06-Jun 09:00 AM",
    action: "Approved by TM",
    user: "Admin",
    icon: CheckCircle2,
    color: "emerald",
  },
  {
    date: "06-Jun 11:30 AM",
    action: "Pending with ASM",
    user: "System",
    icon: Clock,
    color: "amber",
  },
];

function ActivityTimelineCard() {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
        Activity Timeline
      </p>
      <div className="space-y-2.5">
        {TIMELINE_ENTRIES.map((entry, idx) => (
          <TimelineItem key={idx} entry={entry} isLast={idx === TIMELINE_ENTRIES.length - 1} />
        ))}
      </div>
    </div>
  );
}

function TimelineItem({
  entry,
  isLast,
}: {
  entry: TimelineEntry;
  isLast: boolean;
}) {
  const Icon = entry.icon;
  const colorConfig: Record<
    string,
    { dot: string; icon: string }
  > = {
    emerald: { dot: "bg-emerald-500", icon: "text-emerald-600" },
    amber: { dot: "bg-amber-500", icon: "text-amber-600" },
    blue: { dot: "bg-blue-500", icon: "text-blue-600" },
    slate: { dot: "bg-slate-400", icon: "text-slate-500" },
  };

  const cfg = colorConfig[entry.color];

  return (
    <div className="flex gap-2.5">
      {/* Timeline dot and line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5", cfg.dot)} />
        {!isLast && <div className="w-0.5 h-8 bg-border my-0.5" />}
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0 pb-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold text-foreground">{entry.action}</p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{entry.user}</p>
        <p className="text-[10px] text-muted-foreground/70">{entry.date}</p>
      </div>
    </div>
  );
}
