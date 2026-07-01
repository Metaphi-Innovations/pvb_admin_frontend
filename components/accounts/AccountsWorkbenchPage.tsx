"use client";

import React from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  AccountsColumnarTable,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";

export interface WorkbenchColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  money?: boolean;
  mono?: boolean;
}

export interface AccountsWorkbenchPageProps {
  section: string;
  title: string;
  description: string;
  columns: WorkbenchColumn[];
  rows: Record<string, string | number>[];
  actions?: React.ReactNode;
  emptyMessage?: string;
}

export function AccountsWorkbenchPage({
  section,
  title,
  description,
  columns,
  rows,
  actions,
  emptyMessage = "No records found.",
}: AccountsWorkbenchPageProps) {
  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb(section, title)}
      title={title}
      description={description}
      actions={actions}
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableScroll>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Data appears when related vouchers are posted in the system.
            </p>
          </div>
        ) : (
          <AccountsColumnarTable
            columns={columns.map((c) => ({
              key: c.key,
              label: c.label,
              align: c.align,
              money: c.money,
              mono: c.mono,
            }))}
            rows={rows}
          />
        )}
      </AccountsTableScroll>
    </AccountsPageShell>
  );
}
