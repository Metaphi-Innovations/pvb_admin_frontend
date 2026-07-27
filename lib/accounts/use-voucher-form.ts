"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import {
  canEditVoucher,
  createVoucher,
  getVoucherById,
  updateVoucher,
  validateVoucherDraft,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { executeManualVoucherPost } from "@/lib/accounts/voucher-posting-flow";
import type { VoucherAllocationLine } from "@/lib/accounts/voucher-posting-flow";
import { submitDocumentForApproval } from "@/lib/accounts/accounts-workflow-persist";
import type { AccountsVoucherCategory } from "@/lib/accounts/accounts-maker-checker";
import { useCoaRecords } from "@/lib/accounts/use-coa-records";
import { useClientMounted } from "@/lib/use-client-mounted";
import { ensureBankAccountsReady } from "@/lib/accounts/bank-accounts-data";
import { resolveVoucherFormId } from "@/components/accounts/voucher-simple-form-ui";
import { getVoucherFormConfig } from "@/lib/accounts/voucher-form-config";
import {
  accountingVoucherToFormModel,
  createNewFormModel,
  formEntriesToPostingAllocations,
  formModelToCreatePayload,
  formModelToManualPostExtras,
  formModelToVoucherLines,
  getFormEntry,
  validateFormModelForPost,
  type VoucherFormExtras,
  type VoucherFormModel,
} from "@/lib/accounts/voucher-form-model";
import { findLedgerById } from "@/lib/accounts/coa-hierarchy";
import { isVendorPartyLedger } from "@/lib/accounts/voucher-ledger-groups";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";

const VOUCHER_APPROVAL_CATEGORY: Partial<Record<VoucherTypeCode, AccountsVoucherCategory>> = {
  journal: "journal_entry",
  receipt: "receipt_voucher",
  payment: "payment_voucher",
  contra: "contra_voucher",
};

export interface UseVoucherFormOptions {
  voucherType: VoucherTypeCode;
  voucherId?: number;
  readOnly?: boolean;
  onDone: () => void;
  onSaveSuccess?: (action: "draft" | "post" | "submit") => void;
}

export function useVoucherForm({
  voucherType,
  voucherId,
  readOnly = false,
  onDone,
  onSaveSuccess,
}: UseVoucherFormOptions) {
  const mounted = useClientMounted();
  const config = useMemo(() => getVoucherFormConfig(voucherType), [voucherType]);
  const coaRecords = useCoaRecords();
  const resolvedVoucherId = resolveVoucherFormId(voucherId);
  const isNew = resolvedVoucherId == null;
  const isEdit = !isNew && !readOnly;
  const isView = !isNew && readOnly;

  const existing = useMemo(
    () => (mounted && !isNew && resolvedVoucherId != null ? getVoucherById(resolvedVoucherId) : undefined),
    [resolvedVoucherId, mounted, isNew],
  );

  useEffect(() => {
    if (!mounted) return;
    if (
      voucherType !== "receipt" &&
      voucherType !== "payment" &&
      voucherType !== "contra"
    ) {
      return;
    }
    // Seed bank + default cash posting ledgers so Cash / Bank dropdown is not empty.
    ensureBankAccountsReady();
  }, [mounted, voucherType]);

  const [model, setModel] = useState<VoucherFormModel>(() =>
    createNewFormModel(voucherType, config.defaultTransactionMode),
  );
  const [extras, setExtras] = useState<VoucherFormExtras>({});
  const [allocations, setAllocations] = useState<VoucherAllocationLine[] | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted || !isNew) return;
    const base = createNewFormModel(voucherType, config.defaultTransactionMode);
    if (voucherType === "journal") {
      const activeFy = loadFinancialYears().find((fy) => fy.status === "active");
      if (activeFy) {
        base.financialYearId = activeFy.id;
        base.financialYearName = activeFy.name;
      }
    }
    setModel(base);
    setExtras({});
    setAllocations(undefined);
    setError(null);
  }, [mounted, isNew, voucherType, config.defaultTransactionMode]);

  useEffect(() => {
    if (!mounted || isNew || !existing) return;
    setModel(accountingVoucherToFormModel(existing, coaRecords));
    setError(null);
  }, [mounted, isNew, existing, coaRecords]);

  const patchModel = useCallback((patch: Partial<VoucherFormModel>) => {
    setModel((prev) => ({ ...prev, ...patch }));
    setError(null);
  }, []);

  const setEntries = useCallback((entries: VoucherFormModel["entries"]) => {
    setModel((prev) => ({ ...prev, entries }));
    setError(null);
  }, []);

  const canPost = useMemo(
    () => validateFormModelForPost(model, extras, coaRecords) == null,
    [model, extras, coaRecords],
  );

  const builtLines = useMemo(
    () => formModelToVoucherLines(model, extras, coaRecords),
    [model, extras, coaRecords],
  );

  const debitEntry = getFormEntry(model.entries, "DEBIT");
  const creditEntry = getFormEntry(model.entries, "CREDIT");
  const partyLedger = useMemo((): ChartOfAccount | null => {
    const entry =
      voucherType === "receipt"
        ? creditEntry
        : voucherType === "payment"
          ? debitEntry
          : null;
    if (!entry?.accountId) return null;
    return findLedgerById(entry.accountId, coaRecords) ?? null;
  }, [voucherType, debitEntry, creditEntry, coaRecords]);

  const persistDraft = useCallback(() => {
    const payload = formModelToCreatePayload(model, extras, coaRecords);
    if (isEdit && resolvedVoucherId != null) {
      updateVoucher(resolvedVoucherId, payload);
    } else {
      createVoucher(voucherType, payload);
    }
    onSaveSuccess?.("draft");
    onDone();
  }, [model, extras, coaRecords, isEdit, resolvedVoucherId, voucherType, onDone, onSaveSuccess]);

  const handleSaveDraft = useCallback(() => {
    setError(null);
    const draftErr = validateVoucherDraft({ date: model.voucherDate });
    if (draftErr) {
      setError(draftErr);
      return;
    }
    persistDraft();
  }, [model.voucherDate, persistDraft]);

  const handleSubmitForApproval = useCallback(() => {
    setError(null);
    const category = VOUCHER_APPROVAL_CATEGORY[voucherType];
    if (!category) {
      setError("Submit for Approval is not available for this voucher type.");
      return;
    }
    const draftErr = validateVoucherDraft({ date: model.voucherDate });
    if (draftErr) {
      setError(draftErr);
      return;
    }
    const postErr = validateFormModelForPost(model, extras, coaRecords);
    if (postErr) {
      setError(postErr);
      return;
    }

    const payload = formModelToCreatePayload(model, extras, coaRecords);
    let id = resolvedVoucherId;
    if (isEdit && resolvedVoucherId != null) {
      updateVoucher(resolvedVoucherId, { ...payload, status: "draft" });
      id = resolvedVoucherId;
    } else {
      const created = createVoucher(voucherType, { ...payload, status: "draft" });
      id = created.id;
    }
    if (id == null) {
      setError("Could not save voucher before submitting.");
      return;
    }
    try {
      submitDocumentForApproval(category, id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit for approval.");
      return;
    }
    onSaveSuccess?.("submit");
    onDone();
  }, [
    voucherType,
    model,
    extras,
    coaRecords,
    isEdit,
    resolvedVoucherId,
    onDone,
    onSaveSuccess,
  ]);

  const handlePost = useCallback((allocationOverride?: VoucherAllocationLine[]) => {
    setError(null);
    if (!model.voucherDate) {
      setError("Voucher date is required.");
      return;
    }
    const postErr = validateFormModelForPost(model, extras, coaRecords);
    if (postErr) {
      setError(postErr);
      return;
    }

    const postingAllocations =
      allocationOverride ?? formEntriesToPostingAllocations(model, coaRecords);

    const postExtras = formModelToManualPostExtras(model, extras);
    const result = executeManualVoucherPost({
      voucherType,
      voucherId: isEdit ? resolvedVoucherId : null,
      ...postExtras,
      allocations: postingAllocations,
      payload: formModelToCreatePayload(model, extras, coaRecords),
    });

    if (!result.success) {
      setError(result.error ?? "Failed to post voucher.");
      return;
    }
    onSaveSuccess?.("post");
    onDone();
  }, [model, extras, coaRecords, voucherType, isEdit, resolvedVoucherId, allocations, onDone, onSaveSuccess]);

  return {
    mounted,
    config,
    model,
    patchModel,
    setEntries,
    extras,
    setExtras,
    allocations,
    setAllocations,
    error,
    setError,
    canPost,
    builtLines,
    coaRecords,
    existing,
    resolvedVoucherId,
    isNew,
    isEdit,
    isView,
    canEdit: existing ? canEditVoucher(existing) : false,
    partyLedger,
    handleSaveDraft,
    handleSubmitForApproval,
    handlePost,
  };
}
