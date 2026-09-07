"use client";

/**
 * Sales Invoice View — read-only layout aligned with Generate Sales Invoice (soGen).
 * Does not change totals, posting, PDF, or edit flow.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronDown, Download } from "lucide-react";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import {
  calcLineAmounts,
  getInvoiceById,
  getInvoiceRowActions,
  type InvoiceLineItem,
  type InvoiceRecord,
} from "./invoices-data";
import {
  SalesInvoiceService,
  mapSalesInvoiceDetailToRecord,
} from "@/services/sales-invoice.service";
import {
  calcAdditionalExpensesTotals,
  resolveInvoiceAdditionalExpenses,
} from "./invoice-additional-expenses";
import { GoodsInvoiceAdditionalChargesEditor } from "./components/GoodsInvoiceAdditionalChargesEditor";
import { downloadInvoicePdf } from "./invoice-pdf";
import {
  openProformaInvoicePreview,
  openTaxInvoicePreview,
  TAX_INVOICE_COPY_LABELS,
} from "@/app/(app)/accounts/transactions/invoices/sales-invoice-official-pdf";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatINR, INVOICES_LIST_PATH } from "./invoice-utils";
import {
  resolveWorkflowStatus,
  WORKFLOW_STATUS_LABELS,
} from "@/lib/accounts/accounts-maker-checker";
import { getInvoiceGstBreakup, getLineGstSplit } from "@/lib/accounts/invoice-gst-breakup";
import {
  INVOICE_TYPE_LABELS,
  resolveInvoiceDocumentType,
} from "@/lib/accounts/invoice-type";
import { formatMoneyOrDash } from "@/lib/accounts/money-format";
import { GENERAL_LEDGER_HREF } from "@/lib/accounts/general-ledger-data";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { cn } from "@/lib/utils";
import { getBankAccountPrintDetails } from "@/components/accounts/WarehouseMappedBankAccountSelect";
import { listBankAccountSelectOptions } from "@/lib/accounts/bank-accounts-data";
import {
  InvoiceFormLayout,
  INVOICE_FORM_GRID_CLASS,
} from "@/app/(app)/accounts/components/InvoiceFormLayout";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import {
  TransactionViewHero,
  buildVoucherViewMeta,
  voucherStatusToBadgeKey,
} from "@/components/accounts/voucher-form/TransactionViewHero";
import {
  formatMonthYear,
  invoiceHasProductDiscount,
  lineHasProductDiscount,
  resolveDisplayDiscountAmount,
  resolveDisplayDiscountPct,
  resolveLineSku,
} from "./invoice-view-display";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import "./sales-order-invoice-form-compact.css";
import "@/components/accounts/voucher-form/transaction-view.css";

function Field({
  label,
  value,
  mono,
  multiline,
  className,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  multiline?: boolean;
  className?: string;
}) {
  const empty =
    value == null || value === "" || (typeof value === "string" && !value.trim());
  return (
    <div className={cn("so-goods-field so-goods-field--view min-w-0 w-full", className)}>
      <p className="so-goods-field__label">{label}</p>
      <div
        className={cn(
          "so-goods-ro text-xs font-medium min-w-0",
          multiline && "so-goods-ro--multiline h-auto min-h-[var(--so-ctrl-h)] items-start py-1.5 whitespace-pre-wrap",
          mono && "so-goods-ro--mono font-mono text-brand-700",
          empty && "text-muted-foreground",
        )}
      >
        {empty ? "—" : value}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  grand,
}: {
  label: string;
  value: React.ReactNode;
  grand?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-0.5",
        grand && "border-t border-border/60 pt-1.5 mt-0.5",
      )}
    >
      <span className={grand ? "so-grand-total-label" : "so-summary-label"}>{label}</span>
      <span className={grand ? "so-grand-total-value" : "so-summary-value"}>{value}</span>
    </div>
  );
}

function ProductTable({
  lines,
  interstate,
  productCodeById,
}: {
  lines: InvoiceLineItem[];
  interstate: boolean;
  productCodeById: Map<number, string>;
}) {
  const headers = interstate
    ? ([
        "Product",
        "SKU",
        "Batch No.",
        "HSN",
        "Qty in Case",
        "Qty",
        "UOM",
        "Rate",
        "Gross Amount",
        "Discount %",
        "Discount Amount",
        "Scheme",
        "Taxable",
        "GST %",
        "IGST",
        "Line Total",
        "Sales Person",
      ] as const)
    : ([
        "Product",
        "SKU",
        "Batch No.",
        "HSN",
        "Qty in Case",
        "Qty",
        "UOM",
        "Rate",
        "Gross Amount",
        "Discount %",
        "Discount Amount",
        "Scheme",
        "Taxable",
        "GST %",
        "CGST",
        "SGST",
        "Line Total",
        "Sales Person",
      ] as const);

  const rightAlign = new Set([
    "Qty in Case",
    "Qty",
    "Rate",
    "Gross Amount",
    "Discount %",
    "Discount Amount",
    "Taxable",
    "GST %",
    "CGST",
    "SGST",
    "IGST",
    "Line Total",
  ]);

  const colClassByHeader: Record<string, string> = {
    Product: "so-col-product",
    SKU: "so-col-sku",
    "Batch No.": "so-col-batch",
    HSN: "so-col-hsn",
    "Qty in Case": "so-col-qty-case",
    Qty: "so-col-qty",
    UOM: "so-col-uom",
    Rate: "so-col-rate",
    "Gross Amount": "so-col-gross",
    "Discount %": "so-col-disc-pct",
    "Discount Amount": "so-col-disc-amt",
    Taxable: "so-col-taxable",
    "GST %": "so-col-gst-pct",
    CGST: "so-col-gst-amt",
    SGST: "so-col-gst-amt",
    IGST: "so-col-gst-amt",
    "Line Total": "so-col-line-total",
    "Sales Person": "so-col-salesperson",
  };

  return (
    <div className="so-goods-product-table-wrap">
      <table className="w-full text-xs min-w-[1100px] so-goods-product-table table-fixed">
        <thead className="border-b border-border/60 bg-muted/20">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className={cn(
                  "px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                  colClassByHeader[h],
                  rightAlign.has(h) && "text-right",
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="py-8 text-center text-muted-foreground">
                No line items on this invoice.
              </td>
            </tr>
          ) : (
            lines.map((line) => {
              const { base } = calcLineAmounts(line);
              const discPct = resolveDisplayDiscountPct(line);
              const discAmt = resolveDisplayDiscountAmount(line);
              /** GST / taxable / line total from stored line amounts — do not re-apply scheme % into totals. */
              const split = getLineGstSplit(line, interstate);
              const sku = resolveLineSku(line, productCodeById);
              const hasScheme = lineHasProductDiscount(line);

              return (
                <tr key={line.id} className="border-b border-border/40 last:border-0">
                  <td className="px-2 py-1.5 align-middle so-col-product">
                    <p className="so-product-name leading-tight truncate" title={line.productName}>
                      {line.productName || "—"}
                    </p>
                    <p className="so-product-meta mt-0.5 leading-tight">
                      MFG: {formatMonthYear(line.manufacturingDate)}
                    </p>
                    <p className="so-product-meta leading-tight">
                      EXP: {formatMonthYear(line.expiryDate)}
                    </p>
                  </td>
                  <td className="px-2 py-1.5 align-middle so-col-sku">
                    <p className="so-sku-value leading-tight truncate">{sku || "—"}</p>
                  </td>
                  <td className="px-2 py-1.5 align-middle so-col-batch">
                    <p className="so-batch-value leading-tight truncate">
                      {line.batchNo?.trim() || "—"}
                    </p>
                  </td>
                  <td className="px-2 py-1.5 align-middle so-col-hsn text-left text-muted-foreground">
                    {line.hsn?.trim() || "—"}
                  </td>
                  <td className="px-2 py-1.5 align-middle so-col-qty-case so-cell-num text-muted-foreground">
                    {line.qtyInCase != null && line.qtyInCase > 0 ? line.qtyInCase : "—"}
                  </td>
                  <td className="px-2 py-1.5 align-middle so-col-qty so-cell-num tabular-nums">
                    {line.qty}
                  </td>
                  <td className="px-2 py-1.5 align-middle so-col-uom whitespace-nowrap">
                    {line.unit || "—"}
                  </td>
                  <td className="px-2 py-1.5 align-middle so-col-rate so-cell-num">
                    {formatINR(line.unitPrice)}
                  </td>
                  <td className="px-2 py-1.5 align-middle so-col-gross so-cell-num">
                    {formatINR(base)}
                  </td>
                  <td className="px-2 py-1.5 align-middle so-col-disc-pct so-cell-num tabular-nums">
                    {discPct > 0 ? `${discPct}%` : "—"}
                  </td>
                  <td className="px-2 py-1.5 align-middle so-col-disc-amt so-cell-num">
                    {discAmt > 0 ? formatINR(discAmt) : "—"}
                  </td>
                  <td className="px-2 py-1.5 align-middle">
                    {hasScheme ? (
                      <div className="min-w-[110px] max-w-[150px]">
                        <p className="text-[11px] font-medium leading-tight truncate">
                          {line.schemeName || "Product Discount"}
                        </p>
                        <p className="font-mono text-[10px] text-brand-700 leading-tight truncate">
                          {line.schemeCode || "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          Product Discount
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 align-middle so-col-taxable so-cell-num">
                    {formatINR(split.taxable)}
                  </td>
                  <td className="px-2 py-1.5 align-middle so-col-gst-pct so-cell-num tabular-nums">
                    {line.taxPct > 0 ? `${line.taxPct}%` : "—"}
                  </td>
                  {interstate ? (
                    <td className="px-2 py-1.5 align-middle so-col-gst-amt so-cell-num text-muted-foreground">
                      {formatMoneyOrDash(split.igst)}
                    </td>
                  ) : (
                    <>
                      <td className="px-2 py-1.5 align-middle so-col-gst-amt so-cell-num text-muted-foreground">
                        {formatMoneyOrDash(split.cgst)}
                      </td>
                      <td className="px-2 py-1.5 align-middle so-col-gst-amt so-cell-num text-muted-foreground">
                        {formatMoneyOrDash(split.sgst)}
                      </td>
                    </>
                  )}
                  <td className="px-2 py-1.5 align-middle so-col-line-total so-cell-num font-medium">
                    {formatINR(split.lineTotal)}
                  </td>
                  <td className="px-2 py-1.5 align-middle so-col-salesperson whitespace-nowrap">
                    {line.salesperson?.trim() || "—"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function CompactSchemeInformation({ record }: { record: InvoiceRecord }) {
  if (!invoiceHasProductDiscount(record)) return null;
  const schemeLines = record.lineItems.filter(lineHasProductDiscount);
  const primary = schemeLines[0];
  const discountAmount = schemeLines.reduce(
    (sum, l) => sum + resolveDisplayDiscountAmount(l),
    0,
  );
  const discountPct = resolveDisplayDiscountPct(primary);
  const discountType =
    primary.schemeDiscountType ?? (discountPct > 0 ? "Percentage" : "Rupees");
  const turnoverEligible =
    record.productDiscountTurnoverEligible ??
    !Boolean(record.productDiscountExclusionReason?.trim());
  const exclusionReason = record.productDiscountExclusionReason?.trim() || "";

  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
        Scheme Information
      </p>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
        <span>
          <span className="text-muted-foreground">Scheme Name: </span>
          <span className="font-medium">{primary.schemeName || "Product Discount"}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Scheme Code: </span>
          <span className="font-mono font-semibold text-brand-700">
            {primary.schemeCode || "—"}
          </span>
        </span>
        <span>
          <span className="text-muted-foreground">Discount Type: </span>
          {discountType}
        </span>
        <span>
          <span className="text-muted-foreground">Discount %: </span>
          {discountPct > 0 ? `${discountPct}%` : "—"}
        </span>
        <span>
          <span className="text-muted-foreground">Discount Amount: </span>
          {discountAmount > 0 ? formatINR(discountAmount) : "—"}
        </span>
        <span>
          <span className="text-muted-foreground">Included in Turnover Calculation: </span>
          {turnoverEligible ? "Yes" : "No"}
        </span>
        {!turnoverEligible && exclusionReason ? (
          <span className="basis-full text-muted-foreground">
            Exclusion Reason: <span className="text-foreground">{exclusionReason}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function InvoiceViewPageClient({
  invoiceId,
}: {
  invoiceId: number | string;
}) {
  const router = useRouter();
  const [record, setRecord] = useState<InvoiceRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = async () => {
    setLoadError(null);
    const idStr = String(invoiceId);
    if (SalesInvoiceService.isUuid(idStr)) {
      try {
        const dto = await SalesInvoiceService.getById(idStr);
        setRecord(mapSalesInvoiceDetailToRecord(dto));
        return;
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to load invoice.");
        setRecord(null);
        return;
      }
    }
    const numericId = Number(invoiceId);
    if (!Number.isFinite(numericId)) {
      router.replace(INVOICES_LIST_PATH);
      return;
    }
    const r = getInvoiceById(numericId);
    if (!r) {
      router.replace(INVOICES_LIST_PATH);
      return;
    }
    setRecord(r);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const productCodeById = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of loadProducts()) {
      map.set(p.id, p.productCode || p.sku || "");
    }
    return map;
  }, []);

  if (loadError) {
    return (
      <div className="p-6 text-sm text-red-600">
        {loadError}{" "}
        <Link href={INVOICES_LIST_PATH} className="underline text-brand-700">
          Back to list
        </Link>
      </div>
    );
  }

  if (!record) return null;

  const actions = getInvoiceRowActions(record);
  const workflowStatus = resolveWorkflowStatus(record.workflow, record.invoiceStatus);
  const invoiceType = resolveInvoiceDocumentType(record);
  const gst = getInvoiceGstBreakup(record);
  const interstate = gst.interstate;
  const bankOptions = listBankAccountSelectOptions(
    record.warehouseUuid || record.warehouse,
  );
  const bankDetails =
    record.bankAccountId != null
      ? getBankAccountPrintDetails(record.bankAccountId)
      : bankOptions[0]
        ? getBankAccountPrintDetails(bankOptions[0].id)
        : null;
  const isSalesOrderView =
    record.sourceType === "sales_order" ||
    (invoiceType === "sales" && Boolean(record.salesOrderNo || record.dispatchNo));

  const expenses = resolveInvoiceAdditionalExpenses(
    record.additionalExpenses,
    record.shippingCharges,
    record.otherCharges,
  );
  const expenseTotals = calcAdditionalExpensesTotals(expenses);

  const productGross = record.lineItems.reduce((s, l) => {
    const { base } = calcLineAmounts(l);
    return s + base;
  }, 0);
  const productDiscount = record.lineItems.reduce(
    (s, l) => s + resolveDisplayDiscountAmount(l),
    0,
  );
  /** Prefer stored discountTotal; derive line discount for display only when seed omitted it. */
  const storedDiscount = record.discountTotal || 0;
  const displayDiscount = storedDiscount > 0 ? storedDiscount : productDiscount;
  const roundOff = record.roundOff ?? 0;
  const gstin =
    record.customerGst?.trim() ||
    (record as InvoiceRecord & { gstin?: string }).gstin?.trim() ||
    "";

  const hasTransport = Boolean(
    record.transportMode ||
      record.transporterName ||
      record.vehicleNo ||
      record.ewayBillNo ||
      record.eInvoiceNo ||
      record.irn,
  );

  const narration =
    record.internalRemarks?.trim() ||
    record.remarks?.trim() ||
    record.customerNotes?.trim() ||
    "";

  const canDownloadPi =
    record.sourceType !== "service" &&
    Boolean(record.salesInvoiceId) &&
    Boolean(record.sourceDispatchId);
  const invoicePdfId = String(record.salesInvoiceId || "");

  const handleOfficialPdfError = (error: unknown, fallback: string) => {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    alert(err?.response?.data?.message || err?.message || fallback);
  };

  const downloadMenu = canDownloadPi ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs font-medium gap-1.5">
          <Download className="w-3.5 h-3.5" /> Download PDF
          <ChevronDown className="w-3.5 h-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={() => {
            void openProformaInvoicePreview(invoicePdfId).catch((error) =>
              handleOfficialPdfError(error, "Failed to open Proforma Invoice."),
            );
          }}
        >
          Download Proforma Invoice
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Tax Invoice</DropdownMenuLabel>
        {TAX_INVOICE_COPY_LABELS.map((copyLabel) => (
          <DropdownMenuItem
            key={copyLabel}
            onClick={() => {
              void openTaxInvoicePreview(invoicePdfId, copyLabel).catch((error) =>
                handleOfficialPdfError(error, "Failed to open Tax Invoice."),
              );
            }}
          >
            {copyLabel}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Button
      variant="outline"
      size="sm"
      className="h-8 text-xs font-medium gap-1.5"
      onClick={() => downloadInvoicePdf(record)}
    >
      <Download className="w-3.5 h-3.5" /> Print / PDF
    </Button>
  );

  const stickyFooter = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {actions.includes("edit") ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => router.push(`${INVOICES_LIST_PATH}/${record.id}/edit`)}
        >
          Edit
        </Button>
      ) : null}
      {downloadMenu}
    </div>
  );

  return (
    <div className="sales-order-invoice-form-compact h-full min-h-0 flex flex-col w-full">
      <InvoiceFormLayout
        title="View Sales Invoice"
        subtitle={`${record.invoiceNo} · ${WORKFLOW_STATUS_LABELS[workflowStatus]}`}
        breadcrumb={accountsBreadcrumb("Transactions", "Sales Invoice", INVOICES_LIST_PATH)}
        backHref={INVOICES_LIST_PATH}
        stickyFooter={stickyFooter}
      >
        <div
          className={cn(
            "space-y-2 transaction-voucher-view",
            isSalesOrderView && "so-invoice-view-page",
          )}
        >
          <TransactionViewHero
            statusKey={voucherStatusToBadgeKey(workflowStatus)}
            statusLabel={WORKFLOW_STATUS_LABELS[workflowStatus]}
            chips={[INVOICE_TYPE_LABELS[invoiceType]]}
            metaItems={buildVoucherViewMeta({
              draftNo: record.invoiceNo,
              accountingVoucherNo: record.postedVoucherNo || null,
              voucherDate: record.invoiceDate,
              branchName: record.warehouse || record.branch || undefined,
            })}
            partyLabel={record.customerName}
            amountLabel="Grand Total"
            amount={gst.invoiceTotal}
          />

          <VoucherFormSectionCard title="Customer" highlight>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
              <Field label="Customer Name" value={record.customerName} />
              <Field label="GSTIN" value={gstin} mono />
              <Field label="Billing Address" value={record.billingAddress} multiline />
              <Field
                label="Shipping Address"
                value={record.shippingAddress || record.billingAddress}
                multiline
              />
            </div>
          </VoucherFormSectionCard>

          <VoucherFormSectionCard title="Invoice Details" highlight>
            <div className={INVOICE_FORM_GRID_CLASS}>
              <Field label="Invoice No." value={record.invoiceNo} mono />
              <Field label="Invoice Date" value={formatDisplayDate(record.invoiceDate)} />
              <Field label="Due Date" value={formatDisplayDate(record.dueDate)} />
              <Field
                label="Sales Order No."
                value={record.salesOrderNo || record.referenceNo}
                mono
              />
              <Field label="Dispatch No." value={record.dispatchNo} mono />
              <Field
                label="Bank Account"
                value={
                  bankDetails
                    ? `${bankDetails.bankName} · ${bankDetails.accountNumber}`
                    : record.receivableLedger || ""
                }
              />
              <Field label="Warehouse" value={record.warehouse} />
              <Field label="Branch" value={record.branch} />
              <Field label="Place of Supply" value={record.placeOfSupply} />
              <Field label="Type" value={INVOICE_TYPE_LABELS[invoiceType]} />
              <Field
                label="Accounting Voucher"
                value={
                  record.postedVoucherId ? (
                    <Link
                      href={`/accounts/vouchers/view/${record.postedVoucherId}`}
                      className="font-mono text-brand-700 hover:underline"
                    >
                      {record.postedVoucherNo || `V-${record.postedVoucherId}`}
                    </Link>
                  ) : (
                    ""
                  )
                }
              />
              <Field
                label="General Ledger"
                value={
                  record.customerLedgerUuid ? (
                    <Link
                      href={`/accounts/masters/chart-of-accounts?node=${encodeURIComponent(record.customerLedgerUuid)}`}
                      className="text-brand-700 hover:underline text-xs"
                    >
                      Open customer ledger
                    </Link>
                  ) : record.customerLedgerId ? (
                    <Link
                      href={`${GENERAL_LEDGER_HREF}?ledgerId=${record.customerLedgerId}&ledgerType=Customer`}
                      className="text-brand-700 hover:underline text-xs"
                    >
                      Open customer ledger
                    </Link>
                  ) : (
                    <Link href={GENERAL_LEDGER_HREF} className="text-brand-700 hover:underline text-xs">
                      Open General Ledger
                    </Link>
                  )
                }
              />
            </div>
          </VoucherFormSectionCard>

          {hasTransport ? (
            <VoucherFormSectionCard title="Transport & Statutory Details" highlight>
              <div className={cn(INVOICE_FORM_GRID_CLASS, "lg:grid-cols-3 xl:grid-cols-5")}>
                <Field label="Transport Mode" value={record.transportMode} />
                <Field label="Transporter Name" value={record.transporterName} />
                <Field label="Transporter ID" value={record.transporterId} />
                <Field label="Vehicle No." value={record.vehicleNo} />
                <Field
                  label="Distance (KM)"
                  value={
                    record.distanceKm != null && record.distanceKm > 0
                      ? String(record.distanceKm)
                      : ""
                  }
                />
                <Field label="LR / Lorry Receipt No." value={record.lrNo} />
                <Field label="LR Date" value={formatDisplayDate(record.lrDate)} />
                <Field label="Transport Doc No." value={record.transportDocNo} />
                <Field label="Transport Doc Date" value={formatDisplayDate(record.transportDocDate)} />
                <Field label="E-Invoice Status" value={record.eInvoiceStatus} />
                <Field label="E-Invoice No." value={record.eInvoiceNo} mono />
                <Field label="IRN" value={record.irn} mono />
                <Field label="E-Way Bill Status" value={record.ewayBillStatus} />
                <Field label="E-Way Bill No." value={record.ewayBillNo} mono />
                <Field label="E-Way Expiry" value={formatDisplayDate(record.ewayBillExpiryDate)} />
              </div>
            </VoucherFormSectionCard>
          ) : null}

          <VoucherFormSectionCard title="Product Details" highlight flush>
            <ProductTable
              lines={record.lineItems}
              interstate={interstate}
              productCodeById={productCodeById}
            />
            <div className="px-3 pb-3">
              <CompactSchemeInformation record={record} />
            </div>
          </VoucherFormSectionCard>

          {expenses.length > 0 ? (
            <VoucherFormSectionCard title="Additional Charges" highlight flush>
              <GoodsInvoiceAdditionalChargesEditor
                expenses={expenses}
                onChange={() => undefined}
                disabled
                interstate={interstate}
                tableVariant="invoice"
              />
            </VoucherFormSectionCard>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-2.5 items-start">
            <VoucherFormSectionCard title="Narration" highlight>
              <p className="text-xs text-foreground whitespace-pre-wrap min-h-[48px]">
                {narration || "—"}
              </p>
            </VoucherFormSectionCard>

            <VoucherFormSectionCard title="Invoice Summary" highlight>
              <div className="space-y-1 so-invoice-summary">
                <SummaryRow label="Gross Amount" value={formatINR(productGross || record.subtotal)} />
                <SummaryRow label="Discount" value={formatINR(displayDiscount)} />
                <SummaryRow label="Taxable Amount" value={formatINR(gst.taxableValue)} />
                {interstate ? (
                  <SummaryRow label="Output IGST" value={formatMoneyOrDash(gst.igst)} />
                ) : (
                  <>
                    <SummaryRow label="Output CGST" value={formatMoneyOrDash(gst.cgst)} />
                    <SummaryRow label="Output SGST" value={formatMoneyOrDash(gst.sgst)} />
                  </>
                )}
                {(expenseTotals.taxableAmount > 0 || expenses.length > 0) && (
                  <SummaryRow
                    label="Additional Charges"
                    value={formatINR(expenseTotals.taxableAmount)}
                  />
                )}
                <SummaryRow label="Round Off" value={formatINR(roundOff)} />
                <SummaryRow label="Grand Total" value={formatINR(gst.invoiceTotal)} grand />
                <SummaryRow label="Received" value={formatINR(record.amountReceived)} />
                <SummaryRow label="Balance Due" value={formatINR(record.balanceAmount)} />
              </div>
            </VoucherFormSectionCard>
          </div>
        </div>
      </InvoiceFormLayout>
    </div>
  );
}
