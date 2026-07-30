"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Save, X, XCircle } from "lucide-react";
import {
  CustomerForm,
  DEFAULT_CUSTOMER_FORM,
  customerRecordToFormValues,
  formValuesToCreatePayload,
  formValuesToUpdatePayload,
  validateCustomerForm,
  type CustomerFormValues,
} from "@/app/(app)/masters/customers/components/CustomerForm";
import { ensureCustomerLedgerFromMaster } from "@/lib/accounts/party-ledger-sync";
import {
  loadPartyMasterAccounting,
  persistPartyMasterAccounting,
} from "@/lib/accounts/party-master-accounting-sync";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useFY, fyOpeningDateIso } from "@/lib/fy-store";
import {
  ACCOUNTS_PAGE_SUBTITLE_CLASS,
  ACCOUNTS_PAGE_TITLE_CLASS,
} from "@/lib/accounts/accounts-typography";
import { useCreateCustomer, useCustomer, useUpdateCustomer } from "@/hooks/masters";
import { useCustomerTypeDropdown } from "@/hooks/masters/use-customer-types";
import { CustomerListService } from "@/services/customer-list.service";
import { useQueryClient } from "@tanstack/react-query";
import { chartOfAccountsKeys } from "@/hooks/accounts/use-chart-of-accounts";
import type { CoaNodeId } from "../../../../data";

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

export interface AccountsSundryDebtorCustomerFormProps {
  parentGroupId: CoaNodeId;
  /** Customer master UUID from Accounts API (preferred) */
  customerId?: string | number;
  onClose: () => void;
  onSaved?: (ledgerId: CoaNodeId, parentGroupId: CoaNodeId | null) => void;
}

/**
 * Customer Master form embedded in Chart of Accounts.
 * Loads/saves through the Masters Customer API so every field (type, TDS, branches, bank) populates.
 */
export default function AccountsSundryDebtorCustomerFormClient({
  parentGroupId,
  customerId,
  onClose,
  onSaved,
}: AccountsSundryDebtorCustomerFormProps) {
  const mounted = useClientMounted();
  const canCreate = useCanCoa("create");
  const canEdit = useCanCoa("edit");
  const { selectedFY } = useFY();
  const customerUuid = customerId != null ? String(customerId) : "";
  const isEdit = Boolean(customerUuid);

  const { data: customer, isLoading: customerLoading, isError: customerError } = useCustomer(
    isEdit ? customerUuid : null,
  );
  const {
    data: customerTypeOptions = [],
    isLoading: customerTypesLoading,
  } = useCustomerTypeDropdown();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<CustomerFormValues>(() => ({
    ...DEFAULT_CUSTOMER_FORM,
    openingBalanceDate: fyOpeningDateIso(selectedFY.id),
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const [accountingLoading, setAccountingLoading] = useState(false);
  const [customerCode, setCustomerCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);

  const customerTypes = useMemo(
    () =>
      customerTypeOptions.map((ct) => ({
        id: String(ct.id),
        customerType: ct.customerType,
        customerInitialCode: (ct as { customerInitialCode?: string }).customerInitialCode,
        documents: (ct as { documents?: unknown[] }).documents ?? [],
      })),
    [customerTypeOptions],
  );

  useEffect(() => {
    if (isEdit || !form.customerType) {
      setCustomerCode("");
      return;
    }

    function extractPreviewSequence(previewNumber: string): string {
      const parts = previewNumber.split("-");
      return parts.length > 1 ? parts[parts.length - 1] : previewNumber;
    }

    const selectedType = customerTypes.find((ct) => ct.id === form.customerType);

    let cancelled = false;
    setCodeLoading(true);
    setCustomerCode("");

    CustomerListService.previewNumber()
      .then((code) => {
        if (!cancelled) {
          const sequence = extractPreviewSequence(code);
          setCustomerCode(`${selectedType?.customerInitialCode || ""}-${sequence}`);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch customer code preview", err);
        if (!cancelled) {
          setCustomerCode("");
        }
      })
      .finally(() => {
        if (!cancelled) setCodeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.customerType, customerTypes, isEdit]);

  useEffect(() => {
    if (!isEdit || !customer) return;
    let cancelled = false;
    setAccountingLoading(true);
    loadPartyMasterAccounting({ kind: "customer", partyId: customer.customerUuid })
      .then((accounting) => {
        if (cancelled) return;
        setForm((prev) => ({
          ...customerRecordToFormValues(customer),
          ...accounting,
          openingBalance: accounting.openingBalance ?? prev?.openingBalance ?? "0",
          balanceType: accounting.balanceType ?? (prev?.balanceType || "Debit"),
          openingBalanceDate: accounting.openingBalanceDate ?? (prev?.openingBalanceDate || fyOpeningDateIso(selectedFY.id)),
          billWiseAccounting: accounting.billWiseAccounting ?? prev?.billWiseAccounting ?? true,
          accountingDescription: accounting.accountingDescription ?? prev?.accountingDescription ?? "",
        }));
      })
      .finally(() => {
        if (!cancelled) setAccountingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, customer]);

  useEffect(() => {
    if (!isEdit || !customerError) return;
    setToast({ msg: "Customer not found.", type: "error" });
    const t = setTimeout(() => onClose(), 1200);
    return () => clearTimeout(t);
  }, [isEdit, customerError, onClose]);

  const allowed = isEdit ? canEdit : canCreate;
  const saving = createCustomer.isPending || updateCustomer.isPending;
  const ready =
    mounted &&
    !customerTypesLoading &&
    !accountingLoading &&
    (!isEdit || (!customerLoading && Boolean(customer)));

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    if (!allowed || !form) return;
    const e = validateCustomerForm(form, !isEdit);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setToast({
        msg: e.requiredDocuments || "Please fix the errors before saving.",
        type: "error",
      });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const accounting = {
      openingBalance: form.openingBalance,
      balanceType: (form.balanceType === "Credit" ? "Credit" : "Debit") as "Debit" | "Credit",
      openingBalanceDate: form.openingBalanceDate,
      billWiseAccounting: form.billWiseAccounting !== false,
      accountingDescription: form.accountingDescription,
    };

    if (isEdit && customer) {
      const payload = formValuesToUpdatePayload(form);
      updateCustomer.mutate(
        { id: customer.customerUuid, payload, branches: form.branches },
        {
          onSuccess: async () => {
            try {
              const ledgerId = await persistPartyMasterAccounting({
                kind: "customer",
                partyId: customer.customerUuid,
                accounting,
              });
              if (form.status === "active") {
                const mainBranch =
                  form.branches.find((b) => b.isMain) ??
                  form.branches.find((b) => b.branchName === "Main Branch") ??
                  form.branches[0];
                ensureCustomerLedgerFromMaster({
                  id: customer.id,
                  customerUuid: customer.customerUuid,
                  customerName: form.customerName,
                  customerCode: customer.customerCode,
                  status: form.status,
                  gstApplicable: form.gstRegistered,
                  gstin: form.gstRegistered ? form.gstin : "",
                  pan: form.pan,
                  tdsApplicable: form.tdsApplicable,
                  creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : 0,
                  paymentTerms: "",
                  address: mainBranch?.billingAddress?.address ?? "",
                  districtName:
                    mainBranch?.billingAddress?.district ??
                    mainBranch?.billingAddress?.city ??
                    "",
                  stateName: mainBranch?.billingAddress?.state ?? "",
                  pincode: mainBranch?.billingAddress?.pincode ?? "",
                  branches: form.branches,
                  salesManName: "",
                  mobile: form.mobile,
                  countryCode: form.countryCode,
                  email: form.email,
                });
              }
              await queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.all });
              onSaved?.(parentGroupId, parentGroupId);
              setToast({ msg: "Customer and ledger updated.", type: "success" });
              setTimeout(() => onClose(), 700);
            } catch (err) {
              setToast({
                msg:
                  err instanceof Error
                    ? err.message
                    : "Customer saved but accounting sync failed.",
                type: "error",
              });
              setTimeout(() => setToast(null), 3200);
            }
          },
          onError: (err) => {
            setToast({
              msg: err instanceof Error ? err.message : "Failed to update customer.",
              type: "error",
            });
            setTimeout(() => setToast(null), 3200);
          },
        },
      );
      return;
    }

    const payload = formValuesToCreatePayload(form);
    createCustomer.mutate(
      { payload, branches: form.branches },
      {
        onSuccess: async (created) => {
          try {
            const uuid = created?.customerUuid ?? "";
            const code = created?.customerCode ?? "";
            const numericId = Number(created?.id ?? 0);
            let ledgerId: string | null = null;
            if (uuid) {
              ledgerId = await persistPartyMasterAccounting({
                kind: "customer",
                partyId: String(uuid),
                accounting,
              });
            }
            if (form.status === "active" && uuid) {
              const mainBranch =
                form.branches.find((b) => b.isMain) ??
                form.branches.find((b) => b.branchName === "Main Branch") ??
                form.branches[0];
              ensureCustomerLedgerFromMaster({
                id: numericId,
                customerUuid: String(uuid),
                customerName: form.customerName,
                customerCode: String(code),
                status: form.status,
                gstApplicable: form.gstRegistered,
                gstin: form.gstRegistered ? form.gstin : "",
                pan: form.pan,
                tdsApplicable: form.tdsApplicable,
                creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : 0,
                paymentTerms: "",
                address: mainBranch?.billingAddress?.address ?? "",
                districtName:
                  mainBranch?.billingAddress?.district ??
                  mainBranch?.billingAddress?.city ??
                  "",
                stateName: mainBranch?.billingAddress?.state ?? "",
                pincode: mainBranch?.billingAddress?.pincode ?? "",
                branches: form.branches,
                salesManName: "",
                mobile: form.mobile,
                countryCode: form.countryCode,
                email: form.email,
              });
            }
            await queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.all });
            onSaved?.(parentGroupId, parentGroupId);
            setToast({ msg: "Customer created with linked ledger.", type: "success" });
            setTimeout(() => onClose(), 700);
          } catch (err) {
            setToast({
              msg:
                err instanceof Error
                  ? err.message
                  : "Customer created but accounting sync failed.",
              type: "error",
            });
            setTimeout(() => setToast(null), 3200);
          }
        },
        onError: (err) => {
          setToast({
            msg: err instanceof Error ? err.message : "Failed to create customer.",
            type: "error",
          });
          setTimeout(() => setToast(null), 3200);
        },
      },
    );
  };

  if (!mounted) return null;

  if (!allowed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          You do not have permission to {isEdit ? "edit" : "create"} customer ledgers.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading customer…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      {toast ? <Toast toast={toast} onDismiss={() => setToast(null)} /> : null}
      <div className="flex-shrink-0 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Chart of Accounts
            </button>
            <h1 className={ACCOUNTS_PAGE_TITLE_CLASS}>
              {isEdit ? "Edit Customer Ledger" : "Add Customer Ledger"}
            </h1>
            <p className={ACCOUNTS_PAGE_SUBTITLE_CLASS}>
              Accounts → Chart of Accounts → Sundry Debtors → {isEdit ? "Edit" : "Add"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <CustomerForm
          form={form}
          onChange={setForm}
          errors={errors}
          onClearError={clearErr}
          customerTypes={customerTypes as any}
          customerCode={isEdit ? (customer?.customerCode ?? "") : (customerCode || (codeLoading ? "Generating…" : ""))}
          isAdd={!isEdit}
        />
      </div>
    </div>
  );
}
