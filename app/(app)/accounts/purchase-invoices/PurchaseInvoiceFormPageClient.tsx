"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { PurchaseInvoiceDirectForm } from "./PurchaseInvoiceDirectForm";
import { PurchaseInvoicePageShell } from "./PurchaseInvoicePageShell";
import { PurchaseInvoiceGrnForm, SourceTypeSelector } from "./PurchaseInvoiceGrnForm";
import type { PurchaseSourceType } from "./purchase-invoice-types";

export default function PurchaseInvoiceFormPageClient({ invoiceId }: { invoiceId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast, showToast, dismissToast } = useAccountsToast();
  const isEdit = Boolean(invoiceId);
  const initialMode = searchParams.get("mode");
  const preselectedGrnId = searchParams.get("grnId");

  const [sourceType, setSourceType] = useState<PurchaseSourceType>(() =>
    initialMode === "direct" ? "direct_purchase" : "from_grn",
  );

  useEffect(() => {
    if (searchParams.get("mode") === "manual") {
      const grnId = searchParams.get("grnId");
      router.replace(
        grnId
          ? `/accounts/purchase-invoices/new?mode=grn&grnId=${grnId}`
          : "/accounts/purchase-invoices/new?mode=grn",
      );
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (!invoiceId) return;
    router.replace(`/accounts/purchase-invoices/${invoiceId}`);
  }, [invoiceId, router]);

  if (isEdit) {
    return (
      <>
        <PurchaseInvoicePageShell
          breadcrumbs={accountsBreadcrumb("Transactions", "Purchase Invoice")}
          title="Opening invoice"
          description="Posted purchase invoices cannot be edited. Cancel and recreate if needed."
        >
          <p className="text-xs text-muted-foreground">Redirecting to the invoice…</p>
        </PurchaseInvoicePageShell>
        <AccountsToast toast={toast} onDismiss={dismissToast} />
      </>
    );
  }

  if (sourceType === "direct_purchase") {
    return (
      <>
        <PurchaseInvoicePageShell
          breadcrumbs={accountsBreadcrumb("Transactions", "New Direct Purchase")}
          title="New Direct Purchase Invoice"
          description="Manual invoice entry for expenses and services. Posts to the selected expense ledger, GST, supplier, and Round Off Adjustment."
        >
          <div className="mb-2">
            <SourceTypeSelector
              value={sourceType}
              onChange={(v) => {
                setSourceType(v);
                if (v === "from_grn") {
                  router.replace("/accounts/purchase-invoices/new?mode=grn");
                }
              }}
            />
          </div>
          <PurchaseInvoiceDirectForm
            onCancel={() => router.push("/accounts/purchase-invoices")}
            showToast={(msg) => showToast(msg)}
          />
        </PurchaseInvoicePageShell>
        <AccountsToast toast={toast} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <PurchaseInvoiceGrnForm
      preselectedGrnId={preselectedGrnId}
      sourceType={sourceType}
      onSourceTypeChange={(v) => {
        setSourceType(v);
        if (v === "direct_purchase") {
          router.replace("/accounts/purchase-invoices/new?mode=direct");
        }
      }}
      toast={toast}
      showToast={showToast}
      dismissToast={dismissToast}
    />
  );
}
