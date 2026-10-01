"use client";

import {
  customerMasterToTransactionFields,
  vendorMasterToTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import type { Vendor } from "@/app/(app)/masters/vendors/vendor-data";
import type { Employee } from "@/app/(app)/user-management/employee/employee-data";
import { MasterFetchedBadge } from "./MasterFetchedBadge";

export function VoucherContactMasterHint({
  contactType,
  contactId,
  customers,
  vendors,
  employees,
}: {
  contactType: "customer" | "vendor" | "employee" | null;
  contactId: number | null | undefined;
  customers: Customer[];
  vendors: Vendor[];
  employees: Employee[];
}) {
  if (!contactType || !contactId) return null;

  if (contactType === "customer") {
    const c = customers.find((x) => x.id === contactId);
    if (!c) return null;
    const f = customerMasterToTransactionFields(c);
    return (
      <div className="mt-1 rounded border border-emerald-100 bg-emerald-50/60 px-2 py-1 text-xs text-emerald-900">
        <div className="flex items-center gap-1 mb-0.5">
          <MasterFetchedBadge />
          <span className="font-medium">Customer Master</span>
        </div>
        <span className="font-mono">{f.customerGst || "No GSTIN"}</span>
        <span className="mx-1">·</span>
        <span>{f.customerMobile}</span>
        <span className="mx-1">·</span>
        <span>Ledger: {f.receivableLedger}</span>
      </div>
    );
  }

  if (contactType === "vendor") {
    const v = vendors.find((x) => x.id === contactId);
    if (!v) return null;
    const f = vendorMasterToTransactionFields(v);
    return (
      <div className="mt-1 rounded border border-emerald-100 bg-emerald-50/60 px-2 py-1 text-xs text-emerald-900">
        <div className="flex items-center gap-1 mb-0.5">
          <MasterFetchedBadge />
          <span className="font-medium">Supplier Master</span>
        </div>
        <span className="font-mono">{f.vendorGst || "No GSTIN"}</span>
        <span className="mx-1">·</span>
        <span>{f.vendorMobile}</span>
        <span className="mx-1">·</span>
        <span>Ledger: {f.payableLedger}</span>
      </div>
    );
  }

  const emp = employees.find((x) => x.id === contactId);
  if (!emp) return null;
  return (
    <div className="mt-1 rounded border border-emerald-100 bg-emerald-50/60 px-2 py-1 text-xs text-emerald-900">
      <div className="flex items-center gap-1 mb-0.5">
        <MasterFetchedBadge />
        <span className="font-medium">Employee Master</span>
      </div>
      <span>{emp.email}</span>
      <span className="mx-1">·</span>
      <span>{emp.designation || "Staff"}</span>
    </div>
  );
}
