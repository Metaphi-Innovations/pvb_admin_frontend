"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Edit2,
  Eye,
  IndianRupee,
  Info,
  X,
  Trash2,
  AlertTriangle,
  ListChecks,
  CalendarClock,
  CalendarX,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MasterListingSheets } from "@/components/masters/MasterListingSheets";
import { PricingForm as PricingFormFields } from "./components/PricingForm";
import { MasterDrawerSection } from "@/components/masters/MasterRecordDrawer";
import {
  DEFAULT_PRICING_FORM,
  PRICING_CUSTOMER_TYPES,
  PRICING_STATES,
  PRICING_STORAGE_KEY,
  computePricingDashboardStats,
  findDuplicateActivePricing,
  formToPricing,
  formatIndianRupeeDisplay,
  getSellingPriceFromRecord,
  loadActiveProductOptions,
  loadActiveSupplierFilterOptions,
  loadPricingRecords,
  pricingToForm,
  validatePricingForm,
  type PricingForm,
  type PricingRecord,
} from "./pricing-data";
import { saveMasterRecords, masterToday, type MasterStatus } from "@/lib/masters/common";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { applyFilters } from "@/components/listing/filter-utils";
import { AuditUserRow, ListingStatusToggle, isActiveStatus } from "@/components/listing";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MiniKPICard } from "@/components/ui/KPICard";
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
  const router = useRouter();
  const [records, setRecords] = useState<PricingRecord[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "productCode", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [sheetMode, setSheetMode] = useState<"edit" | "view" | null>(null);
  const [active, setActive] = useState<PricingRecord | null>(null);
  const [form, setForm] = useState<PricingForm>(DEFAULT_PRICING_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<PricingRecord | null>(null);

  const productOptions = useMemo(() => loadActiveProductOptions(), [sheetMode]);

  const categoryFilterOptions = useMemo(
    () =>
      [...new Set(records.map((r) => r.category).filter(Boolean))]
        .sort()
        .map((c) => ({ label: c, value: c })),
    [records],
  );

  const segmentFilterOptions = useMemo(
    () =>
      [...new Set(records.map((r) => r.segment).filter(Boolean))]
        .sort()
        .map((s) => ({ label: s, value: s })),
    [records],
  );

  const supplierFilterOptions = useMemo(
    () =>
      loadActiveSupplierFilterOptions().map((s) => ({ label: s, value: s })),
    [records],
  );

  const dashboardStats = useMemo(() => computePricingDashboardStats(records), [records]);

  useEffect(() => {
    setRecords(loadPricingRecords());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleStatus = (record: PricingRecord) => {
    const nextStatus: MasterStatus = record.status === "active" ? "inactive" : "active";

    if (nextStatus === "active") {
      const duplicate = findDuplicateActivePricing(
        {
          productId: String(record.productId),
          customerType: record.customerType,
          state: record.state,
          status: "active",
        },
        records,
        record.id,
      );
      if (duplicate) {
        setToast({
          msg: `Cannot activate — an active rule already exists for this product, state, and customer type.`,
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

  const columns: ColumnConfig<PricingRecord>[] = useMemo(() => [
    {
      key: "productCode",
      header: "Product Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (_val, row) => (
        <button
          type="button"
          onClick={() => openView(row)}
          className="text-left text-xs font-mono font-semibold text-foreground hover:text-brand-600 hover:underline"
        >
          {row.productCode || row.sku}
        </button>
      ),
    },
    {
      key: "productName",
      header: "Product Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "170px",
      render: (_val, row) => (
        <span className="text-xs font-medium text-foreground">{row.productName}</span>
      ),
    },
    {
      key: "supplierName",
      header: "Supplier Name",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: supplierFilterOptions,
      width: "140px",
      render: (_val, row) => <span className="text-xs">{row.supplierName || "—"}</span>,
    },
    {
      key: "supplierCode",
      header: "Supplier Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "110px",
      render: (_val, row) => (
        <span className="text-xs font-mono">{row.supplierCode || "—"}</span>
      ),
    },
    {
      key: "state",
      header: "State",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: PRICING_STATES.map((s) => ({ label: s, value: s })),
      width: "120px",
      render: (_val, row) => <span className="text-xs">{row.state || "—"}</span>,
    },
    {
      key: "customerType",
      header: "Customer Type",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: PRICING_CUSTOMER_TYPES.map((t) => ({ label: t, value: t })),
      width: "110px",
      render: (_val, row) => <span className="text-xs">{row.customerType}</span>,
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: categoryFilterOptions,
      width: "100px",
      render: (_val, row) => <span className="text-xs">{row.category || "—"}</span>,
    },
    {
      key: "segment",
      header: "Segment",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: segmentFilterOptions,
      width: "100px",
      render: (_val, row) => <span className="text-xs">{row.segment || "—"}</span>,
    },
    {
      key: "packSize",
      header: "Pack Size",
      sortable: true,
      width: "90px",
      render: (_val, row) => <span className="text-xs">{row.packSize || "—"}</span>,
    },
    {
      key: "unit",
      header: "Unit",
      sortable: true,
      width: "80px",
      render: (_val, row) => (
        <span className="text-xs">{row.unit || row.mou || row.baseUnit || "—"}</span>
      ),
    },
    {
      key: "gstPct",
      header: "GST %",
      sortable: true,
      width: "70px",
      render: (_val, row) => <span className="text-xs">{row.gstPct || "—"}</span>,
    },
    {
      key: "costPrice",
      header: "Cost Price",
      sortable: true,
      width: "100px",
      align: "right",
      render: (_val, row) => <MoneyCell value={row.costPrice} />,
    },
    {
      key: "dealerPrice",
      header: "Dealer Price",
      sortable: true,
      width: "110px",
      align: "right",
      render: (_val, row) => <MoneyCell value={row.dealerPrice || getSellingPriceFromRecord(row)} />,
    },
    {
      key: "mrp",
      header: "MRP",
      sortable: true,
      width: "100px",
      align: "right",
      render: (_val, row) => <MoneyCell value={row.mrp} />,
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
  ], [categoryFilterOptions, segmentFilterOptions, supplierFilterOptions]);

  const actions: ActionItemConfig<PricingRecord>[] = [
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

    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.productCode.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          (r.supplierName || "").toLowerCase().includes(q) ||
          (r.supplierCode || "").toLowerCase().includes(q) ||
          (r.hsnCode || "").toLowerCase().includes(q),
      );
    }

    result = applyFilters(result, filters);

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;
        if (sort.key === "dealerPrice") {
          aVal = getSellingPriceFromRecord(a);
          bVal = getSellingPriceFromRecord(b);
        } else {
          aVal = a[sort.key as keyof PricingRecord] as string | number;
          bVal = b[sort.key as keyof PricingRecord] as string | number;
        }
        if (typeof aVal === "number" && typeof bVal === "number") {
          const cmp = aVal - bVal;
          return sort.direction === "asc" ? cmp : -cmp;
        }
        const cmp = String(aVal ?? "")
          .toLowerCase()
          .localeCompare(String(bVal ?? "").toLowerCase());
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

  const persist = () => {
    if (!active) return;
    const list = loadPricingRecords();
    const fieldErrors = validatePricingForm(form, list, active.id);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    const updatedList = list.map((r) =>
      r.id === active.id ? formToPricing(form, active.id, active) : r,
    );
    saveMasterRecords(PRICING_STORAGE_KEY, updatedList);
    setRecords(updatedList);
    setToast({ msg: "Pricing rule updated successfully", type: "success" });
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
    setToast({ msg: `"${deleteTarget.productName}" marked as inactive`, type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = [
        "Product Code",
        "Product Name",
        "Supplier Name",
        "Supplier Code",
        "State",
        "Customer Type",
        "Category",
        "Segment",
        "Pack Size",
        "Unit",
        "GST %",
        "Cost Price",
        "Dealer Price",
        "MRP",
        "Status",
      ];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        csvRows.push(
          [
            r.productCode || r.sku,
            `"${r.productName.replace(/"/g, '""')}"`,
            `"${(r.supplierName || "").replace(/"/g, '""')}"`,
            r.supplierCode,
            r.state,
            r.customerType,
            r.category,
            r.segment,
            r.packSize,
            r.unit || r.mou || r.baseUnit,
            r.gstPct,
            r.costPrice,
            r.dealerPrice || getSellingPriceFromRecord(r),
            r.mrp,
            r.status,
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

  const sheetTitle = sheetMode === "edit" ? "Edit Pricing" : "View Pricing";

  const viewDrawer = active
    ? {
        title: active.productName,
        subtitle: `${active.productCode || active.sku} · ${active.state} · ${active.customerType}`,
        status: active.status,
        basicInfo: [],
        showDescription: false,
        children: (
          <>
            <MasterDrawerSection title="Product Information">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Product Code", value: active.productCode || active.sku },
                  { label: "Product Name", value: active.productName },
                  { label: "Supplier Name", value: active.supplierName || "—" },
                  { label: "Supplier Code", value: active.supplierCode || "—" },
                  { label: "SKU", value: active.sku },
                  { label: "Category", value: active.category || "—" },
                  { label: "Segment", value: active.segment || "—" },
                  { label: "Pack Size", value: active.packSize || "—" },
                  { label: "Unit", value: active.unit || active.mou || active.baseUnit || "—" },
                  { label: "HSN", value: active.hsnCode || "—" },
                  { label: "GST %", value: active.gstPct || "—" },
                ].map((item) => (
                  <div key={item.label} className="space-y-0.5">
                    <p className="text-[11px] text-muted-foreground">{item.label}</p>
                    <p className="font-medium text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </MasterDrawerSection>

            <MasterDrawerSection title="Pricing Rule">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "State", value: active.state },
                  { label: "Customer Type", value: active.customerType },
                  { label: "Cost Price", value: formatIndianRupeeDisplay(active.costPrice) },
                  {
                    label: "Dealer Price",
                    value: formatIndianRupeeDisplay(
                      active.dealerPrice || getSellingPriceFromRecord(active),
                    ),
                  },
                  { label: "MRP", value: formatIndianRupeeDisplay(active.mrp) },
                  {
                    label: "Status",
                    value: active.status === "active" ? "Active" : "Inactive",
                  },
                ].map((item) => (
                  <div key={item.label} className="space-y-0.5">
                    <p className="text-[11px] text-muted-foreground">{item.label}</p>
                    <p className="font-medium text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </MasterDrawerSection>

            <MasterDrawerSection title="Audit Information">
              <div className="space-y-4">
                <AuditUserRow label="Created By" name={active.createdBy} />
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Created Date</p>
                  <p className="text-sm font-medium text-foreground font-mono">{active.createdAt}</p>
                </div>
                <AuditUserRow label="Updated By" name={active.updatedBy} />
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Updated Date</p>
                  <p className="text-sm font-medium text-foreground font-mono">{active.updatedAt}</p>
                </div>
              </div>
            </MasterDrawerSection>
          </>
        ),
      }
    : { title: "Pricing", basicInfo: [] };

  return (
    <ListingContainer
      title="Pricing Master"
      titleIcon={IndianRupee}
      metrics={
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MiniKPICard
            label="Total Price Rules"
            value={dashboardStats.totalRules}
            icon={ListChecks}
            accent
          />
          <MiniKPICard
            label="Active Prices"
            value={dashboardStats.activePrices}
            icon={CheckCircle2}
          />
          <MiniKPICard
            label="Expired Prices"
            value={dashboardStats.expiredPrices}
            icon={CalendarX}
          />
          <MiniKPICard
            label="Upcoming Prices"
            value={dashboardStats.upcomingPrices}
            icon={CalendarClock}
          />
          <MiniKPICard
            label="Bulk Price Lists"
            value={dashboardStats.bulkPriceLists}
            icon={Layers}
          />
        </div>
      }
    >
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-2.5 text-xs text-blue-900">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
        <p>
          Sales price will be picked based on Product + Customer Type + State.
          Sales Order integration will be handled later.
        </p>
      </div>

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
        onAdd={() => router.push("/masters/pricing/add")}
        addLabel="Add Pricing"
        onExport={handleExport}
        emptyMessage="pricing rules"
        searchPlaceholder="Search product code, name, supplier, SKU, or HSN..."
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
          sheetMode === "edit"
            ? (isActive) =>
                setForm((prev) => ({
                  ...prev,
                  status: isActive ? "active" : "inactive",
                }))
            : undefined
        }
        formContent={
          sheetMode === "edit" ? (
            <PricingFormFields
              form={form}
              onChange={setForm}
              errors={errors}
              productOptions={productOptions}
              mode="edit"
            />
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
                  <strong className="text-foreground">{deleteTarget.productName}</strong> will be
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
