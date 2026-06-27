"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Copy,
  Edit2,
  Eye,
  Gift,
  PlayCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  ShieldX,
  Power,
  X,
} from "lucide-react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { applyFilters } from "@/components/listing/filter-utils";
import { cn } from "@/lib/utils";
import {
  saveMasterRecords,
  nextMasterCode,
  masterToday,
} from "@/lib/masters/common";
import {
  APPROVAL_STATUS_LABELS,
  SCHEME_STORAGE_KEY,
  copyRecord,
  formatValidity,
  matchesListingTab,
  canApproveRecord,
  canActivateRecord,
  canDeactivateRecord,
  canEditRecord,
  canRejectRecord,
  canSendBackRecord,
  canSubmitRecord,
  approveRecord,
  activateRecord,
  rejectRecord,
  sendBackRecord,
  submitRecord,
  deactivateRecord,
  resolveDisplayApprovalStatus,
  type SchemeRecord,
} from "./scheme-data";
import {
  formatProductDiscountOperationalStatus,
  isProductDiscountRecord,
  loadConsolidatedSchemeRecords,
  countProductDiscountProducts,
  countProductDiscountStates,
  canEditProductDiscountScheme,
  canSubmitProductDiscountScheme,
  canApproveProductDiscountScheme,
  canRejectProductDiscountScheme,
  canSendBackProductDiscountScheme,
  canActivateProductDiscountScheme,
  canDeactivateProductDiscountScheme,
  canCopyProductDiscountScheme,
} from "./product-discount-scheme";
import { SchemeApprovalBadge, SchemeStatusBadge } from "./components/SchemeBadges";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

const LISTING_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "rejected", label: "Rejected" },
] as const;

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function schemeActionAllowed(
  row: SchemeRecord,
  productDiscountCheck: (record: SchemeRecord) => boolean,
  defaultCheck: (record: SchemeRecord) => boolean,
): boolean {
  return isProductDiscountRecord(row) ? productDiscountCheck(row) : defaultCheck(row);
}

export default function SchemeMasterPage() {
  const router = useRouter();
  const [records, setRecords] = useState<SchemeRecord[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "schemeName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const migrated = loadConsolidatedSchemeRecords();
    saveMasterRecords(SCHEME_STORAGE_KEY, migrated);
    setRecords(migrated);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const persistRecords = (list: SchemeRecord[]) => {
    saveMasterRecords(SCHEME_STORAGE_KEY, list);
    setRecords(list);
  };

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of LISTING_TABS) {
      counts[tab.value] = records.filter((r) => matchesListingTab(r, tab.value)).length;
    }
    return counts;
  }, [records]);

  const columns: ColumnConfig<SchemeRecord>[] = [
    {
      key: "schemeCode",
      header: "Scheme Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "90px",
      render: (_v, row) => (
        <span className="text-[11px] font-mono font-medium text-foreground">{row.schemeCode}</span>
      ),
    },
    {
      key: "schemeName",
      header: "Scheme Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "160px",
      render: (_v, row) => (
        <span className="text-[11px] font-medium line-clamp-2">{row.schemeName}</span>
      ),
    },
    {
      key: "schemeType",
      header: "Scheme Type",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "140px",
      render: (_v, row) => <span className="text-[11px]">{row.schemeType}</span>,
    },
    {
      key: "productCount",
      header: "No. of Products",
      width: "90px",
      render: (_v, row) => (
        <span className="text-[11px]">
          {isProductDiscountRecord(row) ? countProductDiscountProducts(row) : (row.productName ?? "—")}
        </span>
      ),
    },
    {
      key: "stateCount",
      header: "No. of States",
      width: "85px",
      render: (_v, row) => (
        <span className="text-[11px]">
          {isProductDiscountRecord(row) ? countProductDiscountStates(row) : row.stateName}
        </span>
      ),
    },
    {
      key: "customerType",
      header: "Customer Type",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "100px",
      render: (_v, row) => <span className="text-[11px]">{row.customerType}</span>,
    },
    {
      key: "validity",
      header: "Validity",
      width: "150px",
      render: (_v, row) => (
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {formatValidity(row)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Pending", value: "pending" },
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
      width: "80px",
      render: (_v, row) => {
        if (isProductDiscountRecord(row)) {
          const label = formatProductDiscountOperationalStatus(row);
          return (
            <span
              className={cn(
                "inline-flex items-center rounded border px-1.5 py-0 h-5 text-[10px] font-medium",
                label === "Active"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : label === "Approved"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : label === "Pending"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : label === "Expired"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : label === "Rejected"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-slate-50 text-slate-600 border-slate-200",
              )}
            >
              {label}
            </span>
          );
        }
        return <SchemeStatusBadge active={row.status === "active"} />;
      },
    },
    {
      key: "approvalStatus",
      header: "Approval Status",
      sortable: true,
      width: "110px",
      render: (_v, row) => <SchemeApprovalBadge record={row} />,
    },
  ];

  const updateRecord = (id: number, updater: (r: SchemeRecord) => SchemeRecord) => {
    const list = records.map((r) => (r.id === id ? updater(r) : r));
    persistRecords(list);
  };

  const actions: ActionItemConfig<SchemeRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => openView(row),
    },
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => openEdit(row),
      disabled: (row) =>
        !schemeActionAllowed(row, canEditProductDiscountScheme, canEditRecord),
    },
    {
      label: "Resubmit for Approval",
      action: "submit",
      icon: Send,
      onClick: (row) => {
        updateRecord(row.id, submitRecord);
        setToast({ msg: "Scheme submitted for approval", type: "success" });
      },
      hide: (row) =>
        !schemeActionAllowed(row, canSubmitProductDiscountScheme, canSubmitRecord),
    },
    {
      label: "Approve",
      action: "approve",
      icon: ShieldCheck,
      onClick: (row) => {
        const updated = approveRecord(row);
        updateRecord(row.id, () => updated);
        const msg =
          updated.approvalStatus === "approved"
            ? "Scheme approved — ready for activation"
            : "Scheme moved to next approval stage";
        setToast({ msg, type: "success" });
      },
      hide: (row) =>
        !schemeActionAllowed(row, canApproveProductDiscountScheme, canApproveRecord),
    },
    {
      label: "Send Back",
      action: "send_back",
      icon: RotateCcw,
      onClick: (row) => {
        updateRecord(row.id, sendBackRecord);
        setToast({ msg: "Scheme sent back for correction", type: "success" });
      },
      hide: (row) =>
        !schemeActionAllowed(row, canSendBackProductDiscountScheme, canSendBackRecord),
    },
    {
      label: "Reject",
      action: "reject",
      icon: ShieldX,
      variant: "destructive",
      onClick: (row) => {
        updateRecord(row.id, rejectRecord);
        setToast({ msg: "Scheme rejected", type: "success" });
      },
      hide: (row) =>
        !schemeActionAllowed(row, canRejectProductDiscountScheme, canRejectRecord),
    },
    {
      label: "Activate",
      action: "activate",
      icon: PlayCircle,
      onClick: (row) => {
        updateRecord(row.id, activateRecord);
        setToast({ msg: "Scheme activated", type: "success" });
      },
      hide: (row) =>
        !schemeActionAllowed(row, canActivateProductDiscountScheme, canActivateRecord),
    },
    {
      label: "Deactivate",
      action: "deactivate",
      icon: Power,
      onClick: (row) => {
        updateRecord(row.id, deactivateRecord);
        setToast({ msg: "Scheme deactivated", type: "success" });
      },
      hide: (row) =>
        !schemeActionAllowed(row, canDeactivateProductDiscountScheme, canDeactivateRecord),
    },
    {
      label: "Copy Scheme",
      action: "copy",
      icon: Copy,
      onClick: (row) => handleCopy(row),
      hide: (row) =>
        isProductDiscountRecord(row) ? !canCopyProductDiscountScheme(row) : false,
    },
  ];

  const filtered = useMemo(() => {
    let result = records.filter((r) => matchesListingTab(r, activeTab));

    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.schemeCode.toLowerCase().includes(q) ||
          r.schemeName.toLowerCase().includes(q) ||
          (r.productName ?? "").toLowerCase().includes(q) ||
          r.stateName.toLowerCase().includes(q) ||
          r.schemeType.toLowerCase().includes(q),
      );
    }

    result = applyFilters(result, filters);

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const aVal = String(a[sort.key as keyof SchemeRecord] ?? "").toLowerCase();
        const bVal = String(b[sort.key as keyof SchemeRecord] ?? "").toLowerCase();
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [records, activeTab, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize, activeTab]);

  const openAdd = () => router.push("/masters/scheme/add");

  const openEdit = (row: SchemeRecord) => {
    const canEdit = schemeActionAllowed(row, canEditProductDiscountScheme, canEditRecord);
    if (!canEdit) {
      setToast({
        msg: "Approved and active schemes cannot be edited. Edit is allowed only while pending approval or rejected.",
        type: "error",
      });
      return;
    }
    router.push(`/masters/scheme/${row.id}/edit`);
  };

  const openView = (row: SchemeRecord) => {
    router.push(`/masters/scheme/${row.id}`);
  };

  const handleCopy = (row: SchemeRecord) => {
    const list = loadConsolidatedSchemeRecords();
    const newId = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
    const newCode = nextMasterCode(
      "SCH-",
      list.map((r) => r.schemeCode),
    );
    const copy = copyRecord(row, newId, newCode);
    persistRecords([...list, copy]);
    setToast({ msg: "Scheme copied and submitted for approval", type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = [
        "Scheme Code",
        "Scheme Name",
        "Scheme Type",
        "No. of Products",
        "No. of States",
        "Customer Type",
        "Validity",
        "Status",
        "Approval Status",
      ];
      const rows = filtered.map((r) =>
        [
          r.schemeCode,
          `"${r.schemeName.replace(/"/g, '""')}"`,
          r.schemeType,
          isProductDiscountRecord(r) ? countProductDiscountProducts(r) : (r.productName ?? ""),
          isProductDiscountRecord(r) ? countProductDiscountStates(r) : r.stateName,
          r.customerType,
          `"${formatValidity(r)}"`,
          isProductDiscountRecord(r)
            ? formatProductDiscountOperationalStatus(r)
            : r.status === "active"
              ? "Active"
              : "Inactive",
          APPROVAL_STATUS_LABELS[resolveDisplayApprovalStatus(r)],
        ].join(","),
      );
      const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `schemes_export_${masterToday()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setToast({ msg: "Schemes exported", type: "success" });
    } catch {
      setToast({ msg: "Export failed", type: "error" });
    }
  };

  return (
    <ListingContainer
      title="Scheme Management"
      titleIcon={Gift}
      tabs={LISTING_TABS.map((t) => ({
        value: t.value,
        label: `${t.label} (${tabCounts[t.value] ?? 0})`,
      }))}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <MasterListing<SchemeRecord>
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
        onAdd={openAdd}
        addLabel="Create Product Discount"
        onExport={handleExport}
        emptyMessage="schemes"
        searchPlaceholder="Search code, name, product, state..."
        currentFilters={filters}
        currentSort={sort}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
