"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import {
  buildPandLLedgerHref,
  collectPandLGroupIds,
  splitPandLHorizontal,
  type PandLDrillDownFilters,
  type PandLLineItem,
  type PandLSide,
  type PandLStatement,
  type PandLTreeNode,
  type PandLViewType,
} from "./pl-data";

const CHEVRON_COL_PX = 20;
const DEPTH_INDENT_PX = 16;
const BASE_INDENT_PX = 8;

function formatPlAmount(item: PandLLineItem): string {
  if (item.amount == null) return "—";
  if (item.isReturn && !item.ledgerId) {
    return formatMoney(item.amount);
  }
  if (item.isReturn) {
    return `(${formatMoney(item.amount)})`;
  }
  return formatMoney(item.amount);
}

function formatGroupAmount(amount: number | null): string {
  if (amount == null) return "—";
  return formatMoney(amount);
}

function indentPx(depth: number): number {
  return BASE_INDENT_PX + depth * DEPTH_INDENT_PX;
}

function SideTableHeader({ side }: { side: PandLSide }) {
  return (
    <thead className="sticky top-0 z-20 bg-[#FFF3E6] shadow-[0_1px_0_0_#E5E7EB]">
      <tr>
        <th className="px-3 py-2 text-left text-xs font-semibold text-navy-700 align-middle">
          {side.sectionTitle}
        </th>
        <th className="px-3 py-2 text-right text-xs font-semibold text-navy-700 w-36 align-middle whitespace-nowrap">
          {side.amountColumnLabel}
        </th>
      </tr>
    </thead>
  );
}

function NetBalanceRow({
  row,
  side,
}: {
  row: PandLLineItem;
  side: PandLSide;
}) {
  const isProfit = row.particular === "Net Profit";
  return (
    <tr className="border-b border-border/60 bg-brand-50/80">
      <td className="py-2 px-3 align-middle">
        <div className="flex items-center gap-0" style={{ paddingLeft: BASE_INDENT_PX }}>
          <span className="flex-shrink-0" style={{ width: CHEVRON_COL_PX }} />
          <span
            className={cn(
              "text-xs font-bold uppercase tracking-wide",
              isProfit ? "text-emerald-800" : "text-red-800",
            )}
          >
            {row.particular}
          </span>
        </div>
      </td>
      <td
        className={cn(
          "px-3 py-2 text-right text-xs font-bold tabular-nums w-36 align-middle whitespace-nowrap",
          MONEY_AMOUNT_CLASS,
          isProfit ? "text-emerald-700" : "text-red-700",
        )}
      >
        {formatGroupAmount(row.amount)}
      </td>
    </tr>
  );
}

function SideGrandTotalRow({ side }: { side: PandLSide }) {
  return (
    <tr className="border-t-2 border-brand-600 bg-brand-50/60">
      <td className="px-3 py-2.5 text-xs font-bold text-brand-800 align-middle">
        {side.grandTotalLabel}
        <span className="ml-1.5 text-[10px] font-semibold text-brand-700/80">
          ({side.balanceSide})
        </span>
      </td>
      <td
        className={cn(
          "px-3 py-2.5 text-right text-xs font-bold tabular-nums w-36 align-middle whitespace-nowrap",
          MONEY_AMOUNT_CLASS,
          "text-brand-800",
        )}
      >
        {formatGroupAmount(side.grandTotal)}
      </td>
    </tr>
  );
}

function SideTreeRows({
  node,
  expandedIds,
  onToggle,
  drillDownFilters,
}: {
  node: PandLTreeNode;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  drillDownFilters: PandLDrillDownFilters;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.item.id);
  const isGroup = hasChildren;
  const isLedger = Boolean(node.item.ledgerId);
  const rowIndent = indentPx(node.depth);

  const labelClass = cn(
    "text-xs truncate min-w-0",
    isGroup ? "font-semibold text-foreground" : "font-normal text-foreground/90",
    isLedger && "text-brand-700 hover:text-brand-800 hover:underline cursor-pointer",
  );

  const labelContent = isLedger ? (
    <Link
      href={buildPandLLedgerHref(node.item.ledgerId!, drillDownFilters)}
      className={labelClass}
      title={`View ${node.item.particular} ledger`}
    >
      {node.item.particular}
    </Link>
  ) : (
    <span className={labelClass} title={node.item.particular}>
      {node.item.particular}
    </span>
  );

  const displayAmount = isGroup
    ? formatGroupAmount(node.item.amount)
    : formatPlAmount(node.item);

  return (
    <>
      <tr
        className={cn(
          "border-b border-border/60 transition-colors",
          isGroup ? "bg-muted/10 hover:bg-muted/20" : "hover:bg-muted/10",
        )}
      >
        <td className="py-1.5 align-middle min-w-0">
          <div
            className="flex items-center gap-0 min-w-0 pr-2"
            style={{ paddingLeft: rowIndent }}
          >
            <span className="flex-shrink-0" style={{ width: CHEVRON_COL_PX }}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => onToggle(node.item.id)}
                  className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
                  )}
                </button>
              ) : null}
            </span>
            {labelContent}
          </div>
        </td>
        <td
          className={cn(
            "px-3 py-1.5 text-right text-xs tabular-nums whitespace-nowrap w-36 align-middle",
            isGroup ? cn("font-semibold", MONEY_AMOUNT_CLASS) : MONEY_AMOUNT_CLASS,
            node.item.isReturn && !isGroup && "text-red-700",
          )}
        >
          {displayAmount}
        </td>
      </tr>
      {hasChildren &&
        isExpanded &&
        node.children.map((child) => (
          <SideTreeRows
            key={child.item.id}
            node={child}
            expandedIds={expandedIds}
            onToggle={onToggle}
            drillDownFilters={drillDownFilters}
          />
        ))}
    </>
  );
}

function SideTable({
  side,
  expandedIds,
  onToggle,
  drillDownFilters,
}: {
  side: PandLSide;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  drillDownFilters: PandLDrillDownFilters;
}) {
  const hasRows = side.tree.length > 0;

  return (
    <table className="w-full border-collapse table-fixed">
      <colgroup>
        <col />
        <col className="w-36" />
      </colgroup>
      <SideTableHeader side={side} />
      <tbody>
        {hasRows ? (
          <>
            {side.tree.map((node) => (
              <SideTreeRows
                key={node.item.id}
                node={node}
                expandedIds={expandedIds}
                onToggle={onToggle}
                drillDownFilters={drillDownFilters}
              />
            ))}
            {side.netBalanceRow && (
              <NetBalanceRow row={side.netBalanceRow} side={side} />
            )}
          </>
        ) : (
          <tr>
            <td colSpan={2} className="px-3 py-6 text-center text-xs text-muted-foreground">
              No entries
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export function ProfitLossHorizontalView({
  statement,
  drillDownFilters,
  viewType,
}: {
  statement: PandLStatement;
  drillDownFilters: PandLDrillDownFilters;
  viewType: PandLViewType;
}) {
  const { expenses, income } = useMemo(
    () => splitPandLHorizontal(statement),
    [statement],
  );

  const defaultExpanded = useMemo(
    () =>
      viewType === "detailed"
        ? new Set([
            ...collectPandLGroupIds(expenses.tree),
            ...collectPandLGroupIds(income.tree),
          ])
        : new Set<string>(),
    [expenses.tree, income.tree, viewType],
  );

  const [expandedIds, setExpandedIds] = useState<Set<string>>(defaultExpanded);

  useEffect(() => {
    setExpandedIds(defaultExpanded);
  }, [defaultExpanded]);

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isProfit = statement.netProfit >= 0;
  const netLabel = isProfit ? "Net Profit" : "Net Loss";

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full w-full">
      <div className="flex-shrink-0 px-4 py-2.5 border-b border-border bg-white">
        <h2 className="text-sm font-bold text-navy-700 text-center">
          Profit &amp; Loss Account
        </h2>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-auto overscroll-contain border border-border border-t-0 bg-white"
        role="region"
        aria-label="Profit and Loss accounts"
      >
        <div className="flex flex-col lg:flex-row lg:items-start min-w-[760px]">
          <div className="flex-1 min-w-0 lg:border-r border-border">
            <SideTable
              side={expenses}
              expandedIds={expandedIds}
              onToggle={toggle}
              drillDownFilters={drillDownFilters}
            />
          </div>
          <div className="flex-1 min-w-0 border-t lg:border-t-0 border-border">
            <SideTable
              side={income}
              expandedIds={expandedIds}
              onToggle={toggle}
              drillDownFilters={drillDownFilters}
            />
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 flex flex-col lg:flex-row border border-t-0 border-border overflow-hidden shadow-sm bg-white min-w-[760px]">
        <div className="flex-1 min-w-0 lg:border-r border-border">
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col />
              <col className="w-36" />
            </colgroup>
            <tbody>
              <SideGrandTotalRow side={expenses} />
            </tbody>
          </table>
        </div>
        <div className="flex-1 min-w-0 border-t lg:border-t-0 border-border">
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col />
              <col className="w-36" />
            </colgroup>
            <tbody>
              <SideGrandTotalRow side={income} />
            </tbody>
          </table>
        </div>
      </div>

      <div
        className={cn(
          "flex-shrink-0 mt-3 px-3 py-2 rounded-lg border text-center text-xs font-bold",
          statement.isBalanced
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-red-50 border-red-200 text-red-700",
        )}
      >
        {statement.isBalanced
          ? `${netLabel}: ₹ ${formatMoney(Math.abs(statement.netProfit))} — Total ₹ ${formatMoney(expenses.grandTotal)} on both sides (Expenses Dr = Income Cr)`
          : `P&L is not balanced — Difference ₹ ${formatMoney(Math.abs(statement.totalIncome - statement.totalExpenses))}`}
      </div>
    </div>
  );
}
