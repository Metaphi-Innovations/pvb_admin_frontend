"use client";

import {
  RegisterReportPageClient,
  type RegisterReportPageConfig,
} from "../register-shared/RegisterReportPageClient";
import { buildPurchaseRegisterDemoRows } from "./purchase-register-data";

const config: RegisterReportPageConfig = {
  mode: "purchase",
  title: "Purchase Register",
  description: "Read-only register of purchase invoices with taxable value, GST, and payment status.",
  breadcrumbSection: "Purchases",
  partyLabel: "Supplier",
  buildRows: buildPurchaseRegisterDemoRows,
  viewHref: (row) => `/accounts/purchase-invoices/${row.id}`,
  exportFilePrefix: "Purchase_Register",
};

export default function PurchaseRegisterPageClient() {
  return <RegisterReportPageClient config={config} />;
}
