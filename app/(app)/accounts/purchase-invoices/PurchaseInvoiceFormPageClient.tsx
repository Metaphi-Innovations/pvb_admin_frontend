"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { PurchaseInvoiceDirectForm } from "./PurchaseInvoiceDirectForm";
import { PurchaseInvoicePageShell } from "./PurchaseInvoicePageShell";
import { PurchaseInvoiceGrnForm } from "./PurchaseInvoiceGrnForm";
import type { PurchaseSourceType } from "./purchase-invoice-types";
import {
  purchaseInvoiceReturnPath,
  withReturnTo,
} from "./purchase-invoice-nav";

export default function PurchaseInvoiceFormPageClient({ invoiceId }: { invoiceId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast, showToast, dismissToast } = useAccountsToast();
  const isEdit = Boolean(invoiceId);
  const initialMode = searchParams.get("mode");
  const preselectedGrnId = searchParams.get("grnId");
  const listHref = useMemo(
    () => purchaseInvoiceReturnPath(searchParams.get("returnTo")),
    [searchParams],
  );

  const [sourceType, setSourceType] = useState<PurchaseSourceType>(() =>
    initialMode === "direct" ? "direct_purchase" : "from_grn",
  );

  useEffect(() => {
    if (searchParams.get("mode") === "manual") {
      const grnId = searchParams.get("grnId");
      const base = grnId
        ? `/accounts/purchase-invoices/new?mode=grn&grnId=${grnId}`
        : "/accounts/purchase-invoices/new?mode=grn";
      router.replace(withReturnTo(base, listHref));
    }
  }, [router, searchParams, listHref]);

  useEffect(() => {
    if (!invoiceId) return;
    router.replace(withReturnTo(`/accounts/purchase-invoices/${invoiceId}`, listHref));
  }, [invoiceId, router, listHref]);

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
        <PurchaseInvoiceDirectForm
          listHref={listHref}
          onCancel={() => router.push(listHref)}
          showToast={(msg) => showToast(msg)}
        />
        <AccountsToast toast={toast} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <PurchaseInvoiceGrnForm
      preselectedGrnId={preselectedGrnId}
      sourceType={sourceType}
      listHref={listHref}
      onSourceTypeChange={(v) => {
        setSourceType(v);
        if (v === "direct_purchase") {
          router.replace(
            withReturnTo("/accounts/purchase-invoices/new?mode=direct", listHref),
          );
        }
      }}
      toast={toast}
      showToast={showToast}
      dismissToast={dismissToast}
    />
  );
}
