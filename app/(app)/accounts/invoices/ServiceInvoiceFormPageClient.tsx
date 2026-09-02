"use client";

/**
 * Manual Service Invoice create — posts via backend POST /accounts/sales-invoice/direct-service.
 * Appears only in Sales Invoice → All Invoices (type Service).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { isoToDisplayDate } from "@/lib/accounts/date-display";
import { InvoiceFormLayout } from "@/app/(app)/accounts/components/InvoiceFormLayout";
import { VoucherFormActionBar } from "@/components/accounts/voucher-form/VoucherFormActionBar";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import {
  INVOICE_DETAIL_INPUT_CLASS,
  INVOICE_DETAIL_SELECT_CLASS,
  InvoiceDetailField,
  InvoiceTableReadonly,
} from "@/app/(app)/accounts/invoices/components/invoice-form-voucher-ui";
import { VOUCHER_INPUT_CLASS } from "@/components/accounts/voucher-simple-form-ui";
import { useFY } from "@/lib/fy-store";
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
import { roundMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import "./sales-order-invoice-form-compact.css";
import {
  useCustomersDropdown,
  useCustomerDetails,
  useWarehousesDropdown,
} from "@/hooks/sales/use-sales-orders";
import { useChartOfAccountsTree } from "@/hooks/accounts/use-chart-of-accounts";
import { useHsnDropdown } from "@/hooks/masters/use-hsn";
import { SalesInvoiceService } from "@/services/sales-invoice.service";
import { showToast } from "@/lib/toast";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import {
  GoodsInvoiceAdditionalChargesEditor,
  validateGoodsAdditionalCharges,
} from "@/app/(app)/accounts/invoices/components/GoodsInvoiceAdditionalChargesEditor";
import { ServiceInvoiceLineLedgerSelect } from "@/app/(app)/accounts/invoices/components/ServiceInvoiceLineLedgerSelect";
import {
  calcAdditionalExpensesTotals,
  createEmptyAdditionalExpense,
  toAdditionalChargePayloadList,
  type InvoiceAdditionalExpense,
} from "@/app/(app)/accounts/invoices/invoice-additional-expenses";

const LEDGER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ServiceLineItem = InvoiceLineItem & {
  sacId: string | null;
  /** Backend ledger UUID from generic dropdown. */
  incomeLedgerId: string | null;
  incomeLedgerName?: string;
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

function createEmptyServiceLine(): ServiceLineItem {
  return {
    ...recalculateLineItem({
      ...createEmptyLine(),
      productName: "",
      unit: "NOS",
      taxPct: 18,
    }),
    sacId: null,
    incomeLedgerId: null,
    incomeLedgerName: "",
  };
}

function isLedgerUuid(value: unknown): value is string {
  return typeof value === "string" && LEDGER_UUID_RE.test(value);
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

export default function ServiceInvoiceFormPageClient() {
  const router = useRouter();
  const { selectedFY } = useFY();
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
  const addChargeRowRef = useRef<(() => void) | null>(null);

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
          incomeLedgerName: next.incomeLedgerName ?? "",
        };
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
      if (!isLedgerUuid(line.incomeLedgerId)) {
        setError(
          line.productName
            ? `Select a ledger for "${line.productName}".`
            : "Select a ledger for each service line.",
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

    const charges = toAdditionalChargePayloadList(additionalExpenses, "INVOICE");

    setSaving(true);
    try {
      const created = await SalesInvoiceService.createDirectService({
        invoice_date: invoiceDate,
        due_date: dueDate || computeDueDate(invoiceDate, creditDays),
        warehouse_id: warehouseId,
        customer_id: customerId,
        narration: narration.trim() || undefined,
        remarks: referenceNo.trim() || undefined,
        items: serviceLines.map((line) => {
          const discountAmt =
            line.discountPct && line.discountPct > 0
              ? roundMoney(((line.qty || 1) * line.unitPrice * line.discountPct) / 100)
              : 0;
          return {
            service_ledger_id: line.incomeLedgerId!,
            service_name: line.productName.trim(),
            sac_id: line.sacId!,
            quantity: line.qty || 1,
            rate: line.unitPrice,
            discount_percentage: line.discountPct || 0,
            discount_amount: discountAmt,
            gst_rate: line.taxPct,
          };
        }),
        additional_charges: charges.length > 0 ? charges : undefined,
        round_off_amount: roundOff,
      });

      dispatchAccountsDataChanged("sales-invoices");
      showToast("Service invoice posted successfully.", "success");
      router.replace("/accounts/transactions/invoices");
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
          <VoucherFormSectionCard title="Invoice Details">
            <div className="space-y-1.5">
              <div className="so-invoice-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <InvoiceDetailField label="Invoice No.">
                  <div className="so-goods-ro so-goods-ro--mono w-full text-brand-700">
                    Auto-generated on post
                  </div>
                </InvoiceDetailField>
                <InvoiceDetailField label="Invoice Date" required>
                  <AccountsDateInput
                    className={INVOICE_DETAIL_INPUT_CLASS}
                    value={invoiceDate}
                    onChange={setInvoiceDate}
                    aria-label="Invoice Date"
                  />
                </InvoiceDetailField>
                <InvoiceDetailField label="Due Date">
                  <div className="so-goods-ro w-full">{isoToDisplayDate(dueDate) || "—"}</div>
                </InvoiceDetailField>
                <InvoiceDetailField
                  label="Customer"
                  required
                  labelExtra={
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
                  }
                >
                  <SearchableSelect
                    value={customerId ?? ""}
                    onChange={(id) => applyCustomer(id || null)}
                    options={customerOptions}
                    placeholder="Select customer…"
                    triggerClassName={INVOICE_DETAIL_SELECT_CLASS}
                  />
                </InvoiceDetailField>
              </div>
              <div className="so-invoice-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <InvoiceDetailField
                  label="Warehouse"
                  required
                  labelExtra={
                    <ServiceInvoiceWarehouseInfoButton warehouseId={warehouseId} />
                  }
                >
                  <SearchableSelect
                    value={warehouseId ?? ""}
                    onChange={(id) => setWarehouseId(id || null)}
                    options={warehouseOptions}
                    placeholder="Select warehouse…"
                    triggerClassName={INVOICE_DETAIL_SELECT_CLASS}
                  />
                </InvoiceDetailField>
                <InvoiceDetailField label="Manual Reference No.">
                  <Input
                    className={INVOICE_DETAIL_INPUT_CLASS}
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="Optional"
                  />
                </InvoiceDetailField>
              </div>
            </div>
            {selectedFY?.label ? (
              <p className="text-[11px] text-muted-foreground mt-2">
                Working FY:{" "}
                <span className="font-medium text-foreground">{selectedFY.label}</span>
              </p>
            ) : null}
          </VoucherFormSectionCard>

          <VoucherFormSectionCard
            title="Service Lines"
            flush
            headerActions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="so-section-header-btn"
                onClick={addLine}
              >
                <Plus /> Add Service Line
              </Button>
            }
          >
            <div className="so-goods-product-table-wrap overflow-x-auto">
              <table className="so-invoice-table text-xs w-max min-w-[1520px]">
                <thead>
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
                      { label: "", align: "left" as const, className: "so-col-actions" },
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
                            className={cn(VOUCHER_INPUT_CLASS, "text-xs")}
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
                          <ServiceInvoiceLineLedgerSelect
                            value={isLedgerUuid(line.incomeLedgerId) ? line.incomeLedgerId : null}
                            fallbackLabel={line.incomeLedgerName || undefined}
                            onChange={(ledger) =>
                              updateLine(line.id, {
                                incomeLedgerId: ledger.ledgerId,
                                incomeLedgerName: ledger.ledgerName,
                              })
                            }
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
                            triggerClassName={cn(VOUCHER_INPUT_CLASS, "text-xs")}
                          />
                        </td>
                        <td className="p-1.5 min-w-[65px] w-[65px]">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            className={cn(VOUCHER_INPUT_CLASS, "text-xs text-right tabular-nums")}
                            value={line.qty || ""}
                            onChange={(e) =>
                              updateLine(line.id, { qty: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="p-1.5 min-w-[70px] w-[70px]">
                          <Input
                            className={cn(VOUCHER_INPUT_CLASS, "text-xs")}
                            value={line.unit}
                            onChange={(e) => updateLine(line.id, { unit: e.target.value })}
                          />
                        </td>
                        <td className="p-1.5 min-w-[90px] w-[90px]">
                          <AccountsMoneyInput
                            className={cn(VOUCHER_INPUT_CLASS, "text-xs text-right")}
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
                            className={cn(VOUCHER_INPUT_CLASS, "text-xs text-right")}
                            value={line.discountPct || ""}
                            onChange={(e) =>
                              updateLine(line.id, {
                                discountPct: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </td>
                        <td className="p-1.5 min-w-[90px] w-[90px]">
                          <InvoiceTableReadonly value={formatINR(discountAmt)} muted />
                        </td>
                        <td className="p-1.5 min-w-[95px] w-[95px]">
                          <InvoiceTableReadonly value={formatINR(taxable)} />
                        </td>
                        <td className="p-1.5 min-w-[70px] w-[70px]">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            className={cn(VOUCHER_INPUT_CLASS, "text-xs text-right")}
                            value={line.taxPct || ""}
                            onChange={(e) =>
                              updateLine(line.id, { taxPct: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </td>
                        {interstate ? (
                          <td className="p-1.5 min-w-[90px] w-[90px]">
                            <InvoiceTableReadonly value={formatINR(split.igst)} muted />
                          </td>
                        ) : (
                          <>
                            <td className="p-1.5 min-w-[90px] w-[90px]">
                              <InvoiceTableReadonly value={formatINR(split.cgst)} muted />
                            </td>
                            <td className="p-1.5 min-w-[90px] w-[90px]">
                              <InvoiceTableReadonly value={formatINR(split.sgst)} muted />
                            </td>
                          </>
                        )}
                        <td className="p-1.5 min-w-[110px] w-[110px]">
                          <InvoiceTableReadonly value={formatINR(split.lineTotal)} strong />
                        </td>
                        <td className="p-1.5 so-col-actions">
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
          </VoucherFormSectionCard>

          <VoucherFormSectionCard
            title="Additional Charges"
            flush
            headerActions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="so-section-header-btn"
                onClick={() => addChargeRowRef.current?.()}
              >
                <Plus /> Add Charge
              </Button>
            }
          >
            <GoodsInvoiceAdditionalChargesEditor
              expenses={additionalExpenses}
              onChange={setAdditionalExpenses}
              interstate={interstate}
              tableVariant="invoice"
              hideAddButton
              onBindAddRow={(fn) => {
                addChargeRowRef.current = fn;
              }}
            />
          </VoucherFormSectionCard>

          <div className="grid grid-cols-1 gap-2.5 items-start lg:grid-cols-[minmax(0,1fr)_300px]">
            <VoucherFormSectionCard title="Narration">
              <Textarea
                className={cn(VOUCHER_INPUT_CLASS, "so-goods-narration min-h-[60px] h-auto resize-y")}
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Optional narration for this invoice…"
                maxLength={500}
              />
            </VoucherFormSectionCard>

            <VoucherFormSectionCard title="Summary" className="lg:sticky lg:top-3 lg:z-10">
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
                  <span className="so-summary-label">Additional Charges</span>
                  <span className="so-summary-value">{formatINR(summaryAdditionalCharges)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="so-summary-label">Taxable Amount</span>
                  <span className="so-summary-value">{formatINR(summaryTaxableAmount)}</span>
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
            </VoucherFormSectionCard>
          </div>
        </div>
      </InvoiceFormLayout>
    </div>
  );
}
