"use client";

import React from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { isStructuralNode } from "@/lib/accounts/coa-hierarchy";
import type { ChartOfAccount } from "../../../data";
import { canAddLedgerUnder } from "../chart-of-accounts-data";
import type { CoaListingRow } from "../coa-listing-data";
import { CoaAddLedgerHoverAction } from "./CoaAddLedgerHoverAction";

interface CoaListingTableProps {
  rows: CoaListingRow[];
  records: ChartOfAccount[];
  canCreate: boolean;
  highlightedLedgerId?: number | null;
  isSearchMode?: boolean;
  onDrillInto: (node: ChartOfAccount) => void;
  onAddLedger: (parentGroupId: number) => void;
  emptyMessage?: string;
}

export function CoaListingTable({
  rows,
  records,
  canCreate,
  highlightedLedgerId = null,
  isSearchMode = false,
  onDrillInto,
  onAddLedger,
  emptyMessage = "No accounts at this level.",
}: CoaListingTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-4">
        <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
        {!isSearchMode && (
          <p className="text-xs text-muted-foreground mt-1">
            Select a group in the sidebar or clear search to browse accounts.
          </p>
        )}
      </div>
    );
  }

  return (
    <AccountsTableScroll>
      <AccountsTable minWidth={isSearchMode ? 1080 : 860}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <AccountsTableHeadCell className="w-28">Ledger Code</AccountsTableHeadCell>
            <AccountsTableHeadCell className="min-w-[200px]">Ledger Name</AccountsTableHeadCell>
            {isSearchMode && (
              <>
                <AccountsTableHeadCell className="min-w-[160px]">Parent Group</AccountsTableHeadCell>
                <AccountsTableHeadCell className="min-w-[220px]">Hierarchy Path</AccountsTableHeadCell>
              </>
            )}
            <AccountsTableHeadCell align="right" className="w-36">
              Opening Balance
            </AccountsTableHeadCell>
            <AccountsTableHeadCell align="right" className="w-28">
              Debit
            </AccountsTableHeadCell>
            <AccountsTableHeadCell align="right" className="w-28">
              Credit
            </AccountsTableHeadCell>
            <AccountsTableHeadCell align="right" className="w-36">
              Closing Balance
            </AccountsTableHeadCell>
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {rows.map((row) => {
            const { node } = row;
            const isLedger = node.nodeLevel === "ledger";
            const isSystemLocked = node.isSystem && isStructuralNode(node);
            const allowAdd = canCreate && canAddLedgerUnder(node, records);
            const drillable = row.hasChildren;
            const isHighlighted = highlightedLedgerId === node.id;

            return (
              <AccountsTableRow
                key={node.id}
                className={cn(
                  "group",
                  drillable && "cursor-pointer",
                  isHighlighted && "bg-brand-50/80 ring-1 ring-inset ring-brand-300/70",
                )}
                onClick={() => drillable && onDrillInto(node)}
              >
                <AccountsTableCell className="font-mono text-xs font-semibold text-brand-700 whitespace-nowrap">
                  {node.accountCode}
                </AccountsTableCell>
                <AccountsTableCell wrap className="min-w-[200px]">
                  <div className="flex items-start gap-1 min-w-0">
                    <p
                      className={cn(
                        "flex-1 min-w-0 text-xs leading-snug",
                        node.nodeLevel === "primary_head"
                          ? "font-bold text-navy-700"
                          : isLedger
                            ? "font-semibold text-foreground"
                            : "font-semibold text-foreground/90",
                        drillable && "group-hover:text-brand-700",
                      )}
                    >
                      {node.accountName}
                      {isSystemLocked && (
                        <Lock className="inline w-3 h-3 ml-1 text-muted-foreground/60" />
                      )}
                    </p>
                    {allowAdd && (
                      <CoaAddLedgerHoverAction
                        onClick={() => onAddLedger(node.id)}
                        className="mt-0.5"
                      />
                    )}
                  </div>
                </AccountsTableCell>
                {isSearchMode && (
                  <>
                    <AccountsTableCell wrap className="text-xs text-foreground/90">
                      {row.parentGroupName || "—"}
                    </AccountsTableCell>
                    <AccountsTableCell wrap className="text-[11px] text-muted-foreground leading-snug">
                      {row.hierarchyPath}
                    </AccountsTableCell>
                  </>
                )}
                <AccountsTableCell align="right">
                  {row.openingAmount > 0 ? (
                    <MoneyAmount amount={row.openingAmount} side={row.openingSide} className="text-xs" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="text-xs">
                  {formatMoney(row.periodDebit)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="text-xs">
                  {formatMoney(row.periodCredit)}
                </AccountsTableCell>
                <AccountsTableCell align="right">
                  {row.closingAmount > 0 ? (
                    <MoneyAmount
                      amount={row.closingAmount}
                      side={row.closingSide}
                      className="text-xs font-medium"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </AccountsTableCell>
              </AccountsTableRow>
            );
          })}
        </AccountsTableBody>
      </AccountsTable>
    </AccountsTableScroll>
  );
}
