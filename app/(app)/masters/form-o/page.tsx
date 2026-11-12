"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import {
  DEFAULT_MASTER_LIST_SORT,
  type ActionItemConfig,
  type ColumnConfig,
  type FilterState,
  type FilterValue,
  type SortState,
} from "@/components/listing/types";
import { useAppliedListFilters } from "@/lib/masters/use-applied-list-filters";
import { useLazyFilterColumns } from "@/lib/masters/use-lazy-filter-columns";
import {
  buildListApiFilters,
  type FieldMapper,
} from "@/lib/masters/list-api-filters";
import { cn } from "@/lib/utils";
import {
  Download,
  Edit2,
  Eye,
  FileText,
  Mail,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  downloadFormOPdf,
  getFormOFilterDropdown,
  listFormOs,
  type FormOFilterOption,
  type FormOListItem,
} from "@/services/form-o.service";
import { SendFormOEmailModal } from "./components/SendFormOEmailModal";
import { useFormOPermissions } from "./form-o-permissions";

const FORM_O_FILTER_FIELD_MAP: Record<string, FieldMapper> = {
  form_o_number: "form_o_number",
  issue_date: "issue_date",
  state_name: "state_name",
  purpose: "purpose",
  customer_name: (value: FilterValue) => {
    const values = Array.isArray(value)
      ? value.map(String).filter(Boolean)
      : value
        ? [String(value)]
        : [];
    if (!values.length) return null;
    return {
      customer: {
        customer_name: values.length === 1 ? values[0] : values,
      },
    };
  },
  needs_reissue: "needs_reissue",
};

const PURPOSE_FALLBACK_OPTIONS: FormOFilterOption[] = [
  { label: "Fresh", value: "FRESH" },
  { label: "Renewal", value: "RENEWAL" },
];

const STATUS_OPTIONS: FormOFilterOption[] = [
  { label: "Issued", value: "issued" },
  { label: "Needs re-issue", value: "reissue" },
];

export default function FormOListingPage() {
  const router = useRouter();
  const { canCreate, canEdit, canView } = useFormOPermissions();
  const {
    draftFilters: filters,
    setDraftFilters: setFilters,
    appliedFilters,
    applyFilters,
    appliedSearch,
  } = useAppliedListFilters();
  const { handleOpenFilter, isFilterOpen } = useLazyFilterColumns();
  const [sort, setSort] = useState<SortState>(DEFAULT_MASTER_LIST_SORT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [items, setItems] = useState<FormOListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [sendEmailFormOId, setSendEmailFormOId] = useState<string | null>(null);

  const [formONumberOptions, setFormONumberOptions] = useState<
    FormOFilterOption[]
  >([]);
  const [stateOptions, setStateOptions] = useState<FormOFilterOption[]>([]);
  const [customerOptions, setCustomerOptions] = useState<FormOFilterOption[]>(
    [],
  );
  const [purposeOptions, setPurposeOptions] = useState<FormOFilterOption[]>(
    PURPOSE_FALLBACK_OPTIONS,
  );

  const apiFilters = useMemo(
    () => buildListApiFilters(appliedFilters, FORM_O_FILTER_FIELD_MAP),
    [appliedFilters],
  );

  const formONumberFilterOpen = isFilterOpen("form_o_number");
  const stateFilterOpen = isFilterOpen("state_name");
  const customerFilterOpen = isFilterOpen("customer_name");
  const purposeFilterOpen = isFilterOpen("purpose");

  useEffect(() => {
    if (!formONumberFilterOpen) return;
    const controller = new AbortController();
    void getFormOFilterDropdown("form_o_number", controller.signal)
      .then(setFormONumberOptions)
      .catch(() => setFormONumberOptions([]));
    return () => controller.abort();
  }, [formONumberFilterOpen]);

  useEffect(() => {
    if (!stateFilterOpen) return;
    const controller = new AbortController();
    void getFormOFilterDropdown("state_name", controller.signal)
      .then(setStateOptions)
      .catch(() => setStateOptions([]));
    return () => controller.abort();
  }, [stateFilterOpen]);

  useEffect(() => {
    if (!customerFilterOpen) return;
    const controller = new AbortController();
    void getFormOFilterDropdown("customer__customer_name", controller.signal)
      .then(setCustomerOptions)
      .catch(() => setCustomerOptions([]));
    return () => controller.abort();
  }, [customerFilterOpen]);

  useEffect(() => {
    if (!purposeFilterOpen) return;
    const controller = new AbortController();
    void getFormOFilterDropdown("purpose", controller.signal)
      .then((options) =>
        setPurposeOptions(options.length ? options : PURPOSE_FALLBACK_OPTIONS),
      )
      .catch(() => setPurposeOptions(PURPOSE_FALLBACK_OPTIONS));
    return () => controller.abort();
  }, [purposeFilterOpen]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listFormOs({
        page,
        page_size: pageSize,
        search: appliedSearch || undefined,
        filters: apiFilters,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to load Form O list",
      );
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, appliedSearch, apiFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [appliedSearch, apiFilters, pageSize, sort.key, sort.direction]);

  const handleFilterChange = (next: FilterState) => {
    setFilters(next);
    applyFilters(next);
    setPage(1);
  };

  const columns: ColumnConfig<FormOListItem>[] = useMemo(
    () => [
      {
        key: "form_o_number",
        header: "Form O No.",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: formONumberOptions,
        width: "150px",
        render: (_v, row) => (
          <span className="font-mono text-xs font-semibold">
            {row.form_o_number}
          </span>
        ),
      },
      {
        key: "issue_date",
        header: "Date",
        sortable: true,
        filterable: true,
        filterType: "date",
        width: "110px",
        render: (_v, row) => String(row.issue_date).slice(0, 10),
      },
      {
        key: "state_name",
        header: "State",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: stateOptions,
        width: "150px",
        render: (_v, row) => (
          <>
            {row.state_name || row.state_code}
            <span className="ml-1 text-xs text-muted-foreground">
              ({row.state_code})
            </span>
          </>
        ),
      },
      {
        key: "customer_name",
        header: "Customer / Dealer",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: customerOptions,
        filterMultiple: true,
        width: "200px",
        render: (_v, row) => (
          <div>
            <div className="font-medium">
              {row.customer_name || row.recipient_name}
            </div>
            {row.customer_code ? (
              <div className="text-xs text-muted-foreground">
                {row.customer_code}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: "purpose",
        header: "Purpose",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: purposeOptions,
        width: "110px",
        render: (_v, row) => (
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold border",
              row.purpose === "RENEWAL"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-emerald-50 text-emerald-800 border-emerald-200",
            )}
          >
            {row.purpose === "RENEWAL" ? "Renewal" : "Fresh"}
          </span>
        ),
      },
      {
        key: "line_count",
        header: "Products",
        sortable: true,
        align: "right",
        width: "90px",
        render: (_v, row) => (
          <span className="tabular-nums">{row.line_count}</span>
        ),
      },
      {
        key: "needs_reissue",
        header: "Status",
        filterable: true,
        filterType: "dropdown",
        filterOptions: STATUS_OPTIONS,
        width: "160px",
        render: (_v, row) =>
          row.needs_reissue ? (
            <span className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold border bg-red-50 text-red-700 border-red-200">
              Licence expired — re-issue
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Issued</span>
          ),
      },
    ],
    [formONumberOptions, stateOptions, customerOptions, purposeOptions],
  );

  const actions: ActionItemConfig<FormOListItem>[] = useMemo(
    () => [
      {
        label: "View",
        action: "view",
        icon: Eye,
        hide: () => !canView,
        onClick: (row) => router.push(`/masters/form-o/${row.form_o_id}`),
      },
      {
        label: "Edit",
        action: "edit",
        icon: Edit2,
        hide: () => !canEdit,
        onClick: (row) => router.push(`/masters/form-o/${row.form_o_id}/edit`),
      },
      {
        label: "Download PDF",
        action: "download",
        icon: Download,
        hide: () => !canView,
        onClick: (row) =>
          void downloadFormOPdf(
            row.form_o_id,
            `${row.form_o_number.replace(/\//g, "-")}.pdf`,
          ),
      },
      {
        label: "Send email",
        action: "email",
        icon: Mail,
        hide: () => !canView,
        onClick: (row) => {
          setSendEmailFormOId(row.form_o_id);
          setSendEmailOpen(true);
        },
      },
      {
        label: "Re-issue",
        action: "reissue",
        icon: RefreshCw,
        hide: (row) => !canCreate || !row.needs_reissue,
        onClick: (row) =>
          router.push(
            `/masters/form-o/new?customerId=${row.customer_id}&reissue=1`,
          ),
      },
    ],
    [router, canView, canEdit, canCreate],
  );

  return (
    <ListingContainer title="Form O" titleIcon={FileText}>
      {error ? <p className="mb-2 text-xs text-red-600">{error}</p> : null}

      <MasterListing<FormOListItem>
        columns={columns}
        data={items}
        loading={loading}
        totalRecords={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={setSort}
        onFilterChange={handleFilterChange}
        actions={actions}
        rowKey={(row) => row.form_o_id}
        onAdd={
          canCreate ? () => router.push("/masters/form-o/new") : undefined
        }
        addLabel="Generate Form O"
        emptyMessage="Form O certificates"
        searchPlaceholder="Search number, dealer, state…"
        currentFilters={filters}
        currentSort={sort}
        onOpenFilter={handleOpenFilter}
      />

      <SendFormOEmailModal
        open={sendEmailOpen}
        formOId={sendEmailFormOId}
        onOpenChange={(open) => {
          setSendEmailOpen(open);
          if (!open) setSendEmailFormOId(null);
        }}
        onSent={(result) => {
          toast.success(`Form O email sent to ${result.to}.`);
        }}
      />
    </ListingContainer>
  );
}
