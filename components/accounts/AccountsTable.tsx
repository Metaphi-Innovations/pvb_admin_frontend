"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";

/** Scroll container for split-layout accounts pages */
export function AccountsTableScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("accounts-table-scroll", className)}>{children}</div>;
}

export function AccountsTable({
  children,
  className,
  minWidth,
}: {
  children: React.ReactNode;
  className?: string;
  /** Minimum table width in pixels */
  minWidth?: number;
}) {
  return (
    <table
      className={cn("accounts-table", minWidth != null && `min-w-[${minWidth}px]`, className)}
      style={minWidth != null ? { minWidth } : undefined}
    >
      {children}
    </table>
  );
}

export function AccountsTableHead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <thead className={cn("accounts-table-head", className)}>{children}</thead>;
}

export function AccountsTableHeadRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tr className={cn("accounts-table-head-row", className)}>{children}</tr>;
}

export type AccountsTableAlign = "left" | "right" | "center";

export function AccountsTableHeadCell({
  children,
  align = "left",
  sorted = false,
  sticky = true,
  uppercase = false,
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & {
  align?: AccountsTableAlign;
  sorted?: boolean;
  sticky?: boolean;
  uppercase?: boolean;
}) {
  return (
    <th
      {...props}
      className={cn(
        "accounts-table-th",
        sticky && "accounts-table-th-sticky",
        sorted && "accounts-table-th-sorted",
        uppercase && "accounts-table-th-uppercase",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function AccountsTableBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tbody className={cn("accounts-table-body", className)}>{children}</tbody>;
}

export function AccountsTableRow({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLTableRowElement>;
}) {
  return (
    <tr
      className={cn("accounts-table-row", onClick && "cursor-pointer", className)}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function AccountsTableCell({
  children,
  align = "left",
  money = false,
  mono = false,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  align?: AccountsTableAlign;
  money?: boolean;
  mono?: boolean;
}) {
  return (
    <td
      {...props}
      className={cn(
        "accounts-table-td",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        money && MONEY_AMOUNT_CLASS,
        mono && "font-mono",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function AccountsTableFoot({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tfoot className={cn("accounts-table-foot", className)}>{children}</tfoot>;
}

export interface AccountsColumnDef {
  key: string;
  label: string;
  align?: AccountsTableAlign;
  money?: boolean;
  mono?: boolean;
}

export function AccountsColumnarTable({
  columns,
  rows,
  emptyMessage = "No records found.",
  footer,
  minWidth,
  className,
}: {
  columns: AccountsColumnDef[];
  rows: Record<string, string | number>[];
  emptyMessage?: string;
  footer?: React.ReactNode;
  minWidth?: number;
  className?: string;
}) {
  return (
    <AccountsTable minWidth={minWidth} className={className}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          {columns.map((c) => (
            <AccountsTableHeadCell key={c.key} align={c.align ?? "left"} uppercase>
              {c.label}
            </AccountsTableHeadCell>
          ))}
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {rows.length === 0 ? (
          <AccountsTableRow>
            <AccountsTableCell colSpan={columns.length} className="accounts-table-empty">
              {emptyMessage}
            </AccountsTableCell>
          </AccountsTableRow>
        ) : (
          rows.map((row, i) => (
            <AccountsTableRow key={i}>
              {columns.map((c) => (
                <AccountsTableCell key={c.key} align={c.align ?? "left"} money={c.money} mono={c.mono}>
                  {row[c.key] ?? "—"}
                </AccountsTableCell>
              ))}
            </AccountsTableRow>
          ))
        )}
      </AccountsTableBody>
      {footer ? <AccountsTableFoot>{footer}</AccountsTableFoot> : null}
    </AccountsTable>
  );
}
