"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import {
  VOUCHER_ERROR_CLASS,
  VOUCHER_INPUT_CLASS,
  VOUCHER_MONEY_INPUT_CLASS,
  VoucherFormField,
} from "@/components/accounts/voucher-simple-form-ui";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/lib/toast";
import { useFY } from "@/lib/fy-store";
import { JournalVoucherService } from "@/services/journal-voucher.service";
import { WarehouseService } from "@/services/warehouse.service";
import { UserListService } from "@/services/user-list.service";
import {
  JOURNAL_STATUS_LABELS,
  type JournalEligibleLedger,
  type JournalVoucherDetail,
  type JournalVoucherStatus,
} from "@/types/journal-voucher.types";
import { JournalSearchableSelect } from "./components/JournalSearchableSelect";
import { JournalFormActionBar } from "./components/JournalFormActionBar";
import { JournalAccountingPreview } from "./components/JournalAccountingPreview";
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
  const { selectedFY } = useFY();
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

  const saveDraft = async (): Promise<JournalVoucherDetail | null> => {
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
      showToast(
        currentId ? "Journal draft updated." : "Journal draft created.",
        "success",
      );
      if (!currentId) {
        router.replace(journalEditPath(saved.journal_voucher_id));
      }
      return saved;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save draft.";
      setError(msg);
      showToast(msg, "error");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (
    action: () => Promise<JournalVoucherDetail>,
    successMsg: string,
  ) => {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      hydrateFromDetail(result);
      showToast(successMsg, "success");
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Action failed.";
      setError(msg);
      showToast(msg, "error");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleDiscard = () => {
    if (onDone) onDone();
    else if (currentId) router.push(journalViewPath(currentId));
    else router.push(JOURNAL_LIST_PATH);
  };

  const handleSaveAndPost = async () => {
    const saved = await saveDraft();
    if (!saved) return;
    setPostOpen(true);
  };

  const title =
    readOnlyProp || !fieldsEditable
      ? "View Journal Voucher"
      : currentId
        ? "Edit Journal Voucher"
        : "New Journal Voucher";

  const subtitle = detail
    ? `JV No. ${formatSrNo(detail.sr_no)} · ${JOURNAL_STATUS_LABELS[status]}`
    : "One debit ledger, one credit ledger, one amount.";

  if (loading) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Vouchers", "Journal Voucher", JOURNAL_LIST_PATH)}
        title="Journal Voucher"
        description="Loading…"
        layout="form"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading journal…
        </div>
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Vouchers", "Journal Voucher", JOURNAL_LIST_PATH)}
      title={title}
      description={subtitle}
      layout="form"
      actions={
        readOnlyProp && onEdit && !fieldsEditable && isDraftEditable(status) ? (
          <button
            type="button"
            className="h-8 px-3 text-xs rounded-lg border border-border hover:bg-muted"
            onClick={onEdit}
          >
            Edit
          </button>
        ) : null
      }
    >
      <div className="w-full space-y-3 pb-24">
        {error ? <div className={VOUCHER_ERROR_CLASS}>{error}</div> : null}

        <VoucherFormSectionCard title="Voucher Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <VoucherFormField label="Voucher Date" required>
              <Input
                type="date"
                className={VOUCHER_INPUT_CLASS}
                value={form.voucher_date}
                disabled={!fieldsEditable}
                onChange={(e) => patch({ voucher_date: e.target.value })}
              />
            </VoucherFormField>
            <VoucherFormField label="Journal No.">
              <p className="h-8 flex items-center text-xs font-mono font-semibold text-brand-700">
                {detail ? formatSrNo(detail.sr_no) : "Auto on save"}
              </p>
            </VoucherFormField>
            <div className="min-w-0 space-y-1">
              <JournalSearchableSelect
                label="Warehouse / Branch"
                required
                disabled={!fieldsEditable}
                value={form.warehouse_id}
                options={warehouses}
                placeholder="Select warehouse…"
                onChange={(id) => patch({ warehouse_id: id })}
              />
              <p className="text-[11px] text-muted-foreground">
                Select the branch for this accounting adjustment
              </p>
            </div>
            <VoucherFormField label="Reference Number">
              <Input
                className={VOUCHER_INPUT_CLASS}
                value={form.reference_number}
                disabled={!fieldsEditable}
                onChange={(e) => patch({ reference_number: e.target.value })}
                placeholder="Document / adjustment / audit reference"
                maxLength={150}
              />
            </VoucherFormField>
          </div>
          {selectedFY?.label ? (
            <p className="text-[11px] text-muted-foreground mt-2">
              Working FY: <span className="font-medium text-foreground">{selectedFY.label}</span>
            </p>
          ) : null}
        </VoucherFormSectionCard>

        <VoucherFormSectionCard title="Journal Entry">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="md:col-span-5 min-w-0">
              <JournalSearchableSelect
                label="Debit Account"
                required
                disabled={!fieldsEditable}
                value={form.debit_ledger_id}
                options={debitOptions}
                placeholder={ledgersLoading ? "Loading ledgers…" : "Select debit account…"}
                onChange={selectDebit}
                onSearchChange={handleLedgerSearch}
              />
            </div>
            <div className="md:col-span-5 min-w-0">
              <JournalSearchableSelect
                label="Credit Account"
                required
                disabled={!fieldsEditable}
                value={form.credit_ledger_id}
                options={creditOptions}
                placeholder={ledgersLoading ? "Loading ledgers…" : "Select credit account…"}
                onChange={selectCredit}
                onSearchChange={handleLedgerSearch}
              />
            </div>
            <div className="md:col-span-2 min-w-0">
              <VoucherFormField label="Amount" required>
                <Input
                  className={cn(
                    VOUCHER_INPUT_CLASS,
                    VOUCHER_MONEY_INPUT_CLASS,
                    "w-full max-w-[160px]",
                  )}
                  value={form.amount}
                  disabled={!fieldsEditable}
                  onChange={(e) =>
                    patch({ amount: sanitizeNonNegativeMoneyInput(e.target.value) })
                  }
                  placeholder="0.00"
                />
              </VoucherFormField>
            </div>
          </div>

          {showsPartyInfo ? (
            <div className="mt-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">
                This Journal Voucher affects the ledger balance only. It does not adjust
                invoice-wise outstanding or create a settlement.
              </p>
            </div>
          ) : null}
        </VoucherFormSectionCard>

        <VoucherFormSectionCard title="Supporting Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="min-w-0 space-y-0.5">
              <Label className="text-xs font-medium">
                Narration <span className="text-red-500">*</span>
              </Label>
              <Textarea
                className="resize-y rounded-lg border border-border min-h-[80px] max-h-40 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400"
                rows={3}
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

        <JournalAccountingPreview form={form} />

        {detail?.accounting_voucher ? (
          <VoucherFormSectionCard title="Posted Accounting Voucher">
            <div className="text-xs space-y-1">
              <p>
                <span className="text-muted-foreground">Voucher No.: </span>
                <span className="font-mono font-semibold text-brand-700">
                  {detail.accounting_voucher.voucher_number || "—"}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Status: </span>
                {detail.accounting_voucher.status || "—"}
              </p>
            </div>
          </VoucherFormSectionCard>
        ) : null}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-white/95 backdrop-blur px-4 py-2.5">
        <div className="w-full">
          <JournalFormActionBar
            status={status}
            busy={busy}
            canCancel={canCancelStatus(status) && !!currentId}
            approvalRequired={approvalRequired}
            configReady={configReady}
            hasExistingId={!!currentId}
            onDiscard={handleDiscard}
            onSaveDraft={
              fieldsEditable && !readOnlyProp ? () => void saveDraft() : undefined
            }
            onSubmitForApproval={
              fieldsEditable && !readOnlyProp && approvalRequired
                ? () => setSubmitOpen(true)
                : undefined
            }
            onSaveAndPost={
              fieldsEditable && !readOnlyProp && !approvalRequired
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
              currentId &&
              (status === "APPROVED" || (status === "DRAFT" && !approvalRequired))
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
        </div>
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
          void runAction(
            () => JournalVoucherService.post(currentId),
            "Journal posted successfully.",
          );
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
    </AccountsPageShell>
  );
}
