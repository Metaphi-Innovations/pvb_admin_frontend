"use client";

import {
  RegisterReportPageClient,
  type RegisterReportPageConfig,
} from "../register-shared/RegisterReportPageClient";
import {
  buildSalesRegisterDemoRows,
  SALES_REGISTER_PARTY_OPTIONS,
} from "./sales-register-data";

const config: RegisterReportPageConfig = {
  mode: "sales",
  title: "Sales Register",
  description: "Read-only register of sales invoices with taxable value, GST, and payment status.",
  breadcrumbSection: "Sales",
  partyLabel: "Customer",
  partyOptions: SALES_REGISTER_PARTY_OPTIONS,
  buildRows: buildSalesRegisterDemoRows,
  viewHref: (row) => `/accounts/transactions/invoices/${row.id}`,
  exportFilePrefix: "Sales_Register",
};

export default function SalesRegisterPageClient() {
  return <RegisterReportPageClient config={config} />;
}
