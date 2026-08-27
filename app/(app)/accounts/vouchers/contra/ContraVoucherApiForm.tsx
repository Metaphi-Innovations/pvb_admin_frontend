"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { InvoiceFormLayout } from "@/app/(app)/accounts/components/InvoiceFormLayout";
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
import { ContraVoucherService } from "@/services/contra-voucher.service";
import { WarehouseService } from "@/services/warehouse.service";
import { UserListService } from "@/services/user-list.service";
import {
  CONTRA_ACCOUNT_TYPE_LABELS,
  CONTRA_ACCOUNT_TYPES,
  CONTRA_BANK_TRANSACTION_MODE_LABELS,
  CONTRA_BANK_TRANSACTION_MODES,
  CONTRA_STATUS_LABELS,
  type ContraAccountType,
  type ContraBankTransactionMode,
  type ContraEligibleAccount,
  type ContraVoucherDetail,
  type ContraVoucherStatus,
} from "@/types/contra-voucher.types";
import { ContraSearchableSelect } from "./components/ContraSearchableSelect";
import { ContraFormActionBar } from "./components/ContraFormActionBar";
import { ContraReasonDialog } from "./components/ContraReasonDialog";
import { ContraAttachmentsPanel } from "./components/ContraAttachmentsPanel";
import {
  createContraPendingFiles,
  revokeContraPendingPreviews,
  validateContraAttachmentFiles,
} from "./contra-attachment-formdata";
import {
  buildCreatePayload,
  buildUpdatePayload,
  canCancelStatus,
  clearFromAccountFields,
  clearToAccountFields,
  CONTRA_LIST_PATH,
  CROSS_WAREHOUSE_CASH_MESSAGE,
  contraEditPath,
  contraViewPath,
  emptyContraForm,
  formatEligibleBankLabel,
  formatEligibleBankSub,
  formatEligibleCashLabel,
  formatEligibleCashSub,
  formatSrNo,
  hasBankSide,
  isBankEligible,
  isCashEligible,
  isCrossWarehouseCashBlocked,
  isDraftEditable,
  mapDetailToForm,
  sanitizeNonNegativeMoneyInput,
  validateContraForm,
  type ContraFormState,
} from "./contra-voucher-utils";

export interface ContraVoucherApiFormProps {
  voucherId?: string;
  readOnly?: boolean;
  onDone?: () => void;
  onEdit?: () => void;
}

export function ContraVoucherApiForm({
  voucherId,
  readOnly: readOnlyProp = false,
  onDone,
  onEdit,
}: ContraVoucherApiFormProps) {
  const router = useRouter();
  const { selectedFY } = useFY();
  const [form, setForm] = useState<ContraFormState>(emptyContraForm);
  const [detail, setDetail] = useState<ContraVoucherDetail | null>(null);
  const [status, setStatus] = useState<ContraVoucherStatus>("DRAFT");
  const [currentId, setCurrentId] = useState<string | undefined>(voucherId);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [configReady, setConfigReady] = useState(false);
  const [loading, setLoading] = useState(!!voucherId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromAccountsLoading, setFromAccountsLoading] = useState(false);
  const [toAccountsLoading, setToAccountsLoading] = useState(false);
  const fromSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [warehouses, setWarehouses] = useState<{ value: string; label: string }[]>([]);
  const [fromEligible, setFromEligible] = useState<ContraEligibleAccount[]>([]);
  const [toEligible, setToEligible] = useState<ContraEligibleAccount[]>([]);
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
  const bankSide = hasBankSide(form);
  const crossCashBlocked = isCrossWarehouseCashBlocked(form);

  const patch = useCallback((p: Partial<ContraFormState>) => {
    setForm((prev) => ({ ...prev, ...p }));
  }, []);

  const hydrateFromDetail = useCallback((d: ContraVoucherDetail) => {
    setForm((prev) => {
      revokeContraPendingPreviews(prev.pendingFiles);
      return mapDetailToForm(d);
    });
    setDetail(d);
    setStatus(d.status);
    setCurrentId(d.contra_voucher_id);
  }, []);

  const pendingFilesRef = useRef(form.pendingFiles);
  pendingFilesRef.current = form.pendingFiles;
  useEffect(() => {
    return () => {
      revokeContraPendingPreviews(pendingFilesRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await ContraVoucherService.getConfig();
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

  const loadEligible = useCallback(
    async (
      side: "from" | "to",
      warehouseId: string,
      accountType: ContraAccountType,
      search?: string,
    ) => {
      if (!warehouseId) {
        if (side === "from") setFromEligible([]);
        else setToEligible([]);
        return;
      }
      if (side === "from") setFromAccountsLoading(true);
      else setToAccountsLoading(true);
      try {
        const res = await ContraVoucherService.listEligibleAccounts({
          warehouse_id: warehouseId,
          account_type: accountType,
          page: 1,
          page_size: 100,
          search: search?.trim() || undefined,
        });
        if (side === "from") setFromEligible(res.data ?? []);
        else setToEligible(res.data ?? []);
      } catch (e) {
        showToast(
          e instanceof Error ? e.message : "Failed to load eligible accounts.",
          "error",
        );
        if (side === "from") setFromEligible([]);
        else setToEligible([]);
      } finally {
        if (side === "from") setFromAccountsLoading(false);
        else setToAccountsLoading(false);
      }
    },
    [],
  );

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
          wh
            .map((w) => ({
              value: w.warehouse_id,
              label: w.warehouse_name,
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
        const d = await ContraVoucherService.getById(voucherId);
        if (!cancelled) hydrateFromDetail(d);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load Contra Voucher.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [voucherId, hydrateFromDetail]);

  useEffect(() => {
    if (!form.from_warehouse_id) {
      setFromEligible([]);
      return;
    }
    void loadEligible("from", form.from_warehouse_id, form.from_account_type);
  }, [form.from_warehouse_id, form.from_account_type, loadEligible]);

  useEffect(() => {
    if (!form.to_warehouse_id) {
      setToEligible([]);
      return;
    }
    void loadEligible("to", form.to_warehouse_id, form.to_account_type);
  }, [form.to_warehouse_id, form.to_account_type, loadEligible]);

  useEffect(() => {
    if (!bankSide && form.transaction_mode !== "CASH") {
      patch({ transaction_mode: "CASH" });
    }
    if (bankSide && form.transaction_mode === "CASH") {
      patch({ transaction_mode: "BANK_TRANSFER" });
    }
  }, [bankSide, form.transaction_mode, patch]);

  const handleFromAccountSearch = useCallback(
    (query: string) => {
      if (fromSearchTimer.current) clearTimeout(fromSearchTimer.current);
      fromSearchTimer.current = setTimeout(() => {
        void loadEligible(
          "from",
          form.from_warehouse_id,
          form.from_account_type,
          query,
        );
      }, 300);
    },
    [loadEligible, form.from_warehouse_id, form.from_account_type],
  );

  const handleToAccountSearch = useCallback(
    (query: string) => {
      if (toSearchTimer.current) clearTimeout(toSearchTimer.current);
      toSearchTimer.current = setTimeout(() => {
        void loadEligible(
          "to",
          form.to_warehouse_id,
          form.to_account_type,
          query,
        );
      }, 300);
    },
    [loadEligible, form.to_warehouse_id, form.to_account_type],
  );

  const fromAccountOptions = useMemo(() => {
    if (form.from_account_type === "CASH") {
      const opts = fromEligible.filter(isCashEligible).map((a) => ({
        value: a.cash_ledger_id,
        label: formatEligibleCashLabel(a),
        sub: formatEligibleCashSub(a),
        disabled:
          form.to_account_type === "CASH" &&
          !!form.to_cash_ledger_id &&
          a.cash_ledger_id === form.to_cash_ledger_id,
      }));
      if (
        form.from_cash_ledger_id &&
        !opts.some((o) => o.value === form.from_cash_ledger_id)
      ) {
        opts.unshift({
          value: form.from_cash_ledger_id,
          label: form.from_cash_ledger_name || "Cash",
          sub: form.from_cash_ledger_code,
          disabled: false,
        });
      }
      return opts;
    }
    const opts = fromEligible.filter(isBankEligible).map((a) => ({
      value: a.bank_account_id,
      label: formatEligibleBankLabel(a),
      sub: formatEligibleBankSub(a),
      disabled:
        form.to_account_type === "BANK" &&
        !!form.to_bank_account_id &&
        a.bank_account_id === form.to_bank_account_id,
    }));
    if (
      form.from_bank_account_id &&
      !opts.some((o) => o.value === form.from_bank_account_id)
    ) {
      opts.unshift({
        value: form.from_bank_account_id,
        label: form.from_bank_account_name || "Bank",
        sub: "",
        disabled: false,
      });
    }
    return opts;
  }, [form, fromEligible]);

  const toAccountOptions = useMemo(() => {
    if (form.to_account_type === "CASH") {
      const opts = toEligible.filter(isCashEligible).map((a) => ({
        value: a.cash_ledger_id,
        label: formatEligibleCashLabel(a),
        sub: formatEligibleCashSub(a),
        disabled:
          form.from_account_type === "CASH" &&
          !!form.from_cash_ledger_id &&
          a.cash_ledger_id === form.from_cash_ledger_id,
      }));
      if (
        form.to_cash_ledger_id &&
        !opts.some((o) => o.value === form.to_cash_ledger_id)
      ) {
        opts.unshift({
          value: form.to_cash_ledger_id,
          label: form.to_cash_ledger_name || "Cash",
          sub: form.to_cash_ledger_code,
          disabled: false,
        });
      }
      return opts;
    }
    const opts = toEligible.filter(isBankEligible).map((a) => ({
      value: a.bank_account_id,
      label: formatEligibleBankLabel(a),
      sub: formatEligibleBankSub(a),
      disabled:
        form.from_account_type === "BANK" &&
        !!form.from_bank_account_id &&
        a.bank_account_id === form.from_bank_account_id,
    }));
    if (
      form.to_bank_account_id &&
      !opts.some((o) => o.value === form.to_bank_account_id)
    ) {
      opts.unshift({
        value: form.to_bank_account_id,
        label: form.to_bank_account_name || "Bank",
        sub: "",
        disabled: false,
      });
    }
    return opts;
  }, [form, toEligible]);

  const attachmentCount = form.persistedAttachments.length + form.pendingFiles.length;

  const handleAddAttachmentFiles = (files: File[]) => {
    const err = validateContraAttachmentFiles(files, attachmentCount);
    if (err) {
      showToast(err, "error");
      return;
    }
    const next = createContraPendingFiles(files);
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
      if (target) revokeContraPendingPreviews(target);
      return {
        ...prev,
        pendingFiles: prev.pendingFiles.filter((p) => p.id !== id),
      };
    });
  };

  const selectFromAccount = (id: string) => {
    if (form.from_account_type === "CASH") {
      const row = fromEligible.filter(isCashEligible).find((a) => a.cash_ledger_id === id);
      patch({
        from_cash_ledger_id: id,
        from_cash_ledger_name: row?.ledger_name || form.from_cash_ledger_name,
        from_cash_ledger_code: row?.ledger_code || form.from_cash_ledger_code,
        from_bank_account_id: "",
        from_bank_account_name: "",
        from_bank_ledger_id: "",
      });
      return;
    }
    const row = fromEligible.filter(isBankEligible).find((a) => a.bank_account_id === id);
    patch({
      from_bank_account_id: id,
      from_bank_account_name: row
        ? formatEligibleBankLabel(row)
        : form.from_bank_account_name,
      from_bank_ledger_id: row?.ledger_id || "",
      from_cash_ledger_id: "",
      from_cash_ledger_name: "",
      from_cash_ledger_code: "",
    });
  };

  const selectToAccount = (id: string) => {
    if (form.to_account_type === "CASH") {
      const row = toEligible.filter(isCashEligible).find((a) => a.cash_ledger_id === id);
      patch({
        to_cash_ledger_id: id,
        to_cash_ledger_name: row?.ledger_name || form.to_cash_ledger_name,
        to_cash_ledger_code: row?.ledger_code || form.to_cash_ledger_code,
        to_bank_account_id: "",
        to_bank_account_name: "",
        to_bank_ledger_id: "",
      });
      return;
    }
    const row = toEligible.filter(isBankEligible).find((a) => a.bank_account_id === id);
    patch({
      to_bank_account_id: id,
      to_bank_account_name: row
        ? formatEligibleBankLabel(row)
        : form.to_bank_account_name,
      to_bank_ledger_id: row?.ledger_id || "",
      to_cash_ledger_id: "",
      to_cash_ledger_name: "",
      to_cash_ledger_code: "",
    });
  };

  const saveDraft = async (options?: {
    skipToast?: boolean;
    skipNavigate?: boolean;
  }): Promise<ContraVoucherDetail | null> => {
    const validationError = validateContraForm(form);
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
        ? await ContraVoucherService.update(currentId, buildUpdatePayload(form), {
            pendingFiles,
            existingAttachments: form.persistedAttachments,
          })
        : await ContraVoucherService.create(buildCreatePayload(form), pendingFiles);
      hydrateFromDetail(saved);
      if (!options?.skipToast) {
        showToast(
          currentId ? "Contra draft updated." : "Contra draft created.",
          "success",
        );
      }
      if (!currentId && !options?.skipNavigate) {
        router.replace(contraEditPath(saved.contra_voucher_id));
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
    action: () => Promise<ContraVoucherDetail>,
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
    else if (currentId) router.push(contraViewPath(currentId));
    else router.push(CONTRA_LIST_PATH);
  };

  const handleBack = () => {
    if (onDone) onDone();
    else router.push(CONTRA_LIST_PATH);
  };

  /** Save current form then post immediately — no confirmation dialog. */
  const handleSaveAndPost = async () => {
    const saved = await saveDraft({ skipToast: true, skipNavigate: true });
    if (!saved?.contra_voucher_id) return;
    const posted = await runAction(
      () => ContraVoucherService.post(saved.contra_voucher_id),
      "Contra posted successfully.",
    );
    if (posted?.contra_voucher_id) {
      router.replace(contraViewPath(posted.contra_voucher_id));
      return;
    }
    router.replace(contraEditPath(saved.contra_voucher_id));
  };

  /** Post an already-saved voucher without confirmation (approved flows). */
  const handlePostDirect = async () => {
    if (!currentId) return;
    const posted = await runAction(
      () => ContraVoucherService.post(currentId),
      "Contra posted successfully.",
    );
    if (posted?.contra_voucher_id) {
      router.replace(contraViewPath(posted.contra_voucher_id));
    }
  };

  const title =
    readOnlyProp || !fieldsEditable
      ? "View Contra Voucher"
      : currentId
        ? "Edit Contra Voucher"
        : "New Contra Voucher";

  const subtitle = detail
    ? `Contra No. ${formatSrNo(detail.sr_no)} · ${CONTRA_STATUS_LABELS[status]}`
    : "Transfer between cash and bank accounts.";

  const breadcrumb = accountsBreadcrumb(
    "Vouchers",
    currentId ? (fieldsEditable ? "Edit Contra" : "Contra Voucher") : "New Contra",
    CONTRA_LIST_PATH,
  );

  const showViewChrome = readOnlyProp || !fieldsEditable;
  const useInvoiceChrome = !showViewChrome;

  const formBody = (
    <>
        {error ? <div className={VOUCHER_ERROR_CLASS}>{error}</div> : null}

        {crossCashBlocked ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            {CROSS_WAREHOUSE_CASH_MESSAGE}
          </div>
        ) : null}

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
            <VoucherFormField label="Contra No.">
              <p className="h-8 flex items-center text-xs font-mono font-semibold text-brand-700">
                {detail ? formatSrNo(detail.sr_no) : "Auto on save"}
              </p>
            </VoucherFormField>
            <VoucherFormField label="Reference Number">
              <Input
                className={VOUCHER_INPUT_CLASS}
                value={form.reference_number}
                disabled={!fieldsEditable}
                onChange={(e) => patch({ reference_number: e.target.value })}
                placeholder="Transfer / deposit / withdrawal reference"
                maxLength={150}
              />
            </VoucherFormField>
            <VoucherFormField label="Status">
              <p className="h-8 flex items-center text-xs font-medium text-foreground">
                {CONTRA_STATUS_LABELS[status]}
              </p>
            </VoucherFormField>
          </div>
          {selectedFY?.label ? (
            <p className="text-[11px] text-muted-foreground mt-2">
              Working FY:{" "}
              <span className="font-medium text-foreground">{selectedFY.label}</span>
            </p>
          ) : null}
        </VoucherFormSectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <VoucherFormSectionCard title="Transfer From">
            <div className="space-y-2.5">
              <ContraSearchableSelect
                label="From Warehouse / Branch"
                required
                disabled={!fieldsEditable}
                value={form.from_warehouse_id}
                options={warehouses}
                placeholder="Select from warehouse…"
                onChange={(id) =>
                  patch({
                    from_warehouse_id: id,
                    ...clearFromAccountFields(form.from_account_type),
                  })
                }
              />
              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  From Account Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.from_account_type}
                  disabled={!fieldsEditable}
                  onValueChange={(v) => {
                    const next = v as ContraAccountType;
                    patch({
                      from_account_type: next,
                      ...clearFromAccountFields(next),
                    });
                  }}
                >
                  <SelectTrigger className={VOUCHER_INPUT_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRA_ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-sm">
                        {CONTRA_ACCOUNT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ContraSearchableSelect
                label={
                  form.from_account_type === "CASH"
                    ? "From Cash Account"
                    : "From Bank Account"
                }
                required
                disabled={!fieldsEditable || !form.from_warehouse_id}
                value={
                  form.from_account_type === "CASH"
                    ? form.from_cash_ledger_id
                    : form.from_bank_account_id
                }
                options={fromAccountOptions}
                placeholder={
                  !form.from_warehouse_id
                    ? "Select warehouse first…"
                    : fromAccountsLoading
                      ? "Loading accounts…"
                      : "Select account…"
                }
                onChange={selectFromAccount}
                onSearchChange={handleFromAccountSearch}
              />
            </div>
          </VoucherFormSectionCard>

          <VoucherFormSectionCard title="Transfer To">
            <div className="space-y-2.5">
              <ContraSearchableSelect
                label="To Warehouse / Branch"
                required
                disabled={!fieldsEditable}
                value={form.to_warehouse_id}
                options={warehouses}
                placeholder="Select to warehouse…"
                onChange={(id) =>
                  patch({
                    to_warehouse_id: id,
                    ...clearToAccountFields(form.to_account_type),
                  })
                }
              />
              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  To Account Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.to_account_type}
                  disabled={!fieldsEditable}
                  onValueChange={(v) => {
                    const next = v as ContraAccountType;
                    patch({
                      to_account_type: next,
                      ...clearToAccountFields(next),
                    });
                  }}
                >
                  <SelectTrigger className={VOUCHER_INPUT_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRA_ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-sm">
                        {CONTRA_ACCOUNT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ContraSearchableSelect
                label={
                  form.to_account_type === "CASH"
                    ? "To Cash Account"
                    : "To Bank Account"
                }
                required
                disabled={!fieldsEditable || !form.to_warehouse_id}
                value={
                  form.to_account_type === "CASH"
                    ? form.to_cash_ledger_id
                    : form.to_bank_account_id
                }
                options={toAccountOptions}
                placeholder={
                  !form.to_warehouse_id
                    ? "Select warehouse first…"
                    : toAccountsLoading
                      ? "Loading accounts…"
                      : "Select account…"
                }
                onChange={selectToAccount}
                onSearchChange={handleToAccountSearch}
              />
            </div>
          </VoucherFormSectionCard>
        </div>

        <VoucherFormSectionCard title="Transfer Details">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="md:col-span-3 min-w-0">
              <VoucherFormField label="Amount" required>
                <Input
                  className={cn(
                    VOUCHER_INPUT_CLASS,
                    VOUCHER_MONEY_INPUT_CLASS,
                    "w-full max-w-[180px]",
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

            {bankSide ? (
              <>
                <div className="md:col-span-3 min-w-0 space-y-1">
                  <Label className="text-xs font-medium">
                    Transaction Mode <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.transaction_mode}
                    disabled={!fieldsEditable}
                    onValueChange={(v) => {
                      const mode = v as ContraBankTransactionMode;
                      patch({
                        transaction_mode: mode,
                        cheque_number: mode === "CHEQUE" ? form.cheque_number : "",
                        cheque_date: mode === "CHEQUE" ? form.cheque_date : "",
                        utr_number: mode === "CHEQUE" ? "" : form.utr_number,
                      });
                    }}
                  >
                    <SelectTrigger className={VOUCHER_INPUT_CLASS}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRA_BANK_TRANSACTION_MODES.map((m) => (
                        <SelectItem key={m} value={m} className="text-sm">
                          {CONTRA_BANK_TRANSACTION_MODE_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3 min-w-0">
                  <VoucherFormField label="Transaction / Value Date">
                    <Input
                      type="date"
                      className={VOUCHER_INPUT_CLASS}
                      value={form.transaction_date}
                      disabled={!fieldsEditable}
                      onChange={(e) => patch({ transaction_date: e.target.value })}
                    />
                  </VoucherFormField>
                </div>
              </>
            ) : null}
          </div>

          {bankSide && form.transaction_mode === "CHEQUE" ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 mt-2.5">
              <div className="md:col-span-4 min-w-0">
                <VoucherFormField label="Cheque Number" required>
                  <Input
                    className={VOUCHER_INPUT_CLASS}
                    value={form.cheque_number}
                    disabled={!fieldsEditable}
                    onChange={(e) => patch({ cheque_number: e.target.value })}
                  />
                </VoucherFormField>
              </div>
              <div className="md:col-span-3 min-w-0">
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
            </div>
          ) : null}

          {bankSide &&
          form.transaction_mode !== "CASH" &&
          form.transaction_mode !== "CHEQUE" ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 mt-2.5">
              <div className="md:col-span-4 min-w-0">
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
              <div className="md:col-span-5 min-w-0">
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
              <div className="md:col-span-3 min-w-0">
                <VoucherFormField label="Instrument Date">
                  <Input
                    type="date"
                    className={VOUCHER_INPUT_CLASS}
                    value={form.instrument_date}
                    disabled={!fieldsEditable}
                    onChange={(e) => patch({ instrument_date: e.target.value })}
                  />
                </VoucherFormField>
              </div>
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
                placeholder="Enter reason/details for this fund transfer"
                maxLength={5000}
                disabled={!fieldsEditable}
              />
            </div>
            <ContraAttachmentsPanel
              persisted={form.persistedAttachments}
              pending={form.pendingFiles}
              readOnly={!fieldsEditable}
              onAddFiles={handleAddAttachmentFiles}
              onRemovePersisted={handleRemovePersistedAttachment}
              onRemovePending={handleRemovePendingAttachment}
            />
          </div>
        </VoucherFormSectionCard>

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
    </>
  );

  const actionBar = (
    <ContraFormActionBar
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
        fieldsEditable && !readOnlyProp && !approvalRequired && !currentId
          ? () => void handleSaveAndPost()
          : undefined
      }
      onApprove={
        status === "PENDING_APPROVAL" && approvalRequired && currentId
          ? () =>
              void runAction(
                () => ContraVoucherService.approve(currentId!),
                "Contra approved.",
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
        canCancelStatus(status) && currentId && !isDraftEditable(status)
          ? () => setCancelOpen(true)
          : undefined
      }
      onReverse={
        status === "POSTED" && currentId
          ? () => {
              setReverseReason("");
              setReverseDate(form.voucher_date || "");
              setReverseOpen(true);
            }
          : undefined
      }
    />
  );

  const dialogs = (
    <>
      <ContraReasonDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Submit for Approval"
        description="Select an approver for this Contra Voucher."
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
                ContraVoucherService.submit(currentId, { approver_id: approverId }),
              "Submitted for approval.",
            );
          })();
        }}
      />

      <ContraReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject Contra"
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
              ContraVoucherService.reject(currentId, {
                rejection_reason: rejectReason.trim(),
              }),
            "Contra rejected.",
          );
        }}
      />

      <ContraReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Discard Voucher"
        description="Are you sure you want to discard this voucher entry?"
        reason={cancelReason}
        onReasonChange={setCancelReason}
        confirmLabel="Discard Voucher"
        destructive
        busy={busy}
        onConfirm={() => {
          if (!currentId || busy) return;
          setCancelOpen(false);
          void runAction(
            () =>
              ContraVoucherService.cancel(currentId, {
                reason: cancelReason.trim(),
              }),
            "Contra cancelled.",
          );
        }}
      />

      <ContraReasonDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        title="Reverse Voucher"
        description="This voucher has already been posted. Continuing will create reversal entries for the ledgers impacted by this voucher. Do you want to continue?"
        reason={reverseReason}
        onReasonChange={setReverseReason}
        showDate
        dateValue={reverseDate}
        onDateChange={setReverseDate}
        confirmLabel="Continue / Reverse Voucher"
        destructive
        busy={busy}
        onConfirm={() => {
          if (!currentId || busy) return;
          const resolvedDate =
            reverseDate.trim() || form.voucher_date.trim() || null;
          setReverseOpen(false);
          void runAction(
            () =>
              ContraVoucherService.reverse(currentId, {
                reason: reverseReason.trim(),
                reversal_date: resolvedDate,
              }),
            "Contra reversed.",
          );
        }}
      />
    </>
  );

  if (loading) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Vouchers", "Contra Voucher", CONTRA_LIST_PATH)}
        title="Contra Voucher"
        description="Loading…"
        layout="form"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading contra…
        </div>
      </AccountsPageShell>
    );
  }

  if (useInvoiceChrome) {
    return (
      <div className="h-full min-h-0 flex flex-col w-full">
        <InvoiceFormLayout
          title={title}
          subtitle={subtitle}
          breadcrumb={breadcrumb}
          backHref={CONTRA_LIST_PATH}
          onBackClick={handleDiscard}
          stickyFooter={actionBar}
        >
          {formBody}
        </InvoiceFormLayout>
        {dialogs}
      </div>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={breadcrumb}
      title={title}
      description={subtitle}
      layout="form"
      onBackClick={showViewChrome ? handleBack : undefined}
      actions={
        readOnlyProp && onEdit && isDraftEditable(status) ? (
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
      <div className="w-full space-y-3 pb-24">{formBody}</div>
      {(!showViewChrome || status === "POSTED") ? (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-white/95 backdrop-blur px-4 py-2.5">
          <div className="w-full">{actionBar}</div>
        </div>
      ) : null}
      {dialogs}
    </AccountsPageShell>
  );
}
