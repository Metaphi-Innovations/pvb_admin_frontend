"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, MoreHorizontal } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import {
  loadCollectionFollowUps,
  createCollectionFollowUp,
  updateCollectionFollowUp,
  getPostedSalesInvoices,
  type CollectionFollowUp,
  type CollectionFollowUpStatus,
} from "@/lib/accounts/receivables-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportCollectionStatusFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";

const STATUS_OPTIONS: CollectionFollowUpStatus[] = [
  "pending",
  "follow_up_due",
  "promise_to_pay",
  "partially_collected",
  "collected",
  "escalated",
];

export default function CollectionTrackingClient() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange();
  const [collectionStatus, setCollectionStatus] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const records = useMemo(() => loadCollectionFollowUps(), [refreshKey]);
  const customers = useMemo(() => loadCustomers(), []);
  const invoices = useMemo(() => getPostedSalesInvoices(), []);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (dateFrom && r.followUpDate < dateFrom) return false;
      if (dateTo && r.followUpDate > dateTo) return false;
      if (collectionStatus !== "all" && r.status !== collectionStatus) return false;
      return true;
    });
  }, [records, dateFrom, dateTo, collectionStatus]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CollectionFollowUp | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    invoiceId: "",
    followUpDate: new Date().toISOString().slice(0, 10),
    assignedTo: "Rajesh Sharma",
    contactPerson: "",
    phone: "",
    promiseToPayDate: "",
    promiseAmount: "",
    status: "pending" as CollectionFollowUpStatus,
    remarks: "",
    nextFollowUpDate: "",
  });

  const openAdd = () => {
    setEditing(null);
    setError("");
    setForm({
      customerId: "",
      invoiceId: "",
      followUpDate: new Date().toISOString().slice(0, 10),
      assignedTo: "Rajesh Sharma",
      contactPerson: "",
      phone: "",
      promiseToPayDate: "",
      promiseAmount: "",
      status: "pending",
      remarks: "",
      nextFollowUpDate: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (row: CollectionFollowUp) => {
    setEditing(row);
    setError("");
    setForm({
      customerId: String(row.customerId),
      invoiceId: row.invoiceId ? String(row.invoiceId) : "",
      followUpDate: row.followUpDate,
      assignedTo: row.assignedTo,
      contactPerson: row.contactPerson,
      phone: row.phone,
      promiseToPayDate: row.promiseToPayDate,
      promiseAmount: row.promiseAmount ? String(row.promiseAmount) : "",
      status: row.status,
      remarks: row.remarks,
      nextFollowUpDate: row.nextFollowUpDate,
    });
    setDialogOpen(true);
  };

  const customerInvoices = invoices.filter(
    (i) => form.customerId && i.customerId === Number(form.customerId),
  );

  const saveFollowUp = () => {
    const payload = {
      customerId: Number(form.customerId),
      invoiceId: form.invoiceId ? Number(form.invoiceId) : null,
      followUpDate: form.followUpDate,
      assignedTo: form.assignedTo,
      contactPerson: form.contactPerson,
      phone: form.phone,
      promiseToPayDate: form.promiseToPayDate,
      promiseAmount: form.promiseAmount ? Number(form.promiseAmount) : undefined,
      status: form.status,
      remarks: form.remarks,
      nextFollowUpDate: form.nextFollowUpDate,
    };

    const err = editing
      ? updateCollectionFollowUp(editing.id, payload)
      : createCollectionFollowUp(payload);

    if (err) {
      setError(err);
      return;
    }
    setDialogOpen(false);
    setRefreshKey((k) => k + 1);
  };

  const quickStatus = (row: CollectionFollowUp, status: CollectionFollowUpStatus) => {
    updateCollectionFollowUp(row.id, { status });
    setRefreshKey((k) => k + 1);
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Receivables", "Collection Tracking")}
      title="Collection Tracking"
      description="Track collection follow-ups against outstanding customers and invoices."
      actions={
        <Button size="sm" className="h-8 text-xs gap-1" onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Follow-up
        </Button>
      }
      filters={
        <ReportFilterRow>
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <ReportCollectionStatusFilter value={collectionStatus} onChange={setCollectionStatus} />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-1 overflow-auto min-h-0">
        <table className="accounts-table w-full text-table min-w-[1300px]">
          <thead className="border-b">
            <tr>
              {["Follow-up No", "Customer", "Outstanding", "Invoice", "Due Date", "Follow-up Date", "Assigned To", "Promise Date", "Promise Amt", "Status", "Remarks", ""].map((h) => (
                <th key={h || "act"} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((r) => (
              <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20">
                <td className="px-3 py-2.5 text-xs font-mono font-semibold">{r.followUpNo}</td>
                <td className="px-3 py-2.5 text-xs font-medium">{r.customerName}</td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.outstandingAmount)}</td>
                <td className="px-3 py-2.5 text-xs font-mono">{r.invoiceNo || "—"}</td>
                <td className="px-3 py-2.5 text-xs">{r.dueDate || "—"}</td>
                <td className="px-3 py-2.5 text-xs">{r.followUpDate}</td>
                <td className="px-3 py-2.5 text-xs">{r.assignedTo}</td>
                <td className="px-3 py-2.5 text-xs">{r.promiseToPayDate || "—"}</td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums">{r.promiseAmount ? formatMoney(r.promiseAmount) : "—"}</td>
                <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-2.5 text-xs max-w-[180px] truncate" title={r.remarks}>{r.remarks}</td>
                <td className="px-3 py-2.5 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => openEdit(r)}>Edit Follow-up</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => quickStatus(r, "promise_to_pay")}>Mark Promise To Pay</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => quickStatus(r, "collected")}>Mark Collected</DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/accounts/vouchers?tab=receipt&customer=${r.customerId}`}>Record Receipt</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/accounts/receivables/outstanding/${r.customerId}`}>View Customer Outstanding</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Follow-up" : "Add Follow-up"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs">Customer *</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm((f) => ({ ...f, customerId: v, invoiceId: "" }))}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.customerName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Invoice No (optional)</Label>
              <Select value={form.invoiceId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, invoiceId: v === "none" ? "" : v }))}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="All outstanding" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All outstanding</SelectItem>
                  {customerInvoices.map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>{i.invoiceNo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Follow-up Date *</Label>
                <Input type="date" className="h-8 text-xs mt-1" value={form.followUpDate} onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Assigned To *</Label>
                <Select value={form.assignedTo} onValueChange={(v) => setForm((f) => ({ ...f, assignedTo: v }))}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Rajesh Sharma", "Priya Singh", "Amit Verma", "Neha Patel", "Suresh Kumar"].map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Contact Person</Label>
                <Input className="h-8 text-xs mt-1" value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input className="h-8 text-xs mt-1" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Promise To Pay Date</Label>
                <Input type="date" className="h-8 text-xs mt-1" value={form.promiseToPayDate} onChange={(e) => setForm((f) => ({ ...f, promiseToPayDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Promise Amount</Label>
                <Input type="number" className="h-8 text-xs mt-1" value={form.promiseAmount} onChange={(e) => setForm((f) => ({ ...f, promiseAmount: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Follow-up Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as CollectionFollowUpStatus }))}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s.replaceAll("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Next Follow-up Date</Label>
                <Input type="date" className="h-8 text-xs mt-1" value={form.nextFollowUpDate} onChange={(e) => setForm((f) => ({ ...f, nextFollowUpDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Remarks</Label>
              <Textarea className="text-xs mt-1 min-h-[72px]" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={saveFollowUp}>{editing ? "Save Changes" : "Add Follow-up"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccountsPageShell>
  );
}
