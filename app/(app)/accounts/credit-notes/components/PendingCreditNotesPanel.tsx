"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, SlidersHorizontal, X } from "lucide-react";
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
import {
  AccountsListingFilterCard,
  AccountsListingTableCard,
  AccountsTableEmpty,
} from "@/components/accounts/AccountsTableListing";
import { accountsActionColClass } from "@/components/accounts/AccountsTableActions";
import { ReportSearchFilter } from "@/components/accounts/ReportFilters";
import { cn } from "@/lib/utils";
import {
  filterPendingCreditNotes,
  listPendingCreditNotes,
  PENDING_CREDIT_SOURCE_LABELS,
  PENDING_SOURCE_FILTER_OPTIONS,
  type PendingCreditNoteRow,
  type PendingCreditNoteSourceType,
} from "../pending-credit-notes-data";
import { CREDIT_NOTES_LIST_PATH, formatINR } from "../note-utils";

const SOURCE_BADGE_CLASS: Partial<Record<PendingCreditNoteSourceType, string>> = {
  sales_return: "bg-brand-50 text-brand-700",
  cash_discount: "bg-sky-50 text-sky-700",
  near_expiry: "bg-amber-50 text-amber-700",
  festive_scheme: "bg-purple-50 text-purple-700",
  payment_discount: "bg-navy-50 text-navy-700",
  turnover_discount: "bg-leaf-50 text-leaf-700",
};

const SOURCE_DOT_CLASS: Partial<Record<PendingCreditNoteSourceType, string>> = {
  sales_return: "bg-brand-500",
  cash_discount: "bg-sky-500",
  near_expiry: "bg-amber-400",
  festive_scheme: "bg-purple-500",
  payment_discount: "bg-navy-500",
  turnover_discount: "bg-leaf-600",
};

export function PendingCreditNotesPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<PendingCreditNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const refresh = useCallback(() => {
    setLoading(true);
    const load = () => {
      setRows(listPendingCreditNotes());
      setLoading(false);
    };
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(load, { timeout: 800 });
    } else {
      load();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (cancelled) return;
      setRows(listPendingCreditNotes());
      setLoading(false);
    };

    if (typeof requestIdleCallback === "function") {
      const idleId = requestIdleCallback(load, { timeout: 800 });
      return () => {
        cancelled = true;
        cancelIdleCallback(idleId);
      };
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const visible = useMemo(
    () => filterPendingCreditNotes(rows, search, sourceFilter),
    [rows, search, sourceFilter],
  );

  const activeSourceCount = sourceFilter !== "all" ? 1 : 0;

  const toggleSourceFilter = (value: PendingCreditNoteSourceType) => {
    setSourceFilter((cur) => (cur === value ? "all" : value));
  };

  const handleGenerate = (row: PendingCreditNoteRow) => {
    if (row.sourceType === "sales_return" && row.returnId) {
      router.push(`${CREDIT_NOTES_LIST_PATH}/new?returnId=${encodeURIComponent(row.returnId)}&mode=return`);
      return;
    }
    if (row.schemeSettlementKey) {
      router.push(
        `${CREDIT_NOTES_LIST_PATH}/new?schemeKey=${encodeURIComponent(row.schemeSettlementKey)}&mode=scheme`,
      );
    }
  };

  return (
    <div className="accounts-listing-card flex flex-col flex-1 min-h-0">
      <AccountsListingFilterCard>
        <ReportSearchFilter
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search reference, customer, invoice, scheme…"
          className="min-w-[180px] flex-1 max-w-sm"
        />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                activeSourceCount > 0
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Source
              {activeSourceCount > 0 && (
                <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                  {activeSourceCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-0">
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-xs font-semibold text-foreground">Filter by Source</p>
            </div>
            <div className="px-3 py-2.5 space-y-2 max-h-56 overflow-y-auto">
              {PENDING_SOURCE_FILTER_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-brand-600"
                    checked={sourceFilter === opt.value}
                    onChange={() => toggleSourceFilter(opt.value)}
                  />
                  <span className="text-xs text-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
            {sourceFilter !== "all" && (
              <div className="px-3 py-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSourceFilter("all")}
                  className="text-xs text-brand-600 hover:underline"
                >
                  Clear filter
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        {sourceFilter !== "all" && (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
            {PENDING_CREDIT_SOURCE_LABELS[sourceFilter as PendingCreditNoteSourceType]}
            <button type="button" onClick={() => setSourceFilter("all")}>
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </AccountsListingFilterCard>

      <AccountsListingTableCard>
        <AccountsTableScroll>
          <AccountsTable className="table-fixed w-full">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[11%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[9%]" />
              <col className="w-[14%]" />
            </colgroup>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <AccountsTableHeadCell uppercase>Source Type</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase>Reference No.</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase className="accounts-col-party">Customer</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase>Linked Invoice(s)</AccountsTableHeadCell>
                <AccountsTableHeadCell align="right" uppercase>Eligible CN Amount</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase>Status</AccountsTableHeadCell>
                <AccountsTableHeadCell align="right" uppercase className={accountsActionColClass("multi")}>
                  Action
                </AccountsTableHeadCell>
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {loading ? (
                <AccountsTableEmpty colSpan={7} message="Loading pending credit notes…" />
              ) : visible.length === 0 ? (
                <AccountsTableEmpty
                  colSpan={7}
                  message="No pending credit notes. Approved sales returns and scheme settlements appear here until an Accounts user generates a credit note."
                />
              ) : (
                visible.map((row) => (
                  <AccountsTableRow key={row.id}>
                    <AccountsTableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap",
                          SOURCE_BADGE_CLASS[row.sourceType] ?? "bg-muted text-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "w-1 h-1 rounded-full flex-shrink-0",
                            SOURCE_DOT_CLASS[row.sourceType] ?? "bg-slate-400",
                          )}
                        />
                        {PENDING_CREDIT_SOURCE_LABELS[row.sourceType]}
                      </span>
                    </AccountsTableCell>
                    <AccountsTableCell mono className="font-semibold text-brand-700 truncate">
                      {row.referenceNo}
                    </AccountsTableCell>
                    <AccountsTableCell className="accounts-col-party font-medium truncate" title={row.customerName}>
                      {row.customerName}
                    </AccountsTableCell>
                    <AccountsTableCell mono className="truncate text-[11px]">
                      {row.linkedInvoiceNos.length ? row.linkedInvoiceNos.join(", ") : "—"}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className="tabular-nums font-medium">
                      {formatINR(row.totalAmount)}
                    </AccountsTableCell>
                    <AccountsTableCell>
                      <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 whitespace-nowrap">
                        <span className="w-1 h-1 rounded-full flex-shrink-0 bg-amber-400" />
                        Pending
                      </span>
                    </AccountsTableCell>
                    <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                      <Button
                        size="sm"
                        className="h-7 px-2 text-[11px] bg-brand-600 hover:bg-brand-700 text-white gap-1 whitespace-nowrap"
                        onClick={() => handleGenerate(row)}
                      >
                        <Plus className="w-3 h-3" /> Generate Credit Note
                      </Button>
                    </AccountsTableCell>
                  </AccountsTableRow>
                ))
              )}
            </AccountsTableBody>
          </AccountsTable>
        </AccountsTableScroll>
      </AccountsListingTableCard>
    </div>
  );
}
