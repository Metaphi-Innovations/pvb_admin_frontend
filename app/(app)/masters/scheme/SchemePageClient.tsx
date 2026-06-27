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
} from "@/lib/masters/common";
import {
  SCHEME_STORAGE_KEY,
  copyRecord,
  formatValidity,
  matchesListingTab,
  resolveSchemeOperationalStatus,
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
  type SchemeRecord,
} from "./scheme-data";
import {
  isProductDiscountRecord,
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
import {
  countNearExpiryProducts,
  countNearExpiryStates,
  isNearExpiryRecord,
  loadConsolidatedSchemeRecords,
  deduplicateSchemesByCode,
  canEditNearExpiryScheme,
  canSubmitNearExpiryScheme,
  canApproveNearExpiryScheme,
  canRejectNearExpiryScheme,
  canSendBackNearExpiryScheme,
  canActivateNearExpiryScheme,
  canDeactivateNearExpiryScheme,
  canCopyNearExpiryScheme,
  copyNearExpiryRecord,
} from "./product-near-expiry-scheme";
import {
  canActivateStandardSchemeRecord,
  canApproveStandardSchemeRecord,
  canCopyStandardSchemeRecord,
  canDeactivateStandardSchemeRecord,
  canEditStandardSchemeRecord,
  canRejectStandardSchemeRecord,
  canSendBackStandardSchemeRecord,
  canSubmitStandardSchemeRecord,
  copyStandardSchemeRecord,
  countStandardSchemeStates,
  formatPaymentCustomerDisplay,
  formatPaymentListingSettlement,
  formatPaymentOfferBasis,
  isPaymentRecord,
  isStandardSchemeRecord,
  resolveStandardSchemeScope,
} from "./standard-schemes";
import { formatSchemeRupee } from "./product-discount-scheme";
import { SchemeApprovalBadge } from "./components/SchemeBadges";
import {
  formatSchemeAnalyticsRupee,
  formatUtilizationPercent,
  getSchemeUtilizationStats,
} from "./scheme-analytics-data";

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
  nearExpiryCheck: (record: SchemeRecord) => boolean,
  defaultCheck: (record: SchemeRecord) => boolean,
): boolean {
  if (isProductDiscountRecord(row)) return productDiscountCheck(row);
  if (isNearExpiryRecord(row)) return nearExpiryCheck(row);
  if (isStandardSchemeRecord(row)) return defaultCheck(row);
  return defaultCheck(row);
}

function renderOperationalStatusBadge(label: "Active" | "Inactive" | "Pending") {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0 h-5 text-[10px] font-medium",
        label === "Active"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : label === "Pending"
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-slate-100 text-slate-600 border-slate-200",
      )}
    >
      {label}
    </span>
  );
}

function resolveScopeDisplay(row: SchemeRecord): string | number {
  if (isPaymentRecord(row)) return formatPaymentCustomerDisplay(row);
  if (isProductDiscountRecord(row)) return countProductDiscountProducts(row);
  if (isNearExpiryRecord(row)) return countNearExpiryProducts(row);
  if (isStandardSchemeRecord(row)) return resolveStandardSchemeScope(row);
  return row.productName ?? "—";
}

function resolveStateDisplay(row: SchemeRecord): string | number {
  if (isPaymentRecord(row)) {
    return row.minimumOutstandingAmount !== undefined
      ? formatSchemeRupee(row.minimumOutstandingAmount)
      : "—";
  }
  if (isProductDiscountRecord(row)) return countProductDiscountStates(row);
  if (isNearExpiryRecord(row)) return countNearExpiryStates(row);
  if (isStandardSchemeRecord(row)) return countStandardSchemeStates(row);
  return row.stateName || "—";
}

function canEditSchemeRow(row: SchemeRecord): boolean {
  if (isStandardSchemeRecord(row)) return canEditStandardSchemeRecord(row);
  return canEditRecord(row);
}

function canSubmitSchemeRow(row: SchemeRecord): boolean {
  if (isStandardSchemeRecord(row)) return canSubmitStandardSchemeRecord(row);
  return canSubmitRecord(row);
}

function canApproveSchemeRow(row: SchemeRecord): boolean {
  if (isStandardSchemeRecord(row)) return canApproveStandardSchemeRecord(row);
  return canApproveRecord(row);
}

function canRejectSchemeRow(row: SchemeRecord): boolean {
  if (isStandardSchemeRecord(row)) return canRejectStandardSchemeRecord(row);
  return canRejectRecord(row);
}

function canSendBackSchemeRow(row: SchemeRecord): boolean {
  if (isStandardSchemeRecord(row)) return canSendBackStandardSchemeRecord(row);
  return canSendBackRecord(row);
}

function canActivateSchemeRow(row: SchemeRecord): boolean {
  if (isStandardSchemeRecord(row)) return canActivateStandardSchemeRecord(row);
  return canActivateRecord(row);
}

function canDeactivateSchemeRow(row: SchemeRecord): boolean {
  if (isStandardSchemeRecord(row)) return canDeactivateStandardSchemeRecord(row);
  return canDeactivateRecord(row);
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
    const migrated = deduplicateSchemesByCode(loadConsolidatedSchemeRecords());
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
      header: "Customer / Scope",
      width: "120px",
      render: (_v, row) => (
        <span className="text-[11px] line-clamp-2">{resolveScopeDisplay(row)}</span>
      ),
    },
    {
      key: "stateCount",
      header: "Min Out / States",
      width: "90px",
      render: (_v, row) => <span className="text-[11px]">{resolveStateDisplay(row)}</span>,
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
      render: (_v, row) => renderOperationalStatusBadge(resolveSchemeOperationalStatus(row)),
    },
    {
      key: "approvalStatus",
      header: "Approval",
      sortable: true,
      width: "100px",
      render: (_v, row) => <SchemeApprovalBadge record={row} />,
    },
    {
      key: "utilizedCount",
      header: "Utilized Count",
      width: "88px",
      render: (_v, row) => {
        const stats = getSchemeUtilizationStats(row);
        return (
          <span
            className={cn(
              "text-[11px] font-semibold tabular-nums",
              stats.utilizedCount > 0 ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {stats.utilizedCount}
          </span>
        );
      },
    },
    {
      key: "utilizationPercent",
      header: "Offer / Util %",
      width: "96px",
      render: (_v, row) => {
        if (isPaymentRecord(row)) {
          return (
            <span className="text-[11px] font-medium text-foreground line-clamp-2">
              {formatPaymentOfferBasis(row)}
            </span>
          );
        }
        const stats = getSchemeUtilizationStats(row);
        return (
          <span
            className={cn(
              "text-[11px] font-medium",
              stats.isUtilized ? "text-brand-700" : "text-muted-foreground",
            )}
          >
            {formatUtilizationPercent(stats)}
          </span>
        );
      },
    },
    {
      key: "benefitAmount",
      header: "Payable / Benefit",
      width: "110px",
      render: (_v, row) => (
        <span className="text-[11px] tabular-nums font-medium">
          {isPaymentRecord(row)
            ? formatPaymentListingSettlement(row)
            : formatSchemeAnalyticsRupee(getSchemeUtilizationStats(row).totalBenefitGiven)}
        </span>
      ),
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
        !schemeActionAllowed(row, canEditProductDiscountScheme, canEditNearExpiryScheme, canEditSchemeRow),
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
        !schemeActionAllowed(
          row,
          canSubmitProductDiscountScheme,
          canSubmitNearExpiryScheme,
          canSubmitSchemeRow,
        ),
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
        !schemeActionAllowed(
          row,
          canApproveProductDiscountScheme,
          canApproveNearExpiryScheme,
          canApproveSchemeRow,
        ),
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
        !schemeActionAllowed(
          row,
          canSendBackProductDiscountScheme,
          canSendBackNearExpiryScheme,
          canSendBackSchemeRow,
        ),
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
        !schemeActionAllowed(
          row,
          canRejectProductDiscountScheme,
          canRejectNearExpiryScheme,
          canRejectSchemeRow,
        ),
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
        !schemeActionAllowed(
          row,
          canActivateProductDiscountScheme,
          canActivateNearExpiryScheme,
          canActivateSchemeRow,
        ),
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
        !schemeActionAllowed(
          row,
          canDeactivateProductDiscountScheme,
          canDeactivateNearExpiryScheme,
          canDeactivateSchemeRow,
        ),
    },
    {
      label: "Copy Scheme",
      action: "copy",
      icon: Copy,
      onClick: (row) => handleCopy(row),
      hide: (row) => {
        if (isProductDiscountRecord(row)) return !canCopyProductDiscountScheme(row);
        if (isNearExpiryRecord(row)) return !canCopyNearExpiryScheme(row);
        if (isStandardSchemeRecord(row)) return !canCopyStandardSchemeRecord(row);
        return true;
      },
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
    const canEdit = schemeActionAllowed(
      row,
      canEditProductDiscountScheme,
      canEditNearExpiryScheme,
      canEditSchemeRow,
    );
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
    const prefix =
      row.schemeType === "Festive Discount Scheme"
        ? "FST-"
        : row.schemeType === "Cash Discount Scheme"
          ? "CSH-"
          : row.schemeType === "Turnover Discount Scheme"
            ? "TUR-"
            : row.schemeType === "Payment Discount Scheme"
              ? "PAY-"
              : "SCH-";
    const newCode = nextMasterCode(
      prefix,
      list.map((r) => r.schemeCode),
    );
    const copy = isNearExpiryRecord(row)
      ? copyNearExpiryRecord(row, newId, newCode)
      : isStandardSchemeRecord(row)
        ? copyStandardSchemeRecord(row, newId, newCode)
        : copyRecord(row, newId, newCode);
    persistRecords([...list, copy]);
    setToast({ msg: "Scheme copied as draft", type: "success" });
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
        addLabel="Create Scheme"
        emptyMessage="schemes"
        searchPlaceholder="Search code, name, product, state..."
        currentFilters={filters}
        currentSort={sort}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
