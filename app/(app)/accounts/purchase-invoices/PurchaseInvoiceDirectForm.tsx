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
import { useSuppliersDropdown, useSupplier } from "@/hooks/masters/use-supplier";
import { useWarehousesDropdown, useWarehouse } from "@/hooks/masters/use-warehouse-master";
import { useHsnDropdown } from "@/hooks/masters/use-hsn";
import { cn } from "@/lib/utils";
import {
  PurchaseInvoiceService,
  mapPurchaseInvoiceDetailToRecord,
} from "@/services/purchase-invoice.service";
import { useFY, setStoredFYId, getStoredFYId } from "@/lib/fy-store";
import {
  GoodsInvoiceAdditionalChargesEditor,
  validateGoodsAdditionalCharges,
} from "@/app/(app)/accounts/invoices/components/GoodsInvoiceAdditionalChargesEditor";
import {
  calcAdditionalExpensesTotals,
  createEmptyAdditionalExpense,
  toAdditionalChargePayloadList,
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
  stateFromGstin,
} from "./purchase-invoice-direct-utils";
import { PurchaseInvoiceDirectTotals } from "./PurchaseInvoiceDirectTotals";
import { PurchaseInvoiceDirectLineTable } from "./PurchaseInvoiceDirectLineTable";
import { DirectPurchaseSelectField } from "./DirectPurchaseSelectField";
import { DP_FIELD_CLASS } from "./direct-purchase-form-ui";
import { computeAutomaticRoundOff, roundMoney } from "@/lib/accounts/money-format";
import "@/app/(app)/accounts/invoices/sales-order-invoice-form-compact.css";

function selectedLedgerId(ledgerId: string | number | null | undefined): string | null {
  if (typeof ledgerId === "string" && ledgerId.trim()) return ledgerId.trim();
  return null;
}

export function PurchaseInvoiceDirectForm({
  invoiceId,
  onCancel,
  showToast,
  listHref = "/accounts/purchase-invoices",
}: {
  invoiceId?: string;
  onCancel: () => void;
  showToast: (msg: string) => void;
  listHref?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(invoiceId);
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

  const [hydrating, setHydrating] = useState(isEdit);
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const autoFillPlaceOfSupplyRef = useRef(!isEdit);
  const autoFillBranchGstinRef = useRef(!isEdit);

  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [purchaseNature, setPurchaseNature] = useState<PurchaseNature>("expense");
  const [placeOfSupply, setPlaceOfSupply] = useState(COMPANY_BILLING.state);
  const [branchGstin, setBranchGstin] = useState(COMPANY_BILLING.gstNumber);
  const [narration, setNarration] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const defaultItc: ItcClassification = "eligible";
  const [lines, setLines] = useState(() => [emptyDirectLine(defaultItc)]);
  const [additionalExpenses, setAdditionalExpenses] = useState<InvoiceAdditionalExpense[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const addLineRowRef = useRef<(() => void) | null>(null);
  const addChargeRowRef = useRef<(() => void) | null>(null);

  const { data: supplierDetail } = useSupplier(supplierId || null);
  const { data: warehouseDetail } = useWarehouse(warehouseId || null);

  useEffect(() => {
    if (!invoiceId) {
      setHydrating(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setHydrating(true);
      setHydrateError(null);
      try {
        const dto = await PurchaseInvoiceService.getById(invoiceId);
        const record = mapPurchaseInvoiceDetailToRecord(dto);
        if (cancelled) return;
        if (record.sourceType !== "direct_purchase") {
          throw new Error("Only Direct Purchase drafts can be edited.");
        }
        if (String(record.backendStatus || "").toUpperCase() !== "DRAFT") {
          throw new Error("Only DRAFT invoices can be edited.");
        }

        autoFillPlaceOfSupplyRef.current = false;
        autoFillBranchGstinRef.current = false;

        setSupplierId(String(dto.supplier_id || dto.supplier?.supplier_id || ""));
        setWarehouseId(String(dto.warehouse_id || dto.warehouse?.warehouse_id || ""));
        setVendorInvoiceNo(record.vendorInvoiceNo || "");
        setInvoiceDate(record.invoiceDate || new Date().toISOString().slice(0, 10));
        setDueDate(record.dueDate || "");
        setPurchaseNature(record.purchaseNature || "expense");
        setPlaceOfSupply(record.placeOfSupply || COMPANY_BILLING.state);
        setBranchGstin(record.branchGstin || COMPANY_BILLING.gstNumber);
        setNarration(record.narration || record.remarks || "");
        setLines(
          record.directLines?.length
            ? record.directLines
            : [emptyDirectLine(defaultItc)],
        );
        setAdditionalExpenses(
          (record.additionalCharges || []).map((c) => ({
            ...createEmptyAdditionalExpense("manual"),
            id: c.uid || createEmptyAdditionalExpense().id,
            expenseHead: c.chargeName || "",
            amount: c.amount || 0,
            gstApplicable: Boolean(c.gstApplicable) || (c.gstPct || 0) > 0,
            gstPct: c.gstPct || 0,
            remarks: c.remarks || "",
            coaLedgerId: c.ledgerId || null,
            coaLedgerName: c.ledgerName || "",
            hsnId: c.hsnId || null,
            hsnCode: c.hsnCode || null,
            chargeSource: "INVOICE" as const,
          })),
        );
      } catch (e) {
        if (cancelled) return;
        setHydrateError(e instanceof Error ? e.message : "Failed to load draft.");
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  useEffect(() => {
    if (!autoFillBranchGstinRef.current) return;
    const gstin = String(
      (warehouseDetail as { gst_number?: string; gstNumber?: string } | undefined)?.gst_number ||
        (warehouseDetail as { gstNumber?: string } | undefined)?.gstNumber ||
        "",
    ).trim();
    if (gstin) {
      setBranchGstin(gstin);
      return;
    }
    const whState = String(
      (warehouseDetail as { state?: string } | undefined)?.state || "",
    ).trim();
    if (whState) {
      setBranchGstin(COMPANY_BILLING.gstNumber);
      return;
    }
    if (warehouseId) {
      setBranchGstin("");
    }
  }, [warehouseDetail, warehouseId]);

  useEffect(() => {
    if (!autoFillPlaceOfSupplyRef.current) return;
    const supplierState = String(
      (supplierDetail as { state?: string } | undefined)?.state || "",
    ).trim();
    const supplierGstin = String(
      (supplierDetail as { gstin_number?: string; gstinNumber?: string } | undefined)
        ?.gstin_number ||
        (supplierDetail as { gstinNumber?: string } | undefined)?.gstinNumber ||
        "",
    ).trim();
    if (supplierState) {
      setPlaceOfSupply(supplierState);
      return;
    }
    if (supplierGstin) {
      setPlaceOfSupply(stateFromGstin(supplierGstin));
    }
  }, [supplierDetail]);

  const warehouseLocationOk = useMemo(() => {
    if (!warehouseId) return true;
    if (!warehouseDetail) return true;
    const gstin = String(
      (warehouseDetail as { gst_number?: string; gstNumber?: string }).gst_number ||
        (warehouseDetail as { gstNumber?: string }).gstNumber ||
        "",
    ).trim();
    const state = String((warehouseDetail as { state?: string }).state || "").trim();
    return Boolean(gstin || state);
  }, [warehouseDetail, warehouseId]);

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
    if (hydrating) return;
    setLines((prev) =>
      prev.map((l) => recalcDirectLine({ ...l, purchaseNature }, interstate)),
    );
  }, [branchGstin, placeOfSupply, purchaseNature, interstate, hydrating]);

  const totals = useMemo(() => {
    const base = computeDirectPurchaseInvoiceTotals(lines, { roundingAdjustment: 0 });
    const unrounded = roundMoney(base.invoiceTotal + chargeBreakdown.totalAmount);
    const automaticRoundOff = computeAutomaticRoundOff(unrounded);
    return {
      ...base,
      cgst: roundMoney(base.cgst + chargeBreakdown.cgst),
      sgst: roundMoney(base.sgst + chargeBreakdown.sgst),
      igst: roundMoney(base.igst + chargeBreakdown.igst),
      totalGst: roundMoney(base.totalGst + chargeBreakdown.gstAmount),
      invoiceTotal: unrounded,
      netPayable: roundMoney(unrounded + automaticRoundOff - base.tdsDeduction),
      automaticRoundOff,
    };
  }, [lines, chargeBreakdown]);
  const roundingAdjustment = totals.automaticRoundOff;

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
    if (!warehouseLocationOk) {
      setError(
        "Selected warehouse has no state or GSTIN. Update Warehouse Master or choose another warehouse.",
      );
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
    const chargeErr = validateGoodsAdditionalCharges(additionalExpenses);
    if (chargeErr) {
      setError(chargeErr);
      return false;
    }
    return true;
  };

  const buildPayload = (asDraft: boolean) => {
    const additionalCharges = toAdditionalChargePayloadList(
      additionalExpenses,
      "INVOICE",
    );
    return {
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
      save_as_draft: asDraft,
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
    };
  };

  const handleSubmit = async (asDraft: boolean) => {
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
    if (selectedFY?.id) setStoredFYId(selectedFY.id);
    const financialYearId = selectedFY.id || getStoredFYId();
    try {
      const payload = buildPayload(asDraft);

      if (invoiceId) {
        await PurchaseInvoiceService.updateDraftDirectPurchase(invoiceId, payload, {
          financialYearId,
        });
        if (!asDraft) {
          await PurchaseInvoiceService.postDraftDirectPurchase(invoiceId);
        }
      } else {
        await PurchaseInvoiceService.createDirectPurchase(payload, { financialYearId });
      }

      dispatchAccountsDataChanged("purchase-invoices");
      showToast(
        asDraft
          ? invoiceId
            ? "Direct purchase draft updated."
            : "Direct purchase invoice saved as draft."
          : "Direct purchase posted. Supplier outstanding and ledger entries were created.",
      );
      router.replace(listHref);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : asDraft
            ? "Failed to save direct purchase draft."
            : "Post failed.",
      );
      setSaving(false);
    }
  };

  if (hydrating) {
    return (
      <div className="sales-order-invoice-form-compact h-full min-h-0 flex flex-col w-full">
        <InvoiceFormLayout
          title="Edit Direct Purchase Draft"
          subtitle="Accounts → Transactions → Direct Purchase Invoice"
          breadcrumb={accountsBreadcrumb("Transactions", "Edit Draft", listHref)}
          backHref={listHref}
          onBackClick={onCancel}
        >
          <p className="text-sm text-muted-foreground py-8 text-center">Loading draft…</p>
        </InvoiceFormLayout>
      </div>
    );
  }

  if (hydrateError) {
    return (
      <div className="sales-order-invoice-form-compact h-full min-h-0 flex flex-col w-full">
        <InvoiceFormLayout
          title="Edit Direct Purchase Draft"
          subtitle="Accounts → Transactions → Direct Purchase Invoice"
          breadcrumb={accountsBreadcrumb("Transactions", "Edit Draft", listHref)}
          backHref={listHref}
          onBackClick={onCancel}
        >
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {hydrateError}
          </div>
        </InvoiceFormLayout>
      </div>
    );
  }

  return (
    <div className="sales-order-invoice-form-compact h-full min-h-0 flex flex-col w-full">
      <InvoiceFormLayout
        title={isEdit ? "Edit Direct Purchase Draft" : "New Direct Purchase Invoice"}
        subtitle="Accounts → Transactions → Direct Purchase Invoice"
        breadcrumb={accountsBreadcrumb(
          "Transactions",
          isEdit ? "Edit Draft" : "New Direct Purchase",
          listHref,
        )}
        backHref={listHref}
        onBackClick={onCancel}
        stickyFooter={
          <VoucherFormActionBar
            onDiscard={onCancel}
            onSaveDraft={() => void handleSubmit(true)}
            onSaveAndPost={() => void handleSubmit(false)}
            saveAndPostLabel="Post Invoice"
            discardDisabled={saving}
            saveDraftDisabled={saving}
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
                    onSupplierSelect={(id) => {
                      autoFillPlaceOfSupplyRef.current = true;
                      setSupplierId(id);
                    }}
                    className={INVOICE_DETAIL_SELECT_CLASS}
                  />
                </InvoiceDetailField>
                <InvoiceDetailField label="Warehouse / Branch" required>
                  <DirectPurchaseSelectField
                    hideLabel
                    value={warehouseId}
                    onChange={(id) => {
                      autoFillBranchGstinRef.current = true;
                      setWarehouseId(id);
                    }}
                    options={warehouseOptions}
                    placeholder="Select warehouse…"
                    searchPlaceholder="Search warehouses…"
                    className={INVOICE_DETAIL_SELECT_CLASS}
                  />
                  {warehouseId && warehouseDetail && !warehouseLocationOk ? (
                    <p className="mt-1 text-[11px] text-red-600 leading-snug">
                      This warehouse has no state or GSTIN. Update it in Masters or pick another warehouse.
                    </p>
                  ) : null}
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
                additionalChargeTotal={chargeBreakdown.taxableAmount}
              />
            </VoucherFormSectionCard>
          </div>

          <p className="text-[11px] text-muted-foreground px-0.5">
            Posting creates supplier outstanding (Purchase Payable) and books GST automatically.
            Round off is calculated automatically from the invoice total and posted to Round Off Adjustment.
          </p>
        </div>
      </InvoiceFormLayout>
    </div>
  );
}
