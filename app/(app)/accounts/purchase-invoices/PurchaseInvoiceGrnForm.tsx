"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  Package,
  Building2,
  Calendar,
  FileText,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { useFormDirtySnapshot } from "@/lib/accounts/use-form-dirty-snapshot";
import { useTransactionFormCancel } from "@/components/accounts/TransactionFormCancel";
import { formatMoney, roundMoney } from "@/lib/accounts/money-format";
import { normalizeGstAmounts } from "@/lib/accounts/gst-accounting";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { VoucherFormActionBar } from "@/components/accounts/voucher-form/VoucherFormActionBar";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { AccountsToast, type AccountsToastState } from "@/components/accounts/AccountsToast";
import { useFY, setStoredFYId, getStoredFYId } from "@/lib/fy-store";
import {
  InvoiceFormLayout,
} from "@/app/(app)/accounts/components/InvoiceFormLayout";
import { PURCHASE_SOURCE_TYPE_LABELS, type PurchaseSourceType } from "./purchase-invoice-types";
import {
  PurchaseInvoiceService,
  type AdditionalChargeInput,
  type EligibleGrnDto,
  type PrepareGrnInvoiceDto,
} from "@/services/purchase-invoice.service";
import { GoodsInvoiceAdditionalChargesEditor } from "@/app/(app)/accounts/invoices/components/GoodsInvoiceAdditionalChargesEditor";
import {
  calcAdditionalExpensesTotals,
  type InvoiceAdditionalExpense,
} from "@/app/(app)/accounts/invoices/invoice-additional-expenses";
import { PurchaseInvoiceDirectTotals } from "./PurchaseInvoiceDirectTotals";
import type { DirectPurchaseTotals } from "./purchase-invoice-direct-utils";
import { DP_FIELD_CLASS, DP_LABEL_CLASS } from "./direct-purchase-form-ui";
import { cn } from "@/lib/utils";
import "@/app/(app)/accounts/invoices/sales-order-invoice-form-compact.css";

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function snapshotStr(snapshot: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!snapshot) return "";
  for (const key of keys) {
    const v = snapshot[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function isPreparedInterstate(prepared: PrepareGrnInvoiceDto): boolean {
  const supplierState = (prepared.supplier.state || "").trim().toLowerCase();
  const warehouseState = (prepared.warehouse.state || "").trim().toLowerCase();
  if (supplierState && warehouseState) return supplierState !== warehouseState;
  return false;
}

type PrepareGrnItem = PrepareGrnInvoiceDto["items"][number];

/** Prefer API-provided CGST/SGST/IGST when present; otherwise use existing display split util. */
function getItemGstSplit(item: PrepareGrnItem, interstate: boolean) {
  const raw = item as PrepareGrnItem & {
    cgst_amount?: string | number | null;
    sgst_amount?: string | number | null;
    igst_amount?: string | number | null;
  };
  const cgst = Number(raw.cgst_amount ?? 0);
  const sgst = Number(raw.sgst_amount ?? 0);
  const igst = Number(raw.igst_amount ?? 0);
  if (cgst > 0 || sgst > 0 || igst > 0) {
    return {
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
    };
  }
  return normalizeGstAmounts(Number(item.gst_amount || 0), interstate);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-border/60 p-4 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function SourceTypeSelector({
  value,
  onChange,
}: {
  value: PurchaseSourceType;
  onChange: (v: PurchaseSourceType) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Source Type
      </span>
      <div className="flex flex-wrap gap-1">
        {(["from_grn"] as PurchaseSourceType[]).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => onChange(st)}
            className={cn(
              "inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium rounded-lg border transition-colors",
              value === st
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-border text-muted-foreground hover:bg-muted/40",
            )}
          >
            {st === "from_grn" ? <Truck className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
            {PURCHASE_SOURCE_TYPE_LABELS[st]}
          </button>
        ))}
      </div>
    </div>
  );
}

function GrnSelector({
  grns,
  selectedId,
  onSelect,
  loading,
}: {
  grns: EligibleGrnDto[];
  selectedId: string | null;
  onSelect: (grn: EligibleGrnDto) => void;
  loading: boolean;
}) {
  if (loading && grns.length === 0) {
    return <p className="text-xs text-muted-foreground py-6 text-center">Loading pending GRNs…</p>;
  }
  if (grns.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
        <p className="text-sm font-medium">No pending GRNs</p>
        <p className="text-xs text-muted-foreground mt-1">
          All purchase-order GRNs already have purchase invoices.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">
        Select a purchase-order GRN. Rates and quantities come from GRN received batches. QC must be completed before posting.
      </p>
      {grns.map((grn) => {
        const active = selectedId === grn.grn_id;
        return (
          <button
            key={grn.grn_id}
            type="button"
            onClick={() => onSelect(grn)}
            className={`w-full flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all ${
              active ? "border-brand-600 bg-brand-50" : "border-border bg-white hover:border-muted-foreground/30"
            }`}
          >
            <div className={`mt-0.5 rounded p-1.5 ${active ? "bg-brand-600 text-white" : "bg-blue-100 text-blue-700"}`}>
              <Truck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-blue-700">{grn.grn_number}</span>
                <Badge variant="outline" className="text-xs h-4 text-emerald-700 border-emerald-200">
                  {grn.status.replaceAll("_", " ")}
                </Badge>
              </div>
              <p className="text-xs font-medium mt-0.5">{grn.supplier_name || "—"}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDateOnly(grn.grn_date) || "—"}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {grn.warehouse_name || "—"}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {Number(grn.total_received_qty || 0)} qty · {grn.item_count} items
                </span>
              </div>
            </div>
            {active && <CheckCircle2 className="w-4 h-4 text-brand-600 mt-1 flex-shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

export function PurchaseInvoiceGrnForm({
  preselectedGrnId,
  sourceType,
  onSourceTypeChange,
  toast,
  showToast,
  dismissToast,
}: {
  preselectedGrnId: string | null;
  sourceType: PurchaseSourceType;
  onSourceTypeChange: (v: PurchaseSourceType) => void;
  toast: AccountsToastState | null;
  showToast: (msg: string) => void;
  dismissToast: () => void;
}) {
  const router = useRouter();
  const { selectedFY, isLoading: fyLoading } = useFY();
  const [eligibleGrns, setEligibleGrns] = useState<EligibleGrnDto[]>([]);
  const [loadingGrns, setLoadingGrns] = useState(true);
  const [selectedGrn, setSelectedGrn] = useState<EligibleGrnDto | null>(null);
  const [prepared, setPrepared] = useState<PrepareGrnInvoiceDto | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [showGrnSelector, setShowGrnSelector] = useState(true);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState("");
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [additionalExpenses, setAdditionalExpenses] = useState<InvoiceAdditionalExpense[]>([]);
  const [roundOff, setRoundOff] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function applyPrepared(data: PrepareGrnInvoiceDto, fallback?: EligibleGrnDto | null) {
    setPrepared(data);
    // PO charges stay read-only; editable invoice charges start empty (CN/DN pattern).
    setAdditionalExpenses([]);
    setRoundOff(0);
    setVendorInvoiceNo(data.supplier_invoice.supplier_invoice_number || "");
    setSupplierInvoiceDate(formatDateOnly(data.supplier_invoice.supplier_invoice_date));
    setInvoiceDate(formatDateOnly(data.grn.grn_date) || new Date().toISOString().slice(0, 10));
    setDueDate("");
    setShowGrnSelector(false);
    setSelectedGrn(
      fallback ?? {
        grn_id: data.grn.grn_id,
        grn_number: data.grn.grn_number,
        grn_date: data.grn.grn_date,
        status: data.grn.status,
        source_type: "PURCHASE_ORDER",
        purchase_order_id: data.purchase_order?.purchase_order_id ?? null,
        po_no: data.purchase_order?.po_no ?? null,
        warehouse_id: data.grn.warehouse_id,
        warehouse_name: data.warehouse.warehouse_name,
        supplier_id: data.grn.supplier_id,
        supplier_name: data.supplier.supplier_name,
        item_count: data.items.length,
        total_received_qty: data.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        has_supplier_invoice: Boolean(data.supplier_invoice.supplier_invoice_number),
        supplier_invoice_no: data.supplier_invoice.supplier_invoice_number,
        supplier_invoice_date: data.supplier_invoice.supplier_invoice_date,
      },
    );
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingGrns(true);
      try {
        const res = await PurchaseInvoiceService.listPendingGrns({ page: 1, page_size: 100 });
        if (!cancelled) setEligibleGrns(res.results || []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load pending GRNs.");
        }
      } finally {
        if (!cancelled) setLoadingGrns(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGrnSelect(grn: EligibleGrnDto) {
    setError("");
    setSelectedGrn(grn);
    setPreparing(true);
    try {
      const data = await PurchaseInvoiceService.prepareGrn(grn.grn_id);
      applyPrepared(data, grn);
    } catch (e) {
      setPrepared(null);
      setError(e instanceof Error ? e.message : "Failed to prepare GRN for invoice.");
    } finally {
      setPreparing(false);
    }
  }

  useEffect(() => {
    if (!preselectedGrnId) return;
    let cancelled = false;
    (async () => {
      setPreparing(true);
      setError("");
      try {
        const data = await PurchaseInvoiceService.prepareGrn(preselectedGrnId);
        if (cancelled) return;
        applyPrepared(data);
      } catch (e) {
        if (cancelled) return;
        setPrepared(null);
        setSelectedGrn(null);
        setError(e instanceof Error ? e.message : "Failed to prepare GRN for invoice.");
      } finally {
        if (!cancelled) setPreparing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedGrnId]);

  const handleExpensesChange = useCallback(
    (updater: React.SetStateAction<InvoiceAdditionalExpense[]>) => {
      setAdditionalExpenses(updater);
    },
    [],
  );

  const items = prepared?.items ?? [];
  const interstate = prepared ? isPreparedInterstate(prepared) : false;
  const subtotal = items.reduce((s, l) => s + Number(l.taxable_amount || 0), 0);
  const totalGst = items.reduce((s, l) => s + Number(l.gst_amount || 0), 0);
  const grossAmount = items.reduce(
    (s, l) => s + Number(l.quantity || 0) * Number(l.rate || 0),
    0,
  );
  const discountTotal = Math.max(0, Math.round((grossAmount - subtotal) * 100) / 100);
  const gstSplit = items.reduce(
    (acc, item) => {
      const split = getItemGstSplit(item, interstate);
      return {
        cgst: acc.cgst + split.cgst,
        sgst: acc.sgst + split.sgst,
        igst: acc.igst + split.igst,
      };
    },
    { cgst: 0, sgst: 0, igst: 0 },
  );
  const chargeBreakdown = calcAdditionalExpensesTotals(additionalExpenses, interstate);
  const grandTotal = subtotal + totalGst + chargeBreakdown.totalAmount;
  const finalTotal = grandTotal + roundOff;
  const amountSummaryTotals: DirectPurchaseTotals = {
    grossAmount: Math.round(grossAmount * 100) / 100,
    discountTotal,
    taxableAmount: Math.round(subtotal * 100) / 100,
    cgst: roundMoney(gstSplit.cgst + chargeBreakdown.cgst),
    sgst: roundMoney(gstSplit.sgst + chargeBreakdown.sgst),
    igst: roundMoney(gstSplit.igst + chargeBreakdown.igst),
    totalGst: roundMoney(totalGst + chargeBreakdown.gstAmount),
    tdsDeduction: 0,
    invoiceTotal: roundMoney(subtotal + totalGst + chargeBreakdown.totalAmount),
    netPayable: Math.round(finalTotal * 100) / 100,
  };
  const poSuggestedCharges = prepared?.suggested_additional_charges || [];
  const unmappedCharges = poSuggestedCharges.filter((c) => !c.mapping_ok);
  const supplierInvoiceLocked = Boolean(prepared?.supplier_invoice.supplier_invoice_number);

  const doSave = async () => {
    setError("");
    if (!selectedGrn) return setError("Select a GRN to create the purchase invoice.");
    if (!invoiceDate) return setError("Invoice date is required.");
    if (!vendorInvoiceNo.trim() && !supplierInvoiceLocked) {
      return setError("Enter the supplier invoice number.");
    }
    if (items.length === 0) return setError("This GRN has no invoiceable items.");

    if (!selectedFY.id && !getStoredFYId()) {
      return setError(
        fyLoading
          ? "Financial year is still loading. Please wait a moment and try again."
          : "Select a financial year from the header before posting.",
      );
    }

    const additionalCharges: AdditionalChargeInput[] = additionalExpenses
      .filter((e) => e.chargeMasterId && e.amount > 0)
      .map((e) => ({
        additional_charge_id: e.chargeMasterId!,
        amount: e.amount,
        charge_source: "INVOICE" as const,
        gst_applicable: e.gstApplicable,
        gst_rate: e.gstApplicable ? e.gstPct : undefined,
      }));

    setSaving(true);
    // Ensure the FY id is in localStorage before axios fires the request.
    if (selectedFY?.id) setStoredFYId(selectedFY.id);
    const financialYearId = selectedFY.id || getStoredFYId();
    try {
      const created = await PurchaseInvoiceService.createFromGrn(
        selectedGrn.grn_id,
        {
          purchase_invoice_date: invoiceDate,
          supplier_invoice_number: vendorInvoiceNo.trim() || undefined,
          supplier_invoice_date: supplierInvoiceDate || null,
          due_date: dueDate || null,
          narration: remarks.trim() || undefined,
          remarks: remarks.trim() || undefined,
          additional_charges: additionalCharges.length > 0 ? additionalCharges : undefined,
          round_off_amount: roundOff,
          attachment,
        },
        { financialYearId },
      );
      dispatchAccountsDataChanged("purchase-invoices");
      showToast(
        created.already_posted
          ? "Purchase invoice was already posted for this GRN."
          : "Purchase invoice posted. Supplier outstanding and ledger entries were created.",
      );
      router.push(`/accounts/purchase-invoices/${created.purchase_invoice_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setSaving(false);
    }
  };

  const [baselineReady, setBaselineReady] = useState(false);
  useEffect(() => {
    setBaselineReady(false);
    const id = window.setTimeout(() => setBaselineReady(true), 350);
    return () => window.clearTimeout(id);
  }, [selectedGrn?.grn_id]);

  const formSnapshot = useMemo(
    () => ({
      selectedGrnId: selectedGrn?.grn_id ?? null,
      invoiceDate,
      vendorInvoiceNo,
      remarks,
      roundOff,
    }),
    [selectedGrn?.grn_id, invoiceDate, vendorInvoiceNo, remarks, roundOff],
  );
  const isDirty = useFormDirtySnapshot(formSnapshot, { ready: baselineReady });
  const { requestCancel, discardDialog } = useTransactionFormCancel({
    listHref: "/accounts/purchase-invoices",
    isDirty,
  });

  const title = selectedGrn ? `Invoice from ${selectedGrn.grn_number}` : "New Purchase Invoice";

  return (
    <>
      <div className="sales-order-invoice-form-compact h-full min-h-0 flex flex-col w-full">
        <InvoiceFormLayout
          title={title}
          subtitle="Accounts → Transactions → From GRN Purchase Invoice"
          breadcrumb={accountsBreadcrumb("Transactions", "New Purchase Invoice")}
          backHref="/accounts/purchase-invoices"
          onBackClick={requestCancel}
          stickyFooter={
            <VoucherFormActionBar
              onDiscard={requestCancel}
              onSaveDraft={() =>
                showToast("Draft is not supported for GRN purchase invoices. Use Create & Post Invoice.")
              }
              onSaveAndPost={() => void doSave()}
              saveAndPostLabel="Create & Post Invoice"
              discardDisabled={saving}
              saveDraftDisabled
              saveAndPostDisabled={saving || preparing || !selectedGrn}
            />
          }
        >
          <div className="space-y-4 w-full">
            <SourceTypeSelector value={sourceType} onChange={onSourceTypeChange} />

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Section title={selectedGrn ? "Selected GRN" : "Select GRN"}>
              {selectedGrn && !showGrnSelector ? (
                <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3">
                  <div className="rounded p-1.5 bg-brand-600 text-white">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-blue-700 text-sm">{selectedGrn.grn_number}</span>
                      <Badge className="text-xs h-4 bg-emerald-100 text-emerald-700 border-emerald-200">
                        {selectedGrn.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedGrn.supplier_name} · {selectedGrn.warehouse_name} · {formatDateOnly(selectedGrn.grn_date)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setSelectedGrn(null);
                      setPrepared(null);
                      setShowGrnSelector(true);
                      setVendorInvoiceNo("");
                      setSupplierInvoiceDate("");
                      setDueDate("");
                      setAttachment(null);
                      setAdditionalExpenses([]);
                      setRoundOff(0);
                    }}
                  >
                    Change GRN
                  </Button>
                </div>
              ) : (
                <GrnSelector
                  grns={eligibleGrns}
                  selectedId={selectedGrn?.grn_id ?? null}
                  onSelect={(grn) => void handleGrnSelect(grn)}
                  loading={loadingGrns}
                />
              )}
              {preparing && <p className="text-xs text-muted-foreground">Loading supplier invoice lines…</p>}
            </Section>

          {prepared && (
            <>
              <Section title="Supplier & Invoice">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Supplier</Label>
                    <Input
                      className="h-8 text-xs mt-1 bg-muted/25"
                      readOnly
                      value={prepared.supplier.supplier_name || "—"}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Warehouse</Label>
                    <Input
                      className="h-8 text-xs mt-1 bg-muted/25"
                      readOnly
                      value={prepared.warehouse.warehouse_name || "—"}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Purchase Order</Label>
                    <Input
                      className="h-8 text-xs mt-1 bg-muted/25"
                      readOnly
                      value={prepared.purchase_order?.po_no || "—"}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Invoice Date *</Label>
                    <AccountsDateInput
                      value={invoiceDate}
                      onChange={setInvoiceDate}
                      aria-label="Invoice date"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Supplier Invoice No *</Label>
                    <Input
                      className={cn("h-8 text-xs mt-1", supplierInvoiceLocked && "bg-muted/25")}
                      value={vendorInvoiceNo}
                      readOnly={supplierInvoiceLocked}
                      onChange={(e) => setVendorInvoiceNo(e.target.value)}
                      placeholder="Supplier bill number"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Supplier Invoice Date</Label>
                    <AccountsDateInput
                      value={supplierInvoiceDate}
                      onChange={setSupplierInvoiceDate}
                      aria-label="Supplier invoice date"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Due Date</Label>
                    <AccountsDateInput
                      value={dueDate}
                      onChange={setDueDate}
                      aria-label="Due date"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Approval</Label>
                    <Input className="h-8 text-xs mt-1 bg-muted/25" readOnly value="Approved" />
                  </div>
                  <div>
                    <Label className="text-xs">Payment</Label>
                    <Input className="h-8 text-xs mt-1 bg-muted/25" readOnly value="Unpaid" />
                  </div>
                </div>
              </Section>

              <Section title="Item Details">
                <p className="text-xs text-muted-foreground mb-2">
                  Quantities and rates are copied from GRN received batches and cannot be edited here.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[920px]">
                    <thead>
                      <tr className="border-b border-border/60">
                        <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Item
                        </th>
                        <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Qty
                        </th>
                        <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Rate
                        </th>
                        <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          GST %
                        </th>
                        <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Taxable
                        </th>
                        <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          CGST
                        </th>
                        <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          SGST
                        </th>
                        <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          IGST
                        </th>
                        <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const split = getItemGstSplit(item, interstate);
                        return (
                          <tr key={item.grn_item_id || idx} className="border-b border-border/20">
                            <td className="py-1.5 pr-2 font-medium">
                              {snapshotStr(item.product_snapshot, "product_name", "name", "product_code") ||
                                `Item ${idx + 1}`}
                            </td>
                            <td className="py-1.5 pr-2 text-right tabular-nums">{Number(item.quantity)}</td>
                            <td className="py-1.5 pr-2 text-right tabular-nums">{formatMoney(Number(item.rate))}</td>
                            <td className="py-1.5 pr-2 text-right tabular-nums">{Number(item.gst_rate)}</td>
                            <td className="py-1.5 pr-2 text-right tabular-nums">
                              {formatMoney(Number(item.taxable_amount))}
                            </td>
                            <td className="py-1.5 pr-2 text-right tabular-nums">
                              {formatMoney(split.cgst)}
                            </td>
                            <td className="py-1.5 pr-2 text-right tabular-nums">
                              {formatMoney(split.sgst)}
                            </td>
                            <td className="py-1.5 pr-2 text-right tabular-nums">
                              {formatMoney(split.igst)}
                            </td>
                            <td className="py-1.5 pr-2 text-right tabular-nums font-semibold">
                              {formatMoney(Number(item.line_total))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>

              {poSuggestedCharges.length > 0 ? (
                <Section title="PO Additional Charges">
                  <p className="text-[10px] text-muted-foreground -mt-1">
                    Charges from the purchase order (display only — not posted).
                  </p>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b bg-muted/20">
                          <th className="p-1.5 text-left font-medium">Charge</th>
                          <th className="p-1.5 text-right font-medium w-28">Amount</th>
                          <th className="p-1.5 text-right font-medium w-20">GST %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {poSuggestedCharges.map((charge, idx) => (
                          <tr
                            key={`po-charge-${charge.matched_additional_charge_id || charge.charge_name}-${idx}`}
                            className="border-b last:border-0"
                          >
                            <td className="p-1.5">
                              {charge.charge_name}
                              {!charge.mapping_ok ? (
                                <span className="ml-1 text-[10px] text-amber-700">(unmapped)</span>
                              ) : null}
                            </td>
                            <td className="p-1.5 text-right tabular-nums">
                              {formatMoney(Number(charge.amount || 0))}
                            </td>
                            <td className="p-1.5 text-right tabular-nums">
                              {charge.gst_percent != null && Number(charge.gst_percent) > 0
                                ? Number(charge.gst_percent)
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {unmappedCharges.length > 0 ? (
                    <p className="text-xs text-amber-700">
                      The following PO charges are not in Additional Charge Master:{" "}
                      {unmappedCharges.map((c) => c.charge_name).join(", ")}
                    </p>
                  ) : null}
                </Section>
              ) : null}

              <Section title="Additional Charges">
                <p className="text-[10px] text-muted-foreground -mt-1">
                  Optional freight, packing, or other charges. These post on the purchase invoice.
                </p>
                <GoodsInvoiceAdditionalChargesEditor
                  expenses={additionalExpenses}
                  onChange={handleExpensesChange}
                  disabled={saving}
                  interstate={interstate}
                />
              </Section>

              <div className="flex justify-end">
                <div className="w-full max-w-[300px] rounded-lg border border-slate-200 bg-white space-y-2 p-3 shadow-sm">
                  <h2 className="accounts-card-title">Amount Summary</h2>
                  <PurchaseInvoiceDirectTotals
                    totals={amountSummaryTotals}
                    roundingAdjustment={roundOff}
                    onRoundingChange={setRoundOff}
                    additionalChargeTotal={chargeBreakdown.taxableAmount}
                    readOnly={saving}
                  />
                </div>
              </div>

              <Section title="Narration / Attachment">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1 min-w-0">
                    <Label className={DP_LABEL_CLASS}>Narration</Label>
                    <Textarea
                      className="text-xs min-h-[72px] resize-y"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Optional narration for this invoice…"
                      maxLength={500}
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <Label className={DP_LABEL_CLASS}>Attachment</Label>
                    <div
                      className={cn(
                        DP_FIELD_CLASS,
                        "flex items-center gap-2 w-full border border-border bg-white min-h-9",
                      )}
                    >
                      <label
                        className={cn(
                          "inline-flex items-center gap-1.5 h-6 px-2 rounded-md border border-border bg-muted/20",
                          "text-xs font-medium cursor-pointer hover:bg-muted/40 transition-colors whitespace-nowrap flex-shrink-0",
                          saving && "opacity-50 pointer-events-none",
                        )}
                      >
                        <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                        Upload File
                        <input
                          type="file"
                          className="hidden"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          disabled={saving}
                          onChange={(e) => {
                            setAttachment(e.target.files?.[0] ?? null);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {attachment ? (
                        <>
                          <span
                            className="text-[13px] font-medium text-foreground truncate min-w-0 flex-1"
                            title={attachment.name}
                          >
                            {attachment.name}
                          </span>
                          <button
                            type="button"
                            className="p-0.5 rounded-md hover:bg-red-50 text-red-600 flex-shrink-0"
                            disabled={saving}
                            onClick={() => setAttachment(null)}
                            aria-label="Remove attachment"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[13px] text-muted-foreground truncate">No file chosen</span>
                      )}
                    </div>
                  </div>
                </div>
              </Section>
            </>
          )}
          </div>
        </InvoiceFormLayout>
      </div>
      <AccountsToast toast={toast} onDismiss={dismissToast} />
      {discardDialog}
    </>
  );
}

export { SourceTypeSelector };
