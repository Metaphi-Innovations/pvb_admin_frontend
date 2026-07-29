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
  ledgerToForm,
  validateLedgerForm,
  type LedgerFormValues,
} from "../chart-of-accounts-data";
import type { ChartOfAccount, CoaNodeId } from "../../../data";
import { GenericLedgerForm } from "../components/GenericLedgerForm";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { useClientMounted } from "@/lib/use-client-mounted";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { dispatchCoaChanged } from "@/lib/accounts/coa-events";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";
import { resolveCoaLedgerBehavior } from "@/lib/accounts/coa-ledger-behavior";
import {
  isAddLedgerBlocked,
  STATUTORY_NO_MANUAL_LEDGER_REASON,
} from "@/lib/accounts/coa-add-ledger-policy";
import { resolveCoaMasterLink } from "@/lib/accounts/coa-master-link";
import { useCoaNavigation } from "@/components/accounts/CoaNavigationContext";
import { LedgerService, type LedgerDetailDto } from "@/services/ledger.service";
import { chartOfAccountsKeys } from "@/hooks/accounts/use-chart-of-accounts";
import { useQueryClient } from "@tanstack/react-query";

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

function coaReturnHref(nodeId?: CoaNodeId | null): string {
  if (nodeId != null) return `${CHART_OF_ACCOUNTS_HREF}?node=${nodeId}`;
  return CHART_OF_ACCOUNTS_HREF;
}

function toApiBalanceType(side: string): "DEBIT" | "CREDIT" {
  return side === "Credit" ? "CREDIT" : "DEBIT";
}

function normalizeAmount(raw: string): string {
  const n = Number(String(raw).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) return "0.00";
  return n.toFixed(2);
}

function resolveLedgerOpeningBalance(
  detail: LedgerDetailDto,
  financialYearId?: string,
) {
  if (financialYearId) {
    const match = detail.openingBalances?.find(
      (row) => row.financialYearId === financialYearId,
    );
    if (match) return match;
  }
  return detail.openingBalance ?? detail.openingBalances?.[0] ?? null;
}

export interface AccountsGenericLedgerFormClientProps {
  mode: "add" | "edit";
  ledgerId?: CoaNodeId | string;
  parentGroupId?: CoaNodeId | null;
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
  const { records: apiRecords, refreshRecords } = useCoaNavigation();
  const queryClient = useQueryClient();

  const records = apiRecords;
  const [active, setActive] = useState<ChartOfAccount | null>(null);
  const [form, setForm] = useState<LedgerFormValues>(DEFAULT_LEDGER_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState("");
  const [parentGroupLocked, setParentGroupLocked] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [ready, setReady] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [statutoryBlocked, setStatutoryBlocked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;

    const bootstrap = async () => {
      if (mode === "edit") {
        const row = records.find(
          (r) =>
            r.nodeLevel === "ledger" &&
            (r.id === ledgerId || (typeof ledgerId === "string" && r.apiNodeId === ledgerId)),
        );
        if (!row) {
          if (records.length === 0) return;
          setNotFound(true);
          setReady(true);
          return;
        }

        const masterLink = resolveCoaMasterLink(row, records);
        if (masterLink?.category === "bank") {
          const parentId = row.parentAccountId;
          const returnTo =
            parentId != null
              ? `${CHART_OF_ACCOUNTS_HREF}?node=${parentId}`
              : CHART_OF_ACCOUNTS_HREF;
          router.replace(
            `/accounts/banking/bank-accounts/${masterLink.sourceId}/edit?source=chart-of-accounts&returnTo=${encodeURIComponent(returnTo)}`,
          );
          return;
        }

        if (!canEditLedger(row, records)) {
          setNotFound(true);
          setReady(true);
          return;
        }

        try {
          const [detail, currentFy] = await Promise.all([
            LedgerService.view(row.apiNodeId ?? String(row.id)),
            LedgerService.getCurrentFinancialYear(),
          ]);
          const openingBalanceRow = resolveLedgerOpeningBalance(
            detail,
            currentFy?.financialYearId,
          );
          if (cancelled) return;
          setActive(row);
          setForm({
            ...ledgerToForm(row),
            ledgerName: detail.ledgerName || row.accountName,
            alias: detail.aliasName ?? row.alias ?? "",
            description: detail.description ?? row.description ?? "",
            openingBalance:
              openingBalanceRow?.amount ?? String(row.openingBalance ?? "0"),
            balanceType:
              String(openingBalanceRow?.balanceType ?? "").toUpperCase() === "CREDIT"
                ? "Credit"
                : row.balanceType === "Credit"
                  ? "Credit"
                  : "Debit",
            billWiseAccounting: Boolean(detail.billWiseOutstanding),
            gstApplicable: Boolean(detail.gstApplicable),
            tdsApplicable: Boolean(detail.tdsApplicable),
            defaultTdsSection: detail.tdsSectionId ?? "",
            costCenterApplicable: Boolean(detail.costCenterApplicable),
          });
          setPreviewCode(detail.ledgerCode || row.accountCode);
          setParentGroupLocked(true);
          setReady(true);
        } catch {
          if (cancelled) return;
          setActive(row);
          setForm(ledgerToForm(row));
          setPreviewCode(row.accountCode);
          setParentGroupLocked(true);
          setReady(true);
        }
        return;
      }

      const parent =
        parentGroupId != null ? records.find((r) => r.id === parentGroupId) : undefined;

      if (parent && isAddLedgerBlocked(parent, records)) {
        setStatutoryBlocked(true);
        setFormError(STATUTORY_NO_MANUAL_LEDGER_REASON);
        setReady(true);
        router.replace(coaReturnHref(parent.id));
        return;
      }

      const lockedParent =
        parent && canAddLedgerUnder(parent, records) && !isAddLedgerBlocked(parent, records)
          ? parentGroupId!
          : null;
      const cashParent =
        parent != null &&
        lockedParent != null &&
        resolveCoaLedgerBehavior(parent, records).kind === "cash";

      setForm({
        ...DEFAULT_LEDGER_FORM,
        ...(lockedParent != null
          ? {
              parentGroupId: lockedParent,
              balanceType: cashParent
                ? "Debit"
                : defaultBalanceTypeForParent(records, lockedParent),
              billWiseAccounting: cashParent
                ? false
                : DEFAULT_LEDGER_FORM.billWiseAccounting,
            }
          : {}),
      });
      setParentGroupLocked(lockedParent != null);
      if (parent && lockedParent == null) {
        setFormError(describeInvalidLedgerParentMessage(parent, records));
      }

      try {
        const code = await LedgerService.previewNumber();
        if (!cancelled) setPreviewCode(code || "LED-······");
      } catch {
        if (!cancelled) setPreviewCode("LED-······");
      }
      if (!cancelled) setReady(true);
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [mounted, mode, ledgerId, parentGroupId, router, records]);

  const goBack = () => {
    const nodeId =
      mode === "edit"
        ? active?.id ?? active?.parentAccountId
        : form.parentGroupId ?? parentGroupId;
    router.push(coaReturnHref(nodeId ?? null));
  };

  const handleSave = async () => {
    if (!allowed) {
      setToast({ msg: "You do not have permission to save this ledger.", type: "error" });
      return;
    }
    const err = validateLedgerForm(form, records, active?.id);
    if (err) {
      setFormError(err);
      setToast({ msg: err, type: "error" });
      return;
    }
    if (!form.parentGroupId) {
      setFormError("Please select a Parent Group.");
      return;
    }

    setSaving(true);
    try {
      const amount = normalizeAmount(form.openingBalance);
      const fy = await LedgerService.getCurrentFinancialYear();
      const openingBalance =
        fy?.financialYearId && Number(amount) > 0
          ? {
              financialYearId: fy.financialYearId,
              amount,
              balanceType: toApiBalanceType(form.balanceType),
              effectiveDate: new Date().toISOString().slice(0, 10),
              narration: form.description?.trim() || null,
            }
          : undefined;

      let savedId: CoaNodeId;

      const parentNode = records.find((r) => r.id === form.parentGroupId);
      const apiParentNodeId = parentNode?.apiNodeId || String(form.parentGroupId);

      if (mode === "add") {
        const created = await LedgerService.create({
          ledgerName: form.ledgerName.trim(),
          aliasName: form.alias?.trim() || null,
          accountSubGroupId: apiParentNodeId,
          description: form.description?.trim() || null,
          gstApplicable: form.gstApplicable,
          tdsApplicable: form.tdsApplicable,
          tdsSectionId: form.tdsApplicable && form.defaultTdsSection ? form.defaultTdsSection : null,
          costCenterApplicable: form.costCenterApplicable,
          billWiseOutstanding: form.billWiseAccounting,
          openingBalance,
        });
        savedId = form.parentGroupId ?? 0;
        setPreviewCode(created.ledgerCode);
      } else if (active) {
        await LedgerService.update(active.apiNodeId ?? String(active.id), {
          ledgerName: form.ledgerName.trim(),
          aliasName: form.alias?.trim() || null,
          accountSubGroupId: apiParentNodeId,
          description: form.description?.trim() || null,
          gstApplicable: form.gstApplicable,
          tdsApplicable: form.tdsApplicable,
          tdsSectionId: form.tdsApplicable && form.defaultTdsSection ? form.defaultTdsSection : null,
          costCenterApplicable: form.costCenterApplicable,
          billWiseOutstanding: form.billWiseAccounting,
        });
        if (fy?.financialYearId) {
          const latest = await LedgerService.view(active.apiNodeId ?? String(active.id));
          const existing = latest.openingBalance ?? latest.openingBalances?.[0];
          if (existing?.openingBalanceId) {
            await LedgerService.updateOpeningBalance(
              active.apiNodeId ?? String(active.id),
              existing.openingBalanceId,
              {
                amount,
                balanceType: toApiBalanceType(form.balanceType),
                effectiveDate: new Date().toISOString().slice(0, 10),
                narration: form.description?.trim() || null,
              },
            );
          } else if (Number(amount) > 0) {
            await LedgerService.createOpeningBalance(active.apiNodeId ?? String(active.id), {
              financialYearId: fy.financialYearId,
              amount,
              balanceType: toApiBalanceType(form.balanceType),
              effectiveDate: new Date().toISOString().slice(0, 10),
              narration: form.description?.trim() || null,
            });
          }
        }
        savedId = active.id;
      } else {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.all });
      refreshRecords();
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
        const parentId = form.parentGroupId ?? parentGroupId;
        const parentNode =
          parentId != null ? records.find((r) => r.id === parentId) : undefined;
        const returnToCashGroup =
          mode === "add" &&
          parentNode != null &&
          resolveCoaLedgerBehavior(parentNode, records).kind === "cash";
        router.push(coaReturnHref(returnToCashGroup ? parentId! : savedId));
      }, 700);
    } catch (saveErr) {
      setToast({
        msg: saveErr instanceof Error ? saveErr.message : "Failed to save ledger.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "add" ? "Add Generic Ledger" : "Edit Generic Ledger";
  const breadcrumb =
    mode === "add"
      ? "Accounts → Chart of Accounts → Add Generic Ledger"
      : "Accounts → Chart of Accounts → Edit Generic Ledger";

  const codeBadge = useMemo(() => {
    if (mode === "edit" && active) return previewCode || active.accountCode;
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

  if (statutoryBlocked) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-xs text-muted-foreground max-w-sm">
          {STATUTORY_NO_MANUAL_LEDGER_REASON}
        </p>
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
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : mode === "add" ? "Save" : "Update"}
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
