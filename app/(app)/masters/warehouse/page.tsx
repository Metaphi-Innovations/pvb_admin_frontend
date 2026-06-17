"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Warehouse as WarehouseIcon,
  CheckCircle2,
  XCircle,
  Wrench,
  Lock,
  Eye,
  Edit2,
  ChevronDown,
  AlertTriangle,
  Check,
} from "lucide-react";
import {
  type WarehouseMaster,
  type WarehouseStatus,
  loadWarehouses,
  saveWarehouses,
  todayStr,
  formatStatus,
  WAREHOUSE_TYPES,
  OPERATED_BY_OPTIONS,
} from "./warehouse-data";

import { MasterListing } from "@/components/listing/MasterListing";
import { applyFilters } from "@/components/listing/filter-utils";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { ListingAuditCell } from "@/components/listing";

function StatusBadge({ status }: { status: WarehouseStatus }) {
  const cfg = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    inactive: "border-slate-200 bg-slate-100 text-slate-700",
    under_maintenance: "border-amber-200 bg-amber-50 text-amber-700",
    closed: "border-red-200 bg-red-50 text-red-700",
  }[status];

  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium border inline-flex items-center justify-center whitespace-nowrap", cfg)}>
      {formatStatus(status)}
    </span>
  );
}

export default function WarehouseListPage() {
  const router = useRouter();
  const [records, setRecords] = useState<WarehouseMaster[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "warehouseCode", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmDialog, setConfirmDialog] = useState<{
    action: string;
    record: WarehouseMaster;
  } | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    setRecords(loadWarehouses());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleStatusAction = (record: WarehouseMaster, action: string) => {
    setConfirmDialog({ action, record });
  };

  const confirmStatusChange = () => {
    if (!confirmDialog) return;
    const { action, record } = confirmDialog;
    let newStatus: WarehouseStatus = "active";
    if (action === "deactivate") newStatus = "inactive";
    else if (action === "activate") newStatus = "active";
    else if (action === "under_maintenance") newStatus = "under_maintenance";
    else if (action === "closed") newStatus = "closed";

    const updated = records.map(r =>
      r.id === record.id
        ? { ...r, status: newStatus, updatedBy: "Admin", updatedDate: todayStr() }
        : r
    ) as WarehouseMaster[];
    setRecords(updated);
    saveWarehouses(updated);
    setToast({ msg: `Warehouse status updated to ${formatStatus(newStatus)} successfully`, type: "success" });
    setConfirmDialog(null);
  };

  const columns: ColumnConfig<WarehouseMaster>[] = [
    {
      key: "warehouseCode",
      header: "WH Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => (
        <span className="font-mono text-xs text-brand-700">{row.warehouseCode}</span>
      ),
    },
    {
      key: "warehouseName",
      header: "Warehouse Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "200px",
      render: (val, row) => (
        <Link href={`/masters/warehouse/${row.id}`} className="block group/name">
          <p className="text-xs font-semibold leading-4 text-foreground group-hover/name:text-brand-700">{row.warehouseName}</p>
        </Link>
      ),
    },
    {
      key: "warehouseType",
      header: "Type",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: WAREHOUSE_TYPES.map(v => ({ label: v, value: v })),
      width: "170px",
      render: (val, row) => (
        <span className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground text-[11px] font-medium">
          {row.warehouseType}
        </span>
      ),
    },
    {
      key: "gstNumber",
      header: "GST Number",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "150px",
      render: (val, row) => <span className="font-mono text-xs text-foreground">{row.gstNumber || "—"}</span>,
    },
    {
      key: "contactPerson",
      header: "Contact Person",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "140px",
      render: (val, row) => row.contactPerson || "—",
    },
    {
      key: "mobileNumber",
      header: "Mobile",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => <span className="font-mono text-xs text-foreground">{row.mobileNumber || "—"}</span>,
    },
    {
      key: "emailAddress",
      header: "Email",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "180px",
      render: (val, row) => row.emailAddress || "—",
    },
    {
      key: "state",
      header: "State",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: Array.from(new Set(records.map(r => r.state))).sort().map(v => ({ label: v, value: v })),
      width: "130px",
      render: (val, row) => row.state || "—",
    },
    {
      key: "district",
      header: "District",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: Array.from(new Set(records.map((r) => r.district))).sort().map((v) => ({ label: v, value: v })),
      width: "130px",
      render: (val, row) => row.district || "—",
    },
    {
      key: "city",
      header: "City",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: Array.from(new Set(records.map((r) => r.city))).sort().map((v) => ({ label: v, value: v })),
      width: "120px",
      render: (val, row) => row.city || "—",
    },
    {
      key: "pincode",
      header: "Pincode",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "90px",
      render: (val, row) => <span className="font-mono text-xs text-foreground">{row.pincode || "—"}</span>,
    },

    {
      key: "manager",
      header: "Manager",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: Array.from(new Set(records.map((r) => r.manager))).sort().map((v) => ({ label: v, value: v })),
      width: "130px",
      render: (val, row) => row.manager || "—",
    },
    {
      key: "operatedBy",
      header: "Operated By",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: OPERATED_BY_OPTIONS.map(v => ({ label: v, value: v })),
      width: "110px",
      render: (val, row) =>
        row.operatedBy === "C&F Agent" && row.customerType
          ? `C&F Agent (${row.customerType})`
          : (row.operatedBy || "—"),
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
        { label: "Under Maintenance", value: "under_maintenance" },
        { label: "Closed", value: "closed" },
      ],
      width: "160px",
      render: (val, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="inline-flex items-center gap-1.5 focus:outline-none pt-0.5">
              <StatusBadge status={row.status} />
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-white border shadow-lg border-border">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
              Status Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {row.status === "active" && (
              <>
                <DropdownMenuItem
                  className="gap-2 text-xs cursor-pointer text-slate-700 hover:text-slate-900"
                  onClick={() => handleStatusAction(row, "deactivate")}
                >
                  <XCircle className="w-3.5 h-3.5" /> Deactivate
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-xs cursor-pointer text-amber-700 hover:text-amber-900"
                  onClick={() => handleStatusAction(row, "under_maintenance")}
                >
                  <Wrench className="w-3.5 h-3.5" /> Mark as Under Maintenance
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-xs text-red-700 cursor-pointer hover:text-red-900"
                  onClick={() => handleStatusAction(row, "closed")}
                >
                  <Lock className="w-3.5 h-3.5" /> Mark as Closed
                </DropdownMenuItem>
              </>
            )}
            {row.status === "inactive" && (
              <>
                <DropdownMenuItem
                  className="gap-2 text-xs cursor-pointer text-emerald-700 hover:text-emerald-900"
                  onClick={() => handleStatusAction(row, "activate")}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-xs cursor-pointer text-amber-700 hover:text-amber-900"
                  onClick={() => handleStatusAction(row, "under_maintenance")}
                >
                  <Wrench className="w-3.5 h-3.5" /> Mark as Under Maintenance
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-xs text-red-700 cursor-pointer hover:text-red-900"
                  onClick={() => handleStatusAction(row, "closed")}
                >
                  <Lock className="w-3.5 h-3.5" /> Mark as Closed
                </DropdownMenuItem>
              </>
            )}
            {row.status === "under_maintenance" && (
              <>
                <DropdownMenuItem
                  className="gap-2 text-xs cursor-pointer text-emerald-700 hover:text-emerald-900"
                  onClick={() => handleStatusAction(row, "activate")}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-xs cursor-pointer text-slate-700 hover:text-slate-900"
                  onClick={() => handleStatusAction(row, "deactivate")}
                >
                  <XCircle className="w-3.5 h-3.5" /> Deactivate
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-xs text-red-700 cursor-pointer hover:text-red-900"
                  onClick={() => handleStatusAction(row, "closed")}
                >
                  <Lock className="w-3.5 h-3.5" /> Mark as Closed
                </DropdownMenuItem>
              </>
            )}
            {row.status === "closed" && (
              <>
                <DropdownMenuItem
                  className="gap-2 text-xs cursor-pointer text-emerald-700 hover:text-emerald-900"
                  onClick={() => handleStatusAction(row, "activate")}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-xs cursor-pointer text-amber-700 hover:text-amber-900"
                  onClick={() => handleStatusAction(row, "under_maintenance")}
                >
                  <Wrench className="w-3.5 h-3.5" /> Mark as Under Maintenance
                </DropdownMenuItem>
              </>
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
      render: (val, row) => <ListingAuditCell name={row.createdBy} date={row.createdDate} variant="created" />,
    },
    {
      key: "updatedBy",
      header: "Updated",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => <ListingAuditCell name={row.updatedBy} date={row.updatedDate} variant="updated" />,
    },
  ];

  const actions: ActionItemConfig<WarehouseMaster>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/masters/warehouse/${row.id}`),
    },
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => router.push(`/masters/warehouse/${row.id}/edit`),
    },
  ];

  const filtered = useMemo(() => {
    let result = [...records];

    // Search filter
    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.warehouseName.toLowerCase().includes(q) ||
          r.warehouseCode.toLowerCase().includes(q) ||
          r.gstNumber.toLowerCase().includes(q) ||
          r.contactPerson.toLowerCase().includes(q) ||
          r.mobileNumber.includes(q) ||
          r.city.toLowerCase().includes(q)
      );
    }

    // Apply column filters
    result = applyFilters(result, filters);

    // Sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        let aVal = String(a[sort.key as keyof WarehouseMaster] ?? "").toLowerCase();
        let bVal = String(b[sort.key as keyof WarehouseMaster] ?? "").toLowerCase();
        const cmp = aVal.localeCompare(bVal);
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [records, filters, sort]);

  const paginated = useMemo(() => {
    const startOffset = (page - 1) * pageSize;
    return filtered.slice(startOffset, startOffset + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize]);

  const handleExport = () => {
    const headers = [
      "Warehouse Code", "Warehouse Name", "Warehouse Type", "GST Number",
      "Contact Person", "Mobile Number", "Email Address", "Address",
      "State", "District", "City", "Pincode",
      "Manager", "Operated By", "Status",
    ];
    const rows = filtered.map(r => [
      r.warehouseCode, r.warehouseName, r.warehouseType, r.gstNumber,
      r.contactPerson, r.mobileNumber, r.emailAddress, `"${r.address}"`,
      r.state, r.district, r.city, r.pincode,
      r.manager, r.operatedBy, formatStatus(r.status),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `warehouse_master_${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ msg: "Warehouse data exported successfully", type: "success" });
  };

  const handleAdd = () => {
    router.push("/masters/warehouse/add");
  };

  const totalCount = records.length;
  const activeCount = records.filter(r => r.status === "active").length;
  const inactiveCount = records.filter(r => r.status === "inactive").length;
  const maintenanceCount = records.filter(r => r.status === "under_maintenance").length;

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Warehouse Master</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage warehouse locations and operations
          </p>
        </div>

        {/* <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex items-center gap-3 p-3 bg-white border shadow-sm rounded-xl border-border">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-brand-600">
              <WarehouseIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-foreground">{totalCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Total Warehouses</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white border shadow-sm rounded-xl border-border">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-muted">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-foreground">{activeCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Active</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white border shadow-sm rounded-xl border-border">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-muted">
              <XCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-foreground">{inactiveCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Inactive</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white border shadow-sm rounded-xl border-border">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-muted">
              <Wrench className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-foreground">{maintenanceCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Under Maintenance</p>
            </div>
          </div>
        </div> */}

        <MasterListing<WarehouseMaster>
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
          onAdd={handleAdd}
          addLabel="Add Warehouse"
          onExport={handleExport}
          emptyMessage="warehouses"
          searchPlaceholder="Search name, code, GST, contact, mobile, city..."
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      {confirmDialog && (
        <Dialog
          open={true}
          onOpenChange={open => {
            if (!open) setConfirmDialog(null);
          }}
        >
          <DialogContent className="max-w-sm bg-white border shadow-xl border-border rounded-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 border rounded-lg bg-amber-50 border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                {confirmDialog.action === "activate"
                  ? "Activate"
                  : confirmDialog.action === "deactivate"
                  ? "Deactivate"
                  : confirmDialog.action === "under_maintenance"
                  ? "Under Maintenance"
                  : "Close"}{" "}
                Warehouse?
              </DialogTitle>
              <DialogDescription className="pt-1">
                Are you sure you want to{" "}
                {confirmDialog.action === "activate"
                  ? "activate"
                  : confirmDialog.action === "deactivate"
                  ? "deactivate"
                  : confirmDialog.action === "under_maintenance"
                  ? "mark as under maintenance"
                  : "close"}{" "}
                &quot;{confirmDialog.record.warehouseName}&quot;?
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs text-white bg-brand-600 hover:bg-brand-700"
                onClick={confirmStatusChange}
              >
                Confirm
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium bg-emerald-600 animate-in slide-in-from-top-2 fade-in-0 duration-300",
          )}
        >
          <Check className="flex-shrink-0 w-4 h-4" />
          {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}
