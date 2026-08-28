"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { VoucherFormActionBar } from "@/components/accounts/voucher-form/VoucherFormActionBar";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { InvoiceFormLayout } from "@/app/(app)/accounts/components/InvoiceFormLayout";
import {
  INVOICE_DETAIL_INPUT_CLASS,
  INVOICE_DETAIL_SELECT_CLASS,
  InvoiceDetailField,
} from "@/app/(app)/accounts/invoices/components/invoice-form-voucher-ui";
import { VOUCHER_INPUT_CLASS } from "@/components/accounts/voucher-simple-form-ui";
import { DirectPurchaseSupplierSection } from "./DirectPurchaseSupplierSection";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { COMPANY_BILLING } from "@/lib/procurement/config";
import { useSuppliersDropdown } from "@/hooks/masters/use-supplier";
import { useWarehousesDropdown } from "@/hooks/masters/use-warehouse-master";
import { useHsnDropdown } from "@/hooks/masters/use-hsn";
import { cn } from "@/lib/utils";
import { PurchaseInvoiceService, type CreateDirectPurchasePayload } from "@/services/purchase-invoice.service";
import { useFY, setStoredFYId, getStoredFYId } from "@/lib/fy-store";
import {
  GoodsInvoiceAdditionalChargesEditor,
} from "@/app/(app)/accounts/invoices/components/GoodsInvoiceAdditionalChargesEditor";
import {
  calcAdditionalExpensesTotals,
  type InvoiceAdditionalExpense,
} from "@/app/(app)/accounts/invoices/invoice-additional-expenses";
import type { ItcClassification, PurchaseNature } from "./purchase-invoices-data";
import {
  INDIAN_STATE_OPTIONS,
  PURCHASE_NATURE_LABELS,
  computeDirectPurchaseInvoiceTotals,
  emptyDirectLine,
  isInterstatePurchase,
  recalcDirectLine,
} from "./purchase-invoice-direct-utils";
import { PurchaseInvoiceDirectTotals } from "./PurchaseInvoiceDirectTotals";
import { PurchaseInvoiceDirectLineTable } from "./PurchaseInvoiceDirectLineTable";
import { DirectPurchaseSelectField } from "./DirectPurchaseSelectField";
import { DP_FIELD_CLASS } from "./direct-purchase-form-ui";
import { roundMoney } from "@/lib/accounts/money-format";
import "@/app/(app)/accounts/invoices/sales-order-invoice-form-compact.css";

function selectedLedgerId(ledgerId: string | number | null | undefined): string | null {
  if (typeof ledgerId === "string" && ledgerId.trim()) return ledgerId.trim();
  return null;
}

export function PurchaseInvoiceDirectForm({
  onCancel,
  showToast,
}: {
  invoiceId?: number;
  onCancel: () => void;
  showToast: (msg: string) => void;
}) {
  const router = useRouter();
  const { selectedFY, isLoading: fyLoading } = useFY();
  const { data: supplierData } = useSuppliersDropdown();
  const { data: warehouseData } = useWarehousesDropdown();
  const { data: hsnDropdown = [] } = useHsnDropdown();

  const suppliers = useMemo(
    () =>
      (supplierData || []).map((s) => ({
        id: String(s.supplier_id ?? ""),
        name: String(s.supplierName ?? ""),
        code: String(s.supplierCode ?? ""),
      })),
    [supplierData],
  );

  const warehouses = useMemo(
    () =>
      (warehouseData || []).map((w) => ({
        id: String(w.warehouse_id ?? ""),
        name: String(w.warehouseName ?? ""),
      })),
    [warehouseData],
  );

  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [purchaseNature, setPurchaseNature] = useState<PurchaseNature>("expense");
  const [placeOfSupply, setPlaceOfSupply] = useState(COMPANY_BILLING.state);
  const [branchGstin] = useState(COMPANY_BILLING.gstNumber);
  const [roundingAdjustment, setRoundingAdjustment] = useState(0);
  const [narration, setNarration] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const defaultItc: ItcClassification = "eligible";
  const [lines, setLines] = useState(() => [emptyDirectLine(defaultItc)]);
  const [additionalExpenses, setAdditionalExpenses] = useState<InvoiceAdditionalExpense[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const addLineRowRef = useRef<(() => void) | null>(null);
  const addChargeRowRef = useRef<(() => void) | null>(null);

  const interstate = isInterstatePurchase(branchGstin, placeOfSupply);

  const handleExpensesChange = useCallback(
    (updater: React.SetStateAction<InvoiceAdditionalExpense[]>) => {
      setAdditionalExpenses(updater);
    },
    [],
  );

  const chargeBreakdown = useMemo(
    () => calcAdditionalExpensesTotals(additionalExpenses, interstate),
    [additionalExpenses, interstate],
  );

  const hsnOptions = useMemo(
    () =>
      hsnDropdown.filter((h) =>
        purchaseNature === "service" ? h.codeType === "SAC" : h.codeType === "HSN",
      ),
    [hsnDropdown, purchaseNature],
  );

  useEffect(() => {
    setLines((prev) =>
      prev.map((l) => recalcDirectLine({ ...l, purchaseNature }, interstate)),
    );
  }, [branchGstin, placeOfSupply, purchaseNature, interstate]);

  const totals = useMemo(() => {
    const base = computeDirectPurchaseInvoiceTotals(lines, { roundingAdjustment });
    return {
      ...base,
      cgst: roundMoney(base.cgst + chargeBreakdown.cgst),
      sgst: roundMoney(base.sgst + chargeBreakdown.sgst),
      igst: roundMoney(base.igst + chargeBreakdown.igst),
      totalGst: roundMoney(base.totalGst + chargeBreakdown.gstAmount),
      invoiceTotal: roundMoney(base.invoiceTotal + chargeBreakdown.totalAmount),
      netPayable: roundMoney(base.netPayable + chargeBreakdown.totalAmount),
    };
  }, [lines, roundingAdjustment, chargeBreakdown]);

  const purchaseNatureOptions = (Object.keys(PURCHASE_NATURE_LABELS) as PurchaseNature[]).map((k) => ({
    value: k,
    label: PURCHASE_NATURE_LABELS[k],
  }));
  const placeOfSupplyOptions = INDIAN_STATE_OPTIONS.map((s) => ({ value: s, label: s }));
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }));

  const validate = (): boolean => {
    if (!supplierId) {
      setError("Select a supplier.");
      return false;
    }
    if (!warehouseId) {
      setError("Select a warehouse / branch.");
      return false;
    }
    if (!vendorInvoiceNo.trim()) {
      setError("Supplier invoice number is required.");
      return false;
    }
    if (!invoiceDate) {
      setError("Invoice date is required.");
      return false;
    }
    if (!lines.length) {
      setError("Add at least one invoice line item.");
      return false;
    }
    if (lines.some((l) => !l.description.trim())) {
      setError("All line items require a description / particulars.");
      return false;
    }
    if (lines.some((l) => !selectedLedgerId(l.expenseLedgerId))) {
      setError("Select a ledger for each line item.");
      return false;
    }
    if (lines.some((l) => l.taxableAmount <= 0 && l.rate <= 0)) {
      setError("Each line must have a rate or taxable amount greater than zero.");
      return false;
    }
    if (purchaseNature === "service") {
      if (!hsnOptions.length) {
        setError("No active SAC codes found in HSN Master. Create SAC records before posting.");
        return false;
      }
      if (lines.some((l) => !l.sacId)) {
        setError("Select a SAC code for each service line.");
        return false;
      }
    }
    if (totals.invoiceTotal <= 0) {
      setError("Invoice total must be greater than zero.");
      return false;
    }
    return true;
  };

  const handlePost = async () => {
    if (!validate()) return;

    if (!selectedFY.id && !getStoredFYId()) {
      setError(
        fyLoading
          ? "Financial year is still loading. Please wait a moment and try again."
          : "Select a financial year from the header before posting.",
      );
      return;
    }

    setSaving(true);
    setError("");
    // Ensure the FY id is in localStorage before axios fires the request.
    if (selectedFY?.id) setStoredFYId(selectedFY.id);
    const financialYearId = selectedFY.id || getStoredFYId();
    try {
      const additionalCharges: CreateDirectPurchasePayload["additional_charges"] & {} = additionalExpenses
        .filter((e) => e.chargeMasterId && e.amount > 0)
        .map((e) => ({
          additional_charge_id: e.chargeMasterId!,
          amount: e.amount,
          charge_source: "INVOICE" as const,
          gst_applicable: e.gstApplicable,
          gst_rate: e.gstApplicable ? e.gstPct : undefined,
        }));

      const created = await PurchaseInvoiceService.createDirectPurchase(
        {
          purchase_invoice_date: invoiceDate,
          supplier_invoice_number: vendorInvoiceNo.trim(),
          supplier_invoice_date: invoiceDate,
          due_date: dueDate || null,
          warehouse_id: warehouseId,
          supplier_id: supplierId,
          narration: narration.trim() || undefined,
          remarks: narration.trim() || undefined,
          round_off_amount: roundingAdjustment,
          attachment,
          additional_charges: additionalCharges.length > 0 ? additionalCharges : undefined,
          items: lines.map((line) => {
            const expenseLedgerId = selectedLedgerId(line.expenseLedgerId);
            if (!expenseLedgerId) {
              throw new Error(`Ledger UUID missing for "${line.description}".`);
            }
            return {
              item_type: purchaseNature === "service" ? ("SERVICE" as const) : ("EXPENSE" as const),
              expense_ledger_id: expenseLedgerId,
              expense_description: line.description.trim(),
              sac_id: purchaseNature === "service" ? line.sacId || null : null,
              hsn_id: purchaseNature === "service" ? null : line.hsnId || null,
              quantity: line.quantity || 1,
              quantity_type: line.uqc || "NOS",
              rate: line.rate || line.taxableAmount,
              gst_rate: line.gstRate,
              is_input_credit_eligible: line.itcClassification === "eligible",
              narration: line.remarks || null,
            };
          }),
        },
        { financialYearId },
      );
      dispatchAccountsDataChanged("purchase-invoices");
      showToast(
        created.already_posted
          ? "Direct purchase invoice was already posted."
          : "Direct purchase posted. Supplier outstanding and ledger entries were created.",
      );
      router.push(`/accounts/purchase-invoices/${created.purchase_invoice_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Post failed.");
      setSaving(false);
    }
  };

  return (
    <div className="sales-order-invoice-form-compact h-full min-h-0 flex flex-col w-full">
      <InvoiceFormLayout
        title="New Direct Purchase Invoice"
        subtitle="Accounts → Transactions → Direct Purchase Invoice"
        breadcrumb={accountsBreadcrumb("Transactions", "New Direct Purchase")}
        backHref="/accounts/purchase-invoices"
        onBackClick={onCancel}
        stickyFooter={
          <VoucherFormActionBar
            onDiscard={onCancel}
            onSaveDraft={() =>
              showToast("Draft is not supported for direct purchase invoices. Use Post Invoice.")
            }
            onSaveAndPost={() => void handlePost()}
            saveAndPostLabel="Post Invoice"
            discardDisabled={saving}
            saveDraftDisabled
            saveAndPostDisabled={saving}
          />
        }
      >
        <div className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <VoucherFormSectionCard title="Supplier / Invoice Details">
            <div className="space-y-1.5">
              <div className="so-invoice-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <InvoiceDetailField label="Supplier" required>
                  <DirectPurchaseSupplierSection
                    hideLabel
                    suppliers={suppliers}
                    supplierId={supplierId}
                    onSupplierSelect={setSupplierId}
                    className={INVOICE_DETAIL_SELECT_CLASS}
                  />
                </InvoiceDetailField>
                <InvoiceDetailField label="Warehouse / Branch" required>
                  <DirectPurchaseSelectField
                    hideLabel
                    value={warehouseId}
                    onChange={setWarehouseId}
                    options={warehouseOptions}
                    placeholder="Select warehouse…"
                    searchPlaceholder="Search warehouses…"
                    className={INVOICE_DETAIL_SELECT_CLASS}
                  />
                </InvoiceDetailField>
                <InvoiceDetailField label="Supplier Invoice No" required>
                  <Input
                    className={INVOICE_DETAIL_INPUT_CLASS}
                    value={vendorInvoiceNo}
                    onChange={(e) => setVendorInvoiceNo(e.target.value)}
                    placeholder="Invoice no."
                  />
                </InvoiceDetailField>
                <InvoiceDetailField label="Invoice Date" required>
                  <AccountsDateInput
                    value={invoiceDate}
                    onChange={setInvoiceDate}
                    className={INVOICE_DETAIL_INPUT_CLASS}
                  />
                </InvoiceDetailField>
              </div>
              <div className="so-invoice-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <InvoiceDetailField label="Due Date">
                  <AccountsDateInput
                    value={dueDate}
                    onChange={setDueDate}
                    className={INVOICE_DETAIL_INPUT_CLASS}
                  />
                </InvoiceDetailField>
                <InvoiceDetailField label="Place of Supply">
                  <DirectPurchaseSelectField
                    hideLabel
                    value={placeOfSupply}
                    onChange={setPlaceOfSupply}
                    options={placeOfSupplyOptions}
                    placeholder="State…"
                    searchPlaceholder="Search…"
                    className={INVOICE_DETAIL_SELECT_CLASS}
                  />
                </InvoiceDetailField>
                <InvoiceDetailField label="Purchase Nature">
                  <DirectPurchaseSelectField
                    hideLabel
                    value={purchaseNature}
                    onChange={(v) => setPurchaseNature(v as PurchaseNature)}
                    options={purchaseNatureOptions}
                    placeholder="Nature…"
                    searchPlaceholder="Search…"
                    className={INVOICE_DETAIL_SELECT_CLASS}
                  />
                </InvoiceDetailField>
                <InvoiceDetailField label="Approval">
                  <div className="so-goods-ro w-full">Approved</div>
                </InvoiceDetailField>
                <InvoiceDetailField label="Payment">
                  <div className="so-goods-ro w-full">Unpaid</div>
                </InvoiceDetailField>
              </div>
            </div>
          </VoucherFormSectionCard>

          <VoucherFormSectionCard
            title="Purchase Invoice Items"
            flush
            headerActions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="so-section-header-btn"
                onClick={() => addLineRowRef.current?.()}
              >
                <Plus /> Add Row
              </Button>
            }
          >
            <PurchaseInvoiceDirectLineTable
              lines={lines}
              onChange={setLines}
              interstate={interstate}
              purchaseNature={purchaseNature}
              defaultItc={defaultItc}
              hsnOptions={hsnOptions}
              hideAddButton
              onBindAddRow={(fn) => {
                addLineRowRef.current = fn;
              }}
            />
          </VoucherFormSectionCard>

          <VoucherFormSectionCard
            title="Additional Charges"
            flush
            headerActions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="so-section-header-btn"
                onClick={() => addChargeRowRef.current?.()}
              >
                <Plus /> Add Charge
              </Button>
            }
          >
            <GoodsInvoiceAdditionalChargesEditor
              expenses={additionalExpenses}
              onChange={handleExpensesChange}
              disabled={saving}
              interstate={interstate}
              tableVariant="invoice"
              hideAddButton
              onBindAddRow={(fn) => {
                addChargeRowRef.current = fn;
              }}
            />
          </VoucherFormSectionCard>

          <div className="grid grid-cols-1 gap-2.5 items-start lg:grid-cols-[minmax(0,1fr)_300px]">
            <VoucherFormSectionCard title="Narration / Attachment">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="min-w-0">
                  <Textarea
                    className={cn(VOUCHER_INPUT_CLASS, "so-goods-narration min-h-[72px] h-auto resize-y text-xs")}
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    placeholder="Optional narration for this invoice…"
                    maxLength={500}
                  />
                </div>
                <div className="min-w-0">
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
            </VoucherFormSectionCard>

            <VoucherFormSectionCard title="Summary" className="lg:sticky lg:top-3 lg:z-10">
              <PurchaseInvoiceDirectTotals
                totals={totals}
                roundingAdjustment={roundingAdjustment}
                onRoundingChange={setRoundingAdjustment}
                additionalChargeTotal={chargeBreakdown.taxableAmount}
              />
            </VoucherFormSectionCard>
          </div>

          <p className="text-[11px] text-muted-foreground px-0.5">
            Posting creates supplier outstanding (Purchase Payable) and books GST automatically.
            Round off is saved on the invoice and posted to Round Off Adjustment.
          </p>
        </div>
      </InvoiceFormLayout>
    </div>
  );
}
