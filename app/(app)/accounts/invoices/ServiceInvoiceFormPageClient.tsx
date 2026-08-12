"use client";

/**
 * Manual Service Invoice create — posts via backend POST /accounts/sales-invoice/direct-service.
 * Appears only in Sales Invoice → All Invoices (type Service).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
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
import { VoucherFormActionBar } from "@/components/accounts/voucher-form/VoucherFormActionBar";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  calcGstLineSplit,
  calcLineAmounts,
  calculateInvoiceTotals,
  createEmptyLine,
  recalculateLineItem,
  type InvoiceLineItem,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { CustomerPartyInfoButton } from "@/app/(app)/accounts/invoices/components/CustomerPartyInfo";
import { SearchableSelect } from "@/app/(app)/accounts/credit-notes/components/SearchableSelect";
import { inferInterstateFromPlaceOfSupply } from "@/lib/accounts/gst-accounting";
import { splitInvoiceGst } from "@/lib/accounts/invoice-gst-breakup";
import { formatINR } from "@/app/(app)/accounts/invoices/invoice-utils";
import { cn } from "@/lib/utils";
import "./sales-order-invoice-form-compact.css";

const AccountingImpactSection = dynamic(
  () =>
    import("@/components/accounts/AccountingImpactSection").then((m) => ({
      default: m.AccountingImpactSection,
    })),
  { ssr: false, loading: () => null },
);
import {
  useCustomersDropdown,
  useCustomerDetails,
  useWarehousesDropdown,
} from "@/hooks/sales/use-sales-orders";
import { useChartOfAccountsTree } from "@/hooks/accounts/use-chart-of-accounts";
import { useHsnDropdown } from "@/hooks/masters/use-hsn";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import {
  resolveServiceInvoiceRevenueLedger,
  SERVICE_INVOICE_REVENUE_LEDGER_MISSING_ERROR,
} from "@/lib/accounts/ledger-mappings";
import type { ChartOfAccount, CoaNodeId } from "@/app/(app)/accounts/data";
import { SalesInvoiceService } from "@/services/sales-invoice.service";
import { showToast } from "@/lib/toast";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import {
  GoodsInvoiceAdditionalChargesEditor,
  validateGoodsAdditionalCharges,
} from "@/app/(app)/accounts/invoices/components/GoodsInvoiceAdditionalChargesEditor";
import {
  calcAdditionalExpensesTotals,
  createEmptyAdditionalExpense,
  type InvoiceAdditionalExpense,
} from "@/app/(app)/accounts/invoices/invoice-additional-expenses";

type ServiceLineItem = InvoiceLineItem & { sacId: string | null };

function computeDueDate(baseDate: string, creditDays: number): string {
  const d = new Date(`${baseDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return baseDate;
  d.setDate(d.getDate() + creditDays);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyServiceLine(): ServiceLineItem {
  return {
    ...recalculateLineItem({
      ...createEmptyLine(),
      productName: "",
      unit: "NOS",
      taxPct: 18,
    }),
    sacId: null,
  };
}

function ledgerApiUuid(ledger: ChartOfAccount | null | undefined): string | null {
  const id = ledger?.apiNodeId?.trim();
  return id || null;
}

function isActiveIncomeLedger(ledger: ChartOfAccount): boolean {
  return ledger.nodeLevel === "ledger" && ledger.status === "active" && ledger.accountType === "Income";
}

export default function ServiceInvoiceFormPageClient() {
  const router = useRouter();
  const { data: customerData } = useCustomersDropdown();
  const { data: warehouseData } = useWarehousesDropdown();
  const { data: coaRecords = [] } = useChartOfAccountsTree({ includeLedgers: true });
  const { data: hsnDropdown = [] } = useHsnDropdown();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const { data: customerDetails } = useCustomerDetails(customerId);
  const [customerName, setCustomerName] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [customerGst, setCustomerGst] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [creditDays, setCreditDays] = useState(30);
  const [branch, setBranch] = useState("");
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [incomeLedgerId, setIncomeLedgerId] = useState<CoaNodeId | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<ServiceLineItem[]>([createEmptyServiceLine()]);
  const [additionalExpenses, setAdditionalExpenses] = useState<InvoiceAdditionalExpense[]>([
    createEmptyAdditionalExpense("manual"),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!error) return;
    showToast(error, "error");
    setError(null);
  }, [error]);

  const customers = useMemo(() => {
    if (!customerData) return [];
    return customerData.map((c: Record<string, unknown>) => ({
      id: String(c.customer_id ?? ""),
      customerCode: String(c.customer_code ?? ""),
      customerName: String(c.customer_name ?? ""),
      creditDays: Number(c.credit_days ?? 30),
    }));
  }, [customerData]);

  const warehouses = useMemo(() => {
    if (!warehouseData) return [];
    return warehouseData.map((w: Record<string, unknown>) => ({
      id: String(w.warehouse_id ?? ""),
      name: String(w.warehouse_name ?? w.name ?? ""),
    }));
  }, [warehouseData]);

  const sacOptions = useMemo(
    () => hsnDropdown.filter((h) => h.codeType === "SAC"),
    [hsnDropdown],
  );

  const incomeLedgerOptions = useMemo(() => {
    return getLedgersUnderSubGroupName("Service Revenue", coaRecords).filter(isActiveIncomeLedger);
  }, [coaRecords]);

  useEffect(() => {
    if (!coaRecords.length || incomeLedgerId != null) return;
    const resolved = resolveServiceInvoiceRevenueLedger({ records: coaRecords });
    if (resolved) setIncomeLedgerId(resolved.id);
  }, [coaRecords, incomeLedgerId]);

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
        expenseTotals.taxableAmount +
        expenseTotals.gstAmount) *
        100,
    ) / 100;
  const gstSplit = useMemo(() => splitInvoiceGst(taxAmount, interstate), [taxAmount, interstate]);

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: `${c.customerCode} | ${c.customerName}`,
        sub: "Customer",
      })),
    [customers],
  );

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((w) => ({
        value: w.id,
        label: w.name || w.id,
      })),
    [warehouses],
  );

  const incomeLedgerSelectOptions = useMemo(
    () =>
      incomeLedgerOptions.map((l) => ({
        value: String(l.id),
        label: `${l.accountName}${l.accountCode ? ` (${l.accountCode})` : ""}`,
      })),
    [incomeLedgerOptions],
  );

  const sacSelectOptions = useMemo(
    () =>
      sacOptions.map((s) => ({
        value: s.id,
        label: `${s.hsnCode} — ${s.hsnDescription}`,
        sub: s.gstRate,
      })),
    [sacOptions],
  );

  const applyCustomer = useCallback(
    (id: string | null) => {
      setCustomerId(id);
      if (!id) {
        setCustomerName("");
        setCustomerCode("");
        setCustomerGst("");
        setBillingAddress("");
        setShippingAddress("");
        setPlaceOfSupply("");
        setCreditDays(30);
        setBranch("");
        return;
      }
      const c = customers.find((x) => x.id === id);
      if (!c) return;
      setCustomerName(c.customerName);
      setCustomerCode(c.customerCode);
      setCreditDays(c.creditDays);
    },
    [customers],
  );

  useEffect(() => {
    if (!customerDetails || !customerId) return;
    const branches = (customerDetails.branches || []) as Array<Record<string, unknown>>;
    const mainBranch =
      branches.find((b) => b.is_main_branch) || branches[0] || null;
    const billing = mainBranch
      ? [
          mainBranch.billing_address_line_1,
          mainBranch.billing_address_line_2,
          mainBranch.billing_city,
          mainBranch.billing_state,
          mainBranch.billing_pincode,
        ]
          .filter(Boolean)
          .join(", ")
      : String(customerDetails.registered_gst_address ?? "");
    const shipping = mainBranch
      ? [
          mainBranch.shipping_address_line_1,
          mainBranch.shipping_address_line_2,
          mainBranch.shipping_city,
          mainBranch.shipping_state,
          mainBranch.shipping_pincode,
        ]
          .filter(Boolean)
          .join(", ")
      : billing;
    setCustomerGst(String(customerDetails.gstin_no ?? ""));
    setBillingAddress(billing);
    setShippingAddress(shipping);
    setPlaceOfSupply(
      String(mainBranch?.billing_state ?? customerDetails.registered_gst_state ?? ""),
    );
    setBranch(String(mainBranch?.branch_name ?? ""));
    setCreditDays(Number(customerDetails.credit_days ?? 30));
  }, [customerDetails, customerId]);

  const updateLine = useCallback((id: string, patch: Partial<ServiceLineItem>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        return { ...recalculateLineItem(next), sacId: next.sacId ?? null };
      }),
    );
  }, []);

  const addLine = () => {
    setLines((prev) => [...prev, createEmptyServiceLine()]);
  };

  const removeLine = (id: string) => {
    setLines((prev) => {
      const next = prev.filter((l) => l.id !== id);
      return next.length ? next : [createEmptyServiceLine()];
    });
  };

  const selectedIncomeLedger = useMemo(() => {
    if (incomeLedgerId == null) return null;
    return resolveServiceInvoiceRevenueLedger({
      selectedLedgerId: incomeLedgerId,
      records: coaRecords,
    });
  }, [coaRecords, incomeLedgerId]);

  const serviceLedgerUuid = useMemo(
    () => ledgerApiUuid(selectedIncomeLedger),
    [selectedIncomeLedger],
  );

  const saveAndPost = async () => {
    setError(null);
    if (!customerId) {
      setError("Select a customer.");
      return;
    }
    if (!warehouseId) {
      setError("Select a warehouse.");
      return;
    }
    if (!invoiceDate.trim()) {
      setError("Invoice Date is required.");
      return;
    }
    if (!selectedIncomeLedger || !serviceLedgerUuid) {
      setError(SERVICE_INVOICE_REVENUE_LEDGER_MISSING_ERROR);
      return;
    }
    if (!sacOptions.length) {
      setError("No active SAC codes found in HSN Master. Create SAC records before posting.");
      return;
    }

    const serviceLines = lines
      .filter((l) => l.productName.trim() || l.description.trim())
      .map((l) =>
        recalculateLineItem({
          ...l,
          productName: l.productName.trim() || l.description.trim(),
          description: l.description.trim() || l.productName.trim(),
        }),
      );

    if (!serviceLines.length) {
      setError("Add at least one service line.");
      return;
    }

    for (const line of serviceLines) {
      if (!line.sacId) {
        setError(`Select a SAC code for "${line.productName}".`);
        return;
      }
      if (!(line.unitPrice > 0)) {
        setError(`Enter a rate for "${line.productName}".`);
        return;
      }
    }

    const chargeErr = validateGoodsAdditionalCharges(additionalExpenses);
    if (chargeErr) {
      setError(chargeErr);
      return;
    }

    const charges = additionalExpenses
      .filter((e) => (e.expenseHead.trim() || e.amount > 0) && e.chargeMasterId)
      .map((e) => ({
        additional_charge_id: String(e.chargeMasterId),
        amount: e.amount,
        charge_source: "INVOICE" as const,
        gst_applicable: e.gstApplicable,
        gst_rate: e.gstPct,
        remarks: e.remarks || undefined,
      }));

    setSaving(true);
    try {
      const created = await SalesInvoiceService.createDirectService({
        invoice_date: invoiceDate,
        due_date: dueDate || computeDueDate(invoiceDate, creditDays),
        warehouse_id: warehouseId,
        customer_id: customerId,
        narration: narration.trim() || undefined,
        remarks: referenceNo.trim() || undefined,
        items: serviceLines.map((line) => ({
          service_ledger_id: serviceLedgerUuid,
          service_name: line.productName.trim(),
          sac_id: line.sacId!,
          quantity: line.qty || 1,
          rate: line.unitPrice,
          gst_rate: line.taxPct,
        })),
        additional_charges: charges,
      });

      dispatchAccountsDataChanged("sales-invoices");
      router.push(`/accounts/transactions/invoices/${created.sales_invoice_id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create service invoice.");
      setSaving(false);
    }
  };

  return (
    <div className="sales-order-invoice-form-compact h-full min-h-0 flex flex-col w-full">
    <InvoiceFormLayout
      title="Create Service Invoice"
      subtitle="Accounts → Transactions → Sales Invoice → Service"
      breadcrumb={accountsBreadcrumb("Transactions", "Sales Invoice")}
      backHref="/accounts/transactions/invoices"
      stickyFooter={
        <VoucherFormActionBar
          onDiscard={() => router.push("/accounts/transactions/invoices")}
          onSaveDraft={() => showToast("Draft is not supported for service invoices. Use Post Invoice.", "info")}
          onSaveAndPost={saveAndPost}
          saveAndPostLabel="Post Invoice"
          discardDisabled={saving}
          saveDraftDisabled
          saveAndPostDisabled={saving}
        />
      }
    >
      <div className="space-y-3">
        <InvoiceFormCard title="Customer">
          <div className="flex flex-wrap items-end gap-2 max-w-xl">
            <div className="flex-1 min-w-[240px]">
              <SearchableSelect
                label="Customer Name"
                required
                value={customerId ?? ""}
                onChange={(id) => applyCustomer(id || null)}
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
            <InvoiceFormReadOnly label="Invoice No." value="Auto-generated on post" />
            <InvoiceFormField label="Warehouse" required>
              <SearchableSelect
                label=""
                value={warehouseId ?? ""}
                onChange={(id) => setWarehouseId(id || null)}
                options={warehouseOptions}
                placeholder="Select warehouse…"
              />
            </InvoiceFormField>
            <InvoiceFormField label="Invoice Date" required>
              <InvoiceFormInput
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </InvoiceFormField>
            <InvoiceFormReadOnly label="Due Date" value={dueDate || "—"} />
            <InvoiceFormField label="Income Ledger" required>
              <SearchableSelect
                label=""
                value={incomeLedgerId != null ? String(incomeLedgerId) : ""}
                onChange={(id) => setIncomeLedgerId(id ? Number(id) : null)}
                options={incomeLedgerSelectOptions}
                placeholder="Service Income under Service Revenue…"
              />
            </InvoiceFormField>
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
          {!selectedIncomeLedger && coaRecords.length > 0 ? (
            <p className="mt-2 text-xs text-amber-700">
              {SERVICE_INVOICE_REVENUE_LEDGER_MISSING_ERROR}
            </p>
          ) : null}
        </InvoiceFormCard>

        <InvoiceFormSection title="Service Lines">
          <div className="so-goods-product-table-wrap">
            <table className="w-full text-xs min-w-[1100px]">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  {[
                    { label: "Service Description", align: "left" as const },
                    { label: "SAC Code", align: "left" as const },
                    { label: "Qty", align: "right" as const },
                    { label: "UOM", align: "left" as const },
                    { label: "Rate", align: "right" as const },
                    { label: "Disc %", align: "right" as const },
                    { label: "Disc Amt", align: "right" as const },
                    { label: "Taxable", align: "right" as const },
                    { label: "GST %", align: "right" as const },
                    ...(interstate
                      ? [{ label: "IGST", align: "right" as const }]
                      : [
                          { label: "CGST", align: "right" as const },
                          { label: "SGST", align: "right" as const },
                        ]),
                    { label: "Line Total", align: "right" as const },
                    { label: "", align: "left" as const },
                  ].map((h) => (
                    <th
                      key={h.label || "del"}
                      className={cn(
                        "px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                        h.align === "right" ? "text-right" : "text-left",
                      )}
                    >
                      {h.label}
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
                      <td className="p-1.5 w-[180px]">
                        <SearchableSelect
                          label=""
                          value={line.sacId ?? ""}
                          onChange={(id) => {
                            const sac = sacOptions.find((s) => s.id === id);
                            updateLine(line.id, {
                              sacId: id || null,
                              hsn: sac?.hsnCode ?? line.hsn,
                              taxPct: sac?.gstPercentage ?? line.taxPct,
                            });
                          }}
                          options={sacSelectOptions}
                          placeholder="Select SAC…"
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
          <GoodsInvoiceAdditionalChargesEditor
            expenses={additionalExpenses}
            onChange={setAdditionalExpenses}
            interstate={interstate}
          />
        </InvoiceFormSection>

        <InvoiceFormCard title="Summary">
          <div className="svc-invoice-summary-grid">
            <div className="svc-invoice-summary-item">
              <div className="svc-invoice-summary-label">Taxable</div>
              <div className="svc-invoice-summary-value">
                {formatINR(
                  lineTotals.subtotal - lineTotals.discountTotal + expenseTotals.taxableAmount,
                )}
              </div>
            </div>
            {interstate ? (
              <div className="svc-invoice-summary-item">
                <div className="svc-invoice-summary-label">IGST</div>
                <div className="svc-invoice-summary-value">{formatINR(gstSplit.igst)}</div>
              </div>
            ) : (
              <>
                <div className="svc-invoice-summary-item">
                  <div className="svc-invoice-summary-label">CGST</div>
                  <div className="svc-invoice-summary-value">{formatINR(gstSplit.cgst)}</div>
                </div>
                <div className="svc-invoice-summary-item">
                  <div className="svc-invoice-summary-label">SGST</div>
                  <div className="svc-invoice-summary-value">{formatINR(gstSplit.sgst)}</div>
                </div>
              </>
            )}
            <div className="svc-invoice-summary-item">
              <div className="svc-invoice-summary-label">Grand Total</div>
              <div className="svc-invoice-summary-value svc-invoice-summary-value--grand">
                {formatINR(grandTotal)}
              </div>
            </div>
          </div>
        </InvoiceFormCard>

        <AccountingImpactSection docKey="service_invoice" />
      </div>
    </InvoiceFormLayout>
    </div>
  );
}
