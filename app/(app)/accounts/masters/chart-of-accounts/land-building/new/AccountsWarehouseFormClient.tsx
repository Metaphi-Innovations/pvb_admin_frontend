"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, Save, XCircle } from "lucide-react";
import {
  WarehouseForm,
  validateWarehouseForm,
  INITIAL_FORM,
  warehouseFormToRecordFields,
  type WarehouseFormValues,
} from "@/app/(app)/masters/warehouse/components/WarehouseForm";
import {
  type WarehouseMaster,
  loadWarehouses,
  saveWarehouses,
  nextWarehouseId,
  generateWarehouseCode,
  todayStr,
} from "@/app/(app)/masters/warehouse/warehouse-data";
import { createWarehouseCoaLedger } from "@/lib/accounts/accounts-warehouse-ledger";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { useClientMounted } from "@/lib/use-client-mounted";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

export interface AccountsWarehouseFormProps {
  parentGroupId: number;
  onClose: () => void;
  onSaved?: (ledgerId: number, parentGroupId: number | null) => void;
}

/**
 * Exact Warehouse Master form — same UI, validations, and ERP save flow as
 * `/masters/warehouse/add`. After save, creates/links the COA ledger under Land & Building.
 */
export default function AccountsWarehouseFormClient({
  parentGroupId,
  onClose,
  onSaved,
}: AccountsWarehouseFormProps) {
  const mounted = useClientMounted();
  const canCreate = useCanCoa("create");

  const [form, setForm] = useState<WarehouseFormValues>({ ...INITIAL_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const clearErr = (key: string) => {
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleSave = () => {
    if (!canCreate) {
      setToast({ msg: "You do not have permission to create ledgers.", type: "error" });
      return;
    }

    const e = validateWarehouseForm(form);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const current = loadWarehouses();
      const nextIdVal = nextWarehouseId(current);
      const newRecord: WarehouseMaster = {
        id: nextIdVal,
        warehouseCode: generateWarehouseCode(nextIdVal),
        ...warehouseFormToRecordFields(form),
        createdBy: "Admin",
        createdDate: todayStr(),
        updatedBy: "Admin",
        updatedDate: todayStr(),
      };

      saveWarehouses([...current, newRecord]);

      let ledger;
      try {
        ({ ledger } = createWarehouseCoaLedger(newRecord, parentGroupId));
      } catch (ledgerErr) {
        saveWarehouses(current);
        throw ledgerErr;
      }
      setToast({ msg: "Warehouse created successfully.", type: "success" });
      setTimeout(() => {
        onSaved?.(ledger.id, ledger.parentAccountId);
        onClose();
      }, 500);
    } catch (saveErr) {
      setToast({
        msg: saveErr instanceof Error ? saveErr.message : "Failed to save warehouse.",
        type: "error",
      });
      setSaving(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-medium text-amber-800">Access restricted</p>
        <p className="text-xs text-muted-foreground">
          You do not have permission to create ledgers under Chart of Accounts.
        </p>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <div className="flex w-full flex-1 min-h-0 flex-col space-y-3">
        <div className="flex flex-shrink-0 items-center justify-between border-b pb-2.5 px-4 pt-3">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted"
              onClick={onClose}
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-base font-bold text-foreground">Add Warehouse</h1>
              <p className="text-xs text-muted-foreground">
                Accounts → Chart of Accounts → Land & Building → Add Warehouse
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-9 text-xs font-semibold rounded-lg"
              onClick={onClose}
              disabled={saving}
            >
              Discard
            </Button>
            <Button
              className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="w-4 h-4" /> Save
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <WarehouseForm
              form={form}
              onChange={setForm}
              errors={errors}
              onClearError={clearErr}
            />
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            "animate-in slide-in-from-top-2 fade-in-0 duration-300",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {toast.type === "success" ? (
            <Check className="flex-shrink-0 w-4 h-4" />
          ) : (
            <XCircle className="flex-shrink-0 w-4 h-4" />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
