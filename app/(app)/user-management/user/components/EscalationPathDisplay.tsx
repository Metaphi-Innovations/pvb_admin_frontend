"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ArrowDown, AlertTriangle } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface EscalationNode {
  id: number;
  name: string;
  role: string;
  initials: string;
  status: "active" | "on-leave" | "inactive";
  isCurrentEmployee?: boolean;
}

interface Props {
  chain: EscalationNode[];
}

// ── Status badge ──────────────────────────────────────────────────────────────
function NodeStatusBadge({ status }: { status: EscalationNode["status"] }) {
  if (status === "active") return null;
  if (status === "on-leave") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-px rounded-full bg-orange-100 text-orange-700">
        <AlertTriangle className="w-2.5 h-2.5" />
        On Leave
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-px rounded-full bg-slate-100 text-slate-500">
      Inactive
    </span>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function EscalationPathDisplay({ chain }: Props) {
  if (chain.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        No reporting chain configured yet.
      </p>
    );
  }

  // Find first skip scenario (on-leave manager)
  const leaveIdx = chain.findIndex(n => n.status === "on-leave" && !n.isCurrentEmployee);
  const nextActiveAfterLeave = leaveIdx !== -1 ? chain.slice(leaveIdx + 1).find(n => n.status === "active") : null;

  return (
    <div className="space-y-2">
      {chain.map((node, i) => (
        <React.Fragment key={node.id}>
          {/* Node */}
          <div className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors",
            node.isCurrentEmployee
              ? "bg-brand-50 border-brand-200"
              : node.status === "on-leave"
                ? "bg-orange-50 border-orange-200"
                : "bg-muted/20 border-border",
          )}>
            {/* Avatar */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
              node.isCurrentEmployee
                ? "bg-brand-600 text-white"
                : node.status === "on-leave"
                  ? "bg-orange-200 text-orange-800"
                  : "bg-muted text-muted-foreground",
            )}>
              {node.initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-semibold text-foreground truncate">{node.name}</p>
                <span className="text-[10px] font-medium px-1.5 py-px rounded-full bg-slate-100 text-slate-600">
                  {node.role}
                </span>
                <NodeStatusBadge status={node.status} />
                {node.isCurrentEmployee && (
                  <span className="text-[10px] font-medium px-1.5 py-px rounded-full bg-brand-100 text-brand-700">
                    Current Employee
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Connector arrow */}
          {i < chain.length - 1 && (
            <div className="flex justify-center">
              <ArrowDown className="w-4 h-4 text-muted-foreground/50" />
            </div>
          )}
        </React.Fragment>
      ))}

      {/* Skip notice */}
      {nextActiveAfterLeave && (
        <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 mt-2">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-orange-700">
            Approvals will skip to <strong>{nextActiveAfterLeave.name}</strong> while the reporting manager is on leave.
          </p>
        </div>
      )}
    </div>
  );
}
