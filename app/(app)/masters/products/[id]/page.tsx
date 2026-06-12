"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	Edit2,
	FileText,
	UserCheck,
	UserX,
	Info,
	Building2,
	ShoppingBag,
	Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	formatMoney,
	loadProducts,
	saveProducts,
	type Product,
	type ProductStatus,
} from "../product-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppLayout } from "@/components/layout/AppLayout";

const STATUS_CFG: Record<
	ProductStatus,
	{ bg: string; text: string; dot: string; label: string }
> = {
	active: {
		bg: "bg-emerald-50 border-emerald-200",
		text: "text-emerald-700",
		dot: "bg-emerald-500",
		label: "Active",
	},
	inactive: {
		bg: "bg-slate-100 border-slate-200",
		text: "text-slate-600",
		dot: "bg-slate-400",
		label: "Inactive",
	},
};

function StatusBadge({ status }: { status: ProductStatus }) {
	const cfg = STATUS_CFG[status] || {
		bg: "bg-slate-100 border-slate-200",
		text: "text-slate-600",
		dot: "bg-slate-400",
		label: status,
	};
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
				cfg.bg,
				cfg.text,
			)}
		>
			<span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
			{cfg.label}
		</span>
	);
}

function DetailField({
	label,
	value,
	mono,
}: {
	label: string;
	value?: React.ReactNode;
	mono?: boolean;
}) {
	const displayVal =
		value !== undefined && value !== null && value !== "" ? value : "—";
	return (
		<div className='py-2 space-y-1 border-b border-border/50 last:border-0'>
			<span className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider'>
				{label}
			</span>
			<p
				className={cn(
					"text-xs font-semibold text-foreground",
					mono && "font-mono",
				)}
			>
				{displayVal}
			</p>
		</div>
	);
}

export default function ProductDetailPage() {
	const router = useRouter();
	const { id } = useParams<{ id: string }>();
	const [product, setProduct] = useState<Product | null>(null);
	const [records, setRecords] = useState<Product[]>([]);
	const [activeSubTab, setActiveSubTab] = useState("overview");
	const [previewDoc, setPreviewDoc] = useState<{
		title: string;
		fileUrl: string;
		fileName: string;
	} | null>(null);

	useEffect(() => {
		const list = loadProducts();
		setRecords(list);
		setProduct(list.find((item) => item.id === Number(id)) ?? null);
	}, [id]);

	const updateStatus = (status: ProductStatus) => {
		if (!product) return;
		const updated = records.map((item) =>
			item.id === product.id
				? {
						...item,
						status,
						updatedBy: "Admin",
						updatedDate: new Date().toISOString().slice(0, 10),
					}
				: item,
		);
		setRecords(updated);
		saveProducts(updated);
		setProduct(updated.find((item) => item.id === product.id) ?? null);
	};

	if (!product) {
		return (
			<div className='py-16 text-center'>
				<p className='text-sm text-muted-foreground'>Product not found.</p>
				<Link
					href='/masters/products'
					className='inline-block mt-2 text-xs text-brand-600 hover:underline'
				>
					Back to listing
				</Link>
			</div>
		);
	}

	const assets = product.assets ?? product.mediaItems ?? [];
	const mediaCount = assets.length;

	const tabs = [
		{ id: "overview", label: "Overview", icon: Info },
		{ id: "media", label: `Media & Assets (${mediaCount})`, icon: FileText },
	];

	const openExternal = (url?: string) => {
		if (!url) return;
		const trimmedUrl = url.trim();
		const isAbsoluteUrl =
			/^https?:\/\//i.test(trimmedUrl) ||
			/^blob:/i.test(trimmedUrl) ||
			/^data:/i.test(trimmedUrl);
		const safeUrl = isAbsoluteUrl ? trimmedUrl : `https://${trimmedUrl}`;
		window.open(safeUrl, "_blank", "noopener,noreferrer");
	};

	const getUrl = (item: (typeof assets)[number]) =>
		item.url ?? item.fileUrl ?? item.previewUrl ?? item.src ?? "";

	const getLabel = (item: (typeof assets)[number]) => {
		if (item.type === "link") return "Link";
		switch (item.mediaKind ?? item.fileType?.toLowerCase()) {
			case "video":
				return "Video";
			case "pdf":
				return "PDF";
			case "document":
				return "Document";
			case "spreadsheet":
				return "Spreadsheet";
			default:
				return "Image";
		}
	};

	return (
		<AppLayout>
			<div className='w-full space-y-6'>
				{/* ── HEADER SECTION ── */}
				<div className='flex flex-col gap-4 pb-5 border-b sm:flex-row sm:items-center sm:justify-between border-border/80'>
					<div className='flex items-center gap-3'>
						<Button
							variant='outline'
							size='icon'
							className='w-8 h-8 rounded-lg hover:bg-muted border-border'
							onClick={() => router.push("/masters/products")}
						>
							<ArrowLeft className='w-4 h-4 text-muted-foreground' />
						</Button>
						<h1 className='text-base font-bold text-foreground'>
							Product Details
						</h1>
					</div>

					<div className='flex items-center gap-2'>
						<StatusBadge status={product.status} />
						<Button
							variant='outline'
							size='sm'
							className='h-9 gap-1.5 rounded-lg text-xs font-semibold'
							onClick={() =>
								updateStatus(product.status === "active" ? "inactive" : "active")
							}
						>
							{product.status === "active" ? (
								<UserX className='h-3.5 w-3.5' />
							) : (
								<UserCheck className='h-3.5 w-3.5' />
							)}
							{product.status === "active" ? "Deactivate" : "Activate"}
						</Button>
						<Link href={`/masters/products/${product.id}/edit`}>
							<Button
								size='sm'
								className='h-9 gap-1.5 bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700 rounded-lg shadow-sm'
							>
								<Edit2 className='w-3.5 h-3.5' /> Edit Product
							</Button>
						</Link>
					</div>
				</div>

				{/* ── TOP SUMMARY CARD & KPI BLOCKS ── */}
				<div className='grid grid-cols-1 gap-5 lg:grid-cols-3'>
					{/* Profile Summary Card */}
					<div className='flex flex-col justify-between p-5 bg-white border shadow-sm lg:col-span-2 rounded-xl border-border'>
						<div className='flex items-start gap-4'>
							<div className='flex items-center justify-center flex-shrink-0 w-12 h-12 text-lg font-bold border rounded-full bg-brand-50 border-brand-100 text-brand-600'>
								{product.productName.charAt(0).toUpperCase()}
							</div>
							<div className='space-y-1'>
								<div className='flex flex-wrap items-center gap-2'>
									<h2 className='text-base font-bold text-foreground'>
										{product.productName}
									</h2>
									<span className='font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md'>
										{product.productId}
									</span>
									<StatusBadge status={product.status} />
								</div>
								<div className='flex flex-wrap items-center text-xs gap-x-4 gap-y-1 text-muted-foreground'>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>SKU/Code:</span>
										{product.sku || "—"}
									</span>
									<span>•</span>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Category:
										</span>
										{product.category || "—"}
									</span>
									<span>•</span>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Sub Category:
										</span>
										{product.subCategory || "—"}
									</span>
								</div>
								<div className='flex flex-wrap items-center pt-1 text-xs gap-x-4 gap-y-1 text-muted-foreground'>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Segment:
										</span>
										{product.segment || "—"}
									</span>
									<span>•</span>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Formulation:
										</span>
										{product.formulation || "—"}
									</span>
									<span>•</span>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											GST Rate:
										</span>
										{product.gstRate || "—"}
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* 3 Compact KPI blocks */}
					<div className='grid grid-cols-3 gap-3'>
						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								MRP
							</p>
							<p className='mt-1 font-mono text-base font-bold text-foreground'>
								{formatMoney(product.mrp)}
							</p>
						</div>

						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								GST Rate
							</p>
							<p className='mt-1 font-mono text-base font-bold text-foreground'>
								{product.gstRate || "—"}
							</p>
						</div>

						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Media / Assets
							</p>
							<p className='mt-1 font-mono text-base font-bold text-foreground'>
								{mediaCount}
							</p>
						</div>
					</div>
				</div>

				{/* ── UNDERLINE TAB NAVIGATION ── */}
				<div className='border-b border-border'>
					<div className='flex gap-6'>
						{tabs.map((t) => {
							const active = activeSubTab === t.id;
							const Icon = t.icon;
							return (
								<button
									key={t.id}
									className={cn(
										"pb-3 text-xs font-semibold border-b-2 transition-colors focus:outline-none flex items-center gap-1.5",
										active
											? "border-brand-600 text-brand-600 font-bold"
											: "border-transparent text-muted-foreground hover:text-foreground",
									)}
									onClick={() => setActiveSubTab(t.id)}
								>
									<Icon className='w-3.5 h-3.5' />
									{t.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* ── TAB CONTENT ── */}
				<div className='w-full'>
					{/* TAB 1: OVERVIEW */}
					{activeSubTab === "overview" && (
						<div className='space-y-5'>
							<div className='p-6 space-y-6 bg-white border shadow-sm rounded-xl border-border'>
								{/* Section 1: Product Information */}
								<div className='space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Product Information
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='Product Code / ID'
											value={product.productId}
											mono
										/>
										<DetailField
											label='Product Name'
											value={product.productName}
										/>
										<DetailField
											label='SKU'
											value={product.sku}
											mono
										/>
										<DetailField
											label='Status'
											value={<StatusBadge status={product.status} />}
										/>
									</div>
								</div>

								{/* Section 2: Category & Classification */}
								<div className='pt-2 space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Category & Classification
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField label='Category' value={product.category} />
										<DetailField label='Sub Category' value={product.subCategory} />
										<DetailField label='Segment' value={product.segment} />
										<DetailField label='Formulation' value={product.formulation} />
									</div>
								</div>

								{/* Section 3: Pricing & Compliance */}
								<div className='pt-2 space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Pricing & Compliance
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='HSN Code'
											value={product.hsnCode}
											mono
										/>
										<DetailField
											label='GST Rate'
											value={product.gstRate}
										/>
										<DetailField
											label='MRP'
											value={formatMoney(product.mrp)}
										/>
										<DetailField
											label='Crop Applicable'
											value={product.cropApplicable}
										/>
									</div>
								</div>

								{/* Section 4: Unit & Conversion Details */}
								<div className='pt-2 space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Unit & Conversion Details
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField label='Base Unit' value={product.baseUnit} />
										<DetailField label='Packaging Unit' value={product.packagingUnit} />
										<DetailField
											label='Conversion Quantity'
											value={
												product.conversionQuantity !== undefined
													? String(product.conversionQuantity)
													: "—"
											}
										/>
									</div>
								</div>

								{/* Section 5: System Audit Details */}
								<div className='pt-2 space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Audit Details
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='Created By'
											value={product.createdBy}
										/>
										<DetailField
											label='Created Date'
											value={product.createdDate}
										/>
										<DetailField
											label='Updated By'
											value={product.updatedBy}
										/>
										<DetailField
											label='Updated Date'
											value={product.updatedDate}
										/>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* TAB 2: MEDIA / ASSETS */}
					{activeSubTab === "media" && (
						<div>
							{assets.length === 0 ? (
								<div className='p-8 text-xs text-center bg-white border shadow-sm rounded-xl border-border text-muted-foreground'>
									No assets uploaded.
								</div>
							) : (
								<div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
									{assets.map((item, idx) => {
										const url = getUrl(item);
										const isImage =
											item.type === "media" &&
											(item.mediaKind === "image" || item.kind === "image");
										return (
											<div
												key={item.id || idx}
												className='p-4 space-y-3 bg-white border shadow-sm rounded-xl border-border'
											>
												<div className='flex items-start justify-between gap-3'>
													<div className='flex min-w-0 items-start gap-3'>
														<div className='flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/20 text-brand-600 flex-shrink-0'>
															{isImage && url ? (
																<img
																	src={url}
																	alt={item.name}
																	className='h-full w-full object-cover'
																/>
															) : (
																<FileText className='h-4 w-4 text-muted-foreground' />
															)}
														</div>
														<div className='min-w-0'>
															<p className='truncate text-xs font-semibold text-foreground'>
																{item.title || item.name}
															</p>
															<p className='truncate text-[10px] text-muted-foreground mt-0.5'>
																{item.size ||
																	item.fileType ||
																	item.mediaKind ||
																	item.type}
															</p>
														</div>
													</div>
													<span
														className={cn(
															"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border shrink-0",
															item.uploaded
																? "bg-emerald-50 text-emerald-700 border-emerald-150"
																: "bg-amber-50 text-amber-700 border-amber-150",
														)}
													>
														{getLabel(item)}
													</span>
												</div>
												<div className='flex items-center justify-end gap-2 pt-1.5 border-t border-border/40'>
													{url ? (
														<Button
															type='button'
															variant='outline'
															className='h-7 px-3 text-[10px] gap-1'
															onClick={() =>
																isImage
																	? setPreviewDoc({
																			title: item.title || item.name,
																			fileUrl: url,
																			fileName: item.name || "image",
																		})
																	: openExternal(url)
															}
														>
															<Eye className='w-3 h-3 text-muted-foreground' /> View
														</Button>
													) : (
														<span className='text-[10px] text-muted-foreground'>—</span>
													)}
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Image Preview Modal */}
			<Dialog
				open={!!previewDoc}
				onOpenChange={(open) => !open && setPreviewDoc(null)}
			>
				<DialogContent className='max-w-2xl bg-white'>
					<DialogHeader>
						<DialogTitle className='text-sm font-semibold'>
							{previewDoc?.title}
						</DialogTitle>
					</DialogHeader>
					<div className='flex flex-col items-center justify-center p-4 border border-dashed rounded-lg border-border bg-muted/10 min-h-[300px]'>
						{previewDoc && (
							<img
								src={previewDoc.fileUrl}
								alt={previewDoc.title}
								className='max-h-[50vh] max-w-full object-contain rounded-md animate-in zoom-in-95 duration-200'
							/>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</AppLayout>
	);
}
