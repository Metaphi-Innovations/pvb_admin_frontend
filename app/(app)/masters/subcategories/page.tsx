"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
	CheckCircle2,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronsUpDown,
	Download,
	Edit2,
	Eye,
	MoreVertical,
	Plus,
	Search,
	SlidersHorizontal,
	X,
	Folder,
	XCircle,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	loadSubCategories,
	saveSubCategories,
	type SubCategory,
	type SubCategoryStatus,
	todayStr,
} from "./subcategory-data";
import { MiniKPICard } from "@/components/ui/KPICard";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";

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
	record: SubCategory;
	onToggle: (item: SubCategory) => void;
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

export default function SubCategoryMasterPage() {
	const router = useRouter();
	const [records, setRecords] = useState<SubCategory[]>([]);
	const [filters, setFilters] = useState<FilterState>({});
	const [sort, setSort] = useState<SortState>({ key: "subCategoryCode", direction: "asc" });
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [toast, setToast] = useState<ToastState | null>(null);

	useEffect(() => {
		setRecords(loadSubCategories());
	}, []);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 3000);
		return () => clearTimeout(t);
	}, [toast]);

	const toggleStatus = (record: SubCategory) => {
		const nextStatus: SubCategoryStatus =
			record.status === "active" ? "inactive" : "active";
		const updated = records.map((item) =>
			item.id === record.id
				? {
						...item,
						status: nextStatus,
						updatedBy: "Admin",
						updatedDate: todayStr(),
					}
				: item,
		);
		setRecords(updated);
		saveSubCategories(updated);
		setToast({
			msg: `Sub Category status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`,
			type: "success",
		});
	};

	const columns: ColumnConfig<SubCategory>[] = [
		{
			key: "subCategoryCode",
			header: "Sub Category Code",
			sortable: true,
			filterable: true,
			filterType: "text",
			width: "130px",
		},
		{
			key: "subCategoryName",
			header: "Sub Category Name",
			sortable: true,
			filterable: true,
			filterType: "text",
			width: "210px",
		},
		{
			key: "categoryName",
			header: "Category",
			sortable: true,
			filterable: true,
			filterType: "text",
			width: "180px",
		},
		{
			key: "description",
			header: "Description",
			sortable: true,
			filterable: true,
			filterType: "text",
			width: "300px",
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
			width: "110px",
			render: (val, row) => (
				<StatusToggle record={row} onToggle={toggleStatus} />
			),
		},
	];

	const actions: ActionItemConfig<SubCategory>[] = [
		{
			label: "View",
			action: "view",
			icon: Eye,
			onClick: (row) => router.push(`/masters/subcategories/${row.id}`),
		},
		{
			label: "Edit",
			action: "edit",
			icon: Edit2,
			onClick: (row) => router.push(`/masters/subcategories/${row.id}/edit`),
		},
	];

	const filtered = useMemo(() => {
		let result = [...records];

		if (filters.search) {
			const q = String(filters.search).trim().toLowerCase();
			result = result.filter(
				(r) =>
					r.subCategoryCode.toLowerCase().includes(q) ||
					r.subCategoryName.toLowerCase().includes(q) ||
					r.categoryName.toLowerCase().includes(q) ||
					(r.description || "").toLowerCase().includes(q)
			);
		}

		if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
			result = result.filter((r) => (filters.status as string[]).includes(r.status));
		}

		if (sort.key && sort.direction !== "none") {
			result.sort((a, b) => {
				const aVal = String(a[sort.key as keyof SubCategory] || "").toLowerCase();
				const bVal = String(b[sort.key as keyof SubCategory] || "").toLowerCase();
				const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
				return sort.direction === "asc" ? cmp : -cmp;
			});
		}

		return result;
	}, [records, filters, sort]);

	const paginated = useMemo(() => {
		const start = (page - 1) * pageSize;
		return filtered.slice(start, start + pageSize);
	}, [filtered, page, pageSize]);

	useEffect(() => {
		setPage(1);
	}, [filters, sort, pageSize]);

	const handleExport = () => {
		try {
			const headers = ["ID", "Sub Category Code", "Sub Category Name", "Category Name", "Description", "Status"];
			const csvRows = [headers.join(",")];
			for (const r of records) {
				const row = [
					r.id,
					`"${r.subCategoryCode.replace(/"/g, '""')}"`,
					`"${r.subCategoryName.replace(/"/g, '""')}"`,
					`"${r.categoryName.replace(/"/g, '""')}"`,
					`"${(r.description || "").replace(/"/g, '""')}"`,
					r.status,
				];
				csvRows.push(row.join(","));
			}
			const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.setAttribute("href", url);
			link.setAttribute("download", `subcategories_export_${todayStr()}.csv`);
			link.style.visibility = "hidden";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			setToast({ msg: "Subcategories exported successfully", type: "success" });
		} catch {
			setToast({ msg: "Failed to export subcategories", type: "error" });
		}
	};

	return (
		<AppLayout>
			<div className='space-y-5'>
				<div>
					<h1 className='text-xl font-bold text-foreground'>
						Sub Category Master
					</h1>
					<p className='mt-0.5 text-xs text-muted-foreground'>
						Manage sub categories linked to category master
					</p>
				</div>

				<div className="grid grid-cols-3 gap-3">
					<MiniKPICard label="Total Sub Categories" value={records.length} icon={Folder} accent={true} />
					<MiniKPICard label="Active" value={records.filter((r) => r.status === "active").length} icon={CheckCircle2} accent={false} />
					<MiniKPICard label="Inactive" value={records.filter((r) => r.status === "inactive").length} icon={XCircle} accent={false} />
				</div>

				<MasterListing<SubCategory>
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
					onAdd={() => router.push('/masters/subcategories/add')}
					addLabel="Add Sub Category"
					onExport={handleExport}
					emptyMessage="sub categories"
					searchPlaceholder="Search sub category code, name, category..."
					currentFilters={filters}
					currentSort={sort}
				/>
				{toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
			</div>
		</AppLayout>
	);
}
