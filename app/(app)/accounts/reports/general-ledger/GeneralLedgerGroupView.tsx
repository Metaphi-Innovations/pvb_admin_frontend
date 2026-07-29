"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-data";
import { formatMoneyOrDash } from "@/lib/accounts/money-format";
import type { GeneralLedgerFilters, GeneralLedgerGroupDrillDown } from "@/lib/accounts/general-ledger-types";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { balanceSideAbbrev } from "@/app/(app)/accounts/reports/trial-balance/trial-balance-display";

export function GeneralLedgerGroupView({
  drillDown,
  filters,
  source,
}: {
  drillDown: GeneralLedgerGroupDrillDown;
  filters: GeneralLedgerFilters;
  source?: string;
}) {
  const router = useRouter();

  const openChild = (child: GeneralLedgerGroupDrillDown["children"][number]) => {
    if (child.nodeLevel === "ledger") {
      router.push(
        buildGeneralLedgerHref({
          ledgerId: child.id,
          fromDate: filters.dateFrom,
          toDate: filters.dateTo,
          source,
          groupId: drillDown.groupId,
          groupName: drillDown.groupName,
          financialYearId: filters.financialYearId,
        }),
      );
      return;
    }
    router.push(
      buildGeneralLedgerHref({
        groupId: child.id,
        fromDate: filters.dateFrom,
        toDate: filters.dateTo,
        source,
        groupName: child.name,
        financialYearId: filters.financialYearId,
      }),
    );
  };

  return (
    <AccountsTableScroll className="flex-1 min-h-0 h-full">
      <AccountsTable minWidth={900} className="text-xs">
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <th className="accounts-table-th text-left">Particular</th>
            <th className="accounts-table-th text-right">Opening Dr</th>
            <th className="accounts-table-th text-right">Opening Cr</th>
            <th className="accounts-table-th text-right">Debit</th>
            <th className="accounts-table-th text-right">Credit</th>
            <th className="accounts-table-th text-right">Closing Dr</th>
            <th className="accounts-table-th text-right">Closing Cr</th>
            <th className="accounts-table-th text-center w-12">Dr/Cr</th>
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {drillDown.children.map((child) => (
            <AccountsTableRow
              key={`${child.nodeLevel}-${child.id}`}
              className="cursor-pointer hover:bg-muted/20"
              onClick={() => openChild(child)}
            >
              <AccountsTableCell className="font-medium">
                {child.nodeLevel === "account_group" ? (
                  <span className="text-brand-700">{child.name}</span>
                ) : (
                  <Link
                    href={buildGeneralLedgerHref({
                      ledgerId: child.id,
                      fromDate: filters.dateFrom,
                      toDate: filters.dateTo,
                      source,
                      groupId: drillDown.groupId,
                    })}
                    className="text-brand-700 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {child.name}
                  </Link>
                )}
                <span className="block text-[10px] text-muted-foreground font-mono">{child.code}</span>
              </AccountsTableCell>
              <AccountsTableCell align="right" money>
                {formatMoneyOrDash(child.openingDebit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money>
                {formatMoneyOrDash(child.openingCredit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money>
                {formatMoneyOrDash(child.debit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money>
                {formatMoneyOrDash(child.credit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money>
                {formatMoneyOrDash(child.closingDebit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money>
                {formatMoneyOrDash(child.closingCredit)}
              </AccountsTableCell>
              <AccountsTableCell align="center" className="text-xs font-semibold">
                {balanceSideAbbrev(child.closingBalanceType)}
              </AccountsTableCell>
            </AccountsTableRow>
          ))}
        </AccountsTableBody>
        <AccountsTableFoot>
          <AccountsTableRow className="bg-muted/20 font-semibold">
            <AccountsTableCell>Total — {drillDown.groupName}</AccountsTableCell>
            <AccountsTableCell align="right" money>
              {formatMoneyOrDash(drillDown.totals.openingDebit)}
            </AccountsTableCell>
            <AccountsTableCell align="right" money>
              {formatMoneyOrDash(drillDown.totals.openingCredit)}
            </AccountsTableCell>
            <AccountsTableCell align="right" money>
              {formatMoneyOrDash(drillDown.totals.debit)}
            </AccountsTableCell>
            <AccountsTableCell align="right" money>
              {formatMoneyOrDash(drillDown.totals.credit)}
            </AccountsTableCell>
            <AccountsTableCell align="right" money>
              {formatMoneyOrDash(drillDown.totals.closingDebit)}
            </AccountsTableCell>
            <AccountsTableCell align="right" money>
              {formatMoneyOrDash(drillDown.totals.closingCredit)}
            </AccountsTableCell>
            <AccountsTableCell />
          </AccountsTableRow>
        </AccountsTableFoot>
      </AccountsTable>
    </AccountsTableScroll>
  );
}
