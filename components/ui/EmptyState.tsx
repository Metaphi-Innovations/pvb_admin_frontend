"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FileSearch, FolderOpen, Wifi, ShieldAlert, Leaf,
  type LucideIcon,
} from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
  secondaryAction,
  size = "md",
  className,
}: EmptyStateProps) {
  const sizeConfig = {
    sm: { wrapper: "py-10",  iconWrap: "w-12 h-12", icon: "w-5 h-5", title: "text-sm",  desc: "text-xs"  },
    md: { wrapper: "py-16",  iconWrap: "w-16 h-16", icon: "w-7 h-7", title: "text-base", desc: "text-sm"  },
    lg: { wrapper: "py-24",  iconWrap: "w-20 h-20", icon: "w-9 h-9", title: "text-lg",  desc: "text-sm"  },
  }[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        sizeConfig.wrapper,
        className,
      )}
    >
      <div
        className={cn(
          "rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-4",
          sizeConfig.iconWrap,
        )}
      >
        <Icon className={cn("text-brand-400", sizeConfig.icon)} strokeWidth={1.5} />
      </div>

      <h3
        className={cn("font-semibold text-foreground mb-1", sizeConfig.title)}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            "text-muted-foreground max-w-xs leading-relaxed mb-5",
            sizeConfig.desc,
          )}
        >
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {secondaryAction && (
            <Button variant="outline" size="sm" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button
              size="sm"
              className="bg-brand-500 hover:bg-brand-600 text-white"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Preset variants ───────────────────────────────────────────────────────────

export function EmptySearch({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={FileSearch}
      title="No results found"
      description="Try adjusting your search or filters to find what you're looking for."
      action={onClear ? { label: "Clear filters", onClick: onClear } : undefined}
    />
  );
}

export function EmptyNetwork({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={Wifi}
      title="Connection error"
      description="Unable to load data. Please check your internet connection and try again."
      action={onRetry ? { label: "Retry", onClick: onRetry } : undefined}
    />
  );
}

export function EmptyAccess() {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="Access restricted"
      description="You don't have permission to view this content. Contact your administrator."
    />
  );
}

export function EmptyModuleState({
  module,
  onAdd,
}: {
  module: string;
  onAdd?: () => void;
}) {
  return (
    <EmptyState
      icon={Leaf}
      title={`No ${module} yet`}
      description={`Get started by creating your first ${module.toLowerCase()}. It will appear here once added.`}
      action={onAdd ? { label: `Add ${module}`, onClick: onAdd } : undefined}
    />
  );
}
