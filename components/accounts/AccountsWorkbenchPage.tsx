"use client";

import React from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { cn } from "@/lib/utils";
import { MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";

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
    >
      <div className="flex-1 overflow-auto min-h-0">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Data appears when related vouchers are posted in the system.
            </p>
          </div>
        ) : (
          <table className="w-full text-table">
            <thead className="bg-muted/20 border-b border-border/60 sticky top-0 z-10">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      (!c.align || c.align === "left") && "text-left",
                    )}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/40 hover:bg-muted/20">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-4 py-2.5 text-xs text-foreground",
                        c.align === "right" && "text-right",
                        c.money && MONEY_AMOUNT_CLASS,
                        c.mono && "font-mono",
                      )}
                    >
                      {row[c.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AccountsPageShell>
  );
}
