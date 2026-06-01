"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Edit2,
  User,
  Receipt,
  MapPin,
  Users,
  CreditCard,
  Building2,
  Clock,
  Ban,
  CheckCircle2,
} from "lucide-react";
import {
  type Customer,
  type CustomerStatus,
  loadCustomers,
  saveCustomers,
  todayStr,
  CUSTOMER_TYPE_LABELS,
  PAYMENT_TERMS_OPTIONS,
  formatMobile,
  formatCreditLimit,
  getActiveGSTMasters,
  getActiveTDSMasters,
} from "../customer-data";
import { CustomerStatusControl } from "../components/CustomerStatusControl";
import { readCustomerPermissions } from "../customer-permissions";
import { ShieldAlert } from "lucide-react";

const STATUS_CFG: Record<CustomerStatus, { bg: string; text: string; dot: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  inactive: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "Inactive" },
  draft: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Draft" },
  blocked: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400", label: "Blocked" },
};

function InfoRow({ label, value, mono }: { label: string; value?: string | number; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border/50 last:border-0 gap-4">
      <span className="text-[11px] text-muted-foreground flex-shrink-0 w-40">{label}</span>
      <span className={cn("text-xs font-medium text-foreground text-right", mono && "font-mono")}>
        {value !== undefined && value !== "" ? value : "—"}
      </span>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3 h-3 text-brand-600" />
        </div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [records, setRecords] = useState<Customer[]>([]);
  const [perms, setPerms] = useState(readCustomerPermissions);

  useEffect(() => {
    setPerms(readCustomerPermissions());
    const list = loadCustomers();
    setRecords(list);
    setCustomer(list.find((c) => c.id === Number(id)) ?? null);
  }, [id]);

  const updateStatus = (customerId: number, status: CustomerStatus, blockReason = "") => {
    const today = todayStr();
    const updated = records.map((r) => {
      if (r.id !== customerId) return r;
      return {
        ...r,
        status,
        blockReason: status === "blocked" ? blockReason : "",
        updatedBy: "Admin",
        updatedDate: today,
        lastStatusChange: today,
        statusHistory: [
          ...r.statusHistory,
          { date: today, from: r.status, to: status, by: "Admin", reason: blockReason || `Status → ${status}` },
        ],
      };
    });
    setRecords(updated);
    saveCustomers(updated);
    setCustomer(updated.find((c) => c.id === customerId) ?? null);
  };

  if (!perms.canView) {
    return (
      <AppLayout>
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Access restricted</h1>
          <p className="text-sm text-muted-foreground max-w-md">You do not have permission to view this customer.</p>
          <Link href="/masters/customers" className="text-xs text-brand-600 hover:underline mt-2">
            Back to listing
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Customer not found.</p>
          <Link href="/masters/customers" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
            Back to listing
          </Link>
        </div>
      </AppLayout>
    );
  }

  const gst = getActiveGSTMasters().find((g) => g.id === customer.gstMasterId);
  const tds = getActiveTDSMasters().find((t) => t.id === customer.tdsMasterId);
  const payLabel = PAYMENT_TERMS_OPTIONS.find((p) => p.value === customer.paymentTerms)?.label ?? customer.paymentTerms;
  const st = STATUS_CFG[customer.status];

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push("/masters/customers")}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors flex-shrink-0 mt-0.5"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground truncate">{customer.customerName}</h1>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
                    st.bg,
                    st.text,
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
                  {st.label}
                </span>
              </div>
              <p className="font-mono text-xs text-brand-700 mt-0.5">{customer.customerCode}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {CUSTOMER_TYPE_LABELS[customer.customerType]} · {formatMobile(customer.countryCode, customer.mobile)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <CustomerStatusControl
              customer={customer}
              onStatusChange={updateStatus}
              canEdit={perms.canEdit}
            />
            {perms.canEdit && (
              <Link href={`/masters/customers/${customer.id}/edit`}>
                <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </Button>
              </Link>
            )}
          </div>
        </div>

        {customer.status === "blocked" && customer.blockReason && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <Ban className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-700">Blocked — not allowed in transactions</p>
              <p className="text-xs text-red-600 mt-0.5">{customer.blockReason}</p>
            </div>
          </div>
        )}

        {customer.status === "inactive" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Inactive customer — hidden from new transaction customer dropdowns.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard icon={User} title="Basic Details">
            <InfoRow label="Customer Name" value={customer.customerName} />
            <InfoRow label="Mobile" value={formatMobile(customer.countryCode, customer.mobile)} mono />
            <InfoRow label="Email" value={customer.email} />
            <InfoRow label="Customer Type" value={CUSTOMER_TYPE_LABELS[customer.customerType]} />
            <InfoRow label="Status" value={st.label} />
          </SectionCard>

          <SectionCard icon={Receipt} title="Tax & Registration">
            <InfoRow label="GST Applicable" value={customer.gstApplicable ? "Yes" : "No"} />
            {customer.gstApplicable && (
              <>
                <InfoRow label="GSTIN" value={customer.gstin} mono />
                <InfoRow
                  label="GST Code"
                  value={gst ? `${gst.gstCode} (${gst.gstPercentage}%)` : "—"}
                  mono
                />
              </>
            )}
            <InfoRow label="TDS Applicable" value={customer.tdsApplicable ? "Yes" : "No"} />
            {customer.tdsApplicable && (
              <InfoRow
                label="TDS Section"
                value={tds ? `${tds.tdsCode} — ${tds.tdsRate}%` : "—"}
                mono
              />
            )}
            <InfoRow label="TAN #" value={customer.tan} mono />
            <InfoRow label="CIB Regn #" value={customer.cibRegn} />
            <InfoRow label="FCO Regn #" value={customer.fcoRegn} />
            <InfoRow label="FSSAI #" value={customer.fssai} />
          </SectionCard>

          <SectionCard icon={MapPin} title="Address & Geography">
            <InfoRow label="Address" value={customer.address} />
            <InfoRow label="State" value={customer.stateName} />
            <InfoRow label="District" value={customer.districtName} />
            <InfoRow label="Territory" value={customer.territoryName} />
            <InfoRow label="Pin Code" value={customer.pincode} mono />
          </SectionCard>

          <SectionCard icon={Users} title="Sales Mapping">
            <InfoRow label="Sales Man" value={customer.salesManName} />
          </SectionCard>

          <SectionCard icon={CreditCard} title="Credit & Commercial">
            <InfoRow label="Credit Limit" value={formatCreditLimit(customer.creditLimit)} />
            <InfoRow label="Interest Rate" value={customer.interestRate ? `${customer.interestRate}%` : "—"} />
            <InfoRow label="Payment Terms" value={payLabel} />
          </SectionCard>

          <SectionCard icon={Building2} title="Bank Details">
            <InfoRow label="Bank Name" value={customer.bankName} />
            <InfoRow label="Bank A/c #" value={customer.bankAccountNo} mono />
            <InfoRow label="IFSC Code" value={customer.ifscCode} mono />
            <InfoRow label="Branch Address" value={customer.bankBranchAddress} />
          </SectionCard>
        </div>

        <SectionCard icon={Clock} title="Status History & Audit">
          <div className="py-2 space-y-2">
            {customer.statusHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No status changes recorded.</p>
            ) : (
              [...customer.statusHistory].reverse().map((h, i) => (
                <div key={i} className="flex gap-3 text-xs border-b border-border/40 pb-2 last:border-0">
                  <span className="text-muted-foreground w-24 flex-shrink-0">{h.date}</span>
                  <span className="text-foreground flex-1">
                    <span className="capitalize">{h.from}</span> → <span className="capitalize font-medium">{h.to}</span>
                    {h.reason && <span className="text-muted-foreground"> — {h.reason}</span>}
                  </span>
                  <span className="text-muted-foreground">{h.by}</span>
                </div>
              ))
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 pt-2 border-t border-border mt-2">
            <InfoRow label="Created By" value={customer.createdBy} />
            <InfoRow label="Created Date" value={customer.createdDate} />
            <InfoRow label="Updated By" value={customer.updatedBy} />
            <InfoRow label="Updated Date" value={customer.updatedDate} />
          </div>
        </SectionCard>
      </div>
    </AppLayout>
  );
}
