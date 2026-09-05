"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { InvoiceFormLayout } from "@/app/(app)/accounts/components/InvoiceFormLayout";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { VOUCHER_INPUT_CLASS } from "@/components/accounts/voucher-simple-form-ui";
import { cn as cnMerge } from "@/lib/utils";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { useTransactionFormCancel } from "@/components/accounts/TransactionFormCancel";
import { transactionsApprovalActive } from "@/lib/accounts/transaction-form-phase";
import { useFormDirtySnapshot } from "@/lib/accounts/use-form-dirty-snapshot";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { VoucherSignedRoundOffInput } from "@/components/accounts/voucher-form/VoucherSignedRoundOffInput";
import {
  INVOICE_DETAIL_INPUT_CLASS,
  INVOICE_DETAIL_SELECT_CLASS,
  InvoiceDetailField,
} from "@/app/(app)/accounts/invoices/components/invoice-form-voucher-ui";
import { SearchableSelect } from "./components/SearchableSelect";
import { CreditNoteFormActionBar } from "./components/CreditNoteFormActionBar";
import { CreditNoteAmountSummary } from "./components/CreditNoteAmountSummary";
import { CreditNoteParticularsEditor } from "./components/CreditNoteParticularsEditor";
import { CreditNoteLedgerSelect } from "./components/CreditNoteLedgerSelect";
import { CreditNoteReasonDialog } from "./components/CreditNoteReasonDialog";
import { CreditNoteSourceEntitlementSection } from "./components/CreditNoteSourceEntitlementSection";
import { CreditNoteCustomerInfoButton } from "./components/CreditNoteCustomerInfoButton";
import { CreditNoteWarehouseInfoButton } from "./components/CreditNoteWarehouseInfoButton";
import { CREDIT_NOTES_LIST_PATH } from "./note-utils";
import { CreditNoteFormApi, creditNoteApiError, creditNoteErrorIncludes } from "./credit-note-form-api";
import type {
  CreateDirectCreditNotePayload,
  CreditNoteDetail,
  CreditNoteFormLine,
  DirectCnMode,
  DirectLineDraft,
  EligibleSalesInvoiceItem,
  InvoiceOption,
  PendingCreditNoteDetail,
  SchemeTypeLedgerMapping,
} from "./credit-note-form-types";
import {
  canEditDocument,
  computeDirectLinePreview,
  extractCreditNoteIdFromPath,
  formatCnMoney,
  applyPendingLineGstPreview,
  isPendingGeneratedSource,
  isReadOnlyStatus,
  isUuid,
  newDirectLine,
  pageTitleFor,
  pendingLineKey,
  snapshotStr,
  toDateInput,
  toNum,
  todayIso,
} from "./credit-note-form-utils";
import { useCustomersDropdown, useCustomerDetails, useWarehousesDropdown } from "@/hooks/sales/use-sales-orders";
import { LedgerService } from "@/services/ledger.service";
import { UserListService } from "@/services/user-list.service";
import { AuthService } from "@/services/auth.service";
import "./credit-note-tx.css";
import "@/app/(app)/accounts/invoices/sales-order-invoice-form-compact.css";

type FormModeProp = "fresh" | "return" | "scheme";

type DirectExtraCharge = {
  id: string;
  description: string;
  ledgerId: string;
  ledgerName: string;
  amount: string;
  gstPct: string;
};

function nestedRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function detailString(
  obj: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  if (!obj) return "";
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function formatPaymentTerms(paymentType?: string, creditDays?: number | string): string {
  if (!paymentType) return "";
  const type = paymentType.toLowerCase();
  if (type === "advance") return "Advance";
  if (type === "credit") {
    const days = creditDays ? Number(creditDays) : 30;
    return `Net ${days}`;
  }
  return paymentType;
}

function parseOutstandingAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = toNum(value, Number.NaN);
  return Number.isFinite(n) ? n : null;
}

function mapEligibleInvoice(item: EligibleSalesInvoiceItem): InvoiceOption {
  return {
    sales_invoice_id: String(item.sales_invoice_id ?? ""),
    invoice_number: String(item.invoice_number ?? ""),
    invoice_date: toDateInput(item.invoice_date),
    invoice_amount: toNum(item.invoice_amount),
    outstanding_amount: parseOutstandingAmount(item.outstanding_amount),
    customer_id: String(item.customer_id ?? ""),
    warehouse_id: String(item.warehouse_id ?? ""),
    invoice_type: String(item.invoice_type ?? ""),
    open_item_id: String(item.open_item_id ?? ""),
  };
}

export default function CreditNoteFormPageClient({
  creditNoteId: creditNoteIdProp,
}: {
  creditNoteId?: number;
  returnId?: string;
  schemeKey?: string;
  entitlementId?: string;
  invoiceId?: string;
  mode?: FormModeProp;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast, showToast, dismissToast } = useAccountsToast();

  const routeCnId = extractCreditNoteIdFromPath(pathname);
  const pendingId = searchParams.get("pendingId")?.trim() || "";
  const invoiceIdFromUrl = searchParams.get("invoiceId")?.trim() || "";
  const legacyPendingNav = Boolean(
    searchParams.get("returnId") ||
      searchParams.get("schemeKey") ||
      searchParams.get("entitlementId"),
  );

  const [cnId, setCnId] = useState<string | null>(routeCnId);
  const [pending, setPending] = useState<PendingCreditNoteDetail | null>(null);
  const [cn, setCn] = useState<CreditNoteDetail | null>(null);
  const [pageLoading, setPageLoading] = useState(Boolean(routeCnId || pendingId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [configReady, setConfigReady] = useState(false);

  const [cnDate, setCnDate] = useState(todayIso());
  const [warehouseId, setWarehouseId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [narration, setNarration] = useState("");
  const [approverId, setApproverId] = useState("");
  const [directMode, setDirectMode] = useState<DirectCnMode>("on_account");
  const [invoiceId, setInvoiceId] = useState("");
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const invoiceIdRef = useRef(invoiceId);
  const cnReferencesRef = useRef(cn?.references);
  invoiceIdRef.current = invoiceId;
  cnReferencesRef.current = cn?.references;
  const [directLines, setDirectLines] = useState<DirectLineDraft[]>([newDirectLine()]);
  const [arLedgerName, setArLedgerName] = useState("");
  const [arLedgerCode, setArLedgerCode] = useState("");
  const [schemeMappings, setSchemeMappings] = useState<SchemeTypeLedgerMapping[]>([]);
  const [approvers, setApprovers] = useState<{ value: string; label: string }[]>([]);
  const [reasonDialog, setReasonDialog] = useState<"reject" | "cancel" | null>(null);
  const [directExtraCharges, setDirectExtraCharges] = useState<DirectExtraCharge[]>([]);
  const [roundOff, setRoundOff] = useState(0);
  const [editablePendingLines, setEditablePendingLines] = useState<CreditNoteFormLine[]>([]);

  const { data: customerData } = useCustomersDropdown();
  const { data: warehouseData } = useWarehousesDropdown();
  const { data: customerDetails } = useCustomerDetails(customerId || null);

  const sourceType = cn?.source_type || pending?.source_type || "DIRECT";
  const isSalesReturnCn = String(sourceType) === "SALES_RETURN";
  const isPendingFlow = Boolean(pendingId) || Boolean(cn?.pending_credit_note_id) || isPendingGeneratedSource(String(sourceType));
  const status = cn?.status || (isPendingFlow && !cnId ? undefined : "DRAFT");
  const readOnly = isReadOnlyStatus(status) || status === "PENDING_APPROVAL" || status === "APPROVED";
  const fieldsEditable = canEditDocument(status) && !readOnly;
  const pendingEntitlementLocked = isPendingFlow;
  const linesEditable = fieldsEditable && (!pendingEntitlementLocked || !isSalesReturnCn);
  const gstEditableOnPending = fieldsEditable && pendingEntitlementLocked && isSalesReturnCn;

  const customers = useMemo(() => {
    if (!Array.isArray(customerData)) return [];
    return customerData.map((c: Record<string, unknown>) => ({
      id: String(c.customer_id ?? ""),
      code: String(c.customer_code ?? ""),
      name: String(c.customer_name ?? ""),
    })).filter((c) => c.id);
  }, [customerData]);

  const warehouses = useMemo(() => {
    if (!Array.isArray(warehouseData)) return [];
    return warehouseData.map((w: Record<string, unknown>) => ({
      id: String(w.warehouse_id ?? ""),
      name: String(w.warehouse_name ?? w.name ?? ""),
      state: String(w.state ?? w.warehouse_state ?? ""),
    })).filter((w) => w.id);
  }, [warehouseData]);

  const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);
  const customerGstin =
    snapshotStr(cn?.customer_snapshot, "gstin_no", "gstin") ||
    snapshotStr(pending?.customer_snapshot, "gstin_no", "gstin") ||
    String(
      (customerDetails as Record<string, unknown> | undefined)?.gstin_no ||
        (customerDetails as Record<string, unknown> | undefined)?.gstin ||
        "",
    );
  const customerName =
    cn?.customer?.customer_name ||
    pending?.customer?.customer_name ||
    snapshotStr(cn?.customer_snapshot, "customer_name") ||
    snapshotStr(pending?.customer_snapshot, "customer_name") ||
    customers.find((c) => c.id === customerId)?.name ||
    "";
  const salesperson =
    snapshotStr(cn?.customer_snapshot, "sales_man_name", "salesperson_name") ||
    String(
      (customerDetails as Record<string, unknown> | undefined)?.sales_man_name ||
        (customerDetails as Record<string, unknown> | undefined)?.salesperson_name ||
        "",
    );
  const customerBillingState =
    snapshotStr(cn?.place_of_supply_snapshot, "customer_state") ||
    String(
      (customerDetails as Record<string, unknown> | undefined)?.billing_state ||
        ((customerDetails as Record<string, unknown> | undefined)?.branches as Array<Record<string, unknown>> | undefined)?.find(
          (b) => b.is_main_branch,
        )?.billing_state ||
        "",
    );
  const warehouseState =
    selectedWarehouse?.state ||
    snapshotStr(cn?.warehouse_snapshot, "state") ||
    snapshotStr(pending?.warehouse_snapshot, "state") ||
    cn?.warehouse?.state ||
    pending?.warehouse?.state ||
    "";
  const interstate = Boolean(
    cn?.is_interstate ??
      (warehouseState && customerBillingState
        ? warehouseState.trim().toLowerCase() !== customerBillingState.trim().toLowerCase()
        : false),
  );

  const schemeType =
    pending?.scheme?.scheme_type ||
    snapshotStr(pending?.scheme_snapshot, "scheme_type") ||
    cn?.scheme?.scheme_type ||
    "";
  const schemeMapping = schemeMappings.find((m) => m.scheme_type === schemeType) ?? null;
  const supportingLedgerName =
    directLines[0]?.ledger_name ||
    (cn?.lines?.[0]
      ? cn.lines[0].ledger?.ledger_name || snapshotStr(cn.lines[0].ledger_snapshot, "ledger_name")
      : "") ||
    schemeMapping?.ledger?.ledger_name ||
    "";

  const selectedInvoice = invoices.find((i) => i.sales_invoice_id === invoiceId) || null;
  const invoiceOutstanding =
    typeof selectedInvoice?.outstanding_amount === "number"
      ? selectedInvoice.outstanding_amount
      : null;

  const customerCode =
    customers.find((c) => c.id === customerId)?.code ||
    snapshotStr(cn?.customer_snapshot, "customer_code") ||
    snapshotStr(pending?.customer_snapshot, "customer_code") ||
    cn?.customer?.customer_code ||
    pending?.customer?.customer_code ||
    "";

  const customerInfo = useMemo(() => {
    const details = nestedRecord(customerDetails);
    const branches = Array.isArray(details?.branches)
      ? (details.branches as Array<Record<string, unknown>>)
      : [];
    const mainBranch = branches.find((b) => b.is_main_branch) || branches[0] || null;
    const billingFromBranch = mainBranch
      ? [
          mainBranch.billing_address_line_1,
          mainBranch.billing_address_line_2,
          mainBranch.billing_city,
          mainBranch.billing_state,
          mainBranch.billing_pincode,
        ]
          .filter(Boolean)
          .join(", ")
      : "";
    const billing =
      billingFromBranch ||
      snapshotStr(cn?.customer_snapshot, "billing_address", "registered_gst_address") ||
      detailString(details, "registered_gst_address");
    const typeObj = nestedRecord(details?.customer_type);
    const customerType =
      detailString(typeObj, "customer_type_name", "name") ||
      detailString(details, "customer_type_name");
    const paymentTerms = formatPaymentTerms(
      detailString(details, "payment_type"),
      details?.credit_days as number | string | undefined,
    );
    const linkedLedger = arLedgerName
      ? `${arLedgerCode ? `${arLedgerCode} · ` : ""}${arLedgerName}`
      : "";
    return {
      customerName,
      customerCode,
      gstin: customerGstin,
      billingAddress: billing,
      state: customerBillingState,
      linkedLedger,
      customerType,
      paymentTerms,
      salesperson,
    };
  }, [
    arLedgerCode,
    arLedgerName,
    cn?.customer_snapshot,
    customerBillingState,
    customerCode,
    customerDetails,
    customerGstin,
    customerName,
    salesperson,
  ]);

  const pendingLines: CreditNoteFormLine[] =
    editablePendingLines.length > 0
      ? editablePendingLines
      : cn?.lines?.length
        ? cn.lines
        : pending?.lines ?? [];

  useEffect(() => {
    const sourceLines = cn?.lines?.length ? cn.lines : pending?.lines ?? [];
    setEditablePendingLines(sourceLines);
  }, [cn?.credit_note_id, cn?.lines, pending?.pending_credit_note_id, pending?.lines]);

  useEffect(() => {
    if (isSalesReturnCn) {
      setDirectExtraCharges([]);
    }
  }, [isSalesReturnCn]);

  const handlePendingLineGstChange = (lineKey: string, gstRate: string) => {
    setEditablePendingLines((prev) =>
      prev.map((line) =>
        pendingLineKey(line) === lineKey
          ? applyPendingLineGstPreview(line, gstRate, interstate)
          : line,
      ),
    );
  };

  const applyCn = useCallback((detail: CreditNoteDetail) => {
    setCn(detail);
    setCnId(detail.credit_note_id);
    setCnDate(toDateInput(detail.cn_date) || todayIso());
    setWarehouseId(detail.warehouse_id || "");
    setCustomerId(detail.customer_id || "");
    setNarration(detail.narration || "");
    setRoundOff(toNum(detail.round_off_amount));
    setArLedgerName(detail.party_ledger?.ledger_name || snapshotStr(detail.party_ledger_snapshot, "ledger_name"));
    setArLedgerCode(detail.party_ledger?.ledger_code || snapshotStr(detail.party_ledger_snapshot, "ledger_code"));
    const src = String(detail.source_type || "DIRECT");
    if (src !== "SALES_RETURN") {
      const invRef = (detail.references || []).find((r) => r.reference_type === "SALES_INVOICE");
      setDirectMode(invRef ? "against_invoice" : "on_account");
      setInvoiceId(invRef?.reference_id || "");
      setDirectLines(
        (detail.lines || []).length
          ? (detail.lines || []).map((line) => ({
              key: line.credit_note_line_id || `line-${line.line_number}`,
              description: line.description || "",
              ledger_id: line.ledger_id || line.ledger?.ledger_id || "",
              ledger_name: line.ledger?.ledger_name || snapshotStr(line.ledger_snapshot, "ledger_name"),
              quantity: line.quantity != null ? String(line.quantity) : "",
              rate:
                toNum(line.quantity) > 0
                  ? String(Math.round((toNum(line.taxable_amount) / Math.max(toNum(line.quantity), 1)) * 10000) / 10000)
                  : String(line.taxable_amount ?? ""),
              taxable_amount: String(line.taxable_amount ?? ""),
              gst_applicable: toNum(line.gst_rate) > 0,
              gst_rate: String(toNum(line.gst_rate) || 18),
            }))
          : [newDirectLine()],
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setPageLoading(true);
      setError(null);
      try {
        if (routeCnId) {
          const detail = await CreditNoteFormApi.getById(routeCnId);
          if (cancelled) return;
          applyCn(detail);
          if (detail.pending_credit_note_id) {
            try {
              const p = await CreditNoteFormApi.getPendingById(detail.pending_credit_note_id);
              if (!cancelled) {
                setPending(p);
              }
            } catch {
              /* pending snapshot on CN is enough */
            }
          }
        } else if (pendingId && isUuid(pendingId)) {
          const p = await CreditNoteFormApi.getPendingById(pendingId);
          if (cancelled) return;
          setPending(p);
          setCustomerId(p.customer_id);
          setWarehouseId(p.warehouse_id || "");
          setCnDate(toDateInput(p.eligibility_date) || todayIso());
          setNarration("");
          setArLedgerName(snapshotStr(p.customer_snapshot, "ledger_name", "party_ledger_name"));
          if (p.credit_note?.credit_note_id) {
            setError(
              `PENDING_CREDIT_NOTE_ALREADY_CONVERTED: Already converted to ${p.credit_note.cn_number || "a Credit Note"}.`,
            );
          }
          if (p.source_type !== "SALES_RETURN") {
            const pSchemeType =
              p.scheme?.scheme_type ||
              snapshotStr(p.scheme_snapshot, "scheme_type");
            const mapping = schemeMappings.find((m) => m.scheme_type === pSchemeType);
            const defaultLedgerId = mapping?.ledger?.ledger_id || mapping?.ledger_id || "";
            const defaultLedgerName = mapping?.ledger?.ledger_name || "";
            if (p.lines && p.lines.length > 0) {
              setDirectLines(
                p.lines.map((l) => {
                  const taxable =
                    l.taxable_credit_amount != null
                      ? String(l.taxable_credit_amount)
                      : l.eligible_base_amount != null
                        ? String(l.eligible_base_amount)
                        : "";
                  const gstApplicable = toNum(l.gst_rate) > 0 || toNum(l.gst_amount) > 0;
                  return {
                    key: l.pending_credit_note_line_id || `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    description: l.description || p.scheme?.scheme_name || "Scheme Credit",
                    ledger_id: l.ledger_id || defaultLedgerId,
                    ledger_name: l.ledger?.ledger_name || defaultLedgerName,
                    quantity: "",
                    rate: "",
                    taxable_amount: taxable,
                    gst_applicable: gstApplicable,
                    gst_rate: String(toNum(l.gst_rate) || 18),
                  };
                }),
              );
            } else {
              const taxable = String(p.taxable_credit_amount ?? p.eligible_base_amount ?? "");
              setDirectLines([
                {
                  key: `line-${Date.now()}`,
                  description: p.scheme?.scheme_name || "Scheme Credit Note",
                  ledger_id: defaultLedgerId,
                  ledger_name: defaultLedgerName,
                  quantity: "",
                  rate: "",
                  taxable_amount: taxable,
                  gst_applicable: toNum(p.gst_amount) > 0,
                  gst_rate: "18",
                },
              ]);
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError(creditNoteApiError(e, "Failed to load Credit Note."));
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [routeCnId, pendingId, applyCn]);

  const refreshConfig = useCallback(async () => {
    try {
      const cfg = await CreditNoteFormApi.getConfig();
      setApprovalRequired(cfg.approval_required !== false);
    } catch (e) {
      setApprovalRequired(true);
      showToast(
        creditNoteApiError(e, "Could not load Credit Note approval settings. Approval remains required."),
        "error",
      );
    } finally {
      setConfigReady(true);
    }
  }, [showToast]);

  useEffect(() => {
    void refreshConfig();
  }, [refreshConfig]);

  useEffect(() => {
    CreditNoteFormApi.listSchemeTypeLedgerMappings()
      .then(setSchemeMappings)
      .catch(() => setSchemeMappings([]));
    UserListService.dropdown()
      .then((rows) =>
        setApprovers(
          rows.map((u) => ({
            value: u.userId,
            label: u.label || `${u.firstName} ${u.lastName}`.trim() || u.username || u.userId,
          })),
        ),
      )
      .catch(() => setApprovers([]));
  }, []);

  useEffect(() => {
    if (!schemeMappings.length || !pending || pending.source_type === "SALES_RETURN") return;
    const pSchemeType =
      pending.scheme?.scheme_type ||
      snapshotStr(pending.scheme_snapshot, "scheme_type");
    const mapping = schemeMappings.find((m) => m.scheme_type === pSchemeType);
    if (!mapping?.ledger?.ledger_id && !mapping?.ledger_id) return;
    const targetId = mapping.ledger?.ledger_id || mapping.ledger_id || "";
    const targetName = mapping.ledger?.ledger_name || "";
    setDirectLines((prev) =>
      prev.map((l) =>
        !l.ledger_id
          ? {
              ...l,
              ledger_id: targetId,
              ledger_name: targetName,
            }
          : l,
      ),
    );
  }, [schemeMappings, pending]);

  useEffect(() => {
    if (!customerId || pendingEntitlementLocked) return;
    LedgerService.syncCustomerLedger(customerId)
      .then((res) => {
        setArLedgerName(res.ledgerName);
        setArLedgerCode(res.ledgerCode);
      })
      .catch(() => {
        setArLedgerName("");
        setArLedgerCode("");
      });
  }, [customerId, pendingEntitlementLocked]);

  useEffect(() => {
    if (pendingEntitlementLocked || directMode !== "against_invoice" || !customerId) {
      setInvoices([]);
      setInvoicesLoading(false);
      setInvoicesError(null);
      return;
    }
    let cancelled = false;
    setInvoices([]);
    setInvoicesLoading(true);
    setInvoicesError(null);
    CreditNoteFormApi.listEligibleSalesInvoices(customerId, { page: 1, page_size: 100 })
      .then((res) => {
        if (cancelled) return;
        const mapped = res.items.map(mapEligibleInvoice).filter((inv) => inv.sales_invoice_id);
        const selectedId = invoiceIdRef.current;
        if (selectedId && !mapped.some((inv) => inv.sales_invoice_id === selectedId)) {
          const ref = (cnReferencesRef.current || []).find(
            (r) => r.reference_type === "SALES_INVOICE" && r.reference_id === selectedId,
          );
          mapped.unshift({
            sales_invoice_id: selectedId,
            invoice_number: ref?.reference_code || selectedId,
            invoice_date: toDateInput(ref?.reference_date),
            invoice_amount: 0,
            outstanding_amount: null,
          });
        }
        setInvoices(mapped);
        setInvoicesLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setInvoices([]);
        setInvoicesLoading(false);
        const msg = creditNoteApiError(e, "Could not load eligible Sales Invoices.");
        setInvoicesError(msg);
        showToast(msg, "error");
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, pendingEntitlementLocked, directMode, showToast]);

  useEffect(() => {
    if (pendingEntitlementLocked) return;
    if (invoiceIdFromUrl && isUuid(invoiceIdFromUrl)) {
      setDirectMode("against_invoice");
      setInvoiceId(invoiceIdFromUrl);
    }
  }, [invoiceIdFromUrl, pendingEntitlementLocked]);

  const directTotals = useMemo(() => {
    const fromLines = directLines.reduce(
      (acc, line) => {
        const p = computeDirectLinePreview(line, interstate);
        acc.taxable += p.basicAmount;
        acc.cgst += p.cgst;
        acc.sgst += p.sgst;
        acc.igst += p.igst;
        acc.gst += p.gstAmount;
        acc.raw += p.lineTotal;
        return acc;
      },
      { taxable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0, raw: 0 },
    );
    for (const c of directExtraCharges) {
      const taxable = toNum(c.amount);
      if (taxable <= 0) continue;
      const rate = toNum(c.gstPct);
      const gst = Math.round(((taxable * rate) / 100) * 100) / 100;
      const half = Math.round((gst / 2) * 100) / 100;
      fromLines.taxable += taxable;
      if (interstate) {
        fromLines.igst += gst;
      } else {
        fromLines.cgst += half;
        fromLines.sgst += Math.round((gst - half) * 100) / 100;
      }
      fromLines.gst += gst;
      fromLines.raw += taxable + gst;
    }
    return fromLines;
  }, [directLines, directExtraCharges, interstate]);

  const amountPreview = useMemo(() => {
    if (cn && !fieldsEditable) {
      const taxable = toNum(cn.taxable_amount);
      const cgst = toNum(cn.cgst_amount);
      const sgst = toNum(cn.sgst_amount);
      const igst = toNum(cn.igst_amount);
      const gst = toNum(cn.gst_amount);
      const storedRoundOff = toNum(cn.round_off_amount);
      const total = toNum(cn.cn_amount);
      return { taxable, cgst, sgst, igst, gst, roundOff: storedRoundOff, total };
    }
    if (isSalesReturnCn) {
      let taxable = 0;
      let cgst = 0;
      let sgst = 0;
      let igst = 0;
      let gst = 0;
      if (pendingLines.length) {
        for (const line of pendingLines) {
          taxable += toNum(line.taxable_amount ?? line.taxable_credit_amount);
          cgst += toNum(line.cgst_amount);
          sgst += toNum(line.sgst_amount);
          igst += toNum(line.igst_amount);
          gst += toNum(line.gst_amount);
        }
      } else if (pending) {
        taxable = toNum(pending.taxable_credit_amount);
        cgst = toNum(pending.cgst_amount);
        sgst = toNum(pending.sgst_amount);
        igst = toNum(pending.igst_amount);
        gst = toNum(pending.gst_amount);
      }
      const raw = Math.round((taxable + gst) * 100) / 100;
      return {
        taxable: Math.round(taxable * 100) / 100,
        cgst: Math.round(cgst * 100) / 100,
        sgst: Math.round(sgst * 100) / 100,
        igst: Math.round(igst * 100) / 100,
        gst: Math.round(gst * 100) / 100,
        roundOff,
        total: Math.round((raw + roundOff) * 100) / 100,
      };
    }
    const raw = Math.round(directTotals.raw * 100) / 100;
    const total = Math.round((raw + roundOff) * 100) / 100;
    return {
      taxable: Math.round(directTotals.taxable * 100) / 100,
      cgst: Math.round(directTotals.cgst * 100) / 100,
      sgst: Math.round(directTotals.sgst * 100) / 100,
      igst: Math.round(directTotals.igst * 100) / 100,
      gst: Math.round(directTotals.gst * 100) / 100,
      roundOff,
      total,
    };
  }, [
    cn,
    fieldsEditable,
    pendingEntitlementLocked,
    pending,
    pendingLines,
    isSalesReturnCn,
    directTotals,
    directExtraCharges,
    interstate,
    roundOff,
  ]);

  const buildPendingExtraChargesPayload = () => {
    if (isSalesReturnCn) return [];
    return directExtraCharges
      .filter((c) => toNum(c.amount) > 0 && c.description.trim() && isUuid(c.ledgerId))
      .map((c) => ({
        description: c.description.trim(),
        ledger_id: c.ledgerId,
        taxable_amount: toNum(c.amount),
        gst_rate: toNum(c.gstPct),
      }));
  };

  const buildPendingLineGstOverrides = () =>
    pendingLines
      .filter((line) => isUuid(line.pending_credit_note_line_id))
      .map((line) => ({
        pending_credit_note_line_id: line.pending_credit_note_line_id as string,
        gst_rate: toNum(line.gst_rate),
      }));

  const buildDraftLineGstOverrides = () =>
    pendingLines
      .filter((line) => isUuid(line.credit_note_line_id))
      .map((line) => ({
        credit_note_line_id: line.credit_note_line_id as string,
        gst_rate: toNum(line.gst_rate),
      }));

  const validatePendingCharges = (): string | null => {
    if (isSalesReturnCn) return null;
    for (const c of directExtraCharges) {
      const amt = toNum(c.amount);
      if (amt <= 0 && !c.description.trim() && !c.ledgerId) continue;
      if (amt <= 0) continue;
      if (!c.description.trim()) {
        return "Enter a description for each additional charge with an amount.";
      }
      if (!isUuid(c.ledgerId)) {
        return `Select a ledger for additional charge "${c.description.trim() || "row"}".`;
      }
    }
    return null;
  };

  const buildDirectPayload = (): CreateDirectCreditNotePayload => {
    const mainLines = directLines.map((line) => {
      const preview = computeDirectLinePreview(line, interstate);
      const qty = toNum(line.quantity);
      return {
        description: line.description.trim(),
        ledger_id: line.ledger_id,
        calculation_basis: qty > 0 ? ("QUANTITY" as const) : ("DIRECT" as const),
        quantity: qty > 0 ? qty : null,
        eligible_base_amount: preview.basicAmount,
        taxable_amount: preview.basicAmount,
        gst_rate: line.gst_applicable ? toNum(line.gst_rate) : 0,
      };
    });
    const extraLines = directExtraCharges
      .filter((c) => toNum(c.amount) > 0 && c.description.trim() && isUuid(c.ledgerId))
      .map((c) => ({
        description: c.description.trim(),
        ledger_id: c.ledgerId,
        calculation_basis: "DIRECT" as const,
        quantity: null,
        eligible_base_amount: toNum(c.amount),
        taxable_amount: toNum(c.amount),
        gst_rate: toNum(c.gstPct),
      }));
    const lines = [...mainLines, ...extraLines];
    const references =
      directMode === "against_invoice" && invoiceId
        ? [
            {
              reference_type: "SALES_INVOICE" as const,
              reference_id: invoiceId,
              reference_code: selectedInvoice?.invoice_number || null,
              reference_date: selectedInvoice?.invoice_date || null,
              relation_type: "INVOICE_AGAINST" as const,
              // Full CN amount (includes Round Off) settles the selected invoice.
              allocated_amount: amountPreview.total > 0 ? amountPreview.total : null,
            },
          ]
        : [];
    return {
      cn_date: cnDate,
      warehouse_id: warehouseId,
      customer_id: customerId,
      narration: narration.trim() || null,
      round_off_amount: roundOff,
      lines,
      references,
    };
  };

  const validateDirect = (): string | null => {
    if (!cnDate) return "Credit Note Date is required.";
    if (!warehouseId) return "Warehouse is required.";
    if (!customerId) return "Customer is required.";
    if (!directLines.length) return "At least one particular line is required.";
    for (const [i, line] of directLines.entries()) {
      if (!line.description.trim()) return `Line ${i + 1}: description is required.`;
      if (!isUuid(line.ledger_id)) return `Line ${i + 1}: select an adjustment ledger.`;
      if (computeDirectLinePreview(line, interstate).basicAmount <= 0) {
        return `Line ${i + 1}: taxable amount must be greater than zero.`;
      }
    }
    for (const c of directExtraCharges) {
      if (toNum(c.amount) <= 0 && !c.description.trim()) continue;
      if (!c.description.trim()) return "Enter a description for each additional charge.";
      if (!isUuid(c.ledgerId)) {
        return `Select a ledger for additional charge "${c.description.trim()}".`;
      }
      if (toNum(c.amount) <= 0) {
        return `Enter an amount for additional charge "${c.description.trim()}".`;
      }
    }
    if (directMode === "against_invoice") {
      if (!invoiceId) return "Select a Sales Invoice or switch to On-account.";
      const cnAmount = amountPreview.total;
      if (cnAmount <= 0) return "Credit Note Amount must be greater than zero.";
      if (
        selectedInvoice?.outstanding_amount != null &&
        cnAmount > selectedInvoice.outstanding_amount + 0.009
      ) {
        return `Credit Note Amount cannot exceed the selected invoice outstanding amount of ${formatCnMoney(selectedInvoice.outstanding_amount)}.`;
      }
    }
    return null;
  };

  const navigatingAwayRef = useRef(false);

  const guardBusy = async (fn: () => Promise<void>) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    navigatingAwayRef.current = false;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      const msg = creditNoteApiError(e, "Request failed.");
      setError(msg);
      showToast(msg, "error");
    } finally {
      // Clearing busy after router navigation can abort soft nav
      if (!navigatingAwayRef.current) {
        submittingRef.current = false;
        setBusy(false);
      }
    }
  };

  const goToList = () => {
    navigatingAwayRef.current = true;
    router.replace(CREDIT_NOTES_LIST_PATH);
  };

  const goToEdit = (id: string) => {
    navigatingAwayRef.current = true;
    router.replace(`${CREDIT_NOTES_LIST_PATH}/${id}/edit`);
  };

  const goToDetail = (id: string) => {
    navigatingAwayRef.current = true;
    router.replace(`${CREDIT_NOTES_LIST_PATH}/${id}`);
  };

  const requireCreditNoteId = (detail: CreditNoteDetail | null | undefined): string => {
    const id = detail?.credit_note_id?.trim() || "";
    if (!isUuid(id)) {
      throw new Error("CREDIT_NOTE_ID_MISSING: The server did not return a Credit Note id.");
    }
    return id;
  };

  const refreshConfigIfApprovalDisabled = async (error: unknown) => {
    if (creditNoteErrorIncludes(error, "CREDIT_NOTE_APPROVAL_DISABLED")) {
      await refreshConfig();
    }
  };

  const updateCurrentDraft = async (id: string): Promise<CreditNoteDetail> => {
    if (isSalesReturnCn) {
      const updated = await CreditNoteFormApi.updateDraft(id, {
        cn_date: cnDate,
        narration: narration.trim() || null,
        round_off_amount: roundOff,
        line_gst_overrides: buildDraftLineGstOverrides(),
      });
      applyCn(updated);
      return updated;
    }
    const invalid = validateDirect();
    if (invalid) throw new Error(invalid);
    const payload = buildDirectPayload();
    const updated = await CreditNoteFormApi.updateDraft(id, {
      cn_date: payload.cn_date,
      narration: payload.narration,
      round_off_amount: payload.round_off_amount,
      lines: payload.lines,
      references: payload.references,
    });
    applyCn(updated);
    return updated;
  };

  const postById = async (id: string): Promise<CreditNoteDetail> => {
    if (!isUuid(id)) {
      throw new Error("CREDIT_NOTE_ID_MISSING: Cannot post before the Credit Note exists.");
    }
    try {
      const posted = await CreditNoteFormApi.post(id);
      applyCn(posted);
      return posted;
    } catch (e) {
      await refreshConfigIfApprovalDisabled(e);
      if (
        creditNoteErrorIncludes(e, "ALREADY_POSTED") ||
        /already posted/i.test(creditNoteApiError(e, ""))
      ) {
        const latest = await CreditNoteFormApi.getById(id);
        applyCn(latest);
        if (latest.status === "POSTED") return latest;
      }
      throw e;
    }
  };

  const saveDraft = () =>
    guardBusy(async () => {
      if (pendingId && !cnId) {
        if (pending?.credit_note?.credit_note_id) {
          throw new Error("PENDING_CREDIT_NOTE_ALREADY_CONVERTED: This Pending CN is already converted.");
        }
        if (isSalesReturnCn) {
          const chargeErr = validatePendingCharges();
          if (chargeErr) throw new Error(chargeErr);
          const created = await CreditNoteFormApi.createFromPending(pendingId, {
            cn_date: cnDate,
            narration: narration.trim() || null,
            remarks: pending?.remarks || null,
            round_off_amount: roundOff,
            line_gst_overrides: buildPendingLineGstOverrides(),
            extra_charges: buildPendingExtraChargesPayload(),
          });
          applyCn(created);
          showToast("Credit Note created as Draft", "success");
          goToList();
          return;
        }
        const invalid = validateDirect();
        if (invalid) throw new Error(invalid);
        const directPayload = buildDirectPayload();
        const created = await CreditNoteFormApi.createFromPending(pendingId, {
          cn_date: cnDate,
          narration: narration.trim() || null,
          remarks: pending?.remarks || null,
          round_off_amount: roundOff,
          lines: directPayload.lines,
        });
        applyCn(created);
        showToast("Credit Note created as Draft", "success");
        goToList();
        return;
      }
      if (cnId) {
        if (isSalesReturnCn) {
          const updated = await CreditNoteFormApi.updateDraft(cnId, {
            cn_date: cnDate,
            narration: narration.trim() || null,
            round_off_amount: roundOff,
            line_gst_overrides: buildDraftLineGstOverrides(),
          });
          applyCn(updated);
          showToast("Draft updated", "success");
          goToList();
          return;
        }
        const invalid = validateDirect();
        if (invalid) throw new Error(invalid);
        const payload = buildDirectPayload();
        const updated = await CreditNoteFormApi.updateDraft(cnId, {
          cn_date: payload.cn_date,
          narration: payload.narration,
          round_off_amount: payload.round_off_amount,
          lines: payload.lines,
          references: payload.references,
        });
        applyCn(updated);
        showToast("Draft updated", "success");
        goToList();
        return;
      }
      const invalid = validateDirect();
      if (invalid) throw new Error(invalid);
      const created = await CreditNoteFormApi.createDirect(buildDirectPayload());
      applyCn(created);
      showToast("Credit Note saved as Draft", "success");
      goToList();
    });

  const ensureSavedId = async (): Promise<string> => {
    if (cnId) return cnId;
    if (pendingId) {
      if (isSalesReturnCn) {
        const chargeErr = validatePendingCharges();
        if (chargeErr) throw new Error(chargeErr);
        const created = await CreditNoteFormApi.createFromPending(pendingId, {
          cn_date: cnDate,
          narration: narration.trim() || null,
          remarks: pending?.remarks || null,
          round_off_amount: roundOff,
          line_gst_overrides: buildPendingLineGstOverrides(),
          extra_charges: buildPendingExtraChargesPayload(),
        });
        applyCn(created);
        return created.credit_note_id;
      }
      const invalid = validateDirect();
      if (invalid) throw new Error(invalid);
      const directPayload = buildDirectPayload();
      const created = await CreditNoteFormApi.createFromPending(pendingId, {
        cn_date: cnDate,
        narration: narration.trim() || null,
        remarks: pending?.remarks || null,
        round_off_amount: roundOff,
        lines: directPayload.lines,
      });
      applyCn(created);
      return created.credit_note_id;
    }
    const invalid = validateDirect();
    if (invalid) throw new Error(invalid);
    const created = await CreditNoteFormApi.createDirect(buildDirectPayload());
    applyCn(created);
    return created.credit_note_id;
  };

  const submitForApproval = () =>
    guardBusy(async () => {
      try {
        if (!approverId) throw new Error("CREDIT_NOTE_APPROVER_REQUIRED: Select an approver before submitting.");
        if (!isSalesReturnCn) {
          const invalid = validateDirect();
          if (invalid) throw new Error(invalid);
        }
        const id = await ensureSavedId();
        const updated = await CreditNoteFormApi.submit(id, approverId);
        applyCn(updated);
        showToast("Submitted for approval", "success");
        goToEdit(id);
      } catch (e) {
        await refreshConfigIfApprovalDisabled(e);
        throw e;
      }
    });

  const approve = () =>
    guardBusy(async () => {
      try {
        if (!cnId) return;
        const updated = await CreditNoteFormApi.approve(cnId);
        applyCn(updated);
        showToast("Credit Note approved", "success");
      } catch (e) {
        await refreshConfigIfApprovalDisabled(e);
        throw e;
      }
    });

  const postCn = () =>
    guardBusy(async () => {
      try {
        if (!transactionsApprovalActive(approvalRequired)) {
          if (status === "DRAFT" && cnId) {
            const updated = await updateCurrentDraft(cnId);
            if (updated.status && updated.status !== "DRAFT") {
              throw new Error("CREDIT_NOTE_INVALID_STATUS: Cannot post until the Credit Note is a Draft.");
            }
            await postById(requireCreditNoteId(updated));
            showToast("Credit Note posted", "success");
            goToList();
            return;
          }
          if ((status === "PENDING_APPROVAL" || status === "APPROVED") && cnId) {
            await postById(cnId);
            showToast("Credit Note posted", "success");
            goToList();
            return;
          }
          return;
        }
        if (!cnId) return;
        const updated = await CreditNoteFormApi.post(cnId);
        applyCn(updated);
        showToast("Credit Note posted", "success");
        goToList();
      } catch (e) {
        await refreshConfigIfApprovalDisabled(e);
        throw e;
      }
    });

  const saveAndPost = () =>
    guardBusy(async () => {
      try {
        if (pendingId && !cnId) {
          if (!cnDate) throw new Error("Credit Note Date is required.");
          if (pending?.credit_note?.credit_note_id) {
            throw new Error("PENDING_CREDIT_NOTE_ALREADY_CONVERTED: This Pending CN is already converted.");
          }
          if (isSalesReturnCn) {
            const chargeErr = validatePendingCharges();
            if (chargeErr) throw new Error(chargeErr);
            const created = await CreditNoteFormApi.createFromPending(pendingId, {
              cn_date: cnDate,
              narration: narration.trim() || null,
              remarks: pending?.remarks || null,
              round_off_amount: roundOff,
              line_gst_overrides: buildPendingLineGstOverrides(),
              extra_charges: buildPendingExtraChargesPayload(),
            });
            const id = requireCreditNoteId(created);
            applyCn(created);
            try {
              await postById(id);
            } catch (e) {
              goToEdit(id);
              throw e;
            }
            showToast("Credit Note posted", "success");
            goToList();
            return;
          }
          const invalid = validateDirect();
          if (invalid) throw new Error(invalid);
          const directPayload = buildDirectPayload();
          const created = await CreditNoteFormApi.createFromPending(pendingId, {
            cn_date: cnDate,
            narration: narration.trim() || null,
            remarks: pending?.remarks || null,
            round_off_amount: roundOff,
            lines: directPayload.lines,
          });
          const id = requireCreditNoteId(created);
          applyCn(created);
          try {
            await postById(id);
          } catch (e) {
            goToEdit(id);
            throw e;
          }
          showToast("Credit Note posted", "success");
          goToList();
          return;
        }
        if (status === "REJECTED" && cnId) {
          const updated = await updateCurrentDraft(cnId);
          if (updated.status !== "DRAFT") {
            throw new Error("CREDIT_NOTE_INVALID_STATUS: Save the rejected Credit Note to Draft before posting.");
          }
          await postById(requireCreditNoteId(updated));
          showToast("Credit Note posted", "success");
          goToList();
          return;
        }
        const invalid = validateDirect();
        if (invalid) throw new Error(invalid);
        if (cnId) {
          const updated = await updateCurrentDraft(cnId);
          await postById(requireCreditNoteId(updated));
          showToast("Credit Note posted", "success");
          goToList();
          return;
        }
        const created = await CreditNoteFormApi.createDirect(buildDirectPayload());
        const id = requireCreditNoteId(created);
        applyCn(created);
        try {
          await postById(id);
        } catch (e) {
          goToEdit(id);
          throw e;
        }
        showToast("Credit Note posted", "success");
        goToList();
      } catch (e) {
        await refreshConfigIfApprovalDisabled(e);
        throw e;
      }
    });

  const onReasonConfirm = (reason: string) => {
    const kind = reasonDialog;
    setReasonDialog(null);
    if (!kind || !cnId) return;
    void guardBusy(async () => {
      try {
        if (kind === "reject") {
          const updated = await CreditNoteFormApi.reject(cnId, reason);
          applyCn(updated);
          showToast("Credit Note rejected", "success");
        } else {
          const updated = await CreditNoteFormApi.cancel(cnId, reason);
          applyCn(updated);
          showToast("Credit Note cancelled", "success");
        }
      } catch (e) {
        await refreshConfigIfApprovalDisabled(e);
        throw e;
      }
    });
  };

  const title = pageTitleFor({
    isEdit: Boolean(cnId),
    isPendingGenerate: isPendingFlow && !cnId,
  });

  const [baselineReady, setBaselineReady] = useState(false);
  useEffect(() => {
    setBaselineReady(false);
    const id = window.setTimeout(() => setBaselineReady(!pageLoading), 200);
    return () => window.clearTimeout(id);
  }, [pageLoading, cnId, pendingId]);

  const snapshot = useMemo(
    () => ({
      cnDate,
      warehouseId,
      customerId,
      narration,
      directMode,
      invoiceId,
      directLines,
      approverId,
      roundOff,
      directExtraCharges,
    }),
    [
      cnDate,
      warehouseId,
      customerId,
      narration,
      directMode,
      invoiceId,
      directLines,
      approverId,
      roundOff,
      directExtraCharges,
    ],
  );
  const isDirty = useFormDirtySnapshot(snapshot, { ready: baselineReady && fieldsEditable });
  const { requestCancel, discardDialog } = useTransactionFormCancel({
    listHref: CREDIT_NOTES_LIST_PATH,
    isDirty,
  });

  const currentUserId = AuthService.getUserData()?.user_id;
  const canActAsApprover =
    status === "PENDING_APPROVAL" &&
    (!cn?.current_approver_id || cn.current_approver_id === currentUserId);

  void creditNoteIdProp;

  const breadcrumbPage = cnId
    ? "Edit Credit Note"
    : isPendingFlow
      ? "Generate Credit Note"
      : "Create Credit Note";

  const subtitle = isPendingFlow
    ? "Details auto-fetched from pending entitlement."
    : "Create a direct credit note or link to an outstanding Sales Invoice.";

  return (
    <>
      <div className="sales-order-invoice-form-compact h-full min-h-0 flex flex-col w-full">
        <InvoiceFormLayout
          onBackClick={requestCancel}
          title={title}
          subtitle={subtitle}
          breadcrumb={accountsBreadcrumb("Transactions", breadcrumbPage, CREDIT_NOTES_LIST_PATH)}
          backHref={CREDIT_NOTES_LIST_PATH}
          stickyFooter={
            isReadOnlyStatus(status) ? undefined : (
              <CreditNoteFormActionBar
                status={status}
                busy={busy || pageLoading}
                approvalRequired={approvalRequired}
                configReady={configReady}
                hasExistingId={Boolean(cnId)}
                canCancel={Boolean(cnId) && status !== "POSTED" && status !== "CANCELLED" && status !== "REVERSED"}
                onDiscard={requestCancel}
                onSaveDraft={fieldsEditable ? saveDraft : undefined}
                onSaveAndPost={fieldsEditable && !cnId ? saveAndPost : undefined}
                onApprove={approvalRequired && canActAsApprover ? approve : undefined}
                onReject={approvalRequired && canActAsApprover ? () => setReasonDialog("reject") : undefined}
                onPost={
                  fieldsEditable && cnId
                    ? status === "DRAFT" ||
                      status === "REJECTED" ||
                      status === "APPROVED" ||
                      status === "PENDING_APPROVAL"
                      ? postCn
                      : undefined
                    : undefined
                }
                onCancel={cnId && status !== "POSTED" ? () => setReasonDialog("cancel") : undefined}
              />
            )
          }
        >
          <div className="space-y-2.5">
            {pageLoading ? (
              <div className="bg-muted/30 border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground">
                Loading Credit Note…
              </div>
            ) : null}
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-xs text-red-700">{error}</div>
            ) : null}
            {legacyPendingNav && !pendingId ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-amber-800">
                This form now loads Pending Credit Notes from GET /api/accounts/credit-note/pending/:id.
                Open it with <span className="font-mono">?pendingId=&lt;uuid&gt;</span>. The Pending list still uses the previous demo navigation and was not changed in this task.
              </div>
            ) : null}

            <VoucherFormSectionCard title="Credit Note Details">
              <div className="space-y-1.5">
                <div className="so-invoice-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <InvoiceDetailField label="Credit Note Number">
                    <div className="so-goods-ro so-goods-ro--mono w-full text-brand-700">
                      {cn?.cn_number || "Assigned on save"}
                    </div>
                  </InvoiceDetailField>
                  <InvoiceDetailField label="Credit Note Date" required>
                    <AccountsDateInput
                      value={cnDate}
                      onChange={setCnDate}
                      disabled={!fieldsEditable}
                      aria-label="Credit note date"
                      className={INVOICE_DETAIL_INPUT_CLASS}
                    />
                  </InvoiceDetailField>
                  <InvoiceDetailField
                    label="Warehouse / Branch"
                    required
                    labelExtra={
                      <CreditNoteWarehouseInfoButton warehouseId={warehouseId || null} />
                    }
                  >
                    {pendingEntitlementLocked ? (
                      <div className="so-goods-ro w-full">
                        {pending?.warehouse?.warehouse_name || selectedWarehouse?.name || "—"}
                      </div>
                    ) : (
                      <SearchableSelect
                        value={warehouseId}
                        onChange={setWarehouseId}
                        options={warehouses.map((w) => ({ value: w.id, label: w.name, sub: w.state }))}
                        placeholder="Select warehouse"
                        required
                        disabled={!fieldsEditable}
                        triggerClassName={INVOICE_DETAIL_SELECT_CLASS}
                      />
                    )}
                  </InvoiceDetailField>
                  <InvoiceDetailField
                    label="Customer"
                    required
                    labelExtra={
                      <CreditNoteCustomerInfoButton enabled={Boolean(customerId)} info={customerInfo} />
                    }
                  >
                    {pendingEntitlementLocked ? (
                      <div className="so-goods-ro w-full">{customerName || "—"}</div>
                    ) : (
                      <SearchableSelect
                        value={customerId}
                        onChange={(id) => {
                          setCustomerId(id);
                          setInvoiceId("");
                        }}
                        options={customers.map((c) => ({ value: c.id, label: c.name, sub: c.code }))}
                        placeholder="Select customer"
                        required
                        disabled={!fieldsEditable}
                        triggerClassName={INVOICE_DETAIL_SELECT_CLASS}
                      />
                    )}
                  </InvoiceDetailField>
                </div>

                {!pendingEntitlementLocked ? (
                  <div className="so-invoice-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <InvoiceDetailField label="Direct Mode">
                      <div className="cnz-gst-toggle w-full" role="group" aria-label="Direct credit note mode">
                        <button
                          type="button"
                          data-active={directMode === "on_account"}
                          aria-pressed={directMode === "on_account"}
                          disabled={!fieldsEditable}
                          onClick={() => {
                            setDirectMode("on_account");
                            setInvoiceId("");
                          }}
                        >
                          On-account
                        </button>
                        <button
                          type="button"
                          data-active={directMode === "against_invoice"}
                          aria-pressed={directMode === "against_invoice"}
                          disabled={!fieldsEditable}
                          onClick={() => setDirectMode("against_invoice")}
                        >
                          Against Sales Invoice
                        </button>
                      </div>
                    </InvoiceDetailField>

                    {directMode === "against_invoice" ? (
                      <>
                        <InvoiceDetailField label="Sales Invoice" required>
                          <SearchableSelect
                            value={invoiceId}
                            onChange={(id) => {
                              setInvoiceId(id);
                            }}
                            options={invoices.map((inv) => ({
                              value: inv.sales_invoice_id,
                              label: inv.invoice_date
                                ? `${inv.invoice_number} · ${inv.invoice_date}`
                                : inv.invoice_number,
                              selectedLabel: inv.invoice_number,
                              sub:
                                typeof inv.outstanding_amount === "number"
                                  ? formatCnMoney(inv.outstanding_amount)
                                  : undefined,
                            }))}
                            placeholder={
                              invoicesLoading
                                ? "Loading invoices…"
                                : !customerId
                                  ? "Select customer first"
                                  : "Select invoice…"
                            }
                            disabled={!fieldsEditable || invoicesLoading || !customerId}
                            required
                            triggerClassName={INVOICE_DETAIL_SELECT_CLASS}
                          />
                          {!invoicesLoading && !invoicesError && customerId && invoices.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                              No outstanding Sales Invoices available for this customer.
                            </p>
                          ) : null}
                          {invoicesError ? (
                            <p className="text-[10px] text-red-600 mt-0.5 leading-snug">{invoicesError}</p>
                          ) : null}
                        </InvoiceDetailField>
                        <InvoiceDetailField label="Outstanding">
                          <div className="so-goods-ro w-full tabular-nums">
                            {invoiceOutstanding != null ? formatCnMoney(invoiceOutstanding) : "—"}
                          </div>
                          {invoiceId && invoiceOutstanding == null && !invoicesLoading ? (
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                              This invoice is no longer in the eligible outstanding list.
                            </p>
                          ) : null}
                        </InvoiceDetailField>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </VoucherFormSectionCard>

            <CreditNoteSourceEntitlementSection
              pending={pending}
              sourceType={String(sourceType)}
              mappedLedgerName={supportingLedgerName}
              schemeMapping={schemeMapping}
            />

            <CreditNoteParticularsEditor
              sourceType={String(sourceType)}
              interstate={interstate}
              editable={linesEditable}
              gstEditable={gstEditableOnPending && isSalesReturnCn}
              directLines={directLines}
              pendingLines={pendingLines}
              onDirectLinesChange={setDirectLines}
              onPendingLineGstChange={handlePendingLineGstChange}
            />

            {!pendingEntitlementLocked && !isSalesReturnCn ? (
              <VoucherFormSectionCard
                title="Additional Charges"
                flush
                headerActions={
                  fieldsEditable ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="so-section-header-btn"
                      onClick={() =>
                        setDirectExtraCharges((prev) => [
                          ...prev,
                          {
                            id: `cn-xch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                            description: "",
                            ledgerId: "",
                            ledgerName: "",
                            amount: "",
                            gstPct: "0",
                          },
                        ])
                      }
                    >
                      + Add charge
                    </Button>
                  ) : null
                }
              >
                {directExtraCharges.length === 0 ? (
                  <p className="px-3 py-2 text-[11px] text-muted-foreground">
                    Optional freight, packing, or other charges. These post as extra credit note lines.
                  </p>
                ) : (
                  <div className="so-invoice-charges-table-wrap w-full">
                    <table className="so-invoice-table text-xs w-full table-fixed">
                      <thead>
                        <tr>
                          <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-left">
                            Description
                          </th>
                          <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-left">
                            Ledger
                          </th>
                          <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right w-24">
                            Taxable
                          </th>
                          <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right w-16">
                            GST %
                          </th>
                          <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {directExtraCharges.map((row) => (
                          <tr key={row.id} className="border-b border-border/40 last:border-0">
                            <td className="p-1.5">
                              <Input
                                className={cnMerge(VOUCHER_INPUT_CLASS, "text-xs")}
                                value={row.description}
                                placeholder="e.g. Freight"
                                disabled={!fieldsEditable}
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
                              <CreditNoteLedgerSelect
                                value={row.ledgerId}
                                fallbackLabel={row.ledgerName}
                                disabled={!fieldsEditable}
                                onChange={(id, name) =>
                                  setDirectExtraCharges((prev) =>
                                    prev.map((c) =>
                                      c.id === row.id
                                        ? { ...c, ledgerId: id, ledgerName: name }
                                        : c,
                                    ),
                                  )
                                }
                              />
                            </td>
                            <td className="p-1.5">
                              <AccountsMoneyInput
                                className={cnMerge(
                                  VOUCHER_INPUT_CLASS,
                                  "text-xs text-right tabular-nums",
                                )}
                                value={row.amount}
                                disabled={!fieldsEditable}
                                onChange={(v) =>
                                  setDirectExtraCharges((prev) =>
                                    prev.map((c) =>
                                      c.id === row.id ? { ...c, amount: String(v) } : c,
                                    ),
                                  )
                                }
                              />
                            </td>
                            <td className="p-1.5">
                              <Input
                                className={cnMerge(
                                  VOUCHER_INPUT_CLASS,
                                  "text-xs text-right tabular-nums",
                                )}
                                value={row.gstPct}
                                disabled={!fieldsEditable}
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
                                className="text-[11px] text-red-600 hover:underline disabled:opacity-40"
                                disabled={!fieldsEditable}
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
                  </div>
                )}
              </VoucherFormSectionCard>
            ) : null}

            {pendingEntitlementLocked &&
            !isSalesReturnCn &&
            (pending?.sales_return_additional_charges || []).length > 0 ? (
              <VoucherFormSectionCard title="Sales Return Additional Charges" flush>
                <p className="px-3 pt-2 text-[11px] text-muted-foreground">
                  Charges from the linked Sales Invoice (display only — not posted).
                </p>
                <div className="so-invoice-charges-table-wrap w-full">
                  <table className="so-invoice-table so-invoice-charges-table table-fixed w-full text-xs">
                    <thead>
                      <tr>
                        <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-left">
                          Charge
                        </th>
                        <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right w-28">
                          Original
                        </th>
                        <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right w-28">
                          Remaining
                        </th>
                      </tr>
                    </thead>
                  <tbody>
                    {(pending?.sales_return_additional_charges || []).map((charge) => {
                      const id = charge.sales_invoice_additional_charge_id;
                      return (
                        <tr key={`sr-display-${id}`} className="border-b border-border/40 last:border-0">
                          <td className="p-1.5">{charge.description || "Additional charge"}</td>
                          <td className="p-1.5 text-right tabular-nums">
                            {formatCnMoney(
                              toNum(
                                charge.original_total_amount ?? charge.original_taxable_amount,
                              ),
                            )}
                          </td>
                          <td className="p-1.5 text-right tabular-nums">
                            {formatCnMoney(
                              toNum(
                                charge.remaining_amount ?? charge.original_total_amount,
                              ),
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </VoucherFormSectionCard>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-2.5 items-start">
              <VoucherFormSectionCard title="Narration">
                <Textarea
                  className={cnMerge(VOUCHER_INPUT_CLASS, "so-goods-narration min-h-[60px] h-auto resize-y text-xs w-full")}
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="Optional narration…"
                  maxLength={2000}
                  disabled={!fieldsEditable}
                />
              </VoucherFormSectionCard>

              <CreditNoteAmountSummary
                taxable={amountPreview.taxable}
                cgst={amountPreview.cgst}
                sgst={amountPreview.sgst}
                igst={amountPreview.igst}
                gst={amountPreview.gst}
                roundOff={amountPreview.roundOff}
                total={amountPreview.total}
                interstate={interstate}
                locked={!fieldsEditable}
                roundOffSlot={
                  fieldsEditable ? (
                    <VoucherSignedRoundOffInput value={roundOff} onChange={setRoundOff} />
                  ) : undefined
                }
              />
            </div>
          </div>
        </InvoiceFormLayout>
      </div>
      {discardDialog}
      <CreditNoteReasonDialog
        open={reasonDialog != null}
        onClose={() => setReasonDialog(null)}
        title={reasonDialog === "reject" ? "Reject Credit Note" : "Discard Voucher"}
        description={
          reasonDialog === "reject"
            ? "Provide a rejection reason. The document returns to REJECTED and can be edited."
            : "Are you sure you want to discard this voucher entry?"
        }
        confirmLabel={reasonDialog === "reject" ? "Reject" : "Discard Voucher"}
        destructive
        busy={busy}
        onConfirm={onReasonConfirm}
      />
      <AccountsToast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
