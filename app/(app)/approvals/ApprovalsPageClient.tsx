"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckSquare, Search, FileText } from "lucide-react";
import { useClientMounted } from "@/lib/use-client-mounted";
import {
  loadAllPendingAccountsApprovals,
  loadAccountsApprovalQueue,
  type AccountsApprovalQueueItem,
} from "@/lib/accounts/accounts-approvals-queue";
import { AccountsVoucherStatusBadge } from "@/components/accounts/AccountsVoucherStatusBadge";
import { AccountsDocumentWorkflowSection } from "@/components/accounts/AccountsDocumentWorkflowSection";
import { getDocumentWorkflow } from "@/lib/accounts/accounts-workflow-persist";
import type { AccountsVoucherCategory } from "@/lib/accounts/accounts-maker-checker";
import { cn } from "@/lib/utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { getInvoiceById } from "@/app/(app)/accounts/invoices/invoices-data";
import { getPurchaseInvoiceById } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { getCreditNoteById } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { getDebitNoteById } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { getVoucherById } from "@/app/(app)/accounts/vouchers/voucher-data";
import { creditNoteImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import { journalEntryImpact } from "@/lib/accounts/ledger-impact-previews";

function ReviewDetail({
  item,
  onRefresh,
}: {
  item: AccountsApprovalQueueItem;
  onRefresh: () => void;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const workflow = getDocumentWorkflow(item.category, item.documentId);

  const impactLines = useMemo(() => {
    if (item.category === "credit_note") {
      const note = getCreditNoteById(item.documentId);
      if (!note) return [];
      return creditNoteImpactResolved({
        customerName: note.customerName,
        taxable: Math.max(0, note.currentCreditAmount - (note.taxCreditAmount ?? 0)),
        taxAmount: note.taxCreditAmount ?? 0,
        grandTotal: note.currentCreditAmount,
      });
    }
    if (item.category === "journal_entry" || item.category === "receipt_voucher" || item.category === "payment_voucher") {
      const v = getVoucherById(item.documentId);
      if (!v) return [];
      return journalEntryImpact(v.lines);
    }
    return [];
  }, [item, refreshKey]);

  const narration = useMemo(() => {
    if (item.category === "sales_invoice") return getInvoiceById(item.documentId)?.remarks;
    if (item.category === "purchase_invoice") return getPurchaseInvoiceById(item.documentId)?.remarks;
    if (item.category === "credit_note") return getCreditNoteById(item.documentId)?.remarks;
    if (item.category === "debit_note") return getDebitNoteById(item.documentId)?.remarks;
    return getVoucherById(item.documentId)?.narration;
  }, [item, refreshKey]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {item.categoryLabel}
            </p>
            <h2 className="text-base font-semibold text-foreground mt-0.5">{item.documentNo}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{item.title}</p>
          </div>
          <AccountsVoucherStatusBadge workflow={workflow} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Party</p>
            <p className="font-medium mt-0.5">{item.party}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Date</p>
            <p className="font-medium mt-0.5">{item.date}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Amount</p>
            <p className="font-medium mt-0.5 tabular-nums">{item.amountLabel}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Maker</p>
            <p className="font-medium mt-0.5">{item.makerName}</p>
          </div>
        </div>
        {narration && (
          <div className="pt-2 border-t border-border/60">
            <p className="text-[10px] uppercase text-muted-foreground">Narration / Remarks</p>
            <p className="text-xs mt-0.5">{narration}</p>
          </div>
        )}
      </div>

      {impactLines.length > 0 && (
        <LedgerImpactPreview title="Ledger Impact Preview" lines={impactLines} />
      )}

      <AccountsDocumentWorkflowSection
        category={item.category}
        documentId={item.documentId}
        workflow={workflow}
        reviewMode
        onUpdated={() => {
          setRefreshKey((k) => k + 1);
          onRefresh();
        }}
      />

      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
          <Link href={item.viewHref}>Open Full Voucher</Link>
        </Button>
      </div>
    </div>
  );
}

export default function ApprovalsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useClientMounted();
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const category = searchParams.get("category") as AccountsVoucherCategory | null;
  const documentId = Number(searchParams.get("id") || 0);

  const myQueue = useMemo(
    () => (mounted ? loadAccountsApprovalQueue() : []),
    [mounted, refreshKey],
  );
  const allPending = useMemo(
    () => (mounted ? loadAllPendingAccountsApprovals() : []),
    [mounted, refreshKey],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return allPending;
    const q = search.toLowerCase();
    return allPending.filter(
      (item) =>
        item.documentNo.toLowerCase().includes(q) ||
        item.party.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q),
    );
  }, [allPending, search]);

  const selected =
    category && documentId
      ? allPending.find((i) => i.category === category && i.documentId === documentId) ??
        myQueue.find((i) => i.category === category && i.documentId === documentId)
      : undefined;

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <PageHeader
          title="Approvals"
          description="Review pending Accounts vouchers assigned to you via User Management approver mapping."
        />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-4 items-start">
          <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Accounts Vouchers</p>
                <span className="text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-md px-2 py-0.5">
                  {myQueue.length} for you
                </span>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 text-xs pl-8"
                  placeholder="Search voucher, party…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto divide-y divide-border/60">
              {!mounted ? (
                <p className="text-xs text-muted-foreground p-4">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground p-6 text-center">No pending approvals.</p>
              ) : (
                filtered.map((item) => {
                  const active = selected?.id === item.id;
                  const mine = myQueue.some((m) => m.id === item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        router.push(`/approvals?category=${item.category}&id=${item.documentId}`)
                      }
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors",
                        active && "bg-brand-50/60 border-l-2 border-brand-600",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{item.documentNo}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{item.categoryLabel}</p>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.party}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-xs font-semibold tabular-nums">{item.amountLabel}</span>
                          {mine && (
                            <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
                              Action required
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="min-w-0">
            {selected ? (
              <ReviewDetail item={selected} onRefresh={() => setRefreshKey((k) => k + 1)} />
            ) : (
              <div className="border border-border rounded-xl bg-white p-10 text-center shadow-sm">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Select a voucher to review</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Checker view shows voucher details, ledger impact, and approval actions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
