"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
	CheckCircle2,
	X,
	Edit2,
	Code2,
	Eye,
	AlertTriangle,
} from "lucide-react";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import {
	type HSNMaster,
	type HSNForm,
	DEFAULT_HSN_FORM,
	sanitizeHsnCodeInput,
	validateHsnApiForm,
} from "./hsn-data";
import {
	useHsnList,
	useHsn,
	useCreateHsn,
	useUpdateHsn,
	useToggleHsnStatus,
	useExportHsn,
	useGstDropdown,
	useHsnFilterDropdown,
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
import { MasterListingSheets } from "@/components/masters/MasterListingSheets";
import { MasterFormGrid, MasterField, compactInput } from "@/components/masters/MasterModule";
import { MasterDrawerSection } from "@/components/masters/MasterRecordDrawer";
import { MasterListing } from "@/components/listing/MasterListing";
import {
	ColumnConfig,
	SortState,
	ActionItemConfig,
} from "@/components/listing/types";
import {
	ListingUserCell,
	AuditUserRow,
	ListingStatusToggle,
	isActiveStatus,
} from "@/components/listing";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { sortStateToOrdering } from "@/services/hsn-list.service";

type StatusTab = "all" | "active" | "inactive";
const HSN_TAB_KEY = "hsn-list-status-tab";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "active", label: "Active" },
	{ value: "inactive", label: "Inactive" },
];

function readStoredStatusTab(): StatusTab {
	if (typeof window === "undefined") return "all";
	const v = sessionStorage.getItem(HSN_TAB_KEY);
	return v === "active" || v === "inactive" ? v : "all";
}

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

function formatGstRate(pct: number): string {
	return `${pct}%`;
}

function toHsnRow(item: {
	id: number;
	hsnUuid: string;
	hsnCode: string;
	hsnDescription: string;
	gstId: string;
	gstPercentage: number;
	status: "active" | "inactive";
	createdAt: string;
	updatedAt: string;
	createdBy: string;
	updatedBy: string;
}): HSNMaster {
	return {
		id: item.id,
		hsnUuid: item.hsnUuid,
		gstId: item.gstId,
		hsnCode: item.hsnCode || "",
		hsnDescription: item.hsnDescription,
		gstRate: formatGstRate(item.gstPercentage),
		status: item.status,
		createdBy: item.createdBy || "—",
		createdDate: item.createdAt ? item.createdAt.slice(0, 10) : "",
		updatedBy: item.updatedBy || "—",
		updatedDate: item.updatedAt ? item.updatedAt.slice(0, 10) : "",
	};
}

export default function HSNPage() {
	const {
    draftFilters: filters,
    setDraftFilters: setFilters,
    appliedFilters,
    applyFilters,
    appliedSearch,
	} = useAppliedListFilters();
	const { handleOpenFilter, isFilterOpen } = useLazyFilterColumns();
	const [sort, setSort] = useState<SortState>({ key: "hsnCode", direction: "asc" });
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [toast, setToast] = useState<ToastState | null>(null);
	const [statusTab, setStatusTab] = useState<StatusTab>("all");
	const [viewId, setViewId] = useState<string | null>(null);

	const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
	const [active, setActive] = useState<HSNMaster | null>(null);
	const [form, setForm] = useState<HSNForm>(DEFAULT_HSN_FORM);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [statusTarget, setStatusTarget] = useState<HSNMaster | null>(null);

	const apiFilters = useMemo(
		() =>
			mergeListRequestFilters(appliedFilters, MASTER_FILTER_FIELD_MAPS.hsn, {
				statusTab,
			}),
		[appliedFilters, statusTab],
	);
	const listStatus = useMemo(
		() => resolveListStatus(appliedFilters, statusTab),
		[appliedFilters, statusTab],
	);
	const ordering = useMemo(
		() => sortStateToOrdering(sort.key, sort.direction),
		[sort.key, sort.direction],
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

	const listQuery = useHsnList(listParams);
	const detailQuery = useHsn(viewId);
	const gstDropdownQuery = useGstDropdown();
	const createMutation = useCreateHsn();
	const updateMutation = useUpdateHsn();
	const toggleStatusMutation = useToggleHsnStatus();
	const exportMutation = useExportHsn();

	const hsnCodeOptionsQuery = useHsnFilterDropdown("hsnCode", { enabled: isFilterOpen("hsnCode") });
	const hsnDescriptionOptionsQuery = useHsnFilterDropdown("hsnDescription", {
		enabled: isFilterOpen("hsnDescription"),
	});
	const gstRateOptionsQuery = useHsnFilterDropdown("gstPercentage", { enabled: isFilterOpen("gstRate") });
	const statusOptionsQuery = useHsnFilterDropdown("is_active", { enabled: isFilterOpen("status") });
	const createdByOptionsQuery = useHsnFilterDropdown("created_by_user__username", {
		enabled: isFilterOpen("createdBy"),
	});
	const updatedByOptionsQuery = useHsnFilterDropdown("updated_by_user__username", {
		enabled: isFilterOpen("updatedBy"),
	});

	const hsnCodeOptions = useMemo(
		() => hsnCodeOptionsQuery.data ?? [],
		[hsnCodeOptionsQuery.data],
	);
	const hsnDescriptionOptions = useMemo(
		() => hsnDescriptionOptionsQuery.data ?? [],
		[hsnDescriptionOptionsQuery.data],
	);
	const gstRateFilterOptions = useMemo(() => {
		if (gstRateOptionsQuery.data?.length) return gstRateOptionsQuery.data;
		return (gstDropdownQuery.data ?? []).map((item) => ({
			label: `${item.gstPercentage}%`,
			value: String(item.gstPercentage),
		}));
	}, [gstRateOptionsQuery.data, gstDropdownQuery.data]);
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
		() => (listQuery.data?.items ?? []).map(toHsnRow),
		[listQuery.data],
	);
	const totalRecords = listQuery.data?.total ?? 0;
	const loading = listQuery.isFetching;
	const listError = listQuery.isError
		? getMasterListErrorMessage(listQuery.error, {
				resource: "HSN records",
				notFoundMessage: "HSN list endpoint not found.",
				serverMessage: "Server error while loading HSN records.",
			})
		: null;
	const viewLoading = Boolean(viewId) && detailQuery.isFetching;
	const saving = createMutation.isPending || updateMutation.isPending;

	const gstOptions = gstDropdownQuery.data ?? [];
	const gstLoading = gstDropdownQuery.isFetching;
	const gstError = gstDropdownQuery.isError
		? getErrorMessage(gstDropdownQuery.error, "Failed to load GST rates.")
		: null;

	useEffect(() => {
		setStatusTab(readStoredStatusTab());
	}, []);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 3000);
		return () => clearTimeout(t);
	}, [toast]);

	useEffect(() => {
		if (!viewId) return;
		if (detailQuery.isError) {
			setToast({
				msg: getErrorMessage(detailQuery.error, "Failed to load HSN details."),
				type: "error",
			});
			setViewId(null);
			return;
		}
		if (detailQuery.data) {
			setActive(toHsnRow(detailQuery.data));
			setSheetMode("view");
		}
	}, [viewId, detailQuery.data, detailQuery.isError, detailQuery.error]);

	const gstSelectOptions = useMemo(
		() =>
			gstOptions.map((g) => ({
				value: g.id,
				label: g.remark
					? `${g.gstPercentage}% — ${g.remark}`
					: `${g.gstPercentage}%`,
			})),
		[gstOptions],
	);

	const handleStatusTabChange = (tab: string) => {
		const next = tab as StatusTab;
		setStatusTab(next);
		sessionStorage.setItem(HSN_TAB_KEY, next);
		setPage(1);
	};

	const openAdd = () => {
		setForm({
			...DEFAULT_HSN_FORM,
			gstId: gstOptions[0]?.id ?? "",
		});
		setErrors({});
		setFormError(null);
		setActive(null);
		setSheetMode("add");
	};

	const openEdit = (row: HSNMaster) => {
		setForm(hsnToFormFromRecord(row));
		setErrors({});
		setFormError(null);
		setActive(row);
		setSheetMode("edit");
	};

	const openView = useCallback((row: HSNMaster) => {
		if (!row.hsnUuid) {
			setToast({ msg: "HSN id missing. Unable to load details.", type: "error" });
			return;
		}
		setViewId(row.hsnUuid);
	}, []);

	function hsnToFormFromRecord(record: HSNMaster): HSNForm {
		const matched =
			record.gstId ||
			gstOptions.find((g) => formatGstRate(g.gstPercentage) === record.gstRate)?.id ||
			"";
		return {
			hsnCode: record.hsnCode,
			hsnDescription: record.hsnDescription,
			gstId: matched,
		};
	}

	const closeSheet = () => {
		setSheetMode(null);
		setActive(null);
		setViewId(null);
		setErrors({});
		setFormError(null);
	};

	const requestStatusToggle = (record: HSNMaster) => {
		setStatusTarget(record);
	};

	const confirmStatusChange = () => {
		const id = statusTarget?.hsnUuid;
		if (!statusTarget || !id) {
			setToast({ msg: "HSN id missing. Unable to update status.", type: "error" });
			setStatusTarget(null);
			return;
		}

		const nextStatusLabel = statusTarget.status === "active" ? "Inactive" : "Active";
		toggleStatusMutation.mutate(id, {
			onSuccess: () => {
				setToast({
					msg: `HSN status updated to ${nextStatusLabel}`,
					type: "success",
				});
			},
			onError: (error) => {
				setToast({
					msg: getErrorMessage(error, "Failed to update HSN status."),
					type: "error",
				});
			},
			onSettled: () => {
				setStatusTarget(null);
			},
		});
	};

	const columns: ColumnConfig<HSNMaster>[] = [
		{
			key: "hsnCode",
			header: "HSN Code",
			sortable: true,
			filterable: true,
			filterType: "dropdown",
			filterOptions: hsnCodeOptions,
			width: "120px",
			render: (_val, row) => (
				<button
					type="button"
					onClick={() => openView(row)}
					className="font-mono text-xs font-semibold text-brand-700 hover:underline"
				>
					{row.hsnCode || "—"}
				</button>
			),
		},
		{
			key: "hsnDescription",
			header: "HSN Description",
			sortable: true,
			filterable: true,
			filterType: "dropdown",
			filterOptions: hsnDescriptionOptions,
			width: "300px",
			render: (_val, row) => (
				<span className="text-xs text-foreground line-clamp-2">{row.hsnDescription}</span>
			),
		},
		{
			key: "gstRate",
			header: "GST Rate",
			sortable: true,
			filterable: true,
			filterType: "dropdown",
			filterOptions: gstRateFilterOptions,
			width: "100px",
		},
		{
			key: "createdBy",
			header: "Created By",
			sortable: true,
			filterable: true,
			filterType: "audit",
			auditUserOptions: createdByOptions,
			width: "150px",
			render: (_val, row) => (
				<ListingUserCell name={row.createdBy} date={row.createdDate} />
			),
		},
		{
			key: "updatedBy",
			header: "Updated By",
			sortable: true,
			filterable: true,
			filterType: "audit",
			auditUserOptions: updatedByOptions,
			width: "150px",
			render: (_val, row) => (
				<ListingUserCell name={row.updatedBy} date={row.updatedDate} />
			),
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
					onChange={() => requestStatusToggle(row)}
				/>
			),
		},
	];

	const actions: ActionItemConfig<HSNMaster>[] = [
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

	useEffect(() => {
		setPage(1);
	}, [appliedSearch, apiFilters, pageSize, statusTab]);

	useEffect(() => {
		setPage(1);
	}, [sort.key, sort.direction]);

	const persist = () => {
		const normalizedForm = {
			...form,
			hsnCode: sanitizeHsnCodeInput(form.hsnCode),
		};
		const fieldErrors = validateHsnApiForm(normalizedForm);
		setErrors(fieldErrors);
		if (Object.keys(fieldErrors).length > 0) return;

		if (sheetMode === "add") {
			setFormError(null);
			createMutation.mutate(
				{
					hsnCode: normalizedForm.hsnCode,
					hsnDescription: normalizedForm.hsnDescription,
					gstId: normalizedForm.gstId,
				},
				{
					onSuccess: () => {
						setToast({ msg: "HSN added successfully", type: "success" });
						setPage(1);
						closeSheet();
					},
					onError: (error) => {
						setFormError(getErrorMessage(error, "Failed to create HSN record."));
					},
				},
			);
			return;
		}

		if (!active?.hsnUuid) {
			setFormError("HSN id missing. Unable to update.");
			return;
		}

		setFormError(null);
		updateMutation.mutate(
			{
				id: active.hsnUuid,
				payload: {
					hsnCode: normalizedForm.hsnCode,
					hsnDescription: normalizedForm.hsnDescription,
					gstId: normalizedForm.gstId,
				},
			},
			{
				onSuccess: () => {
					setToast({ msg: "HSN updated successfully", type: "success" });
					closeSheet();
				},
				onError: (error) => {
					setFormError(getErrorMessage(error, "Failed to update HSN record."));
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
				ordering,
			},
			{
				onSuccess: () => {
					setToast({ msg: "HSN records exported successfully", type: "success" });
				},
				onError: (error) => {
					setToast({
						msg: getErrorMessage(error, "Failed to export HSN records"),
						type: "error",
					});
				},
			},
		);
	};

	const sheetTitle =
		sheetMode === "add" ? "Add HSN" : sheetMode === "edit" ? "Edit HSN" : "View HSN";

	const viewDrawer = active
		? {
				title: active.hsnCode || "HSN",
				subtitle: "Government HSN classification",
				status: active.status,
				basicInfo: [
					{ label: "HSN Code", value: active.hsnCode || "—", mono: true },
					{ label: "GST Rate", value: active.gstRate },
					{ label: "Description", value: active.hsnDescription },
				],
				showDescription: false,
				children: (
					<MasterDrawerSection title="Audit Information">
						<div className="space-y-4">
							<AuditUserRow label="Created By" name={active.createdBy} />
							<div className="space-y-1">
								<p className="text-[11px] text-muted-foreground">Created Date</p>
								<p className="text-sm font-medium text-foreground font-mono">
									{active.createdDate}
								</p>
							</div>
							<AuditUserRow label="Updated By" name={active.updatedBy} />
							<div className="space-y-1">
								<p className="text-[11px] text-muted-foreground">Updated Date</p>
								<p className="text-sm font-medium text-foreground font-mono">
									{active.updatedDate}
								</p>
							</div>
						</div>
					</MasterDrawerSection>
				),
			}
		: { title: "HSN", basicInfo: [] };

	return (
		<ListingContainer
			title="HSN Master"
			titleIcon={Code2}
			tabs={STATUS_TABS.map((t) => ({
				value: t.value,
				label: t.value === statusTab ? `${t.label} (${totalRecords})` : t.label,
			}))}
			activeTab={statusTab}
			onTabChange={handleStatusTabChange}
		>
			{listError ? <p className="mb-2 text-xs text-red-600">{listError}</p> : null}

			<MasterListing<HSNMaster>
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
				addLabel="Add HSN"
				onExport={handleExport}
				emptyMessage="HSN records"
				searchPlaceholder="Search HSN code or description..."
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
				icon={Code2}
				formError={formError ?? undefined}
				saving={saving}
				viewDrawer={viewDrawer}
				formContent={
					sheetMode !== "view" ? (
						<MasterFormGrid>
							<MasterField label="HSN Code" required error={errors.hsnCode}>
								<Input
									className={cn(compactInput(), "font-mono")}
									value={form.hsnCode}
									onChange={(e) =>
										setForm((prev) => ({
											...prev,
											hsnCode: sanitizeHsnCodeInput(e.target.value),
										}))
									}
									placeholder="e.g. 31021010"
									maxLength={8}
									disabled={saving}
								/>
							</MasterField>

							<MasterField label="GST Rate" required error={errors.gstId}>
								{gstError ? (
									<p className="text-[11px] text-red-500">{gstError}</p>
								) : null}
								<AutocompleteSelect
									options={gstSelectOptions}
									value={form.gstId}
									onChange={(value) =>
										setForm((prev) => ({ ...prev, gstId: String(value) }))
									}
									placeholder={
										gstLoading ? "Loading GST rates..." : "Select GST rate…"
									}
									error={!!errors.gstId}
									disabled={gstLoading || !!gstError || saving}
									className="h-8 text-xs"
								/>
							</MasterField>

							<MasterField
								label="HSN Description"
								required
								error={errors.hsnDescription}
								className="sm:col-span-2"
							>
								<Textarea
									className={cn(compactInput(), "min-h-[72px] resize-none")}
									value={form.hsnDescription}
									onChange={(e) =>
										setForm((prev) => ({
											...prev,
											hsnDescription: e.target.value,
										}))
									}
									placeholder="e.g. Insecticides, fungicides, herbicides"
									rows={3}
									disabled={saving}
								/>
							</MasterField>
						</MasterFormGrid>
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
							{statusTarget?.status === "active" ? "Deactivate HSN?" : "Activate HSN?"}
						</DialogTitle>
						<DialogDescription className="text-xs pt-1">
							{statusTarget && (
								<>
									<strong className="text-foreground font-mono">
										{statusTarget.hsnCode}
									</strong>{" "}
									will be marked as{" "}
									{statusTarget.status === "active" ? "inactive" : "active"}.
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
		</ListingContainer>
	);
}
