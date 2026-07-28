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
  FileText,
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
  documentTypeToForm,
  toDocumentTypeRecord,
  type DocumentTypeRecord,
} from "./document-type-data";
import {
  DocumentTypeForm,
  DEFAULT_DOCUMENT_TYPE_FORM,
  type DocumentTypeFormValues,
  validateDocumentTypeForm,
} from "./components/DocumentTypeForm";
import {
  useDocumentTypes,
  useDocumentType,
  useCreateDocumentType,
  useUpdateDocumentType,
  useToggleDocumentTypeStatus,
  useExportDocumentTypes,
  useDocumentTypeFilterDropdown,
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
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, SortState, ActionItemConfig } from "@/components/listing/types";
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

export default function DocumentTypesPage() {
  const {
    draftFilters: filters,
    setDraftFilters: setFilters,
    appliedFilters,
    applyFilters,
    appliedSearch,
  } = useAppliedListFilters();
  const { handleOpenFilter, isFilterOpen } = useLazyFilterColumns();
  const [sort, setSort] = useState<SortState>({ key: "title", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<DocumentTypeRecord | null>(null);
  const [form, setForm] = useState<DocumentTypeFormValues>(DEFAULT_DOCUMENT_TYPE_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<DocumentTypeRecord | null>(null);

  const apiFilters = useMemo(
    () => mergeListRequestFilters(appliedFilters, MASTER_FILTER_FIELD_MAPS.documentType),
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
    }),
    [page, pageSize, appliedSearch, listStatus, apiFilters],
  );

  const listQuery = useDocumentTypes(listParams);
  const detailQuery = useDocumentType(viewId);
  const createMutation = useCreateDocumentType();
  const updateMutation = useUpdateDocumentType();
  const toggleStatusMutation = useToggleDocumentTypeStatus();
  const exportMutation = useExportDocumentTypes();

  const titleOptionsQuery = useDocumentTypeFilterDropdown("title", { enabled: isFilterOpen("title") });
  const descriptionOptionsQuery = useDocumentTypeFilterDropdown("description", {
    enabled: isFilterOpen("description"),
  });
  const statusOptionsQuery = useDocumentTypeFilterDropdown("is_active", {
    enabled: isFilterOpen("status"),
  });
  const createdByOptionsQuery = useDocumentTypeFilterDropdown("created_by_user__username", {
    enabled: isFilterOpen("createdBy"),
  });
  const updatedByOptionsQuery = useDocumentTypeFilterDropdown("updated_by_user__username", {
    enabled: isFilterOpen("updatedBy"),
  });

  const titleOptions = useMemo(() => titleOptionsQuery.data ?? [], [titleOptionsQuery.data]);
  const descriptionOptions = useMemo(
    () => descriptionOptionsQuery.data ?? [],
    [descriptionOptionsQuery.data],
  );
  const statusOptions = useMemo(() => {
    if (statusOptionsQuery.data?.length) return statusOptionsQuery.data;
    return [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ];
  }, [statusOptionsQuery.data]);
  const createdByOptions = useMemo(
    () => createdByOptionsQuery.data ?? [],
    [createdByOptionsQuery.data],
  );
  const updatedByOptions = useMemo(
    () => updatedByOptionsQuery.data ?? [],
    [updatedByOptionsQuery.data],
  );

  const records = useMemo(
    () => (listQuery.data?.items ?? []).map(toDocumentTypeRecord),
    [listQuery.data],
  );
  const totalRecords = listQuery.data?.total ?? 0;
  const loading = listQuery.isFetching;
  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, { resource: "document types" })
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
    if (!viewId) return;
    if (detailQuery.isError) {
      setToast({
        msg: getErrorMessage(detailQuery.error, "Failed to load document type details."),
        type: "error",
      });
      setViewId(null);
      return;
    }
    if (detailQuery.data) {
      setActive(toDocumentTypeRecord(detailQuery.data));
      setSheetMode("view");
    }
  }, [viewId, detailQuery.data, detailQuery.isError, detailQuery.error]);

  const requestStatusToggle = (record: DocumentTypeRecord) => {
    setStatusTarget(record);
  };

  const confirmStatusChange = () => {
    const id = statusTarget?.id;
    if (!statusTarget || !id) {
      setToast({ msg: "Document type id missing. Unable to update status.", type: "error" });
      setStatusTarget(null);
      return;
    }

    const nextActive = !isActiveStatus(statusTarget.status);

    toggleStatusMutation.mutate(id, {
      onSuccess: () => {
        setToast({
          msg: `Document type status updated to ${nextActive ? "Active" : "Inactive"}`,
          type: "success",
        });
      },
      onError: (error) => {
        setToast({
          msg: getErrorMessage(error, "Failed to update document type status."),
          type: "error",
        });
      },
      onSettled: () => {
        setStatusTarget(null);
      },
    });
  };

  const openAdd = () => {
    setForm({ ...DEFAULT_DOCUMENT_TYPE_FORM });
    setErrors({});
    setFormError(null);
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: DocumentTypeRecord) => {
    setForm(documentTypeToForm(row));
    setErrors({});
    setFormError(null);
    setActive(row);
    setSheetMode("edit");
  };

  const openView = useCallback((row: DocumentTypeRecord) => {
    if (!row.id) {
      setToast({ msg: "Document type id missing. Unable to load details.", type: "error" });
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

  const columns: ColumnConfig<DocumentTypeRecord>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: titleOptions,
      width: "280px",
      render: (_val, row) => (
        <button
          type="button"
          onClick={() => openView(row)}
          className="text-xs font-semibold text-brand-700 hover:underline text-left"
        >
          {row.title}
        </button>
      ),
    },
    {
      key: "description",
      header: "Description",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: descriptionOptions,
      width: "480px",
      render: (val, row) => row.description || "—",
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: statusOptions,
      width: "160px",
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
      filterType: "audit",
      auditUserOptions: createdByOptions,
      width: "120px",
      render: (_val, row) => (
        <ListingAuditCell name={row.createdBy} date={row.createdAt} variant="created" />
      ),
    },
    {
      key: "updatedBy",
      header: "Updated",
      sortable: true,
      filterable: true,
      filterType: "audit",
      auditUserOptions: updatedByOptions,
      width: "120px",
      render: (_val, row) => (
        <ListingAuditCell name={row.updatedBy} date={row.updatedAt} variant="updated" />
      ),
    },
  ];

  const actions: ActionItemConfig<DocumentTypeRecord>[] = [
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
      const aVal = String(a[sort.key as keyof DocumentTypeRecord] || "").toLowerCase();
      const bVal = String(b[sort.key as keyof DocumentTypeRecord] || "").toLowerCase();
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [records, sort]);

  const persist = () => {
    const fieldErrors = validateDocumentTypeForm(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    if (sheetMode === "add") {
      setFormError(null);
      createMutation.mutate(
        {
          title: form.title,
          description: form.description,
        },
        {
          onSuccess: () => {
            setToast({ msg: "Document type added successfully", type: "success" });
            setPage(1);
            closeSheet();
          },
          onError: (error) => {
            setFormError(getErrorMessage(error, "Failed to create document type."));
          },
        },
      );
      return;
    }

    if (!active?.id) {
      setFormError("Document type id missing. Unable to update.");
      return;
    }

    setFormError(null);
    updateMutation.mutate(
      {
        id: active.id,
        payload: {
          title: form.title,
          description: form.description,
        },
      },
      {
        onSuccess: () => {
          setToast({ msg: "Document type updated successfully", type: "success" });
          closeSheet();
        },
        onError: (error) => {
          setFormError(getErrorMessage(error, "Failed to update document type."));
        },
      },
    );
  };

  const handleExport = () => {
    exportMutation.mutate(
      {
        search: appliedSearch,
        status: listStatus,
        apiFilters,
      },
      {
        onSuccess: () => {
          setToast({ msg: "Document types exported successfully", type: "success" });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to export document types"),
            type: "error",
          });
        },
      },
    );
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add Document Type"
      : sheetMode === "edit"
        ? "Edit Document Type"
        : "View Document Type";

  const viewDrawer = active
    ? {
        title: active.title,
        subtitle: "Read-only document type details",
        status: active.status,
        basicInfo: [
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
    : { title: "Document Type", basicInfo: [] };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Document Type Master</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage required document types
          </p>
        </div>

        {listError ? <p className="text-xs text-red-600">{listError}</p> : null}

        <MasterListing<DocumentTypeRecord>
          columns={columns}
          data={displayRecords}
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
          addLabel="Add Document Type"
          emptyMessage="document types"
          searchPlaceholder="Search document type..."
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
        icon={FileText}
        formError={formError ?? undefined}
        saving={saving}
        viewDrawer={viewDrawer}
        formContent={
          sheetMode !== "view" ? (
            <DocumentTypeForm
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
                ? "Deactivate Document Type?"
                : "Activate Document Type?"}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1 text-foreground">
              {statusTarget && (
                <>
                  <strong>{statusTarget.title}</strong> will be marked as{" "}
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
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
