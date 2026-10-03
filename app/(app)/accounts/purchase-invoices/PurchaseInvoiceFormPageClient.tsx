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
import {
  PurchaseInvoiceService,
  mapPurchaseInvoiceDetailToRecord,
} from "@/services/purchase-invoice.service";

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
    initialMode === "direct" || isEdit ? "direct_purchase" : "from_grn",
  );
  const [editLoading, setEditLoading] = useState(isEdit);
  const [editError, setEditError] = useState<string | null>(null);
  const [editReady, setEditReady] = useState(!isEdit);

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
    let cancelled = false;
    (async () => {
      setEditLoading(true);
      setEditError(null);
      try {
        if (!PurchaseInvoiceService.isUuid(invoiceId)) {
          throw new Error("Invalid purchase invoice id.");
        }
        const dto = await PurchaseInvoiceService.getById(invoiceId);
        const record = mapPurchaseInvoiceDetailToRecord(dto);
        if (cancelled) return;
        if (record.sourceType !== "direct_purchase") {
          throw new Error("Only Direct Purchase drafts can be edited.");
        }
        if (String(record.backendStatus || "").toUpperCase() !== "DRAFT") {
          router.replace(withReturnTo(`/accounts/purchase-invoices/${invoiceId}`, listHref));
          return;
        }
        setSourceType("direct_purchase");
        setEditReady(true);
      } catch (e) {
        if (cancelled) return;
        setEditError(e instanceof Error ? e.message : "Failed to load draft.");
      } finally {
        if (!cancelled) setEditLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoiceId, router, listHref]);

  if (isEdit && editLoading) {
    return (
      <>
        <PurchaseInvoicePageShell
          breadcrumbs={accountsBreadcrumb("Transactions", "Edit Draft")}
          title="Loading draft…"
          description=""
        >
          <p className="text-xs text-muted-foreground">Opening Direct Purchase draft…</p>
        </PurchaseInvoicePageShell>
        <AccountsToast toast={toast} onDismiss={dismissToast} />
      </>
    );
  }

  if (isEdit && editError) {
    return (
      <>
        <PurchaseInvoicePageShell
          breadcrumbs={accountsBreadcrumb("Transactions", "Edit Draft")}
          title="Cannot edit invoice"
          description={editError}
        >
          <button
            type="button"
            className="text-sm text-brand-700 hover:underline"
            onClick={() => router.push(listHref)}
          >
            Back to list
          </button>
        </PurchaseInvoicePageShell>
        <AccountsToast toast={toast} onDismiss={dismissToast} />
      </>
    );
  }

  if (sourceType === "direct_purchase" && (!isEdit || editReady)) {
    return (
      <>
        <PurchaseInvoiceDirectForm
          invoiceId={invoiceId}
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
