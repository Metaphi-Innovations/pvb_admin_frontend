"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { useTransactionFormCancel } from "@/components/accounts/TransactionFormCancel";
import { useFormDirtySnapshot } from "@/lib/accounts/use-form-dirty-snapshot";
import { AccountingImpactSection } from "@/components/accounts/AccountingImpactSection";
import { VoucherAccountingPostingSummary } from "@/components/accounts/voucher-form/VoucherAccountingPostingSummary";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { VoucherNarrationAttachmentsSection } from "@/components/accounts/voucher-form/VoucherNarrationAttachmentsSection";
import {
  VoucherNoteField,
  VoucherNoteFieldGrid,
  VoucherNoteReadOnly,
} from "@/components/accounts/voucher-form/VoucherNoteFieldGrid";
import { defaultVisibilityForType } from "@/components/accounts/voucher-form/voucher-form-shell";
import type { VoucherAttachmentFile } from "@/components/accounts/voucher-form/VoucherAttachmentSection";
import { SearchableSelect } from "./components/SearchableSelect";
import { CreditNoteFormActionBar } from "./components/CreditNoteFormActionBar";
import { CreditNoteAmountSummary } from "./components/CreditNoteAmountSummary";
import { CreditNoteInvoiceAllocationSection } from "./components/CreditNoteInvoiceAllocationSection";
import { CreditNoteParticularsEditor } from "./components/CreditNoteParticularsEditor";
import { CreditNoteReasonDialog } from "./components/CreditNoteReasonDialog";
import { CreditNoteSourceEntitlementSection } from "./components/CreditNoteSourceEntitlementSection";
import { CREDIT_NOTES_BREADCRUMB, CREDIT_NOTES_LIST_PATH } from "./note-utils";
import { CreditNoteFormApi, creditNoteApiError, creditNoteErrorIncludes } from "./credit-note-form-api";
import type {
  CreateDirectCreditNotePayload,
  CreditNoteDetail,
  CreditNoteFormLine,
  DirectCnMode,
  DirectLineDraft,
  InvoiceOption,
  PendingCreditNoteDetail,
  SchemeTypeLedgerMapping,
} from "./credit-note-form-types";
import {
  canEditDocument,
  computeDirectLinePreview,
  extractCreditNoteIdFromPath,
  isPendingGeneratedSource,
  isReadOnlyStatus,
  isUuid,
  newDirectLine,
  pageTitleFor,
  snapshotStr,
  SOURCE_TYPE_LABELS,
  statusChipClass,
  STATUS_LABELS,
  toDateInput,
  toNum,
  todayIso,
} from "./credit-note-form-utils";
import { useCustomersDropdown, useCustomerDetails, useWarehousesDropdown } from "@/hooks/sales/use-sales-orders";
import { SalesInvoiceService } from "@/services/sales-invoice.service";
import { LedgerService } from "@/services/ledger.service";
import { UserListService } from "@/services/user-list.service";
import { AuthService } from "@/services/auth.service";
import "./credit-note-tx.css";
import "@/components/accounts/voucher-form/note-form-compact.css";

type FormModeProp = "fresh" | "return" | "scheme";

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
  const [directLines, setDirectLines] = useState<DirectLineDraft[]>([newDirectLine()]);
  const [arLedgerName, setArLedgerName] = useState("");
  const [arLedgerCode, setArLedgerCode] = useState("");
  const [schemeMappings, setSchemeMappings] = useState<SchemeTypeLedgerMapping[]>([]);
  const [approvers, setApprovers] = useState<{ value: string; label: string }[]>([]);
  const [attachments, setAttachments] = useState<VoucherAttachmentFile[]>([]);
  const [fyLabel, setFyLabel] = useState("");
  const [reasonDialog, setReasonDialog] = useState<"reject" | "cancel" | null>(null);

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
              if (!cancelled) setPending(p);
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
    if (!customerId || pendingEntitlementLocked) {
      setInvoices([]);
      return;
    }
    let cancelled = false;
    SalesInvoiceService.list({ customer_id: customerId, page: 1, page_size: 50, status: "POSTED" })
      .then((res) => {
        if (cancelled) return;
        const items = Array.isArray(res?.results) ? res.results : [];
        setInvoices(
          items.map((inv) => ({
            sales_invoice_id: String(inv.sales_invoice_id ?? ""),
            invoice_number: String(inv.invoice_number ?? ""),
            invoice_date: toDateInput(inv.invoice_date),
            invoice_amount: toNum(inv.invoice_amount),
            outstanding_amount:
              "outstanding_amount" in inv && inv.outstanding_amount != null
                ? toNum(inv.outstanding_amount)
                : null,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setInvoices([]);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, pendingEntitlementLocked]);

  useEffect(() => {
    if (pendingEntitlementLocked) return;
    if (invoiceIdFromUrl && isUuid(invoiceIdFromUrl)) {
      setDirectMode("against_invoice");
      setInvoiceId(invoiceIdFromUrl);
    }
  }, [invoiceIdFromUrl, pendingEntitlementLocked]);

  const directTotals = useMemo(() => {
    return directLines.reduce(
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
  }, [directLines, interstate]);

  const amountPreview = useMemo(() => {
    if (cn && !linesEditable) {
      const taxable = toNum(cn.taxable_amount);
      const cgst = toNum(cn.cgst_amount);
      const sgst = toNum(cn.sgst_amount);
      const igst = toNum(cn.igst_amount);
      const gst = toNum(cn.gst_amount);
      const total = toNum(cn.cn_amount);
      const roundOff = toNum(cn.round_off_amount);
      return { taxable, cgst, sgst, igst, gst, roundOff, total };
    }
    if (pendingEntitlementLocked && pending) {
      const taxable = toNum(pending.taxable_credit_amount);
      const cgst = toNum(pending.cgst_amount);
      const sgst = toNum(pending.sgst_amount);
      const igst = toNum(pending.igst_amount);
      const gst = toNum(pending.gst_amount);
      const raw = taxable + gst;
      const total = toNum(pending.eligible_cn_amount) || Math.round(raw * 100) / 100;
      return { taxable, cgst, sgst, igst, gst, roundOff: Math.round((total - raw) * 100) / 100, total };
    }
    const raw = directTotals.raw;
    const total = Math.round(raw * 100) / 100;
    return {
      taxable: Math.round(directTotals.taxable * 100) / 100,
      cgst: Math.round(directTotals.cgst * 100) / 100,
      sgst: Math.round(directTotals.sgst * 100) / 100,
      igst: Math.round(directTotals.igst * 100) / 100,
      gst: Math.round(directTotals.gst * 100) / 100,
      roundOff: Math.round((total - raw) * 100) / 100,
      total,
    };
  }, [cn, linesEditable, pendingEntitlementLocked, pending, directTotals]);

  const buildDirectPayload = (): CreateDirectCreditNotePayload => {
    const lines = directLines.map((line) => {
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
        const created = await CreditNoteFormApi.createFromPending(pendingId, {
          cn_date: cnDate,
          narration: narration.trim() || null,
          remarks: pending?.remarks || null,
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
      const created = await CreditNoteFormApi.createFromPending(pendingId, {
        cn_date: cnDate,
        narration: narration.trim() || null,
        remarks: pending?.remarks || null,
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
          const created = await CreditNoteFormApi.createFromPending(pendingId, {
            cn_date: cnDate,
            narration: narration.trim() || null,
            remarks: pending?.remarks || null,
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
    () => ({ cnDate, warehouseId, customerId, narration, directMode, invoiceId, allocation, directLines, approverId }),
    [cnDate, warehouseId, customerId, narration, directMode, invoiceId, allocation, directLines, approverId],
  );
  const isDirty = useFormDirtySnapshot(snapshot, { ready: baselineReady && fieldsEditable });
  const { requestCancel, discardDialog } = useTransactionFormCancel({
    listHref: CREDIT_NOTES_LIST_PATH,
    isDirty,
  });

  const debitLedger =
    supportingLedgerName ||
    directLines.find((l) => l.ledger_name)?.ledger_name ||
    "Not selected";
  const creditLedger = arLedgerName || customerName || "Not selected";
  const showGst = amountPreview.gst > 0.004;

  const postingSummary = (
    <VoucherAccountingPostingSummary
      compact
      voucherTypeLabel="Credit Note"
      debitLedgerLabel="Debit"
      debitLedgerName={debitLedger}
      creditLedgerLabel="Credit"
      creditLedgerName={creditLedger}
      voucherAmount={amountPreview.total}
      voucherAmountLabel="Credit Note Amount"
      gstAdjustments={
        showGst
          ? {
              cgstLabel: "Output CGST",
              cgstAmount: amountPreview.cgst,
              sgstLabel: "Output SGST",
              sgstAmount: amountPreview.sgst,
              igstLabel: "Output IGST",
              igstAmount: amountPreview.igst,
            }
          : undefined
      }
      visibilityItems={defaultVisibilityForType("credit_note", { gstApplicable: showGst })}
    />
  );

  const currentUserId = AuthService.getUserData()?.user_id;
  const canActAsApprover =
    status === "PENDING_APPROVAL" &&
    (!cn?.current_approver_id || cn.current_approver_id === currentUserId);

  void creditNoteIdProp;

  return (
    <>
      <div className="credit-debit-note-form h-full min-h-0 flex flex-col">
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
          <div className="cdn-stack pb-20">
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
              <VoucherNoteFieldGrid columns={4}>
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
                <VoucherNoteField label="Source Type" width="md">
                  <VoucherNoteReadOnly>
                    {SOURCE_TYPE_LABELS[String(sourceType)] || sourceType}
                    {isPendingFlow ? " · from Pending CN" : directMode === "against_invoice" ? " · against invoice" : " · on-account"}
                  </VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Financial Year" width="md">
                  <VoucherNoteReadOnly>{fyLabel || "Working FY on save"}</VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Warehouse / Branch" required width="md">
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
                <VoucherNoteField label="Customer" required width="md">
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
                <VoucherNoteField label="Customer GSTIN" width="md">
                  <VoucherNoteReadOnly mono>{customerGstin || "—"}</VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="AR / Party Ledger" width="md">
                  <VoucherNoteReadOnly>
                    {arLedgerName ? `${arLedgerCode ? `${arLedgerCode} · ` : ""}${arLedgerName}` : "Derived from customer"}
                  </VoucherNoteReadOnly>
                </VoucherNoteField>
                {salesperson ? (
                  <VoucherNoteField label="Salesperson" width="md">
                    <VoucherNoteReadOnly>{salesperson}</VoucherNoteReadOnly>
                  </VoucherNoteField>
                ) : null}
                {approvalRequired && fieldsEditable && (status === "DRAFT" || status === "REJECTED" || !status) ? (
                  <VoucherNoteField label="Approver" width="md">
                    <SearchableSelect
                      value={approverId}
                      onChange={setApproverId}
                      options={approvers}
                      placeholder="Required to submit"
                      disabled={!fieldsEditable}
                    />
                  </VoucherNoteField>
                ) : null}
              </VoucherNoteFieldGrid>
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

            <CreditNoteInvoiceAllocationSection
              visible={!pendingEntitlementLocked}
              mode={directMode}
              onModeChange={(mode) => {
                setDirectMode(mode);
                if (mode === "on_account") {
                  setInvoiceId("");
                  setAllocation("");
                }
              }}
              invoices={invoices}
              invoiceId={invoiceId}
              onInvoiceChange={(id) => {
                setInvoiceId(id);
                setAllocation("");
              }}
              selected={selectedInvoice}
              allocation={allocation}
              onAllocationChange={setAllocation}
              cnAmount={amountPreview.total}
              disabled={!fieldsEditable}
            />

            <CreditNoteAmountSummary
              taxable={amountPreview.taxable}
              cgst={amountPreview.cgst}
              sgst={amountPreview.sgst}
              igst={amountPreview.igst}
              gst={amountPreview.gst}
              roundOff={amountPreview.roundOff}
              total={amountPreview.total}
              interstate={interstate}
            />

            <VoucherNarrationAttachmentsSection
              compact
              narration={narration}
              onNarrationChange={setNarration}
              readOnly={!fieldsEditable}
              maxLength={2000}
              attachmentFiles={attachments}
              singleAttachment
              onAddAttachmentFiles={(files) => {
                const file = files[0];
                if (!file) return;
                setAttachments([{ id: `att-${Date.now()}`, fileName: file.name }]);
              }}
              onRemoveAttachment={() => setAttachments([])}
            />

            <AccountingImpactSection
              docKey="credit_note"
              compact
              entryPreview={
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">
                    Informational preview only. It does not post or control accounting.
                  </p>
                  {postingSummary}
                </div>
              }
            />
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
