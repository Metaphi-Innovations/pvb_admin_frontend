"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Edit2,
  Eye,
  IndianRupee,
  X,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MasterFormGrid, MasterField, compactInput } from "@/components/masters/MasterModule";
import { MasterListingSheets } from "@/components/masters/MasterListingSheets";
import { MasterDrawerSection } from "@/components/masters/MasterRecordDrawer";
import {
  DEFAULT_PRICING_FORM,
  formToPricing,
  formatIndianRupeeDisplay,
  PRICING_SEED,
  PRICING_STORAGE_KEY,
  pricingToForm,
  resolveProductForPricing,
  validatePricingForm,
  loadActiveProductOptions,
  findActivePricingForProduct,
  parseGstPct,
  type PricingForm,
  type PricingRecord,
} from "./pricing-data";
import {
  loadMasterRecords,
  saveMasterRecords,
  masterToday,
  type MasterStatus,
} from "@/lib/masters/common";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { applyFilters } from "@/components/listing/filter-utils";
import { ListingUserCell, AuditUserRow, ListingStatusToggle, isActiveStatus } from "@/components/listing";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { IndianRupeeInput } from "@/components/ui/IndianRupeeInput";
import { MONEY_CELL_CLASS } from "@/lib/accounts/money-format";



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

function MoneyCell({ value }: { value: number }) {
  return (
    <span className={cn(MONEY_CELL_CLASS, "text-xs block")}>
      {formatIndianRupeeDisplay(value)}
    </span>
  );
}

export default function PricingMasterPage() {
  const [records, setRecords] = useState<PricingRecord[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "sku", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);


  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<PricingRecord | null>(null);
  const [form, setForm] = useState<PricingForm>(DEFAULT_PRICING_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<PricingRecord | null>(null);

  const productOptions = useMemo(() => loadActiveProductOptions(), [sheetMode]);

  useEffect(() => {
    setRecords(loadMasterRecords<PricingRecord>(PRICING_STORAGE_KEY, PRICING_SEED));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);



  const toggleStatus = (record: PricingRecord) => {
    const nextStatus: MasterStatus = record.status === "active" ? "inactive" : "active";

    if (nextStatus === "active") {
      const duplicate = findActivePricingForProduct(record.productId, records, record.id);
      if (duplicate) {
        setToast({
          msg: `Cannot activate — "${duplicate.sku}" already has an active pricing record.`,
          type: "error",
        });
        return;
      }
    }

    const updated = records.map((item) =>
      item.id === record.id
        ? {
          ...item,
          status: nextStatus,
          updatedBy: "Admin User",
          updatedAt: masterToday(),
        }
        : item,
    );
    setRecords(updated);
    saveMasterRecords(PRICING_STORAGE_KEY, updated);
    setToast({
      msg: `Pricing status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`,
      type: "success",
    });
  };



  const columns: ColumnConfig<PricingRecord>[] = [
    {
      key: "sku",
      header: "SKU",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (_val, row) => (
        <button
          type="button"
          onClick={() => openView(row)}
          className="text-xs font-mono font-semibold text-foreground hover:text-brand-600 hover:underline text-left"
        >
          {row.sku}
        </button>
      ),
    },
    {
      key: "productName",
      header: "Product Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "200px",
      render: (_val, row) => (
        <span className="text-xs font-medium text-foreground">{row.productName}</span>
      ),
    },
    {
      key: "baseUnit",
      header: "Base Unit",
      sortable: true,
      width: "90px",
      render: (_val, row) => <span className="text-xs">{row.baseUnit || "—"}</span>,
    },
    {
      key: "uom",
      header: "UOM",
      sortable: true,
      width: "72px",
      render: (_val, row) => <span className="text-xs">{row.uom || "—"}</span>,
    },

    {
      key: "costPrice",
      header: "CP",
      sortable: true,
      width: "120px",
      align: "right",
      render: (_val, row) => <MoneyCell value={row.costPrice} />,
    },
    {
      key: "distributorPrice",
      header: "Distributor Price (DP)",
      sortable: true,
      width: "140px",
      align: "right",
      render: (_val, row) => <MoneyCell value={row.distributorPrice} />,
    },
    {
      key: "retailPrice",
      header: "Retail Price (RP)",
      sortable: true,
      width: "130px",
      align: "right",
      render: (_val, row) => <MoneyCell value={row.retailPrice} />,
    },
    {
      key: "mrp",
      header: "MRP",
      sortable: true,
      width: "110px",
      align: "right",
      render: (_val, row) => <MoneyCell value={row.mrp} />,
    },
    {
      key: "createdBy",
      header: "Created By",
      sortable: true,
      width: "150px",
      render: (_val, row) => (
        <ListingUserCell name={row.createdBy} date={row.createdAt} />
      ),
    },
    {
      key: "updatedBy",
      header: "Updated By",
      sortable: true,
      width: "150px",
      render: (_val, row) => (
        <ListingUserCell name={row.updatedBy} date={row.updatedAt} />
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

  const actions: ActionItemConfig<PricingRecord>[] = [
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

    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.sku.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q),
      );
    }

    result = applyFilters(result, filters);

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const key = sort.key as keyof PricingRecord;
        let aVal: string | number = a[key] as string | number;
        let bVal: string | number = b[key] as string | number;
        if (typeof aVal === "number" && typeof bVal === "number") {
          const cmp = aVal - bVal;
          return sort.direction === "asc" ? cmp : -cmp;
        }
        const cmp = String(aVal ?? "").toLowerCase().localeCompare(String(bVal ?? "").toLowerCase());
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

  const openAdd = () => {
    setForm({ ...DEFAULT_PRICING_FORM });
    setErrors({});
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: PricingRecord) => {
    setForm(pricingToForm(row));
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: PricingRecord) => {
    setActive(row);
    setForm(pricingToForm(row));
    setSheetMode("view");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setErrors({});
  };

  const handleProductChange = (productId: string) => {
    const product = resolveProductForPricing(productId);
    if (!product) {
      setForm((prev) => ({
        ...prev,
        productId: "",
        productName: "",
        sku: "",
        segment: "",
        category: "",
      }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      productId,
      productName: product.productName,
      sku: product.sku,
      segment: product.segment,
      category: product.category,
      baseUnit: product.baseUnit || prev.baseUnit,
      uom: product.packagingUnit || prev.uom,
      packSize: product.conversionQuantity
        ? `${product.conversionQuantity} ${product.baseUnit || ""}`.trim()
        : product.packagingUnit || prev.packSize,
      unitsPerCase: product.conversionQuantity || prev.unitsPerCase,
      gstPct: parseGstPct(product.gstRate) || prev.gstPct,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.productId;
      return next;
    });
  };

  const persist = () => {
    const mode = sheetMode === "add" ? "add" : "edit";
    const list = loadMasterRecords<PricingRecord>(PRICING_STORAGE_KEY, PRICING_SEED);
    const fieldErrors = validatePricingForm(
      form,
      list,
      mode === "edit" ? active?.id : undefined,
    );
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    let updatedList: PricingRecord[];
    if (mode === "add") {
      const id = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
      updatedList = [...list, formToPricing(form, id)];
      setToast({ msg: "Pricing record added successfully", type: "success" });
    } else if (active) {
      updatedList = list.map((r) =>
        r.id === active.id ? formToPricing(form, active.id, active) : r,
      );
      setToast({ msg: "Pricing record updated successfully", type: "success" });
    } else {
      return;
    }

    saveMasterRecords(PRICING_STORAGE_KEY, updatedList);
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
          updatedAt: masterToday(),
        }
        : r,
    );
    saveMasterRecords(PRICING_STORAGE_KEY, updated);
    setRecords(updated);
    setDeleteTarget(null);
    setToast({ msg: `"${deleteTarget.sku}" marked as inactive`, type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = [
        "SKU",
        "Product Name",
        "Base Unit",
        "UOM",
        "Units Per Case",
        "GST %",
        "Cost Price (CP)",
        "Distributor Price (DP)",
        "Retail Price (RP)",
        "MRP",
        "Status",
        "Created By",
        "Updated By",
        "Created At",
        "Updated At",
      ];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        csvRows.push(
          [
            r.sku,
            `"${r.productName.replace(/"/g, '""')}"`,
            r.baseUnit,
            r.uom,
            r.unitsPerCase,
            r.gstPct,
            r.costPrice,
            r.distributorPrice,
            r.retailPrice,
            r.mrp,
            r.status,
            r.createdBy,
            r.updatedBy,
            r.createdAt,
            r.updatedAt,
          ].join(","),
        );
      }
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pricing_export_${masterToday()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setToast({ msg: "Pricing records exported successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to export pricing records", type: "error" });
    }
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add Pricing"
      : sheetMode === "edit"
        ? "Edit Pricing"
        : "View Pricing";

  const viewDrawer = active
    ? {
      title: active.productName,
      subtitle: active.sku,
      status: active.status,
      basicInfo: [
        { label: "SKU", value: active.sku },
        { label: "Product Name", value: active.productName },
        { label: "Base Unit", value: active.baseUnit || "—" },
        { label: "UOM", value: active.uom || "—" },
        { label: "Units Per Case", value: String(active.unitsPerCase ?? "—") },
        { label: "Segment", value: active.segment || "—" },
        { label: "Category", value: active.category || "—" },
        { label: "Cost Price (CP)", value: formatIndianRupeeDisplay(active.costPrice) },
        { label: "Distributor Price (DP)", value: formatIndianRupeeDisplay(active.distributorPrice) },
        { label: "Retail Price (RP)", value: formatIndianRupeeDisplay(active.retailPrice) },
        { label: "MRP", value: formatIndianRupeeDisplay(active.mrp) },
        { label: "GST %", value: active.gstPct != null ? `${active.gstPct}%` : "—" },
      ],
      showDescription: false,
      children: (
        <MasterDrawerSection title="Audit Information">
          <div className="space-y-4">
            <AuditUserRow label="Created By" name={active.createdBy} />
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">Created Date</p>
              <p className="text-sm font-medium text-foreground font-mono">
                {active.createdAt}
              </p>
            </div>
            <AuditUserRow label="Updated By" name={active.updatedBy} />
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">Updated Date</p>
              <p className="text-sm font-medium text-foreground font-mono">
                {active.updatedAt}
              </p>
            </div>
          </div>
        </MasterDrawerSection>
      ),
    }
    : { title: "Pricing", basicInfo: [] };

  const hierarchyError = errors.pricingHierarchy;

  return (
    <ListingContainer
      title="Pricing Master"
      titleIcon={IndianRupee}
    >
      <MasterListing<PricingRecord>
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
        addLabel="Add Pricing"
        onExport={handleExport}
        emptyMessage="pricing records"
        searchPlaceholder="Search SKU or product name..."
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
        icon={IndianRupee}
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
            <div className="space-y-4">
              <MasterFormGrid>
                <MasterField
                  label="Product / SKU"
                  required
                  error={errors.productId}
                  className="sm:col-span-2"
                >
                  <AutocompleteSelect
                    disabled={sheetMode === "edit"}
                    value={form.productId}
                    onChange={(value) => handleProductChange(String(value))}
                    options={productOptions}
                    placeholder="Search product or SKU..."
                  />
                </MasterField>

                {form.productId && (
                  <>
                    <MasterField label="Product Name" className="sm:col-span-2">
                      <Input
                        readOnly
                        className={cn(compactInput(), "bg-muted/20")}
                        value={form.productName}
                      />
                    </MasterField>
                    <MasterField label="Segment">
                      <Input
                        readOnly
                        className={cn(compactInput(), "bg-muted/20")}
                        value={form.segment || "—"}
                      />
                    </MasterField>
                    <MasterField label="Category">
                      <Input
                        readOnly
                        className={cn(compactInput(), "bg-muted/20")}
                        value={form.category || "—"}
                      />
                    </MasterField>
                    <MasterField label="SKU">
                      <Input
                        readOnly
                        className={cn(compactInput(), "bg-muted/20 font-mono")}
                        value={form.sku || "—"}
                      />
                    </MasterField>
                    <MasterField label="Base Unit">
                      <Input
                        readOnly
                        className={cn(compactInput(), "bg-muted/20")}
                        value={form.baseUnit || "—"}
                      />
                    </MasterField>
                    <MasterField label="Units Per Case">
                      <Input
                        readOnly
                        className={cn(compactInput(), "bg-muted/20")}
                        value={form.unitsPerCase || ""}
                      />
                    </MasterField>
                  </>
                )}
                <MasterField label="Cost Price (CP)" required error={errors.costPrice}>
                  <IndianRupeeInput
                    value={form.costPrice}
                    onChange={(v) => setForm((prev) => ({ ...prev, costPrice: v }))}
                  />
                </MasterField>

                <MasterField label="Distributor Price (DP)" required error={errors.distributorPrice}>
                  <IndianRupeeInput
                    value={form.distributorPrice}
                    onChange={(v) => setForm((prev) => ({ ...prev, distributorPrice: v }))}
                  />
                </MasterField>

                <MasterField label="Retail Price (RP)" required error={errors.retailPrice}>
                  <IndianRupeeInput
                    value={form.retailPrice}
                    onChange={(v) => setForm((prev) => ({ ...prev, retailPrice: v }))}
                  />
                </MasterField>

                <MasterField label="MRP" required error={errors.mrp}>
                  <IndianRupeeInput
                    value={form.mrp}
                    onChange={(v) => setForm((prev) => ({ ...prev, mrp: v }))}
                  />
                </MasterField>

                <MasterField label="GST %">
                  <Input
                    type="number"
                    min={0}
                    className={compactInput()}
                    value={form.gstPct || ""}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, gstPct: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </MasterField>
              </MasterFormGrid>

              {hierarchyError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {hierarchyError}
                </p>
              )}
            </div>
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
              Deactivate Pricing?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {deleteTarget && (
                <>
                  Pricing for <strong className="text-foreground">{deleteTarget.sku}</strong> will be
                  marked as inactive.
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
