"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Save, X, XCircle } from "lucide-react";
import { VendorForm } from "@/app/(app)/masters/vendors/components/VendorForm";
import {
  DEFAULT_VENDOR_FORM,
  formToVendor,
  generateVendorCodeForType,
  loadVendors,
  nextId,
  saveVendors,
  todayStr,
  validateVendorForm,
  vendorToForm,
  type Vendor,
  type VendorFormValues,
} from "@/app/(app)/masters/vendors/vendor-data";
import { syncVendorLedger } from "@/lib/accounts/erp-accounting-mapping";
import { CURRENT_USER } from "@/lib/procurement/config";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useFY, fyOpeningDateIso } from "@/lib/fy-store";
import {
  ACCOUNTS_PAGE_SUBTITLE_CLASS,
  ACCOUNTS_PAGE_TITLE_CLASS,
} from "@/lib/accounts/accounts-typography";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        "animate-in slide-in-from-top-2 fade-in-0 duration-300",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      {toast.type === "success" ? (
        <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
      ) : (
        <XCircle className="flex-shrink-0 w-4 h-4" />
      )}
      {toast.msg}
      <button type="button" onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export interface AccountsSundryCreditorVendorFormProps {
  parentGroupId: number;
  /** When set, edit existing Vendor Master (same form / save path). */
  vendorId?: number;
  onClose: () => void;
  onSaved?: (ledgerId: number, parentGroupId: number | null) => void;
}

/**
 * Same Vendor Master form (incl. Accounting tab) embedded in Accounts COA.
 * Saves Vendor Master once and syncs the linked Sundry Creditor ledger.
 */
export default function AccountsSundryCreditorVendorFormClient({
  parentGroupId,
  vendorId,
  onClose,
  onSaved,
}: AccountsSundryCreditorVendorFormProps) {
  const mounted = useClientMounted();
  const canCreate = useCanCoa("create");
  const canEdit = useCanCoa("edit");
  const { selectedFY } = useFY();
  const isEdit = vendorId != null;

  const [form, setForm] = useState<VendorFormValues>(() => ({
    ...DEFAULT_VENDOR_FORM,
    openingBalanceDate: fyOpeningDateIso(selectedFY.id),
    balanceType: "Credit",
  }));
  const [vendorCode, setVendorCode] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(!isEdit);

  useEffect(() => {
    if (!isEdit || vendorId == null) return;
    const found = loadVendors().find((v) => v.id === vendorId);
    if (!found) {
      setToast({ msg: "Vendor not found.", type: "error" });
      setTimeout(() => onClose(), 1200);
      return;
    }
    setForm(vendorToForm(found));
    setVendorCode(found.vendorCode);
    setReady(true);
  }, [isEdit, vendorId, onClose]);

  useEffect(() => {
    if (isEdit) return;
    if (!form.vendorType) {
      setVendorCode("");
      return;
    }
    setVendorCode(generateVendorCodeForType(form.vendorType, loadVendors()));
  }, [form.vendorType, isEdit]);

  const showToast = (msg: string, type: ToastState["type"]) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const handleSave = () => {
    if (isEdit ? !canEdit : !canCreate) {
      showToast("You do not have permission to save this vendor.", "error");
      return;
    }

    const err = validateVendorForm(form);
    if (!form.vendorType) {
      showToast("Supplier type is required.", "error");
      return;
    }
    if (!vendorCode) {
      showToast("Select a supplier type to generate supplier code.", "error");
      return;
    }
    if (err) {
      showToast(err, "error");
      return;
    }

    setSaving(true);
    try {
      const list = loadVendors();
      const today = todayStr();

      let record: Vendor;
      if (isEdit && vendorId != null) {
        const existing = list.find((v) => v.id === vendorId);
        if (!existing) throw new Error("Vendor not found.");
        record = formToVendor(form, {
          id: existing.id,
          vendorCode: existing.vendorCode,
          status: existing.status === "inactive" ? "inactive" : "active",
          createdBy: existing.createdBy,
          createdDate: existing.createdDate,
          updatedBy: CURRENT_USER,
          updatedDate: today,
        });
        saveVendors(list.map((v) => (v.id === record.id ? record : v)));
      } else {
        record = formToVendor(form, {
          id: nextId(list),
          vendorCode,
          status: "active",
          createdBy: CURRENT_USER,
          createdDate: today,
          updatedBy: CURRENT_USER,
          updatedDate: today,
        });
        saveVendors([...list, record]);
      }

      const ledger = syncVendorLedger(record, { parentGroupId });
      if (!ledger) {
        throw new Error("Vendor saved but linked ledger could not be created.");
      }

      showToast(
        isEdit ? "Vendor and ledger updated." : "Vendor created with linked ledger.",
        "success",
      );
      setTimeout(() => {
        onSaved?.(ledger.id, ledger.parentAccountId ?? parentGroupId);
        onClose();
      }, 500);
    } catch (saveErr) {
      showToast(
        saveErr instanceof Error ? saveErr.message : "Failed to save vendor.",
        "error",
      );
      setSaving(false);
    }
  };

  if (!mounted || !ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (isEdit ? !canEdit : !canCreate) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-medium text-amber-800">Access restricted</p>
        <p className="text-xs text-muted-foreground">
          You do not have permission to {isEdit ? "edit" : "create"} vendor ledgers.
        </p>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 rounded-lg"
            onClick={onClose}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className={ACCOUNTS_PAGE_TITLE_CLASS}>
              {isEdit ? "Edit Vendor" : "Add Vendor"}
            </h1>
            <p className={ACCOUNTS_PAGE_SUBTITLE_CLASS}>
              Accounts → Chart of Accounts → Sundry Creditors → {isEdit ? "Edit" : "Add"}
              {vendorCode ? (
                <>
                  {" · "}
                  <span className="font-mono font-semibold text-brand-700">{vendorCode}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-brand-600 text-xs text-white hover:bg-brand-700"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-3.5 w-3.5" /> {isEdit ? "Update" : "Save"}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="w-full rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <VendorForm form={form} onChange={setForm} vendorCode={vendorCode} />
        </div>
      </div>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
