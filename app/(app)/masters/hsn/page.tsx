"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
	CheckCircle2,
	XCircle,
	X,
	Edit2,
	Code2,
	Eye,
	Trash2,
	AlertCircle,
} from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	HSNMaster,
	loadHSNMasters,
	saveHSNMasters,
	todayStr,
	nextHSNId,
	generateHSNCode,
} from "./hsn-data";
import { loadGSTMasters } from "../gst/gst-data";
import { MiniKPICard } from "@/components/ui/KPICard";
import { MasterListingSheets, buildSimpleMasterViewDrawer } from "@/components/masters/MasterListingSheets";

import { MasterListing } from "@/components/listing/MasterListing";
import { applyFilters } from "@/components/listing/filter-utils";
import {
	ColumnConfig,
	FilterState,
	SortState,
	ActionItemConfig,
} from "@/components/listing/types";

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

function StatusToggle({
	record,
	onToggle,
}: {
	record: HSNMaster;
	onToggle: (item: HSNMaster) => void;
}) {
	const active = record.status === "active";
	return (
		<button
			type='button'
			onClick={(e) => {
				e.stopPropagation();
				onToggle(record);
			}}
			className={cn(
				"inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
				active
					? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
					: "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
			)}
		>
			{active ? "Active" : "Inactive"}
		</button>
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

	// Sheet & Dialog states
	const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(
		null,
	);
	const [active, setActive] = useState<HSNMaster | null>(null);
	const [form, setForm] = useState({
		hsnCode: "",
		hsnDescription: "",
		gstRate: "",
		status: "active" as "active" | "inactive",
	});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [deleteTarget, setDeleteTarget] = useState<HSNMaster | null>(null);

	useEffect(() => {
		setRecords(loadHSNMasters());
	}, []);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 3000);
		return () => clearTimeout(t);
	}, [toast]);

	const gstRatesList = useMemo(() => {
		try {
			const list = loadGSTMasters();
			if (list && list.length > 0) {
				const sorted = [...list].sort(
					(a, b) => a.gstPercentage - b.gstPercentage,
				);
				return Array.from(new Set(sorted.map((g) => `${g.gstPercentage}%`)));
			}
		} catch {
			// ignore
		}
		return ["0%", "5%", "12%", "18%", "28%"];
	}, []);

	useEffect(() => {
		if (gstRatesList.length > 0 && !form.gstRate) {
			setForm((prev) => ({ ...prev, gstRate: gstRatesList[0] }));
		}
	}, [gstRatesList, form.gstRate]);

	const toggleStatus = (record: HSNMaster) => {
		const newStatus = record.status === "active" ? "inactive" : "active";
		const updated = records.map((r) =>
			r.id === record.id
				? {
						...r,
						status: newStatus as "active" | "inactive",
						updatedBy: "Admin",
						updatedDate: todayStr(),
					}
				: r,
		);
		setRecords(updated);
		saveHSNMasters(updated);
		setToast({
			msg: `HSN status updated to ${newStatus === "active" ? "Active" : "Inactive"}`,
			type: "success",
		});
	};

	const columns: ColumnConfig<HSNMaster>[] = [
		{
			key: "hsnCode",
			header: "HSN Code",
			sortable: true,
			filterable: true,
			filterType: "text",
			width: "140px",
			render: (val, row) => (
				<span className='font-mono font-bold text-foreground'>
					{row.hsnCode}
				</span>
			),
		},
		{
			key: "hsnDescription",
			header: "HSN Description",
			sortable: true,
			filterable: true,
			filterType: "text",
			width: "320px",
			render: (val, row) => row.hsnDescription,
		},
		{
			key: "gstRate",
			header: "GST Rate",
			sortable: true,
			filterable: true,
			filterType: "dropdown",
			filterOptions: gstRatesList.map((rate) => ({ label: rate, value: rate })),
			width: "120px",
		},

		{
			key: "createdBy",
			header: "Created By",
			sortable: true,
			filterable: true,
			filterType: "text",
			width: "120px",
		},
		{
			key: "updatedBy",
			header: "Updated By",
			sortable: true,
			filterable: true,
			filterType: "text",
			width: "120px",
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
			width: "130px",
			render: (val, row) => (
				<StatusToggle record={row} onToggle={toggleStatus} />
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

		// Search filter
		if (filters.search) {
			const q = String(filters.search).toLowerCase();
			result = result.filter(
				(r) =>
					r.hsnCode.toLowerCase().includes(q) ||
					r.hsnDescription.toLowerCase().includes(q),
			);
		}

		// Apply column filters
		result = applyFilters(result, filters);

		// Sorting
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
	}, [records, filters, sort]);

	const paginated = useMemo(() => {
		const startOffset = (page - 1) * pageSize;
		return filtered.slice(startOffset, startOffset + pageSize);
	}, [filtered, page, pageSize]);

	useEffect(() => {
		setPage(1);
	}, [filters, sort, pageSize]);

	const openAdd = () => {
		const nextIdVal = nextHSNId(records);
		const code = generateHSNCode(nextIdVal);
		setForm({
			hsnCode: code,
			hsnDescription: "",
			gstRate: gstRatesList[0] || "18%",
			status: "active",
		});
		setErrors({});
		setActive(null);
		setSheetMode("add");
	};

	const openEdit = (row: HSNMaster) => {
		setForm({
			hsnCode: row.hsnCode,
			hsnDescription: row.hsnDescription,
			gstRate: row.gstRate,
			status: row.status,
		});
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

	const setFormField = (key: string, value: any) => {
		setForm((prev) => ({ ...prev, [key]: value }));
		if (errors[key]) {
			setErrors((prev) => {
				const copy = { ...prev };
				delete copy[key];
				return copy;
			});
		}
	};

	const validate = (): boolean => {
		const e: Record<string, string> = {};
		if (!form.hsnCode.trim()) e.hsnCode = "HSN Code is required";
		if (!form.hsnDescription.trim())
			e.hsnDescription = "HSN Description is required";
		if (!form.gstRate) e.gstRate = "GST Rate is required";
		setErrors(e);
		return Object.keys(e).length === 0;
	};

	const persist = () => {
		if (!validate()) return;
		const list = loadHSNMasters();
		let updatedList: HSNMaster[];
		if (sheetMode === "add") {
			const id = nextHSNId(list);
			const newRecord: HSNMaster = {
				id,
				hsnCode: form.hsnCode,
				hsnDescription: form.hsnDescription,
				gstRate: form.gstRate,
				status: form.status,
				createdBy: "Admin",
				createdDate: todayStr(),
				updatedBy: "Admin",
				updatedDate: todayStr(),
			};
			updatedList = [...list, newRecord];
			setToast({ msg: "HSN added successfully", type: "success" });
		} else if (active) {
			updatedList = list.map((r) =>
				r.id === active.id
					? {
							...r,
							hsnCode: form.hsnCode,
							hsnDescription: form.hsnDescription,
							gstRate: form.gstRate,
							status: form.status,
							updatedBy: "Admin",
							updatedDate: todayStr(),
						}
					: r,
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
		const list = loadHSNMasters().filter((r) => r.id !== deleteTarget.id);
		saveHSNMasters(list);
		setRecords(list);
		setDeleteTarget(null);
		setToast({ msg: "HSN deleted successfully", type: "success" });
	};

	const handleExport = () => {
		try {
			const headers = [
				"ID",
				"HSN Code",
				"HSN Description",
				"GST Rate",
				"Status",
				"Created By",
				"Created Date",
				"Updated By",
				"Updated Date",
			];
			const csvRows = [headers.join(",")];
			for (const r of records) {
				const row = [
					r.id,
					`"${r.hsnCode.replace(/"/g, '""')}"`,
					`"${r.hsnDescription.replace(/"/g, '""')}"`,
					r.gstRate,
					r.status,
					r.createdBy,
					r.createdDate,
					r.updatedBy,
					r.updatedDate,
				];
				csvRows.push(row.join(","));
			}
			const blob = new Blob([csvRows.join("\n")], {
				type: "text/csv;charset=utf-8;",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.setAttribute("href", url);
			link.setAttribute("download", `hsn_export_${todayStr()}.csv`);
			link.style.visibility = "hidden";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			setToast({ msg: "HSN configs exported successfully", type: "success" });
		} catch {
			setToast({ msg: "Failed to export HSN configs", type: "error" });
		}
	};

	const sheetTitle =
		sheetMode === "add"
			? "Add HSN"
			: sheetMode === "edit"
				? "Edit HSN"
				: "View HSN";

	return (
		<AppLayout>
			<div className='space-y-5'>
				<div>
					<h1 className='text-xl font-bold text-foreground'>HSN Master</h1>
					<p className='text-xs text-muted-foreground mt-0.5'>
						Manage Harmonized System of Nomenclature codes and GST
						configurations
					</p>
				</div>

				{/* <div className="grid grid-cols-3 gap-3">
          <MiniKPICard label="Total HSN Codes" value={records.length} icon={Code2} accent={true} />
          <MiniKPICard
            label="Active"
            value={records.filter((r) => r.status === "active").length}
            icon={CheckCircle2}
            accent={false}
          />
          <MiniKPICard
            label="Inactive"
            value={records.filter((r) => r.status === "inactive").length}
            icon={XCircle}
            accent={false}
          />
        </div> */}

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
					emptyMessage='HSN configs'
					searchPlaceholder='Search HSN code, description...'
					currentFilters={filters}
					currentSort={sort}
				/>
			</div>

			<MasterListingSheets
				sheetMode={sheetMode}
				active={active}
				onClose={closeSheet}
				onEdit={() => active && openEdit(active)}
				onSave={persist}
				sheetTitle={sheetTitle}
				icon={Code2}
				viewDrawer={
					active
						? buildSimpleMasterViewDrawer<HSNMaster>({
								drawerTitle: "HSN",
								getRecordCode: (r) => r.hsnCode,
								basicInfo: (r) => [
									{ label: "HSN Code", value: r.hsnCode, mono: true },
									{ label: "GST Rate", value: r.gstRate },
								],
								description: (r) => r.hsnDescription,
								showDescription: true,
							})(active)
						: { title: "HSN", basicInfo: [] }
				}
				formContent={
					<div className='space-y-4'>
						{errors._form && (
							<p className='text-xs text-red-600'>{errors._form}</p>
						)}
						<div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
							<div className='space-y-1'>
								<Label className='text-xs font-medium'>
									HSN Code <span className='text-red-500'>*</span>
								</Label>
								<Input
									value={form.hsnCode}
									disabled
									readOnly
									className='h-8 text-xs cursor-not-allowed bg-muted/30 text-muted-foreground'
								/>
							</div>
							<div className='space-y-1'>
								<Label className='text-xs font-medium'>
									GST Rate <span className='text-red-500'>*</span>
								</Label>
								<Select
									value={form.gstRate}
									onValueChange={(v) => setFormField("gstRate", v)}
								>
									<SelectTrigger className={cn("h-8 text-xs bg-background w-full", errors.gstRate && "border-red-400 focus:ring-red-300")}>
										<SelectValue placeholder='Select GST rate…' />
									</SelectTrigger>
									<SelectContent className='bg-white border shadow-lg border-border z-[350]'>
										{gstRatesList.map((rate) => (
											<SelectItem key={rate} value={rate} className='text-xs'>
												{rate}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{errors.gstRate && (
									<p className='text-[11px] text-red-500'>
										{errors.gstRate}
									</p>
								)}
							</div>
							<div className='space-y-1 sm:col-span-2'>
								<Label className='text-xs font-medium'>
									HSN Description <span className='text-red-500'>*</span>
								</Label>
								<Textarea
									value={form.hsnDescription}
									onChange={(e) =>
										setFormField("hsnDescription", e.target.value)
									}
									placeholder='Describe this HSN code...'
									rows={3}
									className={cn(
										"text-xs rounded-lg resize-none min-h-[72px]",
										errors.hsnDescription &&
											"border-red-400 focus-visible:ring-red-300",
									)}
								/>
								{errors.hsnDescription && (
									<p className='text-[11px] text-red-500'>
										{errors.hsnDescription}
									</p>
								)}
							</div>
						</div>
					</div>
				}
			/>

			<Dialog
				open={!!deleteTarget}
				onOpenChange={(o) => !o && setDeleteTarget(null)}
			>
				<DialogContent className='max-w-sm'>
					<DialogHeader>
						<DialogTitle className='text-sm'>Delete record?</DialogTitle>
						<DialogDescription className='text-xs'>
							This action cannot be undone. The record will be permanently
							removed.
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
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
		</AppLayout>
	);
}
