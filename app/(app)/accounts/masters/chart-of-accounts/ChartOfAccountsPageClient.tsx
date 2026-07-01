"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCoaNavigation } from "@/components/accounts/CoaNavigationContext";
import { canCoa } from "@/lib/accounts/permissions";
import { nextId } from "../../data";
import type { ChartOfAccount } from "../../data";
import {
  DEFAULT_LEDGER_FORM,
  canAddLedgerUnder,
  defaultBalanceTypeForParent,
  formToLedger,
  generateLedgerCode,
  ledgerToForm,
  saveChartOfAccounts,
  validateLedgerForm,
  type LedgerFormValues,
} from "./chart-of-accounts-data";
import { CoaNodeDetail } from "./components/CoaNodeDetail";
import { LedgerSheet } from "./components/LedgerSheet";

type SheetMode = "add" | "edit" | "view" | null;

export default function ChartOfAccountsPageClient() {
  const {
    records,
    setRecords,
    selectedNode,
    selectNode,
  } = useCoaNavigation();

  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [active, setActive] = useState<ChartOfAccount | null>(null);
  const [form, setForm] = useState<LedgerFormValues>(DEFAULT_LEDGER_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChartOfAccount | null>(null);
  const [previewCode, setPreviewCode] = useState("");

  const canCreate = canCoa("create");
  const canEdit = canCoa("edit");
  const canDelete = canCoa("delete");

  const openAddLedger = (parentGroupId?: number) => {
    const parentId =
      parentGroupId ??
      (selectedNode && canAddLedgerUnder(selectedNode, records) ? selectedNode.id : null);
    setForm({
      ...DEFAULT_LEDGER_FORM,
      parentGroupId: parentId,
      balanceType: defaultBalanceTypeForParent(records, parentId),
    });
    setPreviewCode(generateLedgerCode(records));
    setActive(null);
    setFormError(null);
    setSheetMode("add");
  };

  const openEditLedger = (row: ChartOfAccount) => {
    setActive(row);
    setForm(ledgerToForm(row));
    setPreviewCode(row.accountCode);
    setFormError(null);
    setSheetMode("edit");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setFormError(null);
  };

  const handleSave = () => {
    const err = validateLedgerForm(form, records, active?.id);
    if (err) {
      setFormError(err);
      return;
    }
    const list = [...records];
    let saved: ChartOfAccount | null = null;
    if (sheetMode === "add") {
      const code = generateLedgerCode(list);
      const row = formToLedger(form, nextId(list), code, list);
      list.push(row);
      saved = row;
    } else if (sheetMode === "edit" && active) {
      const idx = list.findIndex((r) => r.id === active.id);
      if (idx >= 0) {
        list[idx] = formToLedger(form, active.id, active.accountCode, list, active);
        saved = list[idx];
      }
    }
    saveChartOfAccounts(list);
    setRecords(list);
    if (saved) selectNode(saved);
    closeSheet();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = records.filter((r) => r.id !== deleteTarget.id);
    saveChartOfAccounts(list);
    setRecords(list);
    if (deleteTarget.parentAccountId) {
      const parent = list.find((r) => r.id === deleteTarget.parentAccountId);
      if (parent) selectNode(parent);
    }
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <CoaNodeDetail
        node={selectedNode}
        records={records}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        onSelect={selectNode}
        onAddLedger={openAddLedger}
        onEditLedger={openEditLedger}
        onDeleteLedger={setDeleteTarget}
      />

      <LedgerSheet
        open={!!sheetMode}
        mode={sheetMode}
        form={form}
        formError={formError}
        previewCode={previewCode}
        records={records}
        active={active}
        onClose={closeSheet}
        onSave={handleSave}
        onFormChange={setForm}
        canEdit={sheetMode === "add" ? canCreate : canEdit}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Delete ledger?</DialogTitle>
            <DialogDescription className="text-xs">
              {deleteTarget?.accountName} ({deleteTarget?.accountCode}) will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
