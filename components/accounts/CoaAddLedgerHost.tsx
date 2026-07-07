"use client";

import { useCallback, useEffect, useState } from "react";
import { LedgerSheet } from "@/app/(app)/accounts/masters/chart-of-accounts/components/LedgerSheet";
import {
  DEFAULT_LEDGER_FORM,
  canAddLedgerUnder,
  defaultBalanceTypeForParent,
  formToLedger,
  generateLedgerCode,
  getAncestorPath,
  saveChartOfAccounts,
  validateLedgerForm,
  type LedgerFormValues,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { registerCoaAddLedgerHandlers } from "@/app/(app)/accounts/masters/chart-of-accounts/coa-add-ledger-bridge";
import { nextId } from "@/app/(app)/accounts/data";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { useCoaNavigation } from "./CoaNavigationContext";

/** Global add-ledger drawer — lives in CoaNavigationProvider so sidebar + toolbar always work. */
export function CoaAddLedgerHost() {
  const canCreate = useCanCoa("create");
  const {
    records,
    setRecords,
    selectNode,
    ensureExpanded,
    setHighlightedLedgerId,
    coaReady,
  } = useCoaNavigation();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<LedgerFormValues>(DEFAULT_LEDGER_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState("");
  const [parentGroupLocked, setParentGroupLocked] = useState(false);

  const openGlobalAdd = useCallback(
    (preferredParentId?: number | null) => {
      const parentGroupId = preferredParentId ?? null;
      setForm({
        ...DEFAULT_LEDGER_FORM,
        ...(parentGroupId != null
          ? {
              parentGroupId,
              balanceType: defaultBalanceTypeForParent(records, parentGroupId),
            }
          : {}),
      });
      setPreviewCode(generateLedgerCode(records));
      setFormError(null);
      setParentGroupLocked(false);
      setSheetOpen(true);
    },
    [records],
  );

  const openAddUnderParent = useCallback(
    (parentGroupId: number) => {
      const parent = records.find((r) => r.id === parentGroupId);
      if (!parent || !canAddLedgerUnder(parent, records)) {
        openGlobalAdd(parentGroupId);
        return;
      }
      setForm({
        ...DEFAULT_LEDGER_FORM,
        parentGroupId,
        balanceType: defaultBalanceTypeForParent(records, parentGroupId),
      });
      setPreviewCode(generateLedgerCode(records));
      setFormError(null);
      setParentGroupLocked(true);
      setSheetOpen(true);
    },
    [records, openGlobalAdd],
  );

  useEffect(() => {
    registerCoaAddLedgerHandlers({
      addUnderParent: openAddUnderParent,
      openGlobal: openGlobalAdd,
    });
    return () =>
      registerCoaAddLedgerHandlers({ addUnderParent: null, openGlobal: null });
  }, [openAddUnderParent, openGlobalAdd]);

  useEffect(() => {
    if (!coaReady || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const add = params.get("addLedger");
    if (!add) return;

    params.delete("addLedger");
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState(null, "", next);

    if (add === "global") {
      openGlobalAdd(null);
      return;
    }
    const id = Number(add);
    if (Number.isFinite(id)) openAddUnderParent(id);
  }, [coaReady, openAddUnderParent, openGlobalAdd]);

  const closeSheet = () => {
    setSheetOpen(false);
    setFormError(null);
  };

  const handleSave = () => {
    const err = validateLedgerForm(form, records);
    if (err) {
      setFormError(err);
      return;
    }

    const list = [...records];
    const code = generateLedgerCode(list);
    const row = formToLedger(form, nextId(list), code, list);
    list.push(row);
    saveChartOfAccounts(list);
    setRecords(list);

    if (row.parentAccountId) {
      const parent = list.find((r) => r.id === row.parentAccountId);
      if (parent) {
        const ancestorIds = getAncestorPath(list, parent.id).map((a) => a.id);
        ensureExpanded([...ancestorIds, parent.id]);
        selectNode(parent);
      }
    }

    setHighlightedLedgerId(row.id);
    closeSheet();
  };

  if (!canCreate && !sheetOpen) return null;

  return (
    <LedgerSheet
      open={sheetOpen && canCreate}
      mode="add"
      form={form}
      formError={formError}
      previewCode={previewCode}
      records={records}
      active={null}
      onClose={closeSheet}
      onSave={handleSave}
      onFormChange={(next) => {
        setForm(next);
        if (next.parentGroupId) setFormError(null);
      }}
      canEdit={canCreate}
      compactAdd
      parentGroupLocked={parentGroupLocked}
    />
  );
}
