"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import {
  buildBalanceSheetLedgerHref,
  buildBalanceSheetPartyHref,
  collectBalanceSheetGroupIds,
  isBalanceSheetGroupHeading,
  splitBalanceSheetHorizontal,
  type BalanceSheetDrillDownFilters,
  type BalanceSheetSide,
  type BalanceSheetStatement,
  type BalanceSheetTreeNode,
  type BalanceSheetViewType,
} from "./balance-sheet-data";

const CHEVRON_COL_PX = 20;
const DEPTH_INDENT_PX = 16;
const BASE_INDENT_PX = 8;

function formatBsAmount(amount: number | null): string {
  if (amount == null) return "—";
  return formatMoney(amount);
}

function indentPx(depth: number): number {
  return BASE_INDENT_PX + depth * DEPTH_INDENT_PX;
}

function SideTableHeader({ side }: { side: BalanceSheetSide }) {
  return (
    <thead className="sticky top-0 z-20 bg-[#FFF3E6] shadow-[0_1px_0_0_#E5E7EB]">
      <tr>
        <th className="px-3 py-2 text-left text-xs font-bold text-navy-700 align-middle">
          {side.sectionTitle}
        </th>
        <th className="px-3 py-2 text-right text-xs font-bold text-navy-700 w-32 align-middle whitespace-nowrap">
          {side.amountColumnLabel}
        </th>
      </tr>
    </thead>
  );
}

function SideGrandTotalRow({ side }: { side: BalanceSheetSide }) {
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
          "px-3 py-2.5 text-right text-xs font-bold tabular-nums w-32 align-middle",
          MONEY_AMOUNT_CLASS,
          "text-brand-800",
        )}
      >
        {formatBsAmount(side.grandTotal)}
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
  node: BalanceSheetTreeNode;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  drillDownFilters: BalanceSheetDrillDownFilters;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.item.id);
  const isGroupHeading = isBalanceSheetGroupHeading(node.item);
  const isLedger = Boolean(node.item.ledgerId);
  const isPartyLedger = Boolean(node.item.partyId && node.item.partyKind);
  const rowIndent = indentPx(node.depth);

  const labelClass = cn(
    "text-xs truncate min-w-0",
    isGroupHeading ? "font-bold text-foreground" : "font-normal text-foreground/90",
    (isLedger || isPartyLedger) && !node.item.isPlBalance && "text-brand-700 hover:text-brand-800 hover:underline cursor-pointer",
    node.item.isPlBalance && "font-semibold text-emerald-800",
  );

  let labelContent: ReactNode;
  if (isLedger && node.item.ledgerId) {
    labelContent = (
      <Link
        href={buildBalanceSheetLedgerHref(node.item.ledgerId, drillDownFilters)}
        className={labelClass}
        title={`View ${node.item.particular} ledger`}
      >
        {node.item.particular}
      </Link>
    );
  } else if (isPartyLedger && node.item.partyId && node.item.partyKind) {
    labelContent = (
      <Link
        href={buildBalanceSheetPartyHref(node.item.partyId, node.item.partyKind)}
        className={labelClass}
        title={`View ${node.item.particular} outstanding`}
      >
        {node.item.particular}
      </Link>
    );
  } else {
    labelContent = (
      <span className={labelClass} title={node.item.particular}>
        {node.item.particular}
      </span>
    );
  }

  return (
    <>
      <tr
        className={cn(
          "border-b border-border/60 transition-colors",
          isGroupHeading ? "bg-muted/10 hover:bg-muted/20" : "hover:bg-muted/10",
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
            "px-3 py-1.5 text-right text-xs tabular-nums whitespace-nowrap w-32 align-middle",
            isGroupHeading ? cn("font-bold", MONEY_AMOUNT_CLASS) : MONEY_AMOUNT_CLASS,
            node.item.isPlBalance && "font-semibold text-emerald-700",
          )}
        >
          {formatBsAmount(node.item.amount)}
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
  side: BalanceSheetSide;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  drillDownFilters: BalanceSheetDrillDownFilters;
}) {
  const hasRows = side.tree.length > 0;

  return (
    <table className="w-full border-collapse table-fixed">
      <colgroup>
        <col />
        <col className="w-32" />
      </colgroup>
      <SideTableHeader side={side} />
      <tbody>
        {hasRows ? (
          side.tree.map((node) => (
            <SideTreeRows
              key={node.item.id}
              node={node}
              expandedIds={expandedIds}
              onToggle={onToggle}
              drillDownFilters={drillDownFilters}
            />
          ))
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

export function BalanceSheetHorizontalView({
  statement,
  drillDownFilters,
  viewType,
}: {
  statement: BalanceSheetStatement;
  drillDownFilters: BalanceSheetDrillDownFilters;
  viewType: BalanceSheetViewType;
}) {
  const { liabilities, assets } = useMemo(
    () => splitBalanceSheetHorizontal(statement),
    [statement],
  );

  const defaultExpanded = useMemo(
    () =>
      viewType === "detailed"
        ? new Set([
            ...collectBalanceSheetGroupIds(liabilities.tree),
            ...collectBalanceSheetGroupIds(assets.tree),
          ])
        : new Set<string>(),
    [liabilities.tree, assets.tree, viewType],
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

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full w-full">
      <div className="flex-shrink-0 px-4 py-2.5 border-b border-border bg-white">
        <h2 className="text-base font-bold text-navy-700 text-center tracking-tight">Balance Sheet</h2>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-auto overscroll-contain border border-border border-t-0 bg-white"
        role="region"
        aria-label="Balance Sheet accounts"
      >
        <div className="flex flex-col lg:flex-row lg:items-start min-w-[720px]">
          <div className="flex-1 min-w-0 lg:border-r border-border">
            <SideTable
              side={liabilities}
              expandedIds={expandedIds}
              onToggle={toggle}
              drillDownFilters={drillDownFilters}
            />
          </div>
          <div className="flex-1 min-w-0 border-t lg:border-t-0 border-border">
            <SideTable
              side={assets}
              expandedIds={expandedIds}
              onToggle={toggle}
              drillDownFilters={drillDownFilters}
            />
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 flex flex-col lg:flex-row border border-t-0 border-border overflow-hidden shadow-sm bg-white min-w-[720px]">
        <div className="flex-1 min-w-0 lg:border-r border-border">
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col />
              <col className="w-32" />
            </colgroup>
            <tbody>
              <SideGrandTotalRow side={liabilities} />
            </tbody>
          </table>
        </div>
        <div className="flex-1 min-w-0 border-t lg:border-t-0 border-border">
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col />
              <col className="w-32" />
            </colgroup>
            <tbody>
              <SideGrandTotalRow side={assets} />
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
          ? `Balance Sheet is balanced — Total ₹ ${formatMoney(statement.totalAssets)} (Liabilities Cr = Assets Dr)`
          : `Balance Sheet is not balanced — Difference ₹ ${formatMoney(Math.abs(statement.difference))}`}
        {statement.unpostedVoucherCount > 0 && (
          <span className="block mt-1 text-[11px] font-medium text-amber-700">
            {statement.unpostedVoucherCount} unposted voucher
            {statement.unpostedVoucherCount === 1 ? "" : "s"} found as on this date — balances may change after posting.
          </span>
        )}
        {Math.abs(statement.netProfit) > 0 && (
          <span className="block mt-1 text-[11px] font-medium text-muted-foreground">
            Current period {statement.netProfit >= 0 ? "Net Profit" : "Net Loss"}: ₹{" "}
            {formatMoney(Math.abs(statement.netProfit))} included under Liabilities
          </span>
        )}
      </div>
    </div>
  );
}
