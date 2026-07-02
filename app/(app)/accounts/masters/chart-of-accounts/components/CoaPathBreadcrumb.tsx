"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChartOfAccount } from "../../../data";
import { getAncestorPath } from "../chart-of-accounts-data";

interface CoaPathBreadcrumbProps {
  records: ChartOfAccount[];
  selectedNode: ChartOfAccount | null;
  showRoot: boolean;
  onSelectRoot: () => void;
  onSelectNode: (node: ChartOfAccount) => void;
  actions?: React.ReactNode;
}

export function CoaPathBreadcrumb({
  records,
  selectedNode,
  showRoot,
  onSelectRoot,
  onSelectNode,
  actions,
}: CoaPathBreadcrumbProps) {
  const path = selectedNode && !showRoot ? getAncestorPath(records, selectedNode.id) : [];

  return (
    <nav
      aria-label="COA path"
      className="flex-shrink-0 flex items-center justify-between gap-3 px-3 py-2 border-b border-border/60 bg-muted/10"
    >
      <ol className="flex items-center flex-wrap gap-1 text-[11px] text-muted-foreground min-w-0">
        <li>
          <button
            type="button"
            onClick={onSelectRoot}
            className={cn(
              "hover:text-brand-700 transition-colors",
              showRoot && "text-foreground font-medium",
            )}
          >
            Chart of Accounts
          </button>
        </li>
        {path.map((node, i) => (
          <li key={node.id} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            {i < path.length - 1 ? (
              <button
                type="button"
                onClick={() => onSelectNode(node)}
                className="hover:text-brand-700 transition-colors"
              >
                {node.accountName}
              </button>
            ) : (
              <span className="text-foreground font-medium">{node.accountName}</span>
            )}
          </li>
        ))}
      </ol>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </nav>
  );
}
