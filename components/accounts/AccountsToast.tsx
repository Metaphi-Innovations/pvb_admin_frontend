"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCOUNTS_TOAST } from "@/lib/accounts/accounts-toast-messages";

export interface AccountsToastState {
  msg: string;
  type: "success" | "error";
}

export function AccountsToast({
  toast,
  onDismiss,
}: {
  toast: AccountsToastState | null;
  onDismiss: () => void;
}) {
  if (!toast) return null;
  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
      role="status"
      aria-live="polite"
    >
      {toast.type === "success" ? (
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 flex-shrink-0" />
      )}
      <span>{toast.msg}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-1 p-0.5 rounded hover:bg-white/20"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function useAccountsToast(autoDismissMs = 3200) {
  const [toast, setToast] = useState<AccountsToastState | null>(null);

  const showToast = useCallback((msg: string, type: AccountsToastState["type"] = "success") => {
    setToast({ msg, type });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const showCreated = useCallback((entity: string) => showToast(ACCOUNTS_TOAST.created(entity)), [showToast]);
  const showUpdated = useCallback((entity: string) => showToast(ACCOUNTS_TOAST.updated(entity)), [showToast]);
  const showSavedDraft = useCallback((entity: string) => showToast(ACCOUNTS_TOAST.savedDraft(entity)), [showToast]);
  const showPosted = useCallback((entity: string) => showToast(ACCOUNTS_TOAST.posted(entity)), [showToast]);
  const showCancelled = useCallback((entity: string) => showToast(ACCOUNTS_TOAST.cancelled(entity)), [showToast]);
  const showDeleted = useCallback((entity: string) => showToast(ACCOUNTS_TOAST.deleted(entity)), [showToast]);
  const showExportCompleted = useCallback(() => showToast(ACCOUNTS_TOAST.exportCompleted), [showToast]);
  const showValidationError = useCallback(() => showToast(ACCOUNTS_TOAST.validationError, "error"), [showToast]);
  const showSaveFailed = useCallback(() => showToast(ACCOUNTS_TOAST.saveFailed, "error"), [showToast]);
  const showLedgerCreatedSelected = useCallback(() => showToast(ACCOUNTS_TOAST.ledgerCreatedSelected), [showToast]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), autoDismissMs);
    return () => window.clearTimeout(t);
  }, [toast, autoDismissMs]);

  return {
    toast,
    showToast,
    dismissToast,
    showCreated,
    showUpdated,
    showSavedDraft,
    showPosted,
    showCancelled,
    showDeleted,
    showExportCompleted,
    showValidationError,
    showSaveFailed,
    showLedgerCreatedSelected,
  };
}
