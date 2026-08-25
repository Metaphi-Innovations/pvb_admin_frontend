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
  type PaymentVoucherDetail,
  type PaymentVoucherStatus,
} from "@/types/payment-voucher.types";
import { PaymentSearchableSelect } from "./components/PaymentSearchableSelect";
import { PaymentFormActionBar } from "./components/PaymentFormActionBar";
import { PaymentAllocationTable } from "./components/PaymentAllocationTable";
import { PaymentAdjustmentsEditor } from "./components/PaymentAdjustmentsEditor";
import { PaymentSummaryCard } from "./components/PaymentSummaryCard";
import { PaymentAccountingPreview } from "./components/PaymentAccountingPreview";
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
  validatePaymentForm,
  type PaymentFormState,
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
  const { selectedFY } = useFY();
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
  const isPostedView = status === "POSTED" && !readOnlyProp;
  const showViewChrome = readOnlyProp || isPostedView;
  const preview = useMemo(() => computePaymentPreview(form), [form]);

  const patch = useCallback((p: Partial<PaymentFormState>) => {
    setForm((prev) => ({ ...prev, ...p }));
  }, []);

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
      if (form.payment_treatment === "against_outstanding") {
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
    if (form.party_kind === "SUPPLIER") {
      return suppliers.find((s) => s.value === form.supplier_id)?.label || "";
    }
    if (form.party_kind === "CUSTOMER_REFUND") {
      return customers.find((c) => c.value === form.customer_id)?.label || "";
    }
    return form.other_ledger_name;
  }, [form, customers, suppliers]);

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
      if (!currentId && !options?.skipNavigate) {
        router.replace(paymentEditPath(saved.payment_voucher_id));
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
    action: () => Promise<PaymentVoucherDetail>,
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
    );
    if (posted?.payment_voucher_id) {
      router.replace(paymentViewPath(posted.payment_voucher_id));
      return;
    }
    router.replace(paymentEditPath(saved.payment_voucher_id));
  };

  /** Post an already-saved voucher without confirmation (approved flows). */
  const handlePostDirect = async () => {
    if (!currentId) return;
    const posted = await runAction(
      () => PaymentVoucherService.post(currentId),
      "Payment posted successfully.",
    );
    if (posted?.payment_voucher_id) {
      router.replace(paymentViewPath(posted.payment_voucher_id));
    }
  };

  const title =
    readOnlyProp || !fieldsEditable
      ? "View Payment Voucher"
      : currentId
        ? "Edit Payment Voucher"
        : "New Payment Voucher";

  const subtitle = detail
    ? `Draft No. ${formatSrNo(detail.sr_no)} · ${PAYMENT_STATUS_LABELS[status]}`
    : "Create a payment to a supplier, customer refund, or other ledger.";

  if (loading) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Vouchers", "Payment Voucher", PAYMENT_LIST_PATH)}
        title="Payment Voucher"
        description="Loading…"
        layout="form"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading payment…
        </div>
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Vouchers", "Payment Voucher", PAYMENT_LIST_PATH)}
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
      <div className="w-full space-y-3 pb-24">
        {error ? <div className={VOUCHER_ERROR_CLASS}>{error}</div> : null}

        <VoucherFormSectionCard title="Voucher Details">
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
            <VoucherFormField label="Financial Year">
              <p className="h-8 flex items-center text-xs font-medium">
                {selectedFY?.label || "—"}
              </p>
            </VoucherFormField>
            <VoucherFormField label="Draft Payment No.">
              <p className="h-8 flex items-center text-xs font-mono font-semibold text-brand-700">
                {detail ? formatSrNo(detail.sr_no) : "Auto on save"}
              </p>
            </VoucherFormField>
            {detail?.accounting_voucher?.voucher_number ? (
              <VoucherFormField label="Accounting Voucher No.">
                <p className="h-8 flex items-center text-xs font-mono font-semibold text-navy-700">
                  {detail.accounting_voucher.voucher_number}
                </p>
              </VoucherFormField>
            ) : null}
            <PaymentSearchableSelect
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
                  cash_bank_ledger_id:
                    form.transaction_mode === "CASH" ? form.cash_bank_ledger_id : "",
                  cash_bank_ledger_name:
                    form.transaction_mode === "CASH" ? form.cash_bank_ledger_name : "",
                })
              }
            />
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Mode of Payment <span className="text-red-500">*</span>
              </Label>
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
                <SelectTrigger className={VOUCHER_INPUT_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_BANK_TRANSACTION_MODES.map((m) => (
                    <SelectItem key={m} value={m} className="text-sm">
                      {PAYMENT_BANK_TRANSACTION_MODE_LABELS[m]}
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
          title="Paid From"
          helper="Select Cash or a configured Bank Account. The selected account is submitted with the voucher."
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="md:col-span-5 min-w-0">
              {form.transaction_mode === "CASH" ? (
                <PaymentSearchableSelect
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
                <PaymentSearchableSelect
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

        <VoucherFormSectionCard title="Paid To">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="md:col-span-3 min-w-0 space-y-1">
              <Label className="text-xs font-medium">
                Paid To Type <span className="text-red-500">*</span>
              </Label>
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
                <SelectTrigger className={VOUCHER_INPUT_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAYMENT_PARTY_KIND_LABELS) as PaymentPartyKind[]).map(
                    (k) => (
                      <SelectItem key={k} value={k} className="text-sm">
                        {PAYMENT_PARTY_KIND_LABELS[k]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {form.party_kind === "SUPPLIER" ? (
              <div className="md:col-span-5 min-w-0">
                <PaymentSearchableSelect
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

            {form.party_kind === "CUSTOMER_REFUND" ? (
              <div className="md:col-span-5 min-w-0">
                <PaymentSearchableSelect
                  label="Customer"
                  required
                  disabled={!fieldsEditable}
                  value={form.customer_id}
                  options={customers}
                  placeholder="Select customer…"
                  onChange={(id) =>
                    patch({
                      customer_id: id,
                      allocations: [],
                      other_ledger_id: "",
                      other_ledger_name: "",
                    })
                  }
                />
              </div>
            ) : null}

            {form.party_kind === "OTHER_LEDGER" ? (
              <div className="md:col-span-5 min-w-0">
                <PaymentSearchableSelect
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
              <VoucherFormField
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
                  className={cn(
                    VOUCHER_INPUT_CLASS,
                    VOUCHER_MONEY_INPUT_CLASS,
                    "w-[160px] max-w-full",
                  )}
                  value={form.gross_party_amount}
                  disabled={!fieldsEditable}
                  onChange={(e) =>
                    patch({
                      gross_party_amount: sanitizeNonNegativeMoneyInput(e.target.value),
                    })
                  }
                  placeholder="0.00"
                />
              </VoucherFormField>
            </div>

            {form.party_kind === "SUPPLIER" ? (
              <div className="md:col-span-2 min-w-0 space-y-1">
                <Label className="text-xs font-medium">Payment Treatment</Label>
                <Select
                  value={form.payment_treatment}
                  disabled={!fieldsEditable}
                  onValueChange={(v) =>
                    patch({
                      payment_treatment: v as PaymentFormState["payment_treatment"],
                      allocations:
                        v === "advance_on_account"
                          ? form.allocations.map((a) => ({
                              ...a,
                              selected: false,
                              allocated_amount: "",
                              tds_amount: "0",
                              discount_amount: "0",
                            }))
                          : form.allocations,
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

          {form.party_kind === "CUSTOMER_REFUND" && isDirectCustomerRefund ? (
            <div className="mt-3 md:max-w-md">
              <PaymentSearchableSelect
                label="Refund / Adjustment Ledger"
                required
                disabled={!fieldsEditable}
                value={form.other_ledger_id}
                options={manualLedgers}
                placeholder="Select refund / adjustment ledger…"
                onChange={(id) => {
                  const opt = manualLedgers.find((o) => o.value === id);
                  patch({
                    other_ledger_id: id,
                    other_ledger_name: opt?.label || "",
                  });
                }}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Direct refund without an existing credit open item. No fake Customer Advance
                is created.
              </p>
            </div>
          ) : null}

          {form.party_kind === "SUPPLIER" &&
          form.payment_treatment === "against_outstanding" ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">
                  Supplier Outstanding Allocations
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
                showTdsDiscount
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
                Gross settlement {preview.gross.toFixed(2)} · Allocated{" "}
                {preview.totalAllocated.toFixed(2)} · Supplier Advance {preview.advance.toFixed(2)}{" "}
                · Net paid {preview.netBank.toFixed(2)}
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
                showTdsDiscount={false}
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

        <VoucherFormSectionCard title="Adjustments">
          <PaymentAdjustmentsEditor
            rows={form.adjustments}
            ledgerOptions={manualLedgers}
            readOnly={!fieldsEditable}
            onChange={(rows) => patch({ adjustments: rows })}
          />
          {(preview.totalTds > 0 || preview.totalDiscount > 0) && (
            <div className="mt-2 text-[11px] text-muted-foreground space-y-0.5">
              <p>
                Allocation TDS total: {preview.totalTds.toFixed(2)} (must match Supplier TDS
                adjustment)
              </p>
              <p>
                Allocation Discount total: {preview.totalDiscount.toFixed(2)} (must match
                Discount Received adjustment; select a ledger)
              </p>
            </div>
          )}
        </VoucherFormSectionCard>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,360px)_1fr] gap-3 items-start">
          <PaymentSummaryCard
            gross={preview.gross}
            totalAllocated={preview.totalAllocated}
            advance={preview.advance}
            tds={preview.adjTds}
            discount={preview.adjDiscount}
            otherDebit={preview.otherDebit}
            otherCredit={preview.otherCredit}
            roundOff={preview.roundOff}
            netBank={preview.netBank}
            partyKind={form.party_kind}
          />
          <PaymentAccountingPreview form={form} partyLedgerName={partyName} />
        </div>

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
      </div>

      {(!showViewChrome || status === "POSTED") ? (
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-white/95 backdrop-blur px-4 py-2.5">
        <div className="w-full">
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
              !readOnlyProp && currentId
                ? status === "APPROVED"
                  ? () => void handlePostDirect()
                  : !approvalRequired &&
                      (status === "DRAFT" || status === "REJECTED" || !status) &&
                      fieldsEditable
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
        </div>
      </div>
      ) : null}

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
    </AccountsPageShell>
  );
}
