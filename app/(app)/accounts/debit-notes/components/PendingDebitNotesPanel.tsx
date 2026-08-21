"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AccountsGenerateAction,
  AccountsTableActionCell,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsListingFilterCard,
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import { ReportSearchFilter } from "@/components/accounts/ReportFilters";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
} from "@/app/(app)/accounts/components/AccountsUI";
import { DEBIT_NOTES_LIST_PATH, formatINR } from "../note-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACCOUNTS_FILTER_LABEL_CLASS } from "@/lib/accounts/accounts-typography";
import { Label } from "@/components/ui/label";
import { DebitNoteService } from "@/services/debit-note.service";
import { LedgerService, type LedgerDropdownItem } from "@/services/ledger.service";
import { showToast } from "@/lib/toast";

// Dialog components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface PendingDebitNoteRow {
  returnId: string;
  returnNumber: string;
  returnDate: string;
  supplierName: string;
  poNumber: string;
  grnNo: string;
  dispatchNo: string;
  totalReturnQty: number;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
}

function PendingDebitNotesTable({
  toolbarFiltered,
  page,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  onConvert,
}: {
  toolbarFiltered: PendingDebitNoteRow[];
  page: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onConvert: (row: PendingDebitNoteRow) => void;
}) {
  const visible = toolbarFiltered;
  const pagedRows = toolbarFiltered;

  return (
    <>
      <AccountsTable minWidth={1040}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Return No." colKey="returnNumber" />
            <SortTh label="Date" colKey="returnDate" filterType="date" />
            <SortTh label="Supplier" colKey="supplierName" className="accounts-col-party" />
            <SortTh label="PO No." colKey="poNumber" />
            <SortTh label="GRN No." colKey="grnNo" />
            <SortTh label="Dispatch" colKey="dispatchNo" />
            <SortTh label="Qty" colKey="totalReturnQty" filterType="amount" align="right" />
            <SortTh label="Taxable" colKey="taxableAmount" filterType="amount" align="right" />
            <SortTh label="GST" colKey="gstAmount" filterType="amount" align="right" />
            <SortTh label="Total" colKey="totalAmount" filterType="amount" align="right" />
            <AccountsColumnHeader
              label="Actions"
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="right"
              className={accountsActionColClass("single")}
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {toolbarFiltered.length === 0 ? (
            <AccountsTableEmpty
              colSpan={11}
              message="No purchase returns pending debit note."
            />
          ) : (
            pagedRows.map((row) => (
              <AccountsTableRow key={row.returnId}>
                <AccountsTableCell mono className="font-semibold text-brand-700 truncate text-xs">
                  {row.returnNumber}
                </AccountsTableCell>
                <AccountsTableCell className="tabular-nums text-xs whitespace-nowrap">{row.returnDate}</AccountsTableCell>
                <AccountsTableCell className="accounts-col-party font-medium truncate text-xs" title={row.supplierName}>
                  {row.supplierName}
                </AccountsTableCell>
                <AccountsTableCell mono className="truncate text-xs">{row.poNumber}</AccountsTableCell>
                <AccountsTableCell mono className="truncate text-xs">{row.grnNo || "—"}</AccountsTableCell>
                <AccountsTableCell mono className="truncate text-xs">{row.dispatchNo || "—"}</AccountsTableCell>
                <AccountsTableCell align="right" className="tabular-nums text-xs">{row.totalReturnQty}</AccountsTableCell>
                <AccountsTableCell align="right" money className="text-xs tabular-nums">
                  {formatINR(row.taxableAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="text-xs tabular-nums">
                  {formatINR(row.gstAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="text-xs font-medium tabular-nums">
                  {formatINR(row.totalAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" className={accountsActionColClass("single")}>
                  <AccountsTableActionCell variant="single">
                    <AccountsGenerateAction
                      title="Create Debit Note"
                      onClick={() => onConvert(row)}
                    />
                  </AccountsTableActionCell>
                </AccountsTableCell>
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
      </AccountsTable>
      {visible.length > 0 ? (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          recordLabel="pending returns"
        />
      ) : null}
    </>
  );
}

export function PendingDebitNotesPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<PendingDebitNoteRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dispatchFilter, setDispatchFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Conversion modal state
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);
  const [pendingDetail, setPendingDetail] = useState<any | null>(null);
  
  // Conversion payload states
  const [dnDate, setDnDate] = useState("");
  const [narration, setNarration] = useState("");
  const [remarks, setRemarks] = useState("");
  const [allocations, setAllocations] = useState<Record<string, { ledger_id: string; amount: number | string }>>({});
  const [ledgers, setLedgers] = useState<LedgerDropdownItem[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await DebitNoteService.listPending({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        status: "PENDING",
      });

      const mapped = res.items.map((raw: any) => ({
        returnId: raw.pending_debit_note_id,
        returnNumber: raw.purchase_return_number || raw.purchase_return?.return_no || "—",
        returnDate: raw.purchase_return_date ? new Date(raw.purchase_return_date).toLocaleDateString() : "—",
        supplierName: raw.supplier_name || raw.supplier?.supplier_name || "—",
        poNumber: raw.purchase_return?.purchase_order?.po_number || raw.purchase_return?.po_number || "—",
        grnNo: raw.purchase_return?.grn?.grn_number || raw.purchase_return?.grn_number || "—",
        dispatchNo: raw.purchase_return?.dispatch?.dispatch_number || raw.purchase_return?.dispatch_number || "—",
        totalReturnQty: raw.items?.reduce((acc: number, item: any) => acc + parseFloat(item.quantity || "0"), 0) || 0,
        taxableAmount: parseFloat(raw.taxable_amount || "0"),
        gstAmount: parseFloat(raw.cgst_amount || "0") + parseFloat(raw.sgst_amount || "0") + parseFloat(raw.igst_amount || "0"),
        totalAmount: parseFloat(raw.grand_total || "0"),
      }));

      setRows(mapped);
      setTotalRecords(res.pagination.total);
    } catch (e: any) {
      showToast(e.message || "Failed to load pending debit notes.", "error");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Load ledgers on convert modal open
  useEffect(() => {
    if (convertOpen) {
      LedgerService.getDropdown()
        .then((res) => setLedgers(res.ledgers || []))
        .catch(() => {});
    }
  }, [convertOpen]);

  const handleOpenConvert = async (row: PendingDebitNoteRow) => {
    setConvertLoading(true);
    try {
      const detail = await DebitNoteService.getPendingById(row.returnId);
      setPendingDetail(detail);
      setDnDate(new Date().toISOString().split("T")[0]);
      setNarration(`Converted from Purchase Return ${row.returnNumber}`);
      setRemarks("");
      
      // Initialize allocations
      const initialAllocations: Record<string, { ledger_id: string; amount: number | string }> = {};
      detail.purchase_return_additional_charges?.forEach((charge: any) => {
        initialAllocations[charge.id] = {
          ledger_id: charge.ledger_id || "",
          amount: parseFloat(charge.remaining_amount || "0"),
        };
      });
      setAllocations(initialAllocations);
      setConvertOpen(true);
    } catch (e: any) {
      showToast(e.message || "Failed to load pending details.", "error");
    } finally {
      setConvertLoading(false);
    }
  };

  const handleConvertSubmit = async () => {
    if (!pendingDetail) return;
    
    // Validate date
    if (!dnDate) {
      showToast("Debit Note date is required.", "error");
      return;
    }

    // Prepare allocations payload & validate
    const chargesPayload = [];
    for (const chargeId of Object.keys(allocations)) {
      const charge = pendingDetail.purchase_return_additional_charges?.find((c: any) => c.id === chargeId);
      if (!charge) continue;

      const allocation = allocations[chargeId];
      const allocAmt = parseFloat(String(allocation.amount || "0"));
      const remainingVal = parseFloat(String(charge.remaining_amount || "0"));

      if (allocAmt < 0) {
        showToast(`Allocation amount for ${charge.charge_name || "charge"} must be positive.`, "error");
        return;
      }

      if (allocAmt > remainingVal) {
        showToast(`Allocation for ${charge.charge_name || "charge"} cannot exceed remaining balance of ${formatINR(remainingVal)}.`, "error");
        return;
      }

      if (!allocation.ledger_id) {
        showToast(`Please select a ledger for ${charge.charge_name || "charge"}.`, "error");
        return;
      }

      chargesPayload.push({
        purchase_return_additional_charge_id: chargeId,
        ledger_id: allocation.ledger_id,
        amount: allocAmt,
      });
    }

    setConvertLoading(true);
    try {
      const createdDn = await DebitNoteService.createFromPending(pendingDetail.pending_debit_note_id, {
        dn_date: dnDate,
        narration: narration || null,
        remarks: remarks || null,
        additional_charges: chargesPayload,
      });

      showToast("Debit Note generated successfully.", "success");
      setConvertOpen(false);
      refresh();
      
      // Navigate to created Debit Note
      if (createdDn && createdDn.id) {
        router.push(`${DEBIT_NOTES_LIST_PATH}/${createdDn.id}`);
      }
    } catch (e: any) {
      showToast(e.message || "Failed to convert Pending Debit Note.", "error");
    } finally {
      setConvertLoading(false);
    }
  };

  const getCellValue = useCallback((row: PendingDebitNoteRow, key: string) => {
    if (key === "dispatchNo") return row.dispatchNo || "";
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      returnNumber: { type: "text" as const },
      returnDate: { type: "date" as const },
      supplierName: { type: "text" as const },
      poNumber: { type: "text" as const },
      grnNo: { type: "text" as const },
      dispatchNo: { type: "text" as const },
      totalReturnQty: { type: "amount" as const },
      taxableAmount: { type: "amount" as const },
      gstAmount: { type: "amount" as const },
      totalAmount: { type: "amount" as const },
    }),
    [],
  );

  useEffect(() => {
    setPage(1);
  }, [search, dispatchFilter, pageSize]);

  return (
    <>
      <AccountsTableListing
        toolbar={
          <AccountsListingFilterCard>
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Search return no., supplier, PO, GRN…"
              className="min-w-[180px] flex-1 max-w-sm"
            />
            <div className="space-y-0.5 flex-shrink-0">
              <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Dispatch</Label>
              <Select value={dispatchFilter} onValueChange={setDispatchFilter}>
                <SelectTrigger className="h-8 w-[148px] text-xs">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All statuses</SelectItem>
                  <SelectItem value="Ready for Dispatch" className="text-xs">Ready for Dispatch</SelectItem>
                  <SelectItem value="Dispatched" className="text-xs">Dispatched</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AccountsListingFilterCard>
        }
      >
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading pending returns...</div>
        ) : (
          <AccountsColumnFilterProvider
            rows={rows}
            getCellValue={getCellValue}
            columnConfig={columnConfig}
            defaultSortKey="returnDate"
            defaultSortDir="desc"
          >
            <PendingDebitNotesTable
              toolbarFiltered={rows}
              page={page}
              pageSize={pageSize}
              totalRecords={totalRecords}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              onConvert={handleOpenConvert}
            />
          </AccountsColumnFilterProvider>
        )}
      </AccountsTableListing>

      {/* Convert Pending Modal */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Convert to Debit Note</DialogTitle>
          </DialogHeader>
          
          {pendingDetail && (
            <div className="grid gap-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 border-b pb-2">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Supplier</span>
                  <span className="font-semibold">{pendingDetail.supplier_name || pendingDetail.supplier?.supplier_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Warehouse</span>
                  <span className="font-semibold">{pendingDetail.warehouse_name || pendingDetail.warehouse?.warehouse_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Purchase Return</span>
                  <span className="font-mono">{pendingDetail.purchase_return_number || pendingDetail.purchase_return?.return_no}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Total Amount</span>
                  <span className="font-bold text-brand-700">{formatINR(pendingDetail.grand_total)}</span>
                </div>
              </div>

              <div className="grid gap-1">
                <Label htmlFor="dn-date" className="text-xs">Debit Note Date *</Label>
                <Input
                  id="dn-date"
                  type="date"
                  className="h-9 text-xs"
                  value={dnDate}
                  onChange={(e) => setDnDate(e.target.value)}
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="dn-narr" className="text-xs">Narration</Label>
                <Textarea
                  id="dn-narr"
                  className="text-xs min-h-[50px]"
                  placeholder="Narration details..."
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="dn-rem" className="text-xs">Remarks / Supplier Reference</Label>
                <Input
                  id="dn-rem"
                  className="h-9 text-xs"
                  placeholder="External notes or invoice refs..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              {pendingDetail.purchase_return_additional_charges?.length > 0 && (
                <div className="mt-2">
                  <h5 className="font-semibold text-xs mb-2">Additional Charge Allocation</h5>
                  <div className="border rounded overflow-hidden">
                    <table className="min-w-full text-[11px]">
                      <thead>
                        <tr className="bg-muted border-b">
                          <th className="p-2 text-left">Charge Name</th>
                          <th className="p-2 text-right">Original</th>
                          <th className="p-2 text-right">Remaining</th>
                          <th className="p-2 text-left">Ledger</th>
                          <th className="p-2 text-right">Current Alloc</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingDetail.purchase_return_additional_charges.map((charge: any) => {
                          const allocation = allocations[charge.id] || { ledger_id: "", amount: 0 };
                          return (
                            <tr key={charge.id} className="border-b">
                              <td className="p-2 font-medium">{charge.charge_name || "—"}</td>
                              <td className="p-2 text-right">{formatINR(charge.amount)}</td>
                              <td className="p-2 text-right font-medium text-brand-700">{formatINR(charge.remaining_amount)}</td>
                              <td className="p-2">
                                <select
                                  className="border rounded p-1 text-[11px] w-[140px]"
                                  value={allocation.ledger_id}
                                  onChange={(e) => {
                                    setAllocations((prev) => ({
                                      ...prev,
                                      [charge.id]: { ...allocation, ledger_id: e.target.value },
                                    }));
                                  }}
                                >
                                  <option value="">Select Ledger</option>
                                  {ledgers.map((l) => (
                                    <option key={l.ledgerId} value={l.ledgerId}>
                                      {l.ledgerName}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2 text-right">
                                <input
                                  type="number"
                                  className="border rounded p-1 text-[11px] text-right w-[80px]"
                                  value={allocation.amount}
                                  max={charge.remaining_amount}
                                  min={0}
                                  onChange={(e) => {
                                    setAllocations((prev) => ({
                                      ...prev,
                                      [charge.id]: { ...allocation, amount: e.target.value },
                                    }));
                                  }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConvertOpen(false)} disabled={convertLoading}>
              Cancel
            </Button>
            <Button size="sm" className="bg-brand-600 hover:bg-brand-700 text-white" onClick={handleConvertSubmit} disabled={convertLoading}>
              {convertLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Convert to Debit Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
