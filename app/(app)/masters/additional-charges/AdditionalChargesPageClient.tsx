"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Eye,
  Receipt,
  X,
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
import { MasterDrawerSection } from "@/components/masters/MasterRecordDrawer";
import {
  additionalChargeToForm,
  formatGstApplicableLabel,
  formatGstRateDisplay,
  formatLedgerDisplay,
  toAdditionalChargeRecord,
  type AdditionalChargeRecord,
} from "./additional-charge-data";
import {
  AdditionalChargeForm,
  DEFAULT_ADDITIONAL_CHARGE_FORM,
  type AdditionalChargeFormValues,
  validateAdditionalChargeForm,
} from "./components/AdditionalChargeForm";
import {
  useAdditionalCharges,
  useAdditionalCharge,
  useCreateAdditionalCharge,
  useUpdateAdditionalCharge,
  useToggleAdditionalChargeStatus,
  useExportAdditionalCharges,
  useAdditionalChargeFilterDropdown,
  useGstDropdown,
  useHsnDropdown,
} from "@/hooks/masters";
import {
  MASTER_FILTER_FIELD_MAPS,
  mergeListRequestFilters,
  resolveListStatus,
} from "@/lib/masters/list-api-filters";
import { useAppliedListFilters } from "@/lib/masters/use-applied-list-filters";
import { useLazyFilterColumns } from "@/lib/masters/use-lazy-filter-columns";
import {
  getErrorMessage,
  getMasterListErrorMessage,
} from "@/lib/masters/master-query-errors";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";
import { sortStateToOrdering } from "@/services/additional-charge-list.service";
import { MasterListing } from "@/components/listing/MasterListing";
import {
  ColumnConfig,
  SortState,
  ActionItemConfig,
} from "@/components/listing/types";
import {
  ListingAuditCell,
  AuditUserRow,
  ListingStatusToggle,
  isActiveStatus,
} from "@/components/listing";

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

function buildCreatePayload(form: AdditionalChargeFormValues) {
  return {
    charge_name: form.chargeName.trim(),
    charge_code: null,
    gst_applicable: true as const,
    default_gst_rate_id: form.defaultGstRateId.trim() || null,
    hsn_id: form.hsnId.trim() || null,
    hsn_sac_code: form.hsnSacCode.trim() || null,
    description: form.description.trim() || null,
    ledger_name: form.ledgerName.trim() || null,
  };
}

function buildUpdatePayload(form: AdditionalChargeFormValues) {
  return {
    charge_name: form.chargeName.trim(),
    gst_applicable: true as const,
    default_gst_rate_id: form.defaultGstRateId.trim() || null,
    hsn_id: form.hsnId.trim() || null,
    hsn_sac_code: form.hsnSacCode.trim() || null,
    description: form.description.trim() || null,
  };
}

export default function AdditionalChargesPageClient() {
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
  const [viewId, setViewId] = useState<string | null>(null);

  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<AdditionalChargeRecord | null>(null);
  const [form, setForm] = useState<AdditionalChargeFormValues>(
    DEFAULT_ADDITIONAL_CHARGE_FORM,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<AdditionalChargeRecord | null>(
    null,
  );

  const ordering = useMemo(
    () => sortStateToOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );
  const apiFilters = useMemo(
    () =>
      mergeListRequestFilters(appliedFilters, MASTER_FILTER_FIELD_MAPS.additionalCharge),
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

  const listQuery = useAdditionalCharges(listParams);
  const detailQuery = useAdditionalCharge(viewId);
  const createMutation = useCreateAdditionalCharge();
  const updateMutation = useUpdateAdditionalCharge();
  const toggleStatusMutation = useToggleAdditionalChargeStatus();
  const exportMutation = useExportAdditionalCharges();
  const gstDropdownQuery = useGstDropdown();
  const hsnDropdownQuery = useHsnDropdown();

  const chargeCodeOptionsQuery = useAdditionalChargeFilterDropdown("charge_code", {
    enabled: isFilterOpen("chargeCode"),
  });
  const chargeNameOptionsQuery = useAdditionalChargeFilterDropdown("charge_name", {
    enabled: isFilterOpen("chargeName"),
  });
  const hsnOptionsQuery = useAdditionalChargeFilterDropdown("hsn_sac_code", {
    enabled: isFilterOpen("hsnSacCode"),
  });
  const descriptionOptionsQuery = useAdditionalChargeFilterDropdown("description", {
    enabled: isFilterOpen("description"),
  });
  const gstApplicableOptionsQuery = useAdditionalChargeFilterDropdown(
    "gst_applicable",
    { enabled: isFilterOpen("gstApplicable") },
  );
  const statusOptionsQuery = useAdditionalChargeFilterDropdown("is_active", {
    enabled: isFilterOpen("status"),
  });

  const chargeCodeOptions = useMemo(
    () => chargeCodeOptionsQuery.data ?? [],
    [chargeCodeOptionsQuery.data],
  );
  const chargeNameOptions = useMemo(
    () => chargeNameOptionsQuery.data ?? [],
    [chargeNameOptionsQuery.data],
  );
  const hsnOptions = useMemo(
    () => hsnOptionsQuery.data ?? [],
    [hsnOptionsQuery.data],
  );
  const descriptionOptions = useMemo(
    () => descriptionOptionsQuery.data ?? [],
    [descriptionOptionsQuery.data],
  );
  const gstApplicableOptions = useMemo(() => {
    if (gstApplicableOptionsQuery.data?.length) return gstApplicableOptionsQuery.data;
    return [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ];
  }, [gstApplicableOptionsQuery.data]);
  const statusOptions = useMemo(() => {
    if (statusOptionsQuery.data?.length) return statusOptionsQuery.data;
    return [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ];
  }, [statusOptionsQuery.data]);

  const gstSelectOptions = useMemo(
    () =>
      (gstDropdownQuery.data ?? [])
        .slice()
        .sort((a, b) => a.gstPercentage - b.gstPercentage)
        .map((g) => ({
          value: g.id,
          label: g.remark
            ? `${g.gstPercentage}% — ${g.remark}`
            : `${g.gstPercentage}%`,
        })),
    [gstDropdownQuery.data],
  );

  const hsnSelectOptions = useMemo(
    () =>
      (hsnDropdownQuery.data ?? []).map((h) => ({
        value: h.id,
        label: h.hsnDescription
          ? `${h.hsnCode} — ${h.hsnDescription}`
          : h.hsnCode,
        hsnCode: h.hsnCode,
        gstId: h.gstId,
      })),
    [hsnDropdownQuery.data],
  );

  const records = useMemo(
    () => (listQuery.data?.items ?? []).map(toAdditionalChargeRecord),
    [listQuery.data],
  );
  const totalRecords = listQuery.data?.total ?? 0;
  const loading = listQuery.isFetching;
  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, {
        resource: "additional charges",
      })
    : null;
  const viewLoading = Boolean(viewId) && detailQuery.isFetching;
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [appliedSearch, apiFilters, pageSize, sort.key, sort.direction]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(totalRecords / pageSize) || 1);
    if (page > maxPage) setPage(maxPage);
  }, [totalRecords, pageSize, page]);

  useEffect(() => {
    if (!viewId) return;
    if (detailQuery.isError) {
      setToast({
        msg: getErrorMessage(
          detailQuery.error,
          "Failed to load additional charge details.",
        ),
        type: "error",
      });
      setViewId(null);
      return;
    }
    if (detailQuery.data) {
      setActive(toAdditionalChargeRecord(detailQuery.data));
      setSheetMode("view");
    }
  }, [viewId, detailQuery.data, detailQuery.isError, detailQuery.error]);

  const requestStatusToggle = (record: AdditionalChargeRecord) => {
    setStatusTarget(record);
  };

  const confirmStatusChange = () => {
    const id = statusTarget?.id;
    if (!statusTarget || !id) {
      setToast({
        msg: "Additional charge id missing. Unable to update status.",
        type: "error",
      });
      setStatusTarget(null);
      return;
    }

    const nextActive = !isActiveStatus(statusTarget.status);

    toggleStatusMutation.mutate(
      { id, isActive: nextActive },
      {
        onSuccess: () => {
          setToast({
            msg: `Additional charge status updated to ${nextActive ? "Active" : "Inactive"}`,
            type: "success",
          });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(
              error,
              "Failed to update additional charge status.",
            ),
            type: "error",
          });
        },
        onSettled: () => {
          setStatusTarget(null);
        },
      },
    );
  };

  const openAdd = () => {
    setForm({ ...DEFAULT_ADDITIONAL_CHARGE_FORM });
    setErrors({});
    setFormError(null);
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: AdditionalChargeRecord) => {
    setForm(additionalChargeToForm(row));
    setErrors({});
    setFormError(null);
    setActive(row);
    setSheetMode("edit");
  };

  const openView = useCallback((row: AdditionalChargeRecord) => {
    if (!row.id) {
      setToast({
        msg: "Additional charge id missing. Unable to load details.",
        type: "error",
      });
      return;
    }
    setViewId(row.id);
  }, []);

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setViewId(null);
    setErrors({});
    setFormError(null);
  };

  const columns: ColumnConfig<AdditionalChargeRecord>[] = useMemo(
    () => [
      {
        key: "chargeCode",
        header: "Charge Code",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: chargeCodeOptions,
        width: "120px",
        render: (_val, row) => (
          <span className="text-xs font-mono text-foreground">
            {row.chargeCode || "—"}
          </span>
        ),
      },
      {
        key: "chargeName",
        header: "Charge Name",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: chargeNameOptions,
        width: "200px",
        render: (_val, row) => (
          <button
            type="button"
            onClick={() => openView(row)}
            className="text-xs font-semibold text-brand-700 hover:underline text-left"
          >
            {row.chargeName}
          </button>
        ),
      },
      {
        key: "ledgerName",
        header: "Ledger",
        sortable: false,
        filterable: false,
        width: "200px",
        render: (_val, row) => (
          <span className="text-xs text-muted-foreground">
            {formatLedgerDisplay(row.ledgerCode, row.ledgerName)}
          </span>
        ),
      },
      {
        key: "gstApplicable",
        header: "GST Applicable",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: gstApplicableOptions,
        width: "120px",
        render: (_val, row) => (
          <span className="text-xs text-foreground">
            {formatGstApplicableLabel(row.gstApplicable)}
          </span>
        ),
      },
      {
        key: "defaultGstRate",
        header: "GST %",
        sortable: false,
        filterable: false,
        width: "90px",
        render: (_val, row) => (
          <span className="text-xs font-medium text-foreground">
            {row.gstApplicable ? formatGstRateDisplay(row.defaultGstRate) : "—"}
          </span>
        ),
      },
      {
        key: "hsnSacCode",
        header: "HSN/SAC",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: hsnOptions,
        width: "110px",
        render: (_val, row) => (
          <span className="text-xs font-mono text-muted-foreground">
            {row.hsnSacCode || "—"}
          </span>
        ),
      },
      {
        key: "description",
        header: "Description",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: descriptionOptions,
        width: "200px",
        render: (_val, row) => (
          <span className="text-xs text-muted-foreground line-clamp-2">
            {row.description || "—"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: statusOptions,
        width: "120px",
        render: (_val, row) => (
          <ListingStatusToggle
            active={isActiveStatus(row.status)}
            onChange={() => requestStatusToggle(row)}
          />
        ),
      },
      {
        key: "createdBy",
        header: "Created",
        sortable: true,
        filterable: true,
        filterType: "date",
        width: "120px",
        render: (_val, row) => (
          <ListingAuditCell
            name={row.createdBy}
            date={row.createdAt}
            variant="created"
          />
        ),
      },
      {
        key: "updatedBy",
        header: "Updated",
        sortable: true,
        filterable: true,
        filterType: "date",
        width: "120px",
        render: (_val, row) => (
          <ListingAuditCell
            name={row.updatedBy}
            date={row.updatedAt}
            variant="updated"
          />
        ),
      },
    ],
    [
      chargeCodeOptions,
      chargeNameOptions,
      gstApplicableOptions,
      hsnOptions,
      descriptionOptions,
      statusOptions,
      openView,
    ],
  );

  const actions: ActionItemConfig<AdditionalChargeRecord>[] = [
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

  const persist = () => {
    const fieldErrors = validateAdditionalChargeForm(
      form,
      sheetMode === "edit" ? "edit" : "add",
    );
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    if (sheetMode === "add") {
      setFormError(null);
      createMutation.mutate(buildCreatePayload(form), {
        onSuccess: () => {
          setToast({
            msg: "Additional charge added successfully",
            type: "success",
          });
          setPage(1);
          closeSheet();
        },
        onError: (error) => {
          setFormError(
            getErrorMessage(error, "Failed to create additional charge."),
          );
        },
      });
      return;
    }

    if (!active?.id) {
      setFormError("Additional charge id missing. Unable to update.");
      return;
    }

    setFormError(null);
    updateMutation.mutate(
      { id: active.id, payload: buildUpdatePayload(form) },
      {
        onSuccess: () => {
          setToast({
            msg: "Additional charge updated successfully",
            type: "success",
          });
          closeSheet();
        },
        onError: (error) => {
          setFormError(
            getErrorMessage(error, "Failed to update additional charge."),
          );
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
        onSuccess: () => {
          setToast({
            msg: "Additional charges exported successfully",
            type: "success",
          });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to export additional charges"),
            type: "error",
          });
        },
      },
    );
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add Additional Charge"
      : sheetMode === "edit"
        ? "Edit Additional Charge"
        : "View Additional Charge";

  const viewDrawer = active
    ? {
        title: active.chargeName,
        subtitle: active.chargeCode || "Additional charge details",
        status: active.status,
        basicInfo: [
          { label: "Charge Code", value: active.chargeCode || "—" },
          {
            label: "Ledger",
            value: formatLedgerDisplay(active.ledgerCode, active.ledgerName),
          },
          {
            label: "GST Applicable",
            value: formatGstApplicableLabel(active.gstApplicable),
          },
          {
            label: "Default GST %",
            value: active.gstApplicable
              ? formatGstRateDisplay(active.defaultGstRate)
              : "—",
          },
          { label: "HSN/SAC", value: active.hsnSacCode || "—" },
          {
            label: "Description",
            value: active.description?.trim() ? active.description : "—",
          },
        ],
        showDescription: false,
        children: (
          <MasterDrawerSection title="Audit Information">
            <div className="space-y-4">
              <AuditUserRow label="Created By" name={active.createdBy} />
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Created Date</p>
                <p className="text-sm font-medium text-foreground font-mono">
                  {active.createdAt || "—"}
                </p>
              </div>
              <AuditUserRow label="Updated By" name={active.updatedBy} />
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Updated Date</p>
                <p className="text-sm font-medium text-foreground font-mono">
                  {active.updatedAt || "—"}
                </p>
              </div>
            </div>
          </MasterDrawerSection>
        ),
      }
    : { title: "Additional Charge", basicInfo: [] };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Additional Charge Master
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage recovery charges used in procurement and invoicing
          </p>
        </div>

        {listError ? <p className="text-xs text-red-600">{listError}</p> : null}

        <MasterListing<AdditionalChargeRecord>
          columns={columns}
          data={records}
          loading={loading}
          totalRecords={totalRecords}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={(next) => {
            setFilters(next);
            applyFilters(next);
          }}
          actions={actions}
          onAdd={openAdd}
          onExport={handleExport}
          addLabel="Add Additional Charge"
          emptyMessage="additional charges"
          searchPlaceholder="Search additional charge..."
          currentFilters={filters}
          currentSort={sort}
          onOpenFilter={handleOpenFilter}
        />
      </div>

      <MasterListingSheets
        sheetMode={sheetMode}
        active={active}
        onClose={closeSheet}
        onEdit={() => active && openEdit(active)}
        onSave={persist}
        sheetTitle={sheetTitle}
        icon={Receipt}
        formError={formError ?? undefined}
        saving={saving}
        hideFormDescription
        viewDrawer={viewDrawer}
        formContent={
          sheetMode !== "view" ? (
            <AdditionalChargeForm
              form={form}
              onChange={setForm}
              errors={errors}
              onClearError={(key: string) =>
                setErrors((prev) => {
                  const copy = { ...prev };
                  delete copy[key];
                  return copy;
                })
              }
              mode={sheetMode === "edit" ? "edit" : "add"}
              hsnOptions={hsnSelectOptions}
              hsnLoading={hsnDropdownQuery.isFetching}
              gstOptions={gstSelectOptions}
            />
          ) : null
        }
      />

      <Dialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              {statusTarget && isActiveStatus(statusTarget.status)
                ? "Deactivate Additional Charge?"
                : "Activate Additional Charge?"}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1 text-foreground">
              {statusTarget && (
                <>
                  <strong>{statusTarget.chargeName}</strong> will be marked as{" "}
                  {isActiveStatus(statusTarget.status) ? "inactive" : "active"}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setStatusTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs text-white bg-brand-600 hover:bg-brand-700"
              onClick={confirmStatusChange}
              disabled={toggleStatusMutation.isPending}
            >
              {toggleStatusMutation.isPending ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
