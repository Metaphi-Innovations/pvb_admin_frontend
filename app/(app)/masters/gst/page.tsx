"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Percent,
  CheckCircle2,
  X,
  Edit2,
  Eye,
} from "lucide-react";
import {
  GSTMaster,
  generateGSTCode,
  normalizeGst,
} from "./gst-data";
import { GstListService } from "@/services/gst-list.service";
import { MasterListingSheets, buildSimpleMasterViewDrawer } from "@/components/masters/MasterListingSheets";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { ListingAuditCell, ListingStatusToggle, isActiveStatus } from "@/components/listing";
import {
  MASTER_FILTER_FIELD_MAPS,
  mergeListRequestFilters,
  resolveListStatus,
} from "@/lib/masters/list-api-filters";
import { useDebouncedFilters } from "@/lib/masters/use-debounced-filters";

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
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function toGstRow(item: {
  id: number;
  gstUuid: string;
  gstPercentage: number;
  remark: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}): GSTMaster {
  return normalizeGst({
    id: item.id,
    gstUuid: item.gstUuid,
    gstId: generateGSTCode(item.id),
    gstPercentage: item.gstPercentage,
    remarks: item.remark,
    status: item.status,
    createdBy: item.createdBy || "—",
    createdDate: item.createdAt ? item.createdAt.slice(0, 10) : "",
    updatedBy: item.updatedBy || "—",
    updatedDate: item.updatedAt ? item.updatedAt.slice(0, 10) : "",
  });
}

export default function GSTPage() {
  const [records, setRecords] = useState<GSTMaster[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const { debouncedFilters, debouncedSearch, isDebouncing } = useDebouncedFilters(filters);
  const [sort, setSort] = useState<SortState>({ key: "gstPercentage", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [viewLoading, setViewLoading] = useState(false);

  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<GSTMaster | null>(null);
  const [form, setForm] = useState({
    gstPercentage: 0,
    remarks: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const apiFilters = useMemo(
    () => mergeListRequestFilters(debouncedFilters, MASTER_FILTER_FIELD_MAPS.gst),
    [debouncedFilters],
  );
  const listStatus = useMemo(
    () => resolveListStatus(debouncedFilters),
    [debouncedFilters],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListError(null);

    GstListService.list({
      page,
      pageSize,
      search: debouncedSearch,
      ordering: "",
      status: listStatus,
      apiFilters,
      signal: controller.signal,
    })
      .then((result) => {
        setRecords(result.items.map(toGstRow));
        setTotalRecords(result.total);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const err = error as { status?: number; message?: string } | undefined;
        const message =
          err?.status === 401
            ? "Unauthorized. Please login again."
            : err?.status === 403
              ? "Forbidden. You do not have access."
              : err?.status === 404
                ? "GST list endpoint not found."
                : err?.status === 500
                  ? "Server error while loading GST records."
                  : err?.message || "Unable to load GST records.";
        setListError(message);
        setRecords([]);
        setTotalRecords(0);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, pageSize, debouncedSearch, apiFilters, listStatus, reloadKey]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleStatus = useCallback(async (record: GSTMaster) => {
    if (!record.gstUuid) {
      setToast({ msg: "GST id missing. Unable to update status.", type: "error" });
      return;
    }
    try {
      await GstListService.updateStatus(record.gstUuid);
      setToast({
        msg: `GST status updated to ${record.status === "active" ? "Inactive" : "Active"}`,
        type: "success",
      });
      setReloadKey((prev) => prev + 1);
    } catch (error: unknown) {
      const err = error as { message?: string } | undefined;
      setToast({ msg: err?.message || "Failed to update GST status.", type: "error" });
    }
  }, []);

  const openAdd = () => {
    setForm({ gstPercentage: 0, remarks: "" });
    setErrors({});
    setFormError(null);
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: GSTMaster) => {
    setForm({
      gstPercentage: row.gstPercentage,
      remarks: row.remarks || "",
    });
    setErrors({});
    setFormError(null);
    setActive(row);
    setSheetMode("edit");
  };

  const openView = useCallback(async (row: GSTMaster) => {
    if (!row.gstUuid) {
      setToast({ msg: "GST id missing. Unable to load details.", type: "error" });
      return;
    }

    try {
      setViewLoading(true);
      const detail = await GstListService.view(row.gstUuid);
      setActive(toGstRow(detail));
      setSheetMode("view");
    } catch (error: unknown) {
      const err = error as { message?: string } | undefined;
      setToast({ msg: err?.message || "Failed to load GST details.", type: "error" });
    } finally {
      setViewLoading(false);
    }
  }, []);

  const columns: ColumnConfig<GSTMaster>[] = [
    {
      key: "gstPercentage",
      header: "GST Percentage",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "140px",
      render: (val, row) => (
        <span className="text-xs font-semibold text-foreground">{row.gstPercentage}%</span>
      ),
    },
    {
      key: "remarks",
      header: "Remarks",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "220px",
      render: (val, row) => row.remarks || "—",
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
      width: "110px",
      render: (val, row) => (
        <ListingStatusToggle active={isActiveStatus(row.status)} onChange={() => toggleStatus(row)} />
      ),
    },
    {
      key: "createdBy",
      header: "Created",
      sortable: true,
      filterable: true,
      filterType: "audit",
      width: "120px",
      render: (val, row) => <ListingAuditCell name={row.createdBy} date={row.createdDate} variant="created" />,
    },
    {
      key: "updatedBy",
      header: "Updated",
      sortable: true,
      filterable: true,
      filterType: "audit",
      width: "120px",
      render: (val, row) => <ListingAuditCell name={row.updatedBy} date={row.updatedDate} variant="updated" />,
    },
  ];

  const actions: ActionItemConfig<GSTMaster>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => openView(row),
      disabled: () => viewLoading,
    },
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => openEdit(row),
    },
  ];

  const displayRecords = useMemo(() => {
    if (!sort.key || sort.direction === "none") return records;
    return [...records].sort((a, b) => {
      const aVal = String(a[sort.key as keyof GSTMaster] ?? "").toLowerCase();
      const bVal = String(b[sort.key as keyof GSTMaster] ?? "").toLowerCase();
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [records, sort]);

  const isFiltering = isDebouncing;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, apiFilters, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [sort.key, sort.direction]);

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setErrors({});
    setFormError(null);
  };

  const setFormField = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (form.gstPercentage === undefined || form.gstPercentage === null || form.gstPercentage < 0) {
      e.gstPercentage = "GST Percentage is required and must be non-negative";
    } else if (form.gstPercentage > 100) {
      e.gstPercentage = "GST Percentage cannot exceed 100";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const persist = async () => {
    if (!validate()) return;

    if (sheetMode === "add") {
      try {
        setSaving(true);
        setFormError(null);
        await GstListService.create({
          gstPercentage: form.gstPercentage,
          remark: form.remarks,
        });
        setToast({ msg: "GST added successfully", type: "success" });
        setPage(1);
        setReloadKey((prev) => prev + 1);
        closeSheet();
      } catch (error: unknown) {
        const err = error as { message?: string } | undefined;
        setFormError(err?.message || "Failed to create GST record.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!active?.gstUuid) {
      setFormError("GST id missing. Unable to update.");
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      await GstListService.update(active.gstUuid, {
        gstPercentage: form.gstPercentage,
        remark: form.remarks,
      });
      setToast({ msg: "GST updated successfully", type: "success" });
      setReloadKey((prev) => prev + 1);
      closeSheet();
    } catch (error: unknown) {
      const err = error as { message?: string } | undefined;
      setFormError(err?.message || "Failed to update GST record.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      await GstListService.export({
        search: debouncedSearch,
        status: listStatus,
        apiFilters,
      });
      setToast({ msg: "GST configs exported successfully", type: "success" });
    } catch (error: unknown) {
      const err = error as { message?: string } | undefined;
      setToast({ msg: err?.message || "Failed to export GST configs", type: "error" });
    }
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add GST"
      : sheetMode === "edit"
      ? "Edit GST"
      : "View GST";

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">GST Master</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage GST configurations and tax rates
          </p>
        </div>

        {listError ? <p className="text-xs text-red-600">{listError}</p> : null}

        <MasterListing<GSTMaster>
          columns={columns}
          data={displayRecords}
          loading={loading || isFiltering}
          totalRecords={totalRecords}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={setFilters}
          actions={actions}
          onAdd={openAdd}
          addLabel="Add GST"
          onExport={handleExport}
          emptyMessage="GST configs"
          searchPlaceholder="Search percentage or remarks..."
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      <MasterListingSheets
        sheetMode={sheetMode}
        active={active}
        onClose={closeSheet}
        onEdit={() => active && openEdit(active)}
        onSave={persist}
        sheetTitle={sheetTitle}
        icon={Percent}
        formError={formError ?? undefined}
        saving={saving}
        viewDrawer={
          active
            ? buildSimpleMasterViewDrawer<GSTMaster>({
                drawerTitle: "GST",
                getRecordCode: (r) => `${r.gstPercentage}%`,
                basicInfo: (r) => [
                  { label: "GST Percentage", value: `${r.gstPercentage}%` },
                ],
                description: (r) => r.remarks,
                showDescription: true,
              })(active)
            : { title: "GST", basicInfo: [] }
        }
        formContent={
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  GST Percentage <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={form.gstPercentage}
                  onChange={(e) => setFormField("gstPercentage", parseFloat(e.target.value) || 0)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="e.g., 18.0"
                  step="0.01"
                  min="0"
                  max="100"
                  disabled={saving}
                  className={cn(
                    "h-8 text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                    errors.gstPercentage && "border-red-400 focus-visible:ring-red-300",
                  )}
                />
                {errors.gstPercentage && <p className="text-[11px] text-red-500">{errors.gstPercentage}</p>}
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-medium">Remarks</Label>
                <Textarea
                  value={form.remarks}
                  onChange={(e) => setFormField("remarks", e.target.value)}
                  placeholder="Enter remarks"
                  rows={3}
                  disabled={saving}
                  className="text-xs resize-none rounded-lg min-h-[72px]"
                />
              </div>
            </div>
          </div>
        }
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
