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
  TransactionViewHero,
  buildVoucherViewMeta,
  voucherStatusToBadgeKey,
} from "@/components/accounts/voucher-form/TransactionViewHero";
import {
  VOUCHER_ERROR_CLASS,
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
import { PaymentVoucherService } from "@/services/payment-voucher.service";
import { CustomerListService } from "@/services/customer-list.service";
import { SupplierListService } from "@/services/supplier-list.service";
import { WarehouseService } from "@/services/warehouse.service";
import { BankAccountsListService } from "@/services/bank-accounts-list.service";
import { LedgerService } from "@/services/ledger.service";
import { UserListService } from "@/services/user-list.service";
import {
  PAYMENT_BANK_TRANSACTION_MODE_LABELS,
  PAYMENT_BANK_TRANSACTION_MODES,
  PAYMENT_PARTY_KIND_LABELS,
  PAYMENT_STATUS_LABELS,
  type PaymentBankTransactionMode,
  type PaymentPartyKind,
  type PaymentTreatmentUi,
  type PaymentVoucherDetail,
  type PaymentVoucherStatus,
} from "@/types/payment-voucher.types";
import { VoucherLedgerSelect } from "@/components/accounts/voucher-form/VoucherLedgerSelect";
import { PaymentSearchableSelect } from "./components/PaymentSearchableSelect";
import { PaymentFormActionBar } from "./components/PaymentFormActionBar";
import { PaymentAllocationTable } from "./components/PaymentAllocationTable";
import {
  PaymentLedgerEntriesTable,
  createPaymentLedgerEntryRow,
} from "./components/PaymentLedgerEntriesTable";
import { PaymentFormSummary } from "./components/PaymentFormSummary";
import { PaymentReasonDialog } from "./components/PaymentReasonDialog";
import { PaymentAttachmentsPanel } from "./components/PaymentAttachmentsPanel";
import {
  createPaymentPendingFiles,
  revokePaymentPendingPreviews,
  validatePaymentAttachmentFiles,
} from "./payment-attachment-formdata";
import {
  buildCreatePayload,
  buildUpdatePayload,
  canCancelStatus,
  computePaymentPreview,
  emptyPaymentForm,
  formatSrNo,
  isDraftEditable,
  mapDetailToForm,
  mapOpenItemsToAllocations,
  PAYMENT_LIST_PATH,
  paymentEditPath,
  paymentViewPath,
  sanitizeNonNegativeMoneyInput,
  toMoneyNumber,
  validatePaymentForm,
  type PaymentFormState,
  type PaymentUiAllocation,
} from "./payment-voucher-utils";

export interface PaymentVoucherApiFormProps {
  voucherId?: string;
  readOnly?: boolean;
  onDone?: () => void;
  onEdit?: () => void;
}

export function PaymentVoucherApiForm({
  voucherId,
  readOnly: readOnlyProp = false,
  onDone,
  onEdit,
}: PaymentVoucherApiFormProps) {
  const router = useRouter();
  const goToList = useCallback(() => {
    notifyVoucherListingChanged("payment");
    router.replace(PAYMENT_LIST_PATH);
  }, [router]);
  const [form, setForm] = useState<PaymentFormState>(emptyPaymentForm);
  const [detail, setDetail] = useState<PaymentVoucherDetail | null>(null);
  const [status, setStatus] = useState<PaymentVoucherStatus>("DRAFT");
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
  /** Supplier master TDS Section — retained for legacy allocation payload sync (TDS UI hidden). */
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

  const fieldsEditable = isDraftEditable(status) && !readOnlyProp;
  const isViewMode = readOnlyProp || !fieldsEditable;
  const isPostedView = status === "POSTED" && !readOnlyProp;
  const showViewChrome = readOnlyProp || isPostedView;
  const preview = useMemo(() => computePaymentPreview(form), [form]);
  /** Ledger Entries total (additive with settlement toward composed gross / payment). */
  const adjustmentsTotal = preview.ledgerEntriesTotal;
  const showSupplierInvoiceSettlement =
    form.party_kind === "SUPPLIER" &&
    (form.payment_treatment === "against_outstanding" ||
      form.payment_treatment === "mixed_allocation");
  const showInvoiceSettlementInSummary =
    showSupplierInvoiceSettlement ||
    preview.totalAllocated > 0.004 ||
    (form.party_kind === "CUSTOMER_REFUND" && preview.totalAllocated > 0.004);
  const showAdvanceInSummary =
    form.party_kind === "SUPPLIER" &&
    (form.payment_treatment === "advance_on_account" ||
      form.payment_treatment === "mixed_allocation" ||
      preview.advance > 0.004);
  /** Settlement + ledger entries must equal gross; payment amount equals gross (less TDS/discount). */
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

  const patch = useCallback((p: Partial<PaymentFormState>) => {
    setForm((prev) => ({ ...prev, ...p }));
  }, []);

  const clearAllocationSelections = useCallback(
    (allocations: PaymentFormState["allocations"]) =>
      allocations.map((a) => ({
        ...a,
        selected: false,
        allocated_amount: "",
        tds_amount: "0",
        tds_section_id: "",
        discount_amount: "0",
      })),
    [],
  );

  const applyPaymentTreatment = useCallback(
    (next: PaymentTreatmentUi) => {
      setForm((prev) => {
        if (prev.payment_treatment === next) return prev;
        if (next === "advance_on_account") {
          return {
            ...prev,
            payment_treatment: next,
            allocations: clearAllocationSelections(prev.allocations),
            advance_amount: "0",
          };
        }
        // against_outstanding / mixed_allocation: keep invoice rows; advance
        // is derived by computePaymentPreview (0 vs remaining).
        return {
          ...prev,
          payment_treatment: next,
        };
      });
    },
    [clearAllocationSelections],
  );

  const hydrateFromDetail = useCallback((d: PaymentVoucherDetail) => {
    setForm((prev) => {
      revokePaymentPendingPreviews(prev.pendingFiles);
      return mapDetailToForm(d);
    });
    setDetail(d);
    setStatus(d.status);
    setCurrentId(d.payment_voucher_id);
  }, []);

  const pendingFilesRef = useRef(form.pendingFiles);
  pendingFilesRef.current = form.pendingFiles;
  useEffect(() => {
    return () => {
      revokePaymentPendingPreviews(pendingFilesRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await PaymentVoucherService.getConfig();
        if (!cancelled) {
          setApprovalRequired(!!cfg.approval_required);
          setConfigReady(true);
        }
      } catch {
        if (!cancelled) {
          setApprovalRequired(true);
          setConfigReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [wh, cust, supp, banks, ledgers, users] = await Promise.all([
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
        if (cancelled) return;

        setWarehouses(
          (wh as Array<Record<string, unknown>>)
            .map((w) => ({
              value: String(w.warehouse_id ?? w.id ?? ""),
              label: String(w.warehouse_name ?? w.name ?? ""),
            }))
            .filter((w) => w.value),
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
        const ledgerOpts = (ledgers.ledgers ?? [])
          .map((l) => ({
            value: l.ledgerId,
            label: l.ledgerName,
            sub: l.ledgerCode,
          }))
          .filter((l) => l.value);
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
          users
            .map((u) => ({
              value: u.userId,
              label: u.label || `${u.firstName} ${u.lastName}`.trim() || u.username,
            }))
            .filter((u) => u.value),
        );
      } catch {
        /* dropdown failures are non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!voucherId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const d = await PaymentVoucherService.getById(voucherId);
        if (!cancelled) hydrateFromDetail(d);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load Payment Voucher.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [voucherId, hydrateFromDetail]);

  const loadSupplierOutstanding = useCallback(
    async (supplierId: string, keepSelections = true) => {
      if (!supplierId) {
        patch({ allocations: [] });
        return;
      }
      setOutstandingLoading(true);
      try {
        const res = await PaymentVoucherService.listSupplierOutstanding(supplierId);
        setForm((prev) => ({
          ...prev,
          allocations: mapOpenItemsToAllocations(
            res.items,
            keepSelections ? prev.allocations : undefined,
          ),
        }));
      } catch (e) {
        showToast(
          e instanceof Error ? e.message : "Failed to load supplier outstanding.",
          "error",
        );
        patch({ allocations: [] });
      } finally {
        setOutstandingLoading(false);
      }
    },
    [patch],
  );

  const loadCustomerRefundable = useCallback(
    async (customerId: string, keepSelections = true) => {
      if (!customerId) {
        patch({ allocations: [] });
        return;
      }
      setOutstandingLoading(true);
      try {
        const res = await PaymentVoucherService.listCustomerRefundable(customerId);
        setForm((prev) => ({
          ...prev,
          allocations: mapOpenItemsToAllocations(
            res.items,
            keepSelections ? prev.allocations : undefined,
          ),
        }));
      } catch (e) {
        showToast(
          e instanceof Error ? e.message : "Failed to load customer refundable balances.",
          "error",
        );
        patch({ allocations: [] });
      } finally {
        setOutstandingLoading(false);
      }
    },
    [patch],
  );

  useEffect(() => {
    if (!fieldsEditable) return;
    if (form.party_kind === "SUPPLIER" && form.supplier_id) {
      if (
        form.payment_treatment === "against_outstanding" ||
        form.payment_treatment === "mixed_allocation"
      ) {
        void loadSupplierOutstanding(form.supplier_id);
      }
    }
  }, [
    form.party_kind,
    form.supplier_id,
    form.payment_treatment,
    fieldsEditable,
    loadSupplierOutstanding,
  ]);

  useEffect(() => {
    if (!fieldsEditable) return;
    if (form.party_kind === "CUSTOMER_REFUND" && form.customer_id) {
      void loadCustomerRefundable(form.customer_id);
    }
  }, [form.party_kind, form.customer_id, fieldsEditable, loadCustomerRefundable]);

  useEffect(() => {
    if (form.party_kind !== "SUPPLIER" || !form.supplier_id) {
      setPartyTdsSectionId(null);
      return;
    }
    let cancelled = false;
    void SupplierListService.view(form.supplier_id)
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
  }, [form.party_kind, form.supplier_id]);

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
          PaymentUiAllocation,
          "allocated_amount" | "tds_amount" | "tds_section_id" | "discount_amount"
        >
      >,
    ) => {
      setForm((prev) => ({
        ...prev,
        allocations: prev.allocations.map((a) => {
          if (a.open_item_id !== openItemId) return a;
          const next: PaymentUiAllocation = { ...a, ...patchAmount };
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

  const partyLabel = useMemo(() => {
    if (form.party_kind === "SUPPLIER") {
      return suppliers.find((s) => s.value === form.supplier_id)?.label || "";
    }
    if (form.party_kind === "CUSTOMER_REFUND") {
      return customers.find((c) => c.value === form.customer_id)?.label || "";
    }
    return form.other_ledger_name || PAYMENT_PARTY_KIND_LABELS.OTHER_LEDGER;
  }, [form.party_kind, form.supplier_id, form.customer_id, form.other_ledger_name, suppliers, customers]);

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

  const attachmentCount = form.persistedAttachments.length + form.pendingFiles.length;
  const selectedAllocCount = form.allocations.filter((a) => a.selected).length;
  const isDirectCustomerRefund =
    form.party_kind === "CUSTOMER_REFUND" && selectedAllocCount === 0;

  const handleAddAttachmentFiles = (files: File[]) => {
    const err = validatePaymentAttachmentFiles(files, attachmentCount);
    if (err) {
      showToast(err, "error");
      return;
    }
    const next = createPaymentPendingFiles(files);
    setForm((prev) => ({
      ...prev,
      pendingFiles: [...prev.pendingFiles, ...next],
    }));
  };

  const handleRemovePersistedAttachment = (fileUrl: string) => {
    setForm((prev) => ({
      ...prev,
      persistedAttachments: prev.persistedAttachments.filter((a) => a.file_url !== fileUrl),
    }));
  };

  const handleRemovePendingAttachment = (id: string) => {
    setForm((prev) => {
      const target = prev.pendingFiles.find((p) => p.id === id);
      if (target) revokePaymentPendingPreviews(target);
      return {
        ...prev,
        pendingFiles: prev.pendingFiles.filter((p) => p.id !== id),
      };
    });
  };

  const saveDraft = async (options?: {
    skipToast?: boolean;
    skipNavigate?: boolean;
  }): Promise<PaymentVoucherDetail | null> => {
    const validationError = validatePaymentForm(form);
    if (validationError) {
      setError(validationError);
      showToast(validationError, "error");
      return null;
    }
    setError(null);
    setBusy(true);
    try {
      const pendingFiles = form.pendingFiles.map((p) => p.file);
      const saved = currentId
        ? await PaymentVoucherService.update(currentId, buildUpdatePayload(form), {
            pendingFiles,
            existingAttachments: form.persistedAttachments,
          })
        : await PaymentVoucherService.create(buildCreatePayload(form), pendingFiles);
      hydrateFromDetail(saved);
      if (!options?.skipToast) {
        showToast(
          currentId ? "Payment draft updated." : "Payment draft created.",
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
    action: () => Promise<PaymentVoucherDetail>,
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
    else if (currentId) router.push(paymentViewPath(currentId));
    else router.push(PAYMENT_LIST_PATH);
  };

  const handleBack = () => {
    if (readOnlyProp && onDone) onDone();
    else router.push(PAYMENT_LIST_PATH);
  };

  /** Save current form then post immediately — no confirmation dialog. */
  const handleSaveAndPost = async () => {
    const saved = await saveDraft({ skipToast: true, skipNavigate: true });
    if (!saved?.payment_voucher_id) return;
    const posted = await runAction(
      () => PaymentVoucherService.post(saved.payment_voucher_id),
      "Payment posted successfully.",
      { keepBusy: true },
    );
    if (posted) {
      goToList();
      return;
    }
    setBusy(false);
  };

  /** Post an already-saved voucher without confirmation (approved flows). */
  const handlePostDirect = async () => {
    if (!currentId) return;
    const posted = await runAction(
      () => PaymentVoucherService.post(currentId),
      "Payment posted successfully.",
      { keepBusy: true },
    );
    if (posted?.payment_voucher_id) {
      goToList();
      return;
    }
    setBusy(false);
  };

  const title =
    readOnlyProp || !fieldsEditable
      ? "View Payment Voucher"
      : currentId
        ? "Edit Payment Voucher"
        : "Create Payment Voucher";

  const breadcrumbPage =
    readOnlyProp || !fieldsEditable
      ? "View Payment Voucher"
      : currentId
        ? "Edit Payment Voucher"
        : "Create Payment Voucher";

  const subtitle = detail
    ? `Draft No. ${formatSrNo(detail.sr_no)} · ${PAYMENT_STATUS_LABELS[status]}`
    : "Create a payment to a supplier, customer refund, or other ledger.";

  const actionBar = (
    <PaymentFormActionBar
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
        fieldsEditable && !readOnlyProp ? () => setSubmitOpen(true) : undefined
      }
      onSaveAndPost={
        fieldsEditable && !readOnlyProp && !currentId
          ? () => void handleSaveAndPost()
          : undefined
      }
      onApprove={
        !readOnlyProp &&
        status === "PENDING_APPROVAL" &&
        approvalRequired &&
        currentId
          ? () =>
              void runAction(
                () => PaymentVoucherService.approve(currentId!),
                "Payment approved.",
              )
          : undefined
      }
      onReject={
        !readOnlyProp &&
        status === "PENDING_APPROVAL" &&
        approvalRequired &&
        currentId
          ? () => setRejectOpen(true)
          : undefined
      }
      onPost={
        fieldsEditable && !readOnlyProp && currentId
          ? status === "APPROVED"
            ? () => void handlePostDirect()
            : status === "DRAFT" || status === "REJECTED" || !status
              ? () => void handleSaveAndPost()
              : undefined
          : undefined
      }
      onCancel={
        !readOnlyProp &&
        canCancelStatus(status) &&
        currentId &&
        !isDraftEditable(status)
          ? () => setCancelOpen(true)
          : undefined
      }
      onReverse={
        status === "POSTED" && currentId ? () => setReverseOpen(true) : undefined
      }
    />
  );

  if (loading) {
    return (
      <div className="sales-order-invoice-form-compact h-full min-h-0 flex flex-col w-full">
        <InvoiceFormLayout
          title="Payment Voucher"
          subtitle="Loading…"
          breadcrumb={accountsBreadcrumb("Vouchers", "Payment Voucher", PAYMENT_LIST_PATH)}
          backHref={PAYMENT_LIST_PATH}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading payment…
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
          breadcrumb={accountsBreadcrumb("Vouchers", breadcrumbPage, PAYMENT_LIST_PATH)}
          backHref={PAYMENT_LIST_PATH}
          onBackClick={showViewChrome ? handleBack : fieldsEditable ? handleDiscard : undefined}
          stickyFooter={!showViewChrome || status === "POSTED" ? actionBar : undefined}
        >
          <div
            className={cn(
              isViewMode ? "space-y-2" : "space-y-2.5",
              isViewMode && "transaction-voucher-view",
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
              <TransactionViewHero
                statusKey={voucherStatusToBadgeKey(status)}
                statusLabel={PAYMENT_STATUS_LABELS[status] || status}
                chips={[
                  PAYMENT_BANK_TRANSACTION_MODE_LABELS[form.transaction_mode] ||
                    form.transaction_mode,
                ]}
                metaItems={buildVoucherViewMeta({
                  draftNo: detail ? formatSrNo(detail.sr_no) : "—",
                  accountingVoucherNo: detail?.accounting_voucher?.voucher_number,
                  voucherDate: form.transaction_date,
                  branchName: warehouseName || undefined,
                })}
                partyLabel={
                  partyLabel ||
                  PAYMENT_PARTY_KIND_LABELS[form.party_kind] ||
                  undefined
                }
                amountLabel="Net Cash / Bank"
                amount={preview.netBank}
              />
            ) : null}

        <VoucherFormSectionCard title="Voucher Details" highlight={isViewMode}>
          <div className="space-y-1.5">
            <div className="so-invoice-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <InvoiceDetailField label="Draft Payment No.">
                <div className="so-goods-ro so-goods-ro--mono w-full text-brand-700">
                  {detail ? formatSrNo(detail.sr_no) : "Auto on save"}
                </div>
              </InvoiceDetailField>
              <InvoiceDetailField label="Branch / Warehouse" required>
                <PaymentSearchableSelect
                  disabled={!fieldsEditable}
                  value={form.warehouse_id}
                  options={warehouses}
                  placeholder="Select warehouse…"
                  triggerClassName={INVOICE_DETAIL_SELECT_CLASS}
                  onChange={(id) =>
                    patch({
                      warehouse_id: id,
                      bank_account_id: "",
                      cash_bank_ledger_id:
                        form.transaction_mode === "CASH" ? form.cash_bank_ledger_id : "",
                      cash_bank_ledger_name:
                        form.transaction_mode === "CASH" ? form.cash_bank_ledger_name : "",
                    })
                  }
                />
              </InvoiceDetailField>
              <InvoiceDetailField label="Mode of Payment" required>
                <Select
                  value={form.transaction_mode}
                  disabled={!fieldsEditable}
                  onValueChange={(v) => {
                    const mode = v as PaymentBankTransactionMode;
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
                    {PAYMENT_BANK_TRANSACTION_MODES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {PAYMENT_BANK_TRANSACTION_MODE_LABELS[m]}
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

        <VoucherFormSectionCard title="Paid From" highlight={isViewMode}>
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
                  <PaymentSearchableSelect
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

        <VoucherFormSectionCard title="Paid To" highlight={isViewMode}>
          <div className="so-invoice-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <InvoiceDetailField label="Paid To Type" required>
              <Select
                value={form.party_kind}
                disabled={!fieldsEditable}
                onValueChange={(v) => {
                  const kind = v as PaymentPartyKind;
                  patch({
                    party_kind: kind,
                    customer_id: "",
                    supplier_id: "",
                    other_ledger_id: "",
                    other_ledger_name: "",
                    allocations: [],
                    advance_amount: "0",
                    payment_treatment: "against_outstanding",
                  });
                }}
              >
                <SelectTrigger className={INVOICE_DETAIL_SELECT_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAYMENT_PARTY_KIND_LABELS) as PaymentPartyKind[]).map(
                    (k) => (
                      <SelectItem key={k} value={k}>
                        {PAYMENT_PARTY_KIND_LABELS[k]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </InvoiceDetailField>

            {form.party_kind === "SUPPLIER" ? (
              <InvoiceDetailField label="Supplier" required>
                <PaymentSearchableSelect
                  disabled={!fieldsEditable}
                  value={form.supplier_id}
                  options={suppliers}
                  placeholder="Select supplier…"
                  triggerClassName={INVOICE_DETAIL_SELECT_CLASS}
                  onChange={(id) => patch({ supplier_id: id, allocations: [] })}
                />
              </InvoiceDetailField>
            ) : null}

            {form.party_kind === "CUSTOMER_REFUND" ? (
              <InvoiceDetailField label="Customer" required>
                <PaymentSearchableSelect
                  disabled={!fieldsEditable}
                  value={form.customer_id}
                  options={customers}
                  placeholder="Select customer…"
                  triggerClassName={INVOICE_DETAIL_SELECT_CLASS}
                  onChange={(id) =>
                    patch({
                      customer_id: id,
                      allocations: [],
                      other_ledger_id: "",
                      other_ledger_name: "",
                    })
                  }
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
                form.party_kind === "SUPPLIER"
                  ? "Gross Supplier Amount"
                  : form.party_kind === "CUSTOMER_REFUND"
                    ? "Gross Refund Amount"
                    : "Gross Amount"
              }
              required={form.party_kind !== "SUPPLIER"}
            >
              <Input
                className={cn(INVOICE_DETAIL_INPUT_CLASS, VOUCHER_MONEY_INPUT_CLASS, "tabular-nums")}
                value={form.gross_party_amount}
                disabled={!fieldsEditable}
                onChange={(e) =>
                  patch({
                    gross_party_amount: sanitizeNonNegativeMoneyInput(e.target.value),
                  })
                }
                placeholder="0.00"
              />
            </InvoiceDetailField>

            {form.party_kind === "SUPPLIER" ? (
              <div className="min-w-0 sm:col-span-2 lg:col-span-2">
                <InvoiceDetailField label="Payment Treatment">
                  <div className="cnz-gst-toggle w-full" role="group" aria-label="Payment treatment">
                    <button
                      type="button"
                      data-active={form.payment_treatment === "advance_on_account"}
                      aria-pressed={form.payment_treatment === "advance_on_account"}
                      disabled={!fieldsEditable}
                      onClick={() => applyPaymentTreatment("advance_on_account")}
                    >
                      Advance / On Account
                    </button>
                    <button
                      type="button"
                      data-active={form.payment_treatment === "against_outstanding"}
                      aria-pressed={form.payment_treatment === "against_outstanding"}
                      disabled={!fieldsEditable}
                      onClick={() => applyPaymentTreatment("against_outstanding")}
                    >
                      Against Outstanding
                    </button>
                    <button
                      type="button"
                      data-active={form.payment_treatment === "mixed_allocation"}
                      aria-pressed={form.payment_treatment === "mixed_allocation"}
                      disabled={!fieldsEditable}
                      onClick={() => applyPaymentTreatment("mixed_allocation")}
                    >
                      Mixed Allocation
                    </button>
                  </div>
                </InvoiceDetailField>
              </div>
            ) : null}
          </div>

          {form.party_kind === "CUSTOMER_REFUND" && isDirectCustomerRefund ? (
            <div className="mt-2.5 md:max-w-md space-y-1">
              <Label className="text-xs font-medium">
                Refund / Adjustment Ledger <span className="text-red-500">*</span>
              </Label>
              <VoucherLedgerSelect
                disabled={!fieldsEditable}
                value={form.other_ledger_id}
                fallbackLabel={form.other_ledger_name || undefined}
                placeholder="Select refund / adjustment ledger…"
                className={INVOICE_DETAIL_SELECT_CLASS}
                onChange={(ledger) =>
                  patch({
                    other_ledger_id: ledger.ledgerId,
                    other_ledger_name: ledger.ledgerName,
                  })
                }
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Direct refund without an existing credit open item. No fake Customer Advance
                is created.
              </p>
            </div>
          ) : null}

          {form.party_kind === "SUPPLIER" &&
          form.payment_treatment === "advance_on_account" ? (
            <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2">
              <p className="text-xs text-brand-800">
                Full amount will be posted as Supplier Advance / On Account
                {preview.gross > 0 ? ` (${preview.gross.toFixed(2)})` : ""}. No invoice
                selection is required.
              </p>
            </div>
          ) : null}

          {form.party_kind === "CUSTOMER_REFUND" ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">
                  Eligible Refundable Credits
                </p>
                {outstandingLoading ? (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                  </span>
                ) : null}
              </div>
              <PaymentAllocationTable
                rows={form.allocations}
                readOnly={!fieldsEditable}
                emptyMessage={
                  form.customer_id
                    ? "No eligible Customer Advance or Credit Note balance. You can still make a direct refund using a Refund / Adjustment Ledger."
                    : "Select a customer to load refundable balances."
                }
                onToggle={(id, selected) => {
                  setForm((prev) => ({
                    ...prev,
                    other_ledger_id: selected ? "" : prev.other_ledger_id,
                    other_ledger_name: selected ? "" : prev.other_ledger_name,
                    allocations: prev.allocations.map((a) =>
                      a.open_item_id === id
                        ? {
                            ...a,
                            selected,
                            allocated_amount: selected
                              ? a.allocated_amount || String(a.outstanding_amount)
                              : "",
                          }
                        : a,
                    ),
                  }));
                }}
                onChangeAmount={(id, p) => {
                  setForm((prev) => ({
                    ...prev,
                    allocations: prev.allocations.map((a) =>
                      a.open_item_id === id ? { ...a, ...p } : a,
                    ),
                  }));
                }}
              />
            </div>
          ) : null}
        </VoucherFormSectionCard>

        {showSupplierInvoiceSettlement ? (
          <VoucherFormSectionCard
            title={isViewMode ? "Selected Outstanding Items" : "Supplier Outstanding Allocations"}
            highlight={isViewMode}
            headerActions={
              outstandingLoading ? (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                </span>
              ) : null
            }
          >
            <div className="space-y-3">
              <PaymentAllocationTable
                rows={form.allocations}
                readOnly={!fieldsEditable}
                simplifiedSettlement
                emptyMessage={
                  form.supplier_id
                    ? "No outstanding open items for this supplier."
                    : "Select a supplier to load outstanding items."
                }
                onToggle={(id, selected) => {
                  setForm((prev) => ({
                    ...prev,
                    allocations: prev.allocations.map((a) =>
                      a.open_item_id === id
                        ? {
                            ...a,
                            selected,
                            allocated_amount: selected
                              ? a.allocated_amount || String(a.outstanding_amount)
                              : "",
                            tds_amount: selected ? a.tds_amount : "0",
                            tds_section_id: selected ? a.tds_section_id : "",
                            discount_amount: selected ? a.discount_amount : "0",
                          }
                        : a,
                    ),
                  }));
                }}
                onChangeAmount={applyAllocationPatch}
              />
            </div>
          </VoucherFormSectionCard>
        ) : null}

        <VoucherFormSectionCard
          title="Ledger Entries"
          flush
          highlight={isViewMode}
          headerActions={
            fieldsEditable ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="so-section-header-btn"
                onClick={() => patch({ adjustments: createPaymentLedgerEntryRow(form.adjustments) })}
              >
                <Plus /> Add Line
              </Button>
            ) : null
          }
        >
          <PaymentLedgerEntriesTable
            rows={form.adjustments}
            ledgerOptions={manualLedgers}
            readOnly={!fieldsEditable}
            onChange={(rows) => patch({ adjustments: rows })}
          />
        </VoucherFormSectionCard>

        <div className="grid grid-cols-1 gap-2.5 items-start lg:grid-cols-[minmax(0,1fr)_300px]">
          <VoucherFormSectionCard title="Narration & Attachments" highlight={isViewMode}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="min-w-0 space-y-0.5">
                <Label className="text-xs font-medium">Narration</Label>
                <Textarea
                  className={cn(INVOICE_DETAIL_INPUT_CLASS, "so-goods-narration min-h-[60px] h-auto resize-y text-xs w-full")}
                  rows={2}
                  value={form.narration}
                  onChange={(e) => patch({ narration: e.target.value })}
                  placeholder="Optional narration…"
                  maxLength={2000}
                  disabled={!fieldsEditable}
                />
              </div>
              <PaymentAttachmentsPanel
                persisted={form.persistedAttachments}
                pending={form.pendingFiles}
                readOnly={!fieldsEditable}
                onAddFiles={handleAddAttachmentFiles}
                onRemovePersisted={handleRemovePersistedAttachment}
                onRemovePending={handleRemovePendingAttachment}
              />
            </div>
          </VoucherFormSectionCard>

          <PaymentFormSummary
            grossAmount={preview.gross}
            invoiceSettlement={preview.totalAllocated}
            advanceAmount={preview.advance}
            adjustmentsTotal={adjustmentsTotal}
            paymentAmount={preview.netBank}
            partyKind={form.party_kind}
            showInvoiceSettlement={showInvoiceSettlementInSummary}
            showAdvance={showAdvanceInSummary}
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

      <PaymentReasonDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Submit for Approval"
        description="Select an approver for this Payment Voucher."
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
                PaymentVoucherService.submit(currentId, { approver_id: approverId }),
              "Submitted for approval.",
            );
          })();
        }}
      />

      <PaymentReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject Payment"
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
              PaymentVoucherService.reject(currentId, {
                rejection_reason: rejectReason.trim(),
              }),
            "Payment rejected.",
          );
        }}
      />

      <PaymentReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Payment"
        description="Cancellation keeps the record — it does not delete it."
        reason={cancelReason}
        onReasonChange={setCancelReason}
        confirmLabel="Cancel Payment"
        destructive
        busy={busy}
        onConfirm={() => {
          if (!currentId) return;
          setCancelOpen(false);
          void runAction(
            () =>
              PaymentVoucherService.cancel(currentId, {
                reason: cancelReason.trim(),
              }),
            "Payment cancelled.",
          );
        }}
      />

      <PaymentReasonDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        title="Reverse Payment"
        description="Reversal is owned by the backend. If Supplier Advance was already consumed by a downstream settlement, reversal will be blocked."
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
              PaymentVoucherService.reverse(currentId, {
                reason: reverseReason.trim(),
                reversal_date: reverseDate || null,
              }),
            "Payment reversed.",
          );
        }}
      />
    </>
  );
}
