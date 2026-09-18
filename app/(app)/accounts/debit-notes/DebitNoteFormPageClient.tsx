"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { VOUCHER_INPUT_CLASS } from "@/components/accounts/voucher-simple-form-ui";
import { cn as cnMerge } from "@/lib/utils";
import { VoucherAttachmentSection } from "@/components/accounts/voucher-form/VoucherAttachmentSection";
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
import { InvoiceFormLayout } from "@/app/(app)/accounts/components/InvoiceFormLayout";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  INVOICE_DETAIL_INPUT_CLASS,
  INVOICE_DETAIL_SELECT_CLASS,
  InvoiceDetailField,
} from "@/app/(app)/accounts/invoices/components/invoice-form-voucher-ui";
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
import {
  DEBIT_NOTES_LIST_PATH,
  debitNoteReturnPath,
  formatINR,
  withReturnTo,
} from "./note-utils";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { DebitNoteService, mapDebitNoteToRecord } from "@/services/debit-note.service";
import { SupplierService, type SupplierDetailRecord } from "@/services/supplier.service";
import { DebitNoteVendorInfoButton } from "./components/DebitNoteVendorInfoButton";
import { DebitNoteWarehouseInfoButton } from "./components/DebitNoteWarehouseInfoButton";
import { DebitNoteAmountSummary } from "./components/DebitNoteAmountSummary";
import { DebitNoteFormActionBar } from "./components/DebitNoteFormActionBar";
import { DebitNoteParticularsEditor, newDirectDnLine, previewDirectDnLine, type DirectDnLineDraft } from "./components/DebitNoteParticularsEditor";
import { resolveDebitNoteInterstate } from "./debit-note-interstate";
import { WarehouseService } from "@/services/warehouse.service";
import { UserListService } from "@/services/user-list.service";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { computeAutomaticRoundOff, formatMoney, roundMoney } from "@/lib/accounts/money-format";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { useRouter, useSearchParams } from "next/navigation";
import {
  NoteReferenceDocumentDetails,
} from "@/components/accounts/voucher-form/NoteReferenceDocumentDetails";
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
import "../credit-notes/credit-note-tx.css";
import "@/app/(app)/accounts/invoices/sales-order-invoice-form-compact.css";
import { type VendorTransactionFields } from "@/lib/accounts/transaction-master-fetch";
import { getPurchaseInvoiceById } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { resolveWarehouseFromGrnNo } from "@/lib/accounts/bank-warehouse-mapping";
import { WarehouseMappedBankAccountSelect } from "@/components/accounts/WarehouseMappedBankAccountSelect";
import { useWarehouse } from "@/hooks/masters/use-warehouse-master";
import type {
  DirectDnMode,
  EligiblePurchaseInvoiceItem,
} from "@/types/debit-note.types";

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
  const searchParams = useSearchParams();
  const listHref = useMemo(
    () => debitNoteReturnPath(searchParams.get("returnTo")),
    [searchParams],
  );
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
  const [invoiceAdjustmentBasis, setInvoiceAdjustmentBasis] =
    useState<InvoiceAdjustmentBasis>("amount");
  const isReturnRefMode = uiRefType === "purchase_return";
  const isInvoiceQtyMode =
    uiRefType === "purchase_invoice" && invoiceAdjustmentBasis === "quantity";
  const isInvoiceAmountMode =
    uiRefType === "purchase_invoice" && invoiceAdjustmentBasis === "amount";
  const usesQuantityLines = isReturnRefMode || isInvoiceQtyMode;

  const [directParticularLines, setDirectParticularLines] = useState<DirectDnLineDraft[]>([
    newDirectDnLine(),
  ]);
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
  const [bankAccountId, setBankAccountId] = useState<string | null>(null);
  const [pendingDetail, setPendingDetail] = useState<any | null>(null);
  const [pendingLoading, setPendingLoading] = useState(isPendingEntitlement);

  const [referenceNo, setReferenceNo] = useState("");
  const [adjustmentLedgerId, setAdjustmentLedgerId] = useState<string | number | null>(null);
  const [adjustmentLedgerName, setAdjustmentLedgerName] = useState("");
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
    setDirectParticularLines((prev) => {
      const firstPrev = prev[0];
      const hasContent =
        Boolean(firstPrev?.description.trim()) ||
        Boolean(firstPrev?.rate.trim()) ||
        prev.length > 1;
      if (hasContent) return prev;
      const first = preview.lineItems[0];
      const qty =
        (first?.purchaseReturnQty && first.purchaseReturnQty > 0
          ? first.purchaseReturnQty
          : first?.eligibleReturnQty && first.eligibleReturnQty > 0
            ? first.eligibleReturnQty
            : first?.invoiceQty) || 1;
      const gstOn = Boolean(first && ((first.taxPct || 0) > 0 || (first.gstAmount || 0) > 0));
      return [
        newDirectDnLine({
          description: first?.productName || fallbackName,
          quantity: String(qty),
          rate: String(first?.unitPrice || ""),
          gst_applicable: gstOn,
          gst_rate: gstOn && first?.taxPct ? String(first.taxPct) : "18",
          ledger_id: firstPrev?.ledger_id || "",
          ledger_name: firstPrev?.ledger_name || "",
        }),
      ];
    });
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
    setDirectParticularLines([newDirectDnLine()]);
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
        {
          const refs = [
            ...(Array.isArray(detail.invoice_references) ? detail.invoice_references : []),
            ...(Array.isArray(detail.references) ? detail.references : []),
          ];
          const piRef = refs.find(
            (r: any) => String(r?.reference_type || "") === "PURCHASE_INVOICE",
          );
          const piNo = String(
            detail.resolved_purchase_invoice_number ||
              piRef?.reference_code ||
              "",
          ).trim();
          const suggested = String(detail.suggested_narration || "").trim();
          setNarration(
            suggested ||
              (piNo
                ? `Debit note issued against returned quantity relating to Purchase Invoice ${piNo}`
                : ""),
          );
        }
        setRemarks(detail.remarks || "");

        if (detail.warehouse_id) setWarehouseId(String(detail.warehouse_id));

        if (detail.debit_note?.debit_note_id) {
          showToast("This pending debit note was already converted.", "error");
          router.replace(
            withReturnTo(
              `${DEBIT_NOTES_LIST_PATH}/${detail.debit_note.debit_note_id}`,
              listHref,
            ),
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
          const productSnap =
            line.product_snapshot && typeof line.product_snapshot === "object"
              ? (line.product_snapshot as Record<string, unknown>)
              : null;
          const batchSnap =
            line.batch_snapshot && typeof line.batch_snapshot === "object"
              ? (line.batch_snapshot as Record<string, unknown>)
              : null;
          const hsnSnap =
            line.hsn_snapshot && typeof line.hsn_snapshot === "object"
              ? (line.hsn_snapshot as Record<string, unknown>)
              : null;
          const from = (obj: Record<string, unknown> | null, ...keys: string[]) => {
            if (!obj) return "";
            for (const k of keys) {
              const v = obj[k];
              if (v != null && String(v).trim()) return String(v).trim();
            }
            return "";
          };
          const productName =
            from(productSnap, "product_name", "name") || line.description || "Line";
          const sku = from(productSnap, "sku", "product_code", "product_sku");
          const hsn =
            from(hsnSnap, "hsn_code", "code", "hsn") ||
            from(productSnap, "hsn_code", "hsn");
          const batchNo = from(batchSnap, "batch_no", "batch_number");
          const mfgDate = from(batchSnap, "mfg_date", "manufacturing_date");
          const expiryDate = from(batchSnap, "expiry_date");
          const uom =
            line.quantity_type ||
            from(productSnap, "uom", "unit", "quantity_type") ||
            "Unit";
          return normalizeDebitLine({
            id: String(line.pending_debit_note_line_id || `pdl-${idx}`),
            productName,
            sku,
            hsn,
            batchNo,
            mfgDate,
            expiryDate,
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
            uom,
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
      setBankAccountId(
        typeof rec.bankAccountId === "string" ? rec.bankAccountId : null,
      );
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
        setDirectParticularLines([newDirectDnLine()]);
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

        const hydratedLines =
          rec.lineItems.length > 0
            ? rec.lineItems.map((line: DebitNoteLine, idx: number) => {
                const qty = line.returnQty > 0 ? line.returnQty : 1;
                const taxable = line.debitAmount > 0 ? line.debitAmount : 0;
                const unitPrice =
                  line.unitPrice > 0
                    ? line.unitPrice
                    : qty > 0
                      ? taxable / qty
                      : taxable;
                const taxPct = line.taxPct || 0;
                return newDirectDnLine({
                  key: `dn-edit-${line.id || idx}`,
                  description: line.productName || rec.reason || "",
                  ledger_id: line.adjustmentLedgerId
                    ? String(line.adjustmentLedgerId)
                    : rec.adjustmentLedgerId
                      ? String(rec.adjustmentLedgerId)
                      : "",
                  ledger_name:
                    line.adjustmentLedgerName || rec.adjustmentLedgerName || "",
                  quantity: String(qty),
                  rate: String(unitPrice || ""),
                  gst_applicable: Boolean(line.gstApplicable ?? taxPct > 0),
                  gst_rate: String(taxPct || rec.freshGstPct || 18),
                });
              })
            : [
                newDirectDnLine({
                  description: rec.reason || "",
                  ledger_id: rec.adjustmentLedgerId
                    ? String(rec.adjustmentLedgerId)
                    : "",
                  ledger_name: rec.adjustmentLedgerName || "",
                  quantity: "1",
                  rate: String(
                    Math.max(
                      0,
                      (rec.taxableAmount ?? 0) ||
                        (rec.standaloneDebitAmount || 0) - (rec.gstAmount || 0),
                    ),
                  ),
                  gst_applicable: (rec.gstAmount ?? 0) > 0,
                  gst_rate: String(rec.freshGstPct ?? 18),
                }),
              ];
        setDirectParticularLines(hydratedLines);
        setLines([]);
        setReferencePreview(null);
      }
    }).catch(() => {
      router.replace(listHref);
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

  const particularLinePreviews = useMemo(
    () =>
      directParticularLines.map((line) => ({
        line,
        preview: previewDirectDnLine(line, isDirectMode ? directInterstate : false),
      })),
    [directParticularLines, isDirectMode, directInterstate],
  );

  const particularTotals = useMemo(() => {
    return particularLinePreviews.reduce(
      (acc, { preview }) => {
        acc.basicAmount += preview.basicAmount;
        acc.gstAmount += preview.gstAmount;
        acc.cgst += preview.cgst;
        acc.sgst += preview.sgst;
        acc.igst += preview.igst;
        acc.total += preview.lineTotal;
        return acc;
      },
      { basicAmount: 0, gstAmount: 0, cgst: 0, sgst: 0, igst: 0, total: 0, ratePct: 0 },
    );
  }, [particularLinePreviews]);

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
    : roundMoney(particularTotals.basicAmount);
  const combinedDirectGst = roundMoney(particularTotals.gstAmount);
  const prGstTotal = qtyLinesGst;
  const cgstDisplay = usesQuantityLines
    ? roundMoney(prGstTotal / 2)
    : isDirectMode && directInterstate
      ? 0
      : roundMoney(particularTotals.cgst);
  const sgstDisplay = usesQuantityLines
    ? roundMoney(prGstTotal - prGstTotal / 2)
    : isDirectMode && directInterstate
      ? 0
      : roundMoney(particularTotals.sgst);
  const igstDisplay = usesQuantityLines
    ? 0
    : isDirectMode && directInterstate
      ? combinedDirectGst
      : roundMoney(particularTotals.igst);
  const summaryGst = usesQuantityLines ? prGstTotal : combinedDirectGst;
  const summaryInterstate = usesQuantityLines ? false : directInterstate;
  const unroundedDebit = usesQuantityLines
    ? roundMoney(qtyLinesTotal)
    : roundMoney(particularTotals.total);
  const roundOff = computeAutomaticRoundOff(unroundedDebit);
  const totalDebit = Math.max(0, roundMoney(unroundedDebit + roundOff));
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

  const handleQuantityLineTaxPctChange = (lineId: string, taxPct: number) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const rate = Math.max(0, taxPct);
        const updated = normalizeDebitLine({
          ...line,
          taxPct: rate,
          gstApplicable: rate > 0,
        });
        const debit = calcDebitFromQty(updated);
        const taxable =
          updated.unitPrice > 0 && updated.returnQty > 0
            ? Math.round(
                updated.returnQty *
                  updated.unitPrice *
                  (1 - (updated.discountPct || 0) / 100) *
                  100,
              ) / 100
            : Math.max(0, updated.lineAmount);
        const gstAmount = Math.max(0, Math.round((debit - taxable) * 100) / 100);
        return normalizeDebitLine({
          ...updated,
          debitAmount: debit,
          gstAmount,
        });
      }),
    );
  };

  useEffect(() => {
    if (isPendingEntitlement) {
      setDirectParticularLines([newDirectDnLine()]);
    }
  }, [isPendingEntitlement]);

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
    return particularLinePreviews
      .filter(({ preview }) => preview.basicAmount > 0)
      .map(({ line, preview }) =>
        normalizeDebitLine({
          ...createEmptyDebitLine(),
          productName: line.description.trim() || "Adjustment",
          returnQty: preview.qty || 1,
          unitPrice: preview.rate || preview.basicAmount,
          taxPct: line.gst_applicable ? parseFloat(line.gst_rate) || 0 : 0,
          gstApplicable: line.gst_applicable,
          debitAmount: preview.basicAmount,
          gstAmount: preview.gstAmount,
          lineAmount: preview.lineTotal,
          adjustmentLedgerId: line.ledger_id || undefined,
          adjustmentLedgerName: line.ledger_name || undefined,
          lineRemarks: narration.trim() || remarks.trim(),
        }),
      );
  };

  const buildInput = (status: NoteWorkflowStatus) => {
    const firstDescription =
      directParticularLines.find((l) => l.description.trim())?.description.trim() || "";
    const resolvedReason =
      firstDescription ||
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
      freshGstPct: isDirectMode
        ? particularLinePreviews.find(({ line }) => line.gst_applicable)?.preview.ratePct || 0
        : undefined,
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
      return true;
    }
    const resolvedWarehouse = referencePreview?.sourceGrnNo
      ? resolveWarehouseFromGrnNo(referencePreview.sourceGrnNo) || warehouseId
      : warehouseId;
    if (!String(resolvedWarehouse || "").trim()) {
      setError("Select a warehouse before saving.");
      return false;
    }
    if (usesQuantityLines && !adjustmentLedgerId && !adjustmentLedgerName) {
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
      if (!directParticularLines.length) {
        setError("At least one particular line is required.");
        return false;
      }
      for (const [i, { line, preview }] of particularLinePreviews.entries()) {
        if (!line.description.trim()) {
          setError(`Line ${i + 1}: description is required.`);
          return false;
        }
        if (!line.ledger_id) {
          setError(`Line ${i + 1}: select an adjustment ledger.`);
          return false;
        }
        if (preview.basicAmount <= 0) {
          setError(`Line ${i + 1}: enter a valid Qty and Rate.`);
          return false;
        }
      }
    }
    if (isDirectMode) {
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
    // Purchase Return DN must not include additional charges.
    const line_gst_overrides = lines
      .filter((l) => Boolean(l.id) && isUuid(String(l.id)))
      .map((l) => ({
        pending_debit_note_line_id: String(l.id),
        gst_rate: Number(l.taxPct) || 0,
      }));
    return {
      dn_date: debitNoteDate,
      narration: narration.trim() || null,
      remarks: remarks.trim() || null,
      round_off_amount: roundOff,
      line_gst_overrides,
      extra_charges: [] as Array<{
        description: string;
        ledger_id: string;
        taxable_amount: number;
        gst_rate: number;
      }>,
      additional_charges: [] as Array<{
        purchase_return_additional_charge_id: string;
        ledger_id: string;
        amount: number;
      }>,
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
      if (!validateForm()) {
        setSaving(false);
        return;
      }
      if (isPendingEntitlement) {
        await DebitNoteService.createFromPending(
          pendingId,
          buildPendingCreatePayload(),
        );
        showToast("Debit note saved as draft", "success");
        dispatchAccountsDataChanged("debit-notes");
        router.replace(listHref);
        return;
      }
      const input = buildInput("draft");
      const payload = mapFormInputToPayload(input);
      if (isEdit && debitNoteId != null) {
        await DebitNoteService.updateDraft(debitNoteId, payload);
        showToast("Debit note updated as draft", "success");
      } else {
        await DebitNoteService.createDirect(payload);
        showToast("Debit note saved as draft", "success");
      }
      dispatchAccountsDataChanged("debit-notes");
      router.replace(listHref);
    } catch (e: any) {
      setError(e.message || "Could not save debit note.");
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
      router.replace(listHref);
    } catch (e: any) {
      setError(e.message || "Failed to submit for approval.");
      setSaving(false);
    }
  };

  const postNote = async () => {
    setError(null);
    setSaving(true);
    try {
      if (!validateForm()) {
        setSaving(false);
        return;
      }
      if (isPendingEntitlement) {
        const res = await DebitNoteService.createFromPending(
          pendingId,
          buildPendingCreatePayload(),
        );
        const targetId = res?.debit_note_id || res?.id;
        if (!targetId) {
          setError("Could not determine debit note ID after creation.");
          setSaving(false);
          return;
        }
        await DebitNoteService.post(targetId);
        dispatchAccountsDataChanged("debit-notes");
        showToast("Debit note posted successfully", "success");
        router.replace(listHref);
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
        router.replace(listHref);
      } else {
        setError("Could not determine debit note ID after creation.");
        setSaving(false);
      }
    } catch (e: any) {
      setError(e.message || "Could not post debit note.");
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
      directParticularLines,
      referenceNo,
      narration,
      attachments,
      adjustmentLedgerId,
      uiRefType,
      directMode,
      referenceInvoiceId,
      referenceReturnId,
      roundOff,
    }),
    [
      debitNoteDate,
      vendorId,
      remarks,
      directParticularLines,
      referenceNo,
      narration,
      attachments,
      adjustmentLedgerId,
      uiRefType,
      directMode,
      referenceInvoiceId,
      referenceReturnId,
      roundOff,
    ],
  );
  const isDirty = useFormDirtySnapshot(formSnapshot, { ready: baselineReady });
  const { requestCancel, discardDialog } = useTransactionFormCancel({
    listHref,
    isDirty,
  });

  const stickyActions = (
    <DebitNoteFormActionBar
      busy={saving || pendingLoading}
      hasExistingId={isEdit}
      onDiscard={requestCancel}
      onSaveDraft={saveDraft}
      onSaveAndPost={!isEdit ? postNote : undefined}
      onPost={isEdit ? postNote : undefined}
    />
  );

  const breadcrumbPage = isEdit
    ? "Edit Debit Note"
    : isPendingEntitlement
      ? "Generate Debit Note"
      : "Create Debit Note";

  const subtitle = isPendingEntitlement
    ? "Details auto-fetched from pending purchase return."
    : isFresh
      ? "Create a direct debit note or link to an outstanding Purchase Invoice."
      : isPurchaseInvoice
        ? "Details auto-fetched from linked Purchase Invoice."
        : "Details auto-fetched from linked Purchase Return.";

  return (
    <>
      <div className="sales-order-invoice-form-compact h-full min-h-0 flex flex-col w-full">
        {pendingLoading ? (
          <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading pending debit note…
          </div>
        ) : (
        <InvoiceFormLayout
          onBackClick={requestCancel}
          title={title}
          subtitle={subtitle}
          breadcrumb={accountsBreadcrumb("Transactions", breadcrumbPage, listHref)}
          backHref={listHref}
          stickyFooter={stickyActions}
        >
          <div className="space-y-2.5">
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-xs text-red-700">
                {error}
              </div>
            ) : null}

            <VoucherFormSectionCard title="Debit Note Details">
              <div className="space-y-1.5">
                <div className="so-invoice-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <InvoiceDetailField label="Debit Note Number">
                    <div className="so-goods-ro so-goods-ro--mono w-full text-brand-700">
                      {debitNoteNo || "…"}
                    </div>
                  </InvoiceDetailField>
                  <InvoiceDetailField label="Debit Note Date" required>
                    <AccountsDateInput
                      value={debitNoteDate}
                      onChange={setDebitNoteDate}
                      aria-label="Debit note date"
                      className={INVOICE_DETAIL_INPUT_CLASS}
                    />
                  </InvoiceDetailField>
                  {isDirectMode || warehouseId ? (
                    <InvoiceDetailField
                      label="Warehouse"
                      required={isDirectMode || !referencePreview?.sourceGrnNo}
                      labelExtra={
                        <DebitNoteWarehouseInfoButton warehouseId={warehouseId || null} />
                      }
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
                          triggerClassName={INVOICE_DETAIL_SELECT_CLASS}
                        />
                      ) : (
                        <div className="so-goods-ro w-full">
                          {warehouseDetail?.warehouseName ||
                            warehouseList.find((w) => String(w.warehouse_id) === String(warehouseId))
                              ?.warehouse_name ||
                            "—"}
                        </div>
                      )}
                    </InvoiceDetailField>
                  ) : (
                    <InvoiceDetailField label="Reference Number">
                      <Input
                        className={INVOICE_DETAIL_INPUT_CLASS}
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                        placeholder="Optional"
                      />
                    </InvoiceDetailField>
                  )}
                  <InvoiceDetailField
                    label="Vendor"
                    required
                    labelExtra={
                      <DebitNoteVendorInfoButton
                        enabled={Boolean(vendorId || vendorFields)}
                        info={vendorInfo}
                      />
                    }
                  >
                    {vendorLocked ? (
                      <div className="so-goods-ro w-full">{resolveVendorName() || "—"}</div>
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
                        triggerClassName={INVOICE_DETAIL_SELECT_CLASS}
                      />
                    )}
                  </InvoiceDetailField>
                </div>

                <div className="so-invoice-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  {isDirectMode && !refControlsLocked ? (
                    <>
                      <InvoiceDetailField label="Direct Mode">
                        <div className="cnz-gst-toggle w-full" role="group" aria-label="Direct debit note mode">
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
                      </InvoiceDetailField>
                      {directMode === "against_invoice" ? (
                        <>
                          <InvoiceDetailField label="Purchase Invoice" required>
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
                              triggerClassName={INVOICE_DETAIL_SELECT_CLASS}
                            />
                            {!eligiblePiLoading &&
                            !eligiblePiError &&
                            vendorId &&
                            eligiblePurchaseInvoices.length === 0 ? (
                              <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                                No outstanding Purchase Invoices available for this supplier.
                              </p>
                            ) : null}
                            {eligiblePiError ? (
                              <p className="text-[10px] text-red-600 mt-0.5 leading-snug">{eligiblePiError}</p>
                            ) : null}
                          </InvoiceDetailField>
                          <InvoiceDetailField label="Outstanding">
                            <div className="so-goods-ro w-full tabular-nums">
                              {invoiceOutstanding != null ? formatMoney(invoiceOutstanding) : "—"}
                            </div>
                            {referenceInvoiceId &&
                            invoiceOutstanding == null &&
                            !eligiblePiLoading ? (
                              <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                                This invoice is no longer in the eligible outstanding list.
                              </p>
                            ) : null}
                          </InvoiceDetailField>
                        </>
                      ) : (
                        <>
                          <InvoiceDetailField label="Reference Number">
                            <Input
                              className={INVOICE_DETAIL_INPUT_CLASS}
                              value={referenceNo}
                              onChange={(e) => setReferenceNo(e.target.value)}
                              placeholder="Optional"
                            />
                          </InvoiceDetailField>
                          {warehouseId ? (
                            <InvoiceDetailField label="Bank Account (optional — refund only)">
                              <div className="space-y-1">
                                <WarehouseMappedBankAccountSelect
                                  warehouseId={warehouseId}
                                  value={bankAccountId}
                                  onChange={(id) => setBankAccountId(id)}
                                  label=""
                                />
                                <p className="text-[10px] text-muted-foreground leading-tight">
                                  Not required for a normal Debit Note (AP + adjustment + GST). Use only if
                                  settling an immediate bank refund with this note.
                                </p>
                              </div>
                            </InvoiceDetailField>
                          ) : null}
                        </>
                      )}
                    </>
                  ) : refControlsLocked || isReturnRefMode ? (
                    <div className="lg:col-span-2 min-w-0">
                      <InvoiceDetailField label="Reference Type">
                        <div className="so-goods-ro w-full">
                          {isReturnRefMode || isReturn || isPendingEntitlement
                            ? `Purchase Return${sourceReturnNo ? ` · ${sourceReturnNo}` : ""}`
                            : `Purchase Invoice${
                                referencePreview?.sourceInvoiceNo
                                  ? ` · ${referencePreview.sourceInvoiceNo}`
                                  : ""
                              }`}
                        </div>
                      </InvoiceDetailField>
                    </div>
                  ) : (
                    <>
                      <InvoiceDetailField label="Reference Number">
                        <Input
                          className={INVOICE_DETAIL_INPUT_CLASS}
                          value={referenceNo}
                          onChange={(e) => setReferenceNo(e.target.value)}
                          placeholder="Optional"
                        />
                      </InvoiceDetailField>
                      {warehouseId ? (
                        <InvoiceDetailField label="Bank Account (optional — refund only)">
                          <div className="space-y-1">
                            <WarehouseMappedBankAccountSelect
                              warehouseId={warehouseId}
                              value={bankAccountId}
                              onChange={(id) => setBankAccountId(id)}
                              label=""
                            />
                            <p className="text-[10px] text-muted-foreground leading-tight">
                              Not required for a normal Debit Note (AP + adjustment + GST). Use only if
                              settling an immediate bank refund with this note.
                            </p>
                          </div>
                        </InvoiceDetailField>
                      ) : null}
                    </>
                  )}
                </div>
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

            {usesQuantityLines ? (
              <VoucherFormSectionCard title="Particulars" flush>
                <div className="w-full space-y-2">
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
                        query={{ status: "ACTIVE" }}
                      />
                    </div>
                  ) : null}
                  <NoteQuantityLinesTable
                    lines={quantityLineViews}
                    qtyLocked={isReturnRefMode || isPendingEntitlement}
                    gstEditable={isPendingEntitlement && !saving}
                    currentQtyLabel="Qty"
                    onCurrentQtyChange={handleQuantityLineQtyChange}
                    onTaxPctChange={handleQuantityLineTaxPctChange}
                    emptyMessage={quantityLinesEmptyMessage}
                    className="so-invoice-charges-table-wrap w-full"
                  />
                </div>
              </VoucherFormSectionCard>
            ) : (
              <DebitNoteParticularsEditor
                lines={directParticularLines}
                onLinesChange={setDirectParticularLines}
                interstate={isDirectMode ? directInterstate : false}
                disabled={saving}
                allowAddRemove={!saving}
                helperText={
                  isDirectMode
                    ? "Enter adjustments, freight, packing, or other direct debit note lines here."
                    : "Enter the purchase invoice adjustment particular(s) here."
                }
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-2.5 items-start">
              <VoucherFormSectionCard
                title="Narration"
                headerActions={
                  isPendingEntitlement || isSourceRefMode ? (
                    <span className="text-red-500 text-sm font-semibold leading-none" aria-hidden>
                      *
                    </span>
                  ) : undefined
                }
              >
                <Textarea
                  className={cnMerge(VOUCHER_INPUT_CLASS, "so-goods-narration min-h-[60px] h-auto resize-y text-xs w-full")}
                  value={narration || remarks}
                  onChange={(e) => {
                    setNarration(e.target.value);
                    setRemarks(e.target.value);
                  }}
                  placeholder={
                    isPendingEntitlement || isSourceRefMode
                      ? "Enter narration…"
                      : "Optional narration…"
                  }
                  maxLength={2000}
                  disabled={saving}
                />
                {/* Attachment UI hidden for now — handlers/state kept for future enablement */}
                <div className="hidden mt-2.5 pt-2.5 border-t border-border/60">
                  <VoucherAttachmentSection
                    files={attachments.map((att) => ({
                      id: att.id,
                      fileName: att.fileName,
                      previewUrl: att.dataUrl,
                    }))}
                    readOnly={saving}
                    onAddFiles={(files) => {
                      files.forEach((f) => handleFile(f, f.name));
                    }}
                    onRemove={(id) =>
                      setAttachments((prev) => prev.filter((a) => a.id !== id))
                    }
                  />
                </div>
              </VoucherFormSectionCard>
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
              />
            </div>
          </div>
        </InvoiceFormLayout>
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
