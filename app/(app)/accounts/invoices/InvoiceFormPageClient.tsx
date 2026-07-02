"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	isSezGstCategory,
	getSezSupplyTypeLabel,
} from "@/lib/masters/gst-compliance";
import {
	LUT_SUPPLY_DECLARATION,
	resolveSezLutSupply,
} from "@/lib/settings/gst-tax-config";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  buildSalesInvoicePrefill,
  type SalesInvoicePrefill,
} from "@/lib/accounts/sales-invoice-prefill";
import { buildSalesInvoicePrefillFromDispatch, mapDispatchSchemeToInvoiceSettlement } from "@/lib/accounts/dispatch-invoice-bridge";
import type { PendingDispatchInvoiceRow } from "@/lib/accounts/dispatch-invoice-bridge";
import type { DispatchNearExpirySchemeEntry } from "@/app/(app)/warehouse/dispatch/types";
import { InvoiceSchemeSettlementPanel } from "./components/InvoiceSchemeSettlementPanel";
import { InvoiceLinesEditor } from "./components/InvoiceLinesEditor";
import { SalesInvoiceCustomerSection } from "./components/SalesInvoiceCustomerSection";
import { SalesInvoiceDispatchSelect } from "./components/SalesInvoiceDispatchSelect";
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
  type InvoiceNearExpirySchemeSettlement,
  type InvoiceStatus,
} from "./invoices-data";
import { formatINR, INVOICES_LIST_PATH } from "./invoice-utils";
import { SalesInvoiceAccountingPanel } from "@/components/accounts/SalesInvoiceAccountingPanel";
import { getOrderById } from "@/app/(app)/sales/orders/orders-data";
import { cn } from "@/lib/utils";
import {
  customerMasterToTransactionFields,
  type CustomerTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

const CHARGE_INPUT_CLASS =
  "h-8 text-sm tabular-nums text-right w-28 ml-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function ReadOnlyField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-xs font-medium py-1.5 px-2.5 bg-muted/25 rounded-md border border-border/50 min-h-[32px] flex items-center mt-1">
        {value || "—"}
      </p>
    </div>
  );
}

export default function InvoiceFormPageClient({ invoiceId }: { invoiceId?: number }) {
  const router = useRouter();
  const isEdit = invoiceId != null;
  const customers = useMemo(() => getCustomersForInvoice(), []);

  const [invoiceNo, setInvoiceNo] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerCode, setCustomerCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerGst, setCustomerGst] = useState("");
  const [customerGstCategory, setCustomerGstCategory] = useState("");
  const [sezSupplyType, setSezSupplyType] = useState("");
  const [lutNumber, setLutNumber] = useState("");
  const [lutDeclaration, setLutDeclaration] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [pan, setPan] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [creditDays, setCreditDays] = useState(30);
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [stateName, setStateName] = useState("");
  const [gstTreatment, setGstTreatment] = useState("");
  const [receivableLedger, setReceivableLedger] = useState("");
  const [customerFields, setCustomerFields] = useState<CustomerTransactionFields | null>(null);
  const [billToId, setBillToId] = useState("");
  const [shipToId, setShipToId] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [internalRemarks, setInternalRemarks] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [shippingCharges, setShippingCharges] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [salesOrderId, setSalesOrderId] = useState<number | null>(null);
  const [sourceDispatchId, setSourceDispatchId] = useState("");
  const [selectedDispatchId, setSelectedDispatchId] = useState("");
  const [customerLedgerId, setCustomerLedgerId] = useState<number | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [salesOrderRef, setSalesOrderRef] = useState("");
  const [dispatchRef, setDispatchRef] = useState("");
  const [branch, setBranch] = useState("Head Office");
  const [warehouse, setWarehouse] = useState("Central Warehouse");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState([createEmptyLine()]);
  const [attachments] = useState<InvoiceAttachment[]>([]);
  const [schemeSettlementEntries, setSchemeSettlementEntries] = useState<
    DispatchNearExpirySchemeEntry[] | InvoiceNearExpirySchemeSettlement[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const products = useMemo(
    () => getProductsForInvoice(customerId ? Number(customerId) : undefined),
    [customerId],
  );

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDueDate(d.toISOString().slice(0, 10));
  }, []);

  const searchParams = useSearchParams();

  const applyCustomerTransactionFields = (fields: CustomerTransactionFields) => {
    setCustomerFields(fields);
    setBillToId(fields.defaultBillToId);
    setShipToId(fields.defaultShipToId);
    setCustomerCode(fields.customerCode);
    setCustomerName(fields.customerName);
    setCustomerMobile(fields.customerMobile);
    setCustomerEmail(fields.customerEmail);
    setCustomerGst(fields.customerGst);
    setCustomerGstCategory(fields.customerGstCategory ?? "");
    setBillingAddress(fields.billingAddress);
    setShippingAddress(fields.shippingAddress);
    setPan(fields.pan);
    setContactPerson(fields.contactPerson);
    setPaymentTerms(fields.paymentTerms);
    setCreditDays(fields.creditDays);
    setPlaceOfSupply(fields.placeOfSupply);
    setStateName(fields.state);
    setGstTreatment(fields.gstTreatment);
    setReceivableLedger(fields.receivableLedger);
  };

  const applyCustomerFields = (f: ReturnType<typeof customerToInvoiceFields>, full?: CustomerTransactionFields) => {
    setCustomerCode(f.customerCode ?? "");
    setCustomerName(f.customerName);
    setCustomerMobile(f.customerMobile);
    setCustomerEmail(f.customerEmail);
    setCustomerGst(f.customerGst);
    setCustomerGstCategory(f.customerGstCategory ?? "");
    setBillingAddress(f.billingAddress);
    setShippingAddress(f.shippingAddress || f.billingAddress);
    setPan(f.pan ?? "");
    setContactPerson(f.contactPerson ?? "");
    setPaymentTerms(f.paymentTerms ?? "Net 30");
    setCreditDays(f.creditDays ?? 30);
    setPlaceOfSupply(f.placeOfSupply ?? "");
    setStateName(f.state ?? "");
    setGstTreatment(f.gstTreatment ?? "");
    setReceivableLedger(f.receivableLedger ?? f.customerName);
    if (full) applyCustomerTransactionFields(full);
  };

  const applySalesInvoicePrefill = (prefill: SalesInvoicePrefill) => {
    if (prefill.lineErrors.length > 0) {
      setError(prefill.lineErrors.join(" "));
    } else {
      setError(null);
    }

    setSalesOrderId(prefill.salesOrderId);
    setSourceDispatchId(prefill.sourceDispatchId);
    setSelectedDispatchId(prefill.sourceDispatchId);
    setCustomerLedgerId(prefill.customerLedgerId);
    setSalesOrderRef(prefill.salesOrderNo);
    setDispatchRef(prefill.dispatchNo);
    setReferenceNo(prefill.referenceNo);
    setBranch(prefill.branch);
    setWarehouse(prefill.warehouse);
    setSalesperson(prefill.salesperson);
    setPaymentTerms(prefill.paymentTerms);
    setCreditDays(prefill.creditDays);
    setDueDate(prefill.dueDate);
    if (prefill.invoiceDate) setInvoiceDate(prefill.invoiceDate);
    setCustomerId(prefill.customerId ? String(prefill.customerId) : "");
    setCustomerCode(prefill.customerCode);
    setCustomerName(prefill.customerName);
    setCustomerMobile(prefill.customerMobile);
    setCustomerEmail(prefill.customerEmail);
    setCustomerGst(prefill.customerGst);
    setCustomerGstCategory(prefill.customerGstCategory ?? "");
    setBillingAddress(prefill.billingAddress);
    setShippingAddress(prefill.shippingAddress);
    setPan(prefill.pan);
    setContactPerson(prefill.contactPerson);
    setPlaceOfSupply(prefill.placeOfSupply);
    setStateName(prefill.state);
    setGstTreatment(prefill.gstTreatment);
    setReceivableLedger(prefill.receivableLedger);

    const customer = prefill.customerId
      ? customers.find((c) => c.id === prefill.customerId)
      : undefined;
    if (customer) {
      applyCustomerFields(customerToInvoiceFields(customer), customerMasterToTransactionFields(customer));
    }

    if (prefill.lineItems.length) setLines(prefill.lineItems);
    setSchemeSettlementEntries(prefill.nearExpirySchemes);
  };

  const clearDispatchLinkedFields = () => {
    setSelectedDispatchId("");
    setSourceDispatchId("");
    setSalesOrderId(null);
    setCustomerLedgerId(null);
    setSalesOrderRef("");
    setDispatchRef("");
    setReferenceNo("");
    setSalesperson("");
    setWarehouse("Central Warehouse");
    setBranch("Head Office");
    setLines([createEmptyLine()]);
    setError(null);
    setSchemeSettlementEntries([]);
  };

  const onCustomerSelect = (id: string, fields: CustomerTransactionFields | null) => {
    const customerChanged = customerId !== id;
    setCustomerId(id);
    if (!fields) {
      setCustomerFields(null);
      if (customerChanged) clearDispatchLinkedFields();
      return;
    }
    applyCustomerTransactionFields(fields);
    if (customerChanged) clearDispatchLinkedFields();
  };

  const onDispatchSelect = (dispatchId: string, row: PendingDispatchInvoiceRow | null) => {
    setSelectedDispatchId(dispatchId);
    if (!dispatchId || !row) {
      setSourceDispatchId("");
      setSalesOrderId(null);
      setSalesOrderRef("");
      setDispatchRef("");
      setReferenceNo("");
      setSalesperson("");
      setWarehouse("Central Warehouse");
      setBranch("Head Office");
      setLines([createEmptyLine()]);
      setError(null);
      setSchemeSettlementEntries([]);
      return;
    }

    const prefill = buildSalesInvoicePrefillFromDispatch(
      dispatchId,
      row.dispatchNo,
      row.salesOrderId ?? undefined,
    );
    if (prefill) applySalesInvoicePrefill(prefill);
  };

  useEffect(() => {
    if (isEdit) return;
    const dispatchId = searchParams.get("dispatchId");
    const soId = searchParams.get("so");
    const dispatchNo = searchParams.get("dispatch");
    if (!dispatchId && !soId) return;

    const prefill = buildSalesInvoicePrefill(
      soId ? Number(soId) : null,
      dispatchNo,
      dispatchId,
    );

    if (!prefill) {
      if (soId) {
        const order = getOrderById(Number(soId));
        if (!order) return;
        setSalesOrderRef(order.soNumber);
        setReferenceNo(order.soNumber);
        setSalesOrderId(order.id);
        if (order.customerId) {
          setCustomerId(String(order.customerId));
          const c = customers.find((x) => x.id === order.customerId);
          if (c) applyCustomerFields(customerToInvoiceFields(c), customerMasterToTransactionFields(c));
        } else {
          setCustomerName(order.customerName);
        }
      }
      return;
    }

    applySalesInvoicePrefill(prefill);
  }, [isEdit, searchParams, customers]);

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
    const c = rec.customerId ? customers.find((x) => x.id === rec.customerId) : undefined;
    setInvoiceNo(rec.invoiceNo);
    setCustomerId(rec.customerId ? String(rec.customerId) : "");
    setCustomerCode(c?.customerCode ?? "");
    setCustomerName(rec.customerName);
    setCustomerMobile(rec.customerMobile);
    setCustomerEmail(rec.customerEmail);
    setCustomerGst(rec.customerGst);
    setCustomerGstCategory(rec.customerGstCategory ?? "");
    setSezSupplyType(rec.sezSupplyType ?? "");
    setLutNumber(rec.lutNumber ?? "");
    setLutDeclaration(rec.lutDeclaration ?? "");
    setBillingAddress(rec.billingAddress);
    setShippingAddress(rec.shippingAddress ?? rec.billingAddress);
    setPan(rec.pan ?? "");
    setContactPerson(rec.contactPerson ?? "");
    setPaymentTerms(rec.paymentTerms ?? "Net 30");
    setCreditDays(rec.creditDays ?? 30);
    setPlaceOfSupply(rec.placeOfSupply ?? "");
    setStateName(rec.state ?? "");
    setGstTreatment(rec.gstTreatment ?? "");
    setReceivableLedger(rec.receivableLedger ?? rec.customerName);
    if (c) applyCustomerTransactionFields(customerMasterToTransactionFields(c));
    setSalesOrderRef(rec.salesOrderNo ?? rec.referenceNo ?? "");
    setDispatchRef(rec.dispatchNo ?? "");
    setBranch(rec.branch ?? "Head Office");
    setWarehouse(rec.warehouse ?? "Central Warehouse");
    setSalesperson(rec.salesperson ?? "");
    setSalesOrderId(rec.salesOrderId ?? null);
    setSourceDispatchId(rec.sourceDispatchId ?? "");
    setSelectedDispatchId(rec.sourceDispatchId ?? "");
    setCustomerLedgerId(rec.customerLedgerId ?? null);
    setCustomerNotes(rec.customerNotes ?? "");
    setTermsAndConditions(rec.termsAndConditions ?? "");
    setInternalRemarks(rec.internalRemarks ?? rec.remarks ?? "");
    setShippingCharges(rec.shippingCharges ?? 0);
    setOtherCharges(rec.otherCharges ?? 0);
    setRoundOff(rec.roundOff ?? 0);
    setInvoiceDate(rec.invoiceDate);
    setDueDate(rec.dueDate);
    setReferenceNo(rec.referenceNo);
    setRemarks(rec.remarks);
    setLines(rec.lineItems.length ? rec.lineItems : [createEmptyLine()]);
    setSchemeSettlementEntries(rec.nearExpirySchemeSettlements ?? []);
  }, [isEdit, invoiceId, router, customers]);

  const totals = useMemo(() => {
    const base = calculateInvoiceTotals(lines);
    const chargeDelta = shippingCharges + otherCharges + roundOff;
    return {
      ...base,
      grandTotal: Math.round((base.grandTotal + chargeDelta) * 100) / 100,
    };
  }, [lines, shippingCharges, otherCharges, roundOff]);

  const accountingPreview = useMemo(
    () => ({
      invoiceNo: invoiceNo || "Auto",
      invoiceStatus: "draft" as const,
      customerName: customerName.trim() || "Customer",
      grandTotal: totals.grandTotal,
      taxAmount: totals.taxAmount,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      lineItems: lines.filter((l) => l.productName || l.productId),
      placeOfSupply,
    }),
    [invoiceNo, customerName, totals, lines, placeOfSupply],
  );

  const showSezSupply = isSezGstCategory(customerGstCategory);

  const interstateGst = useMemo(() => {
    if (/igst/i.test(gstTreatment)) return true;
    if (placeOfSupply && stateName) return placeOfSupply.trim() !== stateName.trim();
    return false;
  }, [gstTreatment, placeOfSupply, stateName]);

  const sezLutResolution = useMemo(
    () =>
      showSezSupply
        ? resolveSezLutSupply({
            customerGstCategory,
            transactionDate: invoiceDate,
          })
        : { appliesLut: false },
    [showSezSupply, customerGstCategory, invoiceDate],
  );

  useEffect(() => {
    if (!showSezSupply) {
      setSezSupplyType("");
      setLutNumber("");
      setLutDeclaration("");
      return;
    }

    if (sezLutResolution.appliesLut) {
      setSezSupplyType("lut_bond");
      setLutNumber(sezLutResolution.lutNumber ?? "");
      setLutDeclaration(sezLutResolution.declaration ?? LUT_SUPPLY_DECLARATION);
      setLines((prev) => prev.map((line) => ({ ...line, taxPct: 0 })));
      return;
    }

    setSezSupplyType("with_igst");
    setLutNumber("");
    setLutDeclaration("");
  }, [showSezSupply, sezLutResolution.appliesLut, sezLutResolution.lutNumber, sezLutResolution.declaration, invoiceDate]);

  const buildInput = (invoiceStatus: InvoiceStatus) => ({
    invoiceDate,
    dueDate,
    referenceNo: referenceNo.trim() || salesOrderRef.trim(),
    remarks: internalRemarks.trim() || remarks.trim(),
    customerId: customerId ? Number(customerId) : null,
    customerName: customerName.trim(),
    customerMobile: customerMobile.trim(),
    customerEmail: customerEmail.trim(),
    customerGst: customerGst.trim(),
    customerGstCategory: customerGstCategory || undefined,
    sezSupplyType: showSezSupply && sezSupplyType
      ? (sezSupplyType as "lut_bond" | "with_igst")
      : undefined,
    lutNumber: sezLutResolution.appliesLut ? lutNumber : undefined,
    lutDeclaration: sezLutResolution.appliesLut ? lutDeclaration : undefined,
    billingAddress: billingAddress.trim(),
    shippingAddress: shippingAddress.trim(),
    pan: pan.trim(),
    contactPerson: contactPerson.trim(),
    paymentTerms,
    creditDays,
    placeOfSupply,
    state: stateName,
    gstTreatment,
    receivableLedger,
    salesOrderNo: salesOrderRef.trim(),
    salesOrderId,
    sourceDispatchId: sourceDispatchId || undefined,
    customerLedgerId,
    dispatchNo: dispatchRef.trim(),
    branch: branch.trim(),
    warehouse: warehouse.trim(),
    salesperson: salesperson.trim(),
    customerNotes: customerNotes.trim(),
    termsAndConditions: termsAndConditions.trim(),
    internalRemarks: internalRemarks.trim(),
    shippingCharges,
    otherCharges,
    roundOff,
    adjustment: 0,
    tdsTcs: 0,
    lineItems: lines.filter((l) => l.productName || l.productId),
    attachments,
    invoiceStatus,
    nearExpirySchemeSettlements: schemeSettlementEntries.length
      ? schemeSettlementEntries.map((entry) =>
          "settlementMethod" in entry
            ? entry
            : mapDispatchSchemeToInvoiceSettlement(entry),
        )
      : undefined,
  });

  const isManualInvoice = !sourceDispatchId;

  const submit = (asDraft: boolean) => {
    setError(null);
    if (!customerName.trim()) {
      setError("Select a customer from Customer Master.");
      return;
    }
    const validLines = lines.filter((l) => l.productName || l.productId);
    if (validLines.length === 0) {
      setError("Add at least one product or service line.");
      return;
    }
    const missingProduct = validLines.find((l) => !l.productId);
    if (missingProduct) {
      setError(
        `Product mapping missing for "${missingProduct.productName || "line item"}". Please check Product Master or regenerate from Pending Invoice.`,
      );
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
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Sales", isEdit ? "Edit Invoice" : "Create Invoice", INVOICES_LIST_PATH)}
      title={isEdit ? "Edit Sales Invoice" : "Create Sales Invoice"}
      description="Select customer and dispatch to auto-fill invoice details, or create a manual invoice."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push(INVOICES_LIST_PATH)}>
            Back
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={() => submit(false)}>
            Post Invoice
          </Button>
        </div>
      }
    >
      <div className="p-4 pb-10 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Section title="Customer Information">
            <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
              <SalesInvoiceCustomerSection
                customers={customers}
                customerId={customerId}
                onCustomerIdChange={onCustomerSelect}
                fields={customerFields}
                billToId={billToId}
                shipToId={shipToId}
                onBillToChange={(id, addr) => {
                  setBillToId(id);
                  setBillingAddress(addr);
                }}
                onShipToChange={(id, addr) => {
                  setShipToId(id);
                  setShippingAddress(addr);
                }}
                billingAddress={billingAddress}
                shippingAddress={shippingAddress}
              />
            </div>
          </Section>

          <Section title="Invoice Information">
            <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Invoice No.</Label>
                  <Input className="h-9 text-sm bg-muted/30" disabled value={isEdit ? invoiceNo : "Auto-generated"} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Invoice Date</Label>
                  <Input type="date" className="h-9 text-sm" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Due Date</Label>
                  <Input type="date" className="h-9 text-sm" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <ReadOnlyField label="Sales Order No." value={salesOrderRef} />
                <div className="sm:col-span-2">
                  <SalesInvoiceDispatchSelect
                    customerId={customerId}
                    value={selectedDispatchId}
                    onChange={onDispatchSelect}
                disabled={!customerId}
              />
                </div>
                <ReadOnlyField label="Branch" value={branch} />
                <ReadOnlyField label="Warehouse" value={warehouse} />
                <ReadOnlyField label="Place of Supply" value={placeOfSupply} />
                <ReadOnlyField label="GST Treatment" value={gstTreatment} />
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Salesperson</Label>
                  <Input className="h-9 text-sm" value={salesperson} onChange={(e) => setSalesperson(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              {showSezSupply && (
                <div className="rounded-lg border border-border/60 bg-white p-3 space-y-2">
                  <p className="text-xs font-medium">SEZ Customer — {getSezSupplyTypeLabel(sezSupplyType)}</p>
                  {sezLutResolution.appliesLut ? (
                    <p className="text-[11px] text-muted-foreground">
                      Active LUT: {lutNumber}. IGST will not be charged.
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">No active LUT — IGST applies.</p>
                  )}
                </div>
              )}
            </div>
          </Section>
        </div>

        {schemeSettlementEntries.length > 0 && (
          <InvoiceSchemeSettlementPanel entries={schemeSettlementEntries} />
        )}

        <Section title="Item Details">
          <InvoiceLinesEditor
            lines={lines}
            products={products}
            onChange={setLines}
            interstate={interstateGst}
            hideMasterHint
            manualEntry={isManualInvoice}
          />
        </Section>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          <Section title="Customer Notes &amp; Terms">
            <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Customer Notes</Label>
                <Textarea
                  className="min-h-[72px] text-sm resize-y"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Thanks for your business."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Terms &amp; Conditions</Label>
                <Textarea
                  className="min-h-[72px] text-sm resize-y"
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Internal Remarks</Label>
                <Textarea
                  className="min-h-[56px] text-sm resize-y"
                  value={internalRemarks}
                  onChange={(e) => setInternalRemarks(e.target.value)}
                  placeholder="Internal use only"
                />
              </div>
            </div>
          </Section>

          <div className="rounded-lg border border-border bg-white p-4 space-y-3 lg:sticky lg:top-3 lg:z-10 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Invoice Total</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4 py-1">
                <span className="text-muted-foreground">Sub Total</span>
                <span className="font-medium tabular-nums">{formatINR(totals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-1">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium tabular-nums text-amber-800">{formatINR(totals.discountTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-1">
                <Label className="text-muted-foreground font-normal">Shipping Charges</Label>
                <AccountsMoneyInput
                  className={CHARGE_INPUT_CLASS}
                  value={shippingCharges || ""}
                  onChange={(v) => setShippingCharges(v)}
                />
              </div>
              <div className="flex items-center justify-between gap-4 py-1">
                <Label className="text-muted-foreground font-normal">Other Charges</Label>
                <AccountsMoneyInput
                  className={CHARGE_INPUT_CLASS}
                  value={otherCharges || ""}
                  onChange={(v) => setOtherCharges(v)}
                />
              </div>
              <div className="flex items-center justify-between gap-4 py-1 border-t border-border/60 pt-2">
                <span className="text-muted-foreground">GST Total</span>
                <span className="font-medium tabular-nums">{formatINR(totals.taxAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-1">
                <Label className="text-muted-foreground font-normal">Round Off</Label>
                <AccountsMoneyInput
                  className={CHARGE_INPUT_CLASS}
                  value={roundOff || ""}
                  onChange={(v) => setRoundOff(v)}
                />
              </div>
              <div className="flex items-center justify-between gap-4 py-2 border-t border-border/60">
                <span className="font-semibold text-base">Total (₹)</span>
                <span className="font-bold text-lg tabular-nums text-brand-700">{formatINR(totals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        <Section title="Ledger Impact Preview">
          <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
            <SalesInvoiceAccountingPanel invoice={accountingPreview} />
          </div>
        </Section>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </AccountsPageShell>
  );
}
