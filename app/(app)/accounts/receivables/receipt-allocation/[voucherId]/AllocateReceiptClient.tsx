"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsSummaryCards } from "@/components/accounts/AccountsSummaryCards";
import { AccountsTableScroll } from "@/components/accounts/AccountsTable";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { ACCOUNTS_ACTION_BUTTON_CLASS } from "@/lib/accounts/accounts-typography";
import {
  applyReceiptAllocation,
  getReceiptAllocationByVoucherId,
  getOpenInvoicesForCustomer,
} from "@/lib/accounts/receivables-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { Button } from "@/components/ui/button";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export default function AllocateReceiptClient() {
  const params = useParams();
  const router = useRouter();
  const voucherId = Number(params.voucherId);

  const record = useMemo(
    () => (Number.isFinite(voucherId) ? getReceiptAllocationByVoucherId(voucherId) : undefined),
    [voucherId],
  );

  const openInvoices = useMemo(
    () => (record?.customerId ? getOpenInvoicesForCustomer(record.customerId) : []),
    [record],
  );

  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!record) return;
    const sel: Record<number, boolean> = {};
    const amt: Record<number, string> = {};
    for (const line of record.lines) {
      sel[line.invoiceId] = true;
      amt[line.invoiceId] = String(line.amount);
    }
    setSelected(sel);
    setAmounts(amt);
  }, [record]);

  if (!record) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb(
          "Receivables",
          "Receipt Allocation",
          "/accounts/receivables/receipt-allocation",
        )}
        title="Receipt Not Found"
        description="Unable to load receipt for allocation."
        layout="standard"
      >
        <div className="accounts-table-empty py-8">
          <Link
            href="/accounts/receivables/receipt-allocation"
            className="text-xs text-brand-600 hover:underline"
          >
            Back to Receipt Allocation
          </Link>
        </div>
      </AccountsPageShell>
    );
  }

  const totalAllocated = openInvoices.reduce((s, inv) => {
    if (!selected[inv.invoiceId]) return s;
    const v = Number(amounts[inv.invoiceId] || 0);
    return s + (Number.isFinite(v) ? v : 0);
  }, 0);

  const remaining = Math.max(0, record.receiptAmount - totalAllocated);

  const toggleInvoice = (invoiceId: number, outstanding: number) => {
    setSelected((prev) => {
      const next = { ...prev, [invoiceId]: !prev[invoiceId] };
      if (next[invoiceId] && !amounts[invoiceId]) {
        setAmounts((a) => ({
          ...a,
          [invoiceId]: String(
            Math.min(outstanding, remaining + Number(amounts[invoiceId] || 0)),
          ),
        }));
      }
      return next;
    });
  };

  const saveAllocation = () => {
    const allocations = openInvoices
      .filter((inv) => selected[inv.invoiceId] && Number(amounts[inv.invoiceId] || 0) > 0)
      .map((inv) => ({
        invoiceId: inv.invoiceId,
        amount: Number(amounts[inv.invoiceId] || 0),
      }));

    const err = applyReceiptAllocation(voucherId, allocations);
    if (err) {
      setError(err);
      return;
    }
    router.push(`/accounts/receivables/receipt-allocation?customer=${record.customerId}`);
  };

  return (
    <AccountsPageShell
      breadcrumbs={[
        ...accountsBreadcrumb(
          "Receivables",
          "Receipt Allocation",
          "/accounts/receivables/receipt-allocation",
        ),
        { label: record.receiptNo },
      ]}
      title="Allocate Receipt"
      description={`Allocate ${record.receiptNo} against open invoices for ${record.customerName}.`}
      actions={
        <div className="flex items-center gap-1.5">
          <Link href="/accounts/receivables/outstanding">
            <Button variant="outline" size="sm" className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "gap-1")}>
              <ArrowLeft className="w-3.5 h-3.5" /> Outstanding
            </Button>
          </Link>
          <Link href="/accounts/receivables/receipt-allocation">
            <Button variant="outline" size="sm" className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "gap-1")}>
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
          </Link>
        </div>
      }
      layout="standard"
      footer={
        <div className="px-3 py-1.5 flex items-center justify-between gap-4 bg-muted/10">
          <div className="flex gap-4 text-[11px]">
            <span>
              Total Allocated: <strong>{formatMoney(totalAllocated)}</strong>
            </span>
            <span>
              Remaining Unallocated: <strong>{formatMoney(remaining)}</strong>
            </span>
          </div>
          <Button
            size="sm"
            className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "bg-brand-600 hover:bg-brand-700 text-white")}
            onClick={saveAllocation}
          >
            Save Allocation
          </Button>
        </div>
      }
    >
      <AccountsSummaryCards
        className="border-0 border-b rounded-none"
        items={[
          { label: "Receipt No", value: record.receiptNo },
          { label: "Receipt Date", value: record.receiptDate },
          { label: "Customer", value: record.customerName },
          { label: "Bank / Cash", value: record.bankAccount },
          { label: "Receipt Amount", value: formatMoney(record.receiptAmount) },
          { label: "Already Allocated", value: formatMoney(record.allocatedAmount) },
          { label: "Balance To Allocate", value: formatMoney(record.unallocatedAmount) },
        ]}
      />

      {error && <p className="px-3 py-1.5 text-xs text-red-600">{error}</p>}

      <AccountsTableScroll>
        <table className="accounts-table w-full min-w-[960px]">
          <thead>
            <tr>
              {[
                "Select",
                "Invoice No",
                "Invoice Date",
                "Due Date",
                "Invoice Amt",
                "Already Paid",
                "Outstanding",
                "Allocation",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {openInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="accounts-table-empty">
                  No open invoices for this customer.
                </td>
              </tr>
            ) : (
              openInvoices.map((inv) => (
                <tr key={inv.invoiceId} className="accounts-table-row">
                  <td>
                    <Checkbox
                      checked={!!selected[inv.invoiceId]}
                      onCheckedChange={() => toggleInvoice(inv.invoiceId, inv.outstanding)}
                    />
                  </td>
                  <td>
                    <span className="font-mono text-xs font-semibold text-brand-700">
                      {inv.invoiceNo}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs tabular-nums">{inv.invoiceDate}</span>
                  </td>
                  <td>
                    <span className="text-xs tabular-nums">{inv.dueDate}</span>
                  </td>
                  <td className="text-right">
                    <span className="text-xs tabular-nums">{formatMoney(inv.invoiceAmount)}</span>
                  </td>
                  <td className="text-right">
                    <span className="text-xs tabular-nums">{formatMoney(inv.paidAmount)}</span>
                  </td>
                  <td className="text-right">
                    <span className="text-xs tabular-nums font-semibold">
                      {formatMoney(inv.outstanding)}
                    </span>
                  </td>
                  <td>
                    <AccountsMoneyInput
                      className="h-8 text-xs w-28"
                      disabled={!selected[inv.invoiceId]}
                      value={amounts[inv.invoiceId] ?? ""}
                      onChange={(v) =>
                        setAmounts((a) => ({ ...a, [inv.invoiceId]: String(v) }))
                      }
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AccountsTableScroll>
    </AccountsPageShell>
  );
}
