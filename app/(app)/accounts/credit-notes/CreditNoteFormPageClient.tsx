"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { useTransactionFormCancel } from "@/components/accounts/TransactionFormCancel";
import { useFormDirtySnapshot } from "@/lib/accounts/use-form-dirty-snapshot";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { VoucherSignedRoundOffInput } from "@/components/accounts/voucher-form/VoucherSignedRoundOffInput";
import {
  VoucherNoteField,
  VoucherNoteReadOnly,
} from "@/components/accounts/voucher-form/VoucherNoteFieldGrid";
import { SearchableSelect } from "./components/SearchableSelect";
import { CreditNoteFormActionBar } from "./components/CreditNoteFormActionBar";
import { CreditNoteAmountSummary } from "./components/CreditNoteAmountSummary";
import { CreditNoteParticularsEditor } from "./components/CreditNoteParticularsEditor";
import { CreditNoteReasonDialog } from "./components/CreditNoteReasonDialog";
import { CreditNoteSourceEntitlementSection } from "./components/CreditNoteSourceEntitlementSection";
import { CreditNoteCustomerInfoButton } from "./components/CreditNoteCustomerInfoButton";
import { CreditNoteWarehouseInfoButton } from "./components/CreditNoteWarehouseInfoButton";
import { CREDIT_NOTES_BREADCRUMB, CREDIT_NOTES_LIST_PATH } from "./note-utils";
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
  isPendingGeneratedSource,
  isReadOnlyStatus,
  isUuid,
  newDirectLine,
  pageTitleFor,
  snapshotStr,
  statusChipClass,
  STATUS_LABELS,
  toDateInput,
  toNum,
  todayIso,
} from "./credit-note-form-utils";
import { useCustomersDropdown, useCustomerDetails, useWarehousesDropdown } from "@/hooks/sales/use-sales-orders";
import { LedgerService } from "@/services/ledger.service";
import { UserListService } from "@/services/user-list.service";
import { AuthService } from "@/services/auth.service";
import "./credit-note-tx.css";
import "@/components/accounts/voucher-form/note-form-compact.css";

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
  const [allocation, setAllocation] = useState("");
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
  const [fyLabel, setFyLabel] = useState("");
  const [reasonDialog, setReasonDialog] = useState<"reject" | "cancel" | null>(null);
  const [directExtraCharges, setDirectExtraCharges] = useState<DirectExtraCharge[]>([]);
  const [roundOff, setRoundOff] = useState(0);

  const { data: customerData } = useCustomersDropdown();
  const { data: warehouseData } = useWarehousesDropdown();
  const { data: customerDetails } = useCustomerDetails(customerId || null);

  const sourceType = cn?.source_type || pending?.source_type || "DIRECT";
  const isPendingFlow = Boolean(pendingId) || Boolean(cn?.pending_credit_note_id) || isPendingGeneratedSource(String(sourceType));
  const status = cn?.status || (isPendingFlow && !cnId ? undefined : "DRAFT");
  const readOnly = isReadOnlyStatus(status) || status === "PENDING_APPROVAL" || status === "APPROVED";
  const fieldsEditable = canEditDocument(status) && !readOnly;
  const pendingEntitlementLocked = isPendingFlow;
  const linesEditable = fieldsEditable && !pendingEntitlementLocked;

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

  const pendingLines: CreditNoteFormLine[] = cn?.lines?.length
    ? cn.lines
    : pending?.lines ?? [];

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
    setFyLabel(detail.financial_year?.name || detail.financial_year?.code || "");
    const src = String(detail.source_type || "DIRECT");
    if (src === "DIRECT" || src === "SALES_INVOICE") {
      const invRef = (detail.references || []).find((r) => r.reference_type === "SALES_INVOICE");
      setDirectMode(invRef ? "against_invoice" : "on_account");
      setInvoiceId(invRef?.reference_id || "");
      setAllocation(invRef?.allocated_amount != null ? String(invRef.allocated_amount) : "");
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
          setFyLabel(p.financial_year?.name || p.financial_year?.code || "");
          setArLedgerName(snapshotStr(p.customer_snapshot, "ledger_name", "party_ledger_name"));
          if (p.credit_note?.credit_note_id) {
            setError(
              `PENDING_CREDIT_NOTE_ALREADY_CONVERTED: Already converted to ${p.credit_note.cn_number || "a Credit Note"}.`,
            );
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
    LedgerService.getCurrentFinancialYear()
      .then((fy) => {
        if (fy && !fyLabel) setFyLabel(fy.name || fy.code || "");
      })
      .catch(() => undefined);
  }, []);

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
    if (pendingEntitlementLocked && cn) {
      const taxable = toNum(cn.taxable_amount);
      const cgst = toNum(cn.cgst_amount);
      const sgst = toNum(cn.sgst_amount);
      const igst = toNum(cn.igst_amount);
      const gst = toNum(cn.gst_amount);
      const raw = Math.round((taxable + gst) * 100) / 100;
      return {
        taxable,
        cgst,
        sgst,
        igst,
        gst,
        roundOff,
        total: Math.round((raw + roundOff) * 100) / 100,
      };
    }
    if (pendingEntitlementLocked && pending) {
      let taxable = toNum(pending.taxable_credit_amount);
      let cgst = toNum(pending.cgst_amount);
      let sgst = toNum(pending.sgst_amount);
      let igst = toNum(pending.igst_amount);
      let gst = toNum(pending.gst_amount);
      for (const c of directExtraCharges) {
        const amt = toNum(c.amount);
        if (amt <= 0 || !c.description.trim()) continue;
        const rate = toNum(c.gstPct);
        const lineGst = Math.round(((amt * rate) / 100) * 100) / 100;
        taxable += amt;
        gst += lineGst;
        if (interstate) igst += lineGst;
        else {
          const half = Math.round((lineGst / 2) * 100) / 100;
          cgst += half;
          sgst += Math.round((lineGst - half) * 100) / 100;
        }
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
    directTotals,
    directExtraCharges,
    interstate,
    roundOff,
  ]);

  const buildPendingExtraChargesPayload = () =>
    directExtraCharges
      .filter((c) => toNum(c.amount) > 0 && c.description.trim() && isUuid(c.ledgerId))
      .map((c) => ({
        description: c.description.trim(),
        ledger_id: c.ledgerId,
        taxable_amount: toNum(c.amount),
        gst_rate: toNum(c.gstPct),
      }));

  const validatePendingCharges = (): string | null => {
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
              allocated_amount: toNum(allocation) > 0 ? toNum(allocation) : null,
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
      const alloc = toNum(allocation);
      if (alloc > 0 && Math.abs(alloc - amountPreview.total) > 0.009) {
        return "Allocation must equal the full Credit Note amount, or be left blank (no settlement).";
      }
      if (alloc > 0 && selectedInvoice?.outstanding_amount != null && alloc > selectedInvoice.outstanding_amount + 0.009) {
        return "Allocation exceeds the invoice outstanding amount.";
      }
    }
    return null;
  };

  const guardBusy = async (fn: () => Promise<void>) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      const msg = creditNoteApiError(e, "Request failed.");
      setError(msg);
      showToast(msg, "error");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  const goToEdit = (id: string) => {
    router.replace(`${CREDIT_NOTES_LIST_PATH}/${id}/edit`);
  };

  const goToDetail = (id: string) => {
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
    if (pendingEntitlementLocked) {
      const updated = await CreditNoteFormApi.updateDraft(id, {
        cn_date: cnDate,
        narration: narration.trim() || null,
        round_off_amount: roundOff,
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
      if (pendingEntitlementLocked && pendingId && !cnId) {
        if (pending?.credit_note?.credit_note_id) {
          throw new Error("PENDING_CREDIT_NOTE_ALREADY_CONVERTED: This Pending CN is already converted.");
        }
        const chargeErr = validatePendingCharges();
        if (chargeErr) throw new Error(chargeErr);
        const created = await CreditNoteFormApi.createFromPending(pendingId, {
          cn_date: cnDate,
          narration: narration.trim() || null,
          remarks: pending?.remarks || null,
          round_off_amount: roundOff,
          extra_charges: buildPendingExtraChargesPayload(),
        });
        applyCn(created);
        showToast("Credit Note created as Draft", "success");
        goToEdit(created.credit_note_id);
        return;
      }
      if (pendingEntitlementLocked && cnId) {
        const updated = await CreditNoteFormApi.updateDraft(cnId, {
          cn_date: cnDate,
          narration: narration.trim() || null,
          round_off_amount: roundOff,
        });
        applyCn(updated);
        showToast("Draft updated", "success");
        return;
      }
      const invalid = validateDirect();
      if (invalid) throw new Error(invalid);
      if (cnId) {
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
        return;
      }
      const created = await CreditNoteFormApi.createDirect(buildDirectPayload());
      applyCn(created);
      showToast("Credit Note saved as Draft", "success");
      goToEdit(created.credit_note_id);
    });

  const ensureSavedId = async (): Promise<string> => {
    if (cnId) return cnId;
    if (pendingEntitlementLocked && pendingId) {
      const chargeErr = validatePendingCharges();
      if (chargeErr) throw new Error(chargeErr);
      const created = await CreditNoteFormApi.createFromPending(pendingId, {
        cn_date: cnDate,
        narration: narration.trim() || null,
        remarks: pending?.remarks || null,
        round_off_amount: roundOff,
        extra_charges: buildPendingExtraChargesPayload(),
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
        if (!pendingEntitlementLocked) {
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
        if (!approvalRequired) {
          if (status === "DRAFT" && cnId) {
            const updated = await updateCurrentDraft(cnId);
            if (updated.status && updated.status !== "DRAFT") {
              throw new Error("CREDIT_NOTE_INVALID_STATUS: Cannot post until the Credit Note is a Draft.");
            }
            await postById(requireCreditNoteId(updated));
            showToast("Credit Note posted", "success");
            goToDetail(requireCreditNoteId(updated));
            return;
          }
          if ((status === "PENDING_APPROVAL" || status === "APPROVED") && cnId) {
            await postById(cnId);
            showToast("Credit Note posted", "success");
            goToDetail(cnId);
            return;
          }
          return;
        }
        if (!cnId) return;
        const updated = await CreditNoteFormApi.post(cnId);
        applyCn(updated);
        showToast("Credit Note posted", "success");
      } catch (e) {
        await refreshConfigIfApprovalDisabled(e);
        throw e;
      }
    });

  const saveAndPost = () =>
    guardBusy(async () => {
      try {
        if (pendingEntitlementLocked && pendingId && !cnId) {
          if (!cnDate) throw new Error("Credit Note Date is required.");
          if (pending?.credit_note?.credit_note_id) {
            throw new Error("PENDING_CREDIT_NOTE_ALREADY_CONVERTED: This Pending CN is already converted.");
          }
          const chargeErr = validatePendingCharges();
          if (chargeErr) throw new Error(chargeErr);
          const created = await CreditNoteFormApi.createFromPending(pendingId, {
            cn_date: cnDate,
            narration: narration.trim() || null,
            remarks: pending?.remarks || null,
            round_off_amount: roundOff,
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
          goToDetail(id);
          return;
        }
        if (status === "REJECTED" && cnId) {
          const updated = await updateCurrentDraft(cnId);
          if (updated.status !== "DRAFT") {
            throw new Error("CREDIT_NOTE_INVALID_STATUS: Save the rejected Credit Note to Draft before posting.");
          }
          await postById(requireCreditNoteId(updated));
          showToast("Credit Note posted", "success");
          goToDetail(requireCreditNoteId(updated));
          return;
        }
        const invalid = validateDirect();
        if (invalid) throw new Error(invalid);
        if (cnId) {
          const updated = await updateCurrentDraft(cnId);
          await postById(requireCreditNoteId(updated));
          showToast("Credit Note posted", "success");
          goToDetail(requireCreditNoteId(updated));
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
        goToDetail(id);
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
      allocation,
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
      allocation,
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

  return (
    <>
      <div className="credit-debit-note-form flex-1 min-h-0 h-full flex flex-col">
        <AccountsFormLayout
          fullWidth
          onBackClick={requestCancel}
          title={title}
          breadcrumb={[...CREDIT_NOTES_BREADCRUMB]}
          code={cn?.cn_number || undefined}
          headerMeta={
            <div className="flex items-center gap-1.5">
              {status ? (
                <span className={`cdn-chip inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusChipClass(status)}`}>
                  {STATUS_LABELS[status] || status.replaceAll("_", " ")}
                </span>
              ) : isPendingFlow ? (
                <span className="cdn-chip inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">
                  Pending entitlement
                </span>
              ) : null}
              {cn?.cn_number ? (
                <span className="cdn-chip cdn-chip--code inline-flex items-center h-5 px-1.5 rounded border font-mono text-[10px]">
                  {cn.cn_number}
                </span>
              ) : null}
            </div>
          }
          stickyFooter={
            isReadOnlyStatus(status) ? undefined : (
              <CreditNoteFormActionBar
                status={status}
                busy={busy || pageLoading}
                approvalRequired={approvalRequired}
                configReady={configReady}
                isPendingGenerate={isPendingFlow && !cnId}
                hasExistingId={Boolean(cnId)}
                canCancel={Boolean(cnId) && status !== "POSTED" && status !== "CANCELLED" && status !== "REVERSED"}
                onDiscard={requestCancel}
                onSaveDraft={fieldsEditable ? saveDraft : undefined}
                onSubmitForApproval={approvalRequired && fieldsEditable ? submitForApproval : undefined}
                onSaveAndPost={
                  !approvalRequired &&
                  configReady &&
                  fieldsEditable &&
                  (!cnId || status === "REJECTED")
                    ? saveAndPost
                    : undefined
                }
                onApprove={approvalRequired && canActAsApprover ? approve : undefined}
                onReject={approvalRequired && canActAsApprover ? () => setReasonDialog("reject") : undefined}
                onPost={
                  approvalRequired
                    ? status === "APPROVED"
                      ? postCn
                      : undefined
                    : configReady &&
                        (status === "APPROVED" ||
                          status === "PENDING_APPROVAL" ||
                          (status === "DRAFT" && Boolean(cnId)))
                      ? postCn
                      : undefined
                }
                onCancel={cnId && status !== "POSTED" ? () => setReasonDialog("cancel") : undefined}
              />
            )
          }
        >
          <div className="cdn-stack pb-3">
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

            <VoucherFormSectionCard title="Basic Details" compact>
              <div className="cn-basic-details-grid">
                <VoucherNoteField label="Credit Note Number" width="sm">
                  <VoucherNoteReadOnly mono>{cn?.cn_number || "Assigned on save"}</VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Credit Note Date" required width="sm">
                  <AccountsDateInput
                    value={cnDate}
                    onChange={setCnDate}
                    disabled={!fieldsEditable}
                    aria-label="Credit note date"
                    className="h-[30px] text-xs cdn-control"
                  />
                </VoucherNoteField>
                <VoucherNoteField label="Financial Year" width="sm">
                  <VoucherNoteReadOnly>{fyLabel || "Working FY on save"}</VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField
                  label={
                    <span className="inline-flex items-center gap-1">
                      Warehouse / Branch
                      <CreditNoteWarehouseInfoButton warehouseId={warehouseId || null} />
                    </span>
                  }
                  required
                  width="lg"
                >
                  {pendingEntitlementLocked ? (
                    <VoucherNoteReadOnly>
                      {pending?.warehouse?.warehouse_name || selectedWarehouse?.name || "—"}
                    </VoucherNoteReadOnly>
                  ) : (
                    <SearchableSelect
                      value={warehouseId}
                      onChange={setWarehouseId}
                      options={warehouses.map((w) => ({ value: w.id, label: w.name, sub: w.state }))}
                      placeholder="Select warehouse"
                      required
                      disabled={!fieldsEditable}
                    />
                  )}
                </VoucherNoteField>
                <VoucherNoteField
                  label={
                    <span className="inline-flex items-center gap-1">
                      Customer
                      <CreditNoteCustomerInfoButton enabled={Boolean(customerId)} info={customerInfo} />
                    </span>
                  }
                  required
                  width="lg"
                >
                  {pendingEntitlementLocked ? (
                    <VoucherNoteReadOnly>{customerName || "—"}</VoucherNoteReadOnly>
                  ) : (
                    <SearchableSelect
                      value={customerId}
                      onChange={(id) => {
                        setCustomerId(id);
                        setInvoiceId("");
                        setAllocation("");
                      }}
                      options={customers.map((c) => ({ value: c.id, label: c.name, sub: c.code }))}
                      placeholder="Select customer"
                      required
                      disabled={!fieldsEditable}
                    />
                  )}
                </VoucherNoteField>
                {!pendingEntitlementLocked ? (
                  <VoucherNoteField label="Direct Mode" width="ref">
                    <div className="cnz-gst-toggle" role="group" aria-label="Direct credit note mode">
                      <button
                        type="button"
                        data-active={directMode === "on_account"}
                        aria-pressed={directMode === "on_account"}
                        disabled={!fieldsEditable}
                        onClick={() => {
                          setDirectMode("on_account");
                          setInvoiceId("");
                          setAllocation("");
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
                  </VoucherNoteField>
                ) : null}
                {!pendingEntitlementLocked && directMode === "against_invoice" ? (
                  <>
                    <VoucherNoteField label="Sales Invoice" required width="lg">
                      <SearchableSelect
                        value={invoiceId}
                        onChange={(id) => {
                          setInvoiceId(id);
                          setAllocation("");
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
                      />
                      {!invoicesLoading && !invoicesError && customerId && invoices.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          No outstanding Sales Invoices available for this customer.
                        </p>
                      ) : null}
                      {invoicesError ? (
                        <p className="text-[10px] text-red-600 mt-0.5">{invoicesError}</p>
                      ) : null}
                    </VoucherNoteField>
                    <VoucherNoteField label="Outstanding" width="sm">
                      <VoucherNoteReadOnly>
                        {invoiceOutstanding != null ? formatCnMoney(invoiceOutstanding) : "—"}
                      </VoucherNoteReadOnly>
                      {invoiceId && invoiceOutstanding == null && !invoicesLoading ? (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          This invoice is no longer in the eligible outstanding list.
                        </p>
                      ) : null}
                    </VoucherNoteField>
                    <VoucherNoteField label="Allocation Amount" width="sm">
                      <AccountsMoneyInput
                        className="h-7 text-xs"
                        value={allocation}
                        onChange={(v) => setAllocation(String(v))}
                        disabled={!fieldsEditable || !invoiceId}
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[14rem]">
                        Leave blank for reference-only (no settlement). A value &gt; 0 settles the invoice.
                      </p>
                    </VoucherNoteField>
                    {toNum(allocation) > 0 &&
                    amountPreview.total > 0 &&
                    Math.abs(toNum(allocation) - amountPreview.total) > 0.009 ? (
                      <VoucherNoteField label="Allocation check" width="lg">
                        <p className="text-[11px] text-amber-700">
                          Allocation {formatCnMoney(toNum(allocation))} does not match CN total{" "}
                          {formatCnMoney(amountPreview.total)}. Partial allocation is not supported by the
                          backend.
                        </p>
                      </VoucherNoteField>
                    ) : null}
                  </>
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
              directLines={directLines}
              pendingLines={pendingLines}
              onDirectLinesChange={setDirectLines}
            />

            {pendingEntitlementLocked &&
            (pending?.sales_return_additional_charges || []).length > 0 ? (
              <VoucherFormSectionCard title="Sales Return Additional Charges" compact>
                <p className="px-3 pt-2 text-[10px] text-muted-foreground">
                  Charges from the linked Sales Invoice (display only — not posted).
                </p>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="p-1.5 text-left font-medium">Charge</th>
                      <th className="p-1.5 text-right font-medium w-28">Original</th>
                      <th className="p-1.5 text-right font-medium w-28">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pending?.sales_return_additional_charges || []).map((charge) => {
                      const id = charge.sales_invoice_additional_charge_id;
                      return (
                        <tr key={`sr-display-${id}`} className="border-b last:border-0">
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
              </VoucherFormSectionCard>
            ) : null}

            <div className="cn-narration-summary-grid">
              <VoucherFormSectionCard title="Narration" compact>
                <div className="px-3 pb-3 pt-1">
                  <Textarea
                    className="cdn-control min-h-[64px] resize-y text-xs"
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    placeholder="Optional narration…"
                    maxLength={2000}
                    disabled={!fieldsEditable}
                  />
                </div>
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
        </AccountsFormLayout>
      </div>
      {discardDialog}
      <CreditNoteReasonDialog
        open={reasonDialog != null}
        onClose={() => setReasonDialog(null)}
        title={reasonDialog === "reject" ? "Reject Credit Note" : "Cancel Credit Note"}
        description={
          reasonDialog === "reject"
            ? "Provide a rejection reason. The document returns to REJECTED and can be edited."
            : "Provide a cancellation reason. Posted Credit Notes cannot be cancelled from this form."
        }
        confirmLabel={reasonDialog === "reject" ? "Reject" : "Cancel Credit Note"}
        destructive
        busy={busy}
        onConfirm={onReasonConfirm}
      />
      <AccountsToast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
