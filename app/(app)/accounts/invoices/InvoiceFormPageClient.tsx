"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
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
import {
  mapDispatchSchemeToInvoiceSettlement,
  getDispatchById,
  resolveWarehouseMaster,
} from "@/lib/accounts/dispatch-invoice-bridge";
import type { PendingDispatchInvoiceRow } from "@/lib/accounts/dispatch-invoice-bridge";
import type { InvoiceDocumentType } from "@/lib/accounts/invoice-type";
import type { DispatchNearExpirySchemeEntry } from "@/app/(app)/warehouse/dispatch/types";
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
import { InvoiceWarehouseInfoButton } from "./components/InvoiceWarehouseInfoButton";
import { SalesInvoiceDocumentInfoSection } from "./components/SalesInvoiceDocumentInfoSection";
import {
  GoodsTransportStatutorySection,
  EMPTY_TRANSPORT_STATUTORY,
  type GoodsTransportStatutoryState,
  type GoodsEwayStatus,
  type GoodsEInvoiceStatus,
} from "./components/GoodsTransportStatutorySection";
import { getOrderById } from "@/app/(app)/sales/orders/orders-data";
import { SalesInvoiceNumberService } from "@/services/sales-invoice-number.service";
import { WarehouseService } from "@/services/warehouse.service";
import {
  SalesInvoiceService,
  mapPrepareDispatchItemsToLineItems,
  readTransportDistanceKm,
  readWarehouseGstin,
  resolvePreparePlaceOfSupply,
  type DispatchInvoiceTotalsPreview,
  type PrepareDispatchInvoiceDto,
} from "@/services/sales-invoice.service";
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
import { showToast } from "@/lib/toast";
import { sampleOrderInventoryImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { cn } from "@/lib/utils";
import { useFormDirtySnapshot } from "@/lib/accounts/use-form-dirty-snapshot";
import {
  useTransactionFormCancel,
} from "@/components/accounts/TransactionFormCancel";
import { VoucherFormActionBar } from "@/components/accounts/voucher-form/VoucherFormActionBar";
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
  peekNextSampleOrderProformaNo,
  type InvoiceDocumentKind,
  type SalesInvoiceSourceType,
} from "@/lib/accounts/invoice-type";
import { splitInvoiceGst } from "@/lib/accounts/invoice-gst-breakup";
import { inferInterstateFromPlaceOfSupply } from "@/lib/accounts/gst-accounting";
import "./sales-order-invoice-form-compact.css";
import "./stock-transfer-invoice-form-compact.css";
import "./sample-order-invoice-form-compact.css";

const SalesInvoiceAccountingPanel = dynamic(
  () =>
    import("@/components/accounts/SalesInvoiceAccountingPanel").then((m) => ({
      default: m.SalesInvoiceAccountingPanel,
    })),
  { ssr: false, loading: () => null },
);

const AccountingImpactSection = dynamic(
  () =>
    import("@/components/accounts/AccountingImpactSection").then((m) => ({
      default: m.AccountingImpactSection,
    })),
  { ssr: false, loading: () => null },
);

const InvoiceApplicableSchemesPanel = dynamic(
  () =>
    import("./components/InvoiceApplicableSchemesPanel").then((m) => ({
      default: m.InvoiceApplicableSchemesPanel,
    })),
  { ssr: false, loading: () => null },
);

const GoodsStatutoryGenerationSection = dynamic(
  () =>
    import("./components/GoodsStatutoryGenerationSection").then((m) => ({
      default: m.GoodsStatutoryGenerationSection,
    })),
  { ssr: false, loading: () => null },
);

const LedgerImpactPreview = dynamic(
  () =>
    import("@/components/accounts/LedgerImpactPreview").then((m) => ({
      default: m.LedgerImpactPreview,
    })),
  { ssr: false, loading: () => null },
);

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
  const [previewInvoiceNo, setPreviewInvoiceNo] = useState("");
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
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string | null>(null);
  const [destinationWarehouseId, setDestinationWarehouseId] = useState<string | null>(null);
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
  /** SO/order charges from prepare — display only; not posted (CN/DN / PI-GRN pattern). */
  const [orderSuggestedCharges, setOrderSuggestedCharges] = useState<
    PrepareDispatchInvoiceDto["suggested_additional_charges"]
  >([]);
  const [roundOff, setRoundOff] = useState(0);
  const [backendTotals, setBackendTotals] = useState<DispatchInvoiceTotalsPreview | null>(
    null,
  );
  const [salesOrderId, setSalesOrderId] = useState<number | string | null>(null);
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

  const patchTransport = useCallback((patch: Partial<GoodsTransportStatutoryState>) => {
    setTransport((prev) => ({ ...prev, ...patch }));
  }, []);

  const statutoryFingerprintRef = useRef<string | null>(null);
  const dispatchTotalsReadyRef = useRef(false);

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
    () => {
      if (
        isSalesOrderInvoice ||
        isStockTransferGeneration ||
        isSampleOrderGeneration
      ) {
        return [];
      }
      return getProductsForInvoice(customerId ? Number(customerId) : undefined);
    },
    [customerId, isSalesOrderInvoice, isStockTransferGeneration, isSampleOrderGeneration],
  );

  useEffect(() => {
    if (!error) return;
    showToast(error, "error");
    setError(null);
  }, [error]);

  useEffect(() => {
    if (!success) return;
    showToast(success, "success");
    setSuccess(null);
  }, [success]);

  const invoicesCacheRef = useRef<ReturnType<typeof loadInvoices> | null>(null);
  const prefillKeyRef = useRef<string | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (invoiceDate && creditDays >= 0) {
      setDueDate(computeDueDate(invoiceDate, creditDays));
    }
  }, [invoiceDate, creditDays]);

  // Local seed peek removed — preview number always comes from Sales Invoice API below.

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
    if (!isStockTransferGeneration || isEdit) return;

    const hydrateWarehouseGstin = async () => {
      if (!sourceWarehouseGstin.trim() && sourceWarehouseId) {
        try {
          const details = await WarehouseService.getDetails(sourceWarehouseId);
          const gstin = readWarehouseGstin(details);
          if (gstin) setSourceWarehouseGstin(gstin);
          if (!sourceWarehouseState.trim() && details.state) {
            setSourceWarehouseState(details.state);
          }
        } catch {
          // Ignore — validation will surface missing GSTIN if still absent.
        }
      }

      if (!destinationWarehouseGstin.trim() && destinationWarehouseId) {
        try {
          const details = await WarehouseService.getDetails(destinationWarehouseId);
          const gstin = readWarehouseGstin(details);
          if (gstin) setDestinationWarehouseGstin(gstin);
          if (!destinationWarehouseState.trim() && details.state) {
            setDestinationWarehouseState(details.state);
          }
          if (!placeOfSupply.trim() && details.state) {
            setPlaceOfSupply(details.state);
            setStateName(details.state);
          }
        } catch {
          // Ignore — validation will surface missing GSTIN if still absent.
        }
      }
    };

    void hydrateWarehouseGstin();
  }, [
    isStockTransferGeneration,
    isEdit,
    sourceWarehouseId,
    destinationWarehouseId,
    sourceWarehouseGstin,
    destinationWarehouseGstin,
    sourceWarehouseState,
    destinationWarehouseState,
    placeOfSupply,
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
    setDispatchDate(prefill.dispatchDate || "");
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
    if (
      prefill.sourceType === "sample_order" ||
      prefill.sourceType === "sales_order" ||
      prefill.sourceType === "stock_transfer"
    ) {
      // Editable charges start empty; SO/order charges are shown read-only separately.
      setAdditionalExpenses([]);
      if (prefill.sourceType === "sample_order") {
        setOrderSuggestedCharges([]);
        setRoundOff(0);
      } else if (prefill.additionalExpenses?.length) {
        // Local bridge path: surface SO expenses as display-only suggestions.
        setOrderSuggestedCharges(
          prefill.additionalExpenses.map((e, idx) => {
            const gstPct = Number(e.gstPct || 0);
            return {
              sales_order_expense_id: String(e.id || `bridge-${idx}`),
              charge_name: e.expenseHead || "Additional charge",
              amount: String(e.amount || 0),
              gst_percent: gstPct > 0 ? String(gstPct) : null,
              charge_source: "ORDER" as const,
              matched_additional_charge_id: e.chargeMasterId || null,
              matched_ledger_id: null,
              matched_ledger_code: null,
              matched_ledger_name: null,
              gst_applicable: e.gstApplicable ?? gstPct > 0,
              default_gst_rate: gstPct > 0 ? String(gstPct) : null,
              mapping_ok: Boolean(e.chargeMasterId),
            };
          }),
        );
      }
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
    setAdditionalExpenses([]);
    setOrderSuggestedCharges([]);
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
        setAdditionalExpenses([]);
        setOrderSuggestedCharges([]);
        setError(null);
        setSchemeSettlementEntries([]);
        return;
      }

      setDispatchDate(row.dispatchDate);
      setSourceDispatchId(dispatchId);
      setDispatchRef(row.dispatchNo);
      setReferenceNo(row.dispatchNo);

      void (async () => {
        try {
          const prepared = await SalesInvoiceService.prepareDispatch(dispatchId);
          const customer = prepared.customer || {};
          const warehouseSnap = prepared.warehouse || {};
          const billing = prepared.billing_address || {};
          const shipping = prepared.shipping_address || {};
          const pos = prepared.place_of_supply || {};
          const salespersonName =
            prepared.sales_order?.salesperson_name?.trim() ||
            (prepared.items || [])
              .map((item) => item.salesperson_name?.trim())
              .find(Boolean) ||
            "";
          const placeOfSupplyValue = resolvePreparePlaceOfSupply(
            pos,
            billing,
            shipping,
          );
          const customerState = String(billing.state || shipping.state || "");

          const lineItems = mapPrepareDispatchItemsToLineItems(
            prepared.items,
            prepared.dispatch.dispatch_number,
            salespersonName,
          );

          setOrderSuggestedCharges(prepared.suggested_additional_charges || []);

          const customerName = String(
            customer.customer_name || customer.customerName || row.customerName || "",
          );
          const warehouseName = String(
            warehouseSnap.warehouse_name ||
              warehouseSnap.warehouseName ||
              row.warehouse ||
              "",
          );
          const warehouseUuid = String(
            warehouseSnap.warehouse_id || warehouseSnap.warehouseId || "",
          );

          applySalesInvoicePrefill({
            invoiceType: "sales",
            sourceType: "sales_order",
            salesOrderId: prepared.sales_order?.sales_order_id ?? null,
            salesOrderNo: prepared.sales_order?.so_number || row.soNumber || "",
            salesOrderDate: "",
            sourceDispatchId: prepared.dispatch.dispatch_id,
            dispatchNo: prepared.dispatch.dispatch_number,
            dispatchDate: String(prepared.dispatch.dispatch_date || "").slice(0, 10),
            branch: warehouseName || "Head Office",
            warehouse: warehouseName || "Central Warehouse",
            salesperson: salespersonName || "—",
            referenceNo: prepared.dispatch.dispatch_number,
            paymentTerms: "Net 30",
            creditDays: 30,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            invoiceDate: new Date().toISOString().split("T")[0],
            customerId: (prepared.customer as any)?.customer_id || customer.customer_id || null,
            customerLedgerId: prepared.customer_ledger_id || null,
            customerCode: String(customer.customer_code || customer.customerCode || ""),
            customerName,
            customerMobile: String(customer.mobile_no || customer.mobile || ""),
            customerEmail: String(customer.email || ""),
            customerGst: String(customer.gstin_no || customer.gstin || ""),
            billingAddress: String(
              billing.full_address || billing.address || customer.registered_gst_address || "",
            ),
            shippingAddress: String(
              shipping.full_address || shipping.address || customer.registered_gst_address || "",
            ),
            pan: String(customer.pan_no || customer.pan || ""),
            contactPerson: String(customer.contact_person || ""),
            placeOfSupply: placeOfSupplyValue,
            state: placeOfSupplyValue || customerState,
            gstTreatment: String(customer.gst_treatment || "registered"),
            receivableLedger: customerName,
            billFrom: warehouseName,
            billTo: customerName,
            shipTo: customerName,
            dispatchQty: lineItems.reduce((acc, l) => acc + (l.qty || 0), 0),
            transportMode: prepared.dispatch.transport_mode || "",
            transporterName: prepared.dispatch.transporter || "",
            transporterId: prepared.dispatch.transporter_id || "",
            vehicleNo: prepared.dispatch.vehicle_number || "",
            lrNo: prepared.dispatch.lr_number || "",
            lrDate: String(prepared.dispatch.lr_date || "").slice(0, 10),
            transportDocNo:
              prepared.dispatch.transport_doc_number ||
              prepared.dispatch.lr_number ||
              "",
            transportDocDate: String(
              prepared.dispatch.transport_doc_date ||
                prepared.dispatch.lr_date ||
                "",
            ).slice(0, 10),
            distanceKm:
              prepared.dispatch.approx_distance != null
                ? Number(prepared.dispatch.approx_distance)
                : null,
            lineItems,
            lineErrors: [],
            additionalExpenses: [],
            nearExpirySchemes: [],
            sourceWarehouseGstin: String(
              (prepared.warehouse_gst as Record<string, unknown> | null)?.gst_number ||
                warehouseSnap.gst_number ||
                "",
            ),
            destinationWarehouseGstin: String(customer.gstin_no || customer.gstin || ""),
            sourceWarehouseState: String(warehouseSnap.state || ""),
            destinationWarehouseState: customerState || placeOfSupplyValue,
          } as unknown as SalesInvoicePrefill);

          setSourceWarehouseId(warehouseUuid || null);

          setTransport((prev) => ({
            ...prev,
            transportMode: prepared.dispatch.transport_mode || prev.transportMode,
            transporterName: prepared.dispatch.transporter || prev.transporterName,
            transporterId: prepared.dispatch.transporter_id || prev.transporterId,
            vehicleNo: prepared.dispatch.vehicle_number || prev.vehicleNo,
            lrNo: prepared.dispatch.lr_number || prev.lrNo,
            lrDate:
              String(prepared.dispatch.lr_date || "").slice(0, 10) || prev.lrDate,
            transportDocNo:
              prepared.dispatch.transport_doc_number ||
              prepared.dispatch.lr_number ||
              prev.transportDocNo,
            transportDocDate:
              String(
                prepared.dispatch.transport_doc_date ||
                  prepared.dispatch.lr_date ||
                  "",
              ).slice(0, 10) || prev.transportDocDate,
            distanceKm:
              prepared.dispatch.approx_distance != null &&
              Number(prepared.dispatch.approx_distance) > 0
                ? String(prepared.dispatch.approx_distance)
                : prev.distanceKm,
          }));
          if (prepared.totals) {
            dispatchTotalsReadyRef.current = true;
            setBackendTotals(prepared.totals);
            setRoundOff(Number(prepared.totals.round_off_amount) || 0);
          }
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to prepare dispatch for invoice.",
          );
        }
      })();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!sourceDispatchId) {
      dispatchTotalsReadyRef.current = false;
      setBackendTotals(null);
    }
  }, [sourceDispatchId]);

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

    if (dispatchId) {
      const loadPrefillFromBackend = async (dId: string) => {
        try {
          const prepared = await SalesInvoiceService.prepareDispatch(dId);
          const customer = prepared.customer || {};
          const warehouse = prepared.warehouse || {};
          const billing = prepared.billing_address || {};
          const shipping = prepared.shipping_address || {};
          const pos = prepared.place_of_supply || {};
          const salespersonName =
            prepared.sales_order?.salesperson_name?.trim() ||
            (prepared.items || [])
              .map((item) => item.salesperson_name?.trim())
              .find(Boolean) ||
            "";
          const placeOfSupplyValue = resolvePreparePlaceOfSupply(
            pos,
            billing,
            shipping,
          );
          const customerState = String(billing.state || shipping.state || "");

          const lineItems = mapPrepareDispatchItemsToLineItems(
            prepared.items,
            prepared.dispatch.dispatch_number,
            salespersonName,
          );

          setOrderSuggestedCharges(prepared.suggested_additional_charges || []);

          const customerName = String(
            customer.customer_name || customer.customerName || "",
          );
          const warehouseName = String(
            warehouse.warehouse_name || warehouse.warehouseName || "",
          );
          // resolved below after stData is available

          const isSTDispatch = routeSource === "stock_transfer";
          const stData = prepared.stock_transfer ?? null;
          const transportDistanceKm =
            stData?.distance_km ??
            readTransportDistanceKm(stData?.transport_details) ??
            null;
          const sourceWhName = stData?.from_warehouse?.warehouse_name || warehouseName || "Central Warehouse";
          const destWhName = stData?.to_warehouse?.warehouse_name || customerName || "";
          const sourceWhGstin = readWarehouseGstin(
            prepared.source_warehouse_gst as Record<string, unknown> | null,
            stData?.from_warehouse as Record<string, unknown> | null,
            prepared.warehouse_gst as Record<string, unknown> | null,
            warehouse as Record<string, unknown>,
          );
          const destWhGstin = readWarehouseGstin(
            prepared.destination_warehouse_gst as Record<string, unknown> | null,
            stData?.to_warehouse as Record<string, unknown> | null,
            customer as Record<string, unknown>,
          );
          const sourceWhState = stData?.from_warehouse?.state || String(warehouse.state || "");
          const destWhState = stData?.to_warehouse?.state || customerState || placeOfSupplyValue;
          const billingAddressText = isSTDispatch
            ? String(
                billing.full_address ||
                  [
                    billing.address,
                    billing.city,
                    billing.state,
                    billing.pincode,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                  "",
              )
            : String(
                billing.full_address ||
                  billing.address ||
                  customer.registered_gst_address ||
                  "",
              );
          const shippingAddressText = isSTDispatch
            ? String(
                shipping.full_address ||
                  [
                    shipping.address,
                    shipping.city,
                    shipping.state,
                    shipping.pincode,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                  billingAddressText ||
                  "",
              )
            : String(
                shipping.full_address ||
                  shipping.address ||
                  customer.registered_gst_address ||
                  "",
              );

          const prefill: any = {
            invoiceType: isSTDispatch ? "stock_transfer" : "sales",
            sourceType: routeSource,
            salesOrderId: prepared.sales_order?.sales_order_id ?? (isSTDispatch ? null : prepared.dispatch.source_id),
            salesOrderNo: isSTDispatch
              ? (stData?.transfer_no || "")
              : (prepared.sales_order?.so_number || ""),
            salesOrderDate: "",
            sourceDispatchId: prepared.dispatch.dispatch_id,
            dispatchNo: prepared.dispatch.dispatch_number,
            dispatchDate: String(prepared.dispatch.dispatch_date || "").slice(0, 10),
            branch: sourceWhName || "Head Office",
            warehouse: sourceWhName || "Central Warehouse",
            salesperson: salespersonName || "—",
            referenceNo: isSTDispatch
              ? (stData?.transfer_no || prepared.dispatch.dispatch_number)
              : prepared.dispatch.dispatch_number,
            paymentTerms: "Net 30",
            creditDays: 30,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            invoiceDate: new Date().toISOString().split("T")[0],
            customerId: prepared.customer?.customer_id || customer.customer_id || null,
            customerLedgerId: prepared.customer_ledger_id || null,
            customerCode: String(customer.customer_code || customer.customerCode || ""),
            customerName: isSTDispatch ? destWhName : customerName,
            customerMobile: String(customer.mobile_no || customer.mobile || ""),
            customerEmail: String(customer.email || ""),
            customerGst: isSTDispatch ? destWhGstin : String(customer.gstin_no || customer.gstin || ""),
            customerGstCategory: customer.gst_category || customer.gstCategory,
            billingAddress: billingAddressText,
            shippingAddress: shippingAddressText,
            pan: String(customer.pan_no || customer.pan || ""),
            contactPerson: String(customer.contact_person || ""),
            placeOfSupply: isSTDispatch ? destWhState : placeOfSupplyValue,
            state: isSTDispatch ? destWhState : (placeOfSupplyValue || customerState),
            gstTreatment: String(customer.gst_treatment || customer.gstCategory || "registered"),
            receivableLedger: isSTDispatch ? destWhName : customerName,
            billFrom: sourceWhName,
            billTo: isSTDispatch ? destWhName : customerName,
            shipTo: isSTDispatch ? destWhName : customerName,
            dispatchQty: lineItems.reduce((acc, l) => acc + (l.qty || 0), 0),
            transportMode:
              prepared.dispatch.transport_mode ||
              (transportDistanceKm != null ? "Road" : ""),
            transporterName: prepared.dispatch.transporter || "",
            transporterId: prepared.dispatch.transporter_id || "",
            vehicleNo: prepared.dispatch.vehicle_number || "",
            lrNo: prepared.dispatch.lr_number || "",
            lrDate: String(prepared.dispatch.lr_date || "").slice(0, 10),
            transportDocNo:
              prepared.dispatch.transport_doc_number ||
              prepared.dispatch.lr_number ||
              "",
            transportDocDate: String(
              prepared.dispatch.transport_doc_date ||
                prepared.dispatch.lr_date ||
                prepared.dispatch.dispatch_date ||
                "",
            ).slice(0, 10),
            distanceKm:
              prepared.dispatch.approx_distance != null
                ? Number(prepared.dispatch.approx_distance)
                : transportDistanceKm,
            lineItems,
            lineErrors: [],
            additionalExpenses: [],
            nearExpirySchemes: [],
            sourceWarehouseGstin: sourceWhGstin,
            destinationWarehouseGstin: destWhGstin,
            sourceWarehouseState: sourceWhState,
            destinationWarehouseState: destWhState,
            sourceWarehouseId: stData?.from_warehouse?.warehouse_id ?? null,
            destinationWarehouseId: stData?.to_warehouse?.warehouse_id ?? null,
          };

          applySalesInvoicePrefill(prefill);
          setSourceWarehouseId(
            isSTDispatch
              ? (stData?.from_warehouse?.warehouse_id ?? null)
              : (String(
                  (warehouse as Record<string, unknown>).warehouse_id ||
                    (warehouse as Record<string, unknown>).warehouseId ||
                    "",
                ) || null),
          );
          setDestinationWarehouseId(stData?.to_warehouse?.warehouse_id ?? null);
          if (
            prepared.dispatch.transporter ||
            prepared.dispatch.vehicle_number ||
            prepared.dispatch.transport_mode ||
            transportDistanceKm != null
          ) {
            setTransport((prev) => ({
              ...prev,
              transportMode:
                prepared.dispatch.transport_mode || prev.transportMode,
              transporterName: prepared.dispatch.transporter || prev.transporterName,
              transporterId:
                prepared.dispatch.transporter_id || prev.transporterId,
              vehicleNo: prepared.dispatch.vehicle_number || prev.vehicleNo,
              lrNo: prepared.dispatch.lr_number || prev.lrNo,
              lrDate:
                String(prepared.dispatch.lr_date || "").slice(0, 10) ||
                prev.lrDate,
              transportDocNo:
                prepared.dispatch.transport_doc_number ||
                prepared.dispatch.lr_number ||
                prev.transportDocNo,
              transportDocDate:
                String(
                  prepared.dispatch.transport_doc_date ||
                    prepared.dispatch.lr_date ||
                    prepared.dispatch.dispatch_date ||
                    "",
                ).slice(0, 10) || prev.transportDocDate,
              distanceKm:
                prepared.dispatch.approx_distance != null &&
                Number(prepared.dispatch.approx_distance) > 0
                  ? String(prepared.dispatch.approx_distance)
                  : transportDistanceKm != null && transportDistanceKm > 0
                    ? String(transportDistanceKm)
                    : prev.distanceKm,
            }));
          }
          if (prepared.totals) {
            dispatchTotalsReadyRef.current = true;
            setBackendTotals(prepared.totals);
            setRoundOff(Number(prepared.totals.round_off_amount) || 0);
          }
        } catch (err) {
          console.error("Failed to load prefill from backend:", err);
          setError(
            err instanceof Error
              ? err.message
              : "Failed to prepare dispatch for invoice.",
          );
        }
      };
      void loadPrefillFromBackend(dispatchId);
      return;
    }

    if (!soId) return;

    const prefill = buildSalesInvoicePrefill(
      Number(soId),
      dispatchNo,
      dispatchId,
    );

    if (!prefill) {
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
    setSourceWarehouseId(rec.warehouseUuid || null);
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

  const isDispatchGenerationPreview =
    !isEdit &&
    Boolean(sourceDispatchId) &&
    (isSalesOrderGeneration || isStockTransferGeneration);

  const dispatchTotalsPreview = useMemo(() => {
    if (!backendTotals) return null;
    const n = (value: string) => Number(value) || 0;
    return {
      roundOff: n(backendTotals.round_off_amount),
      grandTotal: n(backendTotals.invoice_amount),
      gstAmount: n(backendTotals.gst_amount),
      cgst: n(backendTotals.cgst_amount),
      sgst: n(backendTotals.sgst_amount),
      igst: n(backendTotals.igst_amount),
      grossAmount: n(backendTotals.gross_amount),
      discountAmount: n(backendTotals.product_discount_amount),
      additionalChargeAmount: n(backendTotals.additional_charge_amount),
      taxableAmount: n(backendTotals.taxable_amount),
    };
  }, [backendTotals]);

  useEffect(() => {
    if (
      !isDispatchGenerationPreview ||
      !sourceDispatchId ||
      !dispatchTotalsReadyRef.current
    ) {
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
      }));

    let cancelled = false;
    const timer = window.setTimeout(() => {
      SalesInvoiceService.previewDispatchTotals(sourceDispatchId, {
        additional_charges: charges,
        round_off_amount: roundOff,
      })
        .then((previewTotals) => {
          if (cancelled) return;
          setBackendTotals(previewTotals);
        })
        .catch(() => {
          /* keep last good preview while charge rows are edited */
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isDispatchGenerationPreview, sourceDispatchId, additionalExpenses, roundOff]);

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

  // Preview SI number from DocumentSequence (create only)
  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    const state = stateName.trim() || placeOfSupply.trim() || "Maharashtra";
    SalesInvoiceNumberService.getPreviewNumber({ state })
      .then((num) => {
        if (!cancelled) setPreviewInvoiceNo(num);
      })
      .catch(() => {
        if (!cancelled) setPreviewInvoiceNo("");
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, stateName, placeOfSupply]);

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
      customerId: customerId && !isNaN(Number(customerId)) ? Number(customerId) : null,
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
      salesOrderId: smMode ? null : (salesOrderId && !isNaN(Number(salesOrderId)) ? Number(salesOrderId) : null),
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

  const outputGstSplit = useMemo(() => {
    if (isDispatchGenerationPreview && dispatchTotalsPreview) {
      return {
        cgst: dispatchTotalsPreview.cgst,
        sgst: dispatchTotalsPreview.sgst,
        igst: dispatchTotalsPreview.igst,
      };
    }
    return splitInvoiceGst(totals.taxAmount, interstateGst);
  }, [
    isDispatchGenerationPreview,
    dispatchTotalsPreview,
    totals.taxAmount,
    interstateGst,
  ]);

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
    if (bankAccountId == null && !sourceDispatchId) {
      return "Select a Bank Account for the invoice PDF.";
    }
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
    // createFromDispatch rebuilds lines from dispatch — skip local product-id gate
    if (missingProduct && !sourceDispatchId) {
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
    sourceDispatchId,
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
    if (missingProduct && !sourceDispatchId) {
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
    sourceDispatchId,
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

  const submit = async (asDraft: boolean) => {
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
    if (
      missingProduct &&
      !(
        sourceDispatchId &&
        (isSalesOrderGeneration ||
          isStockTransferGeneration ||
          sourceType === "sales_order" ||
          sourceType === "stock_transfer")
      )
    ) {
      setError(
        `Product mapping missing for "${missingProduct.productName || "line item"}". Please check Product Master or regenerate from Pending Invoice.`,
      );
      return;
    }
    try {
      savingRef.current = true;
      setSaving(true);
      const status: InvoiceStatus = asDraft ? "draft" : "sent";

      if ((isSalesOrderGeneration || isStockTransferGeneration) && !asDraft) {
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

        const created = await SalesInvoiceService.createFromDispatch(sourceDispatchId, {
          invoice_date: invoiceDate,
          due_date: dueDate || undefined,
          narration: remarks.trim() || undefined,
          remarks: remarks.trim() || undefined,
          transporter: transport.transporterName.trim() || undefined,
          transporter_id: transport.transporterId.trim() || undefined,
          transport_mode: transport.transportMode.trim() || undefined,
          vehicle_number: transport.vehicleNo.trim() || undefined,
          lr_number: transport.lrNo.trim() || undefined,
          lr_date: transport.lrDate.trim() || undefined,
          transport_doc_number:
            transport.transportDocNo.trim() || transport.lrNo.trim() || undefined,
          transport_doc_date:
            transport.transportDocDate.trim() || transport.lrDate.trim() || undefined,
          approx_distance: transport.distanceKm.trim()
            ? Number(transport.distanceKm)
            : undefined,
          irn_number: transport.irn.trim() || undefined,
          acknowledgement_number:
            transport.acknowledgementNo.trim() ||
            transport.eInvoiceNo.trim() ||
            undefined,
          acknowledgement_date: transport.acknowledgementDate.trim() || undefined,
          einvoice_status: transport.eInvoiceStatus || undefined,
          eway_bill_number: transport.ewayBillNo?.trim() || undefined,
          eway_bill_valid_upto: transport.ewayBillExpiryDate.trim() || undefined,
          eway_bill_status: transport.ewayBillStatus || undefined,
          additional_charges: charges.length > 0 ? charges : undefined,
          round_off_amount: roundOff,
        });

        dispatchAccountsDataChanged("sales-invoices");
        setSuccess(
          isStockTransferGeneration
            ? "Stock Transfer Invoice generated successfully."
            : "Sales Invoice generated successfully.",
        );
        router.push(`${INVOICES_LIST_PATH}/${created.sales_invoice_id}`);
        router.refresh();
        return;
      }

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
        const rec = await createInvoice(buildInput(status));
        dispatchAccountsDataChanged("sales-invoices");
        setSuccess(
          asDraft
            ? "Invoice saved as draft."
            : isSampleOrderGeneration
              ? "Sample Order Proforma generated — inventory posted at Cost Price."
              : "Invoice saved and posted to ledger successfully.",
        );
        router.push(`${INVOICES_LIST_PATH}/${rec.salesInvoiceId || rec.id}`);
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

  const summaryRoundOff =
    isDispatchGenerationPreview && dispatchTotalsPreview
      ? dispatchTotalsPreview.roundOff
      : roundOff;
  const summaryGrandTotal =
    isDispatchGenerationPreview && dispatchTotalsPreview
      ? dispatchTotalsPreview.grandTotal
      : totals.grandTotal;
  const summaryTaxAmount =
    isDispatchGenerationPreview && dispatchTotalsPreview
      ? dispatchTotalsPreview.gstAmount
      : totals.taxAmount;
  const summaryGrossAmount =
    isDispatchGenerationPreview && dispatchTotalsPreview
      ? dispatchTotalsPreview.grossAmount
      : totals.productSubtotal;
  const summaryDiscountAmount =
    isDispatchGenerationPreview && dispatchTotalsPreview
      ? dispatchTotalsPreview.discountAmount
      : totals.discountTotal;
  const summaryAdditionalCharges =
    isDispatchGenerationPreview && dispatchTotalsPreview
      ? dispatchTotalsPreview.additionalChargeAmount
      : totals.expenseTaxable;
  const summaryTaxableAmount =
    isDispatchGenerationPreview && dispatchTotalsPreview
      ? dispatchTotalsPreview.taxableAmount
      : Math.max(0, totals.productSubtotal - totals.discountTotal + totals.expenseTaxable);

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
        "h-full min-h-0 flex flex-col w-full",
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
      stickyFooter={
        isSalesOrderGeneration ||
        isStockTransferGeneration ||
        isSampleOrderGeneration ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground self-start sm:self-auto"
              onClick={requestCancel}
              disabled={saving}
            >
              Discard Form
            </Button>
            <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
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
              <Button
                size="sm"
                className="h-8 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white border-0"
                onClick={handleTopGenerateClick}
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : isSampleOrderGeneration
                    ? "Generate Proforma Invoice"
                    : isStockTransferGeneration
                      ? "Generate Stock Transfer Invoice"
                      : "Generate Invoice"}
              </Button>
            </div>
          </div>
        ) : (
          <VoucherFormActionBar
            onDiscard={requestCancel}
            onSaveDraft={() => submit(true)}
            onSaveAndPost={() => submit(false)}
            saveAndPostLabel={saving ? "Saving…" : "Post Invoice"}
            discardDisabled={saving}
            saveDraftDisabled={saving}
            saveAndPostDisabled={saving}
          />
        )
      }
    >
      <div className={cn(compactGen ? "space-y-2.5" : "space-y-4")}>
        {!soGen ? (
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
        ) : null}

        <InvoiceFormCard title="Invoice & Dispatch Details">
          <SalesInvoiceDocumentInfoSection
            isEdit={isEdit}
            invoiceNo={isEdit ? invoiceNo : previewInvoiceNo}
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
                ? `${bankPrintDetails.bankName} · ${bankPrintDetails.accountNumber}`
                : undefined
            }
            customerName={soGen ? customerName : undefined}
            customerInfoButton={
              soGen ? (
                <CustomerPartyInfoButton
                  className="so-goods-info-btn"
                  customerId={customerId}
                  customerName={customerName}
                  customerCode={customerCode}
                  branch={branch}
                  gstin={customerGst}
                  billingAddress={billingAddress}
                  shippingAddress={shippingAddress}
                  placeOfSupply={placeOfSupply}
                  paymentTerms={paymentTerms}
                  linkedLedger={receivableLedger || undefined}
                  creditLimit={
                    customerId
                      ? customers.find((c) => c.id === Number(customerId))?.creditLimit
                      : undefined
                  }
                />
              ) : undefined
            }
            warehouseName={soGen ? warehouse : undefined}
            warehouseInfoButton={
              soGen ? (
                <InvoiceWarehouseInfoButton
                  className="so-goods-info-btn"
                  warehouseId={sourceWarehouseId}
                />
              ) : undefined
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
                  {bankPrintDetails.bankName} · A/c {bankPrintDetails.accountNumber} ·{" "}
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
        <>
        {soGen || stGen ? (
          orderSuggestedCharges.length > 0 ? (
            <Section title="Sales Order Additional Charges">
              <p className={cn(INVOICE_FORM_HELPER_CLASS, "-mt-1")}>
                Charges from the sales order (display only — not posted).
              </p>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="p-1.5 text-left font-medium">Charge</th>
                      <th className="p-1.5 text-right font-medium w-28">Amount</th>
                      <th className="p-1.5 text-right font-medium w-20">GST %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderSuggestedCharges.map((charge, idx) => {
                      const gstPct = Number(
                        charge.gst_percent ?? charge.default_gst_rate ?? 0,
                      );
                      return (
                        <tr
                          key={`so-charge-${charge.sales_order_expense_id || charge.charge_name}-${idx}`}
                          className="border-b last:border-0"
                        >
                          <td className="p-1.5">
                            {charge.charge_name}
                            {!charge.mapping_ok ? (
                              <span className="ml-1 text-[10px] text-amber-700">
                                (unmapped)
                              </span>
                            ) : null}
                          </td>
                          <td className="p-1.5 text-right tabular-nums">
                            {formatINR(Number(charge.amount || 0))}
                          </td>
                          <td className="p-1.5 text-right tabular-nums">
                            {gstPct > 0 ? gstPct : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {orderSuggestedCharges.some((c) => !c.mapping_ok) ? (
                <p className="text-xs text-amber-700">
                  The following SO charges are not in Additional Charge Master:{" "}
                  {orderSuggestedCharges
                    .filter((c) => !c.mapping_ok)
                    .map((c) => c.charge_name)
                    .join(", ")}
                </p>
              ) : null}
            </Section>
          ) : null
        ) : null}

        <Section title="Additional Charges">
          {soGen || stGen ? (
            <>
              <p className={cn(INVOICE_FORM_HELPER_CLASS, "-mt-1")}>
                Optional freight, packing, or other charges. These post on the sales
                invoice.
              </p>
              <GoodsInvoiceAdditionalChargesEditor
                expenses={additionalExpenses}
                onChange={setAdditionalExpenses}
                interstate={interstateGst}
              />
            </>
          ) : (
            <InvoiceAdditionalExpensesEditor
              expenses={additionalExpenses}
              onChange={setAdditionalExpenses}
              defaultGstPct={18}
              interstate={interstateGst}
            />
          )}
        </Section>
        </>
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
                    <span className="so-summary-value">{formatINR(summaryGrossAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-0.5">
                    <span className="so-summary-label">Additional Charges</span>
                    <span className="so-summary-value">{formatINR(summaryAdditionalCharges)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-0.5">
                    <span className="so-summary-label">Taxable Value</span>
                    <span className="so-summary-value">{formatINR(summaryTaxableAmount)}</span>
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
                    <span className="so-summary-value">{formatINR(summaryTaxAmount)}</span>
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
                    <span className="so-grand-total-value">{formatINR(summaryGrandTotal)}</span>
                  </div>
                </>
              ) : soGen ? (
                <>
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
                  {interstateGst ? (
                    <div className="flex items-center justify-between gap-4 py-0.5">
                      <span className="so-summary-label">Output IGST</span>
                      <span className="so-summary-value">{formatINR(outputGstSplit.igst)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-4 py-0.5">
                        <span className="so-summary-label">Output CGST</span>
                        <span className="so-summary-value">{formatINR(outputGstSplit.cgst)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 py-0.5">
                        <span className="so-summary-label">Output SGST</span>
                        <span className="so-summary-value">{formatINR(outputGstSplit.sgst)}</span>
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
                    <span className="so-grand-total-value">{formatINR(summaryGrandTotal)}</span>
                  </div>
                </>
              ) : (
                <>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="text-muted-foreground">Gross Amount</span>
                <span className="font-medium tabular-nums">
                  {formatINR(summaryGrossAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium tabular-nums">
                  {formatINR(summaryDiscountAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="text-muted-foreground">Taxable Amount</span>
                <span className="font-medium tabular-nums">
                  {formatINR(summaryTaxableAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-0.5 border-t border-border/60 pt-1.5">
                <span className="text-muted-foreground">GST Total</span>
                <span className="font-medium tabular-nums">{formatINR(summaryTaxAmount)}</span>
              </div>
              {summaryAdditionalCharges > 0 && (
                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="text-muted-foreground">Additional Expenses</span>
                  <span className="font-medium tabular-nums">
                    {formatINR(summaryAdditionalCharges)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 py-0.5">
                <Label className="text-muted-foreground font-normal text-xs">
                  Round Off
                </Label>
                <AccountsMoneyInput
                  className={CHARGE_INPUT_CLASS}
                  value={roundOff || ""}
                  onChange={(v) => setRoundOff(v)}
                />
              </div>
              <div className="flex items-center justify-between gap-4 py-1.5 border-t border-border/60">
                <span className="font-semibold text-sm">Grand Total</span>
                <span className="font-bold text-sm tabular-nums text-brand-700">
                  {formatINR(summaryGrandTotal)}
                </span>
              </div>
                </>
              )}
            </div>
          </div>
        </div>

        {stGen && !isEdit ? (
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

        {!soGen ? (
        <AccountingImpactSection
          docKey="sales_invoice"
          className={compactGen ? "mt-2" : undefined}
        />
        ) : null}
      </div>
    </InvoiceFormLayout>
    {discardDialog}
    </div>
  );
}
