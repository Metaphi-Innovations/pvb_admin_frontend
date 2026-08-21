"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  AccountsEditAction,
  AccountsMoreActions,
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { FileText, XCircle } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsTablePagination,
  AccountsListingFilterCard,
} from "@/components/accounts/AccountsTableListing";
import { useReportDateRange } from "@/components/accounts/ReportFilters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { noteWorkflowStatusToBadge } from "@/lib/accounts/accounts-status-badges";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { useClientMounted } from "@/lib/use-client-mounted";
import {
  SectionTabs,
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
} from "../../components/AccountsUI";
import {
  NotesListingFilterBar,
  NotesListHeaderActions,
  NOTES_MODULE_TABS,
  NOTES_STATUS_FILTER_OPTIONS,
  NOTES_STATUS_TABS,
  type NotesListingFilterState,
  resetNotesListingFilters,
  uniqueOptionsFromValues,
} from "../../components/notes-listing-shared";
import type { ReportMultiSelectOption } from "@/lib/accounts/report-multi-filter-utils";
import { DebitNoteCancelDialog } from "../../debit-notes/components/DebitNoteCancelDialog";
import { PendingDebitNotesPanel } from "../../debit-notes/components/PendingDebitNotesPanel";
import { DEBIT_NOTE_SOURCE_LABELS, type DebitNoteRecord } from "../../debit-notes/debit-notes-data";
import { DEBIT_NOTES_LIST_PATH, formatINR } from "../../debit-notes/note-utils";
import {
  hasDocumentsListingFilters,
  parseDocumentsListingFiltersFromSearch,
} from "@/lib/accounts/documents-listing-filter-query";
import { DebitNoteService } from "@/services/debit-note.service";
import { SupplierService, type SupplierDropdownItem } from "@/services/supplier.service";
import { WarehouseService, type WarehouseDropdownItem } from "@/services/warehouse.service";
import { showToast } from "@/lib/toast";
import { usePermissions } from "@/lib/auth/permissions-context";
import { canCreate, canEdit } from "@/lib/auth/permissions";

const LIST_PATH = DEBIT_NOTES_LIST_PATH;

function getRowActions(status: string, approvalRequired: boolean): string[] {
  const s = status.toUpperCase();
  if (s === "DRAFT") {
    return approvalRequired
      ? ["edit", "submit", "cancel", "eway_bill"]
      : ["edit", "post", "cancel", "eway_bill"];
  }
  if (s === "PENDING_APPROVAL") {
    return approvalRequired
      ? ["view", "approve", "reject", "cancel", "eway_bill"]
      : ["view", "cancel", "eway_bill"];
  }
  if (s === "APPROVED") {
    return ["view", "post", "cancel", "eway_bill"];
  }
  if (s === "REJECTED") {
    return approvalRequired
      ? ["view", "edit", "submit", "cancel", "eway_bill"]
      : ["view", "edit", "post", "cancel", "eway_bill"];
  }
  if (s === "POSTED") {
    return ["view", "reverse"];
  }
  return ["view"];
}

function DebitNotesRecordsTable({
  mounted,
  toolbarFiltered,
  page,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  onCancel,
  onRefresh,
  approvalRequired,
  hasCreatePermission,
  hasUpdatePermission,
}: {
  mounted: boolean;
  toolbarFiltered: DebitNoteRecord[];
  page: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onCancel: (r: DebitNoteRecord) => void;
  onRefresh: () => void;
  approvalRequired: boolean;
  hasCreatePermission: boolean;
  hasUpdatePermission: boolean;
}) {
  const visible = toolbarFiltered;
  const pagedRows = toolbarFiltered;

  return (
    <>
      <AccountsTable minWidth={1180}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="DN No." colKey="debitNoteNo" />
            <SortTh label="Source" colKey="source" />
            <SortTh label="Against PI" colKey="sourceInvoiceNo" />
            <SortTh label="Supplier" colKey="vendorName" className="accounts-col-party" />
            <SortTh label="Warehouse" colKey="branch" />
            <SortTh label="Date" colKey="debitNoteDate" filterType="date" />
            <SortTh label="Taxable" colKey="taxableAmount" filterType="amount" align="right" />
            <SortTh label="CGST" colKey="cgstAmount" filterType="amount" align="right" />
            <SortTh label="SGST" colKey="sgstAmount" filterType="amount" align="right" />
            <SortTh label="IGST" colKey="igstAmount" filterType="amount" align="right" />
            <SortTh label="Total" colKey="currentDebitAmount" filterType="amount" align="right" />
            <SortTh label="Status" colKey="status" />
            <AccountsColumnHeader
              label="Actions"
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="right"
              className={accountsActionColClass("multi")}
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {!mounted ? (
            <AccountsTableEmpty colSpan={13} message="Loading debit notes…" />
          ) : toolbarFiltered.length === 0 ? (
            <AccountsTableEmpty colSpan={13} message="No debit notes found." />
          ) : (
            pagedRows.map((r) => {
              const badge = noteWorkflowStatusToBadge(r.status);
              const actions = getRowActions(r.status, approvalRequired);
              const canEditRow = actions.includes("edit") && hasUpdatePermission;
              const canPostRow = actions.includes("post") && hasCreatePermission;
              const canCancelRow = actions.includes("cancel") && hasCreatePermission;

              return (
                <AccountsTableRow key={r.id}>
                  <AccountsTableCell mono>
                    <Link
                      href={`${LIST_PATH}/${r.id}`}
                      className="hover:underline font-mono text-xs font-semibold text-brand-700"
                    >
                      {r.debitNoteNo}
                    </Link>
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs">
                    {DEBIT_NOTE_SOURCE_LABELS[r.source]}
                  </AccountsTableCell>
                  <AccountsTableCell mono className="truncate text-xs">
                    {r.sourceInvoiceNo || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell className="accounts-col-party font-medium truncate text-xs" title={r.vendorName}>
                    {r.vendorName}
                  </AccountsTableCell>
                  <AccountsTableCell className="truncate text-xs">
                    {r.branch || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell className="tabular-nums text-xs">
                    {r.debitNoteDate}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">
                    {formatINR(r.taxableAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">
                    {formatINR(r.cgstAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">
                    {formatINR(r.sgstAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">
                    {formatINR(r.igstAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs font-medium">
                    {formatINR(r.currentDebitAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell>
                    <StatusBadge status={badge.status} label={badge.label} size="sm" />
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                    <AccountsTableActionCell>
                      <AccountsViewAction href={`${LIST_PATH}/${r.id}`} />
                      {canEditRow && (
                        <AccountsEditAction href={`${LIST_PATH}/${r.id}/edit`} />
                      )}
                      {(canPostRow || canCancelRow) && (
                        <AccountsMoreActions contentClassName="w-44">
                          {canPostRow && (
                            <DropdownMenuItem
                              className="text-xs gap-2"
                              onClick={async () => {
                                try {
                                  await DebitNoteService.post(r.id);
                                  showToast("Debit Note posted successfully.", "success");
                                  onRefresh();
                                } catch (e: any) {
                                  showToast(e.message || "Unable to post Debit Note.", "error");
                                }
                              }}
                            >
                              <FileText className="w-4 h-4" /> Post
                            </DropdownMenuItem>
                          )}
                          {canCancelRow && (
                            <DropdownMenuItem
                              className="text-xs gap-2 text-red-600"
                              onClick={() => onCancel(r)}
                            >
                              <XCircle className="w-4 h-4" /> Cancel
                            </DropdownMenuItem>
                          )}
                        </AccountsMoreActions>
                      )}
                    </AccountsTableActionCell>
                  </AccountsTableCell>
                </AccountsTableRow>
              );
            })
          )}
        </AccountsTableBody>
      </AccountsTable>
      {mounted && visible.length > 0 ? (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          recordLabel="debit notes"
        />
      ) : null}
    </>
  );
}

export default function DebitNotesListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useClientMounted();
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const { permissions } = usePermissions();

  const hasCreatePermission = useMemo(() => canCreate(permissions, "accounts", "ledger"), [permissions]);
  const hasUpdatePermission = useMemo(() => canEdit(permissions, "accounts", "ledger"), [permissions]);

  const [moduleTab, setModuleTab] = useState("pending");
  const [statusTab, setStatusTab] = useState("all");
  const [filters, setFilters] = useState<NotesListingFilterState>(() => ({
    ...resetNotesListingFilters("this_month"),
    dateFrom,
    dateTo,
    preset,
  }));
  const [records, setRecords] = useState<DebitNoteRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [cancelTarget, setCancelTarget] = useState<DebitNoteRecord | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(true);

  const [supplierList, setSupplierList] = useState<SupplierDropdownItem[]>([]);
  const [warehouseList, setWarehouseList] = useState<WarehouseDropdownItem[]>([]);

  const sectionRefresh = useAccountsSectionRefresh("debit-notes");

  // Load masters & config on mount
  useEffect(() => {
    if (!mounted) return;
    SupplierService.dropdown().then(setSupplierList).catch(() => {});
    WarehouseService.dropdown().then(setWarehouseList).catch(() => {});
    DebitNoteService.getConfig()
      .then((cfg) => setApprovalRequired(cfg.approval_required))
      .catch(() => {});
  }, [mounted]);

  // Load pending list count
  const loadPendingCount = useCallback(async () => {
    try {
      const res = await DebitNoteService.listPending({ page: 1, page_size: 1, status: "PENDING" });
      setPendingCount(res.pagination.total);
    } catch {}
  }, []);

  const refresh = useCallback(async () => {
    if (!mounted) return;
    setLoading(true);
    setError(null);
    try {
      const selectedSupplierId = supplierList.find(
        (s) => filters.parties.includes(s.supplier_name)
      )?.supplier_id;

      const selectedWarehouseId = warehouseList.find(
        (w) => filters.branches.includes(w.warehouse_name)
      )?.warehouse_id;

      let source_type: any = undefined;
      if (filters.sources.includes("Direct")) source_type = "DIRECT";
      else if (filters.sources.includes("Purchase Invoice")) source_type = "PURCHASE_INVOICE";
      else if (filters.sources.includes("Purchase Return")) source_type = "PURCHASE_RETURN";

      let statusParam: any = undefined;
      if (statusTab !== "all") {
        statusParam = statusTab.toUpperCase();
      } else if (filters.status !== "all") {
        statusParam = filters.status.toUpperCase();
      }

      const res = await DebitNoteService.list({
        page,
        page_size: pageSize,
        search: filters.search.trim() || undefined,
        supplier_id: selectedSupplierId,
        warehouse_id: selectedWarehouseId,
        source_type,
        status: statusParam,
        dn_number: filters.voucherNo.trim() || undefined,
        from_date: filters.dateFrom || undefined,
        to_date: filters.dateTo || undefined,
      });

      const mapped = res.items.map((item) => {
        const { mapDebitNoteToRecord } = require("@/services/debit-note.service");
        return mapDebitNoteToRecord(item);
      });

      setRecords(mapped);
      setTotalRecords(res.pagination.total);
      loadPendingCount();
    } catch (e: any) {
      setError(e.message || "Failed to load Debit Notes.");
      setRecords([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [
    mounted,
    page,
    pageSize,
    filters,
    statusTab,
    filters.parties.length > 0 ? supplierList : null,
    filters.branches.length > 0 ? warehouseList : null,
    sectionRefresh,
    loadPendingCount,
  ]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, dateFrom, dateTo, preset }));
  }, [dateFrom, dateTo, preset]);

  useEffect(() => {
    const qs = searchParams.toString();
    if (!hasDocumentsListingFilters(qs)) return;
    const parsed = parseDocumentsListingFiltersFromSearch(qs);
    if (parsed.dateFrom) {
      setDateFrom(parsed.dateFrom);
      setPreset("custom");
    }
    if (parsed.dateTo) {
      setDateTo(parsed.dateTo);
      setPreset("custom");
    }
    if (parsed.branch) setFilters((prev) => ({ ...prev, branches: [parsed.branch!] }));
    setModuleTab("records");
  }, [searchParams, setDateFrom, setDateTo, setPreset]);

  // Tab counts (since we paginate, let's keep counts mapped or static tab headers)
  const counts = useMemo(() => {
    // Return standard dummy or dynamic values from currently loaded list for header tabs
    const initialCounts = { all: totalRecords, draft: 0, pending_approval: 0, approved: 0, posted: 0, cancelled: 0, reversed: 0 };
    records.forEach((r) => {
      if (r.status in initialCounts) {
        (initialCounts as any)[r.status] += 1;
      }
    });
    return initialCounts;
  }, [records, totalRecords]);

  const branchOptions = useMemo(
    () => uniqueOptionsFromValues(warehouseList.map((w) => w.warehouse_name)),
    [warehouseList],
  );
  const partyOptions = useMemo(
    () => uniqueOptionsFromValues(supplierList.map((s) => s.supplier_name)),
    [supplierList],
  );
  const sourceOptions: ReportMultiSelectOption[] = [
    { value: "Direct", label: "Direct" },
    { value: "Purchase Invoice", label: "Purchase Invoice" },
    { value: "Purchase Return", label: "Purchase Return" },
  ];

  const getCellValue = useCallback((row: DebitNoteRecord, key: string) => {
    if (key === "source") return DEBIT_NOTE_SOURCE_LABELS[row.source];
    if (key === "branch") return row.branch;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      debitNoteNo: { type: "text" as const },
      source: { type: "text" as const },
      sourceInvoiceNo: { type: "text" as const },
      vendorName: { type: "text" as const },
      branch: { type: "text" as const },
      debitNoteDate: { type: "date" as const },
      taxableAmount: { type: "amount" as const },
      cgstAmount: { type: "amount" as const },
      sgstAmount: { type: "amount" as const },
      igstAmount: { type: "amount" as const },
      currentDebitAmount: { type: "amount" as const },
      status: { type: "text" as const },
    }),
    [],
  );

  useEffect(() => {
    setPage(1);
  }, [filters, statusTab, pageSize]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { exportDebitNotesToExcel } = require("../../debit-notes/debit-notes-export");
      await exportDebitNotesToExcel(records);
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setStatusTab("all");
    setPreset("this_month");
    setDateFrom("");
    setDateTo("");
    setFilters(resetNotesListingFilters("this_month"));
  };

  return (
    <>
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Transactions", "Debit Notes")}
        title="Debit Notes"
        description="Supplier adjustments — pending purchase returns and fresh debit notes."
        hideDescription
        actions={
          <NotesListHeaderActions
            onRefresh={refresh}
            onExportExcel={moduleTab === "records" ? handleExport : undefined}
            onExportPdf={moduleTab === "records" ? handleExport : undefined}
            exportDisabled={exporting || records.length === 0}
            createLabel="Create Debit Note"
            onCreate={() => router.push(`${LIST_PATH}/new?mode=fresh`)}
          />
        }
        layout="split"
        className="h-full min-h-0"
      >
        <div className="flex flex-col flex-1 min-h-0 gap-1.5 overflow-hidden">
          <SectionTabs
            tabs={[...NOTES_MODULE_TABS]}
            active={moduleTab}
            onChange={setModuleTab}
            counts={{ pending: pendingCount, records: totalRecords }}
            compact
          />

          {moduleTab === "pending" ? (
            <PendingDebitNotesPanel />
          ) : (
            <AccountsColumnFilterProvider
              rows={records}
              getCellValue={getCellValue}
              columnConfig={columnConfig}
              defaultSortKey="debitNoteDate"
              defaultSortDir="desc"
            >
              <AccountsTableListing
                subheader={
                  <SectionTabs
                    tabs={[...NOTES_STATUS_TABS]}
                    active={statusTab}
                    onChange={setStatusTab}
                    counts={counts}
                    compact
                  />
                }
                toolbar={
                  <AccountsListingFilterCard>
                    <NotesListingFilterBar
                      filters={filters}
                      partyLabel="Vendor"
                      branchOptions={branchOptions}
                      partyOptions={partyOptions}
                      sourceOptions={sourceOptions}
                      statusOptions={NOTES_STATUS_FILTER_OPTIONS}
                      searchPlaceholder="Search DN no., supplier, invoice, return…"
                      onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
                      onReset={handleResetFilters}
                    />
                  </AccountsListingFilterCard>
                }
              >
                {loading ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">Loading debit notes...</div>
                ) : error ? (
                  <div className="p-8 text-center text-xs text-red-600">{error}</div>
                ) : (
                  <DebitNotesRecordsTable
                    mounted={mounted}
                    toolbarFiltered={records}
                    page={page}
                    pageSize={pageSize}
                    totalRecords={totalRecords}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    onCancel={setCancelTarget}
                    onRefresh={refresh}
                    approvalRequired={approvalRequired}
                    hasCreatePermission={hasCreatePermission}
                    hasUpdatePermission={hasUpdatePermission}
                  />
                )}
              </AccountsTableListing>
            </AccountsColumnFilterProvider>
          )}
        </div>
      </AccountsPageShell>

      <DebitNoteCancelDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        debitNoteNo={cancelTarget?.debitNoteNo ?? ""}
        onConfirm={async (reason) => {
          if (!cancelTarget) return;
          try {
            await DebitNoteService.cancel(cancelTarget.id, { reason });
            showToast("Debit Note cancelled successfully.", "success");
            refresh();
          } catch (e: any) {
            showToast(e.message || "Failed to cancel Debit Note.", "error");
          }
          setCancelTarget(null);
        }}
      />
    </>
  );
}
