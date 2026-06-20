"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { MiniKPICard } from "@/components/ui/KPICard";
import { cn } from "@/lib/utils";
import { MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import type { LucideIcon } from "lucide-react";

export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  money?: boolean;
  mono?: boolean;
}

export interface ReportKpi {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: boolean;
}

export interface AccountsReportShellProps {
  title: string;
  description?: string;
  section?: string;
  kpis?: ReportKpi[];
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
  filters?: React.ReactNode;
  emptyMessage?: string;
}

export function AccountsReportShell({
  title,
  description = "Report view with filters and export. Data from local mock / posted vouchers.",
  section = "Reports",
  kpis,
  columns,
  rows,
  filters,
  emptyMessage = "No data for selected filters.",
}: AccountsReportShellProps) {
  const exportCsv = () => {
    const header = columns.map((c) => c.label).join(",") + "\n";
    const body = rows
      .map((row) => columns.map((c) => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb(section, title)}
      title={title}
      description={description}
      actions={
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={exportCsv}>
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
      }
      filters={filters}
      layout="split"
      className="h-full min-h-0"
    >
      {kpis && kpis.length > 0 && (
        <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 border-b border-border/60 bg-muted/10">
          {kpis.map((k) => (
            <MiniKPICard key={k.label} label={k.label} value={k.value} icon={k.icon} accent={k.accent} />
          ))}
        </div>
      )}
      <div className="flex-1 overflow-auto min-h-0">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
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

/** @deprecated Import from @/components/accounts/ReportFilters */
export { ReportFilterBar } from "@/components/accounts/ReportFilters";
