"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useFormDirtySnapshot } from "@/lib/accounts/use-form-dirty-snapshot";
import { useTransactionFormCancel } from "@/components/accounts/TransactionFormCancel";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { SearchableSelect } from "../credit-notes/components/SearchableSelect";
import {
  buildReferenceFromPurchaseInvoice,
  buildReferenceFromPurchaseReturn,
  createEmptyDebitLine,
  getPendingDebitNoteRow,
  listCreditablePurchaseInvoices,
  listPurchaseReturnsForDebitNote,
  newDebitAttachmentId,
  normalizeDebitLine,
  peekNextDebitNoteNo,
  previewToDebitForm,
  getDebitLineMaxQty,
  calcDebitFromQty,
  type DebitNoteAttachment,
  type DebitNoteLine,
  type DebitReferencePreview,
  type NoteWorkflowStatus,
} from "./debit-notes-data";
import { DEBIT_NOTES_BREADCRUMB, DEBIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { DebitNoteService, mapDebitNoteToRecord } from "@/services/debit-note.service";
import { SupplierService } from "@/services/supplier.service";
import { type ChartOfAccount } from "@/app/(app)/accounts/data";
import { WarehouseService } from "@/services/warehouse.service";
import { UserListService } from "@/services/user-list.service";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { roundMoney } from "@/lib/accounts/money-format";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { VoucherGstSummaryCard } from "@/components/accounts/voucher-form/VoucherGstSummaryCard";
import { VoucherSignedRoundOffInput } from "@/components/accounts/voucher-form/VoucherSignedRoundOffInput";
import { VoucherAccountingPostingSummary } from "@/components/accounts/voucher-form/VoucherAccountingPostingSummary";
import { AccountingImpactSection } from "@/components/accounts/AccountingImpactSection";
import { VoucherNarrationAttachmentsSection } from "@/components/accounts/voucher-form/VoucherNarrationAttachmentsSection";
import {
  VoucherNoteField,
  VoucherNoteFieldGrid,
  VoucherNoteReadOnly,
} from "@/components/accounts/voucher-form/VoucherNoteFieldGrid";
import { VoucherFormActionBar } from "@/components/accounts/voucher-form/VoucherFormActionBar";
import { VoucherNoteSegmentControl } from "@/components/accounts/voucher-form/VoucherNoteSegmentControl";
import {
  NoteParticularsTable,
  computeNoteParticularTotals,
} from "@/components/accounts/voucher-form/NoteParticularsTable";
import { NoteReferenceDocumentDetails } from "@/components/accounts/voucher-form/NoteReferenceDocumentDetails";
import { NoteQuantityLinesTable } from "@/components/accounts/voucher-form/NoteQuantityLinesTable";
import { mapNoteLineToQuantityView } from "@/components/accounts/voucher-form/note-quantity-line-map";
import {
  NoteInventoryImpactBanner,
  NoteNoInventoryImpactBanner,
} from "@/components/accounts/voucher-form/NoteScenarioBanners";
import { LedgerHierarchySelect } from "@/components/accounts/LedgerHierarchySelect";
import {
  adaptPurchaseInvoiceReference,
  adaptPurchaseReturnReference,
} from "@/components/accounts/voucher-form/note-reference-model";
import { defaultVisibilityForType } from "@/components/accounts/voucher-form/voucher-form-shell";
import "@/components/accounts/voucher-form/note-form-compact.css";
import {
  vendorMasterToTransactionFields,
  getActiveVendorsForTransaction,
  type VendorTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import { getPurchaseInvoiceById } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { resolveWarehouseFromGrnNo } from "@/lib/accounts/bank-warehouse-mapping";
import { WarehouseMappedBankAccountSelect } from "@/components/accounts/WarehouseMappedBankAccountSelect";
import { LedgerService } from "@/services/ledger.service";
import "../credit-notes/credit-note-tx.css";

type FormMode = "fresh" | "return" | "purchase_invoice";
type UiRefType = "direct" | "purchase_invoice" | "purchase_return";
type InvoiceAdjustmentBasis = "quantity" | "amount";

const REF_TYPE_OPTIONS: { value: UiRefType; label: string }[] = [
  { value: "direct", label: "Direct" },
  { value: "purchase_invoice", label: "Purchase Invoice" },
  { value: "purchase_return", label: "Purchase Return" },
];

const INVOICE_BASIS_OPTIONS: { value: InvoiceAdjustmentBasis; label: string }[] = [
  { value: "amount", label: "Amount" },
  { value: "quantity", label: "Quantity" },
];

export default function DebitNoteFormPageClient({
  debitNoteId,
  returnId,
  purchaseInvoiceId,
  mode,
}: {
  debitNoteId?: number;
  returnId?: number;
  purchaseInvoiceId?: number;
  mode?: FormMode;
}) {
  const router = useRouter();
  const { toast, showToast, dismissToast } = useAccountsToast();
  const isEdit = debitNoteId != null;
  const isFresh = !isEdit && mode === "fresh";
  const isReturn = !isEdit && (mode === "return" || returnId != null);
  const isPurchaseInvoice =
    !isEdit && (mode === "purchase_invoice" || purchaseInvoiceId != null);

  const mapSupplierToTransactionFields = (s: any): VendorTransactionFields => {
    const parts = [s.address_1, s.address_2, s.town, s.city, s.state, s.pincode];
    const address = parts.filter(Boolean).join(", ");
    const gstRegistered = !!(s.gst_registered && s.gstin_number?.trim());
    const formattedAddress = address || s.registered_gst_address || "";

    return {
      vendorId: s.supplier_id,
      vendorCode: s.supplier_code,
      vendorName: s.supplier_name,
      vendorMobile: s.mobile_number ? `${s.mobile_country_code || "+91"} ${s.mobile_number}` : "",
      vendorEmail: s.email || "",
      vendorGst: gstRegistered ? s.gstin_number : "",
      vendorGstCategory: s.registration_type || undefined,
      pan: s.pan_number || "",
      contactPerson: s.contact_person || "",
      paymentTerms: "Net 30",
      creditDays: 30,
      payableLedger: s.supplier_name,
      billingAddress: formattedAddress,
      shippingAddress: formattedAddress,
      bankName: "",
      bankBranch: "",
      accountNumber: "",
      ifscCode: "",
      accountHolderName: s.supplier_name,
      billToOptions: [
        {
          id: "bill-0",
          label: `${s.supplier_name} - Registered Office`,
          address: s.address_1 || "",
          city: s.city || "",
          state: s.state || "",
          pincode: s.pincode || "",
          formatted: formattedAddress,
        },
      ],
      shipToOptions: [
        {
          id: "ship-0",
          label: `${s.supplier_name} - Delivery Address`,
          address: s.address_1 || "",
          city: s.city || "",
          state: s.state || "",
          pincode: s.pincode || "",
          formatted: formattedAddress,
        },
      ],
      defaultBillToId: "bill-0",
      defaultShipToId: "ship-0",
    };
  };

  const [vendors, setVendors] = useState<any[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<any[]>([]);
  const [warehouseList, setWarehouseList] = useState<any[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    SupplierService.dropdown().then(setVendors).catch(() => {});
    setPurchaseInvoices(listCreditablePurchaseInvoices());
    setPurchaseReturns(listPurchaseReturnsForDebitNote());

    WarehouseService.dropdown().then(setWarehouseList).catch(() => {});
    DebitNoteService.getConfig().then((cfg) => setApprovalRequired(cfg.approval_required)).catch(() => {});
  }, []);

  const [uiRefType, setUiRefType] = useState<UiRefType>(() => {
    if (isFresh || (!isReturn && !isPurchaseInvoice)) return "direct";
    if (isReturn) return "purchase_return";
    if (isPurchaseInvoice) return "purchase_invoice";
    return "direct";
  });

  const isSourceRefMode =
    uiRefType === "purchase_invoice" || uiRefType === "purchase_return";
  const isDirectMode = uiRefType === "direct";
  const [invoiceAdjustmentBasis, setInvoiceAdjustmentBasis] =
    useState<InvoiceAdjustmentBasis>("amount");
  const isReturnRefMode = uiRefType === "purchase_return";
  const isInvoiceQtyMode =
    uiRefType === "purchase_invoice" && invoiceAdjustmentBasis === "quantity";
  const isInvoiceAmountMode =
    uiRefType === "purchase_invoice" && invoiceAdjustmentBasis === "amount";
  const usesQuantityLines = isReturnRefMode || isInvoiceQtyMode;

  const [particular, setParticular] = useState("");
  const [particularQty, setParticularQty] = useState("1");
  const [particularRate, setParticularRate] = useState("");
  const [referenceInvoiceId, setReferenceInvoiceId] = useState("");
  const [referenceReturnId, setReferenceReturnId] = useState("");

  const [debitNoteNo, setDebitNoteNo] = useState("");
  const [debitNoteDate, setDebitNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendorId, setVendorId] = useState("");
  const [vendorFields, setVendorFields] = useState<VendorTransactionFields | null>(null);
  const [billToId, setBillToId] = useState("");
  const [shipToId, setShipToId] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [referencePreview, setReferencePreview] = useState<DebitReferencePreview | null>(null);
  const [sourceInvoiceId, setSourceInvoiceId] = useState<number | null>(null);
  const [sourcePoId, setSourcePoId] = useState<number | null>(null);
  const [sourceReturnId, setSourceReturnId] = useState("");
  const [sourceReturnNo, setSourceReturnNo] = useState("");
  const [sourcePackingNo, setSourcePackingNo] = useState("");
  const [sourceDispatchNo, setSourceDispatchNo] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [alreadyAdjusted, setAlreadyAdjusted] = useState("0");
  const [lines, setLines] = useState<DebitNoteLine[]>([]);
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState<DebitNoteAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bankAccountId, setBankAccountId] = useState<number | null>(null);
  const [roundOff, setRoundOff] = useState(0);

  const [referenceNo, setReferenceNo] = useState("");
  const [adjustmentLedgerId, setAdjustmentLedgerId] = useState<string | number | null>(null);
  const [adjustmentLedgerName, setAdjustmentLedgerName] = useState("");
  const [gstApplicable, setGstApplicable] = useState(false);
  const [gstPct, setGstPct] = useState("18");
  const [narration, setNarration] = useState("");

  const vendorLocked = Boolean(referencePreview) || isReturn || isPurchaseInvoice;
  const refControlsLocked = isReturn || isPurchaseInvoice;
  const alreadyAdjustedNum = parseFloat(alreadyAdjusted) || 0;

  const purchaseInvoiceOptions = useMemo(
    () =>
      purchaseInvoices.map((inv) => ({
        value: String(inv.id),
        label: inv.invoiceNo,
        sub: `${inv.vendorName} · ${inv.invoiceDate} · ${formatINR(inv.grandTotal)}`,
      })),
    [purchaseInvoices],
  );

  const purchaseReturnOptions = useMemo(
    () =>
      purchaseReturns.map((ret) => ({
        value: String(ret.id),
        label: ret.returnNumber,
        sub: `${ret.supplierName} · ${ret.returnDate} · PO ${ret.poNumber}`,
      })),
    [purchaseReturns],
  );

  const onVendorChange = (id: string, fields: VendorTransactionFields | null) => {
    setVendorId(id);
    if (!fields) {
      setVendorFields(null);
      return;
    }
    setVendorFields(fields);
    setBillToId(fields.defaultBillToId);
    setShipToId(fields.defaultShipToId);
    setBillingAddress(fields.billingAddress);
    setShippingAddress(fields.shippingAddress);
  };

  const clearReference = () => {
    if (isReturn || isPurchaseInvoice) return;
    setReferencePreview(null);
    setSourceInvoiceId(null);
    setSourcePoId(null);
    setSourceReturnId("");
    setSourceReturnNo("");
    setSourcePackingNo("");
    setSourceDispatchNo("");
    setOriginalAmount("");
    setAlreadyAdjusted("0");
    setLines([]);
  };

  const prefillParticularsFromPreview = (preview: DebitReferencePreview, fallbackName: string) => {
    if (!particular.trim()) {
      setParticular(preview.lineItems[0]?.productName || fallbackName);
    }
    const first = preview.lineItems[0];
    if (first && !particularRate.trim()) {
      const qty =
        (first.purchaseReturnQty && first.purchaseReturnQty > 0
          ? first.purchaseReturnQty
          : first.eligibleReturnQty && first.eligibleReturnQty > 0
            ? first.eligibleReturnQty
            : first.invoiceQty) || 1;
      setParticularQty(String(qty));
      setParticularRate(String(first.unitPrice || ""));
      const gstOn = (first.taxPct || 0) > 0 || (first.gstAmount || 0) > 0;
      setGstApplicable(gstOn);
      if (gstOn && first.taxPct > 0) setGstPct(String(first.taxPct));
    }
  };

  /** Reference preview is display-only — do not load editable source lines by default. */
  const applyPreview = (
    preview: DebitReferencePreview,
    retId: number,
    retNo: string,
    loadLines = false,
  ) => {
    setReferencePreview(preview);
    const pre = previewToDebitForm(preview);
    setSourceInvoiceId(pre.sourceInvoiceId ?? null);
    setSourcePoId(pre.sourcePoId ?? null);
    setSourceReturnId(String(retId));
    setSourceReturnNo(retNo);
    setSourcePackingNo(preview.sourcePackingNo ?? "");
    setSourceDispatchNo(preview.sourceDispatchNo ?? "");
    if (pre.vendorId || preview.vendorName) {
      const name = preview.vendorName || "";
      const v = vendors.find((x) => x.supplier_name?.toLowerCase() === name.toLowerCase());
      if (v) {
        SupplierService.view(v.supplier_id)
          .then((supplier) => {
            onVendorChange(v.supplier_id, mapSupplierToTransactionFields(supplier));
          })
          .catch(() => {});
      } else {
        setVendorId(String(pre.vendorId || ""));
      }
    }
    setOriginalAmount(String(pre.originalAmount ?? ""));
    setAlreadyAdjusted(String(pre.alreadyAdjustedAmount ?? 0));
    if (loadLines && pre.lineItems?.length) {
      // Purchase return: lock qty to returned quantity and compute debit amounts.
      setLines(
        pre.lineItems.map((l) => {
          const retQty =
            (l.purchaseReturnQty && l.purchaseReturnQty > 0
              ? l.purchaseReturnQty
              : l.eligibleReturnQty && l.eligibleReturnQty > 0
                ? l.eligibleReturnQty
                : l.returnQty) || 0;
          const updated = normalizeDebitLine({ ...l, returnQty: retQty });
          return normalizeDebitLine({
            ...updated,
            debitAmount: calcDebitFromQty(updated),
          });
        }),
      );
    } else {
      setLines([]);
    }
  };

  const applyPurchaseInvoicePreview = (
    preview: DebitReferencePreview,
    invoiceId: number,
    loadLines = false,
  ) => {
    setReferencePreview(preview);
    const pre = previewToDebitForm(preview);
    setSourceInvoiceId(pre.sourceInvoiceId ?? invoiceId);
    setSourcePoId(pre.sourcePoId ?? null);
    setSourceReturnId("");
    setSourceReturnNo("");
    setSourcePackingNo(preview.sourcePackingNo ?? "");
    setSourceDispatchNo(preview.sourceDispatchNo ?? "");
    if (pre.vendorId || preview.vendorName) {
      const name = preview.vendorName || "";
      const v = vendors.find((x) => x.supplier_name?.toLowerCase() === name.toLowerCase());
      if (v) {
        SupplierService.view(v.supplier_id)
          .then((supplier) => {
            onVendorChange(v.supplier_id, mapSupplierToTransactionFields(supplier));
          })
          .catch(() => {});
      } else {
        setVendorId(String(pre.vendorId || ""));
      }
    }
    setOriginalAmount(String(pre.originalAmount ?? ""));
    setAlreadyAdjusted(String(pre.alreadyAdjustedAmount ?? 0));
    if (loadLines && pre.lineItems?.length) {
      // Invoice quantity mode: load product rows with blank qty (user enters debit qty).
      setLines(
        pre.lineItems.map((l) =>
          normalizeDebitLine({ ...l, returnQty: 0, debitAmount: 0 }),
        ),
      );
    } else {
      setLines([]);
    }
  };

  const onPurchaseInvoiceSelect = (id: string) => {
    setReferenceInvoiceId(id);
    setReferenceReturnId("");
    if (!id) {
      clearReference();
      return;
    }
    const preview = buildReferenceFromPurchaseInvoice(Number(id));
    if (preview) {
      const loadProductLines = invoiceAdjustmentBasis === "quantity";
      applyPurchaseInvoicePreview(preview, Number(id), loadProductLines);
      if (!loadProductLines) {
        prefillParticularsFromPreview(preview, "Purchase invoice adjustment");
      } else {
        setParticular("");
        setParticularQty("1");
        setParticularRate("");
      }
    }
  };

  const onPurchaseReturnSelect = (id: string) => {
    setReferenceReturnId(id);
    setReferenceInvoiceId("");
    if (!id) {
      clearReference();
      return;
    }
    const retId = Number(id);
    const ret = purchaseReturns.find((r) => r.id === retId);
    const pending = getPendingDebitNoteRow(retId);
    const preview = buildReferenceFromPurchaseReturn(retId);
    if (preview) {
      applyPreview(
        preview,
        retId,
        pending?.returnNumber ?? ret?.returnNumber ?? `PRET-${retId}`,
        true,
      );
      setParticular("");
      setParticularQty("1");
      setParticularRate("");
    }
  };

  const onUiRefTypeChange = (next: UiRefType) => {
    if (isReturn || isPurchaseInvoice) return;
    setUiRefType(next);
    clearReference();
    setReferenceInvoiceId("");
    setReferenceReturnId("");
  };

  useEffect(() => {
    if (!isReturn || returnId == null || isEdit) return;
    setUiRefType("purchase_return");
    setReferenceReturnId(String(returnId));
    const pending = getPendingDebitNoteRow(returnId);
    const preview = buildReferenceFromPurchaseReturn(returnId);
    if (!preview) return;
    const retNo = pending?.returnNumber ?? `PRET-${returnId}`;
    // Purchase Return DN: load complete product lines (qty-locked), not a single particular.
    applyPreview(preview, returnId, retNo, true);
    if (pending?.returnDate) setDebitNoteDate(pending.returnDate);
    setParticular("");
    setParticularQty("1");
    setParticularRate("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReturn, returnId, isEdit, vendors]);

  useEffect(() => {
    if (!isPurchaseInvoice || purchaseInvoiceId == null || isEdit) return;
    setUiRefType("purchase_invoice");
    setReferenceInvoiceId(String(purchaseInvoiceId));
    const preview = buildReferenceFromPurchaseInvoice(purchaseInvoiceId);
    if (preview) {
      applyPurchaseInvoicePreview(preview, purchaseInvoiceId, false);
      prefillParticularsFromPreview(preview, "Purchase invoice adjustment");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPurchaseInvoice, purchaseInvoiceId, isEdit, vendors]);

  useEffect(() => {
    if (isEdit) return;
    setDebitNoteNo(peekNextDebitNoteNo());
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit || debitNoteId == null || vendors.length === 0) return;
    DebitNoteService.getById(debitNoteId).then((dn) => {
      const rec = mapDebitNoteToRecord(dn);
      const fresh = rec.againstType === "standalone_adjustment";
      setDebitNoteNo(rec.debitNoteNo);
      setDebitNoteDate(rec.debitNoteDate);
      setVendorId(rec.vendorId ? String(rec.vendorId) : "");
      if (rec.vendorId) {
        SupplierService.view(String(rec.vendorId))
          .then((supplier) => {
            onVendorChange(String(rec.vendorId), mapSupplierToTransactionFields(supplier));
          })
          .catch(() => {});
      }
      setSourceInvoiceId(rec.sourceInvoiceId);
      setSourcePoId(rec.sourcePoId);
      setSourceReturnId(rec.sourceReturnId ?? "");
      setSourceReturnNo(rec.sourceReturnNo ?? "");
      setSourcePackingNo(rec.sourcePackingNo ?? "");
      setSourceDispatchNo(rec.sourceDispatchNo ?? "");
      setOriginalAmount(String(rec.originalAmount));
      setAlreadyAdjusted(String(rec.alreadyAdjustedAmount));
      setRemarks(rec.remarks);
      setNarration(rec.remarks);
      setBankAccountId(rec.bankAccountId ?? null);
      setAttachments(rec.attachments ?? []);
      setReferenceNo(rec.referenceNo ?? "");
      setAdjustmentLedgerId(rec.adjustmentLedgerId ?? null);
      setAdjustmentLedgerName(rec.adjustmentLedgerName ?? "");
      if (dn.warehouse_id) setWarehouseId(dn.warehouse_id);

      if (rec.sourceInvoiceId) setReferenceInvoiceId(String(rec.sourceInvoiceId));
      if (rec.sourceReturnId) setReferenceReturnId(String(rec.sourceReturnId));

      if (rec.sourceReturnId) {
        setUiRefType("purchase_return");
        let loaded = rec.lineItems.length
          ? rec.lineItems.map((l: any) => normalizeDebitLine(l))
          : [];
        const p = buildReferenceFromPurchaseReturn(Number(rec.sourceReturnId));
        if (p) {
          setReferencePreview(p);
          if (!loaded.length && p.lineItems?.length) {
            loaded = p.lineItems.map((l) => normalizeDebitLine(l));
          }
        }
        setLines(loaded);
        setParticular("");
        setParticularQty("1");
        setParticularRate("");
        setRoundOff(rec.round_off ?? 0);
      } else if (fresh) {
        setUiRefType(rec.sourceInvoiceId ? "purchase_invoice" : "direct");
        const line = rec.lineItems[0];
        const taxable = rec.taxableAmount ?? 0;
        const gstOn = (rec.gstAmount ?? 0) > 0 || (line?.taxPct ?? 0) > 0;
        const gstPctStr = String(rec.freshGstPct ?? line?.taxPct ?? 18);
        if (line && line.returnQty > 0 && line.unitPrice > 0) {
          setParticularQty(String(line.returnQty));
          setParticularRate(String(line.unitPrice));
        } else {
          setParticularQty("1");
          setParticularRate(
            String(
              taxable > 0
                ? taxable
                : Math.max(0, (rec.standaloneDebitAmount || 0) - (rec.gstAmount || 0)),
            ),
          );
        }
        setGstApplicable(gstOn);
        setGstPct(gstPctStr);
        const qtyStr = line && line.returnQty > 0 ? String(line.returnQty) : "1";
        const rateStr =
          line && line.unitPrice > 0
            ? String(line.unitPrice)
            : String(
                taxable > 0
                  ? taxable
                  : Math.max(0, (rec.standaloneDebitAmount || 0) - (rec.gstAmount || 0)),
              );
        const expected = computeNoteParticularTotals(qtyStr, rateStr, gstOn, gstPctStr, false).total;
        const savedTotal = rec.standaloneDebitAmount || rec.currentDebitAmount || expected;
        setRoundOff(
          rec.round_off != null && Math.abs(rec.round_off) > 0.0001
            ? rec.round_off
            : roundMoney(savedTotal - expected),
        );
        setParticular(rec.reason || line?.productName || "");
        if (rec.sourceInvoiceId) {
          const p = buildReferenceFromPurchaseInvoice(rec.sourceInvoiceId);
          if (p) setReferencePreview(p);
        }
        setLines([]);
      } else {
        setUiRefType("purchase_invoice");
        const loaded = rec.lineItems.length
          ? rec.lineItems.map((l: any) => normalizeDebitLine(l))
          : [];
        const keepQty =
          loaded.some((l: any) => (l.invoiceQty ?? 0) > 0) && loaded.length > 0;
        if (rec.sourceInvoiceId) {
          const p = buildReferenceFromPurchaseInvoice(rec.sourceInvoiceId);
          if (p) setReferencePreview(p);
        }
        if (keepQty) {
          setInvoiceAdjustmentBasis("quantity");
          setLines(loaded);
          setParticular("");
          setParticularQty("1");
          setParticularRate("");
          setRoundOff(rec.round_off ?? 0);
        } else {
          setInvoiceAdjustmentBasis("amount");
          setLines([]);
          const line = rec.lineItems[0];
          const taxable = rec.taxableAmount || 0;
          const gstOn = (rec.gstAmount ?? 0) > 0 || (line?.taxPct ?? 0) > 0;
          const gstPctStr =
            line?.taxPct && line.taxPct > 0
              ? String(line.taxPct)
              : taxable > 0 && gstOn
                ? String(Math.round(((rec.gstAmount ?? 0) / taxable) * 10000) / 100)
                : "18";
          if (line && line.returnQty > 0 && line.unitPrice > 0) {
            setParticularQty(String(line.returnQty));
            setParticularRate(String(line.unitPrice));
          } else {
            setParticularQty("1");
            setParticularRate(String(taxable || line?.unitPrice || rec.currentDebitAmount || ""));
          }
          setGstApplicable(gstOn);
          setGstPct(gstPctStr);
          setParticular(line?.productName || rec.reason || "");
          const qtyStr = line && line.returnQty > 0 ? String(line.returnQty) : "1";
          const rateStr =
            line && line.unitPrice > 0
              ? String(line.unitPrice)
              : String(taxable || rec.currentDebitAmount || "");
          const expected = computeNoteParticularTotals(qtyStr, rateStr, gstOn, gstPctStr, false).total;
          setRoundOff(
            rec.round_off != null && Math.abs(rec.round_off) > 0.0001
              ? rec.round_off
              : roundMoney((rec.currentDebitAmount ?? expected) - expected),
          );
        }
      }
    }).catch(() => {
      router.replace(DEBIT_NOTES_LIST_PATH);
    });
  }, [isEdit, debitNoteId, router, vendors]);

  const particularTotals = computeNoteParticularTotals(
    particularQty,
    particularRate,
    gstApplicable,
    gstPct,
    false,
  );

  const againstLines = lines.filter(
    (l) => l.productName && (l.returnQty > 0 || l.debitAmount > 0),
  );
  const qtyLinesTaxable = againstLines.reduce((s, l) => {
    const debit = l.debitAmount > 0 ? l.debitAmount : calcDebitFromQty(l);
    const rate = 1 + (l.taxPct || 0) / 100;
    return s + (rate > 0 ? debit / rate : debit);
  }, 0);
  const qtyLinesTotal = againstLines.reduce(
    (s, l) => s + (l.debitAmount > 0 ? l.debitAmount : calcDebitFromQty(l)),
    0,
  );
  const qtyLinesGst = Math.max(0, qtyLinesTotal - qtyLinesTaxable);

  const displayTaxable = usesQuantityLines
    ? roundMoney(qtyLinesTaxable)
    : particularTotals.basicAmount;
  const cgstDisplay = usesQuantityLines
    ? roundMoney(qtyLinesGst / 2)
    : particularTotals.cgst;
  const sgstDisplay = usesQuantityLines
    ? roundMoney(qtyLinesGst - qtyLinesGst / 2)
    : particularTotals.sgst;
  const igstDisplay = usesQuantityLines ? 0 : particularTotals.igst;
  const totalDebit = Math.max(
    0,
    (usesQuantityLines ? roundMoney(qtyLinesTotal) : particularTotals.total) + roundOff,
  );
  const showGst = usesQuantityLines ? qtyLinesGst > 0 : gstApplicable;
  const originalNum = parseFloat(originalAmount) || totalDebit;
  const alreadyAdjustedNumSafe = parseFloat(alreadyAdjusted) || 0;

  const quantityLineViews = useMemo(
    () =>
      lines
        .filter((l) => Boolean(l.productName?.trim()))
        .map((l) => mapNoteLineToQuantityView(l, { interstate: false })),
    [lines],
  );

  const quantityLinesEmptyMessage = (() => {
    if (isReturnRefMode) {
      if (!referencePreview) return "Select a purchase return to load product lines.";
      return "Product lines could not be loaded for the selected Purchase Return.";
    }
    if (referenceInvoiceId || referencePreview) {
      return "Product lines could not be loaded for the selected Purchase Invoice.";
    }
    return "Select a purchase invoice to load product lines.";
  })();

  const handleQuantityLineQtyChange = (lineId: string, qty: number) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        // Invoice qty mode: hard-cap at invoice quantity. Return mode uses eligible max.
        const max = isInvoiceQtyMode
          ? line.invoiceQty > 0
            ? line.invoiceQty
            : getDebitLineMaxQty(line)
          : getDebitLineMaxQty(line);
        const clamped = Number.isFinite(max) ? Math.min(Math.max(0, qty), max) : Math.max(0, qty);
        const updated = normalizeDebitLine({ ...line, returnQty: clamped });
        const debit = calcDebitFromQty(updated);
        return normalizeDebitLine({ ...updated, debitAmount: debit });
      }),
    );
  };

  const referenceDocumentView = useMemo(() => {
    if (!isSourceRefMode || !referencePreview) return null;
    const base = {
      documentDate: referencePreview.documentDate,
      partyName: referencePreview.vendorName,
      grandTotal: referencePreview.originalAmount,
      lines: referencePreview.lineItems,
    };
    if (uiRefType === "purchase_return") {
      return adaptPurchaseReturnReference({
        ...base,
        documentNumber: sourceReturnNo || referencePreview.sourceInvoiceNo,
      });
    }
    return adaptPurchaseInvoiceReference({
      ...base,
      documentNumber: referencePreview.sourceInvoiceNo,
    });
  }, [isSourceRefMode, referencePreview, uiRefType, sourceReturnNo]);

  const resolveVendorName = (): string => {
    const v = vendors.find((x) => String(x.supplier_id) === String(vendorId));
    if (v) return v.supplier_name;
    if (referencePreview?.vendorName) return referencePreview.vendorName;
    return "";
  };

  const warehouseRef = useMemo(() => {
    if (referencePreview?.sourceGrnNo) {
      return resolveWarehouseFromGrnNo(referencePreview.sourceGrnNo);
    }
    if (sourceInvoiceId) {
      return getPurchaseInvoiceById(sourceInvoiceId)?.warehouse ?? null;
    }
    return null;
  }, [referencePreview?.sourceGrnNo, sourceInvoiceId]);

  const buildParticularLineItems = (): DebitNoteLine[] => {
    if (usesQuantityLines) {
      return againstLines;
    }
    if (particularTotals.total <= 0 && Math.abs(roundOff) < 0.005) return [];
    const name = particular.trim() || "Adjustment";
    // Round-off is header-level (round_off_amount) — do not bake into line taxable.
    return [
      normalizeDebitLine({
        ...createEmptyDebitLine(),
        productName: name,
        returnQty: particularTotals.qty || 1,
        unitPrice: particularTotals.rate || particularTotals.basicAmount,
        taxPct: gstApplicable ? parseFloat(gstPct) || 0 : 0,
        gstApplicable,
        debitAmount: particularTotals.basicAmount,
        gstAmount: particularTotals.gstAmount,
        lineAmount: particularTotals.total,
        adjustmentLedgerId: adjustmentLedgerId ?? undefined,
        adjustmentLedgerName: adjustmentLedgerName || undefined,
        lineRemarks: narration.trim() || remarks.trim(),
      }),
    ];
  };

  const buildInput = (status: NoteWorkflowStatus) => {
    const resolvedReason =
      particular.trim() ||
      narration.trim() ||
      remarks.trim() ||
      (isDirectMode
        ? "Other"
        : uiRefType === "purchase_return"
          ? "Purchase Return"
          : "Purchase Invoice Adjustment");

    return {
      debitNoteDate,
      againstType: isDirectMode
        ? ("standalone_adjustment" as const)
        : ("purchase_invoice" as const),
      vendorId: vendorId || null,
      vendorName: resolveVendorName(),
      sourceInvoiceId: sourceInvoiceId,
      sourceInvoiceNo: referencePreview?.sourceInvoiceNo ?? "",
      sourcePoId: sourcePoId ?? referencePreview?.sourcePoId ?? null,
      sourcePoNo: referencePreview?.sourcePoNo ?? "",
      sourceGrnNo: referencePreview?.sourceGrnNo ?? "",
      sourceQcNo: referencePreview?.sourceQcNo ?? "",
      sourcePackingNo: sourcePackingNo || undefined,
      sourceDispatchNo: sourceDispatchNo || undefined,
      originalAmount: isDirectMode
        ? roundMoney(particularTotals.total + roundOff)
        : originalNum || roundMoney(particularTotals.total + roundOff),
      alreadyAdjustedAmount: isDirectMode ? 0 : alreadyAdjustedNumSafe,
      standaloneDebitAmount: isDirectMode
        ? roundMoney(particularTotals.total + roundOff)
        : 0,
      taxableAmount: displayTaxable,
      gstAmount: usesQuantityLines ? roundMoney(qtyLinesGst) : particularTotals.gstAmount,
      freshGstPct: isDirectMode ? (gstApplicable ? particularTotals.ratePct : 0) : undefined,
      lineItems: buildParticularLineItems(),
      reason: resolvedReason,
      remarks: narration || remarks,
      referenceNo,
      adjustmentLedgerId,
      adjustmentLedgerName,
      attachments,
      status,
      source:
        sourceReturnId || uiRefType === "purchase_return"
          ? ("purchase_return" as const)
          : ("manual" as const),
      sourceReturnId: sourceReturnId || undefined,
      sourceReturnNo: sourceReturnNo || undefined,
      warehouse: warehouseRef ?? undefined,
      bankAccountId,
    };
  };

  const handleFile = (file: File, documentName: string) => {
    const reader = new FileReader();
    reader.onload = () => {
      setAttachments((prev) => [
        ...prev,
        {
          id: newDebitAttachmentId(),
          documentName: documentName.trim() || file.name,
          fileName: file.name,
          dataUrl: reader.result as string,
          uploadedAt: new Date().toISOString(),
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const validateForm = (): boolean => {
    if (!resolveVendorName().trim()) {
      setError("Select a supplier before saving.");
      return false;
    }
    const resolvedWarehouse = referencePreview?.sourceGrnNo
      ? resolveWarehouseFromGrnNo(referencePreview.sourceGrnNo) || warehouseId
      : warehouseId;
    if (!String(resolvedWarehouse || "").trim()) {
      setError("Select a warehouse before saving.");
      return false;
    }
    if (!adjustmentLedgerId && !adjustmentLedgerName) {
      setError("Select an adjustment ledger.");
      return false;
    }
    if (usesQuantityLines) {
      if (againstLines.length === 0 || qtyLinesTotal <= 0) {
        setError(
          isReturnRefMode
            ? "Return product lines are required."
            : "Enter debit qty on at least one product line.",
        );
        return false;
      }
    } else {
      if (!particular.trim()) {
        setError("Enter a particular / description for the adjustment.");
        return false;
      }
      if (particularTotals.total <= 0) {
        setError("Enter a valid Qty and Rate for the particular.");
        return false;
      }
    }
    if (isSourceRefMode) {
      if (!referencePreview) {
        setError(
          uiRefType === "purchase_return"
            ? "Select a purchase return."
            : "Select a purchase invoice.",
        );
        return false;
      }
      if (!(narration || remarks).trim()) {
        setError("Narration is required.");
        return false;
      }
    }
    return true;
  };

  const [submitApproverOpen, setSubmitApproverOpen] = useState(false);
  const [approvers, setApprovers] = useState<any[]>([]);
  const [selectedApproverId, setSelectedApproverId] = useState("");
  const [createdNoteId, setCreatedNoteId] = useState<string | number | null>(null);

  const mapFormInputToPayload = (input: any) => {
    const linesInput = input.lineItems.map((l: any) => {
      const qty = Number(l.returnQty) || 0;
      const rate = Number(l.unitPrice) || 0;
      const discPct = Number(l.discountPct) || 0;
      const qtyTaxable =
        qty > 0 && rate > 0
          ? roundMoney(Math.max(0, qty * rate * (1 - discPct / 100)))
          : 0;
      const debit =
        Number(l.debitAmount) > 0 ? Number(l.debitAmount) : calcDebitFromQty(l);
      const taxFactor = 1 + (Number(l.taxPct) || 0) / 100;
      const taxableFromDebit =
        taxFactor > 0 ? roundMoney(debit / taxFactor) : roundMoney(debit);
      const taxable = usesQuantityLines
        ? qtyTaxable > 0
          ? qtyTaxable
          : taxableFromDebit
        : particularTotals.basicAmount;

      return {
        description: l.productName || "Adjustment",
        ledger_id: l.adjustmentLedgerId
          ? String(l.adjustmentLedgerId)
          : adjustmentLedgerId
            ? String(adjustmentLedgerId)
            : undefined,
        product_id: null,
        inventory_detail_id: null,
        hsn_id: null,
        sac_id: null,
        quantity: l.returnQty || 1,
        quantity_type: l.uom || null,
        rate: l.unitPrice || taxable,
        taxable_amount: taxable,
        gst_rate: l.taxPct || 0,
        narration: l.lineRemarks || null,
      };
    });

    const wId = referencePreview?.sourceGrnNo
      ? resolveWarehouseFromGrnNo(referencePreview.sourceGrnNo) || warehouseId
      : warehouseId;

    return {
      dn_date: input.debitNoteDate,
      warehouse_id: String(wId),
      supplier_id: String(input.vendorId),
      narration: input.remarks || null,
      remarks: input.remarks || null,
      purchase_invoice_id: referenceInvoiceId ? String(referenceInvoiceId) : undefined,
      round_off_amount: roundOff,
      lines: linesInput,
    };
  };

  const saveDraft = async () => {
    setError(null);
    setSaving(true);
    try {
      if (!validateForm()) return;
      const input = buildInput("draft");
      const payload = mapFormInputToPayload(input);
      if (isEdit && debitNoteId != null) {
        await DebitNoteService.updateDraft(debitNoteId, payload);
        showToast("Debit note updated as draft", "success");
        router.push(`${DEBIT_NOTES_LIST_PATH}/${debitNoteId}`);
      } else {
        const res = await DebitNoteService.createDirect(payload);
        const newId = res?.debit_note_id || res?.id;
        showToast("Debit note saved as draft", "success");
        router.push(`${DEBIT_NOTES_LIST_PATH}/${newId}`);
      }
      dispatchAccountsDataChanged("debit-notes");
    } catch (e: any) {
      setError(e.message || "Could not save debit note.");
    } finally {
      setSaving(false);
    }
  };

  const submitForApproval = async () => {
    setError(null);
    if (!validateForm()) return;
    setSaving(true);
    try {
      const input = buildInput("draft");
      const payload = mapFormInputToPayload(input);
      let targetId: string | number | undefined = debitNoteId;
      if (isEdit && debitNoteId != null) {
        await DebitNoteService.updateDraft(debitNoteId, payload);
      } else {
        const res = await DebitNoteService.createDirect(payload);
        targetId = res?.debit_note_id || res?.id;
      }
      if (targetId) {
        setCreatedNoteId(targetId);
        const users = await UserListService.dropdown();
        setApprovers(users);
        if (users.length > 0) {
          setSelectedApproverId(users[0].userId);
          setSubmitApproverOpen(true);
        } else {
          showToast("No approval users found.", "error");
        }
      }
    } catch (e: any) {
      setError(e.message || "Could not prepare submission.");
    } finally {
      setSaving(false);
    }
  };

  const executeApprovalSubmit = async () => {
    if (!createdNoteId || !selectedApproverId) return;
    setSaving(true);
    try {
      await DebitNoteService.submit(createdNoteId, { approver_id: selectedApproverId });
      dispatchAccountsDataChanged("debit-notes");
      showToast("Debit note submitted for approval", "success");
      setSubmitApproverOpen(false);
      router.push(`${DEBIT_NOTES_LIST_PATH}/${createdNoteId}`);
    } catch (e: any) {
      setError(e.message || "Failed to submit for approval.");
    } finally {
      setSaving(false);
    }
  };

  const postNote = async () => {
    setError(null);
    setSaving(true);
    try {
      if (!validateForm()) return;
      const input = buildInput("draft");
      const payload = mapFormInputToPayload(input);
      let targetId: string | number | undefined = debitNoteId;
      if (isEdit && debitNoteId != null) {
        await DebitNoteService.updateDraft(debitNoteId, payload);
      } else {
        const res = await DebitNoteService.createDirect(payload);
        targetId = res?.debit_note_id || res?.id;
      }
      if (targetId) {
        await DebitNoteService.post(targetId);
        dispatchAccountsDataChanged("debit-notes");
        showToast("Debit note posted successfully", "success");
        router.push(`${DEBIT_NOTES_LIST_PATH}/${targetId}`);
      } else {
        setError("Could not determine debit note ID after creation.");
      }
    } catch (e: any) {
      setError(e.message || "Could not post debit note.");
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit
    ? "Edit Debit Note"
    : isFresh
      ? "Create Debit Note"
      : isPurchaseInvoice
        ? "Create Debit Note from Purchase Invoice"
        : "Create Debit Note from Purchase Return";

  const [baselineReady, setBaselineReady] = useState(false);
  useEffect(() => {
    setBaselineReady(false);
    const id = window.setTimeout(() => setBaselineReady(true), 350);
    return () => window.clearTimeout(id);
  }, [debitNoteId, isFresh, returnId, purchaseInvoiceId]);

  const formSnapshot = useMemo(
    () => ({
      debitNoteDate,
      vendorId,
      remarks,
      particular,
      particularQty,
      particularRate,
      referenceNo,
      gstApplicable,
      gstPct,
      narration,
      attachments,
      adjustmentLedgerId,
      uiRefType,
      referenceInvoiceId,
      referenceReturnId,
      roundOff,
    }),
    [
      debitNoteDate,
      vendorId,
      remarks,
      particular,
      particularQty,
      particularRate,
      referenceNo,
      gstApplicable,
      gstPct,
      narration,
      attachments,
      adjustmentLedgerId,
      uiRefType,
      referenceInvoiceId,
      referenceReturnId,
      roundOff,
    ],
  );
  const isDirty = useFormDirtySnapshot(formSnapshot, { ready: baselineReady });
  const { requestCancel, discardDialog } = useTransactionFormCancel({
    listHref: DEBIT_NOTES_LIST_PATH,
    isDirty,
  });

  const stickyActions = (
    <VoucherFormActionBar
      onDiscard={requestCancel}
      onSaveDraft={saveDraft}
      onSubmitForApproval={submitForApproval}
      showSubmitForApproval
      onSaveAndPost={postNote}
      saveAndPostLabel="Save & Post"
    />
  );

  const vendorLedgerName = vendorFields?.payableLedger || resolveVendorName() || "Not selected";
  const creditAdjLedger = adjustmentLedgerName || "Not selected";

  const postingSummary = (
    <VoucherAccountingPostingSummary
      compact
      voucherTypeLabel="Debit Note"
      debitLedgerLabel="Debit"
      debitLedgerName={vendorLedgerName || "Not selected"}
      creditLedgerLabel="Credit"
      creditLedgerName={creditAdjLedger || "Not selected"}
      voucherAmount={totalDebit}
      voucherAmountLabel="Debit Note Amount"
      gstAdjustments={
        showGst
          ? {
              cgstLabel: "Input CGST Adjustment",
              cgstAmount: cgstDisplay,
              sgstLabel: "Input SGST Adjustment",
              sgstAmount: sgstDisplay,
              igstLabel: "Input IGST Adjustment",
              igstAmount: igstDisplay,
            }
          : undefined
      }
      visibilityItems={defaultVisibilityForType("debit_note", {
        gstApplicable: showGst,
      })}
    />
  );



  return (
    <>
      <div className="credit-debit-note-form h-full min-h-0 flex flex-col">
        <AccountsFormLayout
          fullWidth
          onBackClick={requestCancel}
          title={title}
          breadcrumb={[...DEBIT_NOTES_BREADCRUMB]}
          code={debitNoteNo || undefined}
          headerMeta={
            <div className="flex items-center gap-1.5">
              <span className="cdn-chip inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                Draft
              </span>
              {debitNoteNo ? (
                <span className="cdn-chip cdn-chip--code inline-flex items-center h-5 px-1.5 rounded border font-mono text-[10px]">
                  {debitNoteNo}
                </span>
              ) : null}
            </div>
          }
          stickyFooter={stickyActions}
        >
          <div className="cdn-stack pb-20">
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-xs text-red-700">
                {error}
              </div>
            ) : null}

            <VoucherFormSectionCard title="Basic & Reference Details" compact>
              <VoucherNoteFieldGrid columns={4}>
                <VoucherNoteField label="Debit Note Number" width="sm">
                  <VoucherNoteReadOnly mono>
                    {debitNoteNo || "…"}
                  </VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Debit Note Date" width="sm">
                  <AccountsDateInput
                    value={debitNoteDate}
                    onChange={setDebitNoteDate}
                    aria-label="Debit note date"
                    className="h-[30px] text-xs cdn-control"
                  />
                </VoucherNoteField>
                <VoucherNoteField label="Reference Number" width="md">
                  <Input
                    className="h-[30px] text-xs cdn-control"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="Optional"
                  />
                </VoucherNoteField>
                {isDirectMode ? (
                  <VoucherNoteField label="Warehouse *" width="md">
                    <select
                      className="h-[30px] border rounded px-2 text-xs w-full cdn-control"
                      value={warehouseId}
                      onChange={(e) => setWarehouseId(e.target.value)}
                    >
                      <option value="">Select Warehouse</option>
                      {warehouseList.map((w) => (
                        <option key={w.warehouse_id} value={w.warehouse_id}>
                          {w.warehouse_name}
                        </option>
                      ))}
                    </select>
                  </VoucherNoteField>
                ) : null}
                {warehouseRef ? (
                  <VoucherNoteField label="Bank Account (optional — refund only)" width="lg">
                    <div className="space-y-1">
                      <WarehouseMappedBankAccountSelect
                        warehouseRef={warehouseRef}
                        value={bankAccountId}
                        onChange={(id) => setBankAccountId(id)}
                        label=""
                      />
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        Not required for a normal Debit Note (AP + adjustment + GST). Use only if
                        settling an immediate bank refund with this note.
                      </p>
                    </div>
                  </VoucherNoteField>
                ) : null}
                <VoucherNoteField label="Vendor" required width="md">
                  {vendorLocked ? (
                    <VoucherNoteReadOnly>{resolveVendorName() || "—"}</VoucherNoteReadOnly>
                  ) : (
                    <SearchableSelect
                      label=""
                      options={vendors.map((v) => ({
                        value: String(v.supplier_id),
                        label: v.supplier_name,
                        sub: v.supplier_code,
                      }))}
                      value={vendorId}
                      onChange={(id) => {
                        SupplierService.view(id)
                          .then((supplier) => {
                            onVendorChange(id, mapSupplierToTransactionFields(supplier));
                          })
                          .catch(() => {});
                      }}
                      placeholder="Select supplier…"
                      required
                    />
                  )}
                </VoucherNoteField>
                <VoucherNoteField label="Vendor GSTIN" width="md">
                  <VoucherNoteReadOnly mono>
                    {vendorFields?.vendorGst || referencePreview?.vendorGstin || "—"}
                  </VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="AP Ledger (Payable)" width="md">
                  <VoucherNoteReadOnly>
                    {vendorFields?.payableLedger || resolveVendorName() || "—"}
                  </VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Reference Type" span={2} width="ref">
                  {refControlsLocked ? (
                    <VoucherNoteReadOnly>
                      {isReturn
                        ? `Purchase Return${sourceReturnNo ? ` · ${sourceReturnNo}` : ""}`
                        : `Purchase Invoice${
                            referencePreview?.sourceInvoiceNo
                              ? ` · ${referencePreview.sourceInvoiceNo}`
                              : ""
                          }`}
                    </VoucherNoteReadOnly>
                  ) : (
                    <VoucherNoteSegmentControl
                      hideLabel
                      label="Reference Type"
                      name="dn-ref-type"
                      value={uiRefType}
                      options={REF_TYPE_OPTIONS}
                      onChange={onUiRefTypeChange}
                    />
                  )}
                </VoucherNoteField>
                {!refControlsLocked && uiRefType === "purchase_invoice" ? (
                  <>
                    <VoucherNoteField label="Reference Document" span={2} width="ref">
                      <SearchableSelect
                        label=""
                        value={referenceInvoiceId}
                        onChange={onPurchaseInvoiceSelect}
                        options={purchaseInvoiceOptions}
                        placeholder="Select purchase invoice"
                        required
                      />
                    </VoucherNoteField>
                    <VoucherNoteField label="Adjustment Basis" span={2} width="ref">
                      <VoucherNoteSegmentControl
                        hideLabel
                        label="Adjustment Basis"
                        name="dn-invoice-basis"
                        value={invoiceAdjustmentBasis}
                        options={INVOICE_BASIS_OPTIONS}
                        onChange={(next) => {
                          setInvoiceAdjustmentBasis(next);
                          if (referenceInvoiceId) {
                            const preview = buildReferenceFromPurchaseInvoice(
                              Number(referenceInvoiceId),
                            );
                            if (preview) {
                              applyPurchaseInvoicePreview(
                                preview,
                                Number(referenceInvoiceId),
                                next === "quantity",
                              );
                              if (next === "quantity") {
                                setParticular("");
                                setParticularQty("1");
                                setParticularRate("");
                              } else {
                                prefillParticularsFromPreview(
                                  preview,
                                  "Purchase invoice adjustment",
                                );
                              }
                            }
                          }
                        }}
                      />
                    </VoucherNoteField>
                  </>
                ) : null}
                {!refControlsLocked && uiRefType === "purchase_return" ? (
                  <VoucherNoteField label="Reference Document" span={2} width="ref">
                    <SearchableSelect
                      label=""
                      value={referenceReturnId}
                      onChange={onPurchaseReturnSelect}
                      options={purchaseReturnOptions}
                      placeholder="Select purchase return"
                      required
                    />
                  </VoucherNoteField>
                ) : null}
              </VoucherNoteFieldGrid>
            </VoucherFormSectionCard>

            {isSourceRefMode ? (
              <NoteReferenceDocumentDetails
                document={referenceDocumentView}
                emptyMessage={
                  uiRefType === "purchase_return"
                    ? "Select a purchase return to view source details."
                    : "Select a purchase invoice to view source details."
                }
              />
            ) : null}

            {isReturnRefMode ? (
              <NoteInventoryImpactBanner returnDocumentLabel="Purchase Return" />
            ) : null}
            {isDirectMode || isInvoiceAmountMode ? <NoteNoInventoryImpactBanner /> : null}

            <VoucherFormSectionCard title="Particulars" flush compact>
              <div className="cnz-items !shadow-none !border-0 !rounded-none">
                {usesQuantityLines ? (
                  <div className="space-y-2">
                    <div className="px-3 pt-2 max-w-sm">
                      <p className="text-[11px] font-medium text-muted-foreground mb-1">
                        Adjustment Ledger <span className="text-red-500">*</span>
                      </p>
                      <LedgerHierarchySelect
                        value={adjustmentLedgerId ? String(adjustmentLedgerId) : null}
                        onChange={(l) => {
                          setAdjustmentLedgerId(l.ledgerId);
                          setAdjustmentLedgerName(l.ledgerName);
                        }}
                        fallbackLabel={adjustmentLedgerName}
                        placeholder="Select adjustment ledger"
                        disabled={saving}
                        className="h-8 w-full text-left font-normal"
                        ledgerFilter={(l) => l.allowManualPosting === true}
                      />
                    </div>
                    <NoteQuantityLinesTable
                      lines={quantityLineViews}
                      qtyLocked={isReturnRefMode}
                      currentQtyLabel="Qty"
                      onCurrentQtyChange={handleQuantityLineQtyChange}
                      emptyMessage={quantityLinesEmptyMessage}
                    />
                  </div>
                ) : (
                  <div className="px-3 py-2">
                    <NoteParticularsTable
                      particular={particular}
                      onParticularChange={setParticular}
                      adjustmentLedgerId={adjustmentLedgerId}
                      onAdjustmentLedgerChange={(l) => {
                        setAdjustmentLedgerId(l.id);
                        setAdjustmentLedgerName(l.accountName);
                      }}
                      adjustmentLedgerName={adjustmentLedgerName}
                      qty={particularQty}
                      onQtyChange={setParticularQty}
                      rate={particularRate}
                      onRateChange={setParticularRate}
                      gstPct={gstPct}
                      onGstPctChange={setGstPct}
                      gstApplicable={gstApplicable}
                      onGstApplicableChange={setGstApplicable}
                      interstate={false}
                      switchId="dn-gst-applicable"
                      ledgerFilter={(l) => l.allowManualPosting === true}
                    />
                  </div>
                )}
              </div>
              <VoucherGstSummaryCard
                embedded
                visible
                showTaxRows={showGst}
                taxableAmount={displayTaxable}
                cgstAmount={cgstDisplay}
                sgstAmount={sgstDisplay}
                igstAmount={igstDisplay}
                roundOff={roundOff}
                grandTotal={totalDebit}
                roundOffSlot={
                  <VoucherSignedRoundOffInput value={roundOff} onChange={setRoundOff} />
                }
              />
            </VoucherFormSectionCard>

            <VoucherNarrationAttachmentsSection
              compact
              narration={narration || remarks}
              onNarrationChange={(v) => {
                setNarration(v);
                setRemarks(v);
              }}
              narrationPlaceholder="Accounting narration for this debit note"
              attachmentFiles={attachments.map((att) => ({
                id: att.id,
                fileName: att.fileName,
                previewUrl: att.dataUrl,
              }))}
              onAddAttachmentFiles={(files) => {
                files.forEach((f) => handleFile(f, f.name));
              }}
              onRemoveAttachment={(id) =>
                setAttachments((prev) => prev.filter((a) => a.id !== id))
              }
            />

            <AccountingImpactSection docKey="debit_note" compact entryPreview={postingSummary} />
          </div>
        </AccountsFormLayout>
      </div>
      <AccountsToast toast={toast} onDismiss={dismissToast} />
      {discardDialog}

      {/* Submit Approval Modal */}
      <Dialog open={submitApproverOpen} onOpenChange={setSubmitApproverOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Submit for Approval</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-xs">
            <div className="grid gap-2">
              <Label className="text-xs">Select Approver *</Label>
              <select
                className="h-9 border rounded px-2 text-xs w-full"
                value={selectedApproverId}
                onChange={(e) => setSelectedApproverId(e.target.value)}
              >
                {approvers.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.label} ({user.roleName || "User"})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSubmitApproverOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={executeApprovalSubmit} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
