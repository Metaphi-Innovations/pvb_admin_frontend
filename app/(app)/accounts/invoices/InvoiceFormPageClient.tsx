"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { buildSalesInvoicePrefillFromDispatch, mapDispatchSchemeToInvoiceSettlement, getDispatchById, resolveWarehouseMaster } from "@/lib/accounts/dispatch-invoice-bridge";
import type { PendingDispatchInvoiceRow } from "@/lib/accounts/dispatch-invoice-bridge";
import type { InvoiceDocumentType } from "@/lib/accounts/invoice-type";
import type { DispatchNearExpirySchemeEntry } from "@/app/(app)/warehouse/dispatch/types";
import { InvoiceApplicableSchemesPanel } from "./components/InvoiceApplicableSchemesPanel";
import { InvoiceLinesEditor } from "./components/InvoiceLinesEditor";
import { InvoiceProductLinesReadOnly } from "./components/InvoiceProductLinesReadOnly";
import { SalesOrderInvoiceLinesEditor } from "./components/SalesOrderInvoiceLinesEditor";
import {
  StockTransferInvoiceLinesEditor,
  validateStockTransferCostPrices,
} from "./components/StockTransferInvoiceLinesEditor";
import {
  StockTransferWarehouseDetailsSection,
  StockTransferInvoiceDetailsSection,
} from "./components/StockTransferHeaderSections";
import {
  SampleOrderCustomerSection,
  SampleOrderProformaDetailsSection,
} from "./components/SampleOrderHeaderSections";
import { SampleOrderInvoiceLinesEditor } from "./components/SampleOrderInvoiceLinesEditor";
import {
  validateSampleOrderBatchStock,
  validateSampleOrderCostPrices,
} from "./components/SampleOrderInvoiceLinesEditor";
import { InvoiceAdditionalExpensesEditor } from "./components/InvoiceAdditionalExpensesEditor";
import {
  GoodsInvoiceAdditionalChargesEditor,
  enrichExpensesFromChargeMaster,
  validateGoodsAdditionalCharges,
} from "./components/GoodsInvoiceAdditionalChargesEditor";
import { SalesInvoiceCustomerSection } from "./components/SalesInvoiceCustomerSection";
import { CustomerPartyInfoButton } from "./components/CustomerPartyInfo";
import { SalesInvoiceDocumentInfoSection } from "./components/SalesInvoiceDocumentInfoSection";
import {
  GoodsTransportStatutorySection,
  EMPTY_TRANSPORT_STATUTORY,
  type GoodsTransportStatutoryState,
  type GoodsEwayStatus,
  type GoodsEInvoiceStatus,
} from "./components/GoodsTransportStatutorySection";
import { GoodsStatutoryGenerationSection } from "./components/GoodsStatutoryGenerationSection";
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
  recalculateLineItem,
  updateInvoice,
  type InvoiceAttachment,
  type InvoiceNearExpirySchemeSettlement,
  type InvoiceStatus,
} from "./invoices-data";
import { formatINR, INVOICES_LIST_PATH } from "./invoice-utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { sampleOrderInventoryImpactResolved } from "@/lib/accounts/resolved-impact-previews";
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
  peekNextSampleOrderProformaNo,
  peekNextStockTransferInvoiceNo,
  type InvoiceDocumentKind,
  type SalesInvoiceSourceType,
} from "@/lib/accounts/invoice-type";
import { splitInvoiceGst } from "@/lib/accounts/invoice-gst-breakup";
import { inferInterstateFromPlaceOfSupply } from "@/lib/accounts/gst-accounting";
import "./sales-order-invoice-form-compact.css";
import "./stock-transfer-invoice-form-compact.css";
import "./sample-order-invoice-form-compact.css";

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
  const [sourceWarehouseGstin, setSourceWarehouseGstin] = useState("");
  const [destinationWarehouseGstin, setDestinationWarehouseGstin] = useState("");
  const [sourceWarehouseState, setSourceWarehouseState] = useState("");
  const [destinationWarehouseState, setDestinationWarehouseState] = useState("");
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
  const [salesOrderDate, setSalesOrderDate] = useState("");
  const [dispatchRef, setDispatchRef] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
  const [billFrom, setBillFrom] = useState("");
  const [billTo, setBillTo] = useState("");
  const [shipTo, setShipTo] = useState("");
  const [dispatchQty, setDispatchQty] = useState(0);
  const [branch, setBranch] = useState("Head Office");
  const [warehouse, setWarehouse] = useState("Central Warehouse");
  const [bankAccountId, setBankAccountId] = useState<number | null>(null);
  const [remarks, setRemarks] = useState("");
  const [narration, setNarration] = useState("");
  const [transport, setTransport] = useState<GoodsTransportStatutoryState>(
    EMPTY_TRANSPORT_STATUTORY,
  );
  const [lines, setLines] = useState([createEmptyLine()]);
  const [attachments] = useState<InvoiceAttachment[]>([]);
  const [schemeSettlementEntries, setSchemeSettlementEntries] = useState<
    DispatchNearExpirySchemeEntry[] | InvoiceNearExpirySchemeSettlement[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewInvoiceNo, setPreviewInvoiceNo] = useState("");

  const patchTransport = useCallback((patch: Partial<GoodsTransportStatutoryState>) => {
    setTransport((prev) => ({ ...prev, ...patch }));
  }, []);

  const statutoryFingerprintRef = useRef<string | null>(null);

  const searchParams = useSearchParams();
  const routeSourceType = searchParams.get("sourceType");
  const routeDispatchId = searchParams.get("dispatchId");
  const routeSoId = searchParams.get("so");
  const routeDispatchNo = searchParams.get("dispatch");
  /** Create flow opened from Pending → Sales Order Invoices → Generate. */
  const isSalesOrderGeneration =
    !isEdit && (routeSourceType === "sales_order" || sourceType === "sales_order");
  /** Create or edit of a Sales Order–sourced invoice (locked layout / output tax). */
  const isSalesOrderInvoice = isSalesOrderGeneration || sourceType === "sales_order";
  /** Create flow from Pending → Stock Transfer → Generate. */
  const isStockTransferGeneration =
    !isEdit &&
    (routeSourceType === "stock_transfer" || sourceType === "stock_transfer");
  /** Create flow from Pending → Sample Order Invoices → Generate. */
  const isSampleOrderGeneration =
    !isEdit && (routeSourceType === "sample_order" || sourceType === "sample_order");
  const isSampleOrderInvoice = isSampleOrderGeneration || sourceType === "sample_order";

  const products = useMemo(
    () =>
      isSalesOrderInvoice
        ? []
        : getProductsForInvoice(customerId ? Number(customerId) : undefined),
    [customerId, isSalesOrderInvoice],
  );

  const invoicesCacheRef = useRef<ReturnType<typeof loadInvoices> | null>(null);
  const prefillKeyRef = useRef<string | null>(null);
  const savingRef = useRef(false);

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
    if (!invoicesCacheRef.current) {
      invoicesCacheRef.current = loadInvoices();
    }
    setPreviewInvoiceNo(
      peekNextPvbSalesOrderInvoiceNo(invoicesCacheRef.current, invoiceDate),
    );
  }, [isSalesOrderGeneration, isEdit, invoiceDate]);

  useEffect(() => {
    if (!isStockTransferGeneration || isEdit) return;
    if (!invoiceDate?.trim()) {
      setPreviewInvoiceNo("");
      return;
    }
    if (!invoicesCacheRef.current) {
      invoicesCacheRef.current = loadInvoices();
    }
    setPreviewInvoiceNo(
      peekNextStockTransferInvoiceNo(invoicesCacheRef.current, invoiceDate),
    );
  }, [isStockTransferGeneration, isEdit, invoiceDate]);

  useEffect(() => {
    if (!isStockTransferGeneration || isEdit) return;
    if (sourceWarehouseGstin.trim() && destinationWarehouseGstin.trim() && placeOfSupply.trim()) {
      return;
    }
    const sourceWh = resolveWarehouseMaster(warehouse);
    const destWh = resolveWarehouseMaster(customerName);
    if (!sourceWarehouseGstin.trim() && sourceWh?.gstNumber) {
      setSourceWarehouseGstin(sourceWh.gstNumber);
    }
    if (!sourceWarehouseState.trim() && sourceWh?.state) {
      setSourceWarehouseState(sourceWh.state);
    }
    if (!destinationWarehouseGstin.trim() && destWh?.gstNumber) {
      setDestinationWarehouseGstin(destWh.gstNumber);
    }
    if (!destinationWarehouseState.trim() && destWh?.state) {
      setDestinationWarehouseState(destWh.state);
    }
    if (!placeOfSupply.trim() && destWh?.state) {
      setPlaceOfSupply(destWh.state);
      setStateName(destWh.state);
    }
  }, [
    isStockTransferGeneration,
    isEdit,
    warehouse,
    customerName,
    sourceWarehouseGstin,
    destinationWarehouseGstin,
    placeOfSupply,
    sourceWarehouseState,
    destinationWarehouseState,
  ]);

  useEffect(() => {
    if (!isSampleOrderGeneration || isEdit) return;
    if (!invoiceDate?.trim()) {
      setPreviewInvoiceNo("");
      return;
    }
    if (!invoicesCacheRef.current) {
      invoicesCacheRef.current = loadInvoices();
    }
    setPreviewInvoiceNo(
      peekNextSampleOrderProformaNo(invoicesCacheRef.current, invoiceDate),
    );
  }, [isSampleOrderGeneration, isEdit, invoiceDate]);

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
    setSalesOrderDate(prefill.salesOrderDate || "");
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
    setBillFrom(prefill.billFrom || prefill.warehouse || "");
    setBillTo(prefill.billTo || prefill.customerName || "");
    setShipTo(prefill.shipTo || prefill.customerName || "");
    setDispatchQty(prefill.dispatchQty || 0);
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
    setSourceWarehouseGstin(prefill.sourceWarehouseGstin || "");
    setDestinationWarehouseGstin(prefill.destinationWarehouseGstin || "");
    setSourceWarehouseState(prefill.sourceWarehouseState || "");
    setDestinationWarehouseState(prefill.destinationWarehouseState || prefill.placeOfSupply || "");
    setTransport({
      ...EMPTY_TRANSPORT_STATUTORY,
      transportMode: prefill.transportMode || "",
      transporterName: prefill.transporterName || "",
      transporterId: prefill.transporterId || "",
      vehicleNo: prefill.vehicleNo || "",
      lrNo: prefill.lrNo || "",
      lrDate: prefill.lrDate || "",
      transportDocNo: prefill.transportDocNo || "",
      transportDocDate: prefill.transportDocDate || "",
      distanceKm:
        prefill.distanceKm != null && prefill.distanceKm > 0
          ? String(prefill.distanceKm)
          : "",
    });

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
        // Prefer bridge-resolved Place of Supply over blank master overwrite.
        setPlaceOfSupply(
          prefill.placeOfSupply ||
            customer.stateName ||
            customerMasterToTransactionFields(customer).placeOfSupply ||
            "",
        );
        if (prefill.customerGst) setCustomerGst(prefill.customerGst);
        if (prefill.customerCode) setCustomerCode(prefill.customerCode);
      }
    } else if (prefill.placeOfSupply) {
      setPlaceOfSupply(prefill.placeOfSupply);
    }

    if (prefill.lineItems.length) {
      const sp = prefill.salesperson?.trim() || "";
      const isSample = prefill.sourceType === "sample_order";
      setLines(
        prefill.lineItems.map((l) =>
          recalculateLineItem({
            ...l,
            salesperson: l.salesperson?.trim() || sp || undefined,
            dispatchReadyQty: l.dispatchReadyQty ?? l.qty,
            ...(isSample
              ? {
                  unitPrice: 0,
                  amount: 0,
                  dealerPrice: 0,
                  finalRate: 0,
                  description: "",
                  /** Keep taxPct / discountPct / scheme / costPrice from bridge for reference + inventory. */
                }
              : null),
          }),
        ),
      );
    }
    if (prefill.sourceType === "sample_order") {
      setAdditionalExpenses([]);
      setRoundOff(0);
    } else if (prefill.additionalExpenses?.length) {
      setAdditionalExpenses(enrichExpensesFromChargeMaster(prefill.additionalExpenses));
    }
    setSchemeSettlementEntries(prefill.nearExpirySchemes);
  };

  const clearDispatchLinkedFields = () => {
    setSelectedDispatchId("");
    setSourceDispatchId("");
    setSalesOrderId(null);
    setCustomerLedgerId(null);
    setSalesOrderRef("");
    setSalesOrderDate("");
    setDispatchRef("");
    setDispatchDate("");
    setBillFrom("");
    setBillTo("");
    setShipTo("");
    setDispatchQty(0);
    setReferenceNo("");
    setSalesperson("");
    setWarehouse("Central Warehouse");
    setBranch("Head Office");
    setTransport(EMPTY_TRANSPORT_STATUTORY);
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

  const onDispatchSelect = useCallback(
    (dispatchId: string, row: PendingDispatchInvoiceRow | null) => {
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
    },
    // applySalesInvoicePrefill closes over customers; customers is stable (memo once).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customers],
  );

  useEffect(() => {
    if (isEdit) return;
    const dispatchId = routeDispatchId;
    const soId = routeSoId;
    const dispatchNo = routeDispatchNo;
    const routeSource = routeSourceType;
    const prefillKey = `${routeSource ?? ""}|${dispatchId ?? ""}|${soId ?? ""}|${dispatchNo ?? ""}`;
    if (prefillKeyRef.current === prefillKey) return;
    prefillKeyRef.current = prefillKey;

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
  }, [isEdit, routeDispatchId, routeSoId, routeDispatchNo, routeSourceType, customers]);

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
      // Prefer invoice / resolved POS over master re-apply blank.
      setPlaceOfSupply(rec.placeOfSupply || c.stateName || "");
    }
    setSalesOrderRef(rec.salesOrderNo ?? rec.referenceNo ?? "");
    setSalesOrderDate("");
    setDispatchRef(rec.dispatchNo ?? "");
    const dispatch = rec.sourceDispatchId ? getDispatchById(rec.sourceDispatchId) : null;
    setDispatchDate(rec.dispatchDate || dispatch?.dispatchDate || "");
    setBillFrom(rec.warehouse ?? dispatch?.warehouse ?? "");
    setBillTo(rec.customerName);
    setShipTo(rec.customerName);
    setDispatchQty(rec.lineItems.reduce((s, l) => s + (l.qty || 0), 0));
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
    setTransport({
      ...EMPTY_TRANSPORT_STATUTORY,
      transportMode: rec.transportMode ?? "",
      transporterName: rec.transporterName ?? "",
      transporterId: rec.transporterId ?? "",
      vehicleNo: rec.vehicleNo ?? "",
      lrNo: rec.lrNo ?? "",
      lrDate: rec.lrDate ?? "",
      transportDocNo: rec.transportDocNo ?? "",
      transportDocDate: rec.transportDocDate ?? "",
      distanceKm:
        rec.distanceKm != null && rec.distanceKm > 0 ? String(rec.distanceKm) : "",
      ewayBillNo: rec.ewayBillNo ?? "",
      ewayBillExpiryDate: rec.ewayBillExpiryDate ?? "",
      ewayBillStatus: (rec.ewayBillStatus ?? "not_generated") as GoodsEwayStatus,
      eInvoiceNo: rec.eInvoiceNo ?? "",
      acknowledgementNo: rec.acknowledgementNo ?? "",
      acknowledgementDate: rec.acknowledgementDate ?? "",
      irn: rec.irn ?? "",
      eInvoiceStatus: (rec.eInvoiceStatus ?? "not_generated") as GoodsEInvoiceStatus,
      qrCodeAvailable: Boolean(rec.qrCodeAvailable),
    });
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
  const searchParamsKey = `${routeSourceType ?? ""}|${routeDispatchId ?? ""}|${routeSoId ?? ""}|${routeDispatchNo ?? ""}`;
  useEffect(() => {
    setBaselineReady(false);
    const id = window.setTimeout(() => setBaselineReady(true), 350);
    return () => window.clearTimeout(id);
  }, [isEdit, invoiceId, searchParamsKey]);

  /** Serialize heavy arrays independently so narration/bank edits don't re-stringify them. */
  const linesDirtyKey = useMemo(() => JSON.stringify(lines), [lines]);
  const expensesDirtyKey = useMemo(
    () => JSON.stringify(additionalExpenses),
    [additionalExpenses],
  );
  const schemesDirtyKey = useMemo(
    () => JSON.stringify(schemeSettlementEntries),
    [schemeSettlementEntries],
  );
  const transportDirtyKey = useMemo(() => JSON.stringify(transport), [transport]);

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
      linesDirtyKey,
      expensesDirtyKey,
      roundOff,
      invoiceType,
      sourceType,
      selectedDispatchId,
      customerNotes,
      termsAndConditions,
      internalRemarks,
      salesperson,
      schemesDirtyKey,
      transportDirtyKey,
      placeOfSupply,
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
      linesDirtyKey,
      expensesDirtyKey,
      roundOff,
      invoiceType,
      sourceType,
      selectedDispatchId,
      customerNotes,
      termsAndConditions,
      internalRemarks,
      salesperson,
      schemesDirtyKey,
      transportDirtyKey,
      placeOfSupply,
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

  const accountingPreview = useMemo(() => {
    if (isSalesOrderInvoice) return null;
    return {
      invoiceNo: invoiceNo || "Auto",
      invoiceStatus: "draft" as const,
      customerName: customerName.trim() || "Customer",
      grandTotal: totals.grandTotal,
      taxAmount: totals.taxAmount,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      lineItems: lines.filter((l) => l.productName || l.productId),
      placeOfSupply,
    };
  }, [
    isSalesOrderInvoice,
    invoiceNo,
    customerName,
    totals,
    lines,
    placeOfSupply,
  ]);

  const showSezSupply = isSezGstCategory(customerGstCategory);

  const interstateGst = useMemo(() => {
    if (invoiceType === "stock_transfer" || isStockTransferGeneration) {
      const src = sourceWarehouseState.trim();
      const dest = destinationWarehouseState.trim() || placeOfSupply.trim();
      if (src && dest) {
        return src.toLowerCase() !== dest.toLowerCase();
      }
    }
    if (/igst/i.test(gstTreatment)) return true;
    return inferInterstateFromPlaceOfSupply(placeOfSupply);
  }, [
    gstTreatment,
    placeOfSupply,
    invoiceType,
    isStockTransferGeneration,
    sourceWarehouseState,
    destinationWarehouseState,
  ]);

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
      setLines((prev) => {
        if (prev.every((line) => line.taxPct === 0)) return prev;
        return prev.map((line) =>
          line.taxPct === 0 ? line : { ...line, taxPct: 0 },
        );
      });
      return;
    }

    setSezSupplyType("with_igst");
    setLutNumber("");
    setLutDeclaration("");
  }, [
    showSezSupply,
    sezLutResolution.appliesLut,
    sezLutResolution.lutNumber,
    sezLutResolution.declaration,
  ]);

  const bankPrintDetails = useMemo(
    () => getBankAccountPrintDetails(bankAccountId),
    [bankAccountId],
  );

  const handleBankAccountChange = useCallback((id: number | null) => {
    setBankAccountId(id);
  }, []);

  const buildInput = (invoiceStatus: InvoiceStatus) => {
    const soMode = isSalesOrderGeneration || sourceType === "sales_order";
    const stMode = isStockTransferGeneration || sourceType === "stock_transfer";
    const smMode = isSampleOrderGeneration || sourceType === "sample_order";
    const goodsMode = soMode || stMode;
    const narrationText = goodsMode || smMode
      ? narration.trim()
      : internalRemarks.trim() || remarks.trim();
    const sampleLines = smMode
      ? lines
          .filter((l) => l.productName || l.productId)
          .map((l) =>
            recalculateLineItem({
              ...l,
              unitPrice: 0,
              amount: 0,
              dealerPrice: 0,
              finalRate: 0,
              description: "",
              /** Preserve taxPct / discountPct / scheme / costPrice for reference + inventory posting. */
            }),
          )
      : null;
    return {
      invoiceDate,
      dueDate: smMode ? invoiceDate : dueDate,
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
      paymentTerms: smMode ? "N/A" : paymentTerms,
      creditDays: smMode ? 0 : creditDays,
      placeOfSupply,
      state: stateName,
      gstTreatment,
      receivableLedger: smMode ? "" : receivableLedger,
      salesOrderNo: salesOrderRef.trim(),
      salesOrderId: smMode ? null : salesOrderId,
      sourceDispatchId: sourceDispatchId || undefined,
      dispatchDate: dispatchDate || undefined,
      sourceType: (sourceType ||
        (soMode
          ? "sales_order"
          : stMode
            ? "stock_transfer"
            : smMode
              ? "sample_order"
              : undefined)) as SalesInvoiceSourceType | undefined,
      customerLedgerId: smMode ? null : customerLedgerId,
      dispatchNo: dispatchRef.trim(),
      branch: branch.trim(),
      warehouse: warehouse.trim(),
      bankAccountId,
      salesperson: salesperson.trim(),
      transportMode: goodsMode ? transport.transportMode.trim() : undefined,
      transporterName: goodsMode ? transport.transporterName.trim() : undefined,
      transporterId: goodsMode ? transport.transporterId.trim() : undefined,
      vehicleNo: goodsMode ? transport.vehicleNo.trim() : undefined,
      lrNo: goodsMode ? transport.lrNo.trim() : undefined,
      lrDate: goodsMode ? transport.lrDate.trim() || undefined : undefined,
      transportDocNo: goodsMode ? transport.transportDocNo.trim() : undefined,
      transportDocDate: goodsMode ? transport.transportDocDate.trim() || undefined : undefined,
      distanceKm: goodsMode
        ? transport.distanceKm.trim()
          ? Number(transport.distanceKm)
          : null
        : undefined,
      ewayBillNo: goodsMode ? transport.ewayBillNo.trim() : undefined,
      ewayBillExpiryDate: goodsMode
        ? transport.ewayBillExpiryDate.trim() || undefined
        : undefined,
      ewayBillStatus: goodsMode ? transport.ewayBillStatus : undefined,
      eInvoiceNo: goodsMode ? transport.eInvoiceNo.trim() : undefined,
      acknowledgementNo: goodsMode ? transport.acknowledgementNo.trim() : undefined,
      acknowledgementDate: goodsMode
        ? transport.acknowledgementDate.trim() || undefined
        : undefined,
      irn: goodsMode ? transport.irn.trim() : undefined,
      eInvoiceStatus: goodsMode ? transport.eInvoiceStatus : undefined,
      qrCodeAvailable: goodsMode ? transport.qrCodeAvailable : undefined,
      customerNotes: goodsMode || smMode ? "" : customerNotes.trim(),
      termsAndConditions: goodsMode || smMode ? "" : termsAndConditions.trim(),
      internalRemarks: goodsMode || smMode ? narrationText : internalRemarks.trim(),
      ...(smMode
        ? deriveLegacyChargeFields([])
        : deriveLegacyChargeFields(additionalExpenses)),
      additionalExpenses: smMode
        ? []
        : additionalExpenses.filter((e) => e.expenseHead.trim() || e.amount > 0),
      roundOff: smMode ? 0 : roundOff,
      adjustment: 0,
      tdsTcs: 0,
      lineItems: sampleLines ?? lines.filter((l) => l.productName || l.productId),
      attachments,
      invoiceStatus,
      invoiceType: smMode ? ("sample_order" as const) : invoiceType,
      documentType: smMode
        ? ("proforma_invoice" as InvoiceDocumentKind)
        : undefined,
      nearExpirySchemeSettlements:
        smMode || !schemeSettlementEntries.length
          ? undefined
          : schemeSettlementEntries.map((entry) =>
              "settlementMethod" in entry
                ? entry
                : mapDispatchSchemeToInvoiceSettlement(entry),
            ),
    };
  };

  const isManualInvoice = !sourceDispatchId;

  const isStockTransferInvoice = invoiceType === "stock_transfer";

  const outputGstSplit = useMemo(
    () => splitInvoiceGst(totals.taxAmount, interstateGst),
    [totals.taxAmount, interstateGst],
  );

  /** Fingerprint of values that invalidate generated statutory docs when changed. */
  const statutoryValueFingerprint = useMemo(
    () =>
      JSON.stringify({
        lines: lines.map((l) => ({
          id: l.id,
          qty: l.qty,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct,
          taxPct: l.taxPct,
          amount: l.amount,
        })),
        expenses: additionalExpenses.map((e) => ({
          id: e.id,
          amount: e.amount,
          gstApplicable: e.gstApplicable,
          gstPct: e.gstPct,
          expenseHead: e.expenseHead,
        })),
        roundOff,
        placeOfSupply,
        invoiceDate,
        grandTotal: totals.grandTotal,
        taxAmount: totals.taxAmount,
        transportMode: transport.transportMode,
        vehicleNo: transport.vehicleNo,
        transporterName: transport.transporterName,
        distanceKm: transport.distanceKm,
        transportDocNo: transport.transportDocNo,
        transportDocDate: transport.transportDocDate,
      }),
    [
      lines,
      additionalExpenses,
      roundOff,
      placeOfSupply,
      invoiceDate,
      totals.grandTotal,
      totals.taxAmount,
      transport.transportMode,
      transport.vehicleNo,
      transport.transporterName,
      transport.distanceKm,
      transport.transportDocNo,
      transport.transportDocDate,
    ],
  );

  useEffect(() => {
    if (!isSalesOrderInvoice && !isStockTransferGeneration) return;
    const prevFp = statutoryFingerprintRef.current;
    if (prevFp == null) {
      statutoryFingerprintRef.current = statutoryValueFingerprint;
      return;
    }
    if (prevFp === statutoryValueFingerprint) return;

    const shouldMarkStale =
      transport.eInvoiceStatus === "generated" ||
      transport.ewayBillStatus === "generated" ||
      transport.ewayBillStatus === "manual";

    statutoryFingerprintRef.current = statutoryValueFingerprint;
    if (!shouldMarkStale) return;

    setTransport((prev) => {
      const next = { ...prev };
      let changed = false;
      if (prev.eInvoiceStatus === "generated") {
        next.eInvoiceStatus = "stale";
        changed = true;
      }
      if (prev.ewayBillStatus === "generated" || prev.ewayBillStatus === "manual") {
        next.ewayBillStatus = "stale";
        changed = true;
      }
      return changed ? next : prev;
    });
    // Only react to value fingerprint changes — status reads are intentional snapshots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSalesOrderInvoice, isStockTransferGeneration, statutoryValueFingerprint]);

  const scrollToStatutory = useCallback(() => {
    document.getElementById("goods-statutory-generation")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const validateGoodsInvoiceCore = useCallback((): string | null => {
    if (!customerName.trim()) return "Select a customer from Customer Master.";
    if (!invoiceDate?.trim()) return "Invoice Date is required.";
    if (bankAccountId == null) return "Select a Bank Account for the invoice PDF.";
    if (!placeOfSupply.trim()) {
      return "Place of Supply is required. Check customer / ship-to state.";
    }
    if (
      (gstTreatment === "registered" || customerGstCategory === "regular") &&
      !customerGst.trim()
    ) {
      return "Customer GSTIN is required for registered customers.";
    }
    const validLines = lines.filter((l) => l.productName || l.productId);
    if (validLines.length === 0) return "Add at least one product line.";
    const badQty = validLines.find((l) => !(l.qty > 0));
    if (badQty) {
      return `Invoice quantity must be greater than zero for "${badQty.productName || "line item"}".`;
    }
    const missingProduct = validLines.find((l) => !l.productId);
    if (missingProduct) {
      return `Product mapping missing for "${missingProduct.productName || "line item"}".`;
    }
    const chargeErr = validateGoodsAdditionalCharges(additionalExpenses);
    if (chargeErr) return chargeErr;
    return null;
  }, [
    customerName,
    invoiceDate,
    bankAccountId,
    placeOfSupply,
    gstTreatment,
    customerGstCategory,
    customerGst,
    lines,
    additionalExpenses,
  ]);

  const validateStockTransferInvoiceCore = useCallback((): string | null => {
    if (!customerName.trim()) return "Destination warehouse is required.";
    if (!warehouse.trim()) return "Source warehouse is required.";
    if (!invoiceDate?.trim()) return "Invoice Date is required.";
    if (!placeOfSupply.trim()) {
      return "Place of Supply is required (Destination Warehouse State).";
    }
    if (!sourceWarehouseGstin.trim()) {
      return "Source Warehouse GSTIN is required. Update Warehouse Master.";
    }
    if (!destinationWarehouseGstin.trim()) {
      return "Destination Warehouse GSTIN is required. Update Warehouse Master.";
    }
    const validLines = lines.filter((l) => l.productName || l.productId);
    if (validLines.length === 0) return "Add at least one product line.";
    const badQty = validLines.find((l) => !(l.qty > 0));
    if (badQty) {
      return `Invoice quantity must be greater than zero for "${badQty.productName || "line item"}".`;
    }
    const missingProduct = validLines.find((l) => !l.productId);
    if (missingProduct) {
      return `Product mapping missing for "${missingProduct.productName || "line item"}".`;
    }
    const cpErr = validateStockTransferCostPrices(lines);
    if (cpErr) return cpErr;
    const chargeErr = validateGoodsAdditionalCharges(additionalExpenses);
    if (chargeErr) return chargeErr;
    return null;
  }, [
    customerName,
    warehouse,
    invoiceDate,
    placeOfSupply,
    sourceWarehouseGstin,
    destinationWarehouseGstin,
    lines,
    additionalExpenses,
  ]);

  const validateSampleOrderInvoiceCore = useCallback((): string | null => {
    if (!customerName.trim()) return "Customer is required.";
    if (!invoiceDate?.trim()) return "Invoice Date is required.";
    const validLines = lines.filter((l) => l.productName || l.productId);
    if (validLines.length === 0) return "Add at least one sample product line.";
    const badQty = validLines.find((l) => !(l.qty > 0));
    if (badQty) {
      return `Quantity must be greater than zero for "${badQty.productName || "line item"}".`;
    }
    const missingProduct = validLines.find((l) => !l.productId);
    if (missingProduct) {
      return `Product mapping missing for "${missingProduct.productName || "line item"}". Check Product Master.`;
    }
    const cpErr = validateSampleOrderCostPrices(validLines);
    if (cpErr) return cpErr;
    const stockErr = validateSampleOrderBatchStock(validLines);
    if (stockErr) return stockErr;
    return null;
  }, [customerName, invoiceDate, lines]);

  const validateGoodsTransportForEway = useCallback((): string | null => {
    if (!transport.transportMode.trim()) return "Transport Mode is required.";
    if (!transport.vehicleNo.trim() && !transport.transporterName.trim() && !transport.transporterId.trim()) {
      return "Enter Vehicle No. or Transporter Name / ID.";
    }
    if (!isStockTransferGeneration) {
      if (!transport.distanceKm.trim() || Number(transport.distanceKm) <= 0) {
        return "Distance (KM) is required.";
      }
    }
    if (!transport.transportDocNo.trim()) return "Transport Document No. is required.";
    if (!transport.transportDocDate.trim()) return "Transport Document Date is required.";
    if (!placeOfSupply.trim()) return "Place of Supply is required.";
    return null;
  }, [transport, placeOfSupply, isStockTransferGeneration]);

  const handleGenerateEInvoice = useCallback(() => {
    setError(null);
    setSuccess(null);
    const coreErr = isStockTransferGeneration
      ? validateStockTransferInvoiceCore()
      : validateGoodsInvoiceCore();
    if (coreErr) {
      setError(coreErr);
      scrollToStatutory();
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const ack = `ACK${Date.now().toString().slice(-10)}`;
    setTransport((prev) => ({
      ...prev,
      eInvoiceStatus: "generated",
      eInvoiceNo: `EINV/${today.replace(/-/g, "")}/${Math.floor(Math.random() * 9000 + 1000)}`,
      acknowledgementNo: ack,
      acknowledgementDate: today,
      irn: `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 34)}`.slice(0, 64),
      qrCodeAvailable: true,
    }));
    statutoryFingerprintRef.current = statutoryValueFingerprint;
    setSuccess("E-Invoice / IRN generated.");
  }, [
    isStockTransferGeneration,
    validateStockTransferInvoiceCore,
    validateGoodsInvoiceCore,
    scrollToStatutory,
    statutoryValueFingerprint,
  ]);

  const handleGenerateEway = useCallback(() => {
    setError(null);
    setSuccess(null);
    const coreErr = isStockTransferGeneration
      ? validateStockTransferInvoiceCore()
      : validateGoodsInvoiceCore();
    if (coreErr) {
      setError(coreErr);
      scrollToStatutory();
      return;
    }
    const transportErr = validateGoodsTransportForEway();
    if (transportErr) {
      setError(transportErr);
      document.getElementById("goods-transport-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    const today = new Date();
    const exp = new Date(today);
    exp.setDate(exp.getDate() + 1);
    setTransport((prev) => ({
      ...prev,
      ewayBillStatus: "generated",
      ewayBillNo: `EWB${Date.now().toString().slice(-12)}`,
      ewayBillExpiryDate: exp.toISOString().slice(0, 10),
    }));
    statutoryFingerprintRef.current = statutoryValueFingerprint;
    setSuccess("E-Way Bill generated.");
  }, [
    isStockTransferGeneration,
    validateStockTransferInvoiceCore,
    validateGoodsInvoiceCore,
    validateGoodsTransportForEway,
    scrollToStatutory,
    statutoryValueFingerprint,
  ]);

  const submit = (asDraft: boolean) => {
    if (savingRef.current || saving) return;
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
      if (!placeOfSupply.trim()) {
        setError("Place of Supply is required. Check customer / ship-to state.");
        return;
      }
      if (
        (gstTreatment === "registered" || customerGstCategory === "regular") &&
        !customerGst.trim()
      ) {
        setError("Customer GSTIN is required for registered customers.");
        return;
      }
      if (!asDraft) {
        if (!transport.transportMode.trim()) {
          setError("Transport Mode is required.");
          return;
        }
        if (!transport.vehicleNo.trim() && !transport.transporterName.trim()) {
          setError("Enter Vehicle No. or Transporter Name.");
          return;
        }
        if (!transport.distanceKm.trim() || Number(transport.distanceKm) <= 0) {
          setError("Distance (KM) is required.");
          return;
        }
        if (!transport.transportDocNo.trim()) {
          setError("Transport Document No. is required.");
          return;
        }
        if (!transport.transportDocDate.trim()) {
          setError("Transport Document Date is required.");
          return;
        }
        if (transport.ewayBillNo.trim() && !transport.ewayBillExpiryDate.trim()) {
          setError("E-Way Bill Expiry Date is required when E-Way Bill No. is entered.");
          return;
        }
      }
      const chargeErr = validateGoodsAdditionalCharges(additionalExpenses);
      if (chargeErr) {
        setError(chargeErr);
        return;
      }
    }
    if (isStockTransferGeneration || sourceType === "stock_transfer") {
      const stErr = validateStockTransferInvoiceCore();
      if (stErr) {
        setError(stErr);
        return;
      }
      if (!asDraft) {
        if (!transport.transportMode.trim()) {
          setError("Transport Mode is required.");
          return;
        }
        if (!transport.vehicleNo.trim() && !transport.transporterName.trim()) {
          setError("Enter Vehicle No. or Transporter Name.");
          return;
        }
        if (!transport.transportDocNo.trim()) {
          setError("Transport Document No. is required.");
          return;
        }
        if (!transport.transportDocDate.trim()) {
          setError("Transport Document Date is required.");
          return;
        }
      }
    }
    if (isSampleOrderGeneration || sourceType === "sample_order") {
      const smErr = validateSampleOrderInvoiceCore();
      if (smErr) {
        setError(smErr);
        return;
      }
    }
    const validLines = lines.filter((l) => l.productName || l.productId);
    if (validLines.length === 0) {
      setError("Add at least one product or service line.");
      return;
    }
    if (
      isSalesOrderGeneration ||
      sourceType === "sales_order" ||
      isStockTransferGeneration ||
      sourceType === "stock_transfer"
    ) {
      const badQty = validLines.find((l) => !(l.qty > 0));
      if (badQty) {
        setError(
          `Invoice quantity must be greater than zero for "${badQty.productName || "line item"}".`,
        );
        return;
      }
    }
    const missingProduct = validLines.find((l) => !l.productId);
    if (missingProduct) {
      setError(
        `Product mapping missing for "${missingProduct.productName || "line item"}". Please check Product Master or regenerate from Pending Invoice.`,
      );
      return;
    }
    try {
      savingRef.current = true;
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
              : isStockTransferGeneration
                ? "Stock Transfer Invoice generated successfully."
                : isSampleOrderGeneration
                  ? "Sample Order Proforma generated — inventory posted at Cost Price."
                  : "Invoice saved and posted to ledger successfully.",
        );
        router.push(`${INVOICES_LIST_PATH}/${rec.id}`);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save invoice.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleTopGenerateClick = () => {
    if (
      !isSalesOrderGeneration &&
      !isStockTransferGeneration &&
      !isSampleOrderGeneration
    ) {
      submit(false);
      return;
    }
    setError(null);
    const coreErr = isStockTransferGeneration
      ? validateStockTransferInvoiceCore()
      : isSampleOrderGeneration
        ? validateSampleOrderInvoiceCore()
        : validateGoodsInvoiceCore();
    if (coreErr) {
      setError(coreErr);
      if (!isSampleOrderGeneration) scrollToStatutory();
      return;
    }
    submit(false);
  };

  const soGen = isSalesOrderInvoice;
  const stGen = isStockTransferGeneration || (isStockTransferInvoice && !isEdit);
  const smGen = isSampleOrderGeneration || (isSampleOrderInvoice && !isEdit);
  const compactGen = soGen || stGen || smGen;

  const sampleCustomerMeta = useMemo(() => {
    if (!smGen || !customerName.trim()) return { customerType: "", salesperson: "" };
    const match =
      customers.find((c) => c.id === Number(customerId)) ||
      customers.find(
        (c) => c.customerName.trim().toLowerCase() === customerName.trim().toLowerCase(),
      );
    return {
      customerType: match?.customerType || "",
      salesperson: salesperson.trim() || match?.salesManName || "",
    };
  }, [smGen, customerName, customerId, customers, salesperson]);

  return (
    <div
      className={cn(
        soGen && "sales-order-invoice-form-compact",
        stGen && "sales-order-invoice-form-compact stock-transfer-invoice-form-compact",
        smGen && "sales-order-invoice-form-compact sample-order-invoice-form-compact",
      )}
    >
    <InvoiceFormLayout
      title={
        isEdit
          ? isStockTransferInvoice
            ? "Edit Stock Transfer Invoice"
            : isSampleOrderInvoice
              ? "Edit Sample Order Invoice"
              : "Edit Sales Invoice"
          : smGen
            ? "Generate Sample Order Invoice"
            : stGen
              ? "Generate Stock Transfer Invoice"
              : soGen
                ? "Generate Sales Invoice"
                : "Create Sales Invoice"
      }
      subtitle={
        smGen
          ? "Details auto-fetched from linked Sample Order and Dispatch."
          : stGen
            ? "Details auto-fetched from linked Stock Transfer and Dispatch."
            : soGen
              ? "Details auto-fetched from linked Sales Order and Dispatch."
              : "Select customer and dispatch to auto-fill invoice details, or create a manual invoice."
      }
      breadcrumb={accountsBreadcrumb(
        "Transactions",
        isEdit
          ? "Edit Invoice"
          : smGen
            ? "Generate Sample Order Invoice"
            : stGen
              ? "Generate Stock Transfer Invoice"
              : soGen
                ? "Generate Invoice"
                : "Create Invoice",
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
          {stGen ? (
            <span className="inline-flex items-center h-7 px-2.5 rounded-md border border-border bg-muted/40 text-[11px] font-semibold text-foreground">
              Stock Transfer
            </span>
          ) : null}
          {smGen ? (
            <span className="inline-flex items-center h-7 px-2.5 rounded-md border border-border bg-muted/40 text-[11px] font-semibold text-foreground">
              Sample Order
            </span>
          ) : null}
          {!isSalesOrderGeneration &&
            !isStockTransferGeneration &&
            !isSampleOrderGeneration && (
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
            onClick={
              isSalesOrderGeneration ||
              isStockTransferGeneration ||
              isSampleOrderGeneration
                ? handleTopGenerateClick
                : () => submit(false)
            }
            disabled={saving}
          >
            {saving
              ? "Saving…"
              : isSampleOrderGeneration
                ? "Generate Proforma Invoice"
                : isStockTransferGeneration
                  ? "Generate Stock Transfer Invoice"
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

      <div className={cn(compactGen ? "space-y-2.5" : "space-y-4")}>
        <InvoiceFormCard title={stGen ? "Warehouse Transfer Details" : isStockTransferInvoice ? "Destination Warehouse" : "Customer"}>
          {stGen ? (
            <StockTransferWarehouseDetailsSection
              sourceWarehouse={warehouse}
              destinationWarehouse={customerName}
              sourceGstin={sourceWarehouseGstin}
              destinationGstin={destinationWarehouseGstin}
              stockTransferNo={salesOrderRef}
              placeOfSupply={placeOfSupply}
            />
          ) : isStockTransferInvoice ? (
            <div className={INVOICE_FORM_GRID_CLASS}>
              <InvoiceFormReadOnly label="Destination Warehouse" value={customerName} className="sm:col-span-2 lg:col-span-3" />
              <InvoiceFormReadOnly label="Source Warehouse" value={warehouse} />
              <InvoiceFormReadOnly label="Dispatch No." value={dispatchRef} mono />
              <InvoiceFormReadOnly label="Stock Transfer No." value={salesOrderRef} mono />
            </div>
          ) : smGen ? (
            <SampleOrderCustomerSection
              customerName={customerName}
              customerCode={customerCode}
              customerGst={customerGst}
              billingAddress={billingAddress}
              shippingAddress={shippingAddress}
              placeOfSupply={placeOfSupply}
              branch={branch}
              customerType={sampleCustomerMeta.customerType}
              salesperson={sampleCustomerMeta.salesperson}
            />
          ) : soGen ? (
            <div className="so-goods-field-grid">
              <div className="so-goods-field so-w-customer">
                <p className="so-goods-field__label">Customer Name</p>
                <div className="so-goods-field__control">
                  <div className="so-goods-ro-with-info">
                    <span className="so-goods-ro-with-info__value">{customerName || "—"}</span>
                    {customerName ? (
                      <CustomerPartyInfoButton
                        className="so-goods-info-btn"
                        customerName={customerName}
                        customerCode={customerCode}
                        branch={branch}
                        gstin={customerGst}
                        billingAddress={billingAddress}
                        shippingAddress={shippingAddress}
                        placeOfSupply={placeOfSupply}
                        paymentTerms={paymentTerms}
                        creditLimit={
                          customerId
                            ? customers.find((c) => c.id === Number(customerId))?.creditLimit
                            : undefined
                        }
                      />
                    ) : null}
                  </div>
                </div>
                <p className="so-goods-field__helper">&nbsp;</p>
              </div>
              <div className="so-goods-field so-w-gstin">
                <p className="so-goods-field__label">GSTIN</p>
                <div className="so-goods-field__control">
                  <div className="so-goods-ro so-goods-ro--mono">{customerGst?.trim() || "—"}</div>
                </div>
                <p className="so-goods-field__helper">&nbsp;</p>
              </div>
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

        <InvoiceFormCard
          title={
            smGen
              ? "Sample Order & Proforma Details"
              : stGen || soGen
                ? "Invoice Details"
                : "Invoice & Dispatch Details"
          }
        >
          {stGen ? (
            <StockTransferInvoiceDetailsSection
              isEdit={isEdit}
              invoiceNo={invoiceNo}
              previewInvoiceNo={previewInvoiceNo}
              invoiceDate={invoiceDate}
              onInvoiceDateChange={setInvoiceDate}
              dispatchNo={dispatchRef}
              dispatchDate={dispatchDate}
              warehouseRef={warehouse}
              bankAccountId={bankAccountId}
              onBankAccountChange={handleBankAccountChange}
              bankAccountHelper={
                bankPrintDetails
                  ? `${bankPrintDetails.bankName} · …${String(bankPrintDetails.accountNumber).slice(-4)}`
                  : undefined
              }
            />
          ) : smGen ? (
            <SampleOrderProformaDetailsSection
              isEdit={isEdit}
              invoiceNo={invoiceNo}
              previewInvoiceNo={previewInvoiceNo}
              invoiceDate={invoiceDate}
              onInvoiceDateChange={setInvoiceDate}
              sampleOrderNo={salesOrderRef}
              dispatchNo={dispatchRef}
              dispatchDate={dispatchDate}
              warehouseRef={warehouse}
              bankAccountId={bankAccountId}
              onBankAccountChange={handleBankAccountChange}
              bankAccountHelper={
                bankPrintDetails
                  ? `${bankPrintDetails.bankName} · …${String(bankPrintDetails.accountNumber).slice(-4)}`
                  : undefined
              }
            />
          ) : (
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
            goodsGenerateCompact={soGen}
            bankAccountSlot={
              soGen ? (
                <WarehouseMappedBankAccountSelect
                  warehouseRef={warehouse}
                  value={bankAccountId}
                  onChange={handleBankAccountChange}
                  label=""
                  required
                  hideHint
                  className="so-bank-select-compact"
                />
              ) : undefined
            }
            bankAccountHelper={
              soGen && bankPrintDetails
                ? `${bankPrintDetails.bankName} · …${String(bankPrintDetails.accountNumber).slice(-4)}`
                : undefined
            }
            dispatchContext={
              soGen
                ? {
                    salesOrderNo: salesOrderRef,
                    salesOrderDate,
                    placeOfSupply,
                    billFrom: billFrom || warehouse,
                    billTo: billTo || customerName,
                    shipTo: shipTo || customerName,
                    warehouse,
                    dispatchQty:
                      dispatchQty ||
                      lines.reduce((s, l) => s + (l.qty || 0), 0),
                    qtyUnit: lines[0]?.unit || "BAG",
                  }
                : undefined
            }
          />
          )}
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
          {!soGen && !stGen ? (
            <div className="mt-3 max-w-md">
              <WarehouseMappedBankAccountSelect
                warehouseRef={warehouse}
                value={bankAccountId}
                onChange={handleBankAccountChange}
                label="Bank Account (for payment / print)"
                required={false}
              />
              {bankPrintDetails && (
                <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                  {bankPrintDetails.bankName} · A/c ending{" "}
                  {String(bankPrintDetails.accountNumber).slice(-4)} ·{" "}
                  {bankPrintDetails.branchName || "—"}
                </p>
              )}
            </div>
          ) : null}
        </InvoiceFormCard>

        {(soGen || stGen) && !isEdit ? (
          <InvoiceFormCard title="Transport & Statutory Details">
            <div id="goods-transport-section" className="scroll-mt-24">
              <GoodsTransportStatutorySection
                value={transport}
                onChange={patchTransport}
                hideDistance={stGen}
              />
            </div>
          </InvoiceFormCard>
        ) : null}

        {!isStockTransferInvoice && !soGen && !smGen && (
          <InvoiceApplicableSchemesPanel
            lines={lines}
            nearExpiryEntries={schemeSettlementEntries}
          />
        )}

        <Section title="Product Details">
          {stGen ? (
            <StockTransferInvoiceLinesEditor
              lines={lines}
              onChange={setLines}
              interstate={interstateGst}
            />
          ) : smGen ? (
            <SampleOrderInvoiceLinesEditor lines={lines} />
          ) : soGen ? (
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

        {!smGen ? (
        <Section title="Additional Charges">
          {soGen || stGen ? (
            <GoodsInvoiceAdditionalChargesEditor
              expenses={additionalExpenses}
              onChange={setAdditionalExpenses}
              interstate={interstateGst}
            />
          ) : (
            <InvoiceAdditionalExpensesEditor
              expenses={additionalExpenses}
              onChange={setAdditionalExpenses}
              defaultGstPct={18}
              interstate={interstateGst}
            />
          )}
        </Section>
        ) : null}

        <div
          className={cn(
            "grid grid-cols-1 gap-4 items-start",
            compactGen
              ? "lg:grid-cols-[minmax(0,1fr)_300px] gap-2.5"
              : "lg:grid-cols-[minmax(0,1fr)_340px]",
          )}
        >
          {soGen || stGen || smGen ? (
            <Section title="Narration">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <Textarea
                  className={cn(INVOICE_FORM_INPUT_CLASS, "so-goods-narration resize-y")}
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder={
                    smGen
                      ? "Optional narration for this Sample Order Proforma…"
                      : "Optional narration for this invoice…"
                  }
                  maxLength={500}
                />
              </div>
            </Section>
          ) : (
          <Section title="Customer Notes &amp; Terms">
            <div
              className={cn(
                "rounded-lg border border-slate-200 bg-white space-y-3",
                "p-4",
              )}
            >
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
            </div>
          </Section>
          )}

          <div
            className={cn(
              "rounded-lg border border-slate-200 bg-white space-y-2 lg:sticky lg:top-3 lg:z-10 shadow-sm",
              compactGen ? "p-3" : "p-4 space-y-3",
            )}
          >
            <h2 className="accounts-card-title">
              {smGen
                ? "Sample Order Summary"
                : stGen
                  ? "Stock Transfer Invoice Summary"
                  : "Invoice Summary"}
            </h2>
            <div className={cn("space-y-1.5 so-invoice-summary", compactGen ? "" : "text-sm space-y-2")}>
              {smGen ? (
                <>
                  <div className="flex items-center justify-between gap-4 py-0.5">
                    <span className="so-summary-label">Total Item Count</span>
                    <span className="so-summary-value">
                      {lines.filter((l) => l.productName || l.productId).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-0.5">
                    <span className="so-summary-label">Total Qty</span>
                    <span className="so-summary-value">
                      {lines.reduce((s, l) => s + (l.qty || 0), 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-0.5">
                    <span className="so-summary-label">Inventory Value (CP)</span>
                    <span className="so-summary-value">
                      {formatINR(
                        lines.reduce((s, l) => {
                          const cp = typeof l.costPrice === "number" && l.costPrice > 0 ? l.costPrice : 0;
                          return s + (l.qty || 0) * cp;
                        }, 0),
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-1.5 border-t border-border/60">
                    <span className="so-grand-total-label">Proforma Value</span>
                    <span className="so-grand-total-value">{formatINR(0)}</span>
                  </div>
                  <div className="flex items-center justify-end pt-1">
                    <span className="so-zero-billing">Zero Billing</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug pt-1">
                    Posts Dr Sample / Promotional Expense · Cr Inventory at Cost Price. No receivable or GST.
                  </p>
                  <LedgerImpactPreview
                    title="Inventory Accounting Impact"
                    className="mt-2 border-0 p-0 shadow-none"
                    lines={sampleOrderInventoryImpactResolved(
                      lines.reduce((s, l) => {
                        const cp = typeof l.costPrice === "number" && l.costPrice > 0 ? l.costPrice : 0;
                        return s + (l.qty || 0) * cp;
                      }, 0),
                    )}
                  />
                </>
              ) : stGen ? (
                <>
                  <div className="flex items-center justify-between gap-4 py-0.5">
                    <span className="so-summary-label">Gross Amount</span>
                    <span className="so-summary-value">{formatINR(totals.productSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-0.5">
                    <span className="so-summary-label">Additional Charges</span>
                    <span className="so-summary-value">{formatINR(totals.expenseTaxable)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-0.5">
                    <span className="so-summary-label">Taxable Value</span>
                    <span className="so-summary-value">
                      {formatINR(
                        Math.max(0, totals.productSubtotal - totals.discountTotal + totals.expenseTaxable),
                      )}
                    </span>
                  </div>
                  {interstateGst ? (
                    <div className="flex items-center justify-between gap-4 py-0.5 border-t border-border/60 pt-1.5">
                      <span className="so-summary-label">IGST</span>
                      <span className="so-summary-value">{formatINR(outputGstSplit.igst)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-4 py-0.5 border-t border-border/60 pt-1.5">
                        <span className="so-summary-label">CGST</span>
                        <span className="so-summary-value">{formatINR(outputGstSplit.cgst)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 py-0.5">
                        <span className="so-summary-label">SGST</span>
                        <span className="so-summary-value">{formatINR(outputGstSplit.sgst)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between gap-4 py-0.5">
                    <span className="so-summary-label">Total Tax</span>
                    <span className="so-summary-value">{formatINR(totals.taxAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-0.5">
                    <Label className="so-summary-label">Round Off</Label>
                    <AccountsMoneyInput
                      className={CHARGE_INPUT_CLASS}
                      value={roundOff || ""}
                      onChange={(v) => setRoundOff(v)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 py-1.5 border-t border-border/60">
                    <span className="so-grand-total-label">Total Invoice Value</span>
                    <span className="so-grand-total-value">{formatINR(totals.grandTotal)}</span>
                  </div>
                </>
              ) : (
                <>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className={soGen ? "so-summary-label" : "text-muted-foreground"}>Gross Amount</span>
                <span className={soGen ? "so-summary-value" : "font-medium tabular-nums"}>
                  {formatINR(totals.productSubtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className={soGen ? "so-summary-label" : "text-muted-foreground"}>Discount</span>
                <span className={soGen ? "so-summary-value" : "font-medium tabular-nums"}>
                  {formatINR(totals.discountTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className={soGen ? "so-summary-label" : "text-muted-foreground"}>Taxable Amount</span>
                <span className={soGen ? "so-summary-value" : "font-medium tabular-nums"}>
                  {formatINR(
                    Math.max(0, totals.productSubtotal - totals.discountTotal + totals.expenseTaxable),
                  )}
                </span>
              </div>
              {soGen ? (
                interstateGst ? (
                  <div className="flex items-center justify-between gap-4 py-0.5 border-t border-border/60 pt-1.5">
                    <span className="so-summary-label">Output IGST</span>
                    <span className="so-summary-value">{formatINR(outputGstSplit.igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-4 py-0.5 border-t border-border/60 pt-1.5">
                      <span className="so-summary-label">Output CGST</span>
                      <span className="so-summary-value">{formatINR(outputGstSplit.cgst)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-0.5">
                      <span className="so-summary-label">Output SGST</span>
                      <span className="so-summary-value">{formatINR(outputGstSplit.sgst)}</span>
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
                  <span className={soGen ? "so-summary-label" : "text-muted-foreground"}>
                    {soGen ? "Additional Charges" : "Additional Expenses"}
                  </span>
                  <span className={soGen ? "so-summary-value" : "font-medium tabular-nums"}>
                    {formatINR(totals.expenseTaxable)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 py-0.5">
                <Label className={cn(soGen ? "so-summary-label" : "text-muted-foreground font-normal text-xs")}>
                  Round Off
                </Label>
                <AccountsMoneyInput
                  className={CHARGE_INPUT_CLASS}
                  value={roundOff || ""}
                  onChange={(v) => setRoundOff(v)}
                />
              </div>
              <div className="flex items-center justify-between gap-4 py-1.5 border-t border-border/60">
                <span className={soGen ? "so-grand-total-label" : "font-semibold text-sm"}>Grand Total</span>
                <span
                  className={
                    soGen
                      ? "so-grand-total-value"
                      : "font-bold text-sm tabular-nums text-brand-700"
                  }
                >
                  {formatINR(totals.grandTotal)}
                </span>
              </div>
                </>
              )}
            </div>
          </div>
        </div>

        {(soGen || stGen) && !isEdit ? (
          <InvoiceFormCard title="Statutory Generation">
            <GoodsStatutoryGenerationSection
              value={transport}
              onGenerateEInvoice={handleGenerateEInvoice}
              onGenerateEway={handleGenerateEway}
              onViewQr={() =>
                setSuccess(
                  transport.irn
                    ? `QR available for IRN ${transport.irn.slice(0, 18)}…`
                    : "QR code available.",
                )
              }
            />
          </InvoiceFormCard>
        ) : null}

        {!compactGen && accountingPreview && (
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
