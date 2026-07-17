"use client";



import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { AlertCircle, CheckCircle2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";

import { DirectPurchaseSupplierSection } from "./DirectPurchaseSupplierSection";

import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";

import { COMPANY_BILLING } from "@/lib/procurement/config";

import {

  vendorMasterToTransactionFields,

  type VendorTransactionFields,

} from "@/lib/accounts/transaction-master-fetch";

import { useCoaRecords } from "@/lib/accounts/use-coa-records";

import { resolveTdsPayableLedger } from "@/lib/accounts/tds-accounting";

import {

  formatTdsRateDisplay,

  getActiveTDSMasters,

  getTdsSectionCode,

} from "@/app/(app)/masters/tds/tds-data";
import { cn } from "@/lib/utils";
import {
  checkDuplicateSupplierInvoice,

  getPurchaseInvoiceApprovalStatus,

  getPurchaseInvoiceById,

  getVendorsForPurchaseDropdown,

  postDirectPurchaseInvoice,

  saveDirectPurchaseDraft,

  type DirectPurchaseLineItem,

  type ItcClassification,

  type PurchaseNature,

} from "./purchase-invoices-data";

import {

  INDIAN_STATE_OPTIONS,

  PURCHASE_NATURE_LABELS,

  computeDirectPurchaseInvoiceTotals,

  emptyDirectLine,

  isInterstatePurchase,

  ledgerMatchesPurchaseNature,

  recalcDirectLine,

  roundMoney,

  stateFromGstin,

} from "./purchase-invoice-direct-utils";

import { PurchaseInvoiceAttachmentField } from "./PurchaseInvoiceAttachmentField";

import { PurchaseInvoiceDirectTotals } from "./PurchaseInvoiceDirectTotals";

import { PurchaseInvoiceDirectLineTable } from "./PurchaseInvoiceDirectLineTable";

import { PurchaseInvoiceDirectTaxCompliance } from "./PurchaseInvoiceDirectTaxCompliance";

import { DirectPurchaseSelectField } from "./DirectPurchaseSelectField";

import {

  BRANCH_GSTIN_OPTIONS,

  DP_FIELD_CLASS,

  DP_FORM_STACK,

  DP_HEADER_FIELD_CLASS,

  DP_HEADER_ROW_CLASS,

  DP_HEADER_SECTION_CLASS,

  DP_ITEMS_SECTION_CLASS,

  DP_LABEL_CLASS,

  withCustomBranchGstinOption,

} from "./direct-purchase-form-ui";

import type { AutocompleteOption } from "@/components/ui/AutocompleteSelect";

import type { PurchaseAttachment } from "./purchase-invoices-data";



function parseTdsRate(rate: string): number {

  const n = Number(rate);

  return Number.isFinite(n) ? n : 0;

}



function initLinesFromExisting(

  existing: ReturnType<typeof getPurchaseInvoiceById> | null | undefined,

  defaultItc: ItcClassification,

): DirectPurchaseLineItem[] {

  if (existing?.directLines?.length) return existing.directLines;

  return [emptyDirectLine(defaultItc)];

}



export function PurchaseInvoiceDirectForm({

  invoiceId,

  onCancel,

  showToast,

}: {

  invoiceId?: number;

  onCancel: () => void;

  showToast: (msg: string) => void;

}) {

  const router = useRouter();

  const vendors = useMemo(() => getVendorsForPurchaseDropdown(), []);

  const coaRecords = useCoaRecords();

  const [savedInvoiceId, setSavedInvoiceId] = useState<number | undefined>(invoiceId);

  const effectiveInvoiceId = savedInvoiceId ?? invoiceId;

  const existing = useMemo(

    () => (effectiveInvoiceId ? getPurchaseInvoiceById(effectiveInvoiceId) : null),

    [effectiveInvoiceId],

  );



  const defaultItc = (existing?.defaultItcClassification ?? "eligible") as ItcClassification;



  const [vendorId, setVendorId] = useState(existing?.vendorId?.toString() ?? "");

  const [vendorFields, setVendorFields] = useState<VendorTransactionFields | null>(() => {

    if (!existing?.vendorId) return null;

    const v = vendors.find((x) => x.id === existing.vendorId);

    return v ? vendorMasterToTransactionFields(v) : null;

  });

  const [vendorInvoiceNo, setVendorInvoiceNo] = useState(existing?.vendorInvoiceNo ?? "");

  const [invoiceDate, setInvoiceDate] = useState(

    existing?.invoiceDate ?? new Date().toISOString().slice(0, 10),

  );

  const [postingDate, setPostingDate] = useState(

    existing?.postingDate ?? new Date().toISOString().slice(0, 10),

  );

  const [purchaseNature, setPurchaseNature] = useState<PurchaseNature>(

    existing?.purchaseNature ?? "expense",

  );

  const [placeOfSupply, setPlaceOfSupply] = useState(

    existing?.placeOfSupply || stateFromGstin(existing?.vendorGst) || COMPANY_BILLING.state,

  );

  const [branchGstin, setBranchGstin] = useState(existing?.branchGstin ?? COMPANY_BILLING.gstNumber);

  const [roundingAdjustment, setRoundingAdjustment] = useState(existing?.roundingAdjustment ?? 0);

  const [attachment, setAttachment] = useState<PurchaseAttachment | null>(existing?.attachment ?? null);



  const [lines, setLines] = useState<DirectPurchaseLineItem[]>(() =>

    initLinesFromExisting(existing, defaultItc),

  );



  const [reverseCharge, setReverseCharge] = useState(existing?.reverseChargeApplicable ?? false);

  const [rcmCgst, setRcmCgst] = useState(existing?.rcmCgst ?? 0);

  const [rcmSgst, setRcmSgst] = useState(existing?.rcmSgst ?? 0);

  const [rcmIgst, setRcmIgst] = useState(existing?.rcmIgst ?? 0);



  const [invoiceTds, setInvoiceTds] = useState(existing?.tdsApplicable ?? false);

  const [tdsSectionMasterId, setTdsSectionMasterId] = useState<number | null>(

    existing?.tdsSectionMasterId ?? null,

  );

  const [tdsSection, setTdsSection] = useState(() => {

    if (!existing?.tdsSectionMasterId) return "";

    const master = getActiveTDSMasters().find((t) => t.id === existing.tdsSectionMasterId);

    return master ? getTdsSectionCode(master) : "";

  });

  const [tdsRate, setTdsRate] = useState(() => {

    if (!existing?.tdsSectionMasterId) return 0;

    const master = getActiveTDSMasters().find((t) => t.id === existing.tdsSectionMasterId);

    return master ? parseTdsRate(master.tdsRate) : 0;

  });

  const [tdsBaseAmount, setTdsBaseAmount] = useState(existing?.tdsBaseAmount ?? 0);

  const [tdsAmount, setTdsAmount] = useState(existing?.tdsDeduction ?? 0);

  const [tdsLedgerId, setTdsLedgerId] = useState<number | null>(existing?.tdsLedgerId ?? null);

  const [tdsLedgerName, setTdsLedgerName] = useState(existing?.tdsLedgerName ?? "");



  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);

  const [dupHint, setDupHint] = useState("");



  const interstate = isInterstatePurchase(branchGstin, placeOfSupply);



  useEffect(() => {

    setLines((prev) =>

      prev.map((l) => {

        const recalculated = recalcDirectLine({ ...l, purchaseNature }, interstate);

        if (!recalculated.expenseLedgerId) return recalculated;

        const ledger = coaRecords.find((r) => r.id === recalculated.expenseLedgerId);

        if (ledger && ledgerMatchesPurchaseNature(ledger, purchaseNature, coaRecords)) {

          return recalculated;

        }

        return { ...recalculated, expenseLedgerId: null, expenseLedgerName: "" };

      }),

    );

  }, [branchGstin, placeOfSupply, purchaseNature, interstate, coaRecords]);



  useEffect(() => {

    if (!invoiceTds) {

      setTdsSectionMasterId(null);

      setTdsSection("");

      setTdsRate(0);

      setTdsBaseAmount(0);

      setTdsAmount(0);

      setTdsLedgerId(null);

      setTdsLedgerName("");

    }

  }, [invoiceTds]);



  useEffect(() => {

    if (!reverseCharge) {

      setRcmCgst(0);

      setRcmSgst(0);

      setRcmIgst(0);

    }

  }, [reverseCharge]);



  const lineOnlyTotals = useMemo(

    () => computeDirectPurchaseInvoiceTotals(lines, { roundingAdjustment: 0 }),

    [lines],

  );



  useEffect(() => {

    if (invoiceTds && tdsRate > 0) {

      const base = tdsBaseAmount > 0 ? tdsBaseAmount : lineOnlyTotals.taxableAmount;

      if (tdsBaseAmount <= 0) setTdsBaseAmount(base);

      setTdsAmount(roundMoney((base * tdsRate) / 100));

    }

  }, [invoiceTds, tdsRate, tdsBaseAmount, lineOnlyTotals.taxableAmount]);



  useEffect(() => {

    if (reverseCharge) {

      setRcmCgst(lineOnlyTotals.cgst);

      setRcmSgst(lineOnlyTotals.sgst);

      setRcmIgst(lineOnlyTotals.igst);

    }

  }, [reverseCharge, lineOnlyTotals.cgst, lineOnlyTotals.sgst, lineOnlyTotals.igst]);



  const totals = useMemo(

    () =>

      computeDirectPurchaseInvoiceTotals(lines, {

        roundingAdjustment,

        invoiceTdsApplicable: invoiceTds,

        invoiceTdsAmount: tdsAmount,

      }),

    [lines, roundingAdjustment, invoiceTds, tdsAmount],

  );



  const gstApplicable = lines.some((l) => l.gstRate > 0 || l.cgst + l.sgst + l.igst > 0);

  useEffect(() => {

    if (!vendorId || !vendorInvoiceNo.trim()) {

      setDupHint("");

      return;

    }

    const v = vendors.find((x) => x.id === Number(vendorId));

    const msg = checkDuplicateSupplierInvoice({

      vendorId: Number(vendorId),

      vendorGst: v?.gstNumber ?? vendorFields?.vendorGst ?? "",

      vendorInvoiceNo,

      excludeId: effectiveInvoiceId,

    });

    setDupHint(msg ?? "");

  }, [vendorId, vendorInvoiceNo, vendorFields?.vendorGst, vendors, effectiveInvoiceId]);



  const onVendorSelect = (id: string, fields: VendorTransactionFields | null) => {

    setVendorId(id);

    setVendorFields(fields);

    if (fields?.vendorGst) {

      setPlaceOfSupply(stateFromGstin(fields.vendorGst));

    }

  };



  const purchaseNatureOptions = useMemo<AutocompleteOption[]>(

    () =>

      (Object.keys(PURCHASE_NATURE_LABELS) as PurchaseNature[]).map((k) => ({

        value: k,

        label: PURCHASE_NATURE_LABELS[k],

      })),

    [],

  );



  const tdsSectionOptions = useMemo<AutocompleteOption[]>(

    () =>

      getActiveTDSMasters().map((t) => ({

        value: String(t.id),

        label: `${getTdsSectionCode(t)} — ${t.sectionName}`,

        sublabel: formatTdsRateDisplay(t.tdsRate),

        searchText: `${getTdsSectionCode(t)} ${t.sectionName}`,

      })),

    [],

  );



  const placeOfSupplyOptions = useMemo<AutocompleteOption[]>(

    () => INDIAN_STATE_OPTIONS.map((s) => ({ value: s, label: s })),

    [],

  );



  const branchGstinOptions = useMemo(

    () => withCustomBranchGstinOption(branchGstin, BRANCH_GSTIN_OPTIONS),

    [branchGstin],

  );



  const handleTdsSectionSelect = (masterIdStr: string) => {

    const masterId = Number(masterIdStr);

    const master = getActiveTDSMasters().find((t) => t.id === masterId);

    if (!master) return;

    const rate = parseTdsRate(master.tdsRate);

    const ledger = resolveTdsPayableLedger(masterId);

    const base = tdsBaseAmount > 0 ? tdsBaseAmount : lineOnlyTotals.taxableAmount;

    setTdsSectionMasterId(masterId);

    setTdsSection(getTdsSectionCode(master));

    setTdsRate(rate);

    setTdsBaseAmount(base);

    setTdsAmount(roundMoney((base * rate) / 100));

    if (ledger) {

      setTdsLedgerId(ledger.id);

      setTdsLedgerName(ledger.accountName);

    }

  };



  const buildInput = () => {

    const creditDays = vendorFields?.creditDays ?? 30;

    const paymentTerms = vendorFields?.paymentTerms ?? "Net 30";

    const due = new Date(invoiceDate);

    due.setDate(due.getDate() + creditDays);



    const directLines = lines.map((l) => ({

      ...l,

      purchaseNature,

      tdsApplicable: false,

      tdsSection: "",

      tdsRate: 0,

      tdsAmount: 0,

    }));



    return {

      vendorId: Number(vendorId),

      vendorInvoiceNo,

      invoiceDate,

      postingDate,

      purchaseNature,

      placeOfSupply,

      branchGstin,

      reverseChargeApplicable: reverseCharge,

      defaultItcClassification: defaultItc,

      paymentTerms,

      creditDays,

      dueDate: due.toISOString().slice(0, 10),

      currency: "INR",

      referenceNumber: "",

      narration: "",

      gstApplicable,

      rcmCgst: reverseCharge ? rcmCgst : 0,

      rcmSgst: reverseCharge ? rcmSgst : 0,

      rcmIgst: reverseCharge ? rcmIgst : 0,

      tdsApplicable: invoiceTds,

      tdsSectionMasterId,

      tdsBaseAmount: invoiceTds ? tdsBaseAmount : 0,

      tdsAmount: invoiceTds ? tdsAmount : 0,

      tdsLedgerId,

      tdsLedgerName,

      allowMixedGst: false,

      roundingAdjustment,

      directLines,

      attachment,

      workflow: existing?.workflow,

    };

  };



  const validate = (): boolean => {

    if (!vendorId) {

      setError("Select a supplier from Supplier Master.");

      return false;

    }

    if (!vendorInvoiceNo.trim()) {

      setError("Supplier invoice number is required.");

      return false;

    }

    if (dupHint) {

      setError(dupHint);

      return false;

    }

    if (!attachment) {

      setError("Supplier invoice attachment is mandatory.");

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

    if (lines.some((l) => !l.expenseLedgerId)) {

      setError("Select a ledger for each line item.");

      return false;

    }

    if (lines.some((l) => l.taxableAmount <= 0)) {

      setError("Each line must have a taxable amount greater than zero.");

      return false;

    }

    if (invoiceTds) {

      if (!tdsSection.trim()) {

        setError("TDS section is required when TDS is applicable.");

        return false;

      }

      if (tdsRate <= 0) {

        setError("TDS rate is required when TDS is applicable.");

        return false;

      }

      if (tdsBaseAmount <= 0) {

        setError("TDS base amount is required when TDS is applicable.");

        return false;

      }

      if (tdsAmount <= 0) {

        setError("TDS amount is required when TDS is applicable.");

        return false;

      }

      if (!tdsLedgerId) {

        setError("TDS ledger is required when TDS is applicable.");

        return false;

      }

    }

    if (totals.invoiceTotal <= 0) {

      setError("Invoice total must be greater than zero.");

      return false;

    }

    return true;

  };



  const handleSaveDraft = () => {

    if (!validate()) return;

    setSaving(true);

    setError("");

    try {

      const rec = saveDirectPurchaseDraft(effectiveInvoiceId ?? null, buildInput());

      setSavedInvoiceId(rec.id);

      dispatchAccountsDataChanged("purchase-invoices");

      showToast("Draft saved");

      router.push(`/accounts/purchase-invoices/${rec.id}`);

    } catch (e) {

      setError(e instanceof Error ? e.message : "Save failed.");

    } finally {

      setSaving(false);

    }

  };



  const handlePost = () => {

    if (!validate()) return;

    setSaving(true);

    setError("");

    try {

      const draft = saveDirectPurchaseDraft(effectiveInvoiceId ?? null, buildInput());

      setSavedInvoiceId(draft.id);

      const rec = postDirectPurchaseInvoice(draft.id, buildInput());

      dispatchAccountsDataChanged("purchase-invoices");

      showToast(
        getPurchaseInvoiceApprovalStatus(rec) === "pending_approval"
          ? "Submitted for approval"
          : "Invoice posted",
      );

      router.push(`/accounts/purchase-invoices/${rec.id}`);

    } catch (e) {

      const errMsg = e instanceof Error ? e.message : "Post failed.";
      setError(errMsg);

    } finally {

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



      {dupHint && !error && (

        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex-shrink-0">

          <AlertCircle className="w-4 h-4 flex-shrink-0" />

          {dupHint}

        </div>

      )}



      {/* Compact single-row header */}

      <div className={DP_HEADER_SECTION_CLASS}>

        <div className={DP_HEADER_ROW_CLASS}>

          <div className={cn(DP_HEADER_FIELD_CLASS, "min-w-[220px] flex-[1.6]")}>

            <DirectPurchaseSupplierSection

              vendors={vendors}

              vendorId={vendorId}

              onVendorSelect={onVendorSelect}

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

            <Label className={DP_LABEL_CLASS}>Posting Date</Label>

            <AccountsDateInput value={postingDate} onChange={setPostingDate} className={DP_FIELD_CLASS} />

          </div>

          <div className={cn(DP_HEADER_FIELD_CLASS, "w-[150px]")}>

            <DirectPurchaseSelectField

              label="Branch GSTIN"

              value={branchGstin}

              onChange={setBranchGstin}

              options={branchGstinOptions}

              placeholder="GSTIN…"

              searchPlaceholder="Search…"

            />

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

          <div className={cn(DP_HEADER_FIELD_CLASS, "min-w-[160px] flex-1")}>

            <Label className={DP_LABEL_CLASS}>Upload Invoice *</Label>

            <PurchaseInvoiceAttachmentField

              attachment={attachment}

              onChange={setAttachment}

              required

            />

          </div>

        </div>

      </div>



      {/* Line items */}
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
          coaRecords={coaRecords}
        />
        <div className="flex justify-end border-t border-border/60 px-2 py-2">
          <PurchaseInvoiceDirectTotals
            totals={totals}
            roundingAdjustment={roundingAdjustment}
            onRoundingChange={setRoundingAdjustment}
          />
        </div>
      </div>

      {/* Tax compliance */}
      <PurchaseInvoiceDirectTaxCompliance

          gstApplicable={gstApplicable}

          reverseCharge={reverseCharge}

          onReverseChargeChange={setReverseCharge}

          rcmCgst={rcmCgst}

          rcmSgst={rcmSgst}

          rcmIgst={rcmIgst}

          onRcmCgstChange={setRcmCgst}

          onRcmSgstChange={setRcmSgst}

          onRcmIgstChange={setRcmIgst}

          invoiceTds={invoiceTds}

          onInvoiceTdsChange={setInvoiceTds}

          tdsSectionMasterId={tdsSectionMasterId}

          onTdsSectionSelect={handleTdsSectionSelect}

          tdsSectionOptions={tdsSectionOptions}

          tdsRate={tdsRate}

          onTdsRateChange={(rate, amount) => {

            setTdsRate(rate);

            setTdsAmount(amount);

          }}

          tdsBaseAmount={tdsBaseAmount}

          onTdsBaseAmountChange={(base, amount) => {

            setTdsBaseAmount(base);

            setTdsAmount(amount);

          }}

          tdsAmount={tdsAmount}

          onTdsAmountChange={setTdsAmount}

          tdsLedgerId={tdsLedgerId}

          tdsLedgerName={tdsLedgerName}

          onTdsLedgerChange={(id, name) => {

            setTdsLedgerId(id);

            setTdsLedgerName(name);

          }}

          lineTaxableAmount={lineOnlyTotals.taxableAmount}
      />

      <div className="flex items-center gap-2 pt-1 border-t border-border">

        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onCancel}>

          Cancel

        </Button>

        <Button

          type="button"

          variant="outline"

          size="sm"

          className="h-8 text-xs gap-1.5"

          disabled={saving}

          onClick={handleSaveDraft}

        >

          <Save className="w-3.5 h-3.5" />

          Save Draft

        </Button>

        <Button

          type="button"

          size="sm"

          className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"

          disabled={saving || Boolean(dupHint)}

          onClick={handlePost}

        >

          <CheckCircle2 className="w-3.5 h-3.5" />

          Post Invoice

        </Button>

      </div>

    </div>

  );
}
