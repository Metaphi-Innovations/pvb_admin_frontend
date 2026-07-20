"use client";

/**
 * Manual Service Invoice create — separate from ERP-linked goods invoice generation.
 * Appears only in Sales Invoice → All Invoices (type Service).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import {
  InvoiceFormLayout,
  InvoiceFormCard,
  InvoiceFormSection,
  InvoiceFormField,
  InvoiceFormInput,
  InvoiceFormReadOnly,
  INVOICE_FORM_GRID_CLASS,
  INVOICE_FORM_INPUT_CLASS,
  INVOICE_FORM_LABEL_CLASS,
} from "@/app/(app)/accounts/components/InvoiceFormLayout";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  calcGstLineSplit,
  calcLineAmounts,
  calculateInvoiceTotals,
  createEmptyLine,
  createInvoice,
  loadInvoices,
  recalculateLineItem,
  type InvoiceLineItem,
  type InvoiceStatus,
} from "@/app/(app)/accounts/invoices/invoices-data";
import {
  createEmptyAdditionalExpense,
  calcAdditionalExpensesTotals,
  type InvoiceAdditionalExpense,
} from "@/app/(app)/accounts/invoices/invoice-additional-expenses";
import { InvoiceAdditionalExpensesEditor } from "@/app/(app)/accounts/invoices/components/InvoiceAdditionalExpensesEditor";
import { CustomerPartyInfoButton } from "@/app/(app)/accounts/invoices/components/CustomerPartyInfo";
import { WarehouseMappedBankAccountSelect } from "@/components/accounts/WarehouseMappedBankAccountSelect";
import { SearchableSelect } from "@/app/(app)/accounts/credit-notes/components/SearchableSelect";
import {
  getCustomersForTransactionDropdown,
  type Customer,
} from "@/app/(app)/masters/customers/customer-data";
import {
  customerMasterToTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import {
  formatCustomerDropdownLabel,
  formatCustomerDropdownSublabel,
} from "@/lib/masters/entity-display";
import { peekNextServiceInvoiceNo } from "@/lib/accounts/invoice-type";
import { inferInterstateFromPlaceOfSupply } from "@/lib/accounts/gst-accounting";
import { splitInvoiceGst } from "@/lib/accounts/invoice-gst-breakup";
import { formatINR } from "@/app/(app)/accounts/invoices/invoice-utils";
import { cn } from "@/lib/utils";

function computeDueDate(baseDate: string, creditDays: number): string {
  const d = new Date(`${baseDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return baseDate;
  d.setDate(d.getDate() + creditDays);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ServiceInvoiceFormPageClient() {
  const router = useRouter();
  const customers = useMemo(() => getCustomersForTransactionDropdown(), []);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [customerGst, setCustomerGst] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [creditDays, setCreditDays] = useState(30);
  const [branch, setBranch] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [bankAccountId, setBankAccountId] = useState<number | null>(null);
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<InvoiceLineItem[]>([
    recalculateLineItem({ ...createEmptyLine(), productName: "", unit: "NOS", taxPct: 18 }),
  ]);
  const [additionalExpenses, setAdditionalExpenses] = useState<InvoiceAdditionalExpense[]>([
    createEmptyAdditionalExpense("manual"),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const invoiceNo = useMemo(
    () => peekNextServiceInvoiceNo(loadInvoices(), invoiceDate),
    [invoiceDate],
  );

  useEffect(() => {
    if (invoiceDate && creditDays >= 0) {
      setDueDate(computeDueDate(invoiceDate, creditDays));
    }
  }, [invoiceDate, creditDays]);

  const interstate = useMemo(
    () => inferInterstateFromPlaceOfSupply(placeOfSupply),
    [placeOfSupply],
  );

  const lineTotals = useMemo(() => calculateInvoiceTotals(lines), [lines]);
  const expenseTotals = useMemo(
    () => calcAdditionalExpensesTotals(additionalExpenses),
    [additionalExpenses],
  );
  const taxAmount = Math.round((lineTotals.taxAmount + expenseTotals.gstAmount) * 100) / 100;
  const grandTotal =
    Math.round(
      (lineTotals.subtotal -
        lineTotals.discountTotal +
        lineTotals.taxAmount +
        expenseTotals.totalAmount) *
        100,
    ) / 100;
  const gstSplit = useMemo(() => splitInvoiceGst(taxAmount, interstate), [taxAmount, interstate]);

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: String(c.id),
        label: formatCustomerDropdownLabel(c),
        sub: formatCustomerDropdownSublabel(c),
      })),
    [customers],
  );

  const applyCustomer = useCallback((c: Customer | null) => {
    if (!c) {
      setCustomerId(null);
      setCustomerName("");
      setCustomerCode("");
      setCustomerGst("");
      setBillingAddress("");
      setShippingAddress("");
      setPlaceOfSupply("");
      setPaymentTerms("");
      setCreditDays(30);
      setBranch("");
      return;
    }
    const fields = customerMasterToTransactionFields(c);
    setCustomerId(c.id);
    setCustomerName(fields.customerName);
    setCustomerCode(fields.customerCode);
    setCustomerGst(fields.customerGst);
    setBillingAddress(fields.billingAddress);
    setShippingAddress(fields.shippingAddress);
    setPlaceOfSupply(fields.placeOfSupply);
    setPaymentTerms(fields.paymentTerms);
    setCreditDays(fields.creditDays);
    setBranch(c.branch || c.branches?.[0]?.branchName || "");
  }, []);

  const updateLine = useCallback((id: string, patch: Partial<InvoiceLineItem>) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? recalculateLineItem({ ...l, ...patch }) : l)),
    );
  }, []);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      recalculateLineItem({ ...createEmptyLine(), productName: "", unit: "NOS", taxPct: 18 }),
    ]);
  };

  const removeLine = (id: string) => {
    setLines((prev) => {
      const next = prev.filter((l) => l.id !== id);
      return next.length
        ? next
        : [recalculateLineItem({ ...createEmptyLine(), productName: "", unit: "NOS", taxPct: 18 })];
    });
  };

  const save = async (status: InvoiceStatus) => {
    setError(null);
    if (!customerName.trim()) {
      setError("Select a customer.");
      return;
    }
    if (!invoiceDate.trim()) {
      setError("Invoice Date is required.");
      return;
    }
    if (bankAccountId == null) {
      setError("Bank Account is mandatory.");
      return;
    }
    const serviceLines = lines
      .filter((l) => l.productName.trim() || l.description.trim())
      .map((l) =>
        recalculateLineItem({
          ...l,
          productName: l.productName.trim() || l.description.trim(),
          description: l.description.trim() || l.productName.trim(),
          productId: null,
        }),
      );
    if (!serviceLines.length) {
      setError("Add at least one service line.");
      return;
    }
    setSaving(true);
    try {
      const rec = createInvoice({
        invoiceDate,
        dueDate: dueDate || computeDueDate(invoiceDate, creditDays),
        referenceNo: referenceNo.trim(),
        remarks: narration.trim(),
        customerId,
        customerName: customerName.trim(),
        customerMobile: "",
        customerEmail: "",
        customerGst,
        billingAddress,
        shippingAddress,
        paymentTerms,
        creditDays,
        placeOfSupply,
        state: placeOfSupply,
        bankAccountId,
        branch,
        customerNotes: narration.trim(),
        internalRemarks: narration.trim(),
        additionalExpenses: additionalExpenses.filter(
          (e) => e.expenseHead?.trim() || e.amount > 0,
        ),
        lineItems: serviceLines,
        attachments: [],
        invoiceStatus: status,
        invoiceType: "sales",
        sourceType: "service",
      });
      router.push(`/accounts/transactions/invoices/${rec.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save service invoice.");
      setSaving(false);
    }
  };

  return (
    <InvoiceFormLayout
      title="Create Service Invoice"
      subtitle="Accounts → Transactions → Sales Invoice → Service"
      breadcrumb={accountsBreadcrumb("Transactions", "Sales Invoice")}
      backHref="/accounts/transactions/invoices"
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={saving}
            onClick={() => router.push("/accounts/transactions/invoices")}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={saving}
            onClick={() => save("draft")}
          >
            Save Draft
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            disabled={saving}
            onClick={() => save("sent")}
          >
            Save & Post
          </Button>
        </>
      }
    >
      {error ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        <InvoiceFormCard title="Customer">
          <div className="flex flex-wrap items-end gap-2 max-w-xl">
            <div className="flex-1 min-w-[240px]">
              <SearchableSelect
                label="Customer Name"
                required
                value={customerId != null ? String(customerId) : ""}
                onChange={(id) => {
                  const c = customers.find((x) => x.id === Number(id)) ?? null;
                  applyCustomer(c);
                }}
                options={customerOptions}
                placeholder="Select customer…"
              />
            </div>
            {customerName ? (
              <div className="pb-0.5">
                <CustomerPartyInfoButton
                  customerName={customerName}
                  customerCode={customerCode}
                  branch={branch}
                />
              </div>
            ) : null}
          </div>
        </InvoiceFormCard>

        <InvoiceFormCard title="Invoice Details">
          <div className={INVOICE_FORM_GRID_CLASS}>
            <InvoiceFormReadOnly label="Invoice No." value={invoiceNo} />
            <InvoiceFormField label="Invoice Date" required>
              <InvoiceFormInput
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </InvoiceFormField>
            <InvoiceFormReadOnly label="Due Date" value={dueDate || "—"} />
            <InvoiceFormField label="Manual Reference No.">
              <InvoiceFormInput
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Optional"
              />
            </InvoiceFormField>
            <InvoiceFormField label="Place of Supply">
              <InvoiceFormInput
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                placeholder="State / UT"
              />
            </InvoiceFormField>
            <div>
              <WarehouseMappedBankAccountSelect
                warehouseRef={null}
                value={bankAccountId}
                onChange={(id) => setBankAccountId(id)}
                required
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
              <Label className={INVOICE_FORM_LABEL_CLASS}>Narration</Label>
              <Textarea
                className={cn(INVOICE_FORM_INPUT_CLASS, "min-h-[64px]")}
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Optional"
                rows={2}
              />
            </div>
          </div>
        </InvoiceFormCard>

        <InvoiceFormSection title="Service Lines">
          <div className="overflow-x-auto border border-border rounded-lg bg-white">
            <table className="w-full text-xs min-w-[1100px]">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  {[
                    "Service Description",
                    "SAC Code",
                    "Qty",
                    "UOM",
                    "Rate",
                    "Disc %",
                    "Disc Amt",
                    "Taxable",
                    "GST %",
                    ...(interstate ? ["IGST"] : ["CGST", "SGST"]),
                    "Line Total",
                    "",
                  ].map((h) => (
                    <th
                      key={h || "del"}
                      className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const { discountAmt, taxable } = calcLineAmounts(line);
                  const split = calcGstLineSplit(line, interstate);
                  return (
                    <tr key={line.id} className="border-b border-border/40 last:border-0">
                      <td className="p-1.5 min-w-[160px]">
                        <Input
                          className="h-8 text-xs"
                          value={line.productName}
                          onChange={(e) =>
                            updateLine(line.id, {
                              productName: e.target.value,
                              description: e.target.value,
                            })
                          }
                          placeholder="Service description"
                        />
                      </td>
                      <td className="p-1.5 w-[100px]">
                        <Input
                          className="h-8 text-xs font-mono"
                          value={line.hsn || ""}
                          onChange={(e) => updateLine(line.id, { hsn: e.target.value })}
                          placeholder="SAC"
                        />
                      </td>
                      <td className="p-1.5 w-[72px]">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          className="h-8 text-xs text-right tabular-nums"
                          value={line.qty || ""}
                          onChange={(e) =>
                            updateLine(line.id, { qty: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="p-1.5 w-[72px]">
                        <Input
                          className="h-8 text-xs"
                          value={line.unit}
                          onChange={(e) => updateLine(line.id, { unit: e.target.value })}
                        />
                      </td>
                      <td className="p-1.5 w-[100px]">
                        <AccountsMoneyInput
                          className="h-8 text-xs text-right"
                          value={line.unitPrice || ""}
                          onChange={(v) => updateLine(line.id, { unitPrice: v })}
                        />
                      </td>
                      <td className="p-1.5 w-[72px]">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          className="h-8 text-xs text-right"
                          value={line.discountPct || ""}
                          onChange={(e) =>
                            updateLine(line.id, {
                              discountPct: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td className="p-1.5 w-[90px] text-right tabular-nums text-muted-foreground">
                        {formatINR(discountAmt)}
                      </td>
                      <td className="p-1.5 w-[90px] text-right tabular-nums">{formatINR(taxable)}</td>
                      <td className="p-1.5 w-[72px]">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          className="h-8 text-xs text-right"
                          value={line.taxPct || ""}
                          onChange={(e) =>
                            updateLine(line.id, { taxPct: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </td>
                      {interstate ? (
                        <td className="p-1.5 w-[90px] text-right tabular-nums text-muted-foreground">
                          {formatINR(split.igst)}
                        </td>
                      ) : (
                        <>
                          <td className="p-1.5 w-[90px] text-right tabular-nums text-muted-foreground">
                            {formatINR(split.cgst)}
                          </td>
                          <td className="p-1.5 w-[90px] text-right tabular-nums text-muted-foreground">
                            {formatINR(split.sgst)}
                          </td>
                        </>
                      )}
                      <td className="p-1.5 w-[100px] text-right tabular-nums font-semibold">
                        {formatINR(split.lineTotal)}
                      </td>
                      <td className="p-1.5 w-9">
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
                          onClick={() => removeLine(line.id)}
                          aria-label="Delete line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={addLine}
            >
              <Plus className="w-3.5 h-3.5" /> Add Service Line
            </Button>
          </div>
        </InvoiceFormSection>

        <InvoiceFormSection title="Additional Charges">
          <InvoiceAdditionalExpensesEditor
            expenses={additionalExpenses}
            onChange={setAdditionalExpenses}
            defaultGstPct={18}
            interstate={interstate}
          />
        </InvoiceFormSection>

        <InvoiceFormCard title="Summary">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Taxable</p>
              <p className="font-semibold tabular-nums">
                {formatINR(lineTotals.subtotal - lineTotals.discountTotal + expenseTotals.taxableAmount)}
              </p>
            </div>
            {interstate ? (
              <div>
                <p className="text-muted-foreground">IGST</p>
                <p className="font-semibold tabular-nums">{formatINR(gstSplit.igst)}</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-muted-foreground">CGST</p>
                  <p className="font-semibold tabular-nums">{formatINR(gstSplit.cgst)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">SGST</p>
                  <p className="font-semibold tabular-nums">{formatINR(gstSplit.sgst)}</p>
                </div>
              </>
            )}
            <div>
              <p className="text-muted-foreground">Grand Total</p>
              <p className="font-bold tabular-nums text-brand-700">{formatINR(grandTotal)}</p>
            </div>
          </div>
        </InvoiceFormCard>
      </div>
    </InvoiceFormLayout>
  );
}
