"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  applyReceiptAllocation,
  getReceiptAllocationByVoucherId,
  getOpenInvoicesForCustomer,
} from "@/lib/accounts/receivables-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

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
        breadcrumbs={accountsBreadcrumb("Receivables", "Receipt Allocation", "/accounts/receivables/receipt-allocation")}
        title="Receipt Not Found"
        description="Unable to load receipt for allocation."
        layout="standard"
      >
        <div className="p-8 text-center">
          <Link href="/accounts/receivables/receipt-allocation" className="text-sm text-brand-600 hover:underline">
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
        setAmounts((a) => ({ ...a, [invoiceId]: String(Math.min(outstanding, remaining + Number(amounts[invoiceId] || 0))) }));
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
    router.push("/accounts/receivables/receipt-allocation");
  };

  return (
    <AccountsPageShell
      breadcrumbs={[
        ...accountsBreadcrumb("Receivables", "Receipt Allocation", "/accounts/receivables/receipt-allocation"),
        { label: record.receiptNo },
      ]}
      title="Allocate Receipt"
      description={`Allocate ${record.receiptNo} against open invoices for ${record.customerName}.`}
      actions={
        <Link href="/accounts/receivables/receipt-allocation">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
        </Link>
      }
      layout="standard"
      footer={
        <div className="px-4 py-3 flex items-center justify-between gap-4 bg-muted/10">
          <div className="flex gap-6 text-xs">
            <span>Total Allocated: <strong>{formatMoney(totalAllocated)}</strong></span>
            <span>Remaining Unallocated: <strong>{formatMoney(remaining)}</strong></span>
          </div>
          <Button size="sm" onClick={saveAllocation}>Save Allocation</Button>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-lg border border-border/60 bg-muted/5 p-4 text-xs">
          {[
            ["Receipt No", record.receiptNo],
            ["Receipt Date", record.receiptDate],
            ["Customer", record.customerName],
            ["Bank / Cash Account", record.bankAccount],
            ["Receipt Amount", formatMoney(record.receiptAmount)],
            ["Already Allocated", formatMoney(record.allocatedAmount)],
            ["Balance To Allocate", formatMoney(record.unallocatedAmount)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</p>
              <p className="font-medium mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="accounts-table w-full text-table">
            <thead className="border-b">
              <tr>
                {["Select", "Invoice No", "Invoice Date", "Due Date", "Invoice Amt", "Already Paid", "Outstanding", "Allocation"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {openInvoices.map((inv) => (
                <tr key={inv.invoiceId} className="border-b border-border/40">
                  <td className="px-3 py-2.5">
                    <Checkbox
                      checked={!!selected[inv.invoiceId]}
                      onCheckedChange={() => toggleInvoice(inv.invoiceId, inv.outstanding)}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono font-semibold">{inv.invoiceNo}</td>
                  <td className="px-3 py-2.5 text-xs">{inv.invoiceDate}</td>
                  <td className="px-3 py-2.5 text-xs">{inv.dueDate}</td>
                  <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatMoney(inv.invoiceAmount)}</td>
                  <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatMoney(inv.paidAmount)}</td>
                  <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatMoney(inv.outstanding)}</td>
                  <td className="px-3 py-2.5">
                    <Input
                      type="number"
                      min={0}
                      max={inv.outstanding}
                      step="0.01"
                      className="h-8 text-xs w-28"
                      disabled={!selected[inv.invoiceId]}
                      value={amounts[inv.invoiceId] ?? ""}
                      onChange={(e) => setAmounts((a) => ({ ...a, [inv.invoiceId]: e.target.value }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AccountsPageShell>
  );
}
