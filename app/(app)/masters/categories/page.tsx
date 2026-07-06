"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Edit2,
  Eye,
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  Folder,
  XCircle,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { loadCategories, saveCategories, type Category, type CategoryStatus } from "./category-data";
import {
  useCategories,
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useToggleCategoryStatus,
  useExportCategories,
} from "@/hooks/masters";
import { CategoryForm, DEFAULT_CATEGORY_FORM, type CategoryFormValues, validateCategoryForm } from "./components/CategoryForm";
import { MasterListingSheets, buildSimpleMasterViewDrawer } from "@/components/masters/MasterListingSheets";
import {
  MASTER_FILTER_FIELD_MAPS,
  mergeListRequestFilters,
  resolveListStatus,
} from "@/lib/masters/list-api-filters";
import { useDebouncedFilters } from "@/lib/masters/use-debounced-filters";
import {
  getErrorMessage,
  getMasterListErrorMessage,
} from "@/lib/masters/master-query-errors";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";

import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { ListingAuditCell, ListingStatusToggle, isActiveStatus } from "@/components/listing";

type SortKey = "categoryName" | "description" | "status";

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

function toCategoryRow(item: {
  id: number;
  categoryId: string;
  name: string;
  remark: string;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}): Category {
  return {
    id: item.id,
    categoryId: item.categoryId,
    categoryName: item.name,
    description: item.remark,
    status: item.status,
    createdBy: item.createdBy || "—",
    createdDate: item.createdAt ? item.createdAt.slice(0, 10) : "",
    updatedBy: item.updatedBy || "—",
    updatedDate: item.updatedAt ? item.updatedAt.slice(0, 10) : "",
  };
}


export default function CategoryMasterPage() {
  const [filters, setFilters] = useState<FilterState>({});
  const { debouncedFilters, debouncedSearch, isDebouncing } = useDebouncedFilters(filters);
  const [sort, setSort] = useState<SortState>({ key: "categoryName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sheet & Dialog states
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormValues>(DEFAULT_CATEGORY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const apiFilters = useMemo(
    () => mergeListRequestFilters(debouncedFilters, MASTER_FILTER_FIELD_MAPS.category),
    [debouncedFilters],
  );
  const listStatus = useMemo(
    () => resolveListStatus(debouncedFilters),
    [debouncedFilters],
  );

  const listParams = useMemo<MasterListKeyParams>(
    () => ({
      page,
      pageSize,
      search: debouncedSearch,
      status: listStatus,
      apiFilters,
    }),
    [page, pageSize, debouncedSearch, listStatus, apiFilters],
  );

  const listQuery = useCategories(listParams);
  const detailQuery = useCategory(viewId);
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const toggleStatusMutation = useToggleCategoryStatus();
  const exportMutation = useExportCategories();

  const records = useMemo(
    () => (listQuery.data?.items ?? []).map(toCategoryRow),
    [listQuery.data],
  );
  const totalRecords = listQuery.data?.total ?? 0;
  const loading = listQuery.isFetching;
  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, { resource: "categories" })
    : null;
  const viewLoading = Boolean(viewId) && detailQuery.isFetching;
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!viewId) return;
    if (detailQuery.isError) {
      setToast({
        msg: getErrorMessage(detailQuery.error, "Failed to load category details."),
        type: "error",
      });
      setViewId(null);
      return;
    }
    if (detailQuery.data) {
      setActive(toCategoryRow(detailQuery.data));
      setSheetMode("view");
    }
  }, [viewId, detailQuery.data, detailQuery.isError, detailQuery.error]);

  const toggleStatus = useCallback(
    (record: Category) => {
      if (!record.categoryId) {
        setToast({ msg: "Category id missing. Unable to update status.", type: "error" });
        return;
      }
      toggleStatusMutation.mutate(record.categoryId, {
        onSuccess: () => {
          setToast({
            msg: `Category status updated to ${record.status === "active" ? "Inactive" : "Active"}`,
            type: "success",
          });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to update category status."),
            type: "error",
          });
        },
      });
    },
    [toggleStatusMutation],
  );

  const columns: ColumnConfig<Category>[] = [
    {
      key: "categoryName",
      header: "Category Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "220px",
      render: (val, row) => (
        <span className="text-xs font-semibold text-foreground">{row.categoryName}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "320px",
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
        <ListingStatusToggle
          active={isActiveStatus(row.status)}
          onChange={() => toggleStatus(row)}
        />
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

  const actions: ActionItemConfig<Category>[] = [
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
    {
      label: "Delete",
      action: "delete",
      icon: Trash2,
      variant: "destructive",
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  const displayRecords = useMemo(() => {
    if (!sort.key || sort.direction === "none") return records;
    return [...records].sort((a, b) => {
      const aVal = String(a[sort.key as keyof Category] || "").toLowerCase();
      const bVal = String(b[sort.key as keyof Category] || "").toLowerCase();
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

  const openAdd = () => {
    setForm({ ...DEFAULT_CATEGORY_FORM });
    setErrors({});
    setFormError(null);
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: Category) => {
    setForm({
      categoryName: row.categoryName,
      description: row.description,
      status: row.status,
    });
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: Category) => {
    if (!row.categoryId) {
      setToast({ msg: "Category id missing. Unable to load details.", type: "error" });
      return;
    }
    setViewId(row.categoryId);
  };

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setViewId(null);
    setErrors({});
    setFormError(null);
  };

  const persist = () => {
    const mode = sheetMode === "add" ? "add" : "edit";
    const errs = validateCategoryForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    if (mode === "add") {
      setFormError(null);
      createMutation.mutate(
        {
          categoryName: form.categoryName,
          description: form.description,
        },
        {
          onSuccess: () => {
            setToast({ msg: "Category created successfully.", type: "success" });
            setPage(1);
            closeSheet();
          },
          onError: (error) => {
            setFormError(getErrorMessage(error, "Failed to create category."));
          },
        },
      );
      return;
    }

    if (!active?.categoryId) {
      setFormError("Category id missing. Unable to update.");
      return;
    }

    setFormError(null);
    updateMutation.mutate(
      {
        id: active.categoryId,
        payload: {
          categoryName: form.categoryName,
          description: form.description,
          is_active: form.status === "active",
        },
      },
      {
        onSuccess: () => {
          setToast({ msg: "Category updated successfully.", type: "success" });
          closeSheet();
        },
        onError: (error) => {
          setFormError(getErrorMessage(error, "Failed to update category."));
        },
      },
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = loadCategories().filter((r) => r.id !== deleteTarget.id);
    saveCategories(list);
    setDeleteTarget(null);
    setToast({ msg: "Category deleted successfully", type: "success" });
  };

  const handleExport = () => {
    exportMutation.mutate(
      {
        search: debouncedSearch,
        status: listStatus,
        apiFilters,
      },
      {
        onSuccess: () => {
          setToast({ msg: "Categories exported successfully", type: "success" });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to export categories"),
            type: "error",
          });
        },
      },
    );
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add Category"
      : sheetMode === "edit"
      ? "Edit Category"
      : "View Category";

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Category Master</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Manage product categories used across the masters</p>
        </div>

        {/* <div className="grid grid-cols-3 gap-3">
          <MiniKPICard label="Total Categories" value={records.length} icon={Folder} accent={true} />
          <MiniKPICard label="Active" value={records.filter((r) => r.status === "active").length} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Inactive" value={records.filter((r) => r.status === "inactive").length} icon={XCircle} accent={false} />
        </div> */}

        {listError ? <p className="text-xs text-red-600">{listError}</p> : null}

        <MasterListing<Category>
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
          addLabel="Add Category"
          onExport={handleExport}
          emptyMessage="categories"
          searchPlaceholder="Search category name, description..."
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
        icon={Folder}
        viewDrawer={
          active
            ? buildSimpleMasterViewDrawer<Category>({
                drawerTitle: "Category",
                getRecordCode: (r) => String(r.id),
                basicInfo: (r) => [
                  { label: "Category Name", value: r.categoryName },
                ],
                description: (r) => r.description,
                showDescription: true,
              })(active)
            : { title: "Category", basicInfo: [] }
        }
        formContent={
          <CategoryForm
            form={form}
            onChange={setForm}
            errors={errors}
            onClearError={(key) =>
              setErrors((prev) => {
                const copy = { ...prev };
                delete copy[key];
                return copy;
              })
            }
          />
        }
        formError={formError ?? undefined}
        saving={saving}
        statusActive={sheetMode === "edit" ? form.status === "active" : undefined}
        onStatusChange={
          sheetMode === "edit"
            ? (v) => setForm((f) => ({ ...f, status: v ? "active" : "inactive" }))
            : undefined
        }
      />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Delete record?</DialogTitle>
            <DialogDescription className="text-xs">
              This action cannot be undone. The record will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs text-white bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
