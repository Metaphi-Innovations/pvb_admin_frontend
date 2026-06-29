"use client";

import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeographyRecord } from "../geography-master-data";

export function GeographyFolderBreadcrumb({
  path,
  onNavigate,
}: {
  path: GeographyRecord[];
  onNavigate: (folderId: number | null) => void;
}) {
  if (path.length === 0) {
    return (
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
      >
        <Home className="w-3.5 h-3.5" />
        Root
      </button>
    );
  }

  return (
    <nav className="flex items-center flex-wrap gap-1" aria-label="Geography folder path">
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand-700 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
      </button>
      {path.map((node, i) => {
        const isLast = i === path.length - 1;
        return (
          <span key={node.id} className="inline-flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
            <button
              type="button"
              onClick={() => !isLast && onNavigate(node.id)}
              className={cn(
                "text-xs transition-colors max-w-[200px] truncate",
                isLast
                  ? "font-semibold text-foreground cursor-default"
                  : "text-muted-foreground hover:text-brand-700 hover:underline",
              )}
            >
              {node.name}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
