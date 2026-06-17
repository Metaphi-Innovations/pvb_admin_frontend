"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Download, Trash2, Upload } from "lucide-react";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { InvoiceLinesEditor } from "./components/InvoiceLinesEditor";
import {
  calculateInvoiceTotals,
  createEmptyLine,
  canEditInvoice,
  createInvoice,
  customerToInvoiceFields,
  getCustomersForInvoice,
  getInvoiceById,
  getProductsForInvoice,
  updateInvoice,
  type InvoiceAttachment,
  type InvoiceStatus,
} from "./invoices-data";
import { formatINR, INVOICES_BREADCRUMB, INVOICES_LIST_PATH } from "./invoice-utils";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-border/60 p-4 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

export default function InvoiceFormPageClient({ invoiceId }: { invoiceId?: number }) {
  const router = useRouter();
  const isEdit = invoiceId != null;
  const customers = useMemo(() => getCustomersForInvoice(), []);
  const products = useMemo(() => getProductsForInvoice(), []);

  const [invoiceNo, setInvoiceNo] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerGst, setCustomerGst] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState([createEmptyLine()]);
  const [attachments, setAttachments] = useState<InvoiceAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDueDate(d.toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    if (!isEdit || invoiceId == null) return;
    const rec = getInvoiceById(invoiceId);
    if (!rec) {
      router.replace(INVOICES_LIST_PATH);
      return;
    }
    if (!canEditInvoice(rec)) {
      router.replace(`${INVOICES_LIST_PATH}/${invoiceId}`);
      return;
    }
    setInvoiceNo(rec.invoiceNo);
    setCustomerId(rec.customerId ? String(rec.customerId) : "");
    setCustomerName(rec.customerName);
    setCustomerMobile(rec.customerMobile);
    setCustomerEmail(rec.customerEmail);
    setCustomerGst(rec.customerGst);
    setBillingAddress(rec.billingAddress);
    setInvoiceDate(rec.invoiceDate);
    setDueDate(rec.dueDate);
    setReferenceNo(rec.referenceNo);
    setRemarks(rec.remarks);
    setLines(rec.lineItems.length ? rec.lineItems : [createEmptyLine()]);
    setAttachments(rec.attachments);
  }, [isEdit, invoiceId, router]);

  const totals = useMemo(() => calculateInvoiceTotals(lines), [lines]);

  const onCustomerChange = (id: string) => {
    setCustomerId(id);
    const c = customers.find((x) => x.id === Number(id));
    if (c) {
      const f = customerToInvoiceFields(c);
      setCustomerName(f.customerName);
      setCustomerMobile(f.customerMobile);
      setCustomerEmail(f.customerEmail);
      setCustomerGst(f.customerGst);
      setBillingAddress(f.billingAddress);
    }
  };

  const handleFile = (file: File, docName: string) => {
    const reader = new FileReader();
    reader.onload = () => {
      setAttachments((prev) => [
        ...prev,
        {
          id: `att-${Date.now()}`,
          documentName: docName || file.name,
          fileName: file.name,
          dataUrl: reader.result as string,
          uploadedAt: new Date().toISOString(),
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const buildInput = (invoiceStatus: InvoiceStatus) => ({
    invoiceDate,
    dueDate,
    referenceNo: referenceNo.trim(),
    remarks: remarks.trim(),
    customerId: customerId ? Number(customerId) : null,
    customerName: customerName.trim(),
    customerMobile: customerMobile.trim(),
    customerEmail: customerEmail.trim(),
    customerGst: customerGst.trim(),
    billingAddress: billingAddress.trim(),
    lineItems: lines.filter((l) => l.productName || l.productId),
    attachments,
    invoiceStatus,
  });

  const submit = (asDraft: boolean) => {
    setError(null);
    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }
    const validLines = lines.filter((l) => l.productName || l.productId);
    if (validLines.length === 0) {
      setError("Add at least one product or service line.");
      return;
    }
    try {
      const status: InvoiceStatus = asDraft ? "draft" : "sent";
      if (isEdit && invoiceId != null) {
        updateInvoice(invoiceId, buildInput(status));
        router.push(`${INVOICES_LIST_PATH}/${invoiceId}`);
      } else {
        const rec = createInvoice(buildInput(status));
        router.push(`${INVOICES_LIST_PATH}/${rec.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save invoice.");
    }
  };

  return (
    <AccountsFormLayout
      title={isEdit ? "Edit Invoice" : "Create Invoice"}
      breadcrumb={[...INVOICES_BREADCRUMB]}
      code={invoiceNo || undefined}
      footer={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push(INVOICES_LIST_PATH)}>
            Cancel
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => submit(true)}>
            Save as Draft
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={() => submit(false)}>
            {isEdit ? "Save & Send" : "Create & Send"}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8 items-start">
        <div className="lg:col-span-2 space-y-4">
          <Section title="Customer Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Customer from Master *</Label>
                <Select value={customerId || "manual"} onValueChange={(v) => (v === "manual" ? setCustomerId("") : onCustomerChange(v))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual" className="text-xs">Manual entry</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                        {c.customerCode} — {c.customerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Customer Name *</Label>
                <Input className="h-8 text-xs" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mobile Number</Label>
                <Input className="h-8 text-xs" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email ID</Label>
                <Input className="h-8 text-xs" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">GST Number</Label>
                <Input className="h-8 text-xs" value={customerGst} onChange={(e) => setCustomerGst(e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Billing Address</Label>
                <Textarea className="min-h-[56px] text-xs resize-none" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
              </div>
            </div>
          </Section>

          <Section title="Invoice Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Invoice No.</Label>
                <Input className="h-8 text-xs bg-muted/30" disabled value={isEdit ? invoiceNo : "Auto-generated"} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Invoice Date</Label>
                <Input type="date" className="h-8 text-xs" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input type="date" className="h-8 text-xs" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Reference Number</Label>
                <Input className="h-8 text-xs" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
              </div>
            </div>
          </Section>

          <Section title="Products / Services">
            <InvoiceLinesEditor lines={lines} products={products} onChange={setLines} />
          </Section>

          <Section title="Attachments">
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1 flex-1 min-w-[140px]">
                <Label className="text-xs">Document Name</Label>
                <Input id="inv-doc-name" className="h-8 text-xs" placeholder="e.g. Purchase Order" />
              </div>
              <label className="inline-flex items-center gap-1.5 h-8 px-3 text-xs border rounded-md cursor-pointer hover:bg-muted/40">
                <Upload className="w-3.5 h-3.5" />
                Upload
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const name = (document.getElementById("inv-doc-name") as HTMLInputElement)?.value;
                    handleFile(f, name);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {attachments.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 py-1.5 px-2 border rounded text-xs">
                    <span className="font-medium">{att.documentName}</span>
                    <span className="text-muted-foreground truncate flex-1">{att.fileName}</span>
                    {att.dataUrl && (
                      <>
                        <button type="button" className="p-1 hover:bg-muted rounded" onClick={() => window.open(att.dataUrl, "_blank")}>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a href={att.dataUrl} download={att.fileName} className="p-1 hover:bg-muted rounded">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </>
                    )}
                    <button
                      type="button"
                      className="p-1 hover:bg-red-50 text-red-600 rounded"
                      onClick={() => setAttachments((p) => p.filter((a) => a.id !== att.id))}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Remarks">
            <Textarea className="min-h-[72px] text-xs resize-none" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Invoice remarks…" />
          </Section>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="lg:sticky lg:top-20">
          <div className="bg-white rounded-lg border border-border/60 p-4 space-y-2 text-xs shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Summary</h2>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">{formatINR(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-medium tabular-nums text-amber-800">{formatINR(totals.discountTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax Amount</span>
              <span className="font-medium tabular-nums">{formatINR(totals.taxAmount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-semibold text-sm">
              <span>Grand Total</span>
              <span className="tabular-nums text-brand-700">{formatINR(totals.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </AccountsFormLayout>
  );
}
