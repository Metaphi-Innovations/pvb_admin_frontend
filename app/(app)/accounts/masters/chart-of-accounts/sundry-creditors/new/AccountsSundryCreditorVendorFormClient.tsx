"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Save, X, XCircle } from "lucide-react";
import { VendorForm } from "@/app/(app)/masters/vendors/components/VendorForm";
import {
  DEFAULT_VENDOR_FORM,
  formToVendor,
  validateVendorForm,
  type VendorFormValues,
} from "@/app/(app)/masters/vendors/vendor-data";
import {
  createAccountsVendorLedger,
  generateAccountsVendorCode,
  nextAccountsVendorId,
  loadAccountsVendorLedgers,
  todayStr,
} from "@/lib/accounts/accounts-vendor-ledger";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { useClientMounted } from "@/lib/use-client-mounted";
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
  onClose: () => void;
  onSaved?: (ledgerId: number, parentGroupId: number | null) => void;
}

/**
 * Exact Supplier Master form (Basic Details / Contact / Bank & Commercial / Documents).
 * Rendered inside Accounts Chart of Accounts main panel — sidebar stays visible.
 * Saves only to Accounts storage (never ERP Supplier Master).
 */
export default function AccountsSundryCreditorVendorFormClient({
  parentGroupId,
  onClose,
  onSaved,
}: AccountsSundryCreditorVendorFormProps) {
  const mounted = useClientMounted();
  const canCreate = useCanCoa("create");

  const [form, setForm] = useState<VendorFormValues>(DEFAULT_VENDOR_FORM);
  const [vendorCode, setVendorCode] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!form.vendorType) {
      setVendorCode("");
      return;
    }
    setVendorCode(generateAccountsVendorCode(form.vendorType));
  }, [form.vendorType]);

  const showToast = (msg: string, type: ToastState["type"]) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const handleSave = () => {
    if (!canCreate) {
      showToast("You do not have permission to create ledgers.", "error");
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
      const today = todayStr();
      const vendor = formToVendor(form, {
        id: nextAccountsVendorId(loadAccountsVendorLedgers()),
        vendorCode,
        status: "active",
        createdBy: ACCOUNTS_CURRENT_USER,
        createdDate: today,
        updatedBy: ACCOUNTS_CURRENT_USER,
        updatedDate: today,
      });

      const { ledger } = createAccountsVendorLedger(vendor, parentGroupId);
      showToast("Supplier ledger created in Accounts.", "success");
      setTimeout(() => {
        onSaved?.(ledger.id, ledger.parentAccountId);
        onClose();
      }, 500);
    } catch (saveErr) {
      showToast(
        saveErr instanceof Error ? saveErr.message : "Failed to save supplier ledger.",
        "error",
      );
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
            <h1 className={ACCOUNTS_PAGE_TITLE_CLASS}>Add Supplier</h1>
            <p className={ACCOUNTS_PAGE_SUBTITLE_CLASS}>
              Accounts → Chart of Accounts → Sundry Creditors → Add
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
            Discard
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-brand-600 text-xs text-white hover:bg-brand-700"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-3.5 w-3.5" /> Save
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
