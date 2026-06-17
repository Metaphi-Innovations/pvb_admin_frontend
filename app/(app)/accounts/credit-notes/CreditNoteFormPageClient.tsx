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
import { Plus, Trash2 } from "lucide-react";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { SearchableSelect } from "./components/SearchableSelect";
import {
  applyReturnQtyToLines,
  buildReferenceFromInvoice,
  buildReferenceFromSalesOrder,
  computeLineCreditAmount,
  createCreditNote,
  createEmptyCreditLine,
  CREDIT_REASONS,
  getCreditNoteById,
  getCustomersForCreditNote,
  listInvoicesForReference,
  listOrdersForReference,
  normalizeCreditLine,
  previewToFormInput,
  updateCreditNote,
  type CreditNoteLine,
  type CreditReferencePreview,
  type CreditReferenceType,
  type NoteWorkflowStatus,
} from "./credit-notes-data";
import { customerToInvoiceFields } from "../invoices/invoices-data";
import { CREDIT_NOTES_BREADCRUMB, CREDIT_NOTES_LIST_PATH, formatINR } from "./note-utils";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-border/60 p-4 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function CompactInfoCard({ rows }: { rows: { label: string; value: string }[] }) {
  const visible = rows.filter((r) => r.value.trim());
  if (!visible.length) return null;
  return (
    <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[11px]">
      {visible.map((r) => (
        <div key={r.label}>
          <span className="text-muted-foreground">{r.label}: </span>
          <span className="font-medium text-foreground">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function CreditNoteFormPageClient({ creditNoteId }: { creditNoteId?: number }) {
  const router = useRouter();
  const isEdit = creditNoteId != null;
  const customers = useMemo(() => getCustomersForCreditNote(), []);
  const invoices = useMemo(() => listInvoicesForReference(), []);
  const orders = useMemo(() => listOrdersForReference(), []);

  const [creditNoteNo, setCreditNoteNo] = useState("");
  const [creditNoteDate, setCreditNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState("");
  const [referenceType, setReferenceType] = useState<CreditReferenceType | "">("");
  const [referenceSelectionId, setReferenceSelectionId] = useState("");
  const [referencePreview, setReferencePreview] = useState<CreditReferencePreview | null>(null);
  const [sourceInvoiceId, setSourceInvoiceId] = useState<number | null>(null);
  const [sourceInvoiceNo, setSourceInvoiceNo] = useState("");
  const [sourceOrderId, setSourceOrderId] = useState<number | null>(null);
  const [sourceOrderNo, setSourceOrderNo] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [referenceTaxAmount, setReferenceTaxAmount] = useState("");
  const [alreadyAdjusted, setAlreadyAdjusted] = useState("0");
  const [lines, setLines] = useState<CreditNoteLine[]>([createEmptyCreditLine()]);
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: String(c.id),
        label: `${c.customerCode} — ${c.customerName}`,
        sub: [c.mobile, c.email].filter(Boolean).join(" · "),
      })),
    [customers],
  );

  const invoiceOptions = useMemo(
    () =>
      invoices.map((inv) => ({
        value: String(inv.id),
        label: inv.invoiceNo,
        sub: `${inv.customerName} · ${inv.invoiceDate} · ${formatINR(inv.grandTotal)}`,
      })),
    [invoices],
  );

  const orderOptions = useMemo(
    () =>
      orders.map((o) => ({
        value: String(o.id),
        label: o.soNumber,
        sub: `${o.customerName} · ${o.orderDate} · ${formatINR(o.totalAmount)}`,
      })),
    [orders],
  );

  const selectedCustomer = customers.find((c) => c.id === Number(customerId));

  const applyReferencePreview = (preview: CreditReferencePreview) => {
    setReferencePreview(preview);
    const pre = previewToFormInput(preview);
    setSourceInvoiceId(pre.sourceInvoiceId ?? null);
    setSourceInvoiceNo(pre.sourceInvoiceNo ?? "");
    setSourceOrderId(pre.sourceOrderId ?? null);
    setSourceOrderNo(pre.sourceOrderNo ?? "");
    if (pre.customerId) setCustomerId(String(pre.customerId));
    setOriginalAmount(String(pre.originalAmount ?? ""));
    setReferenceTaxAmount(String(preview.taxAmount ?? 0));
    setAlreadyAdjusted(String(pre.alreadyAdjustedAmount ?? 0));
    if (pre.lineItems?.length) {
      const normalized = pre.lineItems.map((l) => normalizeCreditLine(l));
      setLines(
        normalized.map((l) => ({
          ...l,
          creditAmount: computeLineCreditAmount(l, normalized, preview.alreadyAdjustedAmount),
        })),
      );
    }
  };

  const clearReference = () => {
    setReferenceSelectionId("");
    setReferencePreview(null);
    setSourceInvoiceId(null);
    setSourceInvoiceNo("");
    setSourceOrderId(null);
    setSourceOrderNo("");
    setReferenceTaxAmount("");
    setOriginalAmount("");
    setAlreadyAdjusted("0");
    setLines([createEmptyCreditLine()]);
  };

  const onReferenceTypeChange = (type: CreditReferenceType) => {
    setReferenceType(type);
    clearReference();
  };

  const onReferenceSelect = (id: string) => {
    setReferenceSelectionId(id);
    if (!id) {
      clearReference();
      return;
    }
    const preview =
      referenceType === "invoice"
        ? buildReferenceFromInvoice(Number(id))
        : referenceType === "sales_order"
          ? buildReferenceFromSalesOrder(Number(id))
          : null;
    if (preview) applyReferencePreview(preview);
  };

  useEffect(() => {
    if (!isEdit || creditNoteId == null) return;
    const rec = getCreditNoteById(creditNoteId);
    if (!rec) {
      router.replace(CREDIT_NOTES_LIST_PATH);
      return;
    }
    setCreditNoteNo(rec.creditNoteNo);
    setCreditNoteDate(rec.creditNoteDate);
    setCustomerId(rec.customerId ? String(rec.customerId) : "");
    setSourceInvoiceNo(rec.sourceInvoiceNo);
    setSourceOrderNo(rec.sourceOrderNo);
    setSourceInvoiceId(rec.sourceInvoiceId);
    setSourceOrderId(rec.sourceOrderId);
    setOriginalAmount(String(rec.originalAmount));
    setAlreadyAdjusted(String(rec.alreadyAdjustedAmount));
    const loadedLines = rec.lineItems.length
      ? rec.lineItems.map((l) => normalizeCreditLine(l))
      : [createEmptyCreditLine()];
    setLines(
      loadedLines.map((l) => ({
        ...l,
        creditAmount: computeLineCreditAmount(l, loadedLines, rec.alreadyAdjustedAmount),
      })),
    );
    setReason(rec.reason);
    setRemarks(rec.remarks);

    if (rec.sourceInvoiceId) {
      setReferenceType("invoice");
      setReferenceSelectionId(String(rec.sourceInvoiceId));
      const p = buildReferenceFromInvoice(rec.sourceInvoiceId);
      if (p) {
        setReferencePreview(p);
        setReferenceTaxAmount(String(p.taxAmount));
      }
    } else if (rec.sourceOrderId) {
      setReferenceType("sales_order");
      setReferenceSelectionId(String(rec.sourceOrderId));
      const p = buildReferenceFromSalesOrder(rec.sourceOrderId);
      if (p) {
        setReferencePreview(p);
        setReferenceTaxAmount(String(p.taxAmount));
      }
    } else if (rec.sourceInvoiceNo.trim()) {
      setReferenceType("invoice");
    } else if (rec.sourceOrderNo.trim()) {
      setReferenceType("sales_order");
    }
  }, [isEdit, creditNoteId, router]);

  const totalCredit = lines.reduce((s, l) => s + l.creditAmount, 0);
  const original = parseFloat(originalAmount) || totalCredit;

  const resolveCustomerName = (): string => {
    if (selectedCustomer) return customerToInvoiceFields(selectedCustomer).customerName;
    if (referencePreview?.customerName) return referencePreview.customerName;
    return "";
  };

  const alreadyAdjustedNum = parseFloat(alreadyAdjusted) || 0;

  const updateLine = (id: string, patch: Partial<CreditNoteLine>) => {
    if ("returnQty" in patch) {
      setLines((prev) => applyReturnQtyToLines(prev, id, patch.returnQty ?? 0, alreadyAdjustedNum));
      return;
    }
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const buildInput = (status: NoteWorkflowStatus) => ({
    creditNoteDate,
    customerId: customerId ? Number(customerId) : null,
    customerName: resolveCustomerName(),
    sourceInvoiceId,
    sourceInvoiceNo,
    sourceOrderId,
    sourceOrderNo,
    originalAmount: original,
    alreadyAdjustedAmount: parseFloat(alreadyAdjusted) || 0,
    lineItems: lines.filter((l) => l.productName || l.creditAmount > 0),
    reason,
    remarks,
    status,
  });

  const submit = (status: NoteWorkflowStatus) => {
    setError(null);
    try {
      if (isEdit && creditNoteId != null) {
        updateCreditNote(creditNoteId, buildInput(status));
        router.push(`${CREDIT_NOTES_LIST_PATH}/${creditNoteId}`);
      } else {
        const rec = createCreditNote(buildInput(status));
        router.push(`${CREDIT_NOTES_LIST_PATH}/${rec.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  };

  const customerCardRows = selectedCustomer
    ? [
        { label: "Name", value: selectedCustomer.customerName },
        { label: "Mobile", value: selectedCustomer.mobile ?? "" },
        { label: "Email", value: selectedCustomer.email ?? "" },
        { label: "GST", value: selectedCustomer.gstin ?? "" },
      ]
    : referencePreview
      ? [
          { label: "Name", value: referencePreview.customerName },
          { label: "Mobile", value: referencePreview.customerMobile },
          { label: "GST", value: referencePreview.customerGst },
        ]
      : [];

  return (
    <AccountsFormLayout
      title={isEdit ? "Edit Credit Note" : "Create Credit Note"}
      breadcrumb={[...CREDIT_NOTES_BREADCRUMB]}
      code={creditNoteNo || undefined}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push(CREDIT_NOTES_LIST_PATH)}>
            Cancel
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => submit("draft")}>
            Save as Draft
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={() => submit("pending_approval")}>
            Save & Submit
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8 items-start">
        <div className="lg:col-span-2 space-y-4">
          <Section title="Customer">
            <SearchableSelect
              label="Customer"
              value={customerId}
              onChange={setCustomerId}
              options={customerOptions}
              placeholder="Search and select customer…"
              required
            />
            <CompactInfoCard rows={customerCardRows} />
          </Section>

          <Section title="Reference Details">
            <p className="text-[10px] text-muted-foreground -mt-1">
              Choose one reference type and select a single invoice or sales order. Linked invoice / SO and line details load automatically.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Reference Type</Label>
                <Select
                  value={referenceType || "none"}
                  onValueChange={(v) => v !== "none" && onReferenceTypeChange(v as CreditReferenceType)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select reference type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">— None —</SelectItem>
                    <SelectItem value="invoice" className="text-xs">Invoice</SelectItem>
                    <SelectItem value="sales_order" className="text-xs">Sales Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {referenceType === "invoice" && (
                <SearchableSelect
                  label="Select Invoice"
                  value={referenceSelectionId}
                  onChange={onReferenceSelect}
                  options={invoiceOptions}
                  placeholder="Search invoice…"
                />
              )}
              {referenceType === "sales_order" && (
                <SearchableSelect
                  label="Select Sales Order"
                  value={referenceSelectionId}
                  onChange={onReferenceSelect}
                  options={orderOptions}
                  placeholder="Search sales order…"
                />
              )}
            </div>

            {referencePreview && (
              <CompactInfoCard
                rows={
                  referencePreview.referenceType === "invoice"
                    ? [
                        { label: "Customer", value: referencePreview.customerName },
                        { label: "Invoice Date", value: referencePreview.documentDate },
                        { label: "Invoice No.", value: referencePreview.sourceInvoiceNo },
                        { label: "Sales Order No.", value: referencePreview.sourceOrderNo },
                        { label: "Invoice Amount", value: formatINR(referencePreview.originalAmount) },
                        { label: "GST / Tax", value: formatINR(referencePreview.taxAmount) },
                        { label: "Already Credited", value: formatINR(referencePreview.alreadyAdjustedAmount) },
                      ]
                    : [
                        { label: "Customer", value: referencePreview.customerName },
                        { label: "SO Date", value: referencePreview.documentDate },
                        { label: "Sales Order No.", value: referencePreview.sourceOrderNo },
                        { label: "Invoice No.", value: referencePreview.sourceInvoiceNo },
                        { label: "Order Amount", value: formatINR(referencePreview.originalAmount) },
                        { label: "GST / Tax", value: formatINR(referencePreview.taxAmount) },
                      ]
                }
              />
            )}
          </Section>

          <Section title="Credit Note Details">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Credit Note No.</Label>
                <Input className="h-8 text-xs bg-muted/30" disabled value={isEdit ? creditNoteNo : "Auto-generated"} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Credit Note Date *</Label>
                <Input type="date" className="h-8 text-xs" value={creditNoteDate} onChange={(e) => setCreditNoteDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {CREDIT_REASONS.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Original Amount (from reference)</Label>
                <Input type="number" className="h-8 text-xs bg-muted/20" readOnly value={originalAmount} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">GST / Tax (from reference)</Label>
                <Input type="number" className="h-8 text-xs bg-muted/20" readOnly value={referenceTaxAmount} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Already Credited (from reference)</Label>
                <Input type="number" className="h-8 text-xs bg-muted/20" readOnly value={alreadyAdjusted} />
              </div>
            </div>
          </Section>

          <Section title="Products / Lines">
            <p className="text-[10px] text-muted-foreground -mt-1">
              Enter return qty — credit amount is calculated from rate, discount, and GST, capped by the line balance after amounts already credited on the reference.
            </p>
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setLines([...lines, createEmptyCreditLine()])}>
                <Plus className="w-3 h-3" /> Add Row
              </Button>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-xs min-w-[960px]">
                <thead className="bg-muted/30 border-b">
                  <tr>
                    {["Product", "Qty", "Rate", "GST %", "GST Amt", "Line Amt", "Return Qty", "Credit Amt", ""].map((h) => (
                      <th key={h || "x"} className="px-2 py-1.5 text-left text-[10px] uppercase text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-b border-border/40">
                      <td className="p-1.5">
                        <Input className="h-7 text-xs min-w-[100px] bg-muted/10" readOnly value={l.productName} />
                      </td>
                      <td className="p-1.5">
                        <Input type="number" className="h-7 w-14 text-xs bg-muted/10" readOnly value={l.invoiceQty || ""} />
                      </td>
                      <td className="p-1.5">
                        <Input type="number" className="h-7 w-16 text-xs bg-muted/10" readOnly value={l.unitPrice || ""} />
                      </td>
                      <td className="p-1.5">
                        <Input type="number" className="h-7 w-12 text-xs bg-muted/10" readOnly value={l.taxPct || ""} />
                      </td>
                      <td className="p-1.5">
                        <Input type="number" className="h-7 w-16 text-xs bg-muted/10" readOnly value={l.gstAmount || ""} />
                      </td>
                      <td className="p-1.5">
                        <Input type="number" className="h-7 w-18 text-xs bg-muted/10" readOnly value={l.lineAmount || ""} />
                      </td>
                      <td className="p-1.5">
                        <Input type="number" className="h-7 w-16 text-xs" value={l.returnQty || ""} onChange={(e) => updateLine(l.id, { returnQty: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="p-1.5">
                        <Input
                          type="number"
                          className="h-7 w-20 text-xs bg-muted/10 tabular-nums"
                          readOnly
                          title="Auto-calculated from return qty (after already credited)"
                          value={l.creditAmount > 0 ? l.creditAmount : ""}
                        />
                      </td>
                      <td className="p-1.5">
                        <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-red-600" onClick={() => lines.length > 1 && setLines(lines.filter((x) => x.id !== l.id))}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Remarks">
            <Textarea className="min-h-[72px] text-xs resize-none" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </Section>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="lg:sticky lg:top-20">
          <div className="rounded-lg border border-border/60 bg-white p-4 space-y-2 text-xs shadow-sm">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground">Summary</h2>
            <div className="flex justify-between"><span className="text-muted-foreground">Original</span><span className="tabular-nums">{formatINR(original)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Already Credited</span><span className="tabular-nums">{formatINR(parseFloat(alreadyAdjusted) || 0)}</span></div>
            <div className="flex justify-between font-semibold text-brand-700 pt-2 border-t"><span>This Credit</span><span className="tabular-nums">{formatINR(totalCredit)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Balance After</span><span className="tabular-nums">{formatINR(Math.max(0, original - (parseFloat(alreadyAdjusted) || 0) - totalCredit))}</span></div>
          </div>
        </div>
      </div>
    </AccountsFormLayout>
  );
}
