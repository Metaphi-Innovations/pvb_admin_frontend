"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";

/** Standard accounts table row heights (px) — keep in sync with globals.css */
export const ACCOUNTS_TABLE_HEADER_HEIGHT = 28;
export const ACCOUNTS_TABLE_ROW_HEIGHT = 30;

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
      className={cn("accounts-table", className)}
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

function alignInnerClass(align: AccountsTableAlign) {
  return cn(
    align === "right" && "justify-end",
    align === "center" && "justify-center",
    align === "left" && "justify-start",
  );
}

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
      <div className={cn("accounts-table-th-inner", alignInnerClass(align))}>{children}</div>
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
  wrap = false,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  align?: AccountsTableAlign;
  money?: boolean;
  mono?: boolean;
  /** Allow multi-line content (e.g. name + subtitle) — relaxes fixed row height */
  wrap?: boolean;
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
        wrap && "!h-auto !min-h-[30px] py-1 align-top",
        className,
      )}
    >
      {wrap ? (
        children
      ) : (
        <div className={cn("accounts-table-td-inner", alignInnerClass(align))}>{children}</div>
      )}
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
  onRowClick,
  getRowKey,
  clickableColumnKeys,
}: {
  columns: AccountsColumnDef[];
  rows: Record<string, string | number>[];
  emptyMessage?: string;
  footer?: React.ReactNode;
  minWidth?: number;
  className?: string;
  onRowClick?: (row: Record<string, string | number>, index: number) => void;
  getRowKey?: (row: Record<string, string | number>, index: number) => string | number;
  /** Column keys that render as clickable links (e.g. voucher no.) */
  clickableColumnKeys?: string[];
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
            <AccountsTableRow
              key={getRowKey?.(row, i) ?? i}
              className={onRowClick ? "group cursor-pointer" : undefined}
              onClick={onRowClick ? () => onRowClick(row, i) : undefined}
            >
              {columns.map((c) => (
                <AccountsTableCell key={c.key} align={c.align ?? "left"} money={c.money} mono={c.mono}>
                  {clickableColumnKeys?.includes(c.key) && onRowClick ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(row, i);
                      }}
                      className={cn(
                        "hover:underline text-left",
                        c.mono ? "font-mono text-xs font-semibold text-brand-700" : "text-brand-700 font-medium",
                      )}
                    >
                      {row[c.key] ?? "—"}
                    </button>
                  ) : (
                    row[c.key] ?? "—"
                  )}
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

export interface AccountsRichColumnDef<T> {
  key: string;
  label: string;
  /** Custom header cell — when set, replaces default label */
  header?: React.ReactNode;
  align?: AccountsTableAlign;
  uppercase?: boolean;
  className?: string;
  render: (row: T, index: number) => React.ReactNode;
}

/** Columnar table with custom cell renderers (reports with badges, links, etc.) */
export function AccountsRichTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "No records found.",
  minWidth,
  className,
  onRowClick,
}: {
  columns: AccountsRichColumnDef<T>[];
  rows: T[];
  getRowKey?: (row: T, index: number) => string | number;
  emptyMessage?: string;
  minWidth?: number;
  className?: string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <AccountsTable minWidth={minWidth} className={className}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          {columns.map((c) => (
            <AccountsTableHeadCell
              key={c.key}
              align={c.align ?? "left"}
              uppercase={c.uppercase ?? true}
              className={c.className}
            >
              {c.header ?? c.label}
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
            <AccountsTableRow
              key={getRowKey ? getRowKey(row, i) : i}
              className={onRowClick ? "group cursor-pointer" : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <AccountsTableCell key={c.key} align={c.align ?? "left"}>
                  {c.render(row, i)}
                </AccountsTableCell>
              ))}
            </AccountsTableRow>
          ))
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}
