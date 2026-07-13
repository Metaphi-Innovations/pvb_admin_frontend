"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MoneyCell } from "@/components/accounts/MoneyAmount";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-data";
import type { GeneralLedgerGroupDrillDown } from "./general-ledger-data";

export function GeneralLedgerGroupDrillDownView({
  drillDown,
  dateFrom,
  dateTo,
  source,
  fyId,
  onSelectLedger,
}: {
  drillDown: GeneralLedgerGroupDrillDown;
  dateFrom: string;
  dateTo: string;
  source?: string;
  fyId?: string;
  onSelectLedger: (ledgerId: string) => void;
}) {
  const linkParams = {
    fromDate: dateFrom,
    toDate: dateTo,
    source,
    financialYearId: fyId,
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 px-3 py-2 border-b border-border/60 bg-brand-50/30">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Account Group Drill-down
        </p>
        <h2 className="text-sm font-bold text-navy-700 mt-0.5">{drillDown.groupName}</h2>
        {drillDown.parentGroup ? (
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{drillDown.parentGroup}</p>
        ) : null}
      </div>
      <AccountsTableScroll className="flex-1 min-h-0">
        <AccountsTable minWidth={920} className="text-xs">
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">Name</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">Type</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-foreground whitespace-nowrap">Debit</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-foreground whitespace-nowrap">Credit</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-foreground whitespace-nowrap">Closing (Dr)</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-foreground whitespace-nowrap">Closing (Cr)</th>
              <th className="w-10" />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {drillDown.children.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={7} className="accounts-table-empty py-10">
                  No child groups or ledgers under this account group.
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              drillDown.children.map((row) => {
                const isGroup = row.nodeLevel === "account_group";
                const href = isGroup
                  ? buildGeneralLedgerHref({ groupId: row.id, ...linkParams })
                  : buildGeneralLedgerHref({ ledgerId: row.id, ...linkParams });

                return (
                  <AccountsTableRow
                    key={row.id}
                    className="group cursor-pointer hover:bg-muted/20"
                    onClick={() => {
                      if (isGroup) {
                        window.location.href = href;
                      } else {
                        onSelectLedger(String(row.id));
                      }
                    }}
                  >
                    <AccountsTableCell className="font-medium max-w-[220px] truncate" title={row.name}>
                      {row.name}
                    </AccountsTableCell>
                    <AccountsTableCell className="text-muted-foreground whitespace-nowrap">
                      {isGroup ? "Group" : "Ledger"}
                    </AccountsTableCell>
                    <MoneyCell amount={row.debit} dashIfZero className="accounts-table-td" />
                    <MoneyCell amount={row.credit} dashIfZero className="accounts-table-td" />
                    <MoneyCell amount={row.closingDebit} dashIfZero className="accounts-table-td" />
                    <MoneyCell amount={row.closingCredit} dashIfZero className="accounts-table-td" />
                    <AccountsTableCell align="right" className="w-10">
                      <Link
                        href={href}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Open ${row.name}`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </AccountsTableCell>
                  </AccountsTableRow>
                );
              })
            )}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableScroll>
    </div>
  );
}
