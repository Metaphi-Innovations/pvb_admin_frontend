"use client";

import React, { useEffect, useMemo, useState } from "react";
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
	Trash2,
	AlertTriangle,
} from "lucide-react";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import {
	type HSNMaster,
	type HSNForm,
	DEFAULT_HSN_FORM,
	loadHSNMasters,
	saveHSNMasters,
	hsnToForm,
	formToHsn,
	validateHsnForm,
	sanitizeHsnCodeInput,
	nextHSNId,
	todayStr,
} from "./hsn-data";
import { loadGSTMasters } from "../gst/gst-data";
import { MasterListingSheets } from "@/components/masters/MasterListingSheets";
import { MasterFormGrid, MasterField, compactInput } from "@/components/masters/MasterModule";
import { MasterDrawerSection } from "@/components/masters/MasterRecordDrawer";
import { MasterListing } from "@/components/listing/MasterListing";
import { applyFilters } from "@/components/listing/filter-utils";
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

function Toast({
	toast,
	onDismiss,
}: {
	toast: ToastState;
	onDismiss: () => void;
}) {
	return (
		<div
			className={cn(
				"fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
				toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
			)}
		>
			<CheckCircle2 className='flex-shrink-0 w-4 h-4' />
			{toast.msg}
			<button onClick={onDismiss} className='ml-1 opacity-70 hover:opacity-100'>
				<X className='h-3.5 w-3.5' />
			</button>
		</div>
	);
}

export default function HSNPage() {
	const [records, setRecords] = useState<HSNMaster[]>([]);
	const [filters, setFilters] = useState<FilterState>({});
	const [sort, setSort] = useState<SortState>({
		key: "hsnCode",
		direction: "asc",
	});
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [toast, setToast] = useState<ToastState | null>(null);
	const [statusTab, setStatusTab] = useState<StatusTab>("all");

	const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(
		null,
	);
	const [active, setActive] = useState<HSNMaster | null>(null);
	const [form, setForm] = useState<HSNForm>(DEFAULT_HSN_FORM);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [deleteTarget, setDeleteTarget] = useState<HSNMaster | null>(null);
	const [statusTarget, setStatusTarget] = useState<HSNMaster | null>(null);

	useEffect(() => {
		setRecords(loadHSNMasters());
		setStatusTab(readStoredStatusTab());
	}, []);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 3000);
		return () => clearTimeout(t);
	}, [toast]);

	const gstOptions = useMemo(() => {
		try {
			const list = loadGSTMasters().filter((g) => g.status === "active");
			if (list.length > 0) {
				return [...list]
					.sort((a, b) => a.gstPercentage - b.gstPercentage)
					.map((g) => ({
						value: `${g.gstPercentage}%`,
						label: `${g.gstPercentage}%`,
					}));
			}
		} catch {
			// ignore
		}
		return ["0%", "5%", "12%", "18%", "28%"].map((rate) => ({
			value: rate,
			label: rate,
		}));
	}, []);

	const handleStatusTabChange = (tab: string) => {
		const next = tab as StatusTab;
		setStatusTab(next);
		sessionStorage.setItem(HSN_TAB_KEY, next);
		setPage(1);
	};

	const statusTabCounts = useMemo(
		() => ({
			all: records.length,
			active: records.filter((r) => r.status === "active").length,
			inactive: records.filter((r) => r.status === "inactive").length,
		}),
		[records],
	);

	const applyStatusChange = (record: HSNMaster, nextStatus: MasterStatus) => {
		const updated = records.map((item) =>
			item.id === record.id
				? {
						...item,
						status: nextStatus,
						updatedBy: "Admin User",
						updatedDate: todayStr(),
					}
				: item,
		);
		setRecords(updated);
		saveHSNMasters(updated);
		setToast({
			msg: `HSN status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`,
			type: "success",
		});
	};

	const requestStatusToggle = (record: HSNMaster) => {
		setStatusTarget(record);
	};

	const confirmStatusChange = () => {
		if (!statusTarget) return;
		const nextStatus: MasterStatus =
			statusTarget.status === "active" ? "inactive" : "active";
		applyStatusChange(statusTarget, nextStatus);
		setStatusTarget(null);
	};

	const columns: ColumnConfig<HSNMaster>[] = [
		{
			key: "hsnCode",
			header: "HSN Code",
			sortable: true,
			filterable: true,
			filterType: "text",
			width: "120px",
			render: (_val, row) => (
				<button
					type='button'
					onClick={() => openView(row)}
					className='font-mono text-xs font-semibold text-brand-700 hover:underline'
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
				<span className='text-xs text-foreground line-clamp-2'>
					{row.hsnDescription}
				</span>
			),
		},
		{
			key: "gstRate",
			header: "GST Rate",
			sortable: true,
			filterable: true,
			filterType: "dropdown",
			filterOptions: gstOptions.map((opt) => ({
				label: opt.label,
				value: opt.value,
			})),
			width: "100px",
		},
		{
			key: "createdBy",
			header: "Created By",
			sortable: true,
			width: "150px",
			render: (_val, row) => (
				<ListingUserCell name={row.createdBy} date={row.createdDate} />
			),
		},
		{
			key: "updatedBy",
			header: "Updated By",
			sortable: true,
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

		if (statusTab !== "all") {
			result = result.filter((r) => r.status === statusTab);
		}

		if (filters.search) {
			const q = String(filters.search).trim().toLowerCase();
			result = result.filter(
				(r) =>
					r.hsnCode.toLowerCase().includes(q) ||
					r.hsnDescription.toLowerCase().includes(q),
			);
		}

		result = applyFilters(result, filters);

		if (sort.key && sort.direction !== "none") {
			result.sort((a, b) => {
				let aVal = a[sort.key as keyof HSNMaster];
				let bVal = b[sort.key as keyof HSNMaster];
				if (typeof aVal === "string") {
					aVal = aVal.toLowerCase();
					bVal = (bVal as string).toLowerCase();
				}
				const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
				return sort.direction === "asc" ? cmp : -cmp;
			});
		}

		return result;
	}, [records, filters, sort, statusTab]);

	const paginated = useMemo(() => {
		const startOffset = (page - 1) * pageSize;
		return filtered.slice(startOffset, startOffset + pageSize);
	}, [filtered, page, pageSize]);

	useEffect(() => {
		setPage(1);
	}, [filters, sort, pageSize, statusTab]);

	const openAdd = () => {
		setForm({
			...DEFAULT_HSN_FORM,
			gstRate: gstOptions[0]?.value ?? "",
		});
		setErrors({});
		setActive(null);
		setSheetMode("add");
	};

	const openEdit = (row: HSNMaster) => {
		setForm(hsnToForm(row));
		setErrors({});
		setActive(row);
		setSheetMode("edit");
	};

	const openView = (row: HSNMaster) => {
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
		const list = loadHSNMasters();
		const normalizedForm: HSNForm = {
			...form,
			hsnCode: sanitizeHsnCodeInput(form.hsnCode),
		};
		const fieldErrors = validateHsnForm(
			normalizedForm,
			list,
			mode === "edit" ? active?.id : undefined,
		);
		if (Object.keys(fieldErrors).length > 0) {
			setErrors(fieldErrors);
			return;
		}

		let updatedList: HSNMaster[];
		if (mode === "add") {
			const id = nextHSNId(list);
			updatedList = [...list, formToHsn(normalizedForm, id)];
			setToast({ msg: "HSN added successfully", type: "success" });
		} else if (active) {
			updatedList = list.map((r) =>
				r.id === active.id ? formToHsn(normalizedForm, active.id, active) : r,
			);
			setToast({ msg: "HSN updated successfully", type: "success" });
		} else {
			return;
		}

		saveHSNMasters(updatedList);
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
						updatedDate: todayStr(),
					}
				: r,
		);
		saveHSNMasters(updated);
		setRecords(updated);
		setDeleteTarget(null);
		setToast({
			msg: `HSN ${deleteTarget.hsnCode} marked as inactive`,
			type: "success",
		});
	};

	const handleExport = () => {
		try {
			const headers = [
				"HSN Code",
				"HSN Description",
				"GST Rate",
				"Status",
				"Created By",
				"Updated By",
				"Created Date",
				"Updated Date",
			];
			const csvRows = [headers.join(",")];
			for (const r of records) {
				csvRows.push(
					[
						r.hsnCode,
						`"${r.hsnDescription.replace(/"/g, '""')}"`,
						r.gstRate,
						r.status,
						r.createdBy,
						r.updatedBy,
						r.createdDate,
						r.updatedDate,
					].join(","),
				);
			}
			const blob = new Blob([csvRows.join("\n")], {
				type: "text/csv;charset=utf-8;",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `hsn_export_${todayStr()}.csv`;
			link.click();
			URL.revokeObjectURL(url);
			setToast({ msg: "HSN records exported successfully", type: "success" });
		} catch {
			setToast({ msg: "Failed to export HSN records", type: "error" });
		}
	};

	const sheetTitle =
		sheetMode === "add"
			? "Add HSN"
			: sheetMode === "edit"
				? "Edit HSN"
				: "View HSN";

	const viewDrawer = active
		? {
				title: active.hsnCode,
				subtitle: "Government HSN classification",
				status: active.status,
				basicInfo: [
					{ label: "HSN Code", value: active.hsnCode, mono: true },
					{ label: "GST Rate", value: active.gstRate },
					{
						label: "Description",
						value: active.hsnDescription,
					},
				],
				showDescription: false,
				children: (
					<MasterDrawerSection title='Audit Information'>
						<div className='space-y-4'>
							<AuditUserRow label='Created By' name={active.createdBy} />
							<div className='space-y-1'>
								<p className='text-[11px] text-muted-foreground'>Created Date</p>
								<p className='text-sm font-medium text-foreground font-mono'>
									{active.createdDate}
								</p>
							</div>
							<AuditUserRow label='Updated By' name={active.updatedBy} />
							<div className='space-y-1'>
								<p className='text-[11px] text-muted-foreground'>Updated Date</p>
								<p className='text-sm font-medium text-foreground font-mono'>
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
			title='HSN Master'
			titleIcon={Code2}
			tabs={STATUS_TABS.map((t) => ({
				value: t.value,
				label: `${t.label} (${statusTabCounts[t.value]})`,
			}))}
			activeTab={statusTab}
			onTabChange={handleStatusTabChange}
		>
			<MasterListing<HSNMaster>
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
				addLabel='Add HSN'
				onExport={handleExport}
				emptyMessage='HSN records'
				searchPlaceholder='Search HSN code or description...'
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
						<MasterFormGrid>
							<MasterField
								label='HSN Code'
								required
								error={errors.hsnCode}
								className='sm:col-span-1'
							>
								<Input
									autoFocus
									className={cn(compactInput(), "font-mono")}
									value={form.hsnCode}
									onChange={(e) =>
										setForm((prev) => ({
											...prev,
											hsnCode: sanitizeHsnCodeInput(e.target.value),
										}))
									}
									placeholder='e.g. 38089199'
									inputMode='numeric'
									maxLength={8}
								/>
							</MasterField>

							<MasterField
								label='GST Rate'
								required
								error={errors.gstRate}
								className='sm:col-span-1'
							>
								<AutocompleteSelect
									options={gstOptions}
									value={form.gstRate}
									onChange={(value) =>
										setForm((prev) => ({ ...prev, gstRate: value }))
									}
									placeholder='Select GST rate…'
									error={!!errors.gstRate}
									className='h-8 text-xs'
								/>
							</MasterField>

							<MasterField
								label='HSN Description'
								required
								error={errors.hsnDescription}
								className='sm:col-span-2'
							>
								<Textarea
									className='text-xs min-h-[72px] resize-none'
									value={form.hsnDescription}
									onChange={(e) =>
										setForm((prev) => ({
											...prev,
											hsnDescription: e.target.value,
										}))
									}
									placeholder='e.g. Insecticides, fungicides, herbicides'
									rows={3}
								/>
							</MasterField>
						</MasterFormGrid>
					) : null
				}
			/>

			<Dialog
				open={!!statusTarget}
				onOpenChange={(o) => !o && setStatusTarget(null)}
			>
				<DialogContent className='max-w-sm'>
					<DialogHeader>
						<DialogTitle className='flex items-center gap-2 text-base'>
							<div className='w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200'>
								<AlertTriangle className='w-4 h-4 text-amber-500' />
							</div>
							{statusTarget?.status === "active"
								? "Deactivate HSN?"
								: "Activate HSN?"}
						</DialogTitle>
						<DialogDescription className='text-xs pt-1'>
							{statusTarget && (
								<>
									<strong className='text-foreground font-mono'>
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
							variant='outline'
							size='sm'
							className='h-8 text-xs'
							onClick={() => setStatusTarget(null)}
						>
							Cancel
						</Button>
						<Button
							size='sm'
							className='h-8 text-xs text-white bg-brand-600 hover:bg-brand-700'
							onClick={confirmStatusChange}
						>
							Confirm
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={!!deleteTarget}
				onOpenChange={(o) => !o && setDeleteTarget(null)}
			>
				<DialogContent className='max-w-sm'>
					<DialogHeader>
						<DialogTitle className='flex items-center gap-2 text-base'>
							<div className='w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200'>
								<AlertTriangle className='w-4 h-4 text-amber-500' />
							</div>
							Deactivate HSN?
						</DialogTitle>
						<DialogDescription className='text-xs pt-1'>
							{deleteTarget && (
								<>
									<strong className='text-foreground font-mono'>
										{deleteTarget.hsnCode}
									</strong>{" "}
									will be marked as inactive. It will remain visible in the All
									and Inactive tabs.
								</>
							)}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant='outline'
							size='sm'
							className='h-8 text-xs'
							onClick={() => setDeleteTarget(null)}
						>
							Cancel
						</Button>
						<Button
							size='sm'
							className='h-8 text-xs text-white bg-red-600 hover:bg-red-700'
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
