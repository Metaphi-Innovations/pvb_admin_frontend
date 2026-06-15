"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  RecordDetailPage,
  RecordKvRow,
  RecordMiniTable,
  RecordSectionCard,
  RecordStatusPill,
  StatusBadge,
} from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Ban,
  Calendar,
  CheckCircle,
  CheckCircle2,
  CreditCard,
  Eye,
  FileText,
  Info,
  IndianRupee,
  Landmark,
  MapPin,
  Mail,
  Phone,
  Plus,
  Pencil,
  ShieldAlert,
  ShoppingCart,
  Clock,
  TrendingUp,
  Wallet,
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
import { readCustomerPermissions } from "../customer-permissions";
import { loadOrders } from "@/app/(app)/sales/orders/orders-data";
import { formatMoney } from "@/lib/accounts/money-format";

const STATUS_VARIANT: Record<
  CustomerStatus,
  "active" | "inactive" | "draft" | "blocked"
> = {
  active: "active",
  inactive: "inactive",
  draft: "draft",
  blocked: "blocked",
};

const STATUS_LABEL: Record<CustomerStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  draft: "Draft",
  blocked: "Blocked",
};

function TypeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-brand-50 border border-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
      {label}
    </span>
  );
}

const COMPLIANCE_TONES = {
  green: { bg: "#ECFDF5", icon: "#10B981", Icon: CheckCircle2, badgeBg: "#ECFDF5", badgeTx: "#166534", badgeBd: "#86EFAC" },
  amber: { bg: "#FFFBEB", icon: "#D97706", Icon: AlertCircle, badgeBg: "#FFFBEB", badgeTx: "#92400E", badgeBd: "#FDE68A" },
  blue: { bg: "#EFF6FF", icon: "#3B82F6", Icon: Info, badgeBg: "#EFF6FF", badgeTx: "#1D4ED8", badgeBd: "#93C5FD" },
} as const;

function ComplianceRow({
  tone,
  label,
  value,
  badge,
  isLast,
}: {
  tone: keyof typeof COMPLIANCE_TONES;
  label: string;
  value: string;
  badge: string;
  isLast?: boolean;
}) {
  const t = COMPLIANCE_TONES[tone];
  const Icon = t.Icon;
  return (
    <div
      className="flex items-center gap-3 py-2"
      style={{ borderBottom: isLast ? "none" : "1px solid #F0F3FA" }}
    >
      <div
        className="flex flex-shrink-0 items-center justify-center rounded-full"
        style={{ width: "28px", height: "28px", background: t.bg }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: t.icon }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium text-[#3D5473] leading-tight">{label}</p>
        <p className="text-[11px] text-[#6B80A0] truncate">{value}</p>
      </div>
      <span
        className="inline-flex items-center rounded-md border text-[11px] font-bold flex-shrink-0"
        style={{ background: t.badgeBg, color: t.badgeTx, borderColor: t.badgeBd, padding: "2px 9px" }}
      >
        {badge}
      </span>
    </div>
  );
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [records, setRecords] = useState<Customer[]>([]);
  const [perms, setPerms] = useState(readCustomerPermissions);
  const [activeTab, setActiveTab] = useState("overview");
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockError, setBlockError] = useState("");
  const [previewDoc, setPreviewDoc] = useState<{
    title: string;
    fileUrl: string;
    fileName: string;
  } | null>(null);

  useEffect(() => {
    setPerms(readCustomerPermissions());
    const list = loadCustomers();
    setRecords(list);
    setCustomer(list.find((c) => c.id === Number(id)) ?? null);
  }, [id]);

  const orders = useMemo(() => {
    if (!customer) return [];
    return loadOrders().filter((o) => o.customerId === customer.id);
  }, [customer]);

  const orderStats = useMemo(() => {
    const totalValue = orders.reduce((s, o) => s + o.totalAmount, 0);
    const pending = orders
      .filter((o) => o.status === "pending_approval" || o.status === "draft")
      .reduce((s, o) => s + o.totalAmount, 0);
    const last = [...orders].sort((a, b) => b.orderDate.localeCompare(a.orderDate))[0];
    return {
      count: orders.length,
      totalValue,
      pending,
      lastDate: last?.orderDate ?? "—",
    };
  }, [orders]);

  const updateStatus = (customerId: number, status: CustomerStatus, reason = "") => {
    const today = todayStr();
    const updated = records.map((r) => {
      if (r.id !== customerId) return r;
      return {
        ...r,
        status,
        blockReason: status === "blocked" ? reason : "",
        updatedBy: "Admin",
        updatedDate: today,
        lastStatusChange: today,
        statusHistory: [
          ...r.statusHistory,
          {
            date: today,
            from: r.status,
            to: status,
            by: "Admin",
            reason: reason || `Status → ${status}`,
          },
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
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <ShieldAlert className="h-10 w-10 text-amber-600" />
          <h1 className="text-lg font-bold">Access restricted</h1>
          <Link href="/masters/customers" className="text-xs text-[#1554B4] hover:underline">
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
          <p className="text-sm text-[#6B80A0]">Customer not found.</p>
          <Link href="/masters/customers" className="mt-2 inline-block text-xs text-[#1554B4]">
            Back to listing
          </Link>
        </div>
      </AppLayout>
    );
  }

  const gst = getActiveGSTMasters().find((g) => g.id === customer.gstMasterId);
  const tds = getActiveTDSMasters().find((t) => t.id === customer.tdsMasterId);
  const payLabel =
    PAYMENT_TERMS_OPTIONS.find((p) => p.value === customer.paymentTerms)?.label ??
    customer.paymentTerms;
  const typeLabel =
    CUSTOMER_TYPE_LABELS[customer.customerType.toLowerCase()] ?? customer.customerType;
  const canToggle =
    perms.canEdit && customer.status !== "blocked" && customer.status !== "draft";

  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "tax", label: "Tax & Compliance" },
    { value: "bank", label: "Bank Details" },
    { value: "commercial", label: "Commercial" },
    { value: "orders", label: "Orders", count: orders.length },
    { value: "activity", label: "Activity" },
  ];

  const pendingZero = orderStats.pending <= 0;
  const kpis = [
    {
      icon: ShoppingCart,
      iconBg: "#EEF3FB",
      iconColor: "#0C3F8A",
      value: String(orderStats.count),
      label: "Total Orders",
    },
    {
      icon: TrendingUp,
      iconBg: "#E6F7EF",
      iconColor: "#1E9E61",
      value: formatMoney(orderStats.totalValue),
      label: "Total Value",
    },
    {
      icon: CreditCard,
      iconBg: "#FFFBEB",
      iconColor: "#D97706",
      value: formatCreditLimit(customer.creditLimit),
      label: "Credit Limit",
    },
    {
      icon: Calendar,
      iconBg: "#F5F3FF",
      iconColor: "#7C3AED",
      value: orderStats.lastDate,
      label: "Last Order",
    },
    {
      icon: pendingZero ? CheckCircle : AlertCircle,
      iconBg: pendingZero ? "#ECFDF5" : "#FEF2F2",
      iconColor: pendingZero ? "#10B981" : "#DC2626",
      value: formatMoney(orderStats.pending),
      label: "Pending Amount",
    },
  ];

  // Credit utilization (used ≈ pending/outstanding amount)
  const creditLimit = customer.creditLimit;
  const creditUsed = orderStats.pending;
  const creditAvailable = Math.max(creditLimit - creditUsed, 0);
  const creditPct = creditLimit > 0 ? Math.min(Math.round((creditUsed / creditLimit) * 100), 100) : 0;
  const shortINR = (n: number) => {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
    if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
    return `₹${n}`;
  };

  const orderColumns = [
    {
      key: "so",
      header: "Order #",
      render: (r: (typeof orders)[number]) => (
        <span className="font-mono font-bold text-[#1554B4]">{r.soNumber}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (r: (typeof orders)[number]) => (
        <span className="text-[13px] text-[#3D5473]">{r.orderDate}</span>
      ),
    },
    {
      key: "items",
      header: "Items",
      align: "center" as const,
      render: (r: (typeof orders)[number]) => (
        <span className="text-[13px] font-semibold">{r.items ?? "—"}</span>
      ),
    },
    {
      key: "amt",
      header: "Amount",
      align: "right" as const,
      render: (r: (typeof orders)[number]) => (
        <span className="text-[13px] font-bold tabular-nums">{formatMoney(r.totalAmount)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r: (typeof orders)[number]) => <StatusBadge status={r.status} />,
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RecordSectionCard title="Basic Details" icon={FileText} accent="blue">
              <RecordKvRow label="Customer Name" value={customer.customerName} highlight />
              <RecordKvRow
                label="Customer Code"
                value={customer.customerCode}
                mono
                copy
              />
              <RecordKvRow
                label="Mobile"
                value={formatMobile(customer.countryCode, customer.mobile)}
                mono
                link
                href={`tel:${customer.mobile}`}
              />
              <RecordKvRow
                label="Email"
                value={customer.email || "—"}
                link={!!customer.email}
                href={customer.email ? `mailto:${customer.email}` : undefined}
              />
              <RecordKvRow label="Customer Type" value={typeLabel} />
              <RecordKvRow
                label="Status"
                value={
                  <RecordStatusPill
                    label={STATUS_LABEL[customer.status]}
                    variant={STATUS_VARIANT[customer.status]}
                  />
                }
                isLast
              />
            </RecordSectionCard>

            <RecordSectionCard title="Territory & Location" icon={MapPin} accent="purple">
              <RecordKvRow label="Territory" value={customer.territoryName} highlight />
              <RecordKvRow label="State" value={customer.stateName} />
              <RecordKvRow label="District" value={customer.districtName} />
              <RecordKvRow label="Pin Code" value={customer.pincode} mono />
              <RecordKvRow label="Address" value={customer.address} isLast />
            </RecordSectionCard>

            <div className="lg:col-span-2">
              <RecordSectionCard title="Recent Orders" icon={ShoppingCart} accent="green">
                <RecordMiniTable
                  columns={orderColumns}
                  rows={[...orders]
                    .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
                    .slice(0, 5)}
                  onRowClick={(r) => router.push(`/sales/orders/${r.id}`)}
                  viewAllHref={`/sales/orders?customer=${customer.id}`}
                  viewAllLabel={`View all ${orders.length} orders`}
                />
              </RecordSectionCard>
            </div>
          </div>
        );

      case "tax":
        return (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RecordSectionCard title="Tax & Registration" icon={FileText} accent="blue">
              <RecordKvRow label="GST Applicable" value={customer.gstApplicable ? "Yes" : "No"} />
              {customer.gstApplicable && (
                <>
                  <RecordKvRow label="GSTIN" value={customer.gstin} mono copy />
                  <RecordKvRow
                    label="GST Code"
                    value={gst ? `${gst.gstId} (${gst.gstPercentage}%)` : "—"}
                    mono
                  />
                </>
              )}
              <RecordKvRow label="TDS Applicable" value={customer.tdsApplicable ? "Yes" : "No"} />
              {customer.tdsApplicable && (
                <RecordKvRow
                  label="TDS Section"
                  value={tds ? `${tds.tdsCode} — ${tds.tdsRate}%` : "—"}
                  mono
                />
              )}
              <RecordKvRow label="TAN #" value={customer.tan} mono />
              <RecordKvRow label="CIB Regn #" value={customer.cibRegn} />
              <RecordKvRow label="FCO Regn #" value={customer.fcoRegn} />
              <RecordKvRow label="FSSAI #" value={customer.fssai} isLast />
            </RecordSectionCard>

            <RecordSectionCard title="Compliance Status" icon={CheckCircle} accent="green">
              <ComplianceRow
                tone="green"
                label="GSTIN Registered"
                value={customer.gstin || "—"}
                badge="Verified"
              />
              <ComplianceRow
                tone="green"
                label="TDS Active"
                value={customer.tdsApplicable ? "Enabled" : "Not enabled"}
                badge="Active"
              />
              <ComplianceRow
                tone="blue"
                label="TAN #"
                value={customer.tan || "—"}
                badge="On File"
              />
              <ComplianceRow
                tone="green"
                label="FSSAI Licensed"
                value={customer.fssai || "—"}
                badge="Valid"
              />
              <ComplianceRow
                tone="amber"
                label="CIB Registration"
                value={customer.cibRegn || "—"}
                badge="Review"
                isLast
              />
            </RecordSectionCard>
          </div>
        );

      case "bank":
        return (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RecordSectionCard title="Bank Details" icon={Wallet} accent="green">
              {(!customer.accountHolderName || customer.accountHolderName === "-") && (
                <div
                  className="flex items-center gap-2 mb-3"
                  style={{
                    background: "#FFFBEB",
                    borderLeft: "3px solid #D97706",
                    padding: "8px 12px",
                    borderRadius: "0 6px 6px 0",
                  }}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-[#D97706] flex-shrink-0" />
                  <span className="text-[12px] text-[#92400E]">Account holder name not added</span>
                </div>
              )}
              <RecordKvRow label="Account Holder" value={customer.accountHolderName} highlight />
              <RecordKvRow label="Bank Name" value={customer.bankName} />
              <RecordKvRow label="Branch" value={customer.branch || customer.bankBranchAddress} />
              <RecordKvRow label="Account #" value={customer.bankAccountNo} mono copy />
              <RecordKvRow label="IFSC" value={customer.ifscCode} mono copy />
              <RecordKvRow label="SWIFT" value={customer.swiftCode} mono isLast />
            </RecordSectionCard>

            <RecordSectionCard title="Additional Accounts" icon={Landmark} accent="blue">
              <div className="flex flex-col items-center text-center py-6 px-4">
                <div
                  className="flex items-center justify-center mb-3"
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "#F0F2F8",
                    border: "1.5px dashed #C4CEDF",
                  }}
                >
                  <Landmark className="w-5 h-5 text-[#9AAAC5]" />
                </div>
                <p className="text-[13px] font-semibold text-[#3D5473]">No additional accounts</p>
                <p className="text-[12px] text-[#6B80A0] mt-0.5">
                  Add accounts for different payment types
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#6B80A0] transition-colors hover:text-[#1554B4] hover:bg-[#EEF3FB]"
                  style={{
                    border: "1.5px dashed #C4CEDF",
                    borderRadius: "8px",
                    padding: "7px 14px",
                  }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Bank Account
                </button>
              </div>
            </RecordSectionCard>
          </div>
        );

      case "commercial":
        return (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RecordSectionCard title="Commercial Details" icon={IndianRupee} accent="orange">
              <RecordKvRow label="Credit Limit" value={formatCreditLimit(customer.creditLimit)} amount highlight />
              <RecordKvRow
                label="Interest Rate"
                value={customer.interestRate ? `${customer.interestRate}%` : "—"}
              />
              <RecordKvRow label="Payment Terms" value={payLabel} />
              <RecordKvRow label="Sales Man" value={customer.salesManName} isLast />
            </RecordSectionCard>

            <RecordSectionCard title="Credit Usage" icon={CreditCard} accent="green">
              <div className="pt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-[28px] font-extrabold text-[#0A1628] leading-none">
                    {shortINR(creditUsed)}
                  </span>
                  <span className="text-[13px] text-[#6B80A0]">
                    used of {shortINR(creditLimit)} limit
                  </span>
                </div>

                <div className="relative" style={{ margin: "14px 0" }}>
                  <div style={{ height: "10px", background: "#E4EAF4", borderRadius: "5px" }}>
                    <div
                      style={{
                        width: `${creditPct}%`,
                        height: "10px",
                        background: "#1E9E61",
                        borderRadius: "5px",
                        transition: "width .4s ease",
                      }}
                    />
                  </div>
                  <span
                    className="absolute -top-4 text-[11px] text-[#1E9E61] font-medium"
                    style={{ left: `calc(${creditPct}% - 16px)` }}
                  >
                    {creditPct}%
                  </span>
                </div>

                <div className="grid grid-cols-3 mt-3">
                  <div className="pr-3">
                    <p className="text-[11px] text-[#6B80A0]">Credit Limit</p>
                    <p className="text-[13px] font-bold text-[#0A1628]">{shortINR(creditLimit)}</p>
                  </div>
                  <div className="px-3 border-l border-[#F0F3FA]">
                    <p className="text-[11px] text-[#6B80A0]">Used</p>
                    <p
                      className="text-[13px] font-bold"
                      style={{ color: creditPct > 80 ? "#DC2626" : "#0A1628" }}
                    >
                      {shortINR(creditUsed)}
                    </p>
                  </div>
                  <div className="px-3 border-l border-[#F0F3FA]">
                    <p className="text-[11px] text-[#6B80A0]">Available</p>
                    <p className="text-[13px] font-bold text-[#1E9E61]">{shortINR(creditAvailable)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#F0F3FA]">
                  <span
                    className="inline-flex items-center rounded-md text-[11px] font-semibold"
                    style={{ background: "#EEF3FB", color: "#0C3F8A", padding: "3px 9px" }}
                  >
                    {payLabel}
                  </span>
                  {customer.interestRate ? (
                    <span
                      className="inline-flex items-center rounded-md text-[11px] font-semibold"
                      style={{ background: "#FFFBEB", color: "#92400E", padding: "3px 9px" }}
                    >
                      {customer.interestRate}% p.a.
                    </span>
                  ) : null}
                </div>
              </div>
            </RecordSectionCard>
          </div>
        );

      case "orders":
        return (
          <RecordSectionCard title="Order History" icon={ShoppingCart} accent="blue">
            <RecordMiniTable
              columns={orderColumns}
              rows={[...orders].sort((a, b) => b.orderDate.localeCompare(a.orderDate))}
              onRowClick={(r) => router.push(`/sales/orders/${r.id}`)}
            />
          </RecordSectionCard>
        );

      case "activity":
        return (
          <RecordSectionCard title="Status History" icon={Clock} accent="slate">
            {customer.statusHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">No activity recorded.</p>
            ) : (
              [...customer.statusHistory]
                .reverse()
                .map((h, i, arr) => (
                  <RecordKvRow
                    key={`${h.date}-${i}`}
                    label={h.date}
                    value={`${h.from} → ${h.to} (${h.by})${h.reason ? ` — ${h.reason}` : ""}`}
                    isLast={i === arr.length - 1}
                  />
                ))
            )}
          </RecordSectionCard>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <RecordDetailPage
      alert={
        customer.status === "blocked" && customer.blockReason ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <Ban className="mt-0.5 h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700">{customer.blockReason}</p>
          </div>
        ) : undefined
      }
      listHref="/masters/customers"
      listLabel="Customers"
      recordName={customer.customerName}
      recordCode={customer.customerCode}
        typeBadge={<TypeBadge label={typeLabel} />}
        statusLabel={STATUS_LABEL[customer.status]}
        statusVariant={STATUS_VARIANT[customer.status]}
        metaItems={[
          {
            label: formatMobile(customer.countryCode, customer.mobile),
            icon: Phone,
            href: `tel:${customer.mobile}`,
          },
          ...(customer.email
            ? [{ label: customer.email, icon: Mail, href: `mailto:${customer.email}` }]
            : []),
          {
            label: [customer.territoryName, customer.stateName].filter(Boolean).join(" · ") || "—",
            icon: MapPin,
          },
        ]}
        kpis={kpis}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        active={customer.status === "active"}
        onActiveChange={
          canToggle
            ? (on) => updateStatus(customer.id, on ? "active" : "inactive")
            : undefined
        }
        toggleDisabled={!canToggle}
        onEdit={perms.canEdit ? () => router.push(`/masters/customers/${customer.id}/edit`) : undefined}
        secondaryAction={{
          label: "New Order",
          onClick: () => router.push(`/sales/orders/new?customerId=${customer.id}`),
        }}
        moreActions={
          perms.canEdit
            ? [
                ...(customer.status !== "blocked"
                  ? [
                      {
                        label: "Block Customer",
                        onClick: () => {
                          setBlockReason(customer.blockReason || "");
                          setBlockError("");
                          setBlockOpen(true);
                        },
                        destructive: true,
                      },
                    ]
                  : [
                      {
                        label: "Unblock Customer",
                        onClick: () => updateStatus(customer.id, "active"),
                      },
                    ]),
                ...(customer.status === "draft"
                  ? [
                      {
                        label: "Mark Active",
                        onClick: () => updateStatus(customer.id, "active"),
                      },
                    ]
                  : []),
              ]
            : undefined
        }
        sidebar={{
          quickActions: [
            {
              label: "New Order",
              icon: ShoppingCart,
              onClick: () => router.push(`/sales/orders/new?customerId=${customer.id}`),
              variant: "primary",
            },
            ...(perms.canEdit
              ? [
                  {
                    label: "Edit Customer",
                    icon: Pencil,
                    onClick: () => router.push(`/masters/customers/${customer.id}/edit`),
                    variant: "outline" as const,
                  },
                ]
              : []),
            {
              label: "View Orders",
              icon: Eye,
              onClick: () => router.push(`/sales/orders?customer=${customer.id}`),
              variant: "outline" as const,
            },
          ],
          summary: [
            { label: "Credit Limit", value: formatCreditLimit(customer.creditLimit), highlight: true },
            { label: "Payment Terms", value: payLabel },
            { label: "Sales Man", value: customer.salesManName || "—" },
            { label: "Territory", value: customer.territoryName || "—" },
            { label: "Created", value: customer.createdDate },
            { label: "Updated", value: customer.updatedDate },
          ],
          activity: [...customer.statusHistory]
            .slice(-5)
            .reverse()
            .map((h, i) => ({
              id: `${h.date}-${i}`,
              title: `${h.from} → ${h.to}`,
              subtitle: h.reason || `By ${h.by}`,
              date: h.date,
            })),
        }}
      >
        {renderTabContent()}
      </RecordDetailPage>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Block customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs">Reason</Label>
            <Textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="text-xs min-h-[80px]"
            />
            {blockError && <p className="text-xs text-red-600">{blockError}</p>}
            <Button
              size="sm"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (!blockReason.trim()) {
                  setBlockError("Block reason is required");
                  return;
                }
                updateStatus(customer.id, "blocked", blockReason.trim());
                setBlockOpen(false);
              }}
            >
              Confirm Block
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">{previewDoc?.title}</DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <div className="flex justify-center p-4">
              {/\.(jpe?g|png|webp|gif)$/i.test(previewDoc.fileName) ? (
                <img src={previewDoc.fileUrl} alt={previewDoc.title} className="max-h-[50vh] object-contain" />
              ) : (
                <a href={previewDoc.fileUrl} target="_blank" rel="noreferrer" className="text-[#1554B4] text-sm">
                  Open {previewDoc.fileName}
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
