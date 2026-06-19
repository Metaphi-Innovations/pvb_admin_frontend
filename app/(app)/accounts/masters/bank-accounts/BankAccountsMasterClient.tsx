"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { loadBankAccounts, addBankAccount } from "@/lib/accounts/bank-accounts-data";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";

export default function BankAccountsMasterClient() {
  const [records, setRecords] = useState(loadBankAccounts());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    bankName: "",
    accountNumber: "",
    ifsc: "",
    branch: "",
    accountType: "Current" as const,
  });

  const save = () => {
    if (!form.bankName.trim() || !form.accountNumber.trim()) return;
    addBankAccount({ ...form, coaLedgerId: null });
    setRecords(loadBankAccounts());
    setShowForm(false);
    setForm({ bankName: "", accountNumber: "", ifsc: "", branch: "", accountType: "Current" });
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Masters", "Bank Accounts")}
      title="Bank Accounts"
      description="Operational bank accounts linked to COA Bank Accounts ledgers."
      actions={
        <Button size="sm" className="h-8 text-xs bg-brand-600 text-white gap-1" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Bank Account
        </Button>
      }
      layout="split"
    >
      <div className="flex-1 overflow-auto min-h-0">
        {showForm && (
          <div className="border-b border-border/60 bg-muted/10 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Bank Name</Label>
                <Input className="h-8 text-xs" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Account Number</Label>
                <Input className="h-8 text-xs font-mono" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">IFSC</Label>
                <Input className="h-8 text-xs font-mono" value={form.ifsc} onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Branch</Label>
                <Input className="h-8 text-xs" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs bg-brand-600 text-white" onClick={save}>Save</Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}
        <table className="w-full text-table">
          <thead className="bg-muted/20 border-b border-border/60 sticky top-0">
            <tr>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Bank</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Account No.</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">IFSC</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20">
                <td className="px-4 py-2.5 text-xs font-medium">{r.bankName}</td>
                <td className="px-4 py-2.5 text-xs font-mono">{r.accountNumber}</td>
                <td className="px-4 py-2.5 text-xs font-mono">{r.ifsc || "—"}</td>
                <td className="px-4 py-2.5 text-xs">{r.accountType}</td>
                <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AccountsPageShell>
  );
}
