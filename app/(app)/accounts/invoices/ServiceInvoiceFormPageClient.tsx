"use client";

/**
 * Manual Service Invoice create — posts via backend POST /accounts/sales-invoice/direct-service.
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
import {
  ServiceInvoiceCustomerInfoButton,
  ServiceInvoiceWarehouseInfoButton,
} from "@/app/(app)/accounts/invoices/components/ServiceInvoiceEntityInfo";
import { SearchableSelect } from "@/app/(app)/accounts/credit-notes/components/SearchableSelect";
import { inferInterstateFromPlaceOfSupply } from "@/lib/accounts/gst-accounting";
import { splitInvoiceGst } from "@/lib/accounts/invoice-gst-breakup";
import { formatINR } from "@/app/(app)/accounts/invoices/invoice-utils";
import { cn } from "@/lib/utils";
import "./sales-order-invoice-form-compact.css";
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

type ServiceLineItem = InvoiceLineItem & {
  sacId: string | null;
  incomeLedgerId: CoaNodeId | null;
};

function computeDueDate(baseDate: string, creditDays: number): string {
  const d = new Date(`${baseDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return baseDate;
  d.setDate(d.getDate() + creditDays);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyServiceLine(incomeLedgerId: CoaNodeId | null = null): ServiceLineItem {
  return {
    ...recalculateLineItem({
      ...createEmptyLine(),
      productName: "",
      unit: "NOS",
      taxPct: 18,
    }),
    sacId: null,
    incomeLedgerId,
  };
}

function ledgerApiUuid(ledger: ChartOfAccount | null | undefined): string | null {
  const id = ledger?.apiNodeId?.trim();
  return id || null;
}

function isActiveIncomeLedger(ledger: ChartOfAccount): boolean {
  return ledger.nodeLevel === "ledger" && ledger.status === "active" && ledger.accountType === "Income";
}

function nestedRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function detailString(source: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!source) return "";
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function formatPaymentTerms(paymentType?: string, creditDays?: number | string): string {
  if (!paymentType) return "";
  const type = paymentType.toLowerCase();
  if (type === "advance") return "Advance";
  if (type === "credit") {
    const days = creditDays ? Number(creditDays) : 30;
    return `Net ${days}`;
  }
  return paymentType;
}

const CHARGE_INPUT_CLASS =
  "h-9 text-sm tabular-nums text-right w-28 ml-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function resolveLineIncomeLedger(
  line: Pick<ServiceLineItem, "incomeLedgerId">,
  coaRecords: ChartOfAccount[],
): ChartOfAccount | null {
  if (line.incomeLedgerId == null) return null;
  return resolveServiceInvoiceRevenueLedger({
    selectedLedgerId: line.incomeLedgerId,
    records: coaRecords,
  });
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
  const [defaultIncomeLedgerId, setDefaultIncomeLedgerId] = useState<CoaNodeId | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<ServiceLineItem[]>([createEmptyServiceLine()]);
  const [additionalExpenses, setAdditionalExpenses] = useState<InvoiceAdditionalExpense[]>([
    createEmptyAdditionalExpense("manual"),
  ]);
  const [roundOff, setRoundOff] = useState(0);
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
    if (!coaRecords.length || defaultIncomeLedgerId != null) return;
    const resolved = resolveServiceInvoiceRevenueLedger({ records: coaRecords });
    if (resolved) setDefaultIncomeLedgerId(resolved.id);
  }, [coaRecords, defaultIncomeLedgerId]);

  useEffect(() => {
    if (defaultIncomeLedgerId == null) return;
    setLines((prev) =>
      prev.map((line) =>
        line.incomeLedgerId == null ? { ...line, incomeLedgerId: defaultIncomeLedgerId } : line,
      ),
    );
  }, [defaultIncomeLedgerId]);

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
        expenseTotals.gstAmount +
        roundOff) *
        100,
    ) / 100;
  const gstSplit = useMemo(() => splitInvoiceGst(taxAmount, interstate), [taxAmount, interstate]);
  const summaryGrossAmount = lineTotals.subtotal;
  const summaryDiscountAmount = lineTotals.discountTotal;
  const summaryAdditionalCharges = expenseTotals.taxableAmount;
  const summaryTaxableAmount =
    Math.round(
      (lineTotals.subtotal - lineTotals.discountTotal + expenseTotals.taxableAmount) * 100,
    ) / 100;

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
        selectedLabel: s.hsnCode,
        sub: s.gstRate,
      })),
    [sacOptions],
  );

  const customerTypeName = useMemo(() => {
    const details = nestedRecord(customerDetails);
    const typeObj = nestedRecord(details?.customer_type);
    return detailString(typeObj, "customer_type_name", "name") || detailString(details, "customer_type_name");
  }, [customerDetails]);

  const linkedLedgerLabel = useMemo(() => {
    const details = nestedRecord(customerDetails);
    const nested =
      nestedRecord(details?.ledger) ||
      nestedRecord(details?.account_ledger) ||
      nestedRecord(details?.linked_ledger);
    const name = detailString(nested, "ledger_name", "account_name", "name") || detailString(details, "ledger_name");
    const code = detailString(nested, "ledger_code", "account_code", "code") || detailString(details, "ledger_code");
    if (name) return code ? `${name} (${code})` : name;
    if (!customerId) return "";
    const ledger = coaRecords.find(
      (l) =>
        l.nodeLevel === "ledger" &&
        (String(l.masterId ?? "") === customerId || String(l.erpSourceId ?? "") === customerId),
    );
    if (!ledger) return "";
    return ledger.accountCode ? `${ledger.accountName} (${ledger.accountCode})` : ledger.accountName;
  }, [coaRecords, customerDetails, customerId]);

  const customerPaymentTerms = useMemo(() => {
    const details = nestedRecord(customerDetails);
    return formatPaymentTerms(
      detailString(details, "payment_type"),
      details?.credit_days as number | string | undefined,
    );
  }, [customerDetails]);

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
        return {
          ...recalculateLineItem(next),
          sacId: next.sacId ?? null,
          incomeLedgerId: next.incomeLedgerId ?? null,
        };
      }),
    );
  }, []);

  const addLine = () => {
    setLines((prev) => [...prev, createEmptyServiceLine(defaultIncomeLedgerId)]);
  };

  const removeLine = (id: string) => {
    setLines((prev) => {
      const next = prev.filter((l) => l.id !== id);
      return next.length ? next : [createEmptyServiceLine(defaultIncomeLedgerId)];
    });
  };

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
      ) as ServiceLineItem[];

    if (!serviceLines.length) {
      setError("Add at least one service line.");
      return;
    }

    for (const line of serviceLines) {
      const incomeLedger = resolveLineIncomeLedger(line, coaRecords);
      const serviceLedgerUuid = ledgerApiUuid(incomeLedger);
      if (!incomeLedger || !serviceLedgerUuid) {
        setError(
          line.productName
            ? `Select an Income Ledger for "${line.productName}".`
            : SERVICE_INVOICE_REVENUE_LEDGER_MISSING_ERROR,
        );
        return;
      }
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
          service_ledger_id: ledgerApiUuid(resolveLineIncomeLedger(line, coaRecords))!,
          service_name: line.productName.trim(),
          sac_id: line.sacId!,
          quantity: line.qty || 1,
          rate: line.unitPrice,
          gst_rate: line.taxPct,
        })),
        additional_charges: charges,
        round_off_amount: roundOff,
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
        <InvoiceFormCard title="Invoice Details">
          <div className={INVOICE_FORM_GRID_CLASS}>
            <InvoiceFormReadOnly label="Invoice No." value="Auto-generated on post" />
            <InvoiceFormField label="Invoice Date" required>
              <InvoiceFormInput
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </InvoiceFormField>
            <InvoiceFormReadOnly label="Due Date" value={dueDate || "—"} />
            <div className="space-y-1">
              <div className="flex items-center gap-1 min-h-[16px]">
                <Label className={INVOICE_FORM_LABEL_CLASS}>
                  Customer <span className="text-red-500 ml-0.5">*</span>
                </Label>
                <ServiceInvoiceCustomerInfoButton
                  enabled={Boolean(customerId)}
                  info={{
                    customerName,
                    customerCode,
                    gstin: customerGst,
                    billingAddress,
                    shippingAddress,
                    state: placeOfSupply,
                    branch,
                    customerType: customerTypeName,
                    paymentTerms: customerPaymentTerms,
                    linkedLedger: linkedLedgerLabel,
                  }}
                />
              </div>
              <SearchableSelect
                label=""
                value={customerId ?? ""}
                onChange={(id) => applyCustomer(id || null)}
                options={customerOptions}
                placeholder="Select customer…"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 min-h-[16px]">
                <Label className={INVOICE_FORM_LABEL_CLASS}>
                  Warehouse <span className="text-red-500 ml-0.5">*</span>
                </Label>
                <ServiceInvoiceWarehouseInfoButton warehouseId={warehouseId} />
              </div>
              <SearchableSelect
                label=""
                value={warehouseId ?? ""}
                onChange={(id) => setWarehouseId(id || null)}
                options={warehouseOptions}
                placeholder="Select warehouse…"
              />
            </div>
            <InvoiceFormField label="Manual Reference No.">
              <InvoiceFormInput
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Optional"
              />
            </InvoiceFormField>
          </div>
        </InvoiceFormCard>

        <InvoiceFormSection
          title="Service Lines"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={addLine}
            >
              <Plus className="w-3.5 h-3.5" /> Add Service Line
            </Button>
          }
        >
          <div className="so-goods-product-table-wrap overflow-x-auto">
            <table className="text-xs w-max min-w-[1520px]">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  {[
                    { label: "Service Description", align: "left" as const, className: "min-w-[180px]" },
                    { label: "Income Ledger", align: "left" as const, className: "min-w-[220px]" },
                    { label: "SAC Code", align: "left" as const, className: "min-w-[120px]" },
                    { label: "Qty", align: "right" as const, className: "min-w-[65px]" },
                    { label: "UOM", align: "left" as const, className: "min-w-[70px]" },
                    { label: "Rate", align: "right" as const, className: "min-w-[90px]" },
                    { label: "Disc %", align: "right" as const, className: "min-w-[70px]" },
                    { label: "Disc Amt", align: "right" as const, className: "min-w-[90px]" },
                    { label: "Taxable", align: "right" as const, className: "min-w-[95px]" },
                    { label: "GST %", align: "right" as const, className: "min-w-[70px]" },
                    ...(interstate
                      ? [{ label: "IGST", align: "right" as const, className: "min-w-[90px]" }]
                      : [
                          { label: "CGST", align: "right" as const, className: "min-w-[90px]" },
                          { label: "SGST", align: "right" as const, className: "min-w-[90px]" },
                        ]),
                    { label: "Line Total", align: "right" as const, className: "min-w-[110px]" },
                    { label: "", align: "left" as const, className: "min-w-[40px]" },
                  ].map((h) => (
                    <th
                      key={h.label || "del"}
                      className={cn(
                        "px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                        h.align === "right" ? "text-right" : "text-left",
                        h.className,
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
                      <td className="p-1.5 min-w-[180px] w-[180px]">
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
                      <td className="p-1.5 min-w-[220px] max-w-[240px] w-[220px] overflow-hidden">
                        <SearchableSelect
                          label=""
                          value={line.incomeLedgerId != null ? String(line.incomeLedgerId) : ""}
                          onChange={(id) =>
                            updateLine(line.id, {
                              incomeLedgerId: id ? Number(id) : null,
                            })
                          }
                          options={incomeLedgerSelectOptions}
                          placeholder="Select income ledger…"
                          contentClassName="w-[320px]"
                        />
                      </td>
                      <td className="p-1.5 min-w-[120px] max-w-[130px] w-[120px] overflow-hidden">
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
                          contentClassName="w-[340px]"
                        />
                      </td>
                      <td className="p-1.5 min-w-[65px] w-[65px]">
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
                      <td className="p-1.5 min-w-[70px] w-[70px]">
                        <Input
                          className="h-8 text-xs"
                          value={line.unit}
                          onChange={(e) => updateLine(line.id, { unit: e.target.value })}
                        />
                      </td>
                      <td className="p-1.5 min-w-[90px] w-[90px]">
                        <AccountsMoneyInput
                          className="h-8 text-xs text-right"
                          value={line.unitPrice || ""}
                          onChange={(v) => updateLine(line.id, { unitPrice: v })}
                        />
                      </td>
                      <td className="p-1.5 min-w-[70px] w-[70px]">
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
                      <td className="p-1.5 min-w-[90px] w-[90px] text-right tabular-nums text-muted-foreground whitespace-nowrap">
                        {formatINR(discountAmt)}
                      </td>
                      <td className="p-1.5 min-w-[95px] w-[95px] text-right tabular-nums whitespace-nowrap">
                        {formatINR(taxable)}
                      </td>
                      <td className="p-1.5 min-w-[70px] w-[70px]">
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
                        <td className="p-1.5 min-w-[90px] w-[90px] text-right tabular-nums text-muted-foreground whitespace-nowrap">
                          {formatINR(split.igst)}
                        </td>
                      ) : (
                        <>
                          <td className="p-1.5 min-w-[90px] w-[90px] text-right tabular-nums text-muted-foreground whitespace-nowrap">
                            {formatINR(split.cgst)}
                          </td>
                          <td className="p-1.5 min-w-[90px] w-[90px] text-right tabular-nums text-muted-foreground whitespace-nowrap">
                            {formatINR(split.sgst)}
                          </td>
                        </>
                      )}
                      <td className="p-1.5 min-w-[110px] w-[110px] text-right tabular-nums font-semibold whitespace-nowrap">
                        {formatINR(split.lineTotal)}
                      </td>
                      <td className="p-1.5 min-w-[40px] w-[40px]">
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
          {!incomeLedgerOptions.length && coaRecords.length > 0 ? (
            <p className="mt-2 text-xs text-amber-700">
              {SERVICE_INVOICE_REVENUE_LEDGER_MISSING_ERROR}
            </p>
          ) : null}
        </InvoiceFormSection>

        <InvoiceFormSection title="Additional Charges">
          <GoodsInvoiceAdditionalChargesEditor
            expenses={additionalExpenses}
            onChange={setAdditionalExpenses}
            interstate={interstate}
          />
        </InvoiceFormSection>

        <div className="grid grid-cols-1 gap-2.5 items-start lg:grid-cols-[minmax(0,1fr)_300px]">
          <InvoiceFormSection title="Narration">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <Textarea
                className={cn(INVOICE_FORM_INPUT_CLASS, "so-goods-narration resize-y")}
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Optional narration for this invoice…"
                maxLength={500}
              />
            </div>
          </InvoiceFormSection>

          <div className="rounded-lg border border-slate-200 bg-white space-y-2 p-3 lg:sticky lg:top-3 lg:z-10 shadow-sm">
            <h2 className="accounts-card-title">Summary</h2>
            <div className="space-y-1.5 so-invoice-summary">
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="so-summary-label">Gross Amount</span>
                <span className="so-summary-value">{formatINR(summaryGrossAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="so-summary-label">Discount</span>
                <span className="so-summary-value">{formatINR(summaryDiscountAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="so-summary-label">Taxable Amount</span>
                <span className="so-summary-value">{formatINR(summaryTaxableAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="so-summary-label">Additional Charges</span>
                <span className="so-summary-value">{formatINR(summaryAdditionalCharges)}</span>
              </div>
              {interstate ? (
                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="so-summary-label">Output IGST</span>
                  <span className="so-summary-value">{formatINR(gstSplit.igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4 py-0.5">
                    <span className="so-summary-label">Output CGST</span>
                    <span className="so-summary-value">{formatINR(gstSplit.cgst)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-0.5">
                    <span className="so-summary-label">Output SGST</span>
                    <span className="so-summary-value">{formatINR(gstSplit.sgst)}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between gap-4 py-0.5">
                <Label className="so-summary-label">Round Off</Label>
                <AccountsMoneyInput
                  className={CHARGE_INPUT_CLASS}
                  value={roundOff || ""}
                  onChange={(v) => setRoundOff(v)}
                />
              </div>
              <div className="flex items-center justify-between gap-4 py-1.5 border-t border-border/60">
                <span className="so-grand-total-label">Grand Total</span>
                <span className="so-grand-total-value">{formatINR(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </InvoiceFormLayout>
    </div>
  );
}
