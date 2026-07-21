"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Save, X, XCircle, ShieldAlert } from "lucide-react";
import {
  DEFAULT_LEDGER_FORM,
  canAddLedgerUnder,
  canEditLedger,
  defaultBalanceTypeForParent,
  describeInvalidLedgerParentMessage,
  formToLedger,
  generateLedgerCode,
  ledgerToForm,
  loadChartOfAccounts,
  saveChartOfAccounts,
  validateLedgerForm,
  type LedgerFormValues,
} from "../chart-of-accounts-data";
import { nextId, type ChartOfAccount } from "../../../data";
import { GenericLedgerForm } from "../components/GenericLedgerForm";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { useClientMounted } from "@/lib/use-client-mounted";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { dispatchCoaChanged } from "@/lib/accounts/coa-events";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";

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
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 flex-shrink-0" />
      )}
      {toast.msg}
      <button type="button" onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function coaReturnHref(nodeId?: number | null): string {
  if (nodeId != null) return `${CHART_OF_ACCOUNTS_HREF}?node=${nodeId}`;
  return CHART_OF_ACCOUNTS_HREF;
}

export interface AccountsGenericLedgerFormClientProps {
  mode: "add" | "edit";
  ledgerId?: number;
  parentGroupId?: number | null;
}

export default function AccountsGenericLedgerFormClient({
  mode,
  ledgerId,
  parentGroupId = null,
}: AccountsGenericLedgerFormClientProps) {
  const router = useRouter();
  const mounted = useClientMounted();
  const canCreate = useCanCoa("create");
  const canEditPerm = useCanCoa("edit");
  const allowed = mode === "add" ? canCreate : canEditPerm;

  const [records, setRecords] = useState<ChartOfAccount[]>([]);
  const [active, setActive] = useState<ChartOfAccount | null>(null);
  const [form, setForm] = useState<LedgerFormValues>(DEFAULT_LEDGER_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState("");
  const [parentGroupLocked, setParentGroupLocked] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [ready, setReady] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!mounted) return;
    const list = loadChartOfAccounts();
    setRecords(list);

    if (mode === "edit") {
      const row = list.find((r) => r.id === ledgerId && r.nodeLevel === "ledger");
      if (!row || !canEditLedger(row, list)) {
        setNotFound(true);
        setReady(true);
        return;
      }
      setActive(row);
      setForm(ledgerToForm(row));
      setPreviewCode(row.accountCode);
      setParentGroupLocked(true);
      setReady(true);
      return;
    }

    const parent =
      parentGroupId != null ? list.find((r) => r.id === parentGroupId) : undefined;
    const lockedParent =
      parent && canAddLedgerUnder(parent, list) ? parentGroupId! : null;

    setForm({
      ...DEFAULT_LEDGER_FORM,
      ...(lockedParent != null
        ? {
            parentGroupId: lockedParent,
            balanceType: defaultBalanceTypeForParent(list, lockedParent),
          }
        : {}),
    });
    setPreviewCode(generateLedgerCode(list));
    setParentGroupLocked(lockedParent != null);
    if (parent && lockedParent == null) {
      setFormError(describeInvalidLedgerParentMessage(parent, list));
    }
    setReady(true);
  }, [mounted, mode, ledgerId, parentGroupId]);

  const goBack = () => {
    const nodeId =
      mode === "edit"
        ? active?.id ?? active?.parentAccountId
        : form.parentGroupId ?? parentGroupId;
    router.push(coaReturnHref(nodeId ?? null));
  };

  const handleSave = () => {
    if (!allowed) {
      setToast({ msg: "You do not have permission to save this ledger.", type: "error" });
      return;
    }
    const list = loadChartOfAccounts();
    const err = validateLedgerForm(form, list, active?.id);
    if (err) {
      setFormError(err);
      setToast({ msg: err, type: "error" });
      return;
    }

    let savedId: number;
    const next = [...list];

    if (mode === "add") {
      const code = generateLedgerCode(next);
      const row = formToLedger(form, nextId(next), code, next);
      next.push(row);
      savedId = row.id;
    } else if (active) {
      const idx = next.findIndex((r) => r.id === active.id);
      if (idx < 0) return;
      next[idx] = formToLedger(form, active.id, active.accountCode, next, active);
      savedId = active.id;
    } else {
      return;
    }

    saveChartOfAccounts(next);
    setRecords(next);
    dispatchAccountsDataChanged("ledgers", {
      operation: mode === "add" ? "create" : "update",
      recordId: savedId,
    });
    dispatchCoaChanged();

    setToast({
      msg:
        mode === "add"
          ? "Generic ledger created successfully."
          : "Generic ledger updated successfully.",
      type: "success",
    });
    setTimeout(() => {
      router.push(coaReturnHref(savedId));
    }, 700);
  };

  const title = mode === "add" ? "Add Generic Ledger" : "Edit Generic Ledger";
  const breadcrumb =
    mode === "add"
      ? "Accounts → Chart of Accounts → Add Generic Ledger"
      : "Accounts → Chart of Accounts → Edit Generic Ledger";

  const codeBadge = useMemo(() => {
    if (mode === "edit" && active) return active.accountCode;
    return previewCode;
  }, [mode, active, previewCode]);

  if (!mounted || !ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (allowed === false) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
          <ShieldAlert className="h-6 w-6 text-amber-600" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Access restricted</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          You do not have permission to {mode === "add" ? "create" : "edit"} ledgers.
        </p>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goBack}>
          Back to Chart of Accounts
        </Button>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-sm text-muted-foreground">Ledger not found or cannot be edited.</p>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goBack}>
          Back to Chart of Accounts
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <div className="flex w-full flex-1 min-h-0 flex-col space-y-3">
        <div className="flex flex-shrink-0 items-center justify-between border-b pb-2.5 px-4 pt-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted flex-shrink-0"
              onClick={goBack}
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-foreground">{title}</h1>
              <p className="text-xs text-muted-foreground truncate">{breadcrumb}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] font-mono font-semibold px-2 py-1.5 rounded bg-brand-50 text-brand-700 hidden sm:inline">
              {codeBadge}
            </span>
            <Button
              variant="outline"
              className="h-9 text-xs font-semibold rounded-lg"
              onClick={goBack}
            >
              Cancel
            </Button>
            <Button
              className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
              onClick={handleSave}
            >
              <Save className="w-4 h-4" />
              {mode === "add" ? "Save" : "Update"}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 sm:px-4">
          <div className="w-full rounded-xl border border-border bg-white p-4 shadow-sm">
            <GenericLedgerForm
              mode={mode}
              form={form}
              formError={formError}
              previewCode={previewCode}
              records={records}
              active={active}
              parentGroupLocked={parentGroupLocked || mode === "edit"}
              onChange={(next) => {
                setFormError(null);
                setForm(next);
              }}
            />
          </div>
        </div>
      </div>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
