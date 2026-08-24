"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { DirectPurchaseSupplierSection } from "./DirectPurchaseSupplierSection";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { COMPANY_BILLING } from "@/lib/procurement/config";
import { useSuppliersDropdown } from "@/hooks/masters/use-supplier";
import { useWarehousesDropdown } from "@/hooks/masters/use-warehouse-master";
import { useHsnDropdown } from "@/hooks/masters/use-hsn";
import { cn } from "@/lib/utils";
import { PurchaseInvoiceService, type AdditionalChargeInput, type CreateDirectPurchasePayload } from "@/services/purchase-invoice.service";
import { useFY, setStoredFYId, getStoredFYId } from "@/lib/fy-store";
import {
  GoodsInvoiceAdditionalChargesEditor,
} from "@/app/(app)/accounts/invoices/components/GoodsInvoiceAdditionalChargesEditor";
import {
  createEmptyAdditionalExpense,
  calcAdditionalExpenseRow,
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
import {
  DP_FIELD_CLASS,
  DP_FORM_STACK,
  DP_HEADER_FIELD_CLASS,
  DP_HEADER_ROW_CLASS,
  DP_HEADER_SECTION_CLASS,
  DP_ITEMS_SECTION_CLASS,
  DP_LABEL_CLASS,
} from "./direct-purchase-form-ui";

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

  const interstate = isInterstatePurchase(branchGstin, placeOfSupply);

  const handleExpensesChange = useCallback(
    (updater: React.SetStateAction<InvoiceAdditionalExpense[]>) => {
      setAdditionalExpenses(updater);
    },
    [],
  );

  const chargeTotal = useMemo(
    () =>
      additionalExpenses.reduce((s, row) => {
        const calc = calcAdditionalExpenseRow(row, interstate);
        return s + (calc.totalAmount > 0 ? calc.totalAmount : 0);
      }, 0),
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

  const totals = useMemo(
    () => {
      const base = computeDirectPurchaseInvoiceTotals(lines, { roundingAdjustment });
      return {
        ...base,
        netPayable: Math.round((base.netPayable + chargeTotal) * 100) / 100,
      };
    },
    [lines, roundingAdjustment, chargeTotal],
  );

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
    <div className={DP_FORM_STACK}>
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-medium flex-shrink-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className={DP_HEADER_SECTION_CLASS}>
        <div className={DP_HEADER_ROW_CLASS}>
          <div className={cn(DP_HEADER_FIELD_CLASS, "min-w-[220px] flex-[1.6]")}>
            <DirectPurchaseSupplierSection
              suppliers={suppliers}
              supplierId={supplierId}
              onSupplierSelect={setSupplierId}
            />
          </div>
          <div className={cn(DP_HEADER_FIELD_CLASS, "min-w-[180px] flex-1")}>
            <DirectPurchaseSelectField
              label="Warehouse / Branch"
              required
              value={warehouseId}
              onChange={setWarehouseId}
              options={warehouseOptions}
              placeholder="Select warehouse…"
              searchPlaceholder="Search warehouses…"
            />
          </div>
          <div className={cn(DP_HEADER_FIELD_CLASS, "w-[130px]")}>
            <Label className={DP_LABEL_CLASS}>Supplier Invoice No *</Label>
            <Input
              className={DP_FIELD_CLASS}
              value={vendorInvoiceNo}
              onChange={(e) => setVendorInvoiceNo(e.target.value)}
              placeholder="Invoice no."
            />
          </div>
          <div className={cn(DP_HEADER_FIELD_CLASS, "w-[130px]")}>
            <Label className={DP_LABEL_CLASS}>Invoice Date *</Label>
            <AccountsDateInput value={invoiceDate} onChange={setInvoiceDate} className={DP_FIELD_CLASS} />
          </div>
          <div className={cn(DP_HEADER_FIELD_CLASS, "w-[130px]")}>
            <Label className={DP_LABEL_CLASS}>Due Date</Label>
            <AccountsDateInput value={dueDate} onChange={setDueDate} className={DP_FIELD_CLASS} />
          </div>
          <div className={cn(DP_HEADER_FIELD_CLASS, "w-[140px]")}>
            <DirectPurchaseSelectField
              label="Place of Supply"
              value={placeOfSupply}
              onChange={setPlaceOfSupply}
              options={placeOfSupplyOptions}
              placeholder="State…"
              searchPlaceholder="Search…"
            />
          </div>
          <div className={cn(DP_HEADER_FIELD_CLASS, "w-[140px]")}>
            <DirectPurchaseSelectField
              label="Purchase Nature"
              value={purchaseNature}
              onChange={(v) => setPurchaseNature(v as PurchaseNature)}
              options={purchaseNatureOptions}
              placeholder="Nature…"
              searchPlaceholder="Search…"
            />
          </div>
          <div className={cn(DP_HEADER_FIELD_CLASS, "w-[140px]")}>
            <Label className={DP_LABEL_CLASS}>Approval</Label>
            <Input className={DP_FIELD_CLASS} value="Approved" readOnly />
          </div>
          <div className={cn(DP_HEADER_FIELD_CLASS, "w-[140px]")}>
            <Label className={DP_LABEL_CLASS}>Payment</Label>
            <Input className={DP_FIELD_CLASS} value="Unpaid" readOnly />
          </div>
        </div>
      </div>

      <div className={DP_ITEMS_SECTION_CLASS}>
        <div className="px-2 py-1 border-b border-border/60 bg-muted/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Purchase Invoice Items
          </p>
        </div>
        <PurchaseInvoiceDirectLineTable
          lines={lines}
          onChange={setLines}
          interstate={interstate}
          purchaseNature={purchaseNature}
          defaultItc={defaultItc}
          hsnOptions={hsnOptions}
        />
        <div className="flex justify-end border-t border-border/60 px-2 py-2">
          <PurchaseInvoiceDirectTotals
            totals={totals}
            roundingAdjustment={roundingAdjustment}
            onRoundingChange={setRoundingAdjustment}
            additionalChargeTotal={chargeTotal}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <div className="px-2 py-1 border-b border-border/60 bg-muted/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Additional Charges
          </p>
        </div>
        <div className="p-2">
          <GoodsInvoiceAdditionalChargesEditor
            expenses={additionalExpenses}
            onChange={handleExpensesChange}
            disabled={saving}
            interstate={interstate}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-0.5 min-w-0">
          <Label className={DP_LABEL_CLASS}>Narration</Label>
          <Input
            className={DP_FIELD_CLASS}
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Optional narration"
          />
        </div>

        <div className="space-y-0.5 min-w-0">
          <Label className={DP_LABEL_CLASS}>Attachment</Label>
          <div
            className={cn(
              DP_FIELD_CLASS,
              "flex items-center gap-2 w-full border border-border bg-white",
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

      <p className="text-[11px] text-muted-foreground">
        Posting creates supplier outstanding (Purchase Payable) and books GST automatically.
        Round off is saved on the invoice and posted to Round Off Adjustment.
      </p>

      <div className="flex items-center gap-2 pt-1 border-t border-border">
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onCancel}>
          Discard Form
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
          disabled={saving}
          onClick={() => void handlePost()}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Post Invoice
        </Button>
      </div>
    </div>
  );
}
