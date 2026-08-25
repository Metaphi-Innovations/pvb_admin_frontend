"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import {
  VOUCHER_ERROR_CLASS,
  VOUCHER_INPUT_CLASS,
  VOUCHER_MONEY_INPUT_CLASS,
  VoucherFormField,
  VoucherReadonlyValue,
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
  type ReceiptVoucherDetail,
  type ReceiptVoucherStatus,
} from "@/types/receipt-voucher.types";
import { ReceiptSearchableSelect } from "./components/ReceiptSearchableSelect";
import { ReceiptFormActionBar } from "./components/ReceiptFormActionBar";
import { ReceiptAllocationTable } from "./components/ReceiptAllocationTable";
import { ReceiptAdjustmentsEditor } from "./components/ReceiptAdjustmentsEditor";
import { ReceiptSummaryCard } from "./components/ReceiptSummaryCard";
import { ReceiptAccountingPreview } from "./components/ReceiptAccountingPreview";
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
  validateReceiptForm,
  type ReceiptFormState,
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

  const patch = useCallback((p: Partial<ReceiptFormState>) => {
    setForm((prev) => ({ ...prev, ...p }));
  }, []);

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
      if (form.receipt_treatment === "against_outstanding") {
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
      if (!currentId && !options?.skipNavigate) {
        router.replace(receiptEditPath(saved.receipt_voucher_id));
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
    action: () => Promise<ReceiptVoucherDetail>,
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
    );
    if (posted?.receipt_voucher_id) {
      router.replace(receiptViewPath(posted.receipt_voucher_id));
      return;
    }
    router.replace(receiptEditPath(saved.receipt_voucher_id));
  };

  /** Post an already-saved voucher without confirmation (approved / view flows). */
  const handlePostDirect = async () => {
    if (!currentId) return;
    const posted = await runAction(
      () => ReceiptVoucherService.post(currentId),
      "Receipt posted successfully.",
    );
    if (posted?.receipt_voucher_id) {
      router.replace(receiptViewPath(posted.receipt_voucher_id));
    }
  };

  const title =
    readOnlyProp || !fieldsEditable
      ? "View Receipt Voucher"
      : currentId
        ? "Edit Receipt Voucher"
        : "New Receipt Voucher";

  const subtitle = detail
    ? `Draft No. ${formatSrNo(detail.sr_no)} · ${RECEIPT_STATUS_LABELS[status]}`
    : "Create a receipt against customer outstanding, supplier recoverable, or other ledger.";

  if (loading) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Vouchers", "Receipt Voucher", RECEIPT_LIST_PATH)}
        title="Receipt Voucher"
        description="Loading…"
        layout="form"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading receipt…
        </div>
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Vouchers", "Receipt Voucher", RECEIPT_LIST_PATH)}
      title={title}
      description={subtitle}
      layout="form"
      onBackClick={showViewChrome ? handleBack : undefined}
      actions={
        readOnlyProp && onEdit && !fieldsEditable && isDraftEditable(status) ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onEdit}
          >
            Edit
          </Button>
        ) : null
      }
    >
      <div
        className={cn(
          "w-full space-y-3 pb-24",
          isViewMode && "receipt-voucher-view",
        )}
      >
        {error ? <div className={VOUCHER_ERROR_CLASS}>{error}</div> : null}

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
        <VoucherFormSectionCard
          title="Voucher Details"
          highlight={isViewMode}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
            <VoucherFormField label="Voucher Date" required>
              <Input
                type="date"
                className={VOUCHER_INPUT_CLASS}
                value={form.voucher_date}
                disabled={!fieldsEditable}
                onChange={(e) => patch({ voucher_date: e.target.value })}
              />
            </VoucherFormField>
            <VoucherFormField label="Draft Receipt No.">
              <VoucherReadonlyValue tone="brand" mono>
                {detail ? formatSrNo(detail.sr_no) : "Auto on save"}
              </VoucherReadonlyValue>
            </VoucherFormField>
            {detail?.accounting_voucher?.voucher_number ? (
              <VoucherFormField label="Accounting Voucher No.">
                <VoucherReadonlyValue tone="navy" mono>
                  {detail.accounting_voucher.voucher_number}
                </VoucherReadonlyValue>
              </VoucherFormField>
            ) : null}
            <ReceiptSearchableSelect
              label="Branch / Warehouse"
              required
              disabled={!fieldsEditable}
              value={form.warehouse_id}
              options={warehouses}
              placeholder="Select warehouse…"
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
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Mode of Receipt <span className="text-red-500">*</span>
              </Label>
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
                <SelectTrigger className={VOUCHER_INPUT_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BANK_TRANSACTION_MODES.map((m) => (
                    <SelectItem key={m} value={m} className="text-sm">
                      {BANK_TRANSACTION_MODE_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <VoucherFormField label="Transaction Date">
              <Input
                type="date"
                className={VOUCHER_INPUT_CLASS}
                value={form.transaction_date}
                disabled={!fieldsEditable}
                onChange={(e) => patch({ transaction_date: e.target.value })}
              />
            </VoucherFormField>
          </div>
        </VoucherFormSectionCard>

        <VoucherFormSectionCard
          title="Received In"
          helper="Cash / Bank debit side only — no reference type."
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="md:col-span-5 min-w-0">
              {form.transaction_mode === "CASH" ? (
                <ReceiptSearchableSelect
                  label="Cash Ledger"
                  required
                  disabled={!fieldsEditable}
                  value={form.cash_bank_ledger_id}
                  options={cashLedgers.length ? cashLedgers : manualLedgers}
                  placeholder="Select cash ledger…"
                  onChange={(id) => {
                    const opt = (cashLedgers.length ? cashLedgers : manualLedgers).find(
                      (o) => o.value === id,
                    );
                    patch({
                      cash_bank_ledger_id: id,
                      cash_bank_ledger_name: opt?.label || "",
                      bank_account_id: "",
                    });
                  }}
                />
              ) : (
                <ReceiptSearchableSelect
                  label="Cash / Bank Account"
                  required
                  disabled={!fieldsEditable || !form.warehouse_id}
                  value={form.bank_account_id}
                  options={bankOptions}
                  placeholder={
                    form.warehouse_id
                      ? "Select bank account…"
                      : "Select warehouse first…"
                  }
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
            </div>

            {form.transaction_mode === "CHEQUE" ? (
              <>
                <div className="md:col-span-3 min-w-0">
                  <VoucherFormField label="Cheque Number" required>
                    <Input
                      className={VOUCHER_INPUT_CLASS}
                      value={form.cheque_number}
                      disabled={!fieldsEditable}
                      onChange={(e) => patch({ cheque_number: e.target.value })}
                    />
                  </VoucherFormField>
                </div>
                <div className="md:col-span-2 min-w-0">
                  <VoucherFormField label="Cheque Date" required>
                    <Input
                      type="date"
                      className={VOUCHER_INPUT_CLASS}
                      value={form.cheque_date}
                      disabled={!fieldsEditable}
                      onChange={(e) => patch({ cheque_date: e.target.value })}
                    />
                  </VoucherFormField>
                </div>
              </>
            ) : null}

            {form.transaction_mode !== "CASH" && form.transaction_mode !== "CHEQUE" ? (
              <>
                <div className="md:col-span-3 min-w-0">
                  <VoucherFormField label="UTR Number">
                    <Input
                      className={VOUCHER_INPUT_CLASS}
                      value={form.utr_number}
                      disabled={!fieldsEditable}
                      onChange={(e) => patch({ utr_number: e.target.value })}
                      placeholder="UTR…"
                    />
                  </VoucherFormField>
                </div>
                <div className="md:col-span-4 min-w-0">
                  <VoucherFormField label="Transaction Reference">
                    <Input
                      className={VOUCHER_INPUT_CLASS}
                      value={form.transaction_reference}
                      disabled={!fieldsEditable}
                      onChange={(e) => patch({ transaction_reference: e.target.value })}
                      placeholder="Reference…"
                    />
                  </VoucherFormField>
                </div>
              </>
            ) : null}
          </div>
        </VoucherFormSectionCard>

        {/* C. Received From */}
        <VoucherFormSectionCard title="Received From">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="md:col-span-3 min-w-0 space-y-1">
              <Label className="text-xs font-medium">
                Received From Type <span className="text-red-500">*</span>
              </Label>
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
                <SelectTrigger className={VOUCHER_INPUT_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RECEIPT_PARTY_KIND_LABELS) as ReceiptPartyKind[]).map(
                    (k) => (
                      <SelectItem key={k} value={k} className="text-sm">
                        {RECEIPT_PARTY_KIND_LABELS[k]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {form.party_kind === "CUSTOMER" ? (
              <div className="md:col-span-5 min-w-0">
                <ReceiptSearchableSelect
                  label="Customer"
                  required
                  disabled={!fieldsEditable}
                  value={form.customer_id}
                  options={customers}
                  placeholder="Select customer…"
                  onChange={(id) => patch({ customer_id: id, allocations: [] })}
                />
              </div>
            ) : null}

            {form.party_kind === "SUPPLIER_REFUND" ? (
              <div className="md:col-span-5 min-w-0">
                <ReceiptSearchableSelect
                  label="Supplier"
                  required
                  disabled={!fieldsEditable}
                  value={form.supplier_id}
                  options={suppliers}
                  placeholder="Select supplier…"
                  onChange={(id) => patch({ supplier_id: id, allocations: [] })}
                />
              </div>
            ) : null}

            {form.party_kind === "OTHER_LEDGER" ? (
              <div className="md:col-span-5 min-w-0">
                <ReceiptSearchableSelect
                  label="Other Ledger"
                  required
                  disabled={!fieldsEditable}
                  value={form.other_ledger_id}
                  options={manualLedgers}
                  placeholder="Select ledger…"
                  onChange={(id) => {
                    const opt = manualLedgers.find((o) => o.value === id);
                    patch({
                      other_ledger_id: id,
                      other_ledger_name: opt?.label || "",
                      allocations: [],
                    });
                  }}
                />
              </div>
            ) : null}

            <div className="md:col-span-2 min-w-0">
              {form.party_kind !== "OTHER_LEDGER" ? (
                <VoucherFormField
                  label={
                    form.party_kind === "CUSTOMER"
                      ? "Gross Settlement Amount"
                      : "Gross Refund Amount"
                  }
                >
                  <Input
                    className={cn(
                      VOUCHER_INPUT_CLASS,
                      VOUCHER_MONEY_INPUT_CLASS,
                      "w-[160px] max-w-full",
                    )}
                    value={form.gross_party_amount}
                    disabled={!fieldsEditable}
                    onChange={(e) => patch({ gross_party_amount: e.target.value })}
                    placeholder="0.00"
                  />
                </VoucherFormField>
              ) : (
                <VoucherFormField label="Gross Receipt Amount" required>
                  <Input
                    className={cn(
                      VOUCHER_INPUT_CLASS,
                      VOUCHER_MONEY_INPUT_CLASS,
                      "w-[160px] max-w-full",
                    )}
                    value={form.gross_party_amount}
                    disabled={!fieldsEditable}
                    onChange={(e) => patch({ gross_party_amount: e.target.value })}
                    placeholder="0.00"
                  />
                </VoucherFormField>
              )}
            </div>

            {form.party_kind === "CUSTOMER" ? (
              <div className="md:col-span-2 min-w-0 space-y-1">
                <Label className="text-xs font-medium">Receipt Treatment</Label>
                <Select
                  value={form.receipt_treatment}
                  disabled={!fieldsEditable}
                  onValueChange={(v) =>
                    patch({
                      receipt_treatment: v as ReceiptFormState["receipt_treatment"],
                      allocations:
                        v === "advance_on_account" ? form.allocations.map((a) => ({
                          ...a,
                          selected: false,
                          allocated_amount: "",
                        })) : form.allocations,
                    })
                  }
                >
                  <SelectTrigger className={VOUCHER_INPUT_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="against_outstanding" className="text-sm">
                      Against Outstanding
                    </SelectItem>
                    <SelectItem value="advance_on_account" className="text-sm">
                      Advance / On Account
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          {form.party_kind === "CUSTOMER" &&
          form.receipt_treatment === "against_outstanding" ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">
                  Outstanding Allocations
                </p>
                {outstandingLoading ? (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                  </span>
                ) : null}
              </div>
              <ReceiptAllocationTable
                rows={form.allocations}
                readOnly={!fieldsEditable}
                emptyMessage={
                  form.customer_id
                    ? "No outstanding open items for this customer."
                    : "Select a customer to load outstanding items."
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
              <p className="text-[11px] text-muted-foreground">
                Total allocated {preview.totalAllocated.toFixed(2)} · Remaining / Advance{" "}
                {preview.advance.toFixed(2)}
              </p>
            </div>
          ) : null}

          {form.party_kind === "CUSTOMER" &&
          form.receipt_treatment === "advance_on_account" ? (
            <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2">
              <p className="text-xs text-brand-800">
                Full amount will be posted as Customer Advance / On Account
                {preview.gross > 0 ? ` (${preview.gross.toFixed(2)})` : ""}.
              </p>
            </div>
          ) : null}

          {form.party_kind === "SUPPLIER_REFUND" ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">
                  Eligible Recoverable Items
                </p>
                {outstandingLoading ? (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                  </span>
                ) : null}
              </div>
              <ReceiptAllocationTable
                rows={form.allocations}
                readOnly={!fieldsEditable}
                emptyMessage={
                  form.supplier_id
                    ? "No eligible recoverable balance available for this supplier."
                    : "Select a supplier to load recoverable items."
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

        <VoucherFormSectionCard title="Adjustments">
          <ReceiptAdjustmentsEditor
            rows={form.adjustments}
            ledgerOptions={manualLedgers}
            readOnly={!fieldsEditable}
            onChange={(rows) => patch({ adjustments: rows })}
          />
          {(preview.totalTds > 0 || preview.totalDiscount > 0) && (
            <div className="mt-2 text-[11px] text-muted-foreground space-y-0.5">
              <p>
                Allocation TDS total: {preview.totalTds.toFixed(2)} (must match Customer
                TDS adjustment)
              </p>
              <p>
                Allocation Discount total: {preview.totalDiscount.toFixed(2)} (must match
                Discount Allowed adjustment)
              </p>
            </div>
          )}
        </VoucherFormSectionCard>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,360px)_1fr] gap-3 items-start">
          <ReceiptSummaryCard
            gross={preview.gross}
            adjDebit={preview.adjDebit}
            adjCredit={preview.adjCredit}
            netBank={preview.netBank}
            totalAllocated={preview.totalAllocated}
            advance={preview.advance}
            partyKind={form.party_kind}
            vibrant={isViewMode}
          />
          <ReceiptAccountingPreview
            form={form}
            partyLedgerName={partyName}
            defaultOpen={isViewMode}
            vibrant={isViewMode}
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

        <VoucherFormSectionCard title="Narration and Attachments">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="min-w-0 space-y-0.5">
              <Label className="text-xs font-medium">Narration</Label>
              <Textarea
                className="resize-y rounded-lg border border-border min-h-[60px] max-h-36 h-[60px] py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400"
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
      </div>

      {/* Sticky action bar: edit + view lifecycle actions */}
      {(!showViewChrome || status === "POSTED") ? (
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-white/95 backdrop-blur px-4 py-2.5">
          <div className="w-full">
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
          </div>
        </div>
      ) : null}

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
    </AccountsPageShell>
  );
}
