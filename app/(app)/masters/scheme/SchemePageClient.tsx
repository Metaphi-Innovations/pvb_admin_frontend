"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Copy,
  Edit2,
  Eye,
  Gift,
  Send,
  Settings,
  ShieldCheck,
  ShieldX,
  Power,
  X,
} from "lucide-react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListingSheets, buildSimpleMasterViewDrawer } from "@/components/masters/MasterListingSheets";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { applyFilters } from "@/components/listing/filter-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  loadMasterRecords,
  saveMasterRecords,
  nextMasterCode,
  masterToday,
} from "@/lib/masters/common";
import {
  APPROVAL_STATUS_LABELS,
  SCHEME_SEED,
  SCHEME_STORAGE_KEY,
  SCHEME_TYPES,
  DEFAULT_SCHEME_SETTINGS,
  copyRecord,
  formatBenefit,
  formatValidity,
  loadSchemeSettings,
  matchesListingTab,
  saveSchemeSettings,
  canApproveRecord,
  canDeactivateRecord,
  canEditRecord,
  canRejectRecord,
  canSubmitRecord,
  approveRecord,
  rejectRecord,
  submitRecord,
  deactivateRecord,
  type SchemeRecord,
  type SchemeSettings,
} from "./scheme-data";
import { SchemeSettingsDialog } from "./components/SchemeSettingsDialog";
import { SchemeApprovalBadge, SchemeStatusBadge } from "./components/SchemeBadges";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

const LISTING_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
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

export default function SchemeMasterPage() {
  const router = useRouter();
  const [records, setRecords] = useState<SchemeRecord[]>([]);
  const [settings, setSettings] = useState<SchemeSettings>(DEFAULT_SCHEME_SETTINGS);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "schemeName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [sheetMode, setSheetMode] = useState<"view" | null>(null);
  const [active, setActive] = useState<SchemeRecord | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftSettings, setDraftSettings] = useState<SchemeSettings>(DEFAULT_SCHEME_SETTINGS);

  useEffect(() => {
    const loaded = loadMasterRecords<SchemeRecord>(SCHEME_STORAGE_KEY, SCHEME_SEED);
    const needsMigration = loaded.some((r) => !r.schemeType);
    if (needsMigration) {
      localStorage.removeItem(SCHEME_STORAGE_KEY);
      setRecords(loadMasterRecords<SchemeRecord>(SCHEME_STORAGE_KEY, SCHEME_SEED));
    } else {
      setRecords(loaded);
    }
    setSettings(loadSchemeSettings());
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
      key: "schemeName",
      header: "Scheme Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "180px",
      render: (_v, row) => (
        <span className="text-xs font-semibold text-foreground line-clamp-2">{row.schemeName}</span>
      ),
    },
    {
      key: "schemeType",
      header: "Scheme Type",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: SCHEME_TYPES.map((t) => ({ label: t, value: t })),
      width: "140px",
      render: (_v, row) => <span className="text-[11px]">{row.schemeType}</span>,
    },
    {
      key: "productName",
      header: "Product",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "100px",
      render: (_v, row) => (
        <span className="text-[11px]">{row.productName ?? "—"}</span>
      ),
    },
    {
      key: "stateName",
      header: "State",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "100px",
      render: (_v, row) => <span className="text-[11px]">{row.stateName}</span>,
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
      key: "benefit",
      header: "Benefit",
      width: "100px",
      render: (_v, row) => (
        <span className="text-[11px] font-medium">{formatBenefit(row)}</span>
      ),
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
      key: "priority",
      header: "Priority",
      sortable: true,
      width: "60px",
      render: (_v, row) => <span className="text-[11px]">{row.priority}</span>,
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
      ],
      width: "80px",
      render: (_v, row) => <SchemeStatusBadge active={row.status === "active"} />,
    },
    {
      key: "approvalStatus",
      header: "Approval",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: Object.entries(APPROVAL_STATUS_LABELS).map(([value, label]) => ({
        label,
        value,
      })),
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
      label: "Edit Draft",
      action: "edit",
      icon: Edit2,
      onClick: (row) => openEdit(row),
      hide: (row) => !canEditRecord(row),
    },
    {
      label: "Copy",
      action: "copy",
      icon: Copy,
      onClick: (row) => handleCopy(row),
    },
    {
      label: "Submit for Approval",
      action: "submit",
      icon: Send,
      onClick: (row) => {
        updateRecord(row.id, submitRecord);
        setToast({ msg: "Scheme submitted for approval", type: "success" });
      },
      hide: (row) => !canSubmitRecord(row),
    },
    {
      label: "Approve",
      action: "approve",
      icon: ShieldCheck,
      onClick: (row) => {
        updateRecord(row.id, approveRecord);
        setToast({ msg: "Scheme approved to next stage", type: "success" });
      },
      hide: (row) => !canApproveRecord(row),
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
      hide: (row) => !canRejectRecord(row),
    },
    {
      label: "Deactivate",
      action: "deactivate",
      icon: Power,
      onClick: (row) => {
        updateRecord(row.id, deactivateRecord);
        setToast({ msg: "Scheme deactivated", type: "success" });
      },
      hide: (row) => !canDeactivateRecord(row),
    },
  ];

  const filtered = useMemo(() => {
    let result = records.filter((r) => matchesListingTab(r, activeTab));

    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(
        (r) =>
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
    if (!canEditRecord(row)) {
      setToast({ msg: "Only draft schemes can be edited", type: "error" });
      return;
    }
    router.push(`/masters/scheme/${row.id}/edit`);
  };

  const openView = (row: SchemeRecord) => {
    setActive(row);
    setSheetMode("view");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
  };

  const handleCopy = (row: SchemeRecord) => {
    const list = loadMasterRecords<SchemeRecord>(SCHEME_STORAGE_KEY, SCHEME_SEED);
    const newId = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
    const newCode = nextMasterCode(
      "SCH-",
      list.map((r) => r.schemeCode),
    );
    const copy = copyRecord(row, newId, newCode);
    persistRecords([...list, copy]);
    setToast({ msg: "Scheme copied as draft", type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = [
        "Scheme Name",
        "Scheme Type",
        "Product",
        "State",
        "Customer Type",
        "Benefit",
        "Validity",
        "Priority",
        "Status",
        "Approval Status",
      ];
      const rows = filtered.map((r) =>
        [
          `"${r.schemeName.replace(/"/g, '""')}"`,
          r.schemeType,
          r.productName ?? "",
          r.stateName,
          r.customerType,
          `"${formatBenefit(r)}"`,
          `"${formatValidity(r)}"`,
          r.priority,
          r.status,
          APPROVAL_STATUS_LABELS[r.approvalStatus],
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

  const openSettings = () => {
    setDraftSettings(settings);
    setSettingsOpen(true);
  };

  const saveSettings = () => {
    saveSchemeSettings(draftSettings);
    setSettings(draftSettings);
    setSettingsOpen(false);
    setToast({ msg: "Scheme settings saved", type: "success" });
  };

  const viewDrawer = active
    ? buildSimpleMasterViewDrawer<SchemeRecord>({
        drawerTitle: "Scheme",
        getRecordCode: (r) => r.schemeName,
        basicInfo: (r) => [
          { label: "Scheme Name", value: r.schemeName },
          { label: "Scheme Type", value: r.schemeType },
          { label: "Product", value: r.productName ?? "—" },
          { label: "State", value: r.stateName },
          { label: "Customer Type", value: r.customerType },
          { label: "Benefit", value: formatBenefit(r) },
          { label: "Validity", value: formatValidity(r) },
          { label: "Priority", value: String(r.priority) },
          { label: "Status", value: r.status === "active" ? "Active" : "Inactive" },
          {
            label: "Approval",
            value: APPROVAL_STATUS_LABELS[r.approvalStatus],
          },
          ...(r.expiryWithinDays
            ? [{ label: "Expiry Within Days", value: String(r.expiryWithinDays) }]
            : []),
          ...(r.minimumOrderValue
            ? [{ label: "Min Order Value", value: `₹${r.minimumOrderValue}` }]
            : []),
          ...(r.festivalName ? [{ label: "Festival", value: r.festivalName }] : []),
          ...(r.paymentMode ? [{ label: "Payment Mode", value: r.paymentMode }] : []),
          ...(r.isPaymentLevel
            ? [{ label: "Benefit Level", value: "Payment-level (not product discount)" }]
            : []),
        ],
        showDescription: false,
      })(active)
    : { title: "Scheme", basicInfo: [] };

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
      actions={
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={openSettings}
        >
          <Settings className="h-3.5 w-3.5" />
          Conflict Settings
        </Button>
      }
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
        addLabel="Create Scheme"
        onExport={handleExport}
        emptyMessage="schemes"
        searchPlaceholder="Search name, product, state..."
        currentFilters={filters}
        currentSort={sort}
      />

      <MasterListingSheets
        sheetMode={sheetMode}
        active={active}
        onClose={closeSheet}
        onEdit={() => active && openEdit(active)}
        onSave={closeSheet}
        sheetTitle="View Scheme"
        icon={Gift}
        viewDrawer={viewDrawer}
        formContent={null}
      />

      <SchemeSettingsDialog
        open={settingsOpen}
        settings={draftSettings}
        onChange={setDraftSettings}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSettings}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
