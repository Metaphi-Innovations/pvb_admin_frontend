"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import {
  Edit2,
  Eye,
  FileText,
  X,
} from "lucide-react";
import {
  DocumentTypeMaster,
} from "./document-type-data";
import {
  useDocumentTypes,
  useDocumentType,
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
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { MasterRecordDrawer, masterAuditFromRecord } from "@/components/masters/MasterRecordDrawer";
import { ListingAuditCell, ListingStatusToggle, isActiveStatus } from "@/components/listing";

function toDocumentTypeRow(item: {
  id: string;
  title: string;
  description: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}): DocumentTypeMaster {
  return {
    id: item.id,
    documentTypeCode: "",
    title: item.title,
    description: item.description,
    status: item.status,
    createdBy: item.createdBy || "—",
    createdDate: item.createdAt ? item.createdAt.slice(0, 10) : "",
    updatedBy: item.updatedBy || "—",
    updatedDate: item.updatedAt ? item.updatedAt.slice(0, 10) : "",
  };
}

export default function DocumentTypesPage() {
  const router = useRouter();
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

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [viewTarget, setViewTarget] = useState<DocumentTypeMaster | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

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
    () => (listQuery.data?.items ?? []).map(toDocumentTypeRow),
    [listQuery.data],
  );
  const totalRecords = listQuery.data?.total ?? 0;
  const loading = listQuery.isFetching;
  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, { resource: "document types" })
    : null;
  const viewLoading = Boolean(viewId) && detailQuery.isFetching;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

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
      setViewTarget(toDocumentTypeRow(detailQuery.data));
    }
  }, [viewId, detailQuery.data, detailQuery.isError, detailQuery.error]);

  const toggleStatus = useCallback(
    (record: DocumentTypeMaster) => {
      if (!record.id) {
        setToast({ msg: "Document type id missing. Unable to update status.", type: "error" });
        return;
      }
      toggleStatusMutation.mutate(record.id, {
        onSuccess: () => {
          setToast({
            msg: `Document type status updated to ${record.status === "Active" ? "Inactive" : "Active"}`,
            type: "success",
          });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to update document type status."),
            type: "error",
          });
        },
      });
    },
    [toggleStatusMutation],
  );

  const openView = useCallback((row: DocumentTypeMaster) => {
    if (!row.id) {
      setToast({ msg: "Document type id missing. Unable to load details.", type: "error" });
      return;
    }
    setViewId(row.id);
  }, []);

  const columns: ColumnConfig<DocumentTypeMaster>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: titleOptions,
      width: "280px",
      render: (val, row) => (
        <span className="text-xs font-semibold text-foreground">
          {row.title}
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
      auditUserOptions: createdByOptions,
      width: "120px",
      render: (val, row) => <ListingAuditCell name={row.createdBy} date={row.createdDate} variant="created" />,
    },
    {
      key: "updatedBy",
      header: "Updated",
      sortable: true,
      filterable: true,
      filterType: "audit",
      auditUserOptions: updatedByOptions,
      width: "120px",
      render: (val, row) => <ListingAuditCell name={row.updatedBy} date={row.updatedDate} variant="updated" />,
    },
  ];

  const actions: ActionItemConfig<DocumentTypeMaster>[] = [
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
      onClick: (row) => router.push(`/masters/document-types/${row.id}/edit`),
    },
  ];

  const displayRecords = useMemo(() => {
    if (!sort.key || sort.direction === "none") return records;
    return [...records].sort((a, b) => {
      const aVal = String(a[sort.key as keyof DocumentTypeMaster] || "").toLowerCase();
      const bVal = String(b[sort.key as keyof DocumentTypeMaster] || "").toLowerCase();
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [records, sort]);

    useEffect(() => {
    setPage(1);
  }, [appliedSearch, apiFilters, pageSize, sort.key, sort.direction]);

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

        <MasterListing<DocumentTypeMaster>
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
          onAdd={() => router.push("/masters/document-types/add")}
          onExport={handleExport}
          addLabel="Add Document Type"
          emptyMessage="document types"
          searchPlaceholder="Search document type..."
          currentFilters={filters}
          currentSort={sort}
          onOpenFilter={handleOpenFilter}
        />
      </div>

      {viewTarget && (
        <MasterRecordDrawer
          open={!!viewTarget}
          onOpenChange={(o) => {
            if (!o) {
              setViewTarget(null);
              setViewId(null);
            }
          }}
          onClose={() => {
            setViewTarget(null);
            setViewId(null);
          }}
          onEdit={() => {
            router.push(`/masters/document-types/${viewTarget.id}/edit`);
            setViewTarget(null);
            setViewId(null);
          }}
          title="Document Type"
          icon={FileText}
          status={viewTarget.status}
          basicInfo={[{ label: "Title", value: viewTarget.title }]}
          description={viewTarget.description}
          showDescription
          auditInfo={masterAuditFromRecord({
            createdBy: viewTarget.createdBy,
            createdDate: viewTarget.createdDate,
            updatedBy: viewTarget.updatedBy,
            updatedDate: viewTarget.updatedDate,
          })}
        />
      )}

      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            "animate-in slide-in-from-top-2 fade-in-0 duration-300",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          )}
        >
          {toast.msg}
          <button onClick={() => setToast(null)} className="flex-shrink-0 ml-1 opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </AppLayout>
  );
}
