"use client";

import { TransactionListPage } from "@/app/(app)/accounts/components/TransactionListPage";
import {
  loadInvoices,
  markInvoiceSent,
  saveInvoices,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { resolveWorkflowStatus } from "@/lib/accounts/accounts-maker-checker";
import { salesInvoiceImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import { formatMoney } from "@/lib/accounts/money-format";
import { resolveInvoiceDocumentType } from "@/lib/accounts/invoice-type";
import {
  formatInvoiceGstBreakup,
  getInvoiceGstBreakup,
} from "@/lib/accounts/invoice-gst-breakup";

export default function SalesInvoicesPageClient() {
  return (
    <TransactionListPage
      config={{
        section: "Transactions",
        title: "Sales Invoices",
        description: "Create and post sales tax invoices with ledger impact.",
        showInvoiceTypeColumn: true,
        invoiceListingMode: true,
        dataRefreshScope: "sales-invoices",
        loadData: loadInvoices,
        newHref: "/accounts/transactions/invoices/new",
        editHref: (id) => `/accounts/transactions/invoices/${id}/edit`,
        onPost: (id) => markInvoiceSent(Number(id)),
        onDelete: (id) => {
          const next = loadInvoices().filter((inv) => inv.id !== Number(id));
          saveInvoices(next);
        },
        canPost: (r) => r.status === "draft",
        canEdit: (r) => r.status === "draft" || r.status === "sent_back",
        canDelete: (r) => r.status === "draft",
        getRow: (inv) => {
          const gst = getInvoiceGstBreakup(inv);
          const formatted = formatInvoiceGstBreakup(gst);
          const invoiceType = resolveInvoiceDocumentType(inv);
          return {
            id: inv.id,
            number: inv.invoiceNo,
            date: inv.invoiceDate,
            party: inv.customerName,
            sourceNo: inv.salesOrderNo ?? inv.referenceNo ?? "—",
            dispatchNo: inv.dispatchNo ?? "—",
            invoiceType,
            amount: formatted.invoiceTotal,
            taxableValue: formatted.taxableValue,
            cgst: formatted.cgst,
            sgst: formatted.sgst,
            igst: formatted.igst,
            invoiceTotal: formatted.invoiceTotal,
            status: resolveWorkflowStatus(inv.workflow, inv.invoiceStatus),
            branch: inv.branch,
            warehouse: inv.warehouse,
            viewHref: `/accounts/transactions/invoices/${inv.id}`,
            viewFields: [
              { label: "Taxable Value", value: formatted.taxableValue },
              { label: "CGST", value: formatted.cgst },
              { label: "SGST", value: formatted.sgst },
              { label: "IGST", value: formatted.igst },
              { label: "Invoice Value", value: formatted.invoiceTotal },
              { label: "Due Date", value: inv.dueDate },
              { label: "Payment Status", value: inv.paymentStatus },
              { label: "Reference", value: inv.referenceNo || "—" },
            ],
            impactLines: salesInvoiceImpactResolved({
              customerName: inv.customerName,
              taxable: gst.taxableValue,
              taxAmount: gst.cgst + gst.sgst + gst.igst,
              grandTotal: gst.invoiceTotal,
            }),
          };
        },
      }}
    />
  );
}
