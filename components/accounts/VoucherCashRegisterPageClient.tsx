"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
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
import { AccountsTableEmpty, AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import {
  ReportDateRangeFilter,
  ReportFilterRow,
  ReportSearchFilter,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import { cn } from "@/lib/utils";
import {
  buildVoucherRegisterRows,
  computeVoucherRegisterSummary,
  filterVoucherRegisterRows,
  formatVoucherRegisterDate,
  voucherRegisterTitle,
  type CashVoucherRegisterType,
  type VoucherRegisterRow,
} from "@/lib/accounts/voucher-register-data";

function VoucherRegisterDetailModal({
  row,
  registerType,
  onClose,
}: {
  row: VoucherRegisterRow | null;
  registerType: CashVoucherRegisterType;
  onClose: () => void;
}) {
  if (!row) return null;

  const typeLabel = voucherRegisterTitle(registerType).replace(" Register", "");

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <span className="font-mono text-brand-700">{row.voucherNo}</span>
            <span className="text-muted-foreground font-normal">— {typeLabel}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2 bg-muted/30 rounded-lg px-3 py-2.5 text-xs">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Date</p>
              <p className="font-medium">{formatVoucherRegisterDate(row.date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Reference</p>
              <p className="font-mono font-medium">{row.referenceNo === "—" ? "—" : row.referenceNo}</p>
            </div>
            {row.paymentMode !== "—" && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Mode</p>
                <p className="font-medium">{row.paymentMode}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Posted By</p>
              <p className="font-medium">{row.createdBy}</p>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] gap-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-border px-3 py-1.5">
              <span>Ledger</span>
              <span className="text-right">Amount (₹)</span>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2.5 border-b border-border/60">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Dr (Debit)</p>
                <p className="text-xs font-medium text-foreground">{row.debitLedger}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold font-mono text-foreground">{formatMoney(row.amount)}</p>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2.5">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Cr (Credit)</p>
                <p className="text-xs font-medium text-foreground">{row.creditLedger}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold font-mono text-foreground">{formatMoney(row.amount)}</p>
              </div>
            </div>
          </div>

          {row.narration && row.narration !== "—" && (
            <div className="bg-muted/20 rounded-lg px-3 py-2.5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Narration</p>
              <p className="text-xs text-foreground leading-relaxed">{row.narration}</p>
            </div>
          )}

          <div className="flex justify-end">
            <Link
              href={row.viewHref}
              className="text-xs text-brand-600 hover:underline font-medium"
            >
              Open full voucher →
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VoucherRegisterTable({
  mounted,
  registerType,
  voucherLabel,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  hasFilters,
  clearFilters,
  onViewRow,
}: {
  mounted: boolean;
  registerType: CashVoucherRegisterType;
  voucherLabel: string;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  hasFilters: boolean;
  clearFilters: () => void;
  onViewRow: (row: VoucherRegisterRow) => void;
}) {
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows<VoucherRegisterRow>([]);
  const summary = useMemo(() => computeVoucherRegisterSummary(visible), [visible]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, page, pageSize]);

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        <AccountsTable minWidth={1080}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <SortTh label="Date" colKey="date" filterType="date" />
              <SortTh label="Voucher No." colKey="voucherNo" />
              <SortTh label="Reference" colKey="referenceNo" />
              <SortTh label="Debit Ledger" colKey="debitLedger" />
              <SortTh label="Credit Ledger" colKey="creditLedger" />
              <AccountsColumnHeader label="Mode" colKey="paymentMode" sortable={false} />
              <AccountsColumnHeader label="Narration" colKey="narration" sortable={false} />
              <SortTh label="Amount" colKey="amount" filterType="amount" align="right" />
              <AccountsColumnHeader
                label="View"
                colKey="_view"
                sortable={false}
                filterable={false}
                align="center"
                className="w-10"
              />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {!mounted ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={9} className="accounts-table-empty">
                  Loading…
                </AccountsTableCell>
              </AccountsTableRow>
            ) : visible.length === 0 ? (
              <AccountsTableEmpty
                colSpan={9}
                message={`No ${voucherLabel} found for the selected period.`}
                onClear={hasFilters ? clearFilters : undefined}
              />
            ) : (
              paginated.map((row) => (
                <AccountsTableRow key={row.id}>
                  <AccountsTableCell className="whitespace-nowrap text-xs">
                    {formatVoucherRegisterDate(row.date)}
                  </AccountsTableCell>
                  <AccountsTableCell mono className="font-semibold text-brand-700 text-xs whitespace-nowrap">
                    {row.voucherNo}
                  </AccountsTableCell>
                  <AccountsTableCell mono className="text-xs text-muted-foreground whitespace-nowrap">
                    {row.referenceNo}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs max-w-[130px] truncate" title={row.debitLedger}>
                    {row.debitLedger}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs max-w-[130px] truncate" title={row.creditLedger}>
                    {row.creditLedger}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {row.paymentMode}
                  </AccountsTableCell>
                  <AccountsTableCell
                    className="text-xs text-muted-foreground max-w-[180px] truncate"
                    title={row.narration}
                  >
                    {row.narration}
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("whitespace-nowrap", MONEY_AMOUNT_CLASS)}
                  >
                    {formatMoney(row.amount)}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-center w-10">
                    <button
                      type="button"
                      onClick={() => onViewRow(row)}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-brand-700 hover:bg-brand-50 transition-colors"
                      aria-label={`View ${row.voucherNo}`}
                      title={`View ${row.voucherNo}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </AccountsTableCell>
                </AccountsTableRow>
              ))
            )}
          </AccountsTableBody>
          {visible.length > 0 && (
            <AccountsTableFoot>
              <AccountsTableRow>
                <AccountsTableCell colSpan={7} className="font-semibold text-xs text-foreground">
                  Total ({summary.count} entries)
                </AccountsTableCell>
                <AccountsTableCell
                  align="right"
                  money
                  className={cn("font-semibold", MONEY_AMOUNT_CLASS)}
                >
                  {formatMoney(summary.totalAmount)}
                </AccountsTableCell>
                <AccountsTableCell />
              </AccountsTableRow>
            </AccountsTableFoot>
          )}
        </AccountsTable>
      </AccountsTableScroll>

      {visible.length > 0 && (
        <div className="border-t border-border bg-muted/20 px-4 py-2 flex-shrink-0">
          <AccountsTablePagination
            page={page}
            pageSize={pageSize}
            totalRecords={visible.length}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            recordLabel={voucherLabel}
          />
        </div>
      )}
    </div>
  );
}

export interface VoucherCashRegisterPageClientProps {
  registerType: CashVoucherRegisterType;
}

export default function VoucherCashRegisterPageClient({
  registerType,
}: VoucherCashRegisterPageClientProps) {
  const mounted = useClientMounted();
  const title = voucherRegisterTitle(registerType);
  const voucherLabel =
    registerType === "receipt"
      ? "receipt vouchers"
      : registerType === "payment"
        ? "payment vouchers"
        : "contra vouchers";

  const [preset, setPreset] = useState<DateRangePresetId>("this_year");
  const initialDates = useMemo(() => resolveDateRangePreset("this_year"), []);
  const [dateFrom, setDateFrom] = useState(initialDates.from);
  const [dateTo, setDateTo] = useState(initialDates.to);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [viewRow, setViewRow] = useState<VoucherRegisterRow | null>(null);

  const handlePresetChange = useCallback((newPreset: DateRangePresetId) => {
    setPreset(newPreset);
    if (newPreset !== "custom") {
      const { from, to } = resolveDateRangePreset(newPreset);
      setDateFrom(from);
      setDateTo(to);
    }
  }, []);

  const sourceRows = useMemo(
    () => (mounted ? buildVoucherRegisterRows(registerType) : []),
    [mounted, registerType],
  );

  const toolbarFiltered = useMemo(
    () =>
      filterVoucherRegisterRows(sourceRows, {
        dateFrom,
        dateTo,
        ledgerSearch,
        search,
      }),
    [sourceRows, dateFrom, dateTo, ledgerSearch, search],
  );

  const getCellValue = useCallback(
    (row: VoucherRegisterRow, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  const hasFilters = Boolean(search.trim()) || Boolean(ledgerSearch.trim());

  const clearFilters = useCallback(() => {
    setSearch("");
    setLedgerSearch("");
    setPage(1);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, ledgerSearch, search, pageSize, registerType]);

  return (
    <>
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Reports", title)}
        title={title}
        description={`Posted ${voucherLabel} from the Accounts voucher store — single source of truth for GL, bank/cash books, and outstanding updates.`}
        filters={
          <ReportFilterRow className="items-end">
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={handlePresetChange}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />

            <div className="space-y-1 min-w-[180px]">
              <Label className={filterLabelClass}>Ledger</Label>
              <div className="relative">
                <Input
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Search ledger name…"
                  className={cn(filterControlClass, "mt-0 pr-7")}
                />
                {ledgerSearch && (
                  <button
                    type="button"
                    onClick={() => setLedgerSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear ledger search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Voucher no., reference, narration…"
            />
          </ReportFilterRow>
        }
        layout="split"
        className="h-full min-h-0"
      >
        <AccountsColumnFilterProvider
          rows={toolbarFiltered}
          getCellValue={getCellValue}
          columnConfig={{
            date: { type: "date" },
            voucherNo: { type: "text" },
            referenceNo: { type: "text" },
            debitLedger: { type: "text" },
            creditLedger: { type: "text" },
            paymentMode: { type: "text" },
            narration: { type: "text" },
            amount: { type: "amount" },
          }}
          defaultSortKey="date"
          defaultSortDir="asc"
        >
          <VoucherRegisterTable
            mounted={mounted}
            registerType={registerType}
            voucherLabel={voucherLabel}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            hasFilters={hasFilters}
            clearFilters={clearFilters}
            onViewRow={setViewRow}
          />
        </AccountsColumnFilterProvider>
      </AccountsPageShell>

      <VoucherRegisterDetailModal
        row={viewRow}
        registerType={registerType}
        onClose={() => setViewRow(null)}
      />
    </>
  );
}
