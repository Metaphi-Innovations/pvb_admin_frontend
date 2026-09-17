"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-href";
import type { GeneralLedgerGroupChild } from "@/types/general-ledger.types";
import { formatApiMoneyOrDash } from "./general-ledger-api-view";

export function GeneralLedgerGroupDrillDownView({
  groupName,
  parentGroup,
  children,
  dateFrom,
  dateTo,
  source,
  fyId,
  branch,
  warehouse,
  onSelectLedger,
  onSelectGroup,
}: {
  groupName: string;
  parentGroup?: string;
  children: GeneralLedgerGroupChild[];
  dateFrom: string;
  dateTo: string;
  source?: string;
  fyId?: string;
  branch?: string;
  warehouse?: string;
  onSelectLedger: (ledgerId: string) => void;
  onSelectGroup: (groupId: string) => void;
}) {
  const linkParams = {
    fromDate: dateFrom,
    toDate: dateTo,
    source,
    financialYearId: fyId,
    branch,
    warehouse,
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 px-3 py-2 border-b border-border/60 bg-brand-50/30">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Account Group Drill-down
        </p>
        <h2 className="text-sm font-bold text-navy-700 mt-0.5">{groupName}</h2>
        {parentGroup ? (
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{parentGroup}</p>
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
            {children.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={7} className="accounts-table-empty py-10">
                  No child groups or ledgers under this account group.
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              children.map((row) => {
                const isGroup = row.node_type === "GROUP";
                const href = isGroup
                  ? buildGeneralLedgerHref({ groupId: row.id, ...linkParams })
                  : buildGeneralLedgerHref({ ledgerId: row.id, ...linkParams });

                return (
                  <AccountsTableRow
                    key={row.id}
                    className="group cursor-pointer hover:bg-muted/20"
                    onClick={() => {
                      if (isGroup) onSelectGroup(row.id);
                      else onSelectLedger(row.id);
                    }}
                  >
                    <AccountsTableCell className="font-medium max-w-[220px] truncate" title={row.name}>
                      {row.code ? (
                        <span className="font-mono text-[11px] text-muted-foreground mr-1.5">
                          {row.code}
                        </span>
                      ) : null}
                      {row.name}
                    </AccountsTableCell>
                    <AccountsTableCell className="text-muted-foreground whitespace-nowrap">
                      {isGroup ? "Group" : "Ledger"}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money>
                      {formatApiMoneyOrDash(row.debit)}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money>
                      {formatApiMoneyOrDash(row.credit)}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money>
                      {formatApiMoneyOrDash(row.closing_debit)}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money>
                      {formatApiMoneyOrDash(row.closing_credit)}
                    </AccountsTableCell>
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
