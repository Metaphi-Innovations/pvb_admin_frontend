"use client";

import React from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  AccountsColumnarTable,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableListing,
  AccountsListingToolbar,
  AccountsListingCountFooter,
} from "@/components/accounts/AccountsTableListing";

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
  filters?: React.ReactNode;
  onExcel?: () => void;
  onPdf?: () => void;
  emptyMessage?: string;
}

export function AccountsWorkbenchPage({
  section,
  title,
  description,
  columns,
  rows,
  actions,
  filters,
  onExcel,
  onPdf,
  emptyMessage = "No records found.",
}: AccountsWorkbenchPageProps) {
  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb(section, title)}
      title={title}
      description={description}
      hideDescription
      actions={actions}
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableListing
        toolbar={
          filters || onExcel || onPdf ? (
            <AccountsListingToolbar onExcel={onExcel} onPdf={onPdf} exportDisabled={rows.length === 0}>
              {filters}
            </AccountsListingToolbar>
          ) : undefined
        }
        footer={
          rows.length > 0 ? (
            <AccountsListingCountFooter>
              Showing <span className="font-medium text-foreground">{rows.length}</span> records
            </AccountsListingCountFooter>
          ) : undefined
        }
      >
        <AccountsColumnarTable
          columns={columns.map((c) => ({
            key: c.key,
            label: c.label,
            align: c.align,
            money: c.money,
            mono: c.mono,
          }))}
          rows={rows}
          emptyMessage={emptyMessage}
        />
      </AccountsTableListing>
    </AccountsPageShell>
  );
}
