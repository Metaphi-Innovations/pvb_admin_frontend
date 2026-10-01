import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { type GeoNode } from "../geo-data";
import { LEVEL_DOT } from "./LevelBadge";
import { cn } from "@/lib/utils";

interface GeographyBreadcrumbProps {
  /** Ordered from root to current node, inclusive */
  path: GeoNode[];
  /** Whether each segment is a clickable link */
  linked?: boolean;
  /** Whether to exclude the last node (shows ancestors only) */
  excludeLast?: boolean;
}

export function GeographyBreadcrumb({ path, linked = false, excludeLast = false }: GeographyBreadcrumbProps) {
  const items = excludeLast ? path.slice(0, -1) : path;

  if (items.length === 0) return null;

  return (
    <div className="flex items-center flex-wrap gap-0.5">
      {items.map((node, i) => (
        <span key={node.id} className="flex items-center gap-0.5">
          {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />}
          <span className="flex items-center gap-1">
            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", LEVEL_DOT[node.level])} />
            {linked ? (
              <Link
                href={`/masters/geography/${node.id}`}
                className="text-[11px] text-muted-foreground hover:text-brand-600 hover:underline transition-colors"
              >
                {node.name}
              </Link>
            ) : (
              <span className="text-[11px] text-muted-foreground">{node.name}</span>
            )}
          </span>
        </span>
      ))}
    </div>
  );
}
