"use client";

import React, { memo } from "react";
import { cn } from "@/lib/utils";
import {
  ACCOUNTS_SIDEBAR_MODULE_DIVIDER_CLASS,
  ACCOUNTS_SIDEBAR_MODULE_TITLE_CLASS,
} from "@/lib/accounts/accounts-typography";
import { AccountsSidebarCollapseButton } from "./AccountsSidebarCollapseButton";

/** Module title + optional collapse toggle — sticky at top of contextual sidebar. */
export const AccountsSidebarModuleHeader = memo(function AccountsSidebarModuleHeader({
  title,
  collapsed = false,
  onToggleCollapse,
  showCollapseToggle = true,
}: {
  title: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  showCollapseToggle?: boolean;
}) {
  if (collapsed) {
    return (
      <div className="flex justify-center py-2 px-1">
        {showCollapseToggle && onToggleCollapse ? (
          <AccountsSidebarCollapseButton collapsed onToggle={onToggleCollapse} />
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-0 min-h-[40px]">
        <h2
          className={cn(ACCOUNTS_SIDEBAR_MODULE_TITLE_CLASS, "!p-0 flex-1 min-w-0 leading-tight truncate")}
          title={title}
        >
          {title}
        </h2>
        {showCollapseToggle && onToggleCollapse ? (
          <AccountsSidebarCollapseButton collapsed={false} onToggle={onToggleCollapse} />
        ) : null}
      </div>
      <div className={cn(ACCOUNTS_SIDEBAR_MODULE_DIVIDER_CLASS, "mx-3")} aria-hidden />
    </>
  );
});
