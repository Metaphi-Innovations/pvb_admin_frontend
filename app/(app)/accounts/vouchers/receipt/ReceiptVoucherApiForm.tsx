"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceFormLayout } from "@/app/(app)/accounts/components/InvoiceFormLayout";
import {
  INVOICE_DETAIL_INPUT_CLASS,
  INVOICE_DETAIL_SELECT_CLASS,
  InvoiceDetailField,
} from "@/app/(app)/accounts/invoices/components/invoice-form-voucher-ui";
import "@/app/(app)/accounts/invoices/sales-order-invoice-form-compact.css";
import "../../credit-notes/credit-note-tx.css";
import "@/components/accounts/voucher-form/transaction-view.css";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import {
  VOUCHER_ERROR_CLASS,
  VOUCHER_INPUT_CLASS,
  VOUCHER_MONEY_INPUT_CLASS,
} from "@/components/accounts/voucher-simple-form-ui";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/lib/toast";
import { notifyVoucherListingChanged } from "@/lib/accounts/voucher-posting-notify";
import { useFY } from "@/lib/fy-store";
import { ReceiptVoucherService } from "@/services/receipt-voucher.service";
import { CustomerListService } from "@/services/customer-list.service";
import { SupplierListService } from "@/services/supplier-list.service";
import { WarehouseService } from "@/services/warehouse.service";
import { BankAccountsListService } from "@/services/bank-accounts-list.service";
import { LedgerService } from "@/services/ledger.service";
import { UserListService } from "@/services/user-list.service";
import {
  BANK_TRANSACTION_MODE_LABELS,
  BANK_TRANSACTION_MODES,
  RECEIPT_PARTY_KIND_LABELS,
  RECEIPT_STATUS_LABELS,
  type BankTransactionMode,
  type ReceiptPartyKind,
  type ReceiptTreatmentUi,
  type ReceiptVoucherDetail,
  type ReceiptVoucherStatus,
} from "@/types/receipt-voucher.types";
import { formatMoney } from "@/lib/accounts/money-format";
import { VoucherLedgerSelect } from "@/components/accounts/voucher-form/VoucherLedgerSelect";
import { ReceiptSearchableSelect } from "./components/ReceiptSearchableSelect";
import { ReceiptFormActionBar } from "./components/ReceiptFormActionBar";
import { ReceiptAllocationTable } from "./components/ReceiptAllocationTable";
import { ReceiptInvoiceMultiSelect } from "./components/ReceiptInvoiceMultiSelect";
import { ReceiptLedgerEntriesTable, createReceiptLedgerEntryRow } from "./components/ReceiptLedgerEntriesTable";
import { ReceiptFormSummary } from "./components/ReceiptFormSummary";
import { ReceiptViewHero } from "./components/ReceiptViewHero";
import { ReceiptReasonDialog } from "./components/ReceiptReasonDialog";
import { ReceiptAttachmentsPanel } from "./components/ReceiptAttachmentsPanel";
import {
  createReceiptPendingFiles,
  revokeReceiptPendingPreviews,
  validateReceiptAttachmentFiles,
} from "./receipt-attachment-formdata";
import {
  buildCreatePayload,
  buildUpdatePayload,
  canCancelStatus,
  computeReceiptPreview,
  emptyReceiptForm,
  formatSrNo,
  isDraftEditable,
  mapDetailToForm,
  mapOpenItemsToAllocations,
  RECEIPT_LIST_PATH,
  receiptEditPath,
  receiptViewPath,
  syncTdsAdjustmentFromAllocations,
  toMoneyNumber,
  validateReceiptForm,
  type ReceiptFormState,
  type ReceiptUiAdjustment,
  type ReceiptUiAllocation,
} from "./receipt-voucher-utils";

export interface ReceiptVoucherApiFormProps {
  voucherId?: string;
  readOnly?: boolean;
  onDone?: () => void;
  onEdit?: () => void;
}

export function ReceiptVoucherApiForm({
  voucherId,
  readOnly: readOnlyProp = false,
  onDone,
  onEdit,
}: ReceiptVoucherApiFormProps) {
  const router = useRouter();
  const goToList = useCallback(() => {
    notifyVoucherListingChanged("receipt");
    router.replace(RECEIPT_LIST_PATH);
  }, [router]);
  const { selectedFY } = useFY();
  const [form, setForm] = useState<ReceiptFormState>(emptyReceiptForm);
  const [detail, setDetail] = useState<ReceiptVoucherDetail | null>(null);
  const [status, setStatus] = useState<ReceiptVoucherStatus>("DRAFT");
  const [currentId, setCurrentId] = useState<string | undefined>(voucherId);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [configReady, setConfigReady] = useState(false);
  const [loading, setLoading] = useState(!!voucherId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outstandingLoading, setOutstandingLoading] = useState(false);

  const [warehouses, setWarehouses] = useState<{ value: string; label: string }[]>([]);
  const [customers, setCustomers] = useState<{ value: string; label: string; sub?: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ value: string; label: string; sub?: string }[]>([]);
  const [bankRows, setBankRows] = useState<
    { bankAccountId: string; ledgerId: string; label: string; warehouses: string[] }[]
  >([]);
  const [cashLedgers, setCashLedgers] = useState<{ value: string; label: string; sub?: string }[]>([]);
  const [manualLedgers, setManualLedgers] = useState<{ value: string; label: string; sub?: string }[]>([]);
  const [approvers, setApprovers] = useState<{ value: string; label: string }[]>([]);
  /** Customer master TDS Section — retained for allocation TDS payload sync (columns hidden). */
  const [partyTdsSectionId, setPartyTdsSectionId] = useState<string | null>(null);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [approverId, setApproverId] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState("");
  const [reverseDate, setReverseDate] = useState("");
  const outstandingReqRef = useRef(0);

  const fieldsEditable = isDraftEditable(status) && !readOnlyProp;
  const isViewMode = readOnlyProp || !fieldsEditable;
  const isPostedView = status === "POSTED" && !readOnlyProp;
  const showViewChrome = readOnlyProp || isPostedView;
  const preview = useMemo(() => computeReceiptPreview(form), [form]);
  /** Ledger Entries total (additive with settlement toward composed gross / receipt). */
  const manualAdjustmentsTotal = preview.ledgerEntriesTotal;
  const isCustomerAdvance =
    form.party_kind === "CUSTOMER" &&
    form.receipt_treatment === "advance_on_account";
  const isCustomerMixed =
    form.party_kind === "CUSTOMER" &&
    form.receipt_treatment === "mixed_allocation";
  const showInvoiceSettlement =
    (form.party_kind === "CUSTOMER" &&
      (form.receipt_treatment === "against_outstanding" ||
        form.receipt_treatment === "mixed_allocation")) ||
    form.party_kind === "SUPPLIER_REFUND";
  const showOnAccountInSummary =
    form.party_kind === "CUSTOMER" &&
    (form.receipt_treatment === "advance_on_account" ||
      form.receipt_treatment === "mixed_allocation" ||
      preview.advance > 0.004);
  /** Settlement + ledger entries must equal gross; receipt amount equals gross (less TDS/discount). */
  const summaryBalanced =
    form.party_kind === "OTHER_LEDGER"
      ? true
      : preview.gross > 0 &&
        Math.abs(
          preview.totalAllocated +
            preview.advance +
            preview.ledgerEntriesTotal -
            preview.gross,
        ) < 0.01;
  const selectedInvoiceIds = useMemo(
    () =>
      form.allocations.filter((a) => a.selected).map((a) => a.open_item_id),
    [form.allocations],
  );
  const selectedInvoiceRows = useMemo(
    () => form.allocations.filter((a) => a.selected),
    [form.allocations],
  );

  /** Auto-derive TDS Receivable adjustment from invoice TDS (enter TDS once). */
  useEffect(() => {
    setForm((prev) => {
      const nextAdj = syncTdsAdjustmentFromAllocations(prev);
      if (nextAdj === prev.adjustments) return prev;
      const same =
        nextAdj.length === prev.adjustments.length &&
        nextAdj.every((a, i) => {
          const b = prev.adjustments[i];
          return (
            a.id === b.id &&
            a.adjustment_type === b.adjustment_type &&
            a.amount === b.amount
          );
        });
      if (same) return prev;
      return { ...prev, adjustments: nextAdj };
    });
  }, [form.allocations]);

  const patch = useCallback((p: Partial<ReceiptFormState>) => {
    setForm((prev) => ({ ...prev, ...p }));
  }, []);

  const clearAllocationSelections = useCallback(
    (allocations: ReceiptUiAllocation[]): ReceiptUiAllocation[] =>
      allocations.map((a) => ({
        ...a,
        selected: false,
        allocated_amount: "",
        tds_amount: "",
        tds_section_id: "",
        discount_amount: "",
      })),
    [],
  );

  const applyReceiptTreatment = useCallback(
    (next: ReceiptTreatmentUi) => {
      setForm((prev) => {
        if (prev.receipt_treatment === next) return prev;
        if (next === "advance_on_account") {
          return {
            ...prev,
            receipt_treatment: next,
            allocations: clearAllocationSelections(prev.allocations),
            advance_amount: "0",
          };
        }
        // against_outstanding / mixed_allocation: keep invoice rows; advance
        // is derived by computeReceiptPreview (0 vs remaining).
        return {
          ...prev,
          receipt_treatment: next,
        };
      });
    },
    [clearAllocationSelections],
  );

  const handleInvoiceSelection = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setForm((prev) => ({
      ...prev,
      allocations: prev.allocations.map((a) => {
        const selected = idSet.has(a.open_item_id);
        if (selected) {
          return {
            ...a,
            selected: true,
            allocated_amount:
              a.allocated_amount || String(a.outstanding_amount),
          };
        }
        return {
          ...a,
          selected: false,
          allocated_amount: "",
          tds_amount: "",
          tds_section_id: "",
          discount_amount: "",
        };
      }),
    }));
  }, []);

  const handleLedgerEntriesChange = useCallback(
    (rows: ReceiptUiAdjustment[]) => {
      setForm((prev) => ({
        ...prev,
        adjustments: syncTdsAdjustmentFromAllocations({
          ...prev,
          adjustments: rows,
        }),
      }));
    },
    [],
  );

  const hydrateFromDetail = useCallback((d: ReceiptVoucherDetail) => {
    setForm((prev) => {
      revokeReceiptPendingPreviews(prev.pendingFiles);
      return mapDetailToForm(d);
    });
    setDetail(d);
    setStatus(d.status);
    setCurrentId(d.receipt_voucher_id);
  }, []);

  const pendingFilesRef = useRef(form.pendingFiles);
  pendingFilesRef.current = form.pendingFiles;
  useEffect(() => {
    return () => {
      revokeReceiptPendingPreviews(pendingFilesRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    (async () => {
      try {
        const [cfg, wh, cust, supp, banks, ledgers, users] = await Promise.all([
          ReceiptVoucherService.getConfig().catch(() => ({ approval_required: true })),
          WarehouseService.dropdown().catch(() => []),
          CustomerListService.dropdown().catch(() => []),
          SupplierListService.dropdown().catch(() => []),
          BankAccountsListService.list({ page: 1, pageSize: 200 }).catch(() => ({
            items: [],
            total: 0,
          })),
          LedgerService.getDropdown({ status: "ACTIVE", allowManualPosting: true }).catch(
            () => ({ tree: [], ledgers: [] }),
          ),
          UserListService.dropdown().catch(() => []),
        ]);
        if (cancelled || ac.signal.aborted) return;

        setApprovalRequired(!!cfg.approval_required);
        setConfigReady(true);

        setWarehouses(
          (wh as Array<Record<string, unknown>>).map((w) => ({
            value: String(w.warehouse_id ?? w.id ?? ""),
            label: String(w.warehouse_name ?? w.name ?? ""),
          })).filter((w) => w.value),
        );
        setCustomers(
          cust.map((c) => ({
            value: c.customer_id,
            label: c.customer_name,
            sub: c.customer_code,
          })),
        );
        setSuppliers(
          supp.map((s) => ({
            value: s.supplier_id,
            label: s.supplierName,
            sub: s.supplierCode,
          })),
        );

        // List rows expose mapped warehouse names for client-side branch filtering.
        setBankRows(
          banks.items
            .filter((b) => b.bankAccountId && b.status === "active")
            .map((b) => ({
              bankAccountId: b.bankAccountId as string,
              ledgerId: b.ledgerId,
              label: `${b.bankName || b.ledgerName} — ${b.accountNumber || b.ledgerCode}`,
              warehouses: b.mappedWarehouseNames || [],
            })),
        );

        const ledgerOpts = (ledgers.ledgers ?? []).map((l) => ({
          value: l.ledgerId,
          label: l.ledgerName,
          sub: l.ledgerCode,
        })).filter((l) => l.value);

        setManualLedgers(ledgerOpts);
        setCashLedgers(
          ledgerOpts.filter(
            (l) =>
              /cash/i.test(l.label) ||
              /cash/i.test(l.sub || "") ||
              /petty/i.test(l.label),
          ),
        );
        setApprovers(
          users.map((u) => ({
            value: u.userId,
            label: u.label || `${u.firstName} ${u.lastName}`.trim() || u.username,
          })).filter((u) => u.value),
        );
      } catch {
        if (!cancelled) {
          setApprovalRequired(true);
          setConfigReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  useEffect(() => {
    if (!voucherId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const d = await ReceiptVoucherService.getById(voucherId);
        if (!cancelled) {
          hydrateFromDetail(d);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load Receipt Voucher.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [voucherId, hydrateFromDetail]);

  const loadCustomerOutstanding = useCallback(
    async (customerId: string, keepSelections = true) => {
      if (!customerId) {
        patch({ allocations: [] });
        return;
      }
      const reqId = ++outstandingReqRef.current;
      setOutstandingLoading(true);
      try {
        const res = await ReceiptVoucherService.listCustomerOutstanding(customerId);
        if (reqId !== outstandingReqRef.current) return;
        setForm((prev) => ({
          ...prev,
          allocations: mapOpenItemsToAllocations(
            res.items,
            keepSelections ? prev.allocations : undefined,
          ),
        }));
      } catch (e) {
        if (reqId !== outstandingReqRef.current) return;
        showToast(
          e instanceof Error ? e.message : "Failed to load customer outstanding.",
          "error",
        );
        patch({ allocations: [] });
      } finally {
        if (reqId === outstandingReqRef.current) setOutstandingLoading(false);
      }
    },
    [patch],
  );

  const loadSupplierRecoverable = useCallback(
    async (supplierId: string, keepSelections = true) => {
      if (!supplierId) {
        patch({ allocations: [] });
        return;
      }
      const reqId = ++outstandingReqRef.current;
      setOutstandingLoading(true);
      try {
        const res = await ReceiptVoucherService.listSupplierRecoverable(supplierId);
        if (reqId !== outstandingReqRef.current) return;
        setForm((prev) => ({
          ...prev,
          allocations: mapOpenItemsToAllocations(
            res.items,
            keepSelections ? prev.allocations : undefined,
          ),
        }));
      } catch (e) {
        if (reqId !== outstandingReqRef.current) return;
        showToast(
          e instanceof Error ? e.message : "Failed to load supplier recoverables.",
          "error",
        );
        patch({ allocations: [] });
      } finally {
        if (reqId === outstandingReqRef.current) setOutstandingLoading(false);
      }
    },
    [patch],
  );

  useEffect(() => {
    if (!fieldsEditable) return;
    if (form.party_kind === "CUSTOMER" && form.customer_id) {
      if (
        form.receipt_treatment === "against_outstanding" ||
        form.receipt_treatment === "mixed_allocation"
      ) {
        void loadCustomerOutstanding(form.customer_id);
      }
    }
  }, [form.party_kind, form.customer_id, form.receipt_treatment, fieldsEditable, loadCustomerOutstanding]);

  useEffect(() => {
    if (!fieldsEditable) return;
    if (form.party_kind === "SUPPLIER_REFUND" && form.supplier_id) {
      void loadSupplierRecoverable(form.supplier_id);
    }
  }, [form.party_kind, form.supplier_id, fieldsEditable, loadSupplierRecoverable]);

  useEffect(() => {
    if (form.party_kind !== "CUSTOMER" || !form.customer_id) {
      setPartyTdsSectionId(null);
      return;
    }
    let cancelled = false;
    void CustomerListService.view(form.customer_id)
      .then((detail) => {
        if (cancelled) return;
        const id = detail.tdsSectionId?.trim() || null;
        setPartyTdsSectionId(id || null);
      })
      .catch(() => {
        if (!cancelled) setPartyTdsSectionId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [form.party_kind, form.customer_id]);

  // Legacy drafts may have TDS without Section — prefill party default into empty slots only.
  useEffect(() => {
    if (!partyTdsSectionId || !fieldsEditable) return;
    setForm((prev) => {
      let changed = false;
      const allocations = prev.allocations.map((a) => {
        if (toMoneyNumber(a.tds_amount) > 0 && !a.tds_section_id.trim()) {
          changed = true;
          return { ...a, tds_section_id: partyTdsSectionId };
        }
        return a;
      });
      return changed ? { ...prev, allocations } : prev;
    });
  }, [partyTdsSectionId, fieldsEditable]);

  const applyAllocationPatch = useCallback(
    (
      openItemId: string,
      patchAmount: Partial<
        Pick<
          ReceiptUiAllocation,
          "allocated_amount" | "tds_amount" | "tds_section_id" | "discount_amount"
        >
      >,
    ) => {
      setForm((prev) => ({
        ...prev,
        allocations: prev.allocations.map((a) => {
          if (a.open_item_id !== openItemId) return a;
          const next: ReceiptUiAllocation = { ...a, ...patchAmount };
          if (patchAmount.tds_amount !== undefined) {
            const tds = toMoneyNumber(patchAmount.tds_amount);
            if (tds <= 0) {
              next.tds_section_id = "";
            } else if (!next.tds_section_id.trim() && partyTdsSectionId) {
              next.tds_section_id = partyTdsSectionId;
            }
          }
          return next;
        }),
      }));
    },
    [partyTdsSectionId],
  );

  const warehouseName = warehouses.find((w) => w.value === form.warehouse_id)?.label || "";

  const bankOptions = useMemo(() => {
    return bankRows
      .filter(
        (b) =>
          !form.warehouse_id ||
          b.warehouses.length === 0 ||
          b.warehouses.includes(warehouseName),
      )
      .map((b) => ({
        value: b.bankAccountId,
        label: b.label,
        sub: b.ledgerId,
      }));
  }, [bankRows, form.warehouse_id, warehouseName]);

  const partyName = useMemo(() => {
    if (form.party_kind === "CUSTOMER") {
      return customers.find((c) => c.value === form.customer_id)?.label || "";
    }
    if (form.party_kind === "SUPPLIER_REFUND") {
      return suppliers.find((s) => s.value === form.supplier_id)?.label || "";
    }
    return form.other_ledger_name;
  }, [form, customers, suppliers]);

  const attachmentCount =
    form.persistedAttachments.length + form.pendingFiles.length;

  const handleAddAttachmentFiles = (files: File[]) => {
    const err = validateReceiptAttachmentFiles(files, attachmentCount);
    if (err) {
      showToast(err, "error");
      return;
    }
    const next = createReceiptPendingFiles(files);
    setForm((prev) => ({
      ...prev,
      pendingFiles: [...prev.pendingFiles, ...next],
    }));
  };

  const handleRemovePersistedAttachment = (fileUrl: string) => {
    setForm((prev) => ({
      ...prev,
      persistedAttachments: prev.persistedAttachments.filter(
        (a) => a.file_url !== fileUrl,
      ),
    }));
  };

  const handleRemovePendingAttachment = (id: string) => {
    setForm((prev) => {
      const target = prev.pendingFiles.find((p) => p.id === id);
      if (target) revokeReceiptPendingPreviews(target);
      return {
        ...prev,
        pendingFiles: prev.pendingFiles.filter((p) => p.id !== id),
      };
    });
  };

  const saveDraft = async (options?: {
    skipToast?: boolean;
    skipNavigate?: boolean;
  }): Promise<ReceiptVoucherDetail | null> => {
    const validationError = validateReceiptForm(form);
    if (validationError) {
      setError(validationError);
      showToast(validationError, "error");
      return null;
    }
    setError(null);
    setBusy(true);
    try {
      const pendingFiles = form.pendingFiles.map((p) => p.file);
      const fyId = selectedFY.id || null;
      const saved = currentId
        ? await ReceiptVoucherService.update(
            currentId,
            buildUpdatePayload(form),
            {
              pendingFiles,
              existingAttachments: form.persistedAttachments,
              financialYearId: fyId,
            },
          )
        : await ReceiptVoucherService.create(
            buildCreatePayload(form),
            pendingFiles,
            { financialYearId: fyId },
          );
      hydrateFromDetail(saved);
      if (!options?.skipToast) {
        showToast(
          currentId ? "Receipt draft updated." : "Receipt draft created.",
          "success",
        );
      }
      if (!options?.skipNavigate) {
        // Leave busy=true — clearing it after replace can abort soft navigation
        goToList();
        return saved;
      }
      setBusy(false);
      return saved;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save draft.";
      setError(msg);
      showToast(msg, "error");
      setBusy(false);
      return null;
    }
  };

  const runAction = async (
    action: () => Promise<ReceiptVoucherDetail>,
    successMsg: string,
    options?: { keepBusy?: boolean },
  ) => {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      hydrateFromDetail(result);
      showToast(successMsg, "success");
      if (!options?.keepBusy) setBusy(false);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Action failed.";
      setError(msg);
      showToast(msg, "error");
      setBusy(false);
      return null;
    }
  };

  const handleDiscard = () => {
    if (onDone) onDone();
    else if (currentId) router.push(receiptViewPath(currentId));
    else router.push(RECEIPT_LIST_PATH);
  };

  const handleBack = () => {
    if (readOnlyProp && onDone) onDone();
    else router.push(RECEIPT_LIST_PATH);
  };

  /** Save current form then post immediately — no confirmation dialog. */
  const handleSaveAndPost = async () => {
    const saved = await saveDraft({ skipToast: true, skipNavigate: true });
    if (!saved?.receipt_voucher_id) return;
    const posted = await runAction(
      () => ReceiptVoucherService.post(saved.receipt_voucher_id),
      "Receipt posted successfully.",
      { keepBusy: true },
    );
    if (posted) {
      goToList();
      return;
    }
    setBusy(false);
  };

  /** Post an already-saved voucher without confirmation (approved / view flows). */
  const handlePostDirect = async () => {
    if (!currentId) return;
    const posted = await runAction(
      () => ReceiptVoucherService.post(currentId),
      "Receipt posted successfully.",
      { keepBusy: true },
    );
    if (posted?.receipt_voucher_id) {
      goToList();
      return;
    }
    setBusy(false);
  };

  const title =
    readOnlyProp || !fieldsEditable
      ? "View Receipt Voucher"
      : currentId
        ? "Edit Receipt Voucher"
        : "Create Receipt Voucher";

  const breadcrumbPage =
    readOnlyProp || !fieldsEditable
      ? "View Receipt Voucher"
      : currentId
        ? "Edit Receipt Voucher"
        : "Create Receipt Voucher";

  const subtitle = detail
    ? `Draft No. ${formatSrNo(detail.sr_no)} · ${RECEIPT_STATUS_LABELS[status]}`
    : "Create a receipt against customer outstanding, supplier recoverable, or other ledger.";

  const actionBar = (
    <ReceiptFormActionBar
      status={status}
      busy={busy}
      readOnly={showViewChrome}
      canCancel={canCancelStatus(status) && !!currentId}
      approvalRequired={approvalRequired}
      configReady={configReady}
      hasExistingId={!!currentId}
      onDiscard={fieldsEditable ? handleDiscard : undefined}
      onSaveDraft={
        fieldsEditable && !readOnlyProp ? () => void saveDraft() : undefined
      }
      onSubmitForApproval={
        fieldsEditable && !readOnlyProp && approvalRequired
          ? () => setSubmitOpen(true)
          : undefined
      }
      onSaveAndPost={
        fieldsEditable &&
        !readOnlyProp &&
        !approvalRequired &&
        !currentId
          ? () => void handleSaveAndPost()
          : undefined
      }
      onApprove={
        status === "PENDING_APPROVAL" && approvalRequired && currentId
          ? () =>
              void runAction(
                () => ReceiptVoucherService.approve(currentId!),
                "Receipt approved.",
              )
          : undefined
      }
      onReject={
        status === "PENDING_APPROVAL" && approvalRequired && currentId
          ? () => setRejectOpen(true)
          : undefined
      }
      onPost={
        !approvalRequired &&
        currentId &&
        (status === "APPROVED" ||
          ((status === "DRAFT" || status === "REJECTED" || !status) &&
            fieldsEditable &&
            !readOnlyProp))
          ? status === "APPROVED"
            ? () => void handlePostDirect()
            : () => void handleSaveAndPost()
          : undefined
      }
      onCancel={
        canCancelStatus(status) &&
        currentId &&
        !isDraftEditable(status)
          ? () => setCancelOpen(true)
          : undefined
      }
      onReverse={
        status === "POSTED" && currentId
          ? () => setReverseOpen(true)
          : undefined
      }
    />
  );

  if (loading) {
    return (
      <div className="sales-order-invoice-form-compact h-full min-h-0 flex flex-col w-full">
        <InvoiceFormLayout
          title="Receipt Voucher"
          subtitle="Loading…"
          breadcrumb={accountsBreadcrumb("Vouchers", "Receipt Voucher", RECEIPT_LIST_PATH)}
          backHref={RECEIPT_LIST_PATH}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading receipt…
          </div>
        </InvoiceFormLayout>
      </div>
    );
  }

  return (
    <>
      <div className="sales-order-invoice-form-compact h-full min-h-0 flex flex-col w-full">
        <InvoiceFormLayout
          title={title}
          subtitle={subtitle}
          breadcrumb={accountsBreadcrumb("Vouchers", breadcrumbPage, RECEIPT_LIST_PATH)}
          backHref={RECEIPT_LIST_PATH}
          onBackClick={showViewChrome ? handleBack : fieldsEditable ? handleDiscard : undefined}
          stickyFooter={!showViewChrome || status === "POSTED" ? actionBar : undefined}
        >
          <div
            className={cn(
              isViewMode ? "space-y-2" : "space-y-2.5",
              isViewMode && "transaction-voucher-view receipt-voucher-view",
            )}
          >
            {error ? <div className={VOUCHER_ERROR_CLASS}>{error}</div> : null}

            {readOnlyProp && onEdit && !fieldsEditable && isDraftEditable(status) ? (
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onEdit}>
                  Edit
                </Button>
              </div>
            ) : null}

        {isViewMode ? (
          <ReceiptViewHero
            draftNo={detail ? formatSrNo(detail.sr_no) : "—"}
            accountingVoucherNo={detail?.accounting_voucher?.voucher_number}
            voucherDate={form.voucher_date}
            branchName={warehouseName || undefined}
            modeLabel={
              BANK_TRANSACTION_MODE_LABELS[form.transaction_mode] ||
              form.transaction_mode
            }
            partyLabel={
              form.party_kind === "OTHER_LEDGER"
                ? form.other_ledger_name || RECEIPT_PARTY_KIND_LABELS.OTHER_LEDGER
                : partyName || RECEIPT_PARTY_KIND_LABELS[form.party_kind]
            }
            netBank={preview.netBank}
            status={status}
          />
        ) : null}

        {/* A. Voucher Details */}
        <VoucherFormSectionCard title="Voucher Details" highlight={isViewMode}>
          <div className="space-y-1.5">
            <div className="so-invoice-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <InvoiceDetailField label="Draft Receipt No.">
                <div className="so-goods-ro so-goods-ro--mono w-full text-brand-700">
                  {detail ? formatSrNo(detail.sr_no) : "Auto on save"}
                </div>
              </InvoiceDetailField>
              <InvoiceDetailField label="Branch / Warehouse" required>
                <ReceiptSearchableSelect
                  disabled={!fieldsEditable}
                  value={form.warehouse_id}
                  options={warehouses}
                  placeholder="Select warehouse…"
                  triggerClassName={INVOICE_DETAIL_SELECT_CLASS}
                  onChange={(id) =>
                    patch({
                      warehouse_id: id,
                      bank_account_id: "",
                      cash_bank_ledger_id: form.transaction_mode === "CASH" ? form.cash_bank_ledger_id : "",
                      cash_bank_ledger_name:
                        form.transaction_mode === "CASH" ? form.cash_bank_ledger_name : "",
                    })
                  }
                />
              </InvoiceDetailField>
              <InvoiceDetailField label="Mode of Receipt" required>
                <Select
                  value={form.transaction_mode}
                  disabled={!fieldsEditable}
                  onValueChange={(v) => {
                    const mode = v as BankTransactionMode;
                    patch({
                      transaction_mode: mode,
                      bank_account_id: mode === "CASH" ? "" : form.bank_account_id,
                      cheque_number: mode === "CHEQUE" ? form.cheque_number : "",
                      cheque_date: mode === "CHEQUE" ? form.cheque_date : "",
                      utr_number: mode === "CASH" ? "" : form.utr_number,
                    });
                  }}
                >
                  <SelectTrigger className={INVOICE_DETAIL_SELECT_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_TRANSACTION_MODES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {BANK_TRANSACTION_MODE_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InvoiceDetailField>
              <InvoiceDetailField label="Transaction Date">
                <Input
                  type="date"
                  className={INVOICE_DETAIL_INPUT_CLASS}
                  value={form.transaction_date}
                  disabled={!fieldsEditable}
                  onChange={(e) => patch({ transaction_date: e.target.value })}
                />
              </InvoiceDetailField>
            </div>
            {detail?.accounting_voucher?.voucher_number ? (
              <div className="so-invoice-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <InvoiceDetailField label="Accounting Voucher No.">
                  <div className="so-goods-ro so-goods-ro--mono w-full">
                    {detail.accounting_voucher.voucher_number}
                  </div>
                </InvoiceDetailField>
              </div>
            ) : null}
          </div>
        </VoucherFormSectionCard>

        {/* 2. Received In */}
        <VoucherFormSectionCard title="Received In">
          <div className="space-y-1.5">
            <div className="so-invoice-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <InvoiceDetailField
                label={form.transaction_mode === "CASH" ? "Cash Ledger" : "Cash / Bank Account"}
                required
              >
                {form.transaction_mode === "CASH" ? (
                  <VoucherLedgerSelect
                    disabled={!fieldsEditable}
                    value={form.cash_bank_ledger_id}
                    fallbackLabel={form.cash_bank_ledger_name || undefined}
                    placeholder="Select cash ledger…"
                    className={INVOICE_DETAIL_SELECT_CLASS}
                    onChange={(ledger) =>
                      patch({
                        cash_bank_ledger_id: ledger.ledgerId,
                        cash_bank_ledger_name: ledger.ledgerName,
                        bank_account_id: "",
                      })
                    }
                  />
                ) : (
                  <ReceiptSearchableSelect
                    disabled={!fieldsEditable || !form.warehouse_id}
                    value={form.bank_account_id}
                    options={bankOptions}
                    placeholder={
                      form.warehouse_id
                        ? "Select bank account…"
                        : "Select warehouse first…"
                    }
                    triggerClassName={INVOICE_DETAIL_SELECT_CLASS}
                    onChange={(id) => {
                      const row = bankRows.find((b) => b.bankAccountId === id);
                      patch({
                        bank_account_id: id,
                        cash_bank_ledger_id: row?.ledgerId || "",
                        cash_bank_ledger_name: row?.label || "",
                      });
                    }}
                  />
                )}
              </InvoiceDetailField>

              {form.transaction_mode === "CHEQUE" ? (
                <>
                  <InvoiceDetailField label="Cheque Number" required>
                    <Input
                      className={INVOICE_DETAIL_INPUT_CLASS}
                      value={form.cheque_number}
                      disabled={!fieldsEditable}
                      onChange={(e) => patch({ cheque_number: e.target.value })}
                    />
                  </InvoiceDetailField>
                  <InvoiceDetailField label="Cheque Date" required>
                    <Input
                      type="date"
                      className={INVOICE_DETAIL_INPUT_CLASS}
                      value={form.cheque_date}
                      disabled={!fieldsEditable}
                      onChange={(e) => patch({ cheque_date: e.target.value })}
                    />
                  </InvoiceDetailField>
                </>
              ) : null}

              {form.transaction_mode !== "CASH" && form.transaction_mode !== "CHEQUE" ? (
                <>
                  <InvoiceDetailField label="UTR Number">
                    <Input
                      className={INVOICE_DETAIL_INPUT_CLASS}
                      value={form.utr_number}
                      disabled={!fieldsEditable}
                      onChange={(e) => patch({ utr_number: e.target.value })}
                      placeholder="UTR…"
                    />
                  </InvoiceDetailField>
                  <InvoiceDetailField label="Transaction Reference">
                    <Input
                      className={INVOICE_DETAIL_INPUT_CLASS}
                      value={form.transaction_reference}
                      disabled={!fieldsEditable}
                      onChange={(e) => patch({ transaction_reference: e.target.value })}
                      placeholder="Reference…"
                    />
                  </InvoiceDetailField>
                </>
              ) : null}
            </div>
          </div>
        </VoucherFormSectionCard>

        {/* 3. Received From */}
        <VoucherFormSectionCard title="Received From">
          <div className="so-invoice-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <InvoiceDetailField label="Received From Type" required>
              <Select
                value={form.party_kind}
                disabled={!fieldsEditable}
                onValueChange={(v) => {
                  const kind = v as ReceiptPartyKind;
                  patch({
                    party_kind: kind,
                    customer_id: "",
                    supplier_id: "",
                    other_ledger_id: "",
                    other_ledger_name: "",
                    allocations: [],
                    advance_amount: "0",
                    receipt_treatment: "against_outstanding",
                  });
                }}
              >
                <SelectTrigger className={INVOICE_DETAIL_SELECT_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RECEIPT_PARTY_KIND_LABELS) as ReceiptPartyKind[]).map(
                    (k) => (
                      <SelectItem key={k} value={k}>
                        {RECEIPT_PARTY_KIND_LABELS[k]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </InvoiceDetailField>

            {form.party_kind === "CUSTOMER" ? (
              <InvoiceDetailField label="Customer" required>
                <ReceiptSearchableSelect
                  disabled={!fieldsEditable}
                  value={form.customer_id}
                  options={customers}
                  placeholder="Select customer…"
                  triggerClassName={INVOICE_DETAIL_SELECT_CLASS}
                  onChange={(id) => patch({ customer_id: id, allocations: [] })}
                />
              </InvoiceDetailField>
            ) : null}

            {form.party_kind === "SUPPLIER_REFUND" ? (
              <InvoiceDetailField label="Supplier" required>
                <ReceiptSearchableSelect
                  disabled={!fieldsEditable}
                  value={form.supplier_id}
                  options={suppliers}
                  placeholder="Select supplier…"
                  triggerClassName={INVOICE_DETAIL_SELECT_CLASS}
                  onChange={(id) => patch({ supplier_id: id, allocations: [] })}
                />
              </InvoiceDetailField>
            ) : null}

            {form.party_kind === "OTHER_LEDGER" ? (
              <InvoiceDetailField label="Other Ledger" required>
                <VoucherLedgerSelect
                  disabled={!fieldsEditable}
                  value={form.other_ledger_id}
                  fallbackLabel={form.other_ledger_name || undefined}
                  placeholder="Select ledger…"
                  className={INVOICE_DETAIL_SELECT_CLASS}
                  onChange={(ledger) =>
                    patch({
                      other_ledger_id: ledger.ledgerId,
                      other_ledger_name: ledger.ledgerName,
                      allocations: [],
                    })
                  }
                />
              </InvoiceDetailField>
            ) : null}

            <InvoiceDetailField
              label={
                form.party_kind === "OTHER_LEDGER"
                  ? "Amount"
                  : form.party_kind === "CUSTOMER"
                    ? isCustomerAdvance
                      ? "Advance Amount"
                      : "Gross Amount"
                    : "Gross Refund Amount"
              }
              required={form.party_kind === "OTHER_LEDGER"}
            >
              <Input
                className={cn(INVOICE_DETAIL_INPUT_CLASS, VOUCHER_MONEY_INPUT_CLASS, "tabular-nums")}
                value={form.gross_party_amount}
                disabled={!fieldsEditable}
                onChange={(e) => patch({ gross_party_amount: e.target.value })}
                placeholder="0.00"
              />
            </InvoiceDetailField>

            {form.party_kind === "CUSTOMER" ? (
              <div className="min-w-0 sm:col-span-2 lg:col-span-2">
                <InvoiceDetailField label="Receipt Treatment">
                  <div className="cnz-gst-toggle w-full" role="group" aria-label="Receipt treatment">
                    <button
                      type="button"
                      data-active={form.receipt_treatment === "advance_on_account"}
                      aria-pressed={form.receipt_treatment === "advance_on_account"}
                      disabled={!fieldsEditable}
                      onClick={() => applyReceiptTreatment("advance_on_account")}
                    >
                      Advance / On Account
                    </button>
                    <button
                      type="button"
                      data-active={form.receipt_treatment === "against_outstanding"}
                      aria-pressed={form.receipt_treatment === "against_outstanding"}
                      disabled={!fieldsEditable}
                      onClick={() => applyReceiptTreatment("against_outstanding")}
                    >
                      Against Outstanding
                    </button>
                    <button
                      type="button"
                      data-active={form.receipt_treatment === "mixed_allocation"}
                      aria-pressed={form.receipt_treatment === "mixed_allocation"}
                      disabled={!fieldsEditable}
                      onClick={() => applyReceiptTreatment("mixed_allocation")}
                    >
                      Mixed Allocation
                    </button>
                  </div>
                </InvoiceDetailField>
              </div>
            ) : null}
          </div>
        </VoucherFormSectionCard>

        {/* 4–5. Invoice multi-select + settlement table */}
        {showInvoiceSettlement ? (
          <VoucherFormSectionCard
            title={
              isViewMode
                ? form.party_kind === "SUPPLIER_REFUND"
                  ? "Selected Recoverable Items"
                  : "Selected Invoices"
                : form.party_kind === "SUPPLIER_REFUND"
                  ? "Select Recoverable Item(s)"
                  : "Select Invoice(s)"
            }
            headerActions={
              outstandingLoading ? (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                </span>
              ) : null
            }
          >
            <div className="space-y-3">
              {!isViewMode ? (
                <ReceiptInvoiceMultiSelect
                  allocations={form.allocations}
                  selectedIds={selectedInvoiceIds}
                  onChange={handleInvoiceSelection}
                  disabled={!fieldsEditable}
                  loading={outstandingLoading}
                  emptyHint={
                    form.party_kind === "SUPPLIER_REFUND"
                      ? form.supplier_id
                        ? "No recoverable items"
                        : "Select a supplier first"
                      : form.customer_id
                        ? "No outstanding invoices"
                        : "Select a customer first"
                  }
                  label={
                    form.party_kind === "SUPPLIER_REFUND"
                      ? "Select Item(s)"
                      : "Select Invoice(s)"
                  }
                />
              ) : null}

              {selectedInvoiceRows.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">
                      Settlement
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      Total Invoice Settlement{" "}
                      <span className="font-semibold text-foreground">
                        {preview.totalAllocated.toFixed(2)}
                      </span>
                    </p>
                  </div>
                  <ReceiptAllocationTable
                    rows={selectedInvoiceRows}
                    readOnly={!fieldsEditable}
                    showTds={false}
                    showTdsSection={false}
                    showDiscount={false}
                    showSelectColumn={false}
                    settlementAmountLabel="Settlement"
                    emptyMessage="Select invoice(s) above."
                    onToggle={() => undefined}
                    onChangeAmount={applyAllocationPatch}
                  />
                  {form.party_kind === "CUSTOMER" ? (
                    <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Allocation Summary
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs tabular-nums">
                        <span className="text-muted-foreground">Gross Amount</span>
                        <span className="text-right font-medium text-foreground">
                          {formatMoney(preview.gross)}
                        </span>
                        <span className="text-muted-foreground">Invoice Settlement</span>
                        <span className="text-right font-medium text-foreground">
                          {formatMoney(preview.totalAllocated)}
                        </span>
                        <span className="text-muted-foreground">Advance / On Account</span>
                        <span className="text-right font-medium text-foreground">
                          {formatMoney(preview.advance)}
                        </span>
                        <span className="text-muted-foreground">Unallocated</span>
                        <span
                          className={cn(
                            "text-right font-semibold",
                            preview.unallocated > 0.004
                              ? "text-amber-700"
                              : "text-foreground",
                          )}
                        >
                          {formatMoney(preview.unallocated)}
                        </span>
                      </div>
                      {isCustomerMixed ? (
                        <p className="text-[11px] text-muted-foreground pt-0.5">
                          Remaining Amount {formatMoney(preview.advance)} treated as{" "}
                          <span className="font-medium text-foreground">
                            Advance / On Account
                          </span>
                          .
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {isViewMode
                    ? "No invoices settled on this receipt."
                    : "Selected invoices will appear here for settlement."}
                </p>
              )}
            </div>
          </VoucherFormSectionCard>
        ) : null}

        {/* 6. Ledger Entries — optional manual adjustments only */}
        <VoucherFormSectionCard
          title="Ledger Entries"
          flush
          headerActions={
            fieldsEditable ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="so-section-header-btn"
                onClick={() => handleLedgerEntriesChange(createReceiptLedgerEntryRow(form.adjustments))}
              >
                <Plus /> Add Line
              </Button>
            ) : null
          }
        >
          <ReceiptLedgerEntriesTable
            rows={form.adjustments}
            ledgerOptions={manualLedgers}
            readOnly={!fieldsEditable}
            onChange={handleLedgerEntriesChange}
          />
        </VoucherFormSectionCard>

        {/* 7. Narration & Attachments (left) / Summary (right) */}
        <div className="grid grid-cols-1 gap-2.5 items-start lg:grid-cols-[minmax(0,1fr)_300px]">
          <VoucherFormSectionCard title="Narration & Attachments">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="min-w-0 space-y-0.5">
                <Label className="text-xs font-medium">Narration</Label>
                <Textarea
                  className={cn(VOUCHER_INPUT_CLASS, "so-goods-narration min-h-[60px] h-auto resize-y text-xs w-full")}
                  rows={2}
                  value={form.narration}
                  onChange={(e) => patch({ narration: e.target.value })}
                  placeholder="Optional narration…"
                  maxLength={2000}
                  disabled={!fieldsEditable}
                />
              </div>
              <ReceiptAttachmentsPanel
                persisted={form.persistedAttachments}
                pending={form.pendingFiles}
                readOnly={!fieldsEditable}
                onAddFiles={handleAddAttachmentFiles}
                onRemovePersisted={handleRemovePersistedAttachment}
                onRemovePending={handleRemovePendingAttachment}
              />
            </div>
          </VoucherFormSectionCard>

          <ReceiptFormSummary
            grossAmount={preview.gross}
            invoiceSettlement={preview.totalAllocated}
            onAccountAmount={preview.advance}
            adjustmentsTotal={manualAdjustmentsTotal}
            receiptAmount={preview.netBank}
            showInvoiceSettlement={
              showInvoiceSettlement || preview.totalAllocated > 0.004
            }
            showOnAccount={showOnAccountInSummary}
            balanced={summaryBalanced}
          />
        </div>

        {detail?.accounting_voucher ? (
          <VoucherFormSectionCard title="Posted Accounting Voucher" highlight>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2 min-w-[160px]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-700/80">
                  Voucher No.
                </p>
                <p className="mt-0.5 font-mono font-semibold text-brand-800">
                  {detail.accounting_voucher.voucher_number || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2 min-w-[140px]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800/80">
                  Status
                </p>
                <p className="mt-0.5 font-semibold text-emerald-900">
                  {detail.accounting_voucher.status || "—"}
                </p>
              </div>
            </div>
          </VoucherFormSectionCard>
        ) : null}
          </div>
        </InvoiceFormLayout>
      </div>

      <ReceiptReasonDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Submit for Approval"
        description="Select an approver for this Receipt Voucher."
        confirmLabel="Submit"
        busy={busy}
        showApprover
        approvers={approvers}
        approverId={approverId}
        onApproverChange={setApproverId}
        onConfirm={() => {
          if (!currentId || !approverId) return;
          void (async () => {
            const saved = fieldsEditable ? await saveDraft() : detail;
            if (!saved && fieldsEditable) return;
            setSubmitOpen(false);
            await runAction(
              () =>
                ReceiptVoucherService.submit(currentId, { approver_id: approverId }),
              "Submitted for approval.",
            );
          })();
        }}
      />

      <ReceiptReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject Receipt"
        description="Provide a rejection reason."
        reason={rejectReason}
        onReasonChange={setRejectReason}
        confirmLabel="Reject"
        destructive
        busy={busy}
        onConfirm={() => {
          if (!currentId) return;
          setRejectOpen(false);
          void runAction(
            () =>
              ReceiptVoucherService.reject(currentId, {
                rejection_reason: rejectReason.trim(),
              }),
            "Receipt rejected.",
          );
        }}
      />

      <ReceiptReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Receipt"
        description="Cancellation keeps the record — it does not delete it."
        reason={cancelReason}
        onReasonChange={setCancelReason}
        confirmLabel="Cancel Receipt"
        destructive
        busy={busy}
        onConfirm={() => {
          if (!currentId) return;
          setCancelOpen(false);
          void runAction(
            () =>
              ReceiptVoucherService.cancel(currentId, {
                reason: cancelReason.trim(),
              }),
            "Receipt cancelled.",
          );
        }}
      />

      <ReceiptReasonDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        title="Reverse Receipt"
        description="Reversal will reverse accounting and Receipt-owned settlement effects. If Customer Advance was already consumed, the backend will block reversal."
        reason={reverseReason}
        onReasonChange={setReverseReason}
        showDate
        dateValue={reverseDate}
        onDateChange={setReverseDate}
        confirmLabel="Reverse"
        destructive
        busy={busy}
        onConfirm={() => {
          if (!currentId) return;
          setReverseOpen(false);
          void runAction(
            () =>
              ReceiptVoucherService.reverse(currentId, {
                reason: reverseReason.trim(),
                reversal_date: reverseDate || null,
              }),
            "Receipt reversed.",
          );
        }}
      />
    </>
  );
}
