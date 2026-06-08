"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { loadCategories, saveCategories, type Category, type CategoryStatus, todayStr, nextCategoryId, generateCategoryCode } from "./category-data";
import { MiniKPICard } from "@/components/ui/KPICard";
import { CategoryForm, DEFAULT_CATEGORY_FORM, type CategoryFormValues, validateCategoryForm } from "./components/CategoryForm";
import { MasterFormGrid, MasterViewRow } from "@/components/masters/MasterModule";

import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { applyFilters } from "@/components/listing/filter-utils";

type SortKey = "categoryCode" | "categoryName" | "description" | "status";

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
      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function StatusToggle({ record, onToggle }: { record: Category; onToggle: (item: Category) => void }) {
  const active = record.status === "active";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(record);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}

export default function CategoryMasterPage() {
  const [records, setRecords] = useState<Category[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "categoryCode", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sheet & Dialog states
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormValues>(DEFAULT_CATEGORY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  useEffect(() => {
    setRecords(loadCategories());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleStatus = (record: Category) => {
    const nextStatus: CategoryStatus = record.status === "active" ? "inactive" : "active";
    const updated = records.map((item) =>
      item.id === record.id
        ? { ...item, status: nextStatus, updatedBy: "Admin", updatedDate: todayStr() }
        : item,
    );
    setRecords(updated);
    saveCategories(updated);
    setToast({ msg: `Category status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`, type: "success" });
  };

  const columns: ColumnConfig<Category>[] = [
    {
      key: "categoryCode",
      header: "Category Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
    },
    {
      key: "categoryName",
      header: "Category Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "220px",
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
        <StatusToggle record={row} onToggle={toggleStatus} />
      ),
    },
  ];

  const actions: ActionItemConfig<Category>[] = [
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
    },
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

    // Search filter
    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.categoryCode.toLowerCase().includes(q) ||
          r.categoryName.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q)
      );
    }

    // Apply column filters
    result = applyFilters(result, filters);

    // Sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const aVal = String(a[sort.key as keyof Category] || "").toLowerCase();
        const bVal = String(b[sort.key as keyof Category] || "").toLowerCase();
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [records, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize]);

  const openAdd = () => {
    const code = generateCategoryCode(records);
    setForm({
      ...DEFAULT_CATEGORY_FORM,
      categoryCode: code,
    });
    setErrors({});
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: Category) => {
    setForm({
      categoryCode: row.categoryCode,
      categoryName: row.categoryName,
      description: row.description,
      status: row.status,
    });
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: Category) => {
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
    const errs = validateCategoryForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const list = loadCategories();
    let updatedList: Category[];
    if (mode === "add") {
      const id = nextCategoryId(list);
      const newRecord: Category = {
        id,
        categoryCode: form.categoryCode,
        categoryName: form.categoryName,
        description: form.description,
        status: form.status,
        createdBy: "Admin",
        createdDate: todayStr(),
        updatedBy: "Admin",
        updatedDate: todayStr(),
      };
      updatedList = [...list, newRecord];
      setToast({ msg: "Category added successfully", type: "success" });
    } else if (active) {
      updatedList = list.map((r) =>
        r.id === active.id
          ? {
              ...r,
              categoryName: form.categoryName,
              description: form.description,
              status: form.status,
              updatedBy: "Admin",
              updatedDate: todayStr(),
            }
          : r,
      );
      setToast({ msg: "Category updated successfully", type: "success" });
    } else {
      return;
    }
    saveCategories(updatedList);
    setRecords(updatedList);
    closeSheet();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = loadCategories().filter((r) => r.id !== deleteTarget.id);
    saveCategories(list);
    setRecords(list);
    setDeleteTarget(null);
    setToast({ msg: "Category deleted successfully", type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = ["ID", "Category Code", "Category Name", "Description", "Status", "Created By", "Created Date", "Updated By", "Updated Date"];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        const row = [
          r.id,
          `"${r.categoryCode.replace(/"/g, '""')}"`,
          `"${r.categoryName.replace(/"/g, '""')}"`,
          `"${(r.description || "").replace(/"/g, '""')}"`,
          r.status,
          r.createdBy,
          r.createdDate,
          r.updatedBy,
          r.updatedDate,
        ];
        csvRows.push(row.join(","));
      }
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `categories_export_${todayStr()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ msg: "Categories exported successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to export categories", type: "error" });
    }
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

        <div className="grid grid-cols-3 gap-3">
          <MiniKPICard label="Total Categories" value={records.length} icon={Folder} accent={true} />
          <MiniKPICard label="Active" value={records.filter((r) => r.status === "active").length} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Inactive" value={records.filter((r) => r.status === "inactive").length} icon={XCircle} accent={false} />
        </div>

        <MasterListing<Category>
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
          addLabel="Add Category"
          onExport={handleExport}
          emptyMessage="categories"
          searchPlaceholder="Search category code, name, description..."
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      <Sheet open={sheetMode !== null} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent>
          <SheetHeader>
            <div className="flex items-start gap-3 pr-8">
              <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                <Folder className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <SheetTitle className="text-base">{sheetTitle}</SheetTitle>
                <SheetDescription className="text-xs">
                  {sheetMode === "view" ? "Read-only details" : "Compact category form"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <SheetBody>
            {sheetMode === "view" && active ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border/60 bg-muted/10 px-3">
                  <MasterViewRow label="Category Name" value={active.categoryName} />
                  <MasterViewRow label="Category Code" value={<span className="font-mono">{active.categoryCode}</span>} />
                  <MasterViewRow label="Description" value={active.description || "—"} />
                  <MasterViewRow label="Status" value={active.status === "active" ? "Active" : "Inactive"} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Created By</p>
                    <p className="font-medium">{active.createdBy}</p>
                    <p className="text-muted-foreground">{active.createdDate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Updated By</p>
                    <p className="font-medium">{active.updatedBy}</p>
                    <p className="text-muted-foreground">{active.updatedDate}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
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
              </div>
            )}
          </SheetBody>

          <SheetFooter>
            {sheetMode === "view" ? (
              <>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={closeSheet}>
                  Back
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                  onClick={() => active && openEdit(active)}
                >
                  Edit
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={closeSheet}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                  onClick={persist}
                >
                  Save
                </Button>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
            <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
