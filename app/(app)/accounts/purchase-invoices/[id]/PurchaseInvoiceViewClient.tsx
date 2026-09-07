"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileMinus,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PurchaseInvoicePageShell } from "../PurchaseInvoicePageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { DEBIT_NOTES_LIST_PATH } from "@/app/(app)/accounts/debit-notes/note-utils";
import { formatMoney, formatMoneyOrDash } from "@/lib/accounts/money-format";
import { purchaseInvoiceImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { cn } from "@/lib/utils";
import {
  calcPurchaseLineGstSplit,
  getPurchaseInvoiceGstBreakup,
  isDirectPurchaseInvoice,
  isGrnPurchaseInvoice,
  PURCHASE_SOURCE_TYPE_LABELS,
} from "../purchase-invoices-data";
import {
  PurchaseInvoiceService,
  mapPurchaseInvoiceDetailToRecord,
  mapPrepareGrnToRecord,
  parsePendingGrnViewId,
} from "@/services/purchase-invoice.service";
import type { PurchaseInvoiceRecord } from "../purchase-invoices-data";
import {
  ITC_CLASSIFICATION_LABELS,
  PURCHASE_NATURE_LABELS,
} from "../purchase-invoice-direct-utils";
import {
  buildQuantityComparisonsForInvoice,
  detectQuantityMismatch,
  resolvePurchaseInvoiceMatchStatus,
} from "../purchase-invoice-quantity-match";
import {
  PurchaseInvoiceQtyComparisonTable,
  PurchaseInvoiceMismatchBanner,
  PurchaseInvoiceMatchStatusBadge,
} from "../PurchaseInvoiceQtyComparisonTable";
import { DirectPurchaseAttachmentPanel } from "../DirectPurchaseAttachmentPanel";
import { getBankAccountPrintDetails } from "@/components/accounts/WarehouseMappedBankAccountSelect";
import { formatDisplayDate, isoToDisplayDate } from "@/lib/accounts/date-display";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import {
  TransactionViewHero,
  buildVoucherViewMeta,
  voucherStatusToBadgeKey,
} from "@/components/accounts/voucher-form/TransactionViewHero";
import "@/components/accounts/voucher-form/transaction-view.css";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-[11px] text-muted-foreground font-medium leading-tight">{label}</p>
      <p className="text-xs font-medium text-foreground truncate leading-snug" title={value || undefined}>
        {value || "—"}
      </p>
    </div>
  );
}

function DateField({ label, value }: { label: string; value?: string | null }) {
  const display = value ? isoToDisplayDate(value) || value : "";
  return <Field label={label} value={display} />;
}

const POSTING_STATUS_LABELS: Record<string, string> = {
  POSTED: "Posted",
  CANCELLED: "Cancelled",
  PENDING: "Pending",
  REVERSED: "Reversed",
};

const BASE_ITEM_COLUMNS = ["#", "Product", "Description", "Qty", "Unit", "Rate", "Taxable"] as const;
const BASE_CHARGE_COLUMNS = [
  "#",
  "Particular / Charge Name",
  "Ledger",
  "HSN",
  "Amount",
  "GST Applicable",
  "GST %",
] as const;

function purchaseItemColumns(interstate: boolean): string[] {
  return [
    ...BASE_ITEM_COLUMNS,
    ...(interstate ? ["IGST"] : ["CGST", "SGST"]),
    "Total",
  ];
}

function purchaseChargeColumns(interstate: boolean): string[] {
  return [
    ...BASE_CHARGE_COLUMNS,
    ...(interstate ? ["IGST"] : ["CGST", "SGST"]),
    "Total",
    "Remarks",
  ];
}

function PaymentBadge({ amountPaid, grandTotal }: { amountPaid: number; grandTotal: number }) {
  if (amountPaid >= grandTotal && grandTotal > 0)
    return (
      <Badge className="text-xs h-6 bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
        <CheckCircle2 className="w-3 h-3" /> Paid
      </Badge>
    );
  if (amountPaid > 0)
    return (
      <Badge className="text-xs h-6 bg-amber-100 text-amber-700 border-amber-200 gap-1">
        <Clock className="w-3 h-3" /> Partially Paid
      </Badge>
    );
  return (
    <Badge className="text-xs h-6 bg-red-100 text-red-700 border-red-200 gap-1">
      <AlertCircle className="w-3 h-3" /> Unpaid
    </Badge>
  );
}

export default function PurchaseInvoiceViewClient({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<PurchaseInvoiceRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const refresh = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    const pendingGrnId = parsePendingGrnViewId(invoiceId);
    try {
      if (pendingGrnId) {
        const dto = await PurchaseInvoiceService.prepareGrn(pendingGrnId);
        setInvoice(mapPrepareGrnToRecord(dto));
        return;
      }
      if (!PurchaseInvoiceService.isUuid(invoiceId)) {
        setInvoice(null);
        setLoadError("This purchase invoice is not a live API record.");
        return;
      }
      const dto = await PurchaseInvoiceService.getById(invoiceId);
      setInvoice(mapPurchaseInvoiceDetailToRecord(dto));
    } catch (e) {
      setInvoice(null);
      setLoadError(e instanceof Error ? e.message : "Failed to load purchase invoice.");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isDirect = invoice ? isDirectPurchaseInvoice(invoice) : false;
  const isGrn = invoice ? isGrnPurchaseInvoice(invoice) : false;
  const recordHref = invoice?.backendId || invoiceId;
  const postingStatus = invoice?.backendStatus || "POSTED";
  const canCancel = postingStatus === "POSTED";

  const handleCancel = async () => {
    if (!canCancel) return;
    const reason = window.prompt("Reason for cancelling this purchase invoice?");
    if (!reason?.trim()) return;
    setCancelling(true);
    try {
      await PurchaseInvoiceService.cancel(recordHref, { reason: reason.trim() });
      await refresh();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to cancel purchase invoice.");
    } finally {
      setCancelling(false);
    }
  };

  const matchStatus = invoice ? resolvePurchaseInvoiceMatchStatus(invoice) : "matched";
  const qtyComparisons = useMemo(
    () => (invoice ? buildQuantityComparisonsForInvoice(invoice) : []),
    [invoice],
  );
  const qtyComparisonRows = useMemo(() => {
    if (!invoice) return [];
    return invoice.lineItems.map((line, i) => ({
      productName: line.productName,
      batchNumber: line.batchNumber,
      comparison: qtyComparisons[i] ?? line.qtyComparison ?? {
        supplierInvoiceQty: line.invoiceQty,
        grnReceivedQty: 0,
        qcAcceptedQty: 0,
        qcRejectedQty: 0,
        shortQty: 0,
      },
    }));
  }, [invoice, qtyComparisons]);

  if (loading) {
    return (
      <PurchaseInvoicePageShell
        breadcrumbs={accountsBreadcrumb("Purchase Invoices", "View")}
        title="Purchase Invoice"
        description=""
      >
        <p className="text-sm text-muted-foreground py-16 text-center">Loading purchase invoice…</p>
      </PurchaseInvoicePageShell>
    );
  }

  if (!invoice) {
    return (
      <PurchaseInvoicePageShell
        breadcrumbs={accountsBreadcrumb("Purchase Invoices", "Not Found")}
        title="Invoice Not Found"
        description=""
      >
        <div className="flex flex-col items-center py-16">
          <AlertCircle className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">{loadError || `Purchase invoice ${invoiceId} not found.`}</p>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-sm font-medium"
            onClick={() => router.push("/accounts/purchase-invoices")}
          >
            Back to List
          </Button>
        </div>
      </PurchaseInvoicePageShell>
    );
  }

  const outstanding = Math.max(0, (invoice.netPayable ?? invoice.grandTotal) - invoice.amountPaid);
  const gst = getPurchaseInvoiceGstBreakup(invoice);
  const itemColumns = purchaseItemColumns(gst.interstate);
  const chargeColumns = purchaseChargeColumns(gst.interstate);
  const showMismatchBanner =
    isGrn &&
    detectQuantityMismatch(qtyComparisonRows.map((r) => r.comparison)) &&
    matchStatus !== "matched";

  const impactLines = purchaseInvoiceImpactResolved({
    vendorName: invoice.vendorName,
    taxable: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    grandTotal: invoice.grandTotal,
    cgst: invoice.cgstTotal,
    sgst: invoice.sgstTotal,
    igst: invoice.igstTotal,
    roundOff: invoice.roundingAdjustment ?? 0,
  });

  const sourceChip = isDirect
    ? PURCHASE_SOURCE_TYPE_LABELS.direct_purchase
    : PURCHASE_SOURCE_TYPE_LABELS.from_grn;
  const heroChips = [
    sourceChip,
    ...(invoice.reverseChargeApplicable ? ["RCM"] : []),
    ...(invoice.grnNo ? [invoice.grnNo] : []),
  ];
  const statusLabel = POSTING_STATUS_LABELS[postingStatus] || postingStatus;

  return (
    <PurchaseInvoicePageShell
      breadcrumbs={accountsBreadcrumb("Purchase Invoices", invoice.invoiceNo)}
      title={invoice.invoiceNo}
      description={`Supplier Invoice: ${invoice.vendorInvoiceNo || "—"} · ${invoice.vendorName}`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-sm font-medium gap-1.5"
            onClick={() => router.push("/accounts/purchase-invoices")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-sm font-medium gap-1.5 text-red-700 border-red-200 hover:bg-red-50"
              disabled={cancelling}
              onClick={() => void handleCancel()}
            >
              Cancel Invoice
            </Button>
          )}
        </div>
      }
    >
      <div className="w-full space-y-2 pb-6 transaction-voucher-view">
        <PurchaseInvoiceMismatchBanner visible={showMismatchBanner} />

        <TransactionViewHero
          statusKey={voucherStatusToBadgeKey(postingStatus)}
          statusLabel={statusLabel}
          chips={heroChips}
          metaItems={buildVoucherViewMeta({
            draftNo: invoice.invoiceNo,
            voucherDate: invoice.invoiceDate
              ? isoToDisplayDate(invoice.invoiceDate) || invoice.invoiceDate
              : undefined,
            branchName: invoice.warehouse || undefined,
          })}
          partyLabel={invoice.vendorName}
          amountLabel="Grand Total"
          amount={invoice.grandTotal}
        />

        {isGrn && (
          <div className="flex flex-wrap items-center gap-2 px-0.5">
            <PurchaseInvoiceMatchStatusBadge status={matchStatus} />
            <PaymentBadge amountPaid={invoice.amountPaid} grandTotal={invoice.grandTotal} />
          </div>
        )}
        {!isGrn && (
          <div className="flex flex-wrap items-center gap-2 px-0.5">
            <PaymentBadge amountPaid={invoice.amountPaid} grandTotal={invoice.grandTotal} />
          </div>
        )}

        {loadError && invoice && (
          <p className="text-xs text-red-700 px-1">{loadError}</p>
        )}

        {/* Document References — GRN only */}
        {isGrn && (invoice.poNumber || invoice.grnNo || invoice.qcNo || invoice.vendorInvoiceNo) && (
          <VoucherFormSectionCard title="Document References" highlight>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <Field label="Supplier Invoice" value={invoice.vendorInvoiceNo} />
              <Field label="Purchase Order" value={invoice.poNumber} />
              <Field label="GRN" value={invoice.grnNo} />
              <Field label="QC" value={invoice.qcNo} />
            </div>
            {invoice.pendingDebitNoteNo && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs">
                <FileMinus className="w-3.5 h-3.5 text-orange-700 flex-shrink-0" />
                <span className="text-orange-800">
                  Pending Debit Note:{" "}
                  <button
                    type="button"
                    className="font-mono font-semibold text-brand-700 hover:underline"
                    onClick={() =>
                      router.push(
                        invoice.pendingDebitNoteId
                          ? `${DEBIT_NOTES_LIST_PATH}/${invoice.pendingDebitNoteId}`
                          : `${DEBIT_NOTES_LIST_PATH}/new?purchaseInvoiceId=${recordHref}`,
                      )
                    }
                  >
                    {invoice.pendingDebitNoteNo}
                  </button>
                  <span className="text-orange-700 ml-1">— Pending Confirmation</span>
                </span>
              </div>
            )}
          </VoucherFormSectionCard>
        )}

        {/* Vendor & Invoice Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <VoucherFormSectionCard title="Supplier Details" highlight>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <Field label="Supplier Name" value={invoice.vendorName} />
              <Field label="GSTIN" value={invoice.vendorGst} />
              {isGrn && <Field label="PO Number" value={invoice.poNumber} />}
              {isGrn && <Field label="GRN Number" value={invoice.grnNo} />}
              {isGrn && <Field label="QC Number" value={invoice.qcNo} />}
              {isDirect && <Field label="Place of Supply" value={invoice.placeOfSupply} />}
              {isDirect && <Field label="Branch GSTIN" value={invoice.branchGstin} />}
            </div>
          </VoucherFormSectionCard>
          <VoucherFormSectionCard title="Invoice Details" highlight>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <Field label="Invoice No (Internal)" value={invoice.invoiceNo} />
              <Field label="Supplier Invoice No" value={invoice.vendorInvoiceNo} />
              <DateField label="Supplier Invoice Date" value={invoice.invoiceDate} />
              <DateField label="Due Date" value={invoice.dueDate} />
              <Field
                label="Approval"
                value={invoice.backendStatus === "PENDING" ? "Pending Approval" : "Approved"}
              />
              <Field
                label="Payment"
                value={
                  invoice.amountPaid >= invoice.grandTotal && invoice.grandTotal > 0
                    ? "Paid"
                    : invoice.amountPaid > 0
                      ? "Partial"
                      : "Unpaid"
                }
              />
              {isDirect && <DateField label="Posting Date" value={invoice.postingDate} />}
              {isDirect && (
                <Field
                  label="Purchase Nature"
                  value={invoice.purchaseNature ? PURCHASE_NATURE_LABELS[invoice.purchaseNature] : "—"}
                />
              )}
              {isDirect && (
                <Field
                  label="Default ITC"
                  value={
                    invoice.defaultItcClassification
                      ? ITC_CLASSIFICATION_LABELS[invoice.defaultItcClassification]
                      : "—"
                  }
                />
              )}
              {isDirect && <Field label="Payment Terms" value={invoice.paymentTerms} />}
              {isDirect && <Field label="Currency" value={invoice.currency} />}
              {isDirect && <Field label="Reference No." value={invoice.referenceNumber} />}
              {isGrn && <Field label="Match Status" value={matchStatus.replace(/_/g, " ")} />}
              {isGrn && <Field label="Warehouse" value={invoice.warehouse} />}
              {(() => {
                const bank = getBankAccountPrintDetails(invoice.bankAccountId);
                if (!bank) return null;
                return (
                  <>
                    <Field label="Bank Name" value={bank.bankName} />
                    <Field label="Account No." value={bank.accountNumber} />
                    <Field label="IFSC" value={bank.ifsc} />
                    <Field label="Branch" value={bank.branchName} />
                  </>
                );
              })()}
            </div>
          </VoucherFormSectionCard>
        </div>

        {invoice.attachment && (
          <VoucherFormSectionCard title="Supplier Invoice Attachment" highlight>
            <DirectPurchaseAttachmentPanel attachment={invoice.attachment} />
          </VoucherFormSectionCard>
        )}

        {/* Line Items */}
        <VoucherFormSectionCard
          title={isDirect ? "Purchase Particulars" : "Supplier Invoice Items"}
          highlight
          flush={!isDirect || !invoice.directLines?.length}
        >
          <div className={cn("overflow-x-auto", isDirect && invoice.directLines?.length && "px-3.5 py-3")}>
            {isDirect && invoice.directLines?.length ? (
              <div className="space-y-3 text-xs">
                {invoice.directLines.map((dl) => (
                  <div key={dl.id} className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2">
                    <div className="sm:col-span-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Description</p>
                      <p className="font-medium text-foreground mt-0.5">{dl.description}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Posting Ledger</p>
                      <p className="mt-0.5">{dl.expenseLedgerName}</p>
                    </div>
                    {dl.hsnSac ? (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">HSN / SAC</p>
                        <p className="mt-0.5 font-mono">{dl.hsnSac}</p>
                      </div>
                    ) : null}
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Gross / Taxable</p>
                      <p className="mt-0.5 tabular-nums">
                        {formatMoney(dl.grossAmount)} / {formatMoney(dl.taxableAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {gst.interstate ? "IGST" : "CGST / SGST"}
                      </p>
                      <p className="mt-0.5 tabular-nums">
                        {invoice.gstApplicable === false
                          ? "Not applicable"
                          : gst.interstate
                            ? formatMoney(dl.igst)
                            : `${formatMoney(dl.cgst)} / ${formatMoney(dl.sgst)}`}
                      </p>
                    </div>
                  </div>
                ))}
                {invoice.reverseChargeApplicable && (
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40">
                    {gst.interstate ? (
                      <div>
                        <p className="text-[10px] text-muted-foreground">RCM IGST</p>
                        <p className="tabular-nums">{formatMoney(invoice.rcmIgst ?? 0)}</p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-[10px] text-muted-foreground">RCM CGST</p>
                          <p className="tabular-nums">{formatMoney(invoice.rcmCgst ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">RCM SGST</p>
                          <p className="tabular-nums">{formatMoney(invoice.rcmSgst ?? 0)}</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {invoice.tdsApplicable && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border/40">
                    <div>
                      <p className="text-[10px] text-muted-foreground">TDS Section</p>
                      <p>{invoice.directLines[0]?.tdsSection || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">TDS Base</p>
                      <p className="tabular-nums">{formatMoney(invoice.tdsBaseAmount ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">TDS Amount</p>
                      <p className="tabular-nums">{formatMoney(invoice.tdsDeduction ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">TDS Ledger</p>
                      <p>{invoice.tdsLedgerName || "—"}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
            <table className="w-full text-xs min-w-[1080px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {itemColumns.map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-foreground whitespace-nowrap",
                        h === "#" || h === "Product" || h === "Description" || h === "Unit"
                          ? "text-left"
                          : "text-right",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={itemColumns.length}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No line items on this invoice.
                    </td>
                  </tr>
                ) : (
                  invoice.lineItems.map((line, i) => {
                    const split = calcPurchaseLineGstSplit(line, gst.interstate);
                    return (
                      <tr key={line.id} className="border-b border-border/60 hover:bg-muted/20">
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{line.productName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{line.description || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{line.invoiceQty}</td>
                        <td className="px-3 py-2 text-muted-foreground">{line.unit}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(line.unitPrice)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(split.taxable)}</td>
                        {gst.interstate ? (
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatMoneyOrDash(split.igst)}
                          </td>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatMoneyOrDash(split.cgst)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatMoneyOrDash(split.sgst)}
                            </td>
                          </>
                        )}
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">
                          {formatMoney(split.lineTotal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            )}
          </div>
        </VoucherFormSectionCard>

        {invoice.additionalCharges.length > 0 && (
          <VoucherFormSectionCard title="Additional Charges" highlight flush>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[1100px]">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    {chargeColumns.map((h) => (
                      <th
                        key={h}
                        className={cn(
                          "px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                          h === "#" ||
                            h === "Particular / Charge Name" ||
                            h === "Ledger" ||
                            h === "HSN" ||
                            h === "GST Applicable" ||
                            h === "Remarks"
                            ? "text-left"
                            : "text-right",
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.additionalCharges.map((charge, i) => {
                    const taxable = charge.amount;
                    const gstPct =
                      charge.gstPct ??
                      (charge.cgstPct ?? 0) + (charge.sgstPct ?? 0) + (charge.igstPct ?? 0);
                    const gstApplicable =
                      charge.gstApplicable ?? gstPct > 0;
                    const cgstAmt = Math.round(taxable * ((charge.cgstPct ?? 0) / 100) * 100) / 100;
                    const sgstAmt = Math.round(taxable * ((charge.sgstPct ?? 0) / 100) * 100) / 100;
                    const igstAmt = Math.round(taxable * ((charge.igstPct ?? 0) / 100) * 100) / 100;
                    const total = taxable + cgstAmt + sgstAmt + igstAmt;
                    return (
                      <tr key={charge.uid} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{charge.chargeName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{charge.ledgerName || "—"}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{charge.hsnCode || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(taxable)}</td>
                        <td className="px-3 py-2 text-left">{gstApplicable ? "Yes" : "No"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {gstApplicable && gstPct > 0 ? `${gstPct}%` : "—"}
                        </td>
                        {gst.interstate ? (
                          <td className="px-3 py-2 text-right tabular-nums">
                            {igstAmt > 0 ? formatMoney(igstAmt) : "—"}
                          </td>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {cgstAmt > 0 ? formatMoney(cgstAmt) : "—"}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {sgstAmt > 0 ? formatMoney(sgstAmt) : "—"}
                            </td>
                          </>
                        )}
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatMoney(total)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{charge.remarks || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </VoucherFormSectionCard>
        )}

        {qtyComparisonRows.length > 0 && invoice.grnNo && (
          <VoucherFormSectionCard title="Quantity Comparison" highlight>
            <p className="text-xs text-muted-foreground mb-3">
              Comparison only — supplier invoice values are not adjusted by GRN or QC.
            </p>
            <PurchaseInvoiceQtyComparisonTable rows={qtyComparisonRows} />
          </VoucherFormSectionCard>
        )}

        {/* Financials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <VoucherFormSectionCard title="Invoice Amounts" highlight>
            <div className="space-y-2 text-xs">
              {isDirect && (
                <>
                  <AmountRow label="Gross Amount" value={formatMoney(invoice.grossAmount ?? 0)} muted />
                  <AmountRow label="Discount" value={formatMoney(invoice.discountTotal ?? 0)} muted />
                </>
              )}
              <AmountRow label="Taxable Amount" value={formatMoney(gst.taxableValue)} />
              {invoice.additionalCharges.length > 0 && (
                <AmountRow
                  label="Additional Charges"
                  value={formatMoney(invoice.additionalCharges.reduce((s, c) => s + c.amount, 0))}
                  muted
                />
              )}
              {(!isDirect || invoice.gstApplicable !== false) && (
                <>
                  {gst.interstate ? (
                    <AmountRow label="IGST" value={formatMoneyOrDash(gst.igst)} muted />
                  ) : (
                    <>
                      <AmountRow label="CGST" value={formatMoneyOrDash(gst.cgst)} muted />
                      <AmountRow label="SGST" value={formatMoneyOrDash(gst.sgst)} muted />
                    </>
                  )}
                  {isDirect && (
                    <AmountRow
                      label="Total GST"
                      value={formatMoney((invoice.cgstTotal ?? 0) + (invoice.sgstTotal ?? 0) + (invoice.igstTotal ?? 0))}
                      muted
                    />
                  )}
                </>
              )}
              {isDirect && (
                <AmountRow
                  label="TDS Deduction"
                  value={(invoice.tdsDeduction ?? 0) > 0 ? `− ${formatMoney(invoice.tdsDeduction!)}` : formatMoney(0)}
                  highlight={(invoice.tdsDeduction ?? 0) > 0}
                />
              )}
              {isDirect && (
                <AmountRow
                  label="Round Off"
                  value={formatMoney(invoice.roundingAdjustment ?? 0)}
                  muted
                />
              )}
              {!isDirect && (invoice.roundingAdjustment ?? 0) !== 0 && (
                <AmountRow label="Rounding" value={formatMoney(invoice.roundingAdjustment!)} muted />
              )}
              <div className="border-t border-border/60 pt-2">
                <AmountRow
                  label="Invoice Total"
                  value={formatMoney(invoice.grandTotal)}
                  bold
                />
                {isDirect && (
                  <AmountRow label="Net Payable" value={formatMoney(invoice.netPayable ?? gst.invoiceTotal)} bold />
                )}
              </div>
            </div>
          </VoucherFormSectionCard>

          <VoucherFormSectionCard title="Payment Status" highlight>
            <div className="space-y-2 text-xs">
              <AmountRow label="Invoice Amount" value={formatMoney(invoice.grandTotal)} />
              <AmountRow label="Amount Paid" value={formatMoney(invoice.amountPaid)} muted />
              <div className="border-t border-border/60 pt-2">
                <AmountRow
                  label="Outstanding Balance"
                  value={formatMoney(outstanding)}
                  bold
                  highlight={outstanding > 0}
                />
              </div>
            </div>
            <div className="mt-3">
              <PaymentBadge amountPaid={invoice.amountPaid} grandTotal={invoice.grandTotal} />
            </div>
          </VoucherFormSectionCard>
        </div>

        {/* Supplier Ledger Impact */}
        <VoucherFormSectionCard title="Supplier Ledger Entry" highlight flush>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[960px]">
              <thead>
                <tr className="border-b border-border/30 bg-muted/50">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Voucher</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Narration</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Debit</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Credit</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/20 hover:bg-muted/20">
                  <td className="px-3 py-2.5 text-muted-foreground">{formatDisplayDate(invoice.invoiceDate)}</td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-brand-700">{invoice.invoiceNo}</td>
                  <td className="px-3 py-2.5">
                    Purchase from {invoice.vendorName}
                    {invoice.grnNo && (
                      <span className="ml-1.5 text-blue-600 font-mono">({invoice.grnNo})</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">—</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-red-600">
                    {formatMoney(invoice.grandTotal)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-red-600">
                    {formatMoney(invoice.grandTotal)} Cr
                  </td>
                </tr>
                {invoice.amountPaid > 0 && (
                  <tr className="hover:bg-muted/20">
                    <td className="px-3 py-2.5 text-muted-foreground">{formatDisplayDate(invoice.invoiceDate)}</td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">PYMT</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      Payment received against {invoice.invoiceNo}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 font-semibold">
                      {formatMoney(invoice.amountPaid)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">—</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-red-600">
                      {formatMoney(outstanding)} Cr
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </VoucherFormSectionCard>

        {/* COA Posting Impact */}
        <LedgerImpactPreview
          title="COA Posting Impact"
          lines={impactLines}
          className="border border-border rounded-xl shadow-sm"
        />

        {/* Remarks / Narration */}
        {(invoice.narration || invoice.remarks) && (
          <VoucherFormSectionCard title={isDirect ? "Narration" : "Remarks"} highlight>
            <p className="text-xs text-muted-foreground">{invoice.narration || invoice.remarks}</p>
          </VoucherFormSectionCard>
        )}

        {/* Activity log */}
        {invoice.activity && invoice.activity.length > 0 && (
          <VoucherFormSectionCard title="Activity" highlight>
            <div className="space-y-2">
              {invoice.activity.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{a.action}</span>
                    <span className="text-muted-foreground ml-2">
                      {formatDisplayDate(a.date)} · {a.by}
                    </span>
                    {a.remarks && (
                      <span className="text-muted-foreground ml-2">— {a.remarks}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </VoucherFormSectionCard>
        )}
      </div>
    </PurchaseInvoicePageShell>
  );
}

function AmountRow({
  label,
  value,
  muted,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${muted ? "text-muted-foreground" : ""} ${bold ? "font-bold text-sm" : ""} ${highlight ? "text-red-600" : ""}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
