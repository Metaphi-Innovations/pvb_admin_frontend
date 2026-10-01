"use client";

/**
 * Sales Invoice View — read-only layout aligned with Generate Sales Invoice (soGen).
 * Does not change totals, posting, PDF, or edit flow.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar, Download } from "lucide-react";
import { RecordDetailPage } from "@/components/record-detail";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import {
  calcGstLineSplit,
  calcLineAmounts,
  getInvoiceById,
  getInvoiceRowActions,
  type InvoiceLineItem,
  type InvoiceRecord,
} from "./invoices-data";
import {
  calcAdditionalExpensesTotals,
  resolveInvoiceAdditionalExpenses,
  type InvoiceAdditionalExpense,
} from "./invoice-additional-expenses";
import { downloadInvoicePdf } from "./invoice-pdf";
import { formatINR, INVOICES_LIST_PATH } from "./invoice-utils";
import {
  resolveWorkflowStatus,
  WORKFLOW_STATUS_LABELS,
  type AccountsVoucherWorkflowStatus,
} from "@/lib/accounts/accounts-maker-checker";
import { getInvoiceGstBreakup } from "@/lib/accounts/invoice-gst-breakup";
import {
  INVOICE_TYPE_LABELS,
  resolveInvoiceDocumentType,
} from "@/lib/accounts/invoice-type";
import { formatMoneyOrDash } from "@/lib/accounts/money-format";
import { GENERAL_LEDGER_HREF } from "@/lib/accounts/general-ledger-data";
import { cn } from "@/lib/utils";
import { getBankAccountPrintDetails } from "@/components/accounts/WarehouseMappedBankAccountSelect";
import {
  InvoiceFormCard,
  INVOICE_FORM_CARD_TITLE_CLASS,
} from "@/app/(app)/accounts/components/InvoiceFormLayout";
import {
  formatMonthYear,
  invoiceHasProductDiscount,
  lineHasProductDiscount,
  resolveDisplayDiscountAmount,
  resolveDisplayDiscountPct,
  resolveLineSku,
} from "./invoice-view-display";
import "./sales-order-invoice-form-compact.css";

function Field({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  const empty =
    value == null || value === "" || (typeof value === "string" && !value.trim());
  return (
    <div className={cn("so-goods-field", className)}>
      <p className="so-goods-field__label">{label}</p>
      <div
        className={cn(
          "so-goods-ro text-xs font-medium",
          mono && "so-goods-ro--mono font-mono text-brand-700",
          empty && "text-muted-foreground",
        )}
      >
        {empty ? "—" : value}
      </div>
    </div>
  );
}

function invoiceStatusVariant(
  status: AccountsVoucherWorkflowStatus,
): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (status === "draft") return "draft";
  if (status === "posted") return "active";
  if (status === "cancelled" || status === "rejected") return "blocked";
  if (status === "pending_approval" || status === "sent_back") return "neutral";
  return "inactive";
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

  return (
    <div className="overflow-x-auto border border-border/60 rounded-lg bg-white">
      <table className="w-full text-xs min-w-[1100px] so-goods-product-table">
        <thead className="border-b border-border/60 bg-muted/20">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className={cn(
                  "px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
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
              const split = calcGstLineSplit(line, interstate);
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
                  <td className="px-2 py-1.5 align-middle so-cell-num text-muted-foreground">
                    {line.hsn?.trim() || "—"}
                  </td>
                  <td className="px-2 py-1.5 align-middle so-cell-num text-muted-foreground">
                    {line.qtyInCase != null && line.qtyInCase > 0 ? line.qtyInCase : "—"}
                  </td>
                  <td className="px-2 py-1.5 align-middle so-cell-num tabular-nums">{line.qty}</td>
                  <td className="px-2 py-1.5 align-middle whitespace-nowrap">{line.unit || "—"}</td>
                  <td className="px-2 py-1.5 align-middle so-cell-num">{formatINR(line.unitPrice)}</td>
                  <td className="px-2 py-1.5 align-middle so-cell-num">{formatINR(base)}</td>
                  <td className="px-2 py-1.5 align-middle so-cell-num tabular-nums">
                    {discPct > 0 ? `${discPct}%` : "—"}
                  </td>
                  <td className="px-2 py-1.5 align-middle so-cell-num">
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
                  <td className="px-2 py-1.5 align-middle so-cell-num">{formatINR(split.taxable)}</td>
                  <td className="px-2 py-1.5 align-middle so-cell-num tabular-nums">
                    {line.taxPct > 0 ? `${line.taxPct}%` : "—"}
                  </td>
                  {interstate ? (
                    <td className="px-2 py-1.5 align-middle so-cell-num text-muted-foreground">
                      {formatMoneyOrDash(split.igst)}
                    </td>
                  ) : (
                    <>
                      <td className="px-2 py-1.5 align-middle so-cell-num text-muted-foreground">
                        {formatMoneyOrDash(split.cgst)}
                      </td>
                      <td className="px-2 py-1.5 align-middle so-cell-num text-muted-foreground">
                        {formatMoneyOrDash(split.sgst)}
                      </td>
                    </>
                  )}
                  <td className="px-2 py-1.5 align-middle so-cell-num font-medium">
                    {formatINR(split.lineTotal)}
                  </td>
                  <td className="px-2 py-1.5 align-middle whitespace-nowrap">
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

export default function InvoiceViewPageClient({ invoiceId }: { invoiceId: number }) {
  const router = useRouter();
  const [record, setRecord] = useState<InvoiceRecord | null>(null);

  const refresh = () => {
    const r = getInvoiceById(invoiceId);
    if (!r) {
      router.replace(INVOICES_LIST_PATH);
      return;
    }
    setRecord(r);
  };

  useEffect(() => {
    refresh();
  }, [invoiceId]);

  const productCodeById = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of loadProducts()) {
      map.set(p.id, p.productCode || p.sku || "");
    }
    return map;
  }, []);

  if (!record) return null;

  const actions = getInvoiceRowActions(record);
  const workflowStatus = resolveWorkflowStatus(record.workflow, record.invoiceStatus);
  const invoiceType = resolveInvoiceDocumentType(record);
  const gst = getInvoiceGstBreakup(record);
  const interstate = gst.interstate;
  const bankDetails = getBankAccountPrintDetails(record.bankAccountId);
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

  return (
    <RecordDetailPage
      embedded
      listHref={INVOICES_LIST_PATH}
      listLabel="Invoices"
      recordName={record.customerName}
      recordCode={record.invoiceNo}
      statusLabel={WORKFLOW_STATUS_LABELS[workflowStatus]}
      statusVariant={invoiceStatusVariant(workflowStatus)}
      metaItems={[{ icon: Calendar, label: record.invoiceDate }]}
      onEdit={
        actions.includes("edit")
          ? () => router.push(`${INVOICES_LIST_PATH}/${record.id}/edit`)
          : undefined
      }
      headerActions={
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium gap-1.5"
          onClick={() => downloadInvoicePdf(record)}
        >
          <Download className="w-3.5 h-3.5" /> Print / PDF
        </Button>
      }
    >
      <div
        className={cn(
          "space-y-3",
          isSalesOrderView && "sales-order-invoice-form-compact",
        )}
      >
        {/* Customer */}
        <InvoiceFormCard title="Customer">
          <div className="so-goods-field-grid grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Customer Name" value={record.customerName} />
            <Field label="GSTIN" value={gstin} mono />
            <Field
              label="Billing Address"
              value={record.billingAddress}
              className="md:col-span-2"
            />
            <Field
              label="Shipping Address"
              value={record.shippingAddress || record.billingAddress}
              className="md:col-span-2"
            />
          </div>
        </InvoiceFormCard>

        {/* Invoice Details */}
        <InvoiceFormCard title="Invoice Details">
          <div className="so-goods-field-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <Field label="Invoice No." value={record.invoiceNo} mono />
            <Field label="Invoice Date" value={record.invoiceDate} />
            <Field label="Due Date" value={record.dueDate} />
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
                record.customerLedgerId ? (
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
        </InvoiceFormCard>

        {/* Transport — when present */}
        {hasTransport ? (
          <InvoiceFormCard title="Transport & Statutory Details">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
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
              <Field label="LR Date" value={record.lrDate} />
              <Field label="Transport Doc No." value={record.transportDocNo} />
              <Field label="Transport Doc Date" value={record.transportDocDate} />
              <Field label="E-Invoice Status" value={record.eInvoiceStatus} />
              <Field label="E-Invoice No." value={record.eInvoiceNo} mono />
              <Field label="IRN" value={record.irn} mono />
              <Field label="E-Way Bill Status" value={record.ewayBillStatus} />
              <Field label="E-Way Bill No." value={record.ewayBillNo} mono />
              <Field label="E-Way Expiry" value={record.ewayBillExpiryDate} />
            </div>
          </InvoiceFormCard>
        ) : null}

        {/* Product Details */}
        <div className="space-y-2">
          <h2 className={INVOICE_FORM_CARD_TITLE_CLASS}>Product Details</h2>
          <ProductTable
            lines={record.lineItems}
            interstate={interstate}
            productCodeById={productCodeById}
          />
          <CompactSchemeInformation record={record} />
        </div>

        {/* Additional Charges */}
        {expenses.length > 0 ? (
          <div className="space-y-2">
            <h2 className={INVOICE_FORM_CARD_TITLE_CLASS}>Additional Charges</h2>
            <div className="overflow-x-auto border border-border/60 rounded-lg bg-white">
              <table className="w-full text-xs min-w-[720px]">
                <thead className="bg-muted/20 border-b border-border/60">
                  <tr>
                    {(interstate
                      ? ["Additional Charge", "Amount", "GST %", "IGST", "Total Amount", "Remarks"]
                      : [
                          "Additional Charge",
                          "Amount",
                          "GST %",
                          "CGST",
                          "SGST",
                          "Total Amount",
                          "Remarks",
                        ]
                    ).map((h) => (
                      <th
                        key={h}
                        className={cn(
                          "px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-left",
                          h !== "Additional Charge" && h !== "Remarks" && "text-right",
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e: InvoiceAdditionalExpense) => {
                    const tax = e.gstApplicable
                      ? Math.round(e.amount * (e.gstPct / 100) * 100) / 100
                      : 0;
                    const half = Math.round((tax / 2) * 100) / 100;
                    const total = e.amount + tax;
                    return (
                      <tr key={e.id} className="border-b border-border/40">
                        <td className="px-2 py-1.5 font-medium">{e.expenseHead || "—"}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{formatINR(e.amount)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {e.gstApplicable ? `${e.gstPct}%` : "—"}
                        </td>
                        {interstate ? (
                          <td className="px-2 py-1.5 text-right tabular-nums">
                            {formatMoneyOrDash(tax)}
                          </td>
                        ) : (
                          <>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {formatMoneyOrDash(half)}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {formatMoneyOrDash(tax - half)}
                            </td>
                          </>
                        )}
                        <td className="px-2 py-1.5 text-right tabular-nums font-medium">
                          {formatINR(total)}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">{e.remarks || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* Narration + Invoice Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-2.5 items-start">
          <div className="space-y-2">
            <h2 className={INVOICE_FORM_CARD_TITLE_CLASS}>Narration</h2>
            <div className="rounded-lg border border-slate-200 bg-white p-3 min-h-[64px]">
              <p className="text-xs text-foreground whitespace-pre-wrap">
                {narration || "—"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5 shadow-sm lg:sticky lg:top-3">
            <h2 className="accounts-card-title">Invoice Summary</h2>
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
          </div>
        </div>
      </div>
    </RecordDetailPage>
  );
}
