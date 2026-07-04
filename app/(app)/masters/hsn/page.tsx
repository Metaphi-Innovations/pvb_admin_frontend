"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
	formatHsnDisplayCode,
	validateHsnApiForm,
} from "./hsn-data";
import { HsnListService } from "@/services/hsn-list.service";
import { GstListService, type GstDropdownItem } from "@/services/gst-list.service";
import {
	MASTER_FILTER_FIELD_MAPS,
	mergeListRequestFilters,
	resolveListStatus,
} from "@/lib/masters/list-api-filters";
import { useDebouncedFilters } from "@/lib/masters/use-debounced-filters";
import { MasterListingSheets } from "@/components/masters/MasterListingSheets";
import { MasterFormGrid, MasterField, compactInput } from "@/components/masters/MasterModule";
import { MasterDrawerSection } from "@/components/masters/MasterRecordDrawer";
import { MasterListing } from "@/components/listing/MasterListing";
import {
	ColumnConfig,
	FilterState,
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
import type { MasterStatus } from "@/lib/masters/common";

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
		hsnCode: formatHsnDisplayCode(item.id),
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
	const [records, setRecords] = useState<HSNMaster[]>([]);
	const [totalRecords, setTotalRecords] = useState(0);
	const [loading, setLoading] = useState(true);
	const [listError, setListError] = useState<string | null>(null);
	const [filters, setFilters] = useState<FilterState>({});
	const { debouncedFilters, debouncedSearch, isDebouncing } = useDebouncedFilters(filters);
	const [sort, setSort] = useState<SortState>({ key: "hsnCode", direction: "asc" });
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [toast, setToast] = useState<ToastState | null>(null);
	const [statusTab, setStatusTab] = useState<StatusTab>("all");
	const [reloadKey, setReloadKey] = useState(0);
	const [viewLoading, setViewLoading] = useState(false);

	const [gstOptions, setGstOptions] = useState<GstDropdownItem[]>([]);
	const [gstLoading, setGstLoading] = useState(true);
	const [gstError, setGstError] = useState<string | null>(null);

	const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
	const [active, setActive] = useState<HSNMaster | null>(null);
	const [form, setForm] = useState<HSNForm>(DEFAULT_HSN_FORM);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [statusTarget, setStatusTarget] = useState<HSNMaster | null>(null);

	const apiFilters = useMemo(
		() =>
			mergeListRequestFilters(debouncedFilters, MASTER_FILTER_FIELD_MAPS.hsn, {
				statusTab,
			}),
		[debouncedFilters, statusTab],
	);
	const listStatus = useMemo(
		() => resolveListStatus(debouncedFilters, statusTab),
		[debouncedFilters, statusTab],
	);

	useEffect(() => {
		setStatusTab(readStoredStatusTab());
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		setGstLoading(true);
		setGstError(null);

		GstListService.dropdown()
			.then((items) => {
				if (!controller.signal.aborted) setGstOptions(items);
			})
			.catch((error: unknown) => {
				if (controller.signal.aborted) return;
				const err = error as { message?: string } | undefined;
				setGstError(err?.message || "Failed to load GST rates.");
				setGstOptions([]);
			})
			.finally(() => {
				if (!controller.signal.aborted) setGstLoading(false);
			});

		return () => controller.abort();
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		setListError(null);

		HsnListService.list({
			page,
			pageSize,
			search: debouncedSearch,
			ordering: "",
			status: listStatus,
			apiFilters,
			signal: controller.signal,
		})
			.then((result) => {
				setRecords(result.items.map(toHsnRow));
				setTotalRecords(result.total);
			})
			.catch((error: unknown) => {
				if (controller.signal.aborted) return;
				const err = error as { status?: number; message?: string } | undefined;
				const message =
					err?.status === 401
						? "Unauthorized. Please login again."
						: err?.status === 403
							? "Forbidden. You do not have access."
							: err?.status === 404
								? "HSN list endpoint not found."
								: err?.status === 500
									? "Server error while loading HSN records."
									: err?.message || "Unable to load HSN records.";
				setListError(message);
				setRecords([]);
				setTotalRecords(0);
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});

		return () => controller.abort();
	}, [page, pageSize, debouncedSearch, apiFilters, listStatus, reloadKey]);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 3000);
		return () => clearTimeout(t);
	}, [toast]);

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

	const openView = useCallback(async (row: HSNMaster) => {
		if (!row.hsnUuid) {
			setToast({ msg: "HSN id missing. Unable to load details.", type: "error" });
			return;
		}

		try {
			setViewLoading(true);
			const detail = await HsnListService.view(row.hsnUuid);
			setActive(toHsnRow(detail));
			setSheetMode("view");
		} catch (error: unknown) {
			const err = error as { message?: string } | undefined;
			setToast({ msg: err?.message || "Failed to load HSN details.", type: "error" });
		} finally {
			setViewLoading(false);
		}
	}, []);

	function hsnToFormFromRecord(record: HSNMaster): HSNForm {
		const matched =
			record.gstId ||
			gstOptions.find((g) => formatGstRate(g.gstPercentage) === record.gstRate)?.id ||
			"";
		return {
			hsnDescription: record.hsnDescription,
			gstId: matched,
		};
	}

	const closeSheet = () => {
		setSheetMode(null);
		setActive(null);
		setErrors({});
		setFormError(null);
	};

	const requestStatusToggle = (record: HSNMaster) => {
		setStatusTarget(record);
	};

	const confirmStatusChange = async () => {
		if (!statusTarget?.hsnUuid) {
			setToast({ msg: "HSN id missing. Unable to update status.", type: "error" });
			setStatusTarget(null);
			return;
		}

		try {
			await HsnListService.updateStatus(statusTarget.hsnUuid);
			setToast({
				msg: `HSN status updated to ${statusTarget.status === "active" ? "Inactive" : "Active"}`,
				type: "success",
			});
			setReloadKey((prev) => prev + 1);
		} catch (error: unknown) {
			const err = error as { message?: string } | undefined;
			setToast({ msg: err?.message || "Failed to update HSN status.", type: "error" });
		} finally {
			setStatusTarget(null);
		}
	};

	const columns: ColumnConfig<HSNMaster>[] = [
		{
			key: "hsnCode",
			header: "HSN Ref",
			sortable: true,
			filterable: true,
			filterType: "text",
			width: "120px",
			render: (_val, row) => (
				<button
					type="button"
					onClick={() => openView(row)}
					className="font-mono text-xs font-semibold text-brand-700 hover:underline"
				>
					{row.hsnCode}
				</button>
			),
		},
		{
			key: "hsnDescription",
			header: "HSN Description",
			sortable: true,
			filterable: true,
			filterType: "text",
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
			filterOptions: gstSelectOptions.map((opt) => ({
				label: opt.label,
				value: opt.label.split(" — ")[0],
			})),
			width: "100px",
		},
		{
			key: "createdBy",
			header: "Created By",
			sortable: true,
			filterable: true,
			filterType: "audit",
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
			filterOptions: [
				{ label: "Active", value: "active" },
				{ label: "Inactive", value: "inactive" },
			],
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

	const displayRecords = useMemo(() => {
		if (!sort.key || sort.direction === "none") return records;
		return [...records].sort((a, b) => {
			const aVal = String(a[sort.key as keyof HSNMaster] ?? "").toLowerCase();
			const bVal = String(b[sort.key as keyof HSNMaster] ?? "").toLowerCase();
			const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
			return sort.direction === "asc" ? cmp : -cmp;
		});
	}, [records, sort]);

	const isFiltering = isDebouncing;

	useEffect(() => {
		setPage(1);
	}, [debouncedSearch, apiFilters, pageSize, statusTab]);

	useEffect(() => {
		setPage(1);
	}, [sort.key, sort.direction]);

	const persist = async () => {
		const fieldErrors = validateHsnApiForm(form);
		setErrors(fieldErrors);
		if (Object.keys(fieldErrors).length > 0) return;

		if (sheetMode === "add") {
			try {
				setSaving(true);
				setFormError(null);
				await HsnListService.create({
					hsnDescription: form.hsnDescription,
					gstId: form.gstId,
				});
				setToast({ msg: "HSN added successfully", type: "success" });
				setPage(1);
				setReloadKey((prev) => prev + 1);
				closeSheet();
			} catch (error: unknown) {
				const err = error as { message?: string } | undefined;
				setFormError(err?.message || "Failed to create HSN record.");
			} finally {
				setSaving(false);
			}
			return;
		}

		if (!active?.hsnUuid) {
			setFormError("HSN id missing. Unable to update.");
			return;
		}

		try {
			setSaving(true);
			setFormError(null);
			await HsnListService.update(active.hsnUuid, {
				hsnDescription: form.hsnDescription,
				gstId: form.gstId,
			});
			setToast({ msg: "HSN updated successfully", type: "success" });
			setReloadKey((prev) => prev + 1);
			closeSheet();
		} catch (error: unknown) {
			const err = error as { message?: string } | undefined;
			setFormError(err?.message || "Failed to update HSN record.");
		} finally {
			setSaving(false);
		}
	};

	const handleExport = async () => {
		try {
			await HsnListService.export({
				search: debouncedSearch,
				status: listStatus,
				apiFilters,
			});
			setToast({ msg: "HSN records exported successfully", type: "success" });
		} catch (error: unknown) {
			const err = error as { message?: string } | undefined;
			setToast({ msg: err?.message || "Failed to export HSN records", type: "error" });
		}
	};

	const sheetTitle =
		sheetMode === "add" ? "Add HSN" : sheetMode === "edit" ? "Edit HSN" : "View HSN";

	const viewDrawer = active
		? {
				title: active.hsnCode,
				subtitle: "Government HSN classification",
				status: active.status,
				basicInfo: [
					{ label: "HSN Ref", value: active.hsnCode, mono: true },
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
				addLabel="Add HSN"
				onExport={handleExport}
				emptyMessage="HSN records"
				searchPlaceholder="Search HSN description..."
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
				icon={Code2}
				formError={formError ?? undefined}
				saving={saving}
				viewDrawer={viewDrawer}
				formContent={
					sheetMode !== "view" ? (
						<MasterFormGrid>
							<MasterField
								label="GST Rate"
								required
								error={errors.gstId}
								className="sm:col-span-2"
							>
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
