"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LedgerSheet } from "@/app/(app)/accounts/masters/chart-of-accounts/components/LedgerSheet";
import {
  DEFAULT_LEDGER_FORM,
  canAddLedgerUnder,
  defaultBalanceTypeForParent,
  describeInvalidLedgerParentMessage,
  formToLedger,
  generateLedgerCode,
  getAncestorPath,
  ledgerToForm,
  saveChartOfAccounts,
  validateLedgerForm,
  type LedgerFormValues,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import {
  registerCoaAddLedgerHandlers,
  requestCoaSpecializedLedgerForm,
} from "@/app/(app)/accounts/masters/chart-of-accounts/coa-add-ledger-bridge";
import {
  registerCoaEditLedgerHandler,
} from "@/app/(app)/accounts/masters/chart-of-accounts/coa-edit-ledger-bridge";
import { nextId, type ChartOfAccount } from "@/app/(app)/accounts/data";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { useCoaNavigation } from "./CoaNavigationContext";

type SheetMode = "add" | "edit" | null;

/** Global add/edit-ledger drawer — lives in CoaNavigationProvider so sidebar + toolbar always work. */
export function CoaAddLedgerHost() {
  const canCreate = useCanCoa("create");
  const canEdit = useCanCoa("edit");
  const {
    records,
    setRecords,
    selectedId,
    selectNode,
    ensureExpanded,
    setHighlightedLedgerId,
    coaReady,
  } = useCoaNavigation();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [active, setActive] = useState<ChartOfAccount | null>(null);
  const [form, setForm] = useState<LedgerFormValues>(DEFAULT_LEDGER_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState("");
  const [parentGroupLocked, setParentGroupLocked] = useState(false);
  const selectedIdRef = useRef(selectedId);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSheetMode(null);
    setActive(null);
    setFormError(null);
  }, []);

  const openGlobalAdd = useCallback(
    (preferredParentId?: number | null, initialError?: string | null) => {
      const parent =
        preferredParentId != null
          ? records.find((r) => r.id === preferredParentId)
          : undefined;
      const parentGroupId =
        parent && canAddLedgerUnder(parent, records) ? preferredParentId! : null;

      if (parentGroupId != null && requestCoaSpecializedLedgerForm(parentGroupId)) return;

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
      setFormError(
        initialError ??
          (parent && parentGroupId == null
            ? describeInvalidLedgerParentMessage(parent, records)
            : null),
      );
      setParentGroupLocked(false);
      setSheetMode("add");
      setActive(null);
      setSheetOpen(true);
    },
    [records],
  );

  const openAddUnderParent = useCallback(
    (parentGroupId: number) => {
      const parent = records.find((r) => r.id === parentGroupId);
      if (requestCoaSpecializedLedgerForm(parentGroupId)) return;
      if (!parent || !canAddLedgerUnder(parent, records)) {
        openGlobalAdd(null, parent ? describeInvalidLedgerParentMessage(parent, records) : null);
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
      setSheetMode("add");
      setActive(null);
      setSheetOpen(true);
    },
    [records, openGlobalAdd],
  );

  const openEdit = useCallback(
    (ledgerId: number) => {
      const row = records.find((r) => r.id === ledgerId);
      if (!row) return;
      setActive(row);
      setForm(ledgerToForm(row));
      setPreviewCode(row.accountCode);
      setFormError(null);
      setParentGroupLocked(true);
      setSheetMode("edit");
      setSheetOpen(true);
    },
    [records],
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
    registerCoaEditLedgerHandler(openEdit);
    return () => registerCoaEditLedgerHandler(null);
  }, [openEdit]);

  /** Close the add/edit drawer when the user navigates via the COA tree. */
  useEffect(() => {
    if (selectedIdRef.current === selectedId) return;
    selectedIdRef.current = selectedId;
    if (sheetOpen) closeSheet();
  }, [selectedId, sheetOpen, closeSheet]);

  useEffect(() => {
    if (!coaReady || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    const add = params.get("addLedger");
    if (add) {
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
      return;
    }

    const editId = params.get("edit");
    if (editId) {
      params.delete("edit");
      const qs = params.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
      window.history.replaceState(null, "", next);
      const id = Number(editId);
      if (Number.isFinite(id)) openEdit(id);
    }
  }, [coaReady, openAddUnderParent, openGlobalAdd, openEdit]);

  const handleSave = () => {
    const err = validateLedgerForm(form, records, active?.id);
    if (err) {
      setFormError(err);
      return;
    }

    const list = [...records];
    let savedId: number;

    if (sheetMode === "add") {
      const code = generateLedgerCode(list);
      const row = formToLedger(form, nextId(list), code, list);
      list.push(row);
      savedId = row.id;
    } else if (sheetMode === "edit" && active) {
      const idx = list.findIndex((r) => r.id === active.id);
      if (idx < 0) return;
      list[idx] = formToLedger(form, active.id, active.accountCode, list, active);
      savedId = active.id;
    } else {
      return;
    }

    saveChartOfAccounts(list);
    setRecords(list);
    dispatchAccountsDataChanged("ledgers", {
      operation: sheetMode === "add" ? "create" : "update",
      recordId: savedId,
    });

    const saved = list.find((r) => r.id === savedId);
    if (saved?.parentAccountId) {
      const parent = list.find((r) => r.id === saved.parentAccountId);
      if (parent) {
        const ancestorIds = getAncestorPath(list, parent.id).map((a) => a.id);
        ensureExpanded([...ancestorIds, parent.id]);
        selectNode(saved);
      }
    } else if (saved) {
      selectNode(saved);
    }

    setHighlightedLedgerId(savedId);
    closeSheet();
  };

  const canOpenSheet =
    (sheetMode === "add" && canCreate) || (sheetMode === "edit" && canEdit);

  if (!canOpenSheet && !sheetOpen) return null;

  return (
    <LedgerSheet
      open={sheetOpen && canOpenSheet}
      mode={sheetMode}
      form={form}
      formError={formError}
      previewCode={previewCode}
      records={records}
      active={active}
      onClose={closeSheet}
      onSave={handleSave}
      onFormChange={(next) => {
        if (next.parentGroupId && sheetMode === "add") {
          if (requestCoaSpecializedLedgerForm(next.parentGroupId)) {
            closeSheet();
            return;
          }
          setFormError(null);
        }
        setForm(next);
      }}
      canEdit={sheetMode === "edit" ? canEdit : canCreate}
      parentGroupLocked={parentGroupLocked}
    />
  );
}
