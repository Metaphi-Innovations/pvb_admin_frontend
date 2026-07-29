"use client";

import {
  RegisterReportPageClient,
  type RegisterReportPageConfig,
} from "../register-shared/RegisterReportPageClient";
import { buildSalesRegisterDemoRows } from "./sales-register-data";

const config: RegisterReportPageConfig = {
  mode: "sales",
  title: "Sales Register",
  description:
    "Posted Sales Tax Invoices with taxable value, CGST/SGST/IGST breakup, and invoice totals. Drafts and other sales documents are excluded.",
  breadcrumbSection: "Sales",
  partyLabel: "Customer",
  buildRows: buildSalesRegisterDemoRows,
  viewHref: (row) => `/accounts/transactions/invoices/${row.id}`,
  exportFilePrefix: "Sales_Register",
};

export default function SalesRegisterPageClient() {
  return <RegisterReportPageClient config={config} />;
}
