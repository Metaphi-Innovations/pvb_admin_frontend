"use client";

import React from "react";
import { CheckCircle2, Clock, FileText, LayoutList, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { RecordApprovalItem, RecordDetailSidebarProps } from "./types";

function SidebarPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-4 py-2.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

const APPROVAL_TONE: Record<NonNullable<RecordApprovalItem["tone"]>, string> = {
  pending: "text-amber-700 bg-amber-50 border-amber-100",
  approved: "text-emerald-700 bg-emerald-50 border-emerald-100",
  rejected: "text-red-700 bg-red-50 border-red-100",
  neutral: "text-foreground bg-muted/30 border-border",
};

export function RecordDetailSidebar({
  quickActions = [],
  summary = [],
  activity = [],
  approval = [],
  documents = [],
}: RecordDetailSidebarProps) {
  return (
    <div className="space-y-4">
      {quickActions.length > 0 && (
        <SidebarPanel title="Quick Actions" icon={Zap}>
          <div className="flex flex-col gap-1.5">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const isPrimary = action.variant === "primary";
              return (
                <Button
                  key={action.label}
                  type="button"
                  variant={isPrimary ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 w-full justify-start text-xs gap-2",
                    isPrimary && "bg-brand-600 hover:bg-brand-700 text-white",
                  )}
                  onClick={action.onClick}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {action.label}
                </Button>
              );
            })}
          </div>
        </SidebarPanel>
      )}

      {summary.length > 0 && (
        <SidebarPanel title="Summary" icon={LayoutList}>
          <dl className="space-y-2">
            {summary.map((item) => (
              <div key={item.label} className="flex justify-between gap-3 text-xs">
                <dt className="text-muted-foreground flex-shrink-0">{item.label}</dt>
                <dd
                  className={cn(
                    "text-right font-medium text-foreground min-w-0 break-words",
                    item.highlight && "font-semibold text-brand-700",
                  )}
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </SidebarPanel>
      )}

      {activity.length > 0 && (
        <SidebarPanel title="Activity" icon={Clock}>
          <ul className="space-y-2.5">
            {activity.map((item) => (
              <li key={item.id} className="border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
                <p className="text-xs font-medium text-foreground leading-snug">{item.title}</p>
                {item.subtitle && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {item.subtitle}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/80 mt-1">{item.date}</p>
              </li>
            ))}
          </ul>
        </SidebarPanel>
      )}

      {approval.length > 0 && (
        <SidebarPanel title="Approval & Status" icon={Shield}>
          <dl className="space-y-2">
            {approval.map((item) => (
              <div key={item.label} className="flex justify-between gap-3 text-xs items-start">
                <dt className="text-muted-foreground flex-shrink-0">{item.label}</dt>
                <dd
                  className={cn(
                    "text-right font-medium rounded-md border px-2 py-0.5 text-[11px]",
                    APPROVAL_TONE[item.tone ?? "neutral"],
                  )}
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </SidebarPanel>
      )}

      {documents.length > 0 && (
        <SidebarPanel title="Documents" icon={FileText}>
          <ul className="space-y-1.5">
            {documents.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={doc.onClick}
                  disabled={!doc.onClick}
                  className={cn(
                    "w-full text-left rounded-lg border border-border/60 px-2.5 py-2 transition-colors",
                    doc.onClick && "hover:bg-muted/30 hover:border-brand-200",
                  )}
                >
                  <p className="text-xs font-medium text-foreground truncate">{doc.name}</p>
                  {doc.meta && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{doc.meta}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </SidebarPanel>
      )}
    </div>
  );
}
