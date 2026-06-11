"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users, Plus, ShieldAlert,
  ChevronDown, Eye, Edit2,
  CheckCircle2, XCircle, Ban,
  UserCheck, UserX, CircleDashed, Ban as BanIcon,
} from "lucide-react";
import {
  type Customer,
  type CustomerStatus,
  loadCustomers,
  saveCustomers,
  todayStr,
  CUSTOMER_TYPE_LABELS,
  formatMobile,
  formatCreditLimit,
} from "./customer-data";
import { readCustomerPermissions } from "./customer-permissions";

import { MasterListing } from "@/components/listing/MasterListing";
import { applyFilters } from "@/components/listing/filter-utils";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";

function AuditCell({
  name,
  date,
}: {
  name?: string;
  date?: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold leading-4 text-brand-700">{name || "—"}</p>
      <p className="text-[10px] font-mono leading-3 text-muted-foreground">{date || "—"}</p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border rounded-xl border-border">
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          accent ? "bg-brand-600" : color ?? "bg-muted",
        )}
      >
        <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-base font-bold leading-none text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CustomerStatus }) {
  const cfg = {
    active: { className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    inactive: { className: "border-slate-200 bg-slate-100 text-slate-700" },
    draft: { className: "border-amber-200 bg-amber-50 text-amber-700" },
    blocked: { className: "border-red-200 bg-red-50 text-red-700" },
  }[status];

  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", cfg.className)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const [records, setRecords] = useState<Customer[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "customerName", direction: "asc" });
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [perms, setPerms] = useState(readCustomerPermissions);

  useEffect(() => {
    setRecords(loadCustomers());
    setPerms(readCustomerPermissions());
  }, []);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

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
          {
            date: today,
            from: r.status,
            to: status,
            by: "Admin",
            reason: status === "blocked" ? blockReason : `Status changed to ${status}`,
          },
        ],
      };
    });
    setRecords(updated);
    saveCustomers(updated);
    showToast("Status updated.");
  };

  const markDraft = (customerId: number) => updateStatus(customerId, "draft");

  const columns: ColumnConfig<Customer>[] = [
    {
      key: "customerCode",
      header: "Customer Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => <span className="font-mono text-xs text-brand-700">{row.customerCode}</span>,
    },
    {
      key: "customerName",
      header: "Customer Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "190px",
      render: (val, row) => (
        <div>
          {perms.canView ? (
            <Link href={`/masters/customers/${row.id}`} className="block group/name">
              <p className="text-xs font-semibold leading-4 text-foreground group-hover/name:text-brand-700">{row.customerName}</p>
            </Link>
          ) : (
            <div>
              <p className="text-xs font-semibold leading-4 text-foreground">{row.customerName}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "mobile",
      header: "Mobile Number",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "150px",
      render: (val, row) => (
        <span className="font-mono">{formatMobile(row.countryCode, row.mobile)}</span>
      ),
    },
    {
      key: "email",
      header: "Email Address",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "190px",
      render: (val, row) => row.email || "—",
    },
    {
      key: "gstin",
      header: "GSTIN",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "150px",
      render: (val, row) => <span className="font-mono">{row.gstin || "—"}</span>,
    },
    {
      key: "customerType",
      header: "Customer Type",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: Object.entries(CUSTOMER_TYPE_LABELS).map(([k, v]) => ({ label: v, value: k })),
      width: "130px",
      render: (val, row) => CUSTOMER_TYPE_LABELS[row.customerType] ?? row.customerType,
    },
    {
      key: "address",
      header: "Address",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "240px",
      render: (val, row) => row.address || "—",
    },
    {
      key: "stateName",
      header: "State",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => row.stateName || "—",
    },
    {
      key: "districtName",
      header: "District",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => row.districtName || "—",
    },
    {
      key: "territoryName",
      header: "Territory",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => row.territoryName || "—",
    },
    {
      key: "creditLimit",
      header: "Credit Limit",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "110px",
      render: (val, row) => formatCreditLimit(row.creditLimit),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Draft", value: "draft" },
        { label: "Blocked", value: "blocked" },
      ],
      width: "110px",
      render: (val, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="inline-flex items-center gap-1.5 focus:outline-none">
              <StatusBadge status={row.status} />
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-white border shadow-md w-44 border-border">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
              Status Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {row.status === "active" ? (
              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer"
                onClick={() => updateStatus(row.id, "inactive")}
              >
                <UserX className="w-3.5 h-3.5" /> Deactivate
              </DropdownMenuItem>
            ) : row.status === "inactive" ? (
              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer"
                onClick={() => updateStatus(row.id, "active")}
              >
                <UserCheck className="w-3.5 h-3.5" /> Activate
              </DropdownMenuItem>
            ) : row.status === "draft" ? (
              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer"
                onClick={() => updateStatus(row.id, "active")}
              >
                <UserCheck className="w-3.5 h-3.5" /> Activate
              </DropdownMenuItem>
            ) : null}
            {row.status !== "draft" && row.status !== "blocked" && (
              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer"
                onClick={() => updateStatus(row.id, "blocked")}
              >
                <BanIcon className="w-3.5 h-3.5" /> Block Customer
              </DropdownMenuItem>
            )}
            {row.status !== "blocked" && (
              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer"
                onClick={() => markDraft(row.id)}
              >
                <CircleDashed className="w-3.5 h-3.5" /> Mark as Draft
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
    {
      key: "createdBy",
      header: "Created",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => <AuditCell name={row.createdBy} date={row.createdDate} />,
    },
    {
      key: "updatedBy",
      header: "Updated",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => <AuditCell name={row.updatedBy} date={row.updatedDate} />,
    },
  ];

  const actions = useMemo(() => {
    const list: ActionItemConfig<Customer>[] = [];
    if (perms.canView) {
      list.push({
        label: "View",
        action: "view",
        icon: Eye,
        onClick: (row) => router.push(`/masters/customers/${row.id}`),
      });
    }
    if (perms.canEdit) {
      list.push({
        label: "Edit",
        action: "edit",
        icon: Edit2,
        onClick: (row) => router.push(`/masters/customers/${row.id}/edit`),
      });
    }
    return list;
  }, [perms, router]);

  const filtered = useMemo(() => {
    let result = [...records];

    // Search filter
    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          r.customerCode.toLowerCase().includes(q) ||
          r.mobile.includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.gstin.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          r.stateName.toLowerCase().includes(q) ||
          r.districtName.toLowerCase().includes(q) ||
          r.territoryName.toLowerCase().includes(q)
      );
    }

    // Apply column filters
    result = applyFilters(result, filters);

    // Sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        if (sort.key === "creditLimit") {
          const diff = a.creditLimit - b.creditLimit;
          return sort.direction === "asc" ? diff : -diff;
        }
        const aVal = String(a[sort.key as keyof Customer] ?? "").toLowerCase();
        const bVal = String(b[sort.key as keyof Customer] ?? "").toLowerCase();
        return sort.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }

    return result;
  }, [records, filters, sort]);

  const paginated = useMemo(() => {
    const startOffset = (page - 1) * pageSize;
    return filtered.slice(startOffset, startOffset + pageSize);
  }, [filtered, page, pageSize]);

  const handleExport = () => {
    const rows = filtered.map((row) => ({
      "Customer Name": row.customerName,
      "Customer Code": row.customerCode,
      "Mobile Number": formatMobile(row.countryCode, row.mobile),
      "Email Address": row.email || "",
      GSTIN: row.gstin || "",
      "Customer Type": CUSTOMER_TYPE_LABELS[row.customerType] ?? row.customerType,
      Address: row.address || "",
      State: row.stateName || "",
      District: row.districtName || "",
      Territory: row.territoryName || "",
      "Credit Limit": formatCreditLimit(row.creditLimit),
      Status: row.status,
      "Created By": row.createdBy || "",
      "Updated By": row.updatedBy || "",
    }));

    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = String(row[header as keyof typeof row] ?? "");
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-master-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize]);

  const handleAdd = () => {
    router.push("/masters/customers/new");
  };

  const total = records.length;
  const active = records.filter((r) => r.status === "active").length;
  const inactive = records.filter((r) => r.status === "inactive").length;
  const blocked = records.filter((r) => r.status === "blocked").length;

  if (!perms.canView) {
    return (
      <AppLayout>
        <div className="max-w-[1200px] mx-auto py-16 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center w-12 h-12 border rounded-xl bg-amber-50 border-amber-200">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Access restricted</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            You do not have permission to view Customer Master. Ask your administrator for the View / Read permission.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Customer Master</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage distributors, FPOs, and retail customers
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total Customers" value={total} icon={Users} accent />
          <KpiCard label="Active" value={active} icon={CheckCircle2} color="bg-emerald-50" />
          <KpiCard label="Inactive" value={inactive} icon={XCircle} color="bg-slate-100" />
          <KpiCard label="Blocked" value={blocked} icon={Ban} color="bg-red-50" />
        </div>

        <MasterListing<Customer>
          columns={columns}
          data={paginated}
          totalRecords={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={setFilters}
          actions={actions}
          onAdd={perms.canCreate ? handleAdd : undefined}
          addLabel="Add Customer"
          onExport={handleExport}
          emptyMessage="customers"
          searchPlaceholder="Search name, mobile, state…"
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium bg-emerald-600",
          )}
        >
          {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}
