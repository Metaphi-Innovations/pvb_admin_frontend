"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { GroupSheet } from "@/app/(app)/accounts/masters/chart-of-accounts/components/GroupSheet";
import {
  DEFAULT_GROUP_FORM,
  canDeleteGroup,
  formToGroup,
  generateGroupCode,
  getAncestorPath,
  groupToForm,
  saveChartOfAccounts,
  validateGroupForm,
  type GroupFormValues,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { registerCoaAddGroupHandlers } from "@/app/(app)/accounts/masters/chart-of-accounts/coa-add-group-bridge";
import { nextId } from "@/app/(app)/accounts/data";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { useCoaNavigation } from "./CoaNavigationContext";

type SheetMode = "add" | "edit" | null;

/** Global add/edit sub-group drawer — mounted in CoaNavigationProvider. */
export function CoaAddGroupHost() {
  const canCreate = useCanCoa("create");
  const canEdit = useCanCoa("edit");
  const canDelete = useCanCoa("delete");
  const {
    records,
    setRecords,
    selectNode,
    ensureExpanded,
    setHighlightedLedgerId,
  } = useCoaNavigation();

  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [form, setForm] = useState<GroupFormValues>(DEFAULT_GROUP_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState("");
  const [parentGroupLocked, setParentGroupLocked] = useState(false);
  const [active, setActive] = useState<import("@/app/(app)/accounts/data").ChartOfAccount | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const openGlobalAdd = useCallback(
    (preferredParentId?: number | null) => {
      const parentGroupId = preferredParentId ?? null;
      setForm({
        ...DEFAULT_GROUP_FORM,
        parentGroupId,
      });
      setPreviewCode(
        parentGroupId != null ? generateGroupCode(records, parentGroupId) : "",
      );
      setFormError(null);
      setParentGroupLocked(parentGroupId != null);
      setActive(null);
      setSheetMode("add");
    },
    [records],
  );

  const openAddUnderParent = useCallback(
    (parentGroupId: number) => {
      setForm({
        ...DEFAULT_GROUP_FORM,
        parentGroupId,
      });
      setPreviewCode(generateGroupCode(records, parentGroupId));
      setFormError(null);
      setParentGroupLocked(true);
      setActive(null);
      setSheetMode("add");
    },
    [records],
  );

  const openEdit = useCallback(
    (groupId: number) => {
      const row = records.find((r) => r.id === groupId);
      if (!row) return;
      setActive(row);
      setForm(groupToForm(row));
      setPreviewCode(row.accountCode);
      setFormError(null);
      setParentGroupLocked(true);
      setSheetMode("edit");
    },
    [records],
  );

  const openDelete = useCallback((groupId: number) => {
    setDeleteTargetId(groupId);
  }, []);

  useEffect(() => {
    registerCoaAddGroupHandlers({
      addUnderParent: openAddUnderParent,
      openGlobal: openGlobalAdd,
      editGroup: openEdit,
      deleteGroup: openDelete,
    });
    return () =>
      registerCoaAddGroupHandlers({
        addUnderParent: null,
        openGlobal: null,
        editGroup: null,
        deleteGroup: null,
      });
  }, [openAddUnderParent, openGlobalAdd, openEdit, openDelete]);

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setFormError(null);
  };

  const handleSave = () => {
    const err = validateGroupForm(form, records, active?.id);
    if (err) {
      setFormError(err);
      return;
    }

    const list = [...records];
    let savedId: number;

    if (sheetMode === "add") {
      if (form.parentGroupId == null) return;
      const code = generateGroupCode(list, form.parentGroupId);
      const row = formToGroup(form, nextId(list), code, list);
      list.push(row);
      savedId = row.id;
    } else if (sheetMode === "edit" && active) {
      const idx = list.findIndex((r) => r.id === active.id);
      if (idx < 0) return;
      list[idx] = formToGroup(form, active.id, active.accountCode, list, active);
      savedId = active.id;
    } else {
      return;
    }

    saveChartOfAccounts(list);
    setRecords(list);
    dispatchAccountsDataChanged("coa", { operation: sheetMode === "add" ? "create" : "update", recordId: savedId });

    const saved = list.find((r) => r.id === savedId);
    if (saved?.parentAccountId) {
      const parent = list.find((r) => r.id === saved.parentAccountId);
      if (parent) {
        const ancestorIds = getAncestorPath(list, parent.id).map((a) => a.id);
        ensureExpanded([...ancestorIds, parent.id]);
      }
    }
    if (saved) selectNode(saved);
    setHighlightedLedgerId(savedId);
    closeSheet();
  };

  const confirmDelete = () => {
    if (deleteTargetId == null) return;
    const target = records.find((r) => r.id === deleteTargetId);
    if (!target || !canDeleteGroup(target, records)) {
      setDeleteTargetId(null);
      return;
    }
    const list = records.filter((r) => r.id !== deleteTargetId);
    saveChartOfAccounts(list);
    setRecords(list);
    dispatchAccountsDataChanged("coa", { operation: "delete", recordId: deleteTargetId });
    setDeleteTargetId(null);
  };

  const deleteTarget = deleteTargetId != null ? records.find((r) => r.id === deleteTargetId) : null;

  if (!canCreate && !canEdit && !sheetMode && !deleteTarget) return null;

  return (
    <>
      <GroupSheet
        open={!!sheetMode}
        mode={sheetMode === "edit" ? "edit" : "add"}
        form={form}
        formError={formError}
        previewCode={previewCode}
        records={records}
        active={active}
        onClose={closeSheet}
        onSave={handleSave}
        onFormChange={(next) => {
          setFormError(null);
          if (next.parentGroupId && next.parentGroupId !== form.parentGroupId) {
            setPreviewCode(generateGroupCode(records, next.parentGroupId));
          }
          setForm(next);
        }}
        canEdit={sheetMode === "add" ? canCreate : canEdit}
        parentGroupLocked={parentGroupLocked}
      />

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTargetId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-50 border border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              Delete sub-group?
            </DialogTitle>
            <DialogDescription className="pt-1">
              {deleteTarget
                ? `"${deleteTarget.accountName}" will be removed. This is only allowed when the group has no child groups or ledgers.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDeleteTargetId(null)}>
              Cancel
            </Button>
            {canDelete && (
              <Button
                size="sm"
                className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmDelete}
              >
                Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
