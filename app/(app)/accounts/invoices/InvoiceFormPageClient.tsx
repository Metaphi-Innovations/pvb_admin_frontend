"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  InvoiceFormAddress,
  InvoiceFormCard,
  InvoiceFormField,
  InvoiceFormInput,
  InvoiceFormLayout,
  InvoiceFormReadOnly,
  InvoiceFormSection,
  INVOICE_FORM_GRID_CLASS,
  INVOICE_FORM_INPUT_CLASS,
  INVOICE_FORM_LABEL_CLASS,
  INVOICE_FORM_HELPER_CLASS,
} from "@/app/(app)/accounts/components/InvoiceFormLayout";
import {
  buildSalesInvoicePrefill,
  type SalesInvoicePrefill,
} from "@/lib/accounts/sales-invoice-prefill";
import { buildSalesInvoicePrefillFromDispatch, mapDispatchSchemeToInvoiceSettlement } from "@/lib/accounts/dispatch-invoice-bridge";
import type { PendingDispatchInvoiceRow } from "@/lib/accounts/dispatch-invoice-bridge";
import type { InvoiceDocumentType } from "@/lib/accounts/invoice-type";
import type { DispatchNearExpirySchemeEntry } from "@/app/(app)/warehouse/dispatch/types";
import { InvoiceApplicableSchemesPanel } from "./components/InvoiceApplicableSchemesPanel";
import { InvoiceLinesEditor } from "./components/InvoiceLinesEditor";
import { InvoiceProductLinesReadOnly } from "./components/InvoiceProductLinesReadOnly";
import { SalesOrderInvoiceLinesEditor } from "./components/SalesOrderInvoiceLinesEditor";
import { InvoiceAdditionalExpensesEditor } from "./components/InvoiceAdditionalExpensesEditor";
import { SalesInvoiceCustomerSection } from "./components/SalesInvoiceCustomerSection";
import { SalesInvoiceDocumentInfoSection } from "./components/SalesInvoiceDocumentInfoSection";
import { getDispatchById } from "@/lib/accounts/dispatch-invoice-bridge";
import {
  calculateInvoiceTotals,
  createEmptyLine,
  canEditInvoice,
  createInvoice,
  customerToInvoiceFields,
  getCustomersForInvoice,
  getInvoiceById,
  getProductsForInvoice,
  loadInvoices,
  updateInvoice,
  type InvoiceAttachment,
  type InvoiceNearExpirySchemeSettlement,
  type InvoiceStatus,
} from "./invoices-data";
import { formatINR, INVOICES_LIST_PATH } from "./invoice-utils";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { SalesInvoiceAccountingPanel } from "@/components/accounts/SalesInvoiceAccountingPanel";
import { getOrderById } from "@/app/(app)/sales/orders/orders-data";
import { cn } from "@/lib/utils";
import { useFormDirtySnapshot } from "@/lib/accounts/use-form-dirty-snapshot";
import {
  useTransactionFormCancel,
} from "@/components/accounts/TransactionFormCancel";
import {
  customerMasterToTransactionFields,
  type CustomerTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import { syncCustomerLedger } from "@/lib/accounts/erp-accounting-mapping";
import {
  getCustomerAddressesForSalesOrder,
  getDefaultBillShipAddressIds,
} from "@/app/(app)/sales/orders/sales-order-address-utils";
import {
  calcAdditionalExpensesTotals,
  createEmptyAdditionalExpense,
  deriveLegacyChargeFields,
  resolveInvoiceAdditionalExpenses,
  type InvoiceAdditionalExpense,
} from "./invoice-additional-expenses";
import {
  WarehouseMappedBankAccountSelect,
  getBankAccountPrintDetails,
} from "@/components/accounts/WarehouseMappedBankAccountSelect";
import {
  peekNextPvbSalesOrderInvoiceNo,
  type SalesInvoiceSourceType,
} from "@/lib/accounts/invoice-type";
import { splitInvoiceGst } from "@/lib/accounts/invoice-gst-breakup";
import "./sales-order-invoice-form-compact.css";

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <InvoiceFormSection title={title}>
      <div className={className}>{children}</div>
    </InvoiceFormSection>
  );
}

const CHARGE_INPUT_CLASS =
  "h-9 text-sm tabular-nums text-right w-28 ml-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function computeDueDate(baseDate: string, creditDays: number): string {
  const d = new Date(baseDate);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + creditDays);
  return d.toISOString().slice(0, 10);
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
  const [additionalExpenses, setAdditionalExpenses] = useState<InvoiceAdditionalExpense[]>([
    createEmptyAdditionalExpense(),
  ]);
  const [roundOff, setRoundOff] = useState(0);
  const [salesOrderId, setSalesOrderId] = useState<number | null>(null);
  const [invoiceType, setInvoiceType] = useState<InvoiceDocumentType>("sales");
  const [sourceType, setSourceType] = useState<SalesInvoiceSourceType | "">("");
  const [sourceDispatchId, setSourceDispatchId] = useState("");
  const [selectedDispatchId, setSelectedDispatchId] = useState("");
  const [customerLedgerId, setCustomerLedgerId] = useState<number | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [salesOrderRef, setSalesOrderRef] = useState("");
  const [dispatchRef, setDispatchRef] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
  const [branch, setBranch] = useState("Head Office");
  const [warehouse, setWarehouse] = useState("Central Warehouse");
  const [bankAccountId, setBankAccountId] = useState<number | null>(null);
  const [remarks, setRemarks] = useState("");
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState([createEmptyLine()]);
  const [attachments] = useState<InvoiceAttachment[]>([]);
  const [schemeSettlementEntries, setSchemeSettlementEntries] = useState<
    DispatchNearExpirySchemeEntry[] | InvoiceNearExpirySchemeSettlement[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewInvoiceNo, setPreviewInvoiceNo] = useState("");

  const searchParams = useSearchParams();
  const routeSourceType = searchParams.get("sourceType");
  /** Create flow opened from Pending → Sales Order Invoices → Generate. */
  const isSalesOrderGeneration =
    !isEdit && (routeSourceType === "sales_order" || sourceType === "sales_order");
  /** Create or edit of a Sales Order–sourced invoice (locked layout / output tax). */
  const isSalesOrderInvoice = isSalesOrderGeneration || sourceType === "sales_order";

  const products = useMemo(
    () => getProductsForInvoice(customerId ? Number(customerId) : undefined),
    [customerId],
  );

  useEffect(() => {
    if (invoiceDate && creditDays >= 0) {
      setDueDate(computeDueDate(invoiceDate, creditDays));
    }
  }, [invoiceDate, creditDays]);

  useEffect(() => {
    if (!isSalesOrderGeneration || isEdit) return;
    if (!invoiceDate?.trim()) {
      setPreviewInvoiceNo("");
      return;
    }
    setPreviewInvoiceNo(peekNextPvbSalesOrderInvoiceNo(loadInvoices(), invoiceDate));
  }, [isSalesOrderGeneration, isEdit, invoiceDate]);

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
    setInvoiceType(prefill.invoiceType ?? "sales");
    if (prefill.sourceType) setSourceType(prefill.sourceType);
    setSourceDispatchId(prefill.sourceDispatchId);
    setSelectedDispatchId(prefill.sourceDispatchId);
    setCustomerLedgerId(prefill.customerLedgerId);
    setSalesOrderRef(prefill.salesOrderNo);
    setDispatchRef(prefill.dispatchNo);
    const dispatch = prefill.sourceDispatchId ? getDispatchById(prefill.sourceDispatchId) : null;
    setDispatchDate(
      prefill.dispatchDate ||
        dispatch?.dispatchDate ||
        dispatch?.dispatch_date ||
        "",
    );
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
      // Keep prefilled credit days / payment terms after master re-apply for SO generation.
      if (prefill.sourceType === "sales_order") {
        setCreditDays(prefill.creditDays);
        setPaymentTerms(prefill.paymentTerms);
        setDueDate(prefill.dueDate);
        if (prefill.billingAddress) setBillingAddress(prefill.billingAddress);
        if (prefill.shippingAddress) setShippingAddress(prefill.shippingAddress);
        if (prefill.placeOfSupply) setPlaceOfSupply(prefill.placeOfSupply);
        if (prefill.customerGst) setCustomerGst(prefill.customerGst);
        if (prefill.customerCode) setCustomerCode(prefill.customerCode);
      }
    }

    if (prefill.lineItems.length) setLines(prefill.lineItems);
    if (prefill.additionalExpenses?.length) {
      setAdditionalExpenses(prefill.additionalExpenses);
    }
    setSchemeSettlementEntries(prefill.nearExpirySchemes);
  };

  const clearDispatchLinkedFields = () => {
    setSelectedDispatchId("");
    setSourceDispatchId("");
    setSalesOrderId(null);
    setCustomerLedgerId(null);
    setSalesOrderRef("");
    setDispatchRef("");
    setDispatchDate("");
    setReferenceNo("");
    setSalesperson("");
    setWarehouse("Central Warehouse");
    setBranch("Head Office");
    setLines([createEmptyLine()]);
    setError(null);
    setSchemeSettlementEntries([]);
  };

  const onCustomerSelect = (
    id: string,
    customer: Customer | null,
    addressDefaults?: {
      billToId: string;
      shipToId: string;
      billingAddress: string;
      shippingAddress: string;
    },
  ) => {
    const customerChanged = customerId !== id;
    setCustomerId(id);
    if (!customer) {
      setCustomerFields(null);
      if (customerChanged) clearDispatchLinkedFields();
      return;
    }
    applyCustomerTransactionFields(customerMasterToTransactionFields(customer));
    const ledger = syncCustomerLedger(customer);
    setCustomerLedgerId(ledger?.id ?? null);
    if (ledger?.accountName) setReceivableLedger(ledger.accountName);
    if (addressDefaults) {
      setBillToId(addressDefaults.billToId);
      setShipToId(addressDefaults.shipToId);
      setBillingAddress(addressDefaults.billingAddress);
      setShippingAddress(addressDefaults.shippingAddress);
    }
    if (customerChanged) clearDispatchLinkedFields();
  };

  const onDispatchSelect = (dispatchId: string, row: PendingDispatchInvoiceRow | null) => {
    setSelectedDispatchId(dispatchId);
    if (!dispatchId || !row) {
      setSourceDispatchId("");
      setSalesOrderId(null);
      setSalesOrderRef("");
      setDispatchRef("");
      setDispatchDate("");
      setReferenceNo("");
      setSalesperson("");
      setWarehouse("Central Warehouse");
      setBranch("Head Office");
      setLines([createEmptyLine()]);
      setError(null);
      setSchemeSettlementEntries([]);
      return;
    }

    setDispatchDate(row.dispatchDate);

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
    const routeSource = searchParams.get("sourceType");
    if (routeSource === "sales_order") setSourceType("sales_order");
    else if (routeSource === "stock_transfer") setSourceType("stock_transfer");
    else if (routeSource === "sample_order") setSourceType("sample_order");
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
        if (routeSource === "sales_order") setSourceType("sales_order");
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

    if (routeSource === "sales_order" && !prefill.sourceType) {
      prefill.sourceType = "sales_order";
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
    if (c) {
      applyCustomerTransactionFields(customerMasterToTransactionFields(c));
      const addresses = getCustomerAddressesForSalesOrder(c);
      const { billToAddressId, shipToAddressId } = getDefaultBillShipAddressIds(addresses);
      setBillToId(billToAddressId);
      setShipToId(shipToAddressId);
    }
    setSalesOrderRef(rec.salesOrderNo ?? rec.referenceNo ?? "");
    setDispatchRef(rec.dispatchNo ?? "");
    const dispatch = rec.sourceDispatchId ? getDispatchById(rec.sourceDispatchId) : null;
    setDispatchDate(rec.dispatchDate || dispatch?.dispatchDate || "");
    setBranch(rec.branch ?? "Head Office");
    setWarehouse(rec.warehouse ?? "Central Warehouse");
    setBankAccountId(rec.bankAccountId ?? null);
    setSalesperson(rec.salesperson ?? "");
    setSalesOrderId(rec.salesOrderId ?? null);
    setInvoiceType(rec.invoiceType ?? (rec.invoiceNo.startsWith("STI-") ? "stock_transfer" : "sales"));
    setSourceType(rec.sourceType ?? "");
    setSourceDispatchId(rec.sourceDispatchId ?? "");
    setSelectedDispatchId(rec.sourceDispatchId ?? "");
    setCustomerLedgerId(rec.customerLedgerId ?? null);
    setCustomerNotes(rec.customerNotes ?? "");
    setTermsAndConditions(rec.termsAndConditions ?? "");
    setInternalRemarks(rec.internalRemarks ?? rec.remarks ?? "");
    setNarration(rec.internalRemarks || rec.remarks || rec.customerNotes || "");
    const expenses = resolveInvoiceAdditionalExpenses(
      rec.additionalExpenses,
      rec.shippingCharges,
      rec.otherCharges,
    );
    setAdditionalExpenses(
      expenses.length ? expenses : [createEmptyAdditionalExpense()],
    );
    setRoundOff(rec.roundOff ?? 0);
    setInvoiceDate(rec.invoiceDate);
    setDueDate(rec.dueDate);
    setReferenceNo(rec.referenceNo);
    setRemarks(rec.remarks);
    setLines(rec.lineItems.length ? rec.lineItems : [createEmptyLine()]);
    setSchemeSettlementEntries(rec.nearExpirySchemeSettlements ?? []);
  }, [isEdit, invoiceId, router, customers]);

  const [baselineReady, setBaselineReady] = useState(false);
  useEffect(() => {
    setBaselineReady(false);
    const id = window.setTimeout(() => setBaselineReady(true), 350);
    return () => window.clearTimeout(id);
  }, [isEdit, invoiceId, searchParams.toString()]);

  const formSnapshot = useMemo(
    () => ({
      customerId,
      customerName,
      invoiceDate,
      dueDate,
      referenceNo,
      branch,
      warehouse,
      bankAccountId,
      remarks,
      narration,
      lines,
      additionalExpenses,
      roundOff,
      invoiceType,
      sourceType,
      selectedDispatchId,
      customerNotes,
      termsAndConditions,
      internalRemarks,
      salesperson,
      schemeSettlementEntries,
    }),
    [
      customerId,
      customerName,
      invoiceDate,
      dueDate,
      referenceNo,
      branch,
      warehouse,
      bankAccountId,
      remarks,
      narration,
      lines,
      additionalExpenses,
      roundOff,
      invoiceType,
      sourceType,
      selectedDispatchId,
      customerNotes,
      termsAndConditions,
      internalRemarks,
      salesperson,
      schemeSettlementEntries,
    ],
  );
  const isDirty = useFormDirtySnapshot(formSnapshot, { ready: baselineReady });
  const { requestCancel, discardDialog } = useTransactionFormCancel({
    listHref: INVOICES_LIST_PATH,
    isDirty,
  });

  const lineTotals = useMemo(() => calculateInvoiceTotals(lines), [lines]);

  const expenseTotals = useMemo(
    () => calcAdditionalExpensesTotals(additionalExpenses),
    [additionalExpenses],
  );

  const totals = useMemo(() => {
    const taxAmount =
      Math.round((lineTotals.taxAmount + expenseTotals.gstAmount) * 100) / 100;
    const subtotal =
      Math.round((lineTotals.subtotal + expenseTotals.taxableAmount) * 100) / 100;
    const grandTotal = Math.round(
      (lineTotals.subtotal -
        lineTotals.discountTotal +
        lineTotals.taxAmount +
        expenseTotals.taxableAmount +
        expenseTotals.gstAmount +
        roundOff) *
        100,
    ) / 100;
    return {
      subtotal,
      discountTotal: lineTotals.discountTotal,
      taxAmount,
      productSubtotal: lineTotals.subtotal,
      expenseTaxable: expenseTotals.taxableAmount,
      expenseGst: expenseTotals.gstAmount,
      grandTotal,
    };
  }, [lineTotals, expenseTotals, roundOff]);

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

  const buildInput = (invoiceStatus: InvoiceStatus) => {
    const soMode = isSalesOrderGeneration || sourceType === "sales_order";
    const narrationText = soMode ? narration.trim() : internalRemarks.trim() || remarks.trim();
    return {
      invoiceDate,
      dueDate,
      referenceNo: referenceNo.trim() || salesOrderRef.trim(),
      remarks: narrationText,
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
      dispatchDate: dispatchDate || undefined,
      sourceType: (sourceType || (soMode ? "sales_order" : undefined)) as
        | SalesInvoiceSourceType
        | undefined,
      customerLedgerId,
      dispatchNo: dispatchRef.trim(),
      branch: branch.trim(),
      warehouse: warehouse.trim(),
      bankAccountId,
      salesperson: salesperson.trim(),
      customerNotes: soMode ? "" : customerNotes.trim(),
      termsAndConditions: soMode ? "" : termsAndConditions.trim(),
      internalRemarks: soMode ? narrationText : internalRemarks.trim(),
      ...deriveLegacyChargeFields(additionalExpenses),
      additionalExpenses: additionalExpenses.filter(
        (e) => e.expenseHead.trim() || e.amount > 0,
      ),
      roundOff,
      adjustment: 0,
      tdsTcs: 0,
      lineItems: lines.filter((l) => l.productName || l.productId),
      attachments,
      invoiceStatus,
      invoiceType,
      nearExpirySchemeSettlements: schemeSettlementEntries.length
        ? schemeSettlementEntries.map((entry) =>
            "settlementMethod" in entry
              ? entry
              : mapDispatchSchemeToInvoiceSettlement(entry),
          )
        : undefined,
    };
  };

  const isManualInvoice = !sourceDispatchId;

  const isStockTransferInvoice = invoiceType === "stock_transfer";

  const outputGstSplit = useMemo(
    () => splitInvoiceGst(totals.taxAmount, interstateGst),
    [totals.taxAmount, interstateGst],
  );

  const submit = (asDraft: boolean) => {
    if (saving) return;
    setError(null);
    setSuccess(null);
    if (!customerName.trim()) {
      setError(
        isStockTransferInvoice
          ? "Destination warehouse is required."
          : "Select a customer from Customer Master.",
      );
      return;
    }
    if (isSalesOrderGeneration || sourceType === "sales_order") {
      if (!invoiceDate?.trim()) {
        setError("Invoice Date is required.");
        return;
      }
      if (bankAccountId == null) {
        setError("Select a Bank Account for the invoice PDF.");
        return;
      }
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
      setSaving(true);
      const status: InvoiceStatus = asDraft ? "draft" : "sent";
      if (isEdit && invoiceId != null) {
        updateInvoice(invoiceId, buildInput(status));
        dispatchAccountsDataChanged("sales-invoices");
        setSuccess(
          asDraft
            ? "Invoice saved as draft."
            : "Invoice saved and posted to ledger successfully.",
        );
        router.push(`${INVOICES_LIST_PATH}/${invoiceId}`);
        router.refresh();
      } else {
        const rec = createInvoice(buildInput(status));
        dispatchAccountsDataChanged("sales-invoices");
        setSuccess(
          asDraft
            ? "Invoice saved as draft."
            : isSalesOrderGeneration
              ? "Sales Invoice generated successfully."
              : "Invoice saved and posted to ledger successfully.",
        );
        router.push(`${INVOICES_LIST_PATH}/${rec.id}`);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save invoice.");
    } finally {
      setSaving(false);
    }
  };

  const soGen = isSalesOrderInvoice;

  return (
    <div className={cn(soGen && "sales-order-invoice-form-compact")}>
    <InvoiceFormLayout
      title={
        isEdit
          ? "Edit Sales Invoice"
          : soGen
            ? "Generate Sales Invoice"
            : "Create Sales Invoice"
      }
      subtitle={
        soGen
          ? "Details auto-fetched from linked Sales Order and Dispatch."
          : "Select customer and dispatch to auto-fill invoice details, or create a manual invoice."
      }
      breadcrumb={accountsBreadcrumb(
        "Transactions",
        isEdit ? "Edit Invoice" : soGen ? "Generate Invoice" : "Create Invoice",
        INVOICES_LIST_PATH,
      )}
      backHref={INVOICES_LIST_PATH}
      onBackClick={requestCancel}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={requestCancel}
          >
            Cancel
          </Button>
          {!isSalesOrderGeneration && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => submit(true)}
              disabled={saving}
            >
              Save Draft
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white border-0"
            onClick={() => submit(false)}
            disabled={saving}
          >
            {saving
              ? "Saving…"
              : isSalesOrderGeneration
                ? "Generate Invoice"
                : "Post Invoice"}
          </Button>
        </div>
      }
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 font-medium">
          {success}
        </div>
      )}

      <div className={cn(soGen ? "space-y-2.5" : "space-y-4")}>
        <InvoiceFormCard title={isStockTransferInvoice ? "Destination Warehouse" : "Customer"}>
          {isStockTransferInvoice ? (
            <div className={INVOICE_FORM_GRID_CLASS}>
              <InvoiceFormReadOnly label="Destination Warehouse" value={customerName} className="sm:col-span-2 lg:col-span-3" />
              <InvoiceFormReadOnly label="Source Warehouse" value={warehouse} />
              <InvoiceFormReadOnly label="Dispatch No." value={dispatchRef} mono />
              <InvoiceFormReadOnly label="Stock Transfer No." value={salesOrderRef} mono />
            </div>
          ) : soGen ? (
            <div className="so-inv-grid">
              <InvoiceFormReadOnly label="Customer Name" value={customerName} />
              <InvoiceFormReadOnly label="Customer Code" value={customerCode} mono />
              <InvoiceFormReadOnly label="Customer GSTIN" value={customerGst} mono />
              <InvoiceFormReadOnly label="Place of Supply" value={placeOfSupply} />
              <InvoiceFormAddress label="Billing Address" value={billingAddress} className="sm:col-span-2" />
              <InvoiceFormAddress label="Shipping Address" value={shippingAddress} className="sm:col-span-2" />
              <InvoiceFormReadOnly label="Branch" value={branch} />
              <InvoiceFormReadOnly label="Payment Terms" value={`${paymentTerms} · Net ${creditDays} days`} />
            </div>
          ) : (
            <SalesInvoiceCustomerSection
              customers={customers}
              customerId={customerId}
              onCustomerIdChange={onCustomerSelect}
              billToId={billToId}
              shipToId={shipToId}
              onBillToChange={(id, addr) => {
                setBillToId(id);
                setBillingAddress(addr);
              }}
              onShipToChange={(id, shipAddr) => {
                setShipToId(id);
                setShippingAddress(shipAddr);
              }}
            />
          )}
        </InvoiceFormCard>

        <InvoiceFormCard title="Invoice & Dispatch Details">
          <SalesInvoiceDocumentInfoSection
            isEdit={isEdit}
            invoiceNo={invoiceNo}
            invoiceDate={invoiceDate}
            onInvoiceDateChange={setInvoiceDate}
            dueDate={dueDate}
            creditDays={creditDays}
            salesOrderRef={salesOrderRef}
            dispatchRef={dispatchRef}
            dispatchDate={dispatchDate}
            sourceDispatchId={sourceDispatchId}
            customerId={customerId}
            selectedDispatchId={selectedDispatchId}
            onDispatchSelect={onDispatchSelect}
            showDispatchSelect={!isStockTransferInvoice && !soGen}
            previewInvoiceNo={soGen ? previewInvoiceNo : undefined}
            compactGrid={soGen}
            invoiceDateRequired={soGen}
          />
          {showSezSupply && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
              <p className="text-xs font-medium text-slate-800">SEZ Customer — {getSezSupplyTypeLabel(sezSupplyType)}</p>
              {sezLutResolution.appliesLut ? (
                <p className={INVOICE_FORM_HELPER_CLASS}>
                  Active LUT: {lutNumber}. IGST will not be charged.
                </p>
              ) : (
                <p className={INVOICE_FORM_HELPER_CLASS}>No active LUT — IGST applies.</p>
              )}
            </div>
          )}
          <div className={cn("mt-3", soGen ? "max-w-lg" : "max-w-md")}>
            <WarehouseMappedBankAccountSelect
              warehouseRef={warehouse}
              value={bankAccountId}
              onChange={(id) => setBankAccountId(id)}
              label={soGen ? "Bank Account (on invoice PDF)" : "Bank Account (for payment / print)"}
              required={soGen}
            />
            {bankAccountId != null && getBankAccountPrintDetails(bankAccountId) && (
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                {getBankAccountPrintDetails(bankAccountId)!.bankName} · A/c ending{" "}
                {String(getBankAccountPrintDetails(bankAccountId)!.accountNumber).slice(-4)} ·{" "}
                {getBankAccountPrintDetails(bankAccountId)!.branchName || "—"}
              </p>
            )}
          </div>
        </InvoiceFormCard>

        {!isStockTransferInvoice && !soGen && (
          <InvoiceApplicableSchemesPanel
            lines={lines}
            nearExpiryEntries={schemeSettlementEntries}
          />
        )}

        <Section title="Product Details">
          {soGen ? (
            <SalesOrderInvoiceLinesEditor
              lines={lines}
              onChange={setLines}
              interstate={interstateGst}
            />
          ) : isManualInvoice && !isStockTransferInvoice ? (
            <InvoiceLinesEditor
              lines={lines}
              products={products}
              onChange={setLines}
              interstate={interstateGst}
              hideMasterHint
              manualEntry
            />
          ) : (
            <InvoiceProductLinesReadOnly lines={lines} interstate={interstateGst} />
          )}
        </Section>

        <Section title="Additional Expenses">
          <InvoiceAdditionalExpensesEditor
            expenses={additionalExpenses}
            onChange={setAdditionalExpenses}
            defaultGstPct={18}
          />
        </Section>

        <div
          className={cn(
            "grid grid-cols-1 gap-4 items-start",
            soGen ? "lg:grid-cols-[minmax(0,1fr)_300px] gap-2.5" : "lg:grid-cols-[minmax(0,1fr)_340px]",
          )}
        >
          <Section title={soGen ? "Narration" : "Customer Notes &amp; Terms"}>
            <div
              className={cn(
                "rounded-lg border border-slate-200 bg-white space-y-3",
                soGen ? "p-3" : "p-4",
              )}
            >
              {soGen ? (
                <InvoiceFormField label="Narration">
                  <Textarea
                    className={cn(INVOICE_FORM_INPUT_CLASS, "min-h-[60px] max-h-28 resize-y text-xs")}
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    placeholder="Optional narration for this invoice…"
                    maxLength={500}
                  />
                </InvoiceFormField>
              ) : (
                <>
                  <InvoiceFormField label="Customer Notes">
                    <Textarea
                      className={cn(INVOICE_FORM_INPUT_CLASS, "min-h-[72px] resize-y")}
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="Thanks for your business."
                    />
                  </InvoiceFormField>
                  <InvoiceFormField label="Terms &amp; Conditions">
                    <Textarea
                      className={cn(INVOICE_FORM_INPUT_CLASS, "min-h-[72px] resize-y")}
                      value={termsAndConditions}
                      onChange={(e) => setTermsAndConditions(e.target.value)}
                    />
                  </InvoiceFormField>
                  <InvoiceFormField label="Internal Remarks">
                    <Textarea
                      className={cn(INVOICE_FORM_INPUT_CLASS, "min-h-[72px] resize-y")}
                      value={internalRemarks}
                      onChange={(e) => setInternalRemarks(e.target.value)}
                      placeholder="Internal use only"
                    />
                  </InvoiceFormField>
                </>
              )}
            </div>
          </Section>

          <div
            className={cn(
              "rounded-lg border border-slate-200 bg-white space-y-2 lg:sticky lg:top-3 lg:z-10 shadow-sm",
              soGen ? "p-3" : "p-4 space-y-3",
            )}
          >
            <h2 className="accounts-card-title">Invoice Summary</h2>
            <div className={cn("space-y-1.5", soGen ? "text-xs" : "text-sm space-y-2")}>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="text-muted-foreground">Gross Amount</span>
                <span className="font-medium tabular-nums">{formatINR(totals.productSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium tabular-nums text-amber-800">
                  {formatINR(totals.discountTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="text-muted-foreground">Taxable Amount</span>
                <span className="font-medium tabular-nums">
                  {formatINR(
                    Math.max(0, totals.productSubtotal - totals.discountTotal + totals.expenseTaxable),
                  )}
                </span>
              </div>
              {soGen ? (
                interstateGst ? (
                  <div className="flex items-center justify-between gap-4 py-0.5 border-t border-border/60 pt-1.5">
                    <span className="text-muted-foreground">Output IGST</span>
                    <span className="font-medium tabular-nums">{formatINR(outputGstSplit.igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-4 py-0.5 border-t border-border/60 pt-1.5">
                      <span className="text-muted-foreground">Output CGST</span>
                      <span className="font-medium tabular-nums">{formatINR(outputGstSplit.cgst)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-0.5">
                      <span className="text-muted-foreground">Output SGST</span>
                      <span className="font-medium tabular-nums">{formatINR(outputGstSplit.sgst)}</span>
                    </div>
                  </>
                )
              ) : (
                <div className="flex items-center justify-between gap-4 py-0.5 border-t border-border/60 pt-1.5">
                  <span className="text-muted-foreground">GST Total</span>
                  <span className="font-medium tabular-nums">{formatINR(totals.taxAmount)}</span>
                </div>
              )}
              {(totals.expenseTaxable > 0 || soGen) && (
                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="text-muted-foreground">Additional Expenses</span>
                  <span className="font-medium tabular-nums">{formatINR(totals.expenseTaxable)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 py-0.5">
                <Label className="text-muted-foreground font-normal text-xs">Round Off</Label>
                <AccountsMoneyInput
                  className={CHARGE_INPUT_CLASS}
                  value={roundOff || ""}
                  onChange={(v) => setRoundOff(v)}
                />
              </div>
              <div className="flex items-center justify-between gap-4 py-1.5 border-t border-border/60">
                <span className="font-semibold text-sm">Grand Total</span>
                <span className="font-bold text-sm tabular-nums text-brand-700">
                  {formatINR(totals.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {!soGen && (
          <Section title="Ledger Impact Preview">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <SalesInvoiceAccountingPanel invoice={accountingPreview} />
            </div>
          </Section>
        )}
      </div>
    </InvoiceFormLayout>
    {discardDialog}
    </div>
  );
}
