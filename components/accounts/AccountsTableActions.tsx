"use client";

import React from "react";
import Link from "next/link";
import { Eye, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Standard icon button — always visible, no hover-only opacity */
export const ACCOUNTS_ACTION_BTN_CLASS =
  "inline-flex items-center justify-center p-1.5 hover:bg-muted rounded-md transition-colors flex-shrink-0";

export const ACCOUNTS_ACTION_ICON_CLASS = "w-4 h-4 text-muted-foreground";

export const ACCOUNTS_ACTION_COL_CLASS = {
  single: "accounts-col-actions",
  multi: "accounts-col-actions-wide",
} as const;

export type AccountsActionColVariant = keyof typeof ACCOUNTS_ACTION_COL_CLASS;

export function accountsActionColClass(variant: AccountsActionColVariant = "multi"): string {
  return ACCOUNTS_ACTION_COL_CLASS[variant];
}

export function AccountsTableActionCell({
  children,
  className,
  variant = "multi",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: AccountsActionColVariant;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-0.5 flex-shrink-0",
        ACCOUNTS_ACTION_COL_CLASS[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}

type ActionButtonProps = {
  title?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
};

export function AccountsViewAction({
  title = "View",
  href,
  onClick,
  className,
  disabled,
}: ActionButtonProps & { href?: string }) {
  const icon = <Eye className={ACCOUNTS_ACTION_ICON_CLASS} />;
  if (href) {
    return (
      <Link
        href={href}
        title={title}
        className={cn(ACCOUNTS_ACTION_BTN_CLASS, className)}
        onClick={onClick}
      >
        {icon}
      </Link>
    );
  }
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className={cn(ACCOUNTS_ACTION_BTN_CLASS, className)}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

export function AccountsEditAction({
  title = "Edit",
  href,
  onClick,
  className,
  disabled,
}: ActionButtonProps & { href?: string }) {
  const icon = <Pencil className={ACCOUNTS_ACTION_ICON_CLASS} />;
  if (href) {
    return (
      <Link
        href={href}
        title={title}
        className={cn(ACCOUNTS_ACTION_BTN_CLASS, className)}
        onClick={onClick}
      >
        {icon}
      </Link>
    );
  }
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className={cn(ACCOUNTS_ACTION_BTN_CLASS, className)}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

export function AccountsDeleteAction({
  title = "Delete",
  onClick,
  className,
  disabled,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className={cn(
        ACCOUNTS_ACTION_BTN_CLASS,
        "hover:bg-red-50 hover:text-red-600",
        className,
      )}
      onClick={onClick}
    >
      <Trash2 className={cn(ACCOUNTS_ACTION_ICON_CLASS, "hover:text-red-600")} />
    </button>
  );
}

export function AccountsGenerateAction({
  title = "Generate",
  onClick,
  className,
  disabled,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className={cn(ACCOUNTS_ACTION_BTN_CLASS, className)}
      onClick={onClick}
    >
      <Plus className={cn(ACCOUNTS_ACTION_ICON_CLASS, "text-brand-600")} />
    </button>
  );
}

export function AccountsMoreActions({
  children,
  title = "More actions",
  className,
  contentClassName,
  align = "end",
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
  contentClassName?: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={title}
          className={cn(
            "inline-flex items-center justify-center w-7 h-7 rounded hover:bg-muted transition-colors flex-shrink-0",
            className,
          )}
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={cn("w-44", contentClassName)}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
