"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceFormLayout } from "@/app/(app)/accounts/components/InvoiceFormLayout";
import {
  INVOICE_DETAIL_INPUT_CLASS,
  INVOICE_DETAIL_SELECT_CLASS,
  InvoiceDetailField,
} from "@/app/(app)/accounts/invoices/components/invoice-form-voucher-ui";
import "@/app/(app)/accounts/invoices/sales-order-invoice-form-compact.css";
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
import { showToast } from "@/lib/toast";
import { notifyVoucherListingChanged } from "@/lib/accounts/voucher-posting-notify";
import { JournalVoucherService } from "@/services/journal-voucher.service";
import { WarehouseService } from "@/services/warehouse.service";
import { UserListService } from "@/services/user-list.service";
import {
  JOURNAL_STATUS_LABELS,
  type JournalEligibleLedger,
  type JournalVoucherDetail,
  type JournalVoucherStatus,
} from "@/types/journal-voucher.types";
import { VoucherLedgerSelect } from "@/components/accounts/voucher-form/VoucherLedgerSelect";
import { JournalSearchableSelect } from "./components/JournalSearchableSelect";
import { JournalFormActionBar } from "./components/JournalFormActionBar";
import { JournalFormSummary } from "./components/JournalFormSummary";
import { JournalReasonDialog } from "./components/JournalReasonDialog";
import { JournalAttachmentsPanel } from "./components/JournalAttachmentsPanel";
import {
  createJournalPendingFiles,
  revokeJournalPendingPreviews,
  validateJournalAttachmentFiles,
} from "./journal-attachment-formdata";
import {
  buildCreatePayload,
  buildUpdatePayload,
  canCancelStatus,
  computeJournalPreview,
  emptyJournalForm,
  formatSrNo,
  isDraftEditable,
  isPartyLedgerEntity,
  JOURNAL_LIST_PATH,
  journalEditPath,
  journalViewPath,
  mapDetailToForm,
  sanitizeNonNegativeMoneyInput,
  validateJournalForm,
  type JournalFormState,
} from "./journal-voucher-utils";

export interface JournalVoucherApiFormProps {
  voucherId?: string;
  readOnly?: boolean;
  onDone?: () => void;
  onEdit?: () => void;
}

export function JournalVoucherApiForm({
  voucherId,
  readOnly: readOnlyProp = false,
  onDone,
  onEdit,
}: JournalVoucherApiFormProps) {
  const router = useRouter();
  const goToList = useCallback(() => {
    notifyVoucherListingChanged("journal");
    router.replace(JOURNAL_LIST_PATH);
  }, [router]);
  const [form, setForm] = useState<JournalFormState>(emptyJournalForm);
  const [detail, setDetail] = useState<JournalVoucherDetail | null>(null);
  const [status, setStatus] = useState<JournalVoucherStatus>("DRAFT");
  const [currentId, setCurrentId] = useState<string | undefined>(voucherId);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [configReady, setConfigReady] = useState(false);
  const [loading, setLoading] = useState(!!voucherId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ledgersLoading, setLedgersLoading] = useState(false);
  const ledgerSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [warehouses, setWarehouses] = useState<{ value: string; label: string }[]>([]);
  const [eligibleLedgers, setEligibleLedgers] = useState<JournalEligibleLedger[]>([]);
  const [approvers, setApprovers] = useState<{ value: string; label: string }[]>([]);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [approverId, setApproverId] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [postOpen, setPostOpen] = useState(false);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState("");
  const [reverseDate, setReverseDate] = useState("");

  const fieldsEditable = isDraftEditable(status) && !readOnlyProp;
  const isViewMode = readOnlyProp || !fieldsEditable;
  const showViewChrome = readOnlyProp || !fieldsEditable;

  const preview = useMemo(() => computeJournalPreview(form), [form]);
  const summaryBalanced =
    !!form.debit_ledger_id &&
    !!form.credit_ledger_id &&
    form.debit_ledger_id !== form.credit_ledger_id &&
    preview.amount > 0;

  const debitAccountLabel =
    form.debit_ledger_name ||
    form.debit_ledger_code ||
    "—";
  const creditAccountLabel =
    form.credit_ledger_name ||
    form.credit_ledger_code ||
    "—";
  const warehouseName = warehouses.find((w) => w.value === form.warehouse_id)?.label || "";

  const patch = useCallback((p: Partial<JournalFormState>) => {
    setForm((prev) => ({ ...prev, ...p }));
  }, []);

  const hydrateFromDetail = useCallback((d: JournalVoucherDetail) => {
    setForm((prev) => {
      revokeJournalPendingPreviews(prev.pendingFiles);
      return mapDetailToForm(d);
    });
    setDetail(d);
    setStatus(d.status);
    setCurrentId(d.journal_voucher_id);
  }, []);

  const pendingFilesRef = useRef(form.pendingFiles);
  pendingFilesRef.current = form.pendingFiles;
  useEffect(() => {
    return () => {
      revokeJournalPendingPreviews(pendingFilesRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await JournalVoucherService.getConfig();
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

  const loadEligibleLedgers = useCallback(async (search?: string) => {
    setLedgersLoading(true);
    try {
      const res = await JournalVoucherService.listEligibleLedgers({
        page: 1,
        page_size: 100,
        search: search?.trim() || undefined,
      });
      setEligibleLedgers(res.data ?? []);
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Failed to load eligible ledgers.",
        "error",
      );
      setEligibleLedgers([]);
    } finally {
      setLedgersLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [wh, users] = await Promise.all([
          WarehouseService.dropdown().catch(() => []),
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
        setApprovers(
          users
            .map((u) => ({
              value: u.userId,
              label: u.label || `${u.firstName} ${u.lastName}`.trim() || u.username,
            }))
            .filter((u) => u.value),
        );
      } catch {
        /* non-fatal */
      }
    })();
    void loadEligibleLedgers();
    return () => {
      cancelled = true;
    };
  }, [loadEligibleLedgers]);

  useEffect(() => {
    if (!voucherId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const d = await JournalVoucherService.getById(voucherId);
        if (!cancelled) hydrateFromDetail(d);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load Journal Voucher.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [voucherId, hydrateFromDetail]);

  const handleLedgerSearch = useCallback(
    (query: string) => {
      if (ledgerSearchTimer.current) clearTimeout(ledgerSearchTimer.current);
      ledgerSearchTimer.current = setTimeout(() => {
        void loadEligibleLedgers(query);
      }, 300);
    },
    [loadEligibleLedgers],
  );

  const ledgerById = useMemo(() => {
    const map = new Map<string, JournalEligibleLedger>();
    for (const l of eligibleLedgers) map.set(l.ledger_id, l);
    return map;
  }, [eligibleLedgers]);

  const debitOptions = useMemo(() => {
    const opts = eligibleLedgers.map((l) => ({
      value: l.ledger_id,
      label: l.ledger_name,
      sub: [l.ledger_code, l.account_sub_group?.name].filter(Boolean).join(" · "),
      disabled: !!form.credit_ledger_id && l.ledger_id === form.credit_ledger_id,
    }));
    if (
      form.debit_ledger_id &&
      !opts.some((o) => o.value === form.debit_ledger_id)
    ) {
      opts.unshift({
        value: form.debit_ledger_id,
        label: form.debit_ledger_name || "Debit Account",
        sub: form.debit_ledger_code,
        disabled: false,
      });
    }
    return opts;
  }, [
    eligibleLedgers,
    form.credit_ledger_id,
    form.debit_ledger_id,
    form.debit_ledger_name,
    form.debit_ledger_code,
  ]);

  const creditOptions = useMemo(() => {
    const opts = eligibleLedgers.map((l) => ({
      value: l.ledger_id,
      label: l.ledger_name,
      sub: [l.ledger_code, l.account_sub_group?.name].filter(Boolean).join(" · "),
      disabled: !!form.debit_ledger_id && l.ledger_id === form.debit_ledger_id,
    }));
    if (
      form.credit_ledger_id &&
      !opts.some((o) => o.value === form.credit_ledger_id)
    ) {
      opts.unshift({
        value: form.credit_ledger_id,
        label: form.credit_ledger_name || "Credit Account",
        sub: form.credit_ledger_code,
        disabled: false,
      });
    }
    return opts;
  }, [
    eligibleLedgers,
    form.debit_ledger_id,
    form.credit_ledger_id,
    form.credit_ledger_name,
    form.credit_ledger_code,
  ]);

  const showsPartyInfo =
    isPartyLedgerEntity(form.debit_source_entity_type) ||
    isPartyLedgerEntity(form.credit_source_entity_type);

  const attachmentCount = form.persistedAttachments.length + form.pendingFiles.length;

  const handleAddAttachmentFiles = (files: File[]) => {
    const err = validateJournalAttachmentFiles(files, attachmentCount);
    if (err) {
      showToast(err, "error");
      return;
    }
    const next = createJournalPendingFiles(files);
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
      if (target) revokeJournalPendingPreviews(target);
      return {
        ...prev,
        pendingFiles: prev.pendingFiles.filter((p) => p.id !== id),
      };
    });
  };

  const selectDebit = (id: string) => {
    const ledger = ledgerById.get(id);
    patch({
      debit_ledger_id: id,
      debit_ledger_name: ledger?.ledger_name || "",
      debit_ledger_code: ledger?.ledger_code || "",
      debit_source_entity_type: ledger?.source_entity_type || "",
    });
  };

  const selectCredit = (id: string) => {
    const ledger = ledgerById.get(id);
    patch({
      credit_ledger_id: id,
      credit_ledger_name: ledger?.ledger_name || "",
      credit_ledger_code: ledger?.ledger_code || "",
      credit_source_entity_type: ledger?.source_entity_type || "",
    });
  };

  const saveDraft = async (options?: {
    skipToast?: boolean;
    skipNavigate?: boolean;
  }): Promise<JournalVoucherDetail | null> => {
    const validationError = validateJournalForm(form);
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
        ? await JournalVoucherService.update(currentId, buildUpdatePayload(form), {
            pendingFiles,
            existingAttachments: form.persistedAttachments,
          })
        : await JournalVoucherService.create(buildCreatePayload(form), pendingFiles);
      hydrateFromDetail(saved);
      if (!options?.skipToast) {
        showToast(
          currentId ? "Journal draft updated." : "Journal draft created.",
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
    action: () => Promise<JournalVoucherDetail>,
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
    else if (currentId) router.push(journalViewPath(currentId));
    else router.push(JOURNAL_LIST_PATH);
  };

  const handleBack = () => {
    if (readOnlyProp && onDone) onDone();
    else router.push(JOURNAL_LIST_PATH);
  };

  const handleSaveAndPost = async () => {
    const saved = await saveDraft({ skipNavigate: true });
    if (!saved) return;
    setPostOpen(true);
  };

  const title =
    readOnlyProp || !fieldsEditable
      ? "View Journal Voucher"
      : currentId
        ? "Edit Journal Voucher"
        : "Create Journal Voucher";

  const breadcrumbPage =
    readOnlyProp || !fieldsEditable
      ? "View Journal Voucher"
      : currentId
        ? "Edit Journal Voucher"
        : "Create Journal Voucher";

  const subtitle = detail
    ? `JV No. ${formatSrNo(detail.sr_no)} · ${JOURNAL_STATUS_LABELS[status]}`
    : "One debit ledger, one credit ledger, one amount.";

  const actionBar = (
    <JournalFormActionBar
      status={status}
      busy={busy}
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
        status === "PENDING_APPROVAL" && approvalRequired && currentId
          ? () =>
              void runAction(
                () => JournalVoucherService.approve(currentId!),
                "Journal approved.",
              )
          : undefined
      }
      onReject={
        status === "PENDING_APPROVAL" && approvalRequired && currentId
          ? () => setRejectOpen(true)
          : undefined
      }
      onPost={
        fieldsEditable &&
        !readOnlyProp &&
        currentId &&
        (status === "APPROVED" || status === "DRAFT" || status === "REJECTED")
          ? () => setPostOpen(true)
          : undefined
      }
      onCancel={
        canCancelStatus(status) && currentId ? () => setCancelOpen(true) : undefined
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
          title="Journal Voucher"
          subtitle="Loading…"
          breadcrumb={accountsBreadcrumb("Vouchers", "Journal Voucher", JOURNAL_LIST_PATH)}
          backHref={JOURNAL_LIST_PATH}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading journal…
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
          breadcrumb={accountsBreadcrumb("Vouchers", breadcrumbPage, JOURNAL_LIST_PATH)}
          backHref={JOURNAL_LIST_PATH}
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
                statusLabel={JOURNAL_STATUS_LABELS[status] || status}
                metaItems={buildVoucherViewMeta({
                  draftNo: detail ? formatSrNo(detail.sr_no) : "—",
                  accountingVoucherNo: detail?.accounting_voucher?.voucher_number,
                  voucherDate: form.voucher_date,
                  branchName: warehouseName || undefined,
                })}
                partyLabel={`${debitAccountLabel} → ${creditAccountLabel}`}
                amountLabel="Journal Amount"
                amount={preview.amount}
              />
            ) : null}

        <VoucherFormSectionCard title="Voucher Details" highlight={isViewMode}>
          <div className="so-invoice-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <InvoiceDetailField label="Voucher Date" required>
              <Input
                type="date"
                className={INVOICE_DETAIL_INPUT_CLASS}
                value={form.voucher_date}
                disabled={!fieldsEditable}
                onChange={(e) => patch({ voucher_date: e.target.value })}
              />
            </InvoiceDetailField>
            <InvoiceDetailField label="Journal No.">
              <div className="so-goods-ro so-goods-ro--mono w-full text-brand-700">
                {detail ? formatSrNo(detail.sr_no) : "Auto on save"}
              </div>
            </InvoiceDetailField>
            <InvoiceDetailField label="Warehouse / Branch" required>
              <JournalSearchableSelect
                disabled={!fieldsEditable}
                value={form.warehouse_id}
                options={warehouses}
                placeholder="Select warehouse…"
                triggerClassName={INVOICE_DETAIL_SELECT_CLASS}
                onChange={(id) => patch({ warehouse_id: id })}
              />
            </InvoiceDetailField>
            <InvoiceDetailField label="Reference Number">
              <Input
                className={INVOICE_DETAIL_INPUT_CLASS}
                value={form.reference_number}
                disabled={!fieldsEditable}
                onChange={(e) => patch({ reference_number: e.target.value })}
                placeholder="Document / adjustment / audit reference"
                maxLength={150}
              />
            </InvoiceDetailField>
          </div>
        </VoucherFormSectionCard>

        <VoucherFormSectionCard title="Journal Entry" highlight={isViewMode}>
          <div className="so-invoice-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <InvoiceDetailField label="Debit Account" required>
              <VoucherLedgerSelect
                disabled={!fieldsEditable}
                value={form.debit_ledger_id}
                fallbackLabel={
                  form.debit_ledger_name
                    ? form.debit_ledger_code
                      ? `${form.debit_ledger_code} · ${form.debit_ledger_name}`
                      : form.debit_ledger_name
                    : undefined
                }
                placeholder="Select debit account…"
                className={INVOICE_DETAIL_SELECT_CLASS}
                onChange={(ledger) =>
                  patch({
                    debit_ledger_id: ledger.ledgerId,
                    debit_ledger_name: ledger.ledgerName,
                    debit_ledger_code: ledger.ledgerCode || "",
                    debit_source_entity_type: "",
                  })
                }
              />
            </InvoiceDetailField>
            <InvoiceDetailField label="Credit Account" required>
              <VoucherLedgerSelect
                disabled={!fieldsEditable}
                value={form.credit_ledger_id}
                fallbackLabel={
                  form.credit_ledger_name
                    ? form.credit_ledger_code
                      ? `${form.credit_ledger_code} · ${form.credit_ledger_name}`
                      : form.credit_ledger_name
                    : undefined
                }
                placeholder="Select credit account…"
                className={INVOICE_DETAIL_SELECT_CLASS}
                onChange={(ledger) =>
                  patch({
                    credit_ledger_id: ledger.ledgerId,
                    credit_ledger_name: ledger.ledgerName,
                    credit_ledger_code: ledger.ledgerCode || "",
                    credit_source_entity_type: "",
                  })
                }
              />
            </InvoiceDetailField>
            <InvoiceDetailField label="Amount" required>
              <Input
                className={cn(INVOICE_DETAIL_INPUT_CLASS, VOUCHER_MONEY_INPUT_CLASS, "tabular-nums")}
                value={form.amount}
                disabled={!fieldsEditable}
                onChange={(e) =>
                  patch({ amount: sanitizeNonNegativeMoneyInput(e.target.value) })
                }
                placeholder="0.00"
              />
            </InvoiceDetailField>
          </div>

          {showsPartyInfo ? (
            <div className="mt-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">
                This Journal Voucher affects the ledger balance only. It does not adjust
                invoice-wise outstanding or create a settlement.
              </p>
            </div>
          ) : null}
        </VoucherFormSectionCard>

        <div className="grid grid-cols-1 gap-2.5 items-start lg:grid-cols-[minmax(0,1fr)_300px]">
          <VoucherFormSectionCard title="Narration & Attachments" highlight={isViewMode}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="min-w-0 space-y-0.5">
                <Label className="text-xs font-medium">
                  Narration <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  className={cn(INVOICE_DETAIL_INPUT_CLASS, "so-goods-narration min-h-[60px] h-auto resize-y text-xs w-full")}
                  rows={2}
                  value={form.narration}
                  onChange={(e) => patch({ narration: e.target.value })}
                  placeholder="Enter reason for this accounting adjustment"
                  maxLength={5000}
                  disabled={!fieldsEditable}
                />
              </div>
              <JournalAttachmentsPanel
                persisted={form.persistedAttachments}
                pending={form.pendingFiles}
                readOnly={!fieldsEditable}
                onAddFiles={handleAddAttachmentFiles}
                onRemovePersisted={handleRemovePersistedAttachment}
                onRemovePending={handleRemovePendingAttachment}
              />
            </div>
          </VoucherFormSectionCard>

          <JournalFormSummary
            debitAccount={debitAccountLabel}
            creditAccount={creditAccountLabel}
            journalAmount={preview.amount}
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

      <JournalReasonDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Submit for Approval"
        description="Select an approver for this Journal Voucher."
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
                JournalVoucherService.submit(currentId, { approver_id: approverId }),
              "Submitted for approval.",
            );
          })();
        }}
      />

      <JournalReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject Journal"
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
              JournalVoucherService.reject(currentId, {
                rejection_reason: rejectReason.trim(),
              }),
            "Journal rejected.",
          );
        }}
      />

      <JournalReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Journal"
        description="Cancellation keeps the record — it does not delete it."
        reason={cancelReason}
        onReasonChange={setCancelReason}
        confirmLabel="Cancel Journal"
        destructive
        busy={busy}
        onConfirm={() => {
          if (!currentId) return;
          setCancelOpen(false);
          void runAction(
            () =>
              JournalVoucherService.cancel(currentId, {
                reason: cancelReason.trim(),
              }),
            "Journal cancelled.",
          );
        }}
      />

      <JournalReasonDialog
        open={postOpen}
        onOpenChange={setPostOpen}
        title="Post Journal Voucher"
        description="Posting creates equal Debit and Credit accounting lines through the Common Accounting Engine."
        confirmLabel="Post"
        busy={busy}
        onConfirm={() => {
          if (!currentId) return;
          setPostOpen(false);
          void (async () => {
            const posted = await runAction(
              () => JournalVoucherService.post(currentId),
              "Journal posted successfully.",
              { keepBusy: true },
            );
            if (posted?.journal_voucher_id) {
              goToList();
              return;
            }
            setBusy(false);
          })();
        }}
      />

      <JournalReasonDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        title="Reverse Journal"
        description="Reversal is owned by the backend Accounting Engine."
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
              JournalVoucherService.reverse(currentId, {
                reason: reverseReason.trim(),
                reversal_date: reverseDate || null,
              }),
            "Journal reversed.",
          );
        }}
      />
    </>
  );
}
