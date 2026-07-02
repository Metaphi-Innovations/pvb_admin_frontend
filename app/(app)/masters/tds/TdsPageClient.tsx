"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  X,
  Edit2,
  Percent,
  Eye,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  type TDSMaster,
  type TDSForm,
  DEFAULT_TDS_FORM,
  TDS_APPLICABLE_TO_OPTIONS,
  loadTDSMasters,
  saveTDSMasters,
  tdsToForm,
  formToTds,
  validateTdsForm,
  nextTDSId,
  todayStr,
  getTdsSectionCode,
  formatTdsRateDisplay,
  formatApplicableToLabels,
} from "./tds-data";
import { TdsRateInput } from "./TdsRateInput";
import { ensureTdsSectionLedgers } from "@/lib/accounts/tds-section-ledgers";
import { MasterFormGrid, MasterField, compactInput } from "@/components/masters/MasterModule";
import { MasterListingSheets } from "@/components/masters/MasterListingSheets";
import { MasterDrawerSection } from "@/components/masters/MasterRecordDrawer";
import { MasterListing } from "@/components/listing/MasterListing";
import { applyFilters } from "@/components/listing/filter-utils";
import {
  ColumnConfig,
  FilterState,
  SortState,
  ActionItemConfig,
} from "@/components/listing/types";
import {
  ListingUserCell,
  AuditUserRow,
  ListingStatusToggle,
  isActiveStatus,
} from "@/components/listing";
import { ListingContainer } from "@/components/layout/ListingContainer";
import type { MasterStatus } from "@/lib/masters/common";

type StatusTab = "all" | "active" | "inactive";
const TDS_TAB_KEY = "tds-list-status-tab";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function readStoredStatusTab(): StatusTab {
  if (typeof window === "undefined") return "all";
  const v = sessionStorage.getItem(TDS_TAB_KEY);
  return v === "active" || v === "inactive" ? v : "all";
}

interface ToastState {
  msg: string;
  type: "success" | "error";
}

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

export default function TdsPageClient() {
  const [records, setRecords] = useState<TDSMaster[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({
    key: "sectionCode",
    direction: "asc",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");

  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<TDSMaster | null>(null);
  const [form, setForm] = useState<TDSForm>(DEFAULT_TDS_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<TDSMaster | null>(null);

  const applicableOptions = useMemo(
    () =>
      TDS_APPLICABLE_TO_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
      })),
    [],
  );

  useEffect(() => {
    setRecords(loadTDSMasters());
    setStatusTab(readStoredStatusTab());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleStatusTabChange = (tab: string) => {
    const next = tab as StatusTab;
    setStatusTab(next);
    sessionStorage.setItem(TDS_TAB_KEY, next);
    setPage(1);
  };

  const statusTabCounts = useMemo(
    () => ({
      all: records.length,
      active: records.filter((r) => r.status === "active").length,
      inactive: records.filter((r) => r.status === "inactive").length,
    }),
    [records],
  );

  const toggleStatus = (record: TDSMaster) => {
    const nextStatus: MasterStatus =
      record.status === "active" ? "inactive" : "active";
    const updated = records.map((item) =>
      item.id === record.id
        ? {
            ...item,
            status: nextStatus,
            updatedBy: "Admin User",
            updatedDate: todayStr(),
          }
        : item,
    );
    setRecords(updated);
    saveTDSMasters(updated);
    setToast({
      msg: `TDS status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`,
      type: "success",
    });
  };

  const columns: ColumnConfig<TDSMaster>[] = [
    {
      key: "sectionCode",
      header: "Section Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "110px",
      render: (_val, row) => (
        <button
          type="button"
          onClick={() => openView(row)}
          className="font-mono text-xs font-semibold text-brand-700 hover:underline"
        >
          {getTdsSectionCode(row)}
        </button>
      ),
    },
    {
      key: "sectionName",
      header: "Section Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "200px",
      render: (_val, row) => (
        <span className="text-xs font-medium text-foreground">{row.sectionName}</span>
      ),
    },
    {
      key: "tdsRate",
      header: "TDS Rate",
      sortable: true,
      width: "100px",
      render: (_val, row) => (
        <span className="text-xs font-semibold text-foreground">
          {formatTdsRateDisplay(row.tdsRate)}
        </span>
      ),
    },
    {
      key: "thresholdAmount",
      header: "Threshold",
      width: "110px",
      render: (_val, row) => (
        <span className="text-xs text-muted-foreground">
          {row.thresholdAmount != null
            ? `₹${row.thresholdAmount.toLocaleString("en-IN")}`
            : "—"}
        </span>
      ),
    },
    {
      key: "applicableTo",
      header: "Applicable To",
      width: "180px",
      render: (_val, row) => (
        <span className="text-xs text-muted-foreground line-clamp-2">
          {formatApplicableToLabels(row.applicableTo)}
        </span>
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      sortable: true,
      width: "150px",
      render: (_val, row) => (
        <ListingUserCell name={row.createdBy} date={row.createdDate} />
      ),
    },
    {
      key: "updatedBy",
      header: "Updated By",
      sortable: true,
      width: "150px",
      render: (_val, row) => (
        <ListingUserCell name={row.updatedBy} date={row.updatedDate} />
      ),
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
      width: "100px",
      render: (_val, row) => (
        <ListingStatusToggle
          active={isActiveStatus(row.status)}
          onChange={() => toggleStatus(row)}
        />
      ),
    },
  ];

  const actions: ActionItemConfig<TDSMaster>[] = [
    { label: "View", action: "view", icon: Eye, onClick: (row) => openView(row) },
    { label: "Edit", action: "edit", icon: Edit2, onClick: (row) => openEdit(row) },
    {
      label: "Delete",
      action: "delete",
      icon: Trash2,
      variant: "destructive",
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  const filtered = useMemo(() => {
    let result = [...records];

    if (statusTab !== "all") {
      result = result.filter((r) => r.status === statusTab);
    }

    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(
        (r) =>
          getTdsSectionCode(r).toLowerCase().includes(q) ||
          r.sectionName.toLowerCase().includes(q),
      );
    }

    result = applyFilters(result, filters);

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        let aVal: string | number = "";
        let bVal: string | number = "";
        if (sort.key === "sectionCode") {
          aVal = getTdsSectionCode(a).toLowerCase();
          bVal = getTdsSectionCode(b).toLowerCase();
        } else {
          const rawA = a[sort.key as keyof TDSMaster];
          const rawB = b[sort.key as keyof TDSMaster];
          aVal =
            typeof rawA === "string"
              ? rawA.toLowerCase()
              : typeof rawA === "number"
                ? rawA
                : String(rawA ?? "").toLowerCase();
          bVal =
            typeof rawB === "string"
              ? rawB.toLowerCase()
              : typeof rawB === "number"
                ? rawB
                : String(rawB ?? "").toLowerCase();
        }
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [records, filters, sort, statusTab]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize, statusTab]);

  const openAdd = () => {
    setForm({ ...DEFAULT_TDS_FORM });
    setErrors({});
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: TDSMaster) => {
    setForm(tdsToForm(row));
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: TDSMaster) => {
    setActive(row);
    setSheetMode("view");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setErrors({});
  };

  const persist = () => {
    const mode = sheetMode === "add" ? "add" : "edit";
    const list = loadTDSMasters();
    const normalizedForm: TDSForm = {
      ...form,
      sectionCode: form.sectionCode.trim().toUpperCase(),
    };
    const fieldErrors = validateTdsForm(
      normalizedForm,
      list,
      mode === "edit" ? active?.id : undefined,
    );
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    let updatedList: TDSMaster[];
    if (mode === "add") {
      const id = nextTDSId(list);
      updatedList = [...list, formToTds(normalizedForm, id)];
      setToast({ msg: "TDS section added successfully", type: "success" });
    } else if (active) {
      updatedList = list.map((r) =>
        r.id === active.id ? formToTds(normalizedForm, active.id, active) : r,
      );
      setToast({ msg: "TDS section updated successfully", type: "success" });
    } else {
      return;
    }

    saveTDSMasters(updatedList);
    ensureTdsSectionLedgers();
    setRecords(updatedList);
    closeSheet();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const updated = records.map((r) =>
      r.id === deleteTarget.id
        ? {
            ...r,
            status: "inactive" as MasterStatus,
            updatedBy: "Admin User",
            updatedDate: todayStr(),
          }
        : r,
    );
    saveTDSMasters(updated);
    setRecords(updated);
    setDeleteTarget(null);
    setToast({
      msg: `TDS ${getTdsSectionCode(deleteTarget)} marked as inactive`,
      type: "success",
    });
  };

  const handleExport = () => {
    try {
      const headers = [
        "Section Code",
        "Section Name",
        "TDS Rate",
        "Description",
        "Applicable To",
        "Status",
        "Created By",
        "Updated By",
        "Created Date",
        "Updated Date",
      ];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        csvRows.push(
          [
            getTdsSectionCode(r),
            `"${r.sectionName.replace(/"/g, '""')}"`,
            formatTdsRateDisplay(r.tdsRate),
            `"${(r.description || "").replace(/"/g, '""')}"`,
            `"${formatApplicableToLabels(r.applicableTo).replace(/"/g, '""')}"`,
            r.status,
            r.createdBy,
            r.updatedBy,
            r.createdDate,
            r.updatedDate,
          ].join(","),
        );
      }
      const blob = new Blob([csvRows.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tds_export_${todayStr()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setToast({ msg: "TDS records exported successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to export TDS records", type: "error" });
    }
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add TDS Section"
      : sheetMode === "edit"
        ? "Edit TDS Section"
        : "View TDS Section";

  const viewDrawer = active
    ? {
        title: getTdsSectionCode(active),
        subtitle: active.sectionName,
        status: active.status,
        basicInfo: [
          { label: "Section Code", value: getTdsSectionCode(active), mono: true },
          { label: "Section Name", value: active.sectionName },
          { label: "TDS Rate", value: formatTdsRateDisplay(active.tdsRate) },
          {
            label: "Applicable To",
            value: formatApplicableToLabels(active.applicableTo),
          },
        ],
        showDescription: !!active.description?.trim(),
        description: active.description,
        children: (
          <MasterDrawerSection title="Audit Information">
            <div className="space-y-4">
              <AuditUserRow label="Created By" name={active.createdBy} />
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Created Date</p>
                <p className="text-sm font-medium text-foreground font-mono">
                  {active.createdDate}
                </p>
              </div>
              <AuditUserRow label="Updated By" name={active.updatedBy} />
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Updated Date</p>
                <p className="text-sm font-medium text-foreground font-mono">
                  {active.updatedDate}
                </p>
              </div>
            </div>
          </MasterDrawerSection>
        ),
      }
    : { title: "TDS", basicInfo: [] };

  return (
    <ListingContainer
      title="TDS Master"
      titleIcon={Percent}
      tabs={STATUS_TABS.map((t) => ({
        value: t.value,
        label: `${t.label} (${statusTabCounts[t.value]})`,
      }))}
      activeTab={statusTab}
      onTabChange={handleStatusTabChange}
    >
      <MasterListing<TDSMaster>
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
        addLabel="Add TDS"
        onExport={handleExport}
        emptyMessage="TDS sections"
        searchPlaceholder="Search section code or name..."
        currentFilters={filters}
        currentSort={sort}
      />

      <MasterListingSheets
        sheetMode={sheetMode}
        active={active}
        onClose={closeSheet}
        onEdit={() => active && openEdit(active)}
        onSave={persist}
        sheetTitle={sheetTitle}
        icon={Percent}
        viewDrawer={viewDrawer}
        statusActive={form.status === "active"}
        onStatusChange={
          sheetMode === "add" || sheetMode === "edit"
            ? (isActive) =>
                setForm((prev) => ({
                  ...prev,
                  status: isActive ? "active" : "inactive",
                }))
            : undefined
        }
        formContent={
          sheetMode !== "view" ? (
            <MasterFormGrid>
              <MasterField
                label="TDS Section Code"
                required
                error={errors.sectionCode}
              >
                <Input
                  autoFocus
                  className={cn(compactInput(), "font-mono uppercase")}
                  value={form.sectionCode}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sectionCode: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="e.g. 194C"
                  disabled={sheetMode === "edit"}
                />
              </MasterField>

              <MasterField label="TDS Rate %" required error={errors.tdsRate}>
                <TdsRateInput
                  className={compactInput()}
                  value={form.tdsRate}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, tdsRate: value }))
                  }
                />
              </MasterField>

              <MasterField
                label="TDS Section Name"
                required
                error={errors.sectionName}
                className="sm:col-span-2"
              >
                <Input
                  className={compactInput()}
                  value={form.sectionName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sectionName: e.target.value }))
                  }
                  placeholder="e.g. Professional Fees"
                />
              </MasterField>

              <MasterField label="Applicable To" className="sm:col-span-2">
                <AutocompleteSelect
                  multiple
                  options={applicableOptions}
                  value={form.applicableTo}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      applicableTo: Array.isArray(value) ? value : [],
                    }))
                  }
                  placeholder="Select applicable categories…"
                  searchPlaceholder="Search…"
                  className="h-8 text-xs"
                  renderTriggerLabel={(selected) => {
                    const opts = Array.isArray(selected) ? selected : [];
                    if (!opts.length) return "Select applicable categories…";
                    return opts.map((o) => o.label).join(", ");
                  }}
                />
              </MasterField>

              <MasterField label="Threshold Limit (₹)" className="sm:col-span-2">
                <Input
                  className={compactInput()}
                  type="number"
                  min={0}
                  value={form.thresholdAmount}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, thresholdAmount: e.target.value }))
                  }
                  placeholder="Annual threshold — optional"
                />
              </MasterField>
            </MasterFormGrid>
          ) : null
        }
      />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              Deactivate TDS Section?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {deleteTarget && (
                <>
                  <strong className="text-foreground font-mono">
                    {getTdsSectionCode(deleteTarget)}
                  </strong>{" "}
                  — {deleteTarget.sectionName} will be marked as inactive.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs text-white bg-red-600 hover:bg-red-700"
              onClick={confirmDelete}
            >
              Mark Inactive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
