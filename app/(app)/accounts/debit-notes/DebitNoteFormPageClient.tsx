"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { SupplierService, type SupplierDetailRecord } from "@/services/supplier.service";
import { DebitNoteVendorInfoButton } from "./components/DebitNoteVendorInfoButton";
import { DebitNoteWarehouseInfoButton } from "./components/DebitNoteWarehouseInfoButton";
import { DebitNoteAmountSummary } from "./components/DebitNoteAmountSummary";
import { resolveDebitNoteInterstate } from "./debit-note-interstate";
import { WarehouseService } from "@/services/warehouse.service";
import { UserListService } from "@/services/user-list.service";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { formatMoney, roundMoney } from "@/lib/accounts/money-format";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { VoucherSignedRoundOffInput } from "@/components/accounts/voucher-form/VoucherSignedRoundOffInput";
import { VoucherNarrationAttachmentsSection } from "@/components/accounts/voucher-form/VoucherNarrationAttachmentsSection";
import {
  VoucherNoteField,
  VoucherNoteReadOnly,
} from "@/components/accounts/voucher-form/VoucherNoteFieldGrid";
import { VoucherFormActionBar } from "@/components/accounts/voucher-form/VoucherFormActionBar";
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
import { GenericLedgerHierarchySelect } from "@/components/accounts/GenericLedgerHierarchySelect";
import {
  adaptPurchaseInvoiceReference,
  adaptPurchaseReturnReference,
} from "@/components/accounts/voucher-form/note-reference-model";
import "@/components/accounts/voucher-form/note-form-compact.css";
import { type VendorTransactionFields } from "@/lib/accounts/transaction-master-fetch";
import { getPurchaseInvoiceById } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { resolveWarehouseFromGrnNo } from "@/lib/accounts/bank-warehouse-mapping";
import { WarehouseMappedBankAccountSelect } from "@/components/accounts/WarehouseMappedBankAccountSelect";
import { useWarehouse } from "@/hooks/masters/use-warehouse-master";
import type {
  DirectDnMode,
  EligiblePurchaseInvoiceItem,
} from "@/types/debit-note.types";
import "../credit-notes/credit-note-tx.css";

type FormMode = "fresh" | "return" | "purchase_invoice";
type UiRefType = "direct" | "purchase_invoice" | "purchase_return";
type InvoiceAdjustmentBasis = "quantity" | "amount";

type EligiblePiOption = {
  purchase_invoice_id: string;
  purchase_invoice_number: string;
  purchase_invoice_date: string;
  supplier_invoice_number: string;
  outstanding_amount: number | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function parseOutstandingAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function toDateInput(value: unknown): string {
  if (value == null || value === "") return "";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function mapEligiblePurchaseInvoice(item: EligiblePurchaseInvoiceItem): EligiblePiOption {
  return {
    purchase_invoice_id: String(item.purchase_invoice_id ?? ""),
    purchase_invoice_number: String(item.purchase_invoice_number ?? ""),
    purchase_invoice_date: toDateInput(item.purchase_invoice_date),
    supplier_invoice_number: String(item.supplier_invoice_number ?? "").trim(),
    outstanding_amount: parseOutstandingAmount(item.outstanding_amount),
  };
}

type DirectExtraCharge = {
  id: string;
  description: string;
  ledgerId: string | null;
  ledgerName: string;
  amount: string;
  gstPct: string;
};

function newDirectExtraChargeId() {
  return `dn-xch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function DebitNoteFormPageClient({
  debitNoteId,
  returnId,
  purchaseInvoiceId,
  pendingId: pendingIdProp,
  mode,
}: {
  debitNoteId?: number;
  returnId?: number;
  purchaseInvoiceId?: number;
  pendingId?: string;
  mode?: FormMode;
}) {
  const router = useRouter();
  const { toast, showToast, dismissToast } = useAccountsToast();
  const pendingId = pendingIdProp?.trim() || "";
  const isPendingEntitlement = Boolean(pendingId) && isUuid(pendingId);
  const isEdit = debitNoteId != null;
  const isFresh = !isEdit && mode === "fresh" && !isPendingEntitlement;
  const isReturn =
    !isEdit && (mode === "return" || returnId != null || isPendingEntitlement);
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
      paymentTerms: "",
      creditDays: 0,
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
  const [warehouseList, setWarehouseList] = useState<any[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const { data: warehouseDetail } = useWarehouse(warehouseId || null);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    SupplierService.dropdown().then(setVendors).catch(() => {});
    WarehouseService.dropdown().then(setWarehouseList).catch(() => {});
    DebitNoteService.getConfig().then((cfg) => setApprovalRequired(cfg.approval_required)).catch(() => {});
  }, []);

  const [uiRefType, setUiRefType] = useState<UiRefType>(() => {
    if (isPendingEntitlement || isReturn) return "purchase_return";
    if (isFresh || (!isReturn && !isPurchaseInvoice)) return "direct";
    if (isPurchaseInvoice) return "purchase_invoice";
    return "direct";
  });
  /** Frontend-only Direct DN settlement mode — not a backend field. */
  const [directMode, setDirectMode] = useState<DirectDnMode>("on_account");
  const [eligiblePurchaseInvoices, setEligiblePurchaseInvoices] = useState<EligiblePiOption[]>([]);
  const [eligiblePiLoading, setEligiblePiLoading] = useState(false);
  const [eligiblePiError, setEligiblePiError] = useState<string | null>(null);
  const referenceInvoiceIdRef = useRef("");

  const isSourceRefMode =
    uiRefType === "purchase_invoice" || uiRefType === "purchase_return";
  const isDirectMode = uiRefType === "direct";
  /** Free-form charges editable on Direct always; on PR pending only until converted. */
  const chargesEditable = !saving && !(isPendingEntitlement && isEdit);
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
  referenceInvoiceIdRef.current = referenceInvoiceId;

  const [debitNoteNo, setDebitNoteNo] = useState("");
  const [debitNoteDate, setDebitNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendorId, setVendorId] = useState("");
  const [vendorFields, setVendorFields] = useState<VendorTransactionFields | null>(null);
  const [vendorDetail, setVendorDetail] = useState<SupplierDetailRecord | null>(null);
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
  const [directExtraCharges, setDirectExtraCharges] = useState<DirectExtraCharge[]>([]);
  const [pendingDetail, setPendingDetail] = useState<any | null>(null);
  const [pendingLoading, setPendingLoading] = useState(isPendingEntitlement);

  const [referenceNo, setReferenceNo] = useState("");
  const [adjustmentLedgerId, setAdjustmentLedgerId] = useState<string | number | null>(null);
  const [adjustmentLedgerName, setAdjustmentLedgerName] = useState("");
  const [gstApplicable, setGstApplicable] = useState(false);
  const [gstPct, setGstPct] = useState("18");
  const [narration, setNarration] = useState("");

  const vendorLocked =
    Boolean(referencePreview) || isReturn || isPurchaseInvoice || isPendingEntitlement;
  const refControlsLocked = isReturn || isPurchaseInvoice || isPendingEntitlement;
  const alreadyAdjustedNum = parseFloat(alreadyAdjusted) || 0;

  const clearDirectInvoiceSettlement = () => {
    setReferenceInvoiceId("");
    setSourceInvoiceId(null);
  };

  const onVendorChange = (id: string, fields: VendorTransactionFields | null) => {
    setVendorId(id);
    if (!fields) {
      setVendorFields(null);
      setVendorDetail(null);
      return;
    }
    setVendorFields(fields);
    setBillToId(fields.defaultBillToId);
    setShipToId(fields.defaultShipToId);
    setBillingAddress(fields.billingAddress);
    setShippingAddress(fields.shippingAddress);
  };

  const applySupplierDetail = (id: string, supplier: SupplierDetailRecord) => {
    setVendorDetail(supplier);
    onVendorChange(id, mapSupplierToTransactionFields(supplier));
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
            applySupplierDetail(v.supplier_id, supplier);
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
            applySupplierDetail(v.supplier_id, supplier);
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

  const onDirectModeChange = (next: DirectDnMode) => {
    if (next === "on_account") {
      setDirectMode("on_account");
      clearDirectInvoiceSettlement();
      setEligiblePurchaseInvoices([]);
      setEligiblePiError(null);
      return;
    }
    if (!vendorId) {
      setError("Select a supplier before choosing Against Purchase Invoice.");
      showToast("Select a supplier first.", "error");
      return;
    }
    setError(null);
    setDirectMode("against_invoice");
  };

  useEffect(() => {
    if (!isDirectMode || directMode !== "against_invoice" || !vendorId) {
      setEligiblePurchaseInvoices([]);
      setEligiblePiLoading(false);
      setEligiblePiError(null);
      return;
    }
    let cancelled = false;
    setEligiblePurchaseInvoices([]);
    setEligiblePiLoading(true);
    setEligiblePiError(null);
    DebitNoteService.listEligiblePurchaseInvoices(vendorId, { page: 1, page_size: 100 })
      .then((res) => {
        if (cancelled) return;
        const mapped = res.items
          .map(mapEligiblePurchaseInvoice)
          .filter((inv) => inv.purchase_invoice_id);
        const selectedId = referenceInvoiceIdRef.current;
        if (selectedId && !mapped.some((inv) => inv.purchase_invoice_id === selectedId)) {
          mapped.unshift({
            purchase_invoice_id: selectedId,
            purchase_invoice_number: selectedId,
            purchase_invoice_date: "",
            supplier_invoice_number: "",
            outstanding_amount: null,
          });
        }
        setEligiblePurchaseInvoices(mapped);
        setEligiblePiLoading(false);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setEligiblePurchaseInvoices([]);
        setEligiblePiLoading(false);
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "Could not load eligible Purchase Invoices.";
        setEligiblePiError(msg);
        showToast(msg, "error");
      });
    return () => {
      cancelled = true;
    };
  }, [isDirectMode, directMode, vendorId, showToast]);

  useEffect(() => {
    if (!isReturn || returnId == null || isEdit || isPendingEntitlement) return;
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
  }, [isReturn, returnId, isEdit, vendors, isPendingEntitlement]);

  useEffect(() => {
    if (!isPendingEntitlement || isEdit) return;
    let cancelled = false;
    setPendingLoading(true);
    setError(null);
    (async () => {
      try {
        const detail = await DebitNoteService.getPendingById(pendingId);
        if (cancelled) return;
        setPendingDetail(detail);
        setUiRefType("purchase_return");

        const returnNo =
          detail.purchase_return_number ||
          detail.purchase_return?.return_no ||
          "—";
        const returnDateRaw =
          detail.purchase_return?.return_date || detail.eligibility_date;
        if (returnDateRaw) {
          setDebitNoteDate(
            new Date(returnDateRaw).toISOString().slice(0, 10),
          );
        }
        setSourceReturnId(String(detail.purchase_return_id || ""));
        setSourceReturnNo(returnNo);
        setReferenceReturnId(String(detail.purchase_return_id || ""));
        setReferenceNo(returnNo !== "—" ? returnNo : "");
        setSourceDispatchNo(
          detail.dispatch?.dispatch_number || detail.dispatch?.challan_number || "",
        );
        setNarration(`Converted from Purchase Return ${returnNo}`);
        setRemarks(detail.remarks || "");
        setRoundOff(0);

        if (detail.warehouse_id) setWarehouseId(String(detail.warehouse_id));

        if (detail.debit_note?.debit_note_id) {
          showToast("This pending debit note was already converted.", "error");
          router.replace(
            `${DEBIT_NOTES_LIST_PATH}/${detail.debit_note.debit_note_id}`,
          );
          return;
        }

        const supplierId = detail.supplier_id || detail.supplier?.supplier_id;
        if (supplierId) {
          setVendorId(String(supplierId));
          try {
            const supplier = await SupplierService.view(String(supplierId));
            if (!cancelled) {
              applySupplierDetail(String(supplierId), supplier);
            }
          } catch {
            /* vendor name from snapshot still usable */
          }
        }

        const pendingLines = (detail.lines || []).map((line: any, idx: number) => {
          const qty = parseFloat(String(line.quantity || "0"));
          const rate = parseFloat(String(line.rate || "0"));
          const taxPct = parseFloat(String(line.gst_rate || "0"));
          const taxable = parseFloat(String(line.taxable_amount || "0"));
          const gstAmt = parseFloat(String(line.gst_amount || "0"));
          const lineTotal = parseFloat(String(line.line_total || taxable + gstAmt));
          return normalizeDebitLine({
            id: String(line.pending_debit_note_line_id || `pdl-${idx}`),
            productName: line.description || "Line",
            returnQty: qty,
            purchaseReturnQty: qty,
            eligibleReturnQty: qty,
            invoiceQty: qty,
            unitPrice: rate,
            taxPct,
            gstApplicable: taxPct > 0,
            debitAmount: lineTotal,
            gstAmount: gstAmt,
            lineAmount: taxable,
            uom: line.quantity_type || "Unit",
          });
        });
        setLines(pendingLines);

        const eligible = parseFloat(String(detail.eligible_dn_amount || "0"));
        setOriginalAmount(String(eligible));
        setAlreadyAdjusted("0");

        setReferencePreview({
          referenceType: "purchase_invoice",
          documentDate: returnDateRaw
            ? new Date(returnDateRaw).toISOString().slice(0, 10)
            : debitNoteDate,
          sourceInvoiceId: null,
          sourceInvoiceNo: returnNo,
          sourcePoId: null,
          sourcePoNo: "",
          sourceGrnNo: "",
          sourceQcNo: "",
          sourcePackingNo: "",
          sourceDispatchNo:
            detail.dispatch?.dispatch_number || detail.dispatch?.challan_number || "",
          dispatchStatus: "",
          vendorId: supplierId ? Number(supplierId) || null : null,
          vendorName:
            detail.supplier?.supplier_name ||
            detail.supplier_name ||
            "",
          vendorPhone: "",
          vendorEmail: "",
          vendorGstin: "",
          originalAmount: eligible,
          taxAmount: parseFloat(String(detail.gst_amount || "0")),
          alreadyAdjustedAmount: 0,
          lineItems: pendingLines,
        } as DebitReferencePreview);

        setDebitNoteNo(peekNextDebitNoteNo());
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || "Failed to load pending debit note.");
          showToast(e.message || "Failed to load pending debit note.", "error");
        }
      } finally {
        if (!cancelled) setPendingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPendingEntitlement, pendingId, isEdit]);

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
      setDebitNoteNo(rec.debitNoteNo);
      setDebitNoteDate(rec.debitNoteDate);
      setVendorId(rec.vendorId ? String(rec.vendorId) : "");
      if (rec.vendorId) {
        SupplierService.view(String(rec.vendorId))
          .then((supplier) => {
            applySupplierDetail(String(rec.vendorId), supplier);
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
        setDirectMode("on_account");
        setReferenceInvoiceId("");
        setSourceInvoiceId(null);
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
      } else {
        // Direct DN draft — infer On-account vs Against Purchase Invoice from stored PI.
        setUiRefType("direct");
        const piFromRefs = Array.isArray(dn.references)
          ? dn.references.find(
              (r: any) =>
                String(r.reference_type || "").toUpperCase() === "PURCHASE_INVOICE" &&
                String(r.relation_type || "").toUpperCase() !== "SOURCE",
            )
          : null;
        const storedPiId =
          dn.purchase_invoice_id ||
          piFromRefs?.reference_id ||
          rec.sourceInvoiceId ||
          null;
        const hasSettlementPi = Boolean(storedPiId);
        setDirectMode(hasSettlementPi ? "against_invoice" : "on_account");
        if (hasSettlementPi) {
          setReferenceInvoiceId(String(storedPiId));
          setSourceInvoiceId(
            typeof storedPiId === "number"
              ? storedPiId
              : Number(storedPiId) || null,
          );
        } else {
          setReferenceInvoiceId("");
          setSourceInvoiceId(null);
        }

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
        setLines([]);
        setReferencePreview(null);
      }
    }).catch(() => {
      router.replace(DEBIT_NOTES_LIST_PATH);
    });
  }, [isEdit, debitNoteId, router, vendors]);

  const directInterstate = useMemo(() => {
    if (!isDirectMode) return false;
    const bill =
      vendorFields?.billToOptions?.find((o) => o.id === billToId) ||
      vendorFields?.billToOptions?.[0];
    const fromList = vendors.find((x) => String(x.supplier_id) === String(vendorId));
    return resolveDebitNoteInterstate({
      warehouseGstin: warehouseDetail?.gstNumber,
      warehouseState: warehouseDetail?.state,
      vendorGstin: vendorFields?.vendorGst || vendorDetail?.gstin_number,
      vendorState: vendorDetail?.state || bill?.state || fromList?.state,
    });
  }, [
    isDirectMode,
    warehouseDetail?.gstNumber,
    warehouseDetail?.state,
    vendorFields,
    vendorDetail,
    billToId,
    vendors,
    vendorId,
  ]);

  const particularTotals = computeNoteParticularTotals(
    particularQty,
    particularRate,
    gstApplicable,
    gstPct,
    isDirectMode ? directInterstate : false,
  );

  const directExtraChargeRows = useMemo(() => {
    if (!isDirectMode && !isPendingEntitlement) return [];
    return directExtraCharges
      .map((c) => {
        const taxable = roundMoney(parseFloat(c.amount) || 0);
        const ratePct = parseFloat(c.gstPct) || 0;
        const gstAmt = roundMoney((taxable * ratePct) / 100);
        return {
          ...c,
          taxable,
          ratePct,
          gstAmt,
          total: roundMoney(taxable + gstAmt),
        };
      })
      .filter((c) => c.taxable > 0 || c.description.trim());
  }, [isDirectMode, isPendingEntitlement, directExtraCharges]);

  const directExtraTaxable = directExtraChargeRows.reduce((s, c) => s + c.taxable, 0);
  const directExtraGst = directExtraChargeRows.reduce((s, c) => s + c.gstAmt, 0);
  const directExtraTotal = directExtraChargeRows.reduce((s, c) => s + c.total, 0);

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
    ? roundMoney(qtyLinesTaxable + (isPendingEntitlement ? directExtraTaxable : 0))
    : roundMoney(particularTotals.basicAmount + directExtraTaxable);
  const directMainGst = particularTotals.gstAmount;
  const combinedDirectGst = roundMoney(directMainGst + directExtraGst);
  const pendingCombinedGst = roundMoney(qtyLinesGst + directExtraGst);
  const prGstTotal = isPendingEntitlement ? pendingCombinedGst : qtyLinesGst;
  const cgstDisplay = usesQuantityLines
    ? roundMoney(prGstTotal / 2)
    : isDirectMode && directInterstate
      ? 0
      : roundMoney(combinedDirectGst / 2);
  const sgstDisplay = usesQuantityLines
    ? roundMoney(prGstTotal - prGstTotal / 2)
    : isDirectMode && directInterstate
      ? 0
      : roundMoney(combinedDirectGst - combinedDirectGst / 2);
  const igstDisplay = usesQuantityLines
    ? 0
    : isDirectMode && directInterstate
      ? combinedDirectGst
      : particularTotals.igst;
  const summaryGst = usesQuantityLines ? prGstTotal : combinedDirectGst;
  const summaryInterstate = usesQuantityLines ? false : directInterstate;
  const totalDebit = Math.max(
    0,
    (usesQuantityLines
      ? roundMoney(qtyLinesTotal + (isPendingEntitlement ? directExtraTotal : 0))
      : roundMoney(particularTotals.total + directExtraTotal)) + roundOff,
  );
  /** Final Debit Note Amount shown in Amount Summary — used as allocated_amount when Against PI. */
  const finalDebitNoteAmount = totalDebit;
  const selectedEligiblePi = eligiblePurchaseInvoices.find(
    (inv) => inv.purchase_invoice_id === referenceInvoiceId,
  );
  const invoiceOutstanding =
    selectedEligiblePi != null ? selectedEligiblePi.outstanding_amount : null;
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

  const vendorInfo = useMemo(() => {
    const fromList = vendors.find((x) => String(x.supplier_id) === String(vendorId));
    const bill =
      vendorFields?.billToOptions?.find((o) => o.id === billToId) ||
      vendorFields?.billToOptions?.[0];
    return {
      vendorName:
        vendorFields?.vendorName || fromList?.supplier_name || referencePreview?.vendorName || "",
      vendorCode: vendorFields?.vendorCode || fromList?.supplier_code || "",
      gstin: vendorFields?.vendorGst || referencePreview?.vendorGstin || "",
      billingAddress: vendorFields?.billingAddress || bill?.formatted || "",
      state: vendorDetail?.state || bill?.state || fromList?.state || "",
      supplierType:
        vendorDetail?.supplier_type?.supplier_type_name ||
        fromList?.supplier_type?.supplier_type_name ||
        "",
      contactPerson: vendorFields?.contactPerson || vendorDetail?.contact_person || "",
      mobile: vendorFields?.vendorMobile || "",
      email: vendorFields?.vendorEmail || vendorDetail?.email || "",
    };
  }, [
    vendors,
    vendorId,
    vendorFields,
    billToId,
    vendorDetail,
    referencePreview?.vendorGstin,
    referencePreview?.vendorName,
  ]);

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
    const mainOk = particularTotals.total > 0 || Math.abs(roundOff) >= 0.005;
    const extras = directExtraChargeRows.filter((c) => c.taxable > 0 && c.description.trim());
    if (!mainOk && extras.length === 0) return [];

    const out: DebitNoteLine[] = [];
    if (mainOk && (particularTotals.total > 0 || particular.trim())) {
      const name = particular.trim() || "Adjustment";
      out.push(
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
      );
    }
    for (const c of extras) {
      out.push(
        normalizeDebitLine({
          ...createEmptyDebitLine(),
          productName: c.description.trim(),
          returnQty: 1,
          unitPrice: c.taxable,
          taxPct: c.ratePct,
          gstApplicable: c.ratePct > 0,
          debitAmount: c.taxable,
          gstAmount: c.gstAmt,
          lineAmount: c.total,
          adjustmentLedgerId: c.ledgerId ?? undefined,
          adjustmentLedgerName: c.ledgerName || undefined,
          lineRemarks: "Additional charge",
        }),
      );
    }
    return out;
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
    if (isPendingEntitlement) {
      if (!(narration || remarks).trim()) {
        setError("Narration is required.");
        return false;
      }
      if (againstLines.length === 0 || qtyLinesTotal <= 0) {
        setError("Return product lines are required.");
        return false;
      }
      for (const c of directExtraCharges) {
        const amt = parseFloat(c.amount) || 0;
        if (amt <= 0 && !c.description.trim() && !c.ledgerId) continue;
        if (amt <= 0) continue;
        if (!c.description.trim()) {
          setError("Enter a description for each additional charge with an amount.");
          return false;
        }
        if (!c.ledgerId || !isUuid(String(c.ledgerId))) {
          setError(
            `Select a ledger for additional charge "${c.description.trim() || "row"}".`,
          );
          return false;
        }
      }
      return true;
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
      if (!particular.trim() && directExtraTotal <= 0) {
        setError(
          isDirectMode
            ? "Enter a particular / description for the adjustment."
            : "Enter a particular / description for the adjustment, or add additional charges.",
        );
        return false;
      }
      if (particularTotals.total <= 0 && directExtraTotal <= 0) {
        setError(
          isDirectMode
            ? "Enter a valid Qty and Rate for the particular."
            : "Enter a valid Qty and Rate for the particular, or add additional charges.",
        );
        return false;
      }
      if (particular.trim() && particularTotals.total <= 0 && directExtraTotal <= 0) {
        setError("Enter a valid Qty and Rate for the particular.");
        return false;
      }
    }
    if (isDirectMode) {
      for (const c of directExtraChargeRows) {
        if (c.taxable <= 0) continue;
        if (!c.description.trim()) {
          setError("Enter a description for each additional charge.");
          return false;
        }
        if (!c.ledgerId) {
          setError(`Select a ledger for additional charge "${c.description.trim()}".`);
          return false;
        }
      }
      if (directMode === "against_invoice") {
        if (!referenceInvoiceId) {
          setError("Select a Purchase Invoice or switch to On-account.");
          return false;
        }
        if (finalDebitNoteAmount <= 0) {
          setError("Debit Note Amount must be greater than zero.");
          return false;
        }
        if (
          invoiceOutstanding != null &&
          finalDebitNoteAmount > invoiceOutstanding + 0.009
        ) {
          setError(
            `Debit Note Amount cannot exceed the selected invoice outstanding amount of ${formatMoney(invoiceOutstanding)}.`,
          );
          return false;
        }
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

  const buildPendingCreatePayload = () => {
    const extra_charges = directExtraCharges
      .filter(
        (c) =>
          (parseFloat(c.amount) || 0) > 0 &&
          c.description.trim() &&
          c.ledgerId &&
          isUuid(String(c.ledgerId)),
      )
      .map((c) => ({
        description: c.description.trim(),
        ledger_id: String(c.ledgerId),
        taxable_amount: parseFloat(c.amount) || 0,
        gst_rate: parseFloat(c.gstPct) || 0,
      }));
    return {
      dn_date: debitNoteDate,
      narration: narration.trim() || null,
      remarks: remarks.trim() || null,
      round_off_amount: roundOff,
      extra_charges,
    };
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
        : Number(l.debitAmount) > 0
          ? roundMoney(Number(l.debitAmount))
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
      purchase_invoice_id:
        isDirectMode && directMode === "against_invoice" && referenceInvoiceId
          ? String(referenceInvoiceId)
          : isDirectMode
            ? null
            : referenceInvoiceId
              ? String(referenceInvoiceId)
              : undefined,
      allocated_amount:
        isDirectMode &&
        directMode === "against_invoice" &&
        referenceInvoiceId &&
        finalDebitNoteAmount > 0
          ? finalDebitNoteAmount
          : isDirectMode
            ? null
            : undefined,
      round_off_amount: roundOff,
      lines: linesInput,
    };
  };

  const saveDraft = async () => {
    setError(null);
    setSaving(true);
    try {
      if (!validateForm()) return;
      if (isPendingEntitlement) {
        const res = await DebitNoteService.createFromPending(
          pendingId,
          buildPendingCreatePayload(),
        );
        const newId = res?.debit_note_id || res?.id;
        showToast("Debit note saved as draft", "success");
        dispatchAccountsDataChanged("debit-notes");
        router.push(`${DEBIT_NOTES_LIST_PATH}/${newId}`);
        return;
      }
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
      if (isPendingEntitlement) {
        const res = await DebitNoteService.createFromPending(
          pendingId,
          buildPendingCreatePayload(),
        );
        const targetId = res?.debit_note_id || res?.id;
        if (!targetId) {
          setError("Could not determine debit note ID after creation.");
          return;
        }
        await DebitNoteService.post(targetId);
        dispatchAccountsDataChanged("debit-notes");
        showToast("Debit note posted successfully", "success");
        router.push(`${DEBIT_NOTES_LIST_PATH}/${targetId}`);
        return;
      }
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
    : isPendingEntitlement
      ? "Create Debit Note from Purchase Return"
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
  }, [debitNoteId, isFresh, returnId, purchaseInvoiceId, pendingId]);

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
      directMode,
      referenceInvoiceId,
      referenceReturnId,
      roundOff,
      directExtraCharges,
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
      directMode,
      referenceInvoiceId,
      referenceReturnId,
      roundOff,
      directExtraCharges,
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
      showSubmitForApproval={!isPendingEntitlement}
      onSaveAndPost={postNote}
      saveAndPostLabel="Save & Post"
      discardDisabled={saving}
      saveDraftDisabled={saving || pendingLoading}
      saveAndPostDisabled={saving || pendingLoading}
      submitForApprovalDisabled={saving}
    />
  );

  const narrationAttachments = (
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
  );

  return (
    <>
      <div className="credit-debit-note-form h-full min-h-0 flex flex-col">
        {pendingLoading ? (
          <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading pending debit note…
          </div>
        ) : (
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
              <div className="cn-basic-details-grid">
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
                {isDirectMode || warehouseId ? (
                  <VoucherNoteField
                    label={
                      <span className="inline-flex items-center gap-1">
                        Warehouse
                        <DebitNoteWarehouseInfoButton warehouseId={warehouseId || null} />
                      </span>
                    }
                    required={isDirectMode}
                    width="lg"
                  >
                    {isDirectMode ? (
                      <SearchableSelect
                        value={warehouseId}
                        onChange={setWarehouseId}
                        options={warehouseList.map((w) => ({
                          value: String(w.warehouse_id),
                          label: w.warehouse_name,
                          sub: w.state || undefined,
                        }))}
                        placeholder="Select warehouse"
                        required
                      />
                    ) : (
                      <VoucherNoteReadOnly>
                        {warehouseDetail?.warehouseName ||
                          warehouseList.find((w) => String(w.warehouse_id) === String(warehouseId))
                            ?.warehouse_name ||
                          "—"}
                      </VoucherNoteReadOnly>
                    )}
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
                <VoucherNoteField
                  label={
                    <span className="inline-flex items-center gap-1">
                      Vendor
                      <DebitNoteVendorInfoButton
                        enabled={Boolean(vendorId || vendorFields)}
                        info={vendorInfo}
                      />
                    </span>
                  }
                  required
                  width="lg"
                >
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
                        if (isDirectMode) clearDirectInvoiceSettlement();
                        SupplierService.view(id)
                          .then((supplier) => {
                            applySupplierDetail(id, supplier);
                          })
                          .catch(() => {});
                      }}
                      placeholder="Select supplier…"
                      required
                    />
                  )}
                </VoucherNoteField>
                {isDirectMode && !refControlsLocked ? (
                  <>
                    <VoucherNoteField label="Direct Mode" width="full">
                      <div className="cnz-gst-toggle" role="group" aria-label="Direct debit note mode">
                        <button
                          type="button"
                          data-active={directMode === "on_account"}
                          aria-pressed={directMode === "on_account"}
                          disabled={saving}
                          onClick={() => onDirectModeChange("on_account")}
                        >
                          On-account
                        </button>
                        <button
                          type="button"
                          data-active={directMode === "against_invoice"}
                          aria-pressed={directMode === "against_invoice"}
                          disabled={saving}
                          onClick={() => onDirectModeChange("against_invoice")}
                        >
                          Against Purchase Invoice
                        </button>
                      </div>
                    </VoucherNoteField>
                    {directMode === "against_invoice" ? (
                      <>
                        <VoucherNoteField label="Purchase Invoice" required width="lg">
                          <SearchableSelect
                            label=""
                            value={referenceInvoiceId}
                            onChange={(id) => {
                              setReferenceInvoiceId(id);
                              setSourceInvoiceId(id ? Number(id) || null : null);
                            }}
                            options={eligiblePurchaseInvoices.map((inv) => ({
                              value: inv.purchase_invoice_id,
                              label: inv.purchase_invoice_date
                                ? `${inv.purchase_invoice_number} · ${inv.purchase_invoice_date}`
                                : inv.purchase_invoice_number,
                              selectedLabel: inv.purchase_invoice_number,
                              sub:
                                inv.outstanding_amount != null
                                  ? `Outstanding ${formatMoney(inv.outstanding_amount)}${
                                      inv.supplier_invoice_number
                                        ? ` · Supp. Inv. ${inv.supplier_invoice_number}`
                                        : ""
                                    }`
                                  : inv.supplier_invoice_number
                                    ? `Supp. Inv. ${inv.supplier_invoice_number}`
                                    : undefined,
                            }))}
                            placeholder={
                              eligiblePiLoading
                                ? "Loading invoices…"
                                : !vendorId
                                  ? "Select supplier first"
                                  : "Select purchase invoice…"
                            }
                            disabled={saving || eligiblePiLoading || !vendorId}
                            required
                          />
                          {!eligiblePiLoading &&
                          !eligiblePiError &&
                          vendorId &&
                          eligiblePurchaseInvoices.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              No outstanding Purchase Invoices available for this supplier.
                            </p>
                          ) : null}
                          {eligiblePiError ? (
                            <p className="text-[10px] text-red-600 mt-0.5">{eligiblePiError}</p>
                          ) : null}
                        </VoucherNoteField>
                        <VoucherNoteField label="Outstanding" width="sm">
                          <VoucherNoteReadOnly>
                            {invoiceOutstanding != null
                              ? formatMoney(invoiceOutstanding)
                              : "—"}
                          </VoucherNoteReadOnly>
                          {referenceInvoiceId &&
                          invoiceOutstanding == null &&
                          !eligiblePiLoading ? (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              This invoice is no longer in the eligible outstanding list.
                            </p>
                          ) : null}
                        </VoucherNoteField>
                      </>
                    ) : null}
                  </>
                ) : refControlsLocked || isReturnRefMode ? (
                  <VoucherNoteField label="Reference Type" span={2} width="ref">
                    <VoucherNoteReadOnly>
                      {isReturnRefMode || isReturn || isPendingEntitlement
                        ? `Purchase Return${sourceReturnNo ? ` · ${sourceReturnNo}` : ""}`
                        : `Purchase Invoice${
                            referencePreview?.sourceInvoiceNo
                              ? ` · ${referencePreview.sourceInvoiceNo}`
                              : ""
                          }`}
                    </VoucherNoteReadOnly>
                  </VoucherNoteField>
                ) : null}
              </div>
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
                    {!isPendingEntitlement ? (
                      <div className="px-3 pt-2 max-w-sm">
                        <p className="text-[11px] font-medium text-muted-foreground mb-1">
                          Adjustment Ledger <span className="text-red-500">*</span>
                        </p>
                        <GenericLedgerHierarchySelect
                          value={adjustmentLedgerId ? String(adjustmentLedgerId) : null}
                          onChange={(l) => {
                            setAdjustmentLedgerId(l.ledgerId);
                            setAdjustmentLedgerName(l.ledgerName);
                          }}
                          fallbackLabel={adjustmentLedgerName}
                          placeholder="Select adjustment ledger…"
                          disabled={saving}
                          className="h-8 w-full text-left font-normal text-xs"
                          compact
                          query={{ status: "ACTIVE", allowManualPosting: true }}
                        />
                      </div>
                    ) : null}
                    <NoteQuantityLinesTable
                      lines={quantityLineViews}
                      qtyLocked={isReturnRefMode || isPendingEntitlement}
                      currentQtyLabel="Qty"
                      onCurrentQtyChange={handleQuantityLineQtyChange}
                      emptyMessage={quantityLinesEmptyMessage}
                    />
                  </div>
                ) : (
                  <div className="px-3 py-2 space-y-3">
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
                      interstate={isDirectMode ? directInterstate : false}
                      switchId="dn-gst-applicable"
                    />
                  </div>
                )}

                {isPendingEntitlement ? (
                  <div className="px-3 pb-3 space-y-3">
                    {(pendingDetail?.purchase_return_additional_charges || []).length > 0 ? (
                      <div className="border rounded-md overflow-hidden">
                        <div className="px-2.5 py-1.5 bg-muted/30 border-b">
                          <p className="text-[11px] font-semibold text-foreground">
                            Purchase Return Additional Charges
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Charges from the purchase return (display only — not posted).
                          </p>
                        </div>
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="border-b bg-muted/20">
                              <th className="p-1.5 text-left font-medium">Charge</th>
                              <th className="p-1.5 text-right font-medium w-28">Original</th>
                              <th className="p-1.5 text-right font-medium w-28">Remaining</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(pendingDetail.purchase_return_additional_charges || []).map(
                              (charge: any) => {
                                const chargeId =
                                  charge.purchase_return_additional_charge_id || charge.id;
                                if (!chargeId) return null;
                                const original = parseFloat(
                                  String(
                                    charge.original_total_amount ??
                                      charge.original_taxable_amount ??
                                      "0",
                                  ),
                                );
                                const remaining = parseFloat(
                                  String(
                                    charge.remaining_amount ??
                                      charge.original_total_amount ??
                                      "0",
                                  ),
                                );
                                return (
                                  <tr key={`pr-display-${chargeId}`} className="border-b last:border-0">
                                    <td className="p-1.5">
                                      {charge.description || "Additional charge"}
                                    </td>
                                    <td className="p-1.5 text-right tabular-nums">
                                      {formatINR(original)}
                                    </td>
                                    <td className="p-1.5 text-right tabular-nums">
                                      {formatINR(remaining)}
                                    </td>
                                  </tr>
                                );
                              },
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : null}

                    <div className="border rounded-md overflow-hidden">
                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/30 border-b">
                        <p className="text-[11px] font-semibold text-foreground">
                          Additional Charges
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px]"
                          disabled={!chargesEditable}
                          onClick={() =>
                            setDirectExtraCharges((prev) => [
                              ...prev,
                              {
                                id: newDirectExtraChargeId(),
                                description: "",
                                ledgerId: null,
                                ledgerName: "",
                                amount: "",
                                gstPct: "0",
                              },
                            ])
                          }
                        >
                          + Add charge
                        </Button>
                      </div>
                      {directExtraCharges.length === 0 ? (
                        <p className="px-2.5 py-2 text-[11px] text-muted-foreground">
                          Optional freight, packing, or other charges. These post as extra debit note lines.
                        </p>
                      ) : (
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="border-b bg-muted/20">
                              <th className="p-1.5 text-left font-medium">Description</th>
                              <th className="p-1.5 text-left font-medium">Ledger</th>
                              <th className="p-1.5 text-right font-medium w-24">Taxable</th>
                              <th className="p-1.5 text-right font-medium w-16">GST %</th>
                              <th className="p-1.5 text-right font-medium w-10" />
                            </tr>
                          </thead>
                          <tbody>
                            {directExtraCharges.map((row) => (
                              <tr key={row.id} className="border-b last:border-0">
                                <td className="p-1.5">
                                  <Input
                                    className="h-7 text-xs"
                                    value={row.description}
                                    placeholder="e.g. Freight"
                                    disabled={!chargesEditable}
                                    onChange={(e) =>
                                      setDirectExtraCharges((prev) =>
                                        prev.map((c) =>
                                          c.id === row.id
                                            ? { ...c, description: e.target.value }
                                            : c,
                                        ),
                                      )
                                    }
                                  />
                                </td>
                                <td className="p-1.5 min-w-[160px]">
                                  <GenericLedgerHierarchySelect
                                    value={row.ledgerId}
                                    onChange={(l) =>
                                      setDirectExtraCharges((prev) =>
                                        prev.map((c) =>
                                          c.id === row.id
                                            ? {
                                                ...c,
                                                ledgerId: l.ledgerId,
                                                ledgerName: l.ledgerName,
                                              }
                                            : c,
                                        ),
                                      )
                                    }
                                    fallbackLabel={row.ledgerName}
                                    placeholder="Select ledger…"
                                    disabled={!chargesEditable}
                                    className="h-7 w-full text-left font-normal text-xs"
                                    compact
                                    query={{ status: "ACTIVE", allowManualPosting: true }}
                                  />
                                </td>
                                <td className="p-1.5">
                                  <Input
                                    className="h-7 text-xs text-right"
                                    value={row.amount}
                                    placeholder="0.00"
                                    disabled={!chargesEditable}
                                    onChange={(e) =>
                                      setDirectExtraCharges((prev) =>
                                        prev.map((c) =>
                                          c.id === row.id
                                            ? { ...c, amount: e.target.value }
                                            : c,
                                        ),
                                      )
                                    }
                                  />
                                </td>
                                <td className="p-1.5">
                                  <Input
                                    className="h-7 text-xs text-right"
                                    value={row.gstPct}
                                    placeholder="0"
                                    disabled={!chargesEditable}
                                    onChange={(e) =>
                                      setDirectExtraCharges((prev) =>
                                        prev.map((c) =>
                                          c.id === row.id
                                            ? { ...c, gstPct: e.target.value }
                                            : c,
                                        ),
                                      )
                                    }
                                  />
                                </td>
                                <td className="p-1.5 text-right">
                                  <button
                                    type="button"
                                    className="text-[11px] text-red-600 hover:underline"
                                    disabled={!chargesEditable}
                                    onClick={() =>
                                      setDirectExtraCharges((prev) =>
                                        prev.filter((c) => c.id !== row.id),
                                      )
                                    }
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </VoucherFormSectionCard>

            <div className="cn-narration-summary-grid">
              {narrationAttachments}
              <DebitNoteAmountSummary
                taxable={displayTaxable}
                cgst={cgstDisplay}
                sgst={sgstDisplay}
                igst={igstDisplay}
                gst={summaryGst}
                roundOff={roundOff}
                total={totalDebit}
                interstate={summaryInterstate}
                locked={saving}
                roundOffSlot={
                  <VoucherSignedRoundOffInput value={roundOff} onChange={setRoundOff} />
                }
              />
            </div>
          </div>
        </AccountsFormLayout>
        )}
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
