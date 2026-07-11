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
import { useCoaRecords } from "@/lib/accounts/use-coa-records";
import { useClientMounted } from "@/lib/use-client-mounted";
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

export interface UseVoucherFormOptions {
  voucherType: VoucherTypeCode;
  voucherId?: number;
  readOnly?: boolean;
  onDone: () => void;
  onSaveSuccess?: (action: "draft" | "post") => void;
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

  const [model, setModel] = useState<VoucherFormModel>(() =>
    createNewFormModel(voucherType, config.defaultTransactionMode),
  );
  const [extras, setExtras] = useState<VoucherFormExtras>({});
  const [allocations, setAllocations] = useState<VoucherAllocationLine[] | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    if (isNew) {
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
      return;
    }
    if (!existing) return;
    setModel(accountingVoucherToFormModel(existing, coaRecords));
    setError(null);
  }, [mounted, isNew, existing, voucherType, config.defaultTransactionMode, coaRecords]);

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
    handlePost,
  };
}
