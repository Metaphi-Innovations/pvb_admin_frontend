"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  Package,
  Building2,
  Calendar,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { useFormDirtySnapshot } from "@/lib/accounts/use-form-dirty-snapshot";
import { useTransactionFormCancel } from "@/components/accounts/TransactionFormCancel";
import { formatMoney } from "@/lib/accounts/money-format";
import { purchaseInvoiceImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { AccountingImpactSection } from "@/components/accounts/AccountingImpactSection";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { AccountsToast, type AccountsToastState } from "@/components/accounts/AccountsToast";
import { PurchaseInvoicePageShell } from "./PurchaseInvoicePageShell";
import { PURCHASE_SOURCE_TYPE_LABELS, type PurchaseSourceType } from "./purchase-invoice-types";
import {
  PurchaseInvoiceService,
  type AdditionalChargeInput,
  type EligibleGrnDto,
  type PrepareGrnInvoiceDto,
} from "@/services/purchase-invoice.service";
import { cn } from "@/lib/utils";

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
        {(["from_grn", "direct_purchase"] as PurchaseSourceType[]).map((st) => (
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
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function applyPrepared(data: PrepareGrnInvoiceDto, fallback?: EligibleGrnDto | null) {
    setPrepared(data);
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

  const items = prepared?.items ?? [];
  const subtotal = items.reduce((s, l) => s + Number(l.taxable_amount || 0), 0);
  const totalGst = items.reduce((s, l) => s + Number(l.gst_amount || 0), 0);
  const chargeTotal = (prepared?.suggested_additional_charges || [])
    .filter((c) => c.mapping_ok)
    .reduce((s, c) => s + Number(c.amount || 0), 0);
  const grandTotal = subtotal + totalGst + chargeTotal;
  const roundOff = Math.round(grandTotal) - grandTotal;
  const finalTotal = Math.round(grandTotal);
  const mappedCharges = (prepared?.suggested_additional_charges || []).filter((c) => c.mapping_ok);
  const unmappedCharges = (prepared?.suggested_additional_charges || []).filter((c) => !c.mapping_ok);
  const supplierInvoiceLocked = Boolean(prepared?.supplier_invoice.supplier_invoice_number);

  const doSave = async () => {
    setError("");
    if (!selectedGrn) return setError("Select a GRN to create the purchase invoice.");
    if (!invoiceDate) return setError("Invoice date is required.");
    if (!vendorInvoiceNo.trim() && !supplierInvoiceLocked) {
      return setError("Enter the supplier invoice number.");
    }
    if (items.length === 0) return setError("This GRN has no invoiceable items.");

    const additionalCharges: AdditionalChargeInput[] = mappedCharges
      .filter((c) => c.matched_additional_charge_id)
      .map((c) => ({
        additional_charge_id: c.matched_additional_charge_id as string,
        amount: Number(c.amount || 0),
        charge_source: "ORDER" as const,
        gst_applicable: c.gst_percent != null && Number(c.gst_percent) > 0,
        gst_rate: c.gst_percent != null ? Number(c.gst_percent) : undefined,
      }));

    setSaving(true);
    try {
      const created = await PurchaseInvoiceService.createFromGrn(selectedGrn.grn_id, {
        purchase_invoice_date: invoiceDate,
        supplier_invoice_number: vendorInvoiceNo.trim() || undefined,
        supplier_invoice_date: supplierInvoiceDate || null,
        due_date: dueDate || null,
        narration: remarks.trim() || undefined,
        remarks: remarks.trim() || undefined,
        additional_charges: additionalCharges,
        attachment,
      });
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
    }),
    [selectedGrn?.grn_id, invoiceDate, vendorInvoiceNo, remarks],
  );
  const isDirty = useFormDirtySnapshot(formSnapshot, { ready: baselineReady });
  const { requestCancel, discardDialog } = useTransactionFormCancel({
    listHref: "/accounts/purchase-invoices",
    isDirty,
  });

  const title = selectedGrn ? `Invoice from ${selectedGrn.grn_number}` : "New Purchase Invoice";

  return (
    <>
      <PurchaseInvoicePageShell
        breadcrumbs={accountsBreadcrumb("Transactions", "New Purchase Invoice")}
        title={title}
        description="Create a purchase invoice from a purchase-order GRN. Rates and quantities come from GRN received batches."
      >
        <div className="space-y-4 w-full pb-10">
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
                  <table className="w-full text-xs min-w-[720px]">
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
                          GST
                        </th>
                        <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
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
                          <td className="py-1.5 pr-2 text-right tabular-nums text-amber-700">
                            {formatMoney(Number(item.gst_amount))}
                          </td>
                          <td className="py-1.5 pr-2 text-right tabular-nums font-semibold">
                            {formatMoney(Number(item.line_total))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              {(mappedCharges.length > 0 || unmappedCharges.length > 0) && (
                <Section title="Additional Charges">
                  {mappedCharges.map((c) => (
                    <div key={c.charge_name} className="flex justify-between text-xs">
                      <span>{c.charge_name}</span>
                      <span className="tabular-nums">{formatMoney(Number(c.amount))}</span>
                    </div>
                  ))}
                  {unmappedCharges.length > 0 && (
                    <p className="text-xs text-amber-700">
                      Unmapped PO charges are skipped until they exist in Additional Charge Master:{" "}
                      {unmappedCharges.map((c) => c.charge_name).join(", ")}
                    </p>
                  )}
                </Section>
              )}

              <Section title="Invoice Summary">
                <div className="flex justify-end">
                  <div className="w-72 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span>Subtotal (Taxable)</span>
                      <span className="tabular-nums">{formatMoney(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>GST</span>
                      <span className="tabular-nums">{formatMoney(totalGst)}</span>
                    </div>
                    {chargeTotal > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Additional Charges</span>
                        <span className="tabular-nums">{formatMoney(chargeTotal)}</span>
                      </div>
                    )}
                    {Math.abs(roundOff) > 0.001 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Round Off</span>
                        <span className="tabular-nums">{formatMoney(roundOff)}</span>
                      </div>
                    )}
                    <div className="border-t border-border/60 pt-2 mt-1 flex justify-between font-bold">
                      <span>Grand Total</span>
                      <span className="tabular-nums">{formatMoney(finalTotal)}</span>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Remarks">
                <Textarea
                  className="text-xs min-h-[60px]"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Internal notes, reference, etc."
                />
                <div className="pt-3">
                  <Label className="text-xs">Attachment</Label>
                  <Input
                    className="h-8 text-xs mt-1"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                  />
                  {attachment && (
                    <p className="mt-1 text-[11px] text-muted-foreground">{attachment.name}</p>
                  )}
                </div>
              </Section>

              <LedgerImpactPreview
                title="Accounting Impact Preview"
                lines={purchaseInvoiceImpactResolved({
                  vendorName: prepared.supplier.supplier_name || "Supplier",
                  taxable: subtotal,
                  taxAmount: totalGst,
                  grandTotal: finalTotal,
                })}
              />
              <AccountingImpactSection docKey="purchase_invoice" />

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium"
                  onClick={requestCancel}
                >
                  Discard Form
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
                  onClick={() => void doSave()}
                  disabled={saving || preparing || !selectedGrn}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Create & Post Invoice
                </Button>
              </div>
            </>
          )}
        </div>
      </PurchaseInvoicePageShell>
      <AccountsToast toast={toast} onDismiss={dismissToast} />
      {discardDialog}
    </>
  );
}

export { SourceTypeSelector };
