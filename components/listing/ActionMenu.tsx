"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { ActionItemConfig } from "./types";
import { cn } from "@/lib/utils";

interface ActionMenuProps<T = any> {
  actions: ActionItemConfig<T>[];
  row: T;
}

const itemClass = (isDestructive?: boolean, isDisabled?: boolean) =>
  cn(
    "text-xs gap-2.5 cursor-pointer py-2 px-2.5 rounded-lg font-medium transition-colors",
    isDestructive
      ? "text-red-600 focus:text-red-700 focus:bg-red-50"
      : "text-foreground focus:bg-muted/50",
    isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
  );

export function ActionMenu({ actions, row }: ActionMenuProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-muted/80">
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 z-[200] rounded-xl p-1.5 border border-border bg-white shadow-md">
        <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Actions
        </div>
        <DropdownMenuSeparator className="my-1" />
        {actions.map((act, idx) => {
          if (act.hide?.(row)) return null;
          const Icon = act.icon;
          const isDestructive = act.variant === "destructive";
          const isDisabled = act.disabled?.(row);
          const children = (act.children ?? []).filter((child) => !child.hide?.(row));

          if (children.length > 0) {
            return (
              <React.Fragment key={idx}>
                {idx > 0 && isDestructive && <DropdownMenuSeparator className="my-1" />}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger
                    disabled={isDisabled}
                    className={cn(itemClass(isDestructive, isDisabled), "focus:bg-muted/50")}
                  >
                    {Icon && <Icon className="w-4 h-4 text-muted-foreground/80" />}
                    <span>{act.label}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="z-[210] min-w-[180px] rounded-xl p-1.5 border border-border bg-white shadow-md">
                    {children.map((child, childIdx) => {
                      const ChildIcon = child.icon;
                      const childDisabled = child.disabled?.(row) || isDisabled;
                      return (
                        <DropdownMenuItem
                          key={`${idx}-${childIdx}`}
                          disabled={childDisabled}
                          onClick={() => !childDisabled && child.onClick?.(row)}
                          className={itemClass(child.variant === "destructive", childDisabled)}
                        >
                          {ChildIcon && <ChildIcon className="w-4 h-4 text-muted-foreground/80" />}
                          <span>{child.label}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={idx}>
              {idx > 0 && isDestructive && <DropdownMenuSeparator className="my-1" />}
              <DropdownMenuItem
                disabled={isDisabled}
                onClick={() => !isDisabled && act.onClick?.(row)}
                className={itemClass(isDestructive, isDisabled)}
              >
                {Icon && <Icon className="w-4 h-4 text-muted-foreground/80" />}
                <span>{act.label}</span>
              </DropdownMenuItem>
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
