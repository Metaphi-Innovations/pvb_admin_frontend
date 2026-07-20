"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Edit2,
  Eye,
  IndianRupee,
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
  apiPricingToForm,
  buildPricingUpdatePayload,
  formatIndianRupeeDisplay,
  getSellingPriceFromRecord,
  validatePricingForm,
  type PricingForm,
} from "./pricing-data";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { AuditUserRow, ListingStatusToggle, isActiveStatus } from "@/components/listing";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MiniKPICard } from "@/components/ui/KPICard";
import { MONEY_CELL_CLASS } from "@/lib/accounts/money-format";
import {
  useCustomerTypeDropdown,
  useExportPricing,
  usePricing,
  usePricingList,
  usePricingSummary,
  usePricingFilterDropdown,
  useTogglePricingStatus,
  useUpdatePricing,
  PricingListService,
} from "@/hooks/masters";
import type { PricingListRecord } from "@/services/pricing-list.service";
import {
  MASTER_FILTER_FIELD_MAPS,
  mergeListRequestFilters,
  resolveListStatus,
} from "@/lib/masters/list-api-filters";
import { useAppliedListFilters } from "@/lib/masters/use-applied-list-filters";
import { useLazyFilterColumns } from "@/lib/masters/use-lazy-filter-columns";
import { getMasterListErrorMessage, getErrorMessage } from "@/lib/masters/master-query-errors";
import { sortStateToOrdering } from "@/services/pricing-list.service";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";

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
  const {
    draftFilters: filters,
    setDraftFilters: setFilters,
    appliedFilters,
    applyFilters,
    appliedSearch,
  } = useAppliedListFilters();
  const { handleOpenFilter, isFilterOpen } = useLazyFilterColumns();
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [sheetMode, setSheetMode] = useState<"edit" | "view" | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [active, setActive] = useState<PricingListRecord | null>(null);
  const [form, setForm] = useState<PricingForm>(DEFAULT_PRICING_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<PricingListRecord | null>(null);

  const ordering = useMemo(
    () => sortStateToOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );

  const apiFilters = useMemo(
    () => mergeListRequestFilters(appliedFilters, MASTER_FILTER_FIELD_MAPS.pricing),
    [appliedFilters],
  );

  const listStatus = useMemo(
    () => resolveListStatus(appliedFilters),
    [appliedFilters],
  );

  const listParams = useMemo<MasterListKeyParams>(
    () => ({
      page,
      pageSize,
      search: appliedSearch,
      status: listStatus,
      apiFilters,
      ordering,
    }),
    [page, pageSize, appliedSearch, listStatus, apiFilters, ordering],
  );

  const listQuery = usePricingList(listParams);
  const summaryQuery = usePricingSummary();
  const detailQuery = usePricing(viewId);
  const { data: customerTypes = [] } = useCustomerTypeDropdown();
  const updateMutation = useUpdatePricing();
  const toggleStatusMutation = useTogglePricingStatus();
  const exportMutation = useExportPricing();

  const productNameOptionsQuery = usePricingFilterDropdown("product__product_name", {
    enabled: isFilterOpen("productName"),
  });
  const productCodeOptionsQuery = usePricingFilterDropdown("product__product_code", {
    enabled: isFilterOpen("productCode"),
  });
  const supplierNameOptionsQuery = usePricingFilterDropdown("product__supplier__supplier_name", {
    enabled: isFilterOpen("supplierName"),
  });
  const supplierCodeOptionsQuery = usePricingFilterDropdown("product__supplier_code", {
    enabled: isFilterOpen("supplierCode"),
  });
  const stateOptionsQuery = usePricingFilterDropdown("state_name", {
    enabled: isFilterOpen("state"),
  });
  const customerTypeOptionsQuery = usePricingFilterDropdown("customer_type__customer_type_name", {
    enabled: isFilterOpen("customerType"),
  });
  const categoryOptionsQuery = usePricingFilterDropdown("product__category__categoryName", {
    enabled: isFilterOpen("category"),
  });
  const segmentOptionsQuery = usePricingFilterDropdown("product__segment__segment_name", {
    enabled: isFilterOpen("segment"),
  });
  const packSizeOptionsQuery = usePricingFilterDropdown("product__pack_size", {
    enabled: isFilterOpen("packSize"),
  });
  const unitOptionsQuery = usePricingFilterDropdown("product__unit", {
    enabled: isFilterOpen("unit"),
  });
  const gstPctOptionsQuery = usePricingFilterDropdown("product__gst_rate__gstPercentage", {
    enabled: isFilterOpen("gstPct"),
  });
  const dealerPriceOptionsQuery = usePricingFilterDropdown("dealer_price", {
    enabled: isFilterOpen("dealerPrice"),
  });
  const mrpOptionsQuery = usePricingFilterDropdown("product__mrp", {
    enabled: isFilterOpen("mrp"),
  });
  const statusOptionsQuery = usePricingFilterDropdown("is_active", {
    enabled: isFilterOpen("status"),
  });

  const productNameOptions = useMemo(
    () => productNameOptionsQuery.data ?? [],
    [productNameOptionsQuery.data],
  );
  const productCodeOptions = useMemo(
    () => productCodeOptionsQuery.data ?? [],
    [productCodeOptionsQuery.data],
  );
  const supplierNameOptions = useMemo(
    () => supplierNameOptionsQuery.data ?? [],
    [supplierNameOptionsQuery.data],
  );
  const supplierCodeOptions = useMemo(
    () => supplierCodeOptionsQuery.data ?? [],
    [supplierCodeOptionsQuery.data],
  );
  const stateOptions = useMemo(
    () => stateOptionsQuery.data ?? [],
    [stateOptionsQuery.data],
  );
  const customerTypeFilterOptions = useMemo(
    () => customerTypeOptionsQuery.data ?? [],
    [customerTypeOptionsQuery.data],
  );
  const categoryOptions = useMemo(
    () => categoryOptionsQuery.data ?? [],
    [categoryOptionsQuery.data],
  );
  const segmentOptions = useMemo(
    () => segmentOptionsQuery.data ?? [],
    [segmentOptionsQuery.data],
  );
  const packSizeOptions = useMemo(
    () => packSizeOptionsQuery.data ?? [],
    [packSizeOptionsQuery.data],
  );
  const unitOptions = useMemo(
    () => unitOptionsQuery.data ?? [],
    [unitOptionsQuery.data],
  );
  const gstPctOptions = useMemo(
    () => gstPctOptionsQuery.data ?? [],
    [gstPctOptionsQuery.data],
  );
  const dealerPriceOptions = useMemo(
    () => dealerPriceOptionsQuery.data ?? [],
    [dealerPriceOptionsQuery.data],
  );
  const mrpOptions = useMemo(
    () => mrpOptionsQuery.data ?? [],
    [mrpOptionsQuery.data],
  );
  const statusOptions = useMemo(
    () =>
      statusOptionsQuery.data?.length
        ? statusOptionsQuery.data
        : [
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ],
    [statusOptionsQuery.data],
  );

  const customerTypeOptions = useMemo(
    () =>
      customerTypes.map((item) => ({
        value: item.customerType,
        label: item.customerType,
      })),
    [customerTypes],
  );

  const customerTypeIdByName = useMemo(
    () =>
      Object.fromEntries(
        customerTypes.map((item) => [item.customerType, item.id]),
      ),
    [customerTypes],
  );

  const records = listQuery.data?.items ?? [];
  const totalRecords = listQuery.data?.total ?? 0;
  const loading = listQuery.isFetching;
  const viewLoading = Boolean(viewId) && detailQuery.isFetching;

  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, {
        resource: "pricing rules",
        notFoundMessage: "Pricing list endpoint not found.",
        serverMessage: "Server error while loading pricing rules.",
      })
    : null;

  const dashboardStats = useMemo(
    () => ({
      totalRules: summaryQuery.data?.totalRecords ?? 0,
      activePrices: summaryQuery.data?.activeRecords ?? 0,
      expiredPrices: summaryQuery.data?.inactiveRecords ?? 0,
      upcomingPrices: summaryQuery.data?.uniqueStates ?? 0,
      bulkPriceLists: summaryQuery.data?.bulkPriceLists ?? 0,
    }),
    [summaryQuery.data],
  );

  useEffect(() => {
    setPage(1);
  }, [appliedSearch, apiFilters, pageSize, sort.key, sort.direction]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!viewId) return;
    if (detailQuery.isError) {
      setToast({
        msg: getErrorMessage(detailQuery.error, "Failed to load pricing details."),
        type: "error",
      });
      setViewId(null);
      return;
    }
    if (detailQuery.data) {
      setActive(detailQuery.data);
      setForm(apiPricingToForm(detailQuery.data));
      setSheetMode("view");
    }
  }, [viewId, detailQuery.data, detailQuery.isError, detailQuery.error]);

  const handleFilterChange = (next: FilterState) => {
    setFilters(next);
    applyFilters(next);
    setPage(1);
  };

  const toggleStatus = (record: PricingListRecord) => {
    const nextActive = record.status !== "active";
    toggleStatusMutation.mutate(
      { id: record.pricingUuid, isActive: nextActive },
      {
        onSuccess: () =>
          setToast({
            msg: `Pricing status updated to ${nextActive ? "Active" : "Inactive"}`,
            type: "success",
          }),
        onError: (error) =>
          setToast({
            msg: getErrorMessage(error, "Failed to update pricing status."),
            type: "error",
          }),
      },
    );
  };

  const columns: ColumnConfig<PricingListRecord>[] = useMemo(
    () => [
      {
        key: "productCode",
        header: "Product Code",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: productCodeOptions,
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
        filterType: "dropdown",
        filterOptions: productNameOptions,
        width: "170px",
        render: (_val, row) => (
          <span className="text-xs font-medium text-foreground">{row.productName}</span>
        ),
      },
      {
        key: "supplierName",
        header: "Supplier Name",
        sortable: false,
        filterable: true,
        filterType: "dropdown",
        filterOptions: supplierNameOptions,
        width: "140px",
        render: (_val, row) => <span className="text-xs">{row.supplierName || "—"}</span>,
      },
      {
        key: "supplierCode",
        header: "Supplier Code",
        sortable: false,
        filterable: true,
        filterType: "dropdown",
        filterOptions: supplierCodeOptions,
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
        filterOptions: stateOptions,
        width: "120px",
        render: (_val, row) => <span className="text-xs">{row.state || "—"}</span>,
      },
      {
        key: "customerType",
        header: "Customer Type",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: customerTypeFilterOptions,
        width: "110px",
        render: (_val, row) => <span className="text-xs">{row.customerType}</span>,
      },
      {
        key: "category",
        header: "Category",
        sortable: false,
        filterable: true,
        filterType: "dropdown",
        filterOptions: categoryOptions,
        width: "100px",
        render: (_val, row) => <span className="text-xs">{row.category || "—"}</span>,
      },
      {
        key: "segment",
        header: "Segment",
        sortable: false,
        filterable: true,
        filterType: "dropdown",
        filterOptions: segmentOptions,
        width: "100px",
        render: (_val, row) => <span className="text-xs">{row.segment || "—"}</span>,
      },
      {
        key: "packSize",
        header: "Pack Size",
        sortable: false,
        filterable: true,
        filterType: "dropdown",
        filterOptions: packSizeOptions,
        width: "90px",
        render: (_val, row) => <span className="text-xs">{row.packSize || "—"}</span>,
      },
      {
        key: "unit",
        header: "Unit",
        sortable: false,
        filterable: true,
        filterType: "dropdown",
        filterOptions: unitOptions,
        width: "80px",
        render: (_val, row) => (
          <span className="text-xs">{row.unit || row.mou || row.baseUnit || "—"}</span>
        ),
      },
      {
        key: "gstPct",
        header: "GST %",
        sortable: false,
        filterable: true,
        filterType: "dropdown",
        filterOptions: gstPctOptions,
        width: "70px",
        render: (_val, row) => <span className="text-xs">{row.gstPct || "—"}</span>,
      },
      {
        key: "dealerPrice",
        header: "Dealer Price",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: dealerPriceOptions,
        width: "110px",
        align: "right",
        render: (_val, row) => (
          <MoneyCell value={row.dealerPrice || getSellingPriceFromRecord(row)} />
        ),
      },
      {
        key: "mrp",
        header: "MRP",
        sortable: false,
        filterable: true,
        filterType: "dropdown",
        filterOptions: mrpOptions,
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
        filterOptions: statusOptions,
        width: "100px",
        render: (_val, row) => (
          <ListingStatusToggle
            active={isActiveStatus(row.status)}
            onChange={() => toggleStatus(row)}
          />
        ),
      },
    ],
    [
      productNameOptions,
      productCodeOptions,
      supplierNameOptions,
      supplierCodeOptions,
      stateOptions,
      customerTypeFilterOptions,
      categoryOptions,
      segmentOptions,
      packSizeOptions,
      unitOptions,
      gstPctOptions,
      dealerPriceOptions,
      mrpOptions,
      statusOptions,
    ],
  );

  const actions: ActionItemConfig<PricingListRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => openView(row),
      disabled: () => viewLoading,
    },
    { label: "Edit", action: "edit", icon: Edit2, onClick: (row) => openEdit(row) },
    {
      label: "Delete",
      action: "delete",
      icon: Trash2,
      variant: "destructive",
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  const openEdit = (row: PricingListRecord) => {
    setViewId(null);
    setForm(apiPricingToForm(row));
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = useCallback((row: PricingListRecord) => {
    if (!row.pricingUuid) {
      setToast({ msg: "Pricing id missing. Unable to load details.", type: "error" });
      return;
    }
    setViewId(row.pricingUuid);
  }, []);

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setViewId(null);
    setErrors({});
  };

  const persist = () => {
    if (!active) return;
    const fieldErrors = validatePricingForm(form, [], active.id);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    updateMutation.mutate(
      {
        id: active.pricingUuid,
        payload: buildPricingUpdatePayload(form, active, customerTypeIdByName),
      },
      {
        onSuccess: () => {
          setToast({ msg: "Pricing rule updated successfully", type: "success" });
          closeSheet();
        },
        onError: (error) =>
          setToast({
            msg: getErrorMessage(error, "Failed to update pricing rule."),
            type: "error",
          }),
      },
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    toggleStatusMutation.mutate(
      { id: deleteTarget.pricingUuid, isActive: false },
      {
        onSuccess: () => {
          setDeleteTarget(null);
          setToast({
            msg: `"${deleteTarget.productName}" marked as inactive`,
            type: "success",
          });
        },
        onError: (error) => {
          setDeleteTarget(null);
          setToast({
            msg: getErrorMessage(error, "Failed to deactivate pricing rule."),
            type: "error",
          });
        },
      },
    );
  };

  const handleExport = () => {
    exportMutation.mutate(
      {
        search: appliedSearch,
        status: listStatus,
        ordering,
        apiFilters,
      },
      {
        onSuccess: () =>
          setToast({ msg: "Pricing records exported successfully", type: "success" }),
        onError: (error) =>
          setToast({
            msg: PricingListService.extractErrorMessage(error, "Failed to export pricing records."),
            type: "error",
          }),
      },
    );
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
                  {
                    label: "Unit",
                    value: active.unit || active.mou || active.baseUnit || "—",
                  },
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
                  {
                    label: "Cost Price",
                    value:
                      active.costPrice > 0
                        ? formatIndianRupeeDisplay(active.costPrice)
                        : "—",
                  },
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
      {listError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {listError}
        </div>
      )}

      <MasterListing<PricingListRecord>
        columns={columns}
        data={records}
        loading={loading}
        totalRecords={totalRecords}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={setSort}
        onFilterChange={handleFilterChange}
        actions={actions}
        onAdd={() => router.push("/masters/pricing/add")}
        addLabel="Add Pricing"
        onExport={handleExport}
        emptyMessage="pricing rules"
        searchPlaceholder="Search product, supplier, category, segment, state..."
        currentFilters={filters}
        currentSort={sort}
        onOpenFilter={handleOpenFilter}
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
              productOptions={[]}
              customerTypeOptions={customerTypeOptions}
              mode="edit"
              onClearError={(key) =>
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next[key];
                  return next;
                })
              }
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
              disabled={toggleStatusMutation.isPending}
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
