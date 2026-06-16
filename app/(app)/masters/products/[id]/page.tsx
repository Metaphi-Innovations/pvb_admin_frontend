"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import {
	RecordDetailPage,
	RecordKvRow,
	RecordSectionCard,
	RecordStatusPill,
} from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	Clock,
	FileText,
	IndianRupee,
	Package,
	Pencil,
	Tag,
} from "lucide-react";
import {
	formatMoney,
	loadProducts,
	saveProducts,
	type Product,
	type ProductStatus,
} from "../product-data";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

const STATUS_LABEL: Record<ProductStatus | "draft", string> = {
	active: "Active",
	inactive: "Inactive",
	draft: "Draft",
};

const STATUS_VARIANT: Record<ProductStatus | "draft", "active" | "inactive" | "draft"> = {
	active: "active",
	inactive: "inactive",
	draft: "draft",
};

function MediaSection({ product }: { product: Product }) {
	const [selectedItem, setSelectedItem] = useState<{
		src: string;
		name: string;
	} | null>(null);
	const items = product.assets ?? product.mediaItems ?? [];
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
	const getUrl = (item: (typeof items)[number]) =>
		item.url ?? item.fileUrl ?? item.previewUrl ?? item.src ?? "";
	const getLabel = (item: (typeof items)[number]) => {
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
		<div className='space-y-4'>
			<div className='space-y-1'>
				<p className='text-xs font-semibold text-foreground'>
					Uploaded Assets ({items.length})
				</p>
				<p className='text-[11px] text-muted-foreground'>
					Read-only media, documents, spreadsheets, and links.
				</p>
			</div>
			{items.length === 0 ? (
				<p className='px-1 py-4 text-sm text-muted-foreground'>
					No assets uploaded.
				</p>
			) : (
				<div className='space-y-3'>
					{items.map((item) => {
						const url = getUrl(item);
						const isImage =
							item.type === "media" &&
							(item.mediaKind === "image" || item.kind === "image");
						return (
							<div
								key={item.id}
								className='rounded-xl border border-border bg-white p-3 shadow-sm'
							>
								<div className='flex items-start justify-between gap-3'>
									<div className='flex items-start gap-3 min-w-0'>
										<div className='flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/20 text-brand-600'>
											{isImage && url ? (
												<img
													src={url}
													alt={item.name}
													className='h-full w-full object-cover'
												/>
											) : (
												<FileText className='h-4 w-4' />
											)}
										</div>
										<div className='min-w-0'>
											<p className='text-xs font-medium text-foreground truncate'>
												{item.title || item.name}
											</p>
											<p className='text-[11px] text-muted-foreground truncate'>
												{item.size ||
													item.fileType ||
													item.mediaKind ||
													item.type}
											</p>
										</div>
									</div>
									<span
										className={cn(
											"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
											item.uploaded
												? "bg-emerald-50 text-emerald-700"
												: "bg-amber-50 text-amber-700",
										)}
									>
										{getLabel(item)}
									</span>
								</div>
								<div className='mt-3 flex items-center justify-end gap-2'>
									<Button
										type='button'
										variant='outline'
										className='h-8 px-3 text-[11px]'
										onClick={() =>
											item.type === "media" &&
											(item.mediaKind === "image" || item.kind === "image") &&
											url
												? setSelectedItem({ src: url, name: item.name })
												: openExternal(url)
										}
										disabled={!url}
									>
										Open
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			<Dialog
				open={!!selectedItem}
				onOpenChange={(open) => !open && setSelectedItem(null)}
			>
				<DialogContent className='max-w-3xl p-4 bg-white border border-border rounded-xl shadow-lg'>
					<DialogHeader className='pb-2 border-b border-border/50'>
						<DialogTitle className='text-sm font-semibold text-foreground truncate'>
							{selectedItem?.name}
						</DialogTitle>
					</DialogHeader>
					<div className='flex items-center justify-center overflow-hidden bg-muted/5 rounded-lg py-4'>
						<img
							src={selectedItem?.src}
							alt={selectedItem?.name}
							className='max-h-[70vh] max-w-full object-contain rounded-md'
						/>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export default function ProductDetailPage() {
	const router = useRouter();
	const { id } = useParams<{ id: string }>();
	const [product, setProduct] = useState<Product | null>(null);
	const [records, setRecords] = useState<Product[]>([]);
	const [activeTab, setActiveTab] = useState("overview");

	useEffect(() => {
		const list = loadProducts();
		setRecords(list);
		setProduct(list.find((item) => item.id === Number(id)) ?? null);
	}, [id]);

	const mediaCount = useMemo(
		() => (product?.assets ?? product?.mediaItems ?? []).length,
		[product],
	);

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
			<AppLayout>
				<div className='py-16 text-center'>
					<p className='text-sm text-muted-foreground'>Product not found.</p>
					<Link
						href='/masters/products'
						className='text-xs text-brand-600 hover:underline mt-2 inline-block'
					>
						Back to listing
					</Link>
				</div>
			</AppLayout>
		);
	}

	const tabs = [
		{ value: "overview", label: "Overview" },
		...(mediaCount > 0
			? [{ value: "media", label: "Media", count: mediaCount }]
			: []),
	];

	const kpis = [
		{
			icon: Tag,
			iconBg: "#EEF3FB",
			iconColor: "#0C3F8A",
			value: product.category || "—",
			label: "Category",
		},
		{
			icon: Package,
			iconBg: "#E6F7EF",
			iconColor: "#1E9E61",
			value: product.sku || "—",
			label: "SKU",
		},
		{
			icon: IndianRupee,
			iconBg: "#FFFBEB",
			iconColor: "#D97706",
			value: formatMoney(product.mrp),
			label: "MRP",
		},
		{
			icon: FileText,
			iconBg: "#F5F3FF",
			iconColor: "#7C3AED",
			value: product.hsnCode || "—",
			label: "HSN Code",
		},
	];

	const renderTabContent = () => {
		switch (activeTab) {
			case "overview":
				return (
					<div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
						<RecordSectionCard
							title='Product Details'
							icon={Package}
							accent='blue'
						>
							<RecordKvRow
								label='Product ID'
								value={product.productId}
								mono
								copy
							/>
							<RecordKvRow
								label='Product Name'
								value={product.productName}
								highlight
							/>
							<RecordKvRow label='Category' value={product.category} />
							<RecordKvRow label='Segment' value={product.segment} />
							<RecordKvRow label='Formulation' value={product.formulation} />
							<RecordKvRow label='Base Unit' value={product.baseUnit} />
							<RecordKvRow
								label='Packaging Unit'
								value={product.packagingUnit}
							/>
							<RecordKvRow
								label='Conversion Quantity'
								value={
									product.conversionQuantity !== undefined
										? String(product.conversionQuantity)
										: undefined
								}
								isLast
							/>
						</RecordSectionCard>

						<RecordSectionCard
							title='Tax & Pricing'
							icon={IndianRupee}
							accent='orange'
						>
							<RecordKvRow label='HSN Code' value={product.hsnCode} mono copy />
							<RecordKvRow label='GST Rate' value={product.gstRate} />
							<RecordKvRow
								label='MRP'
								value={formatMoney(product.mrp)}
								amount
								highlight
								isLast
							/>
						</RecordSectionCard>

						<RecordSectionCard
							title='Commercial & Stock'
							icon={Tag}
							accent='green'
						>
							<RecordKvRow label='SKU' value={product.sku} mono copy />
							<RecordKvRow
								label='Crop Applicable'
								value={product.cropApplicable}
							/>
							<RecordKvRow
								label='Status'
								value={
									<RecordStatusPill
										label={STATUS_LABEL[product.status]}
										variant={STATUS_VARIANT[product.status]}
									/>
								}
								isLast
							/>
						</RecordSectionCard>

						<RecordSectionCard
							title='Audit Details'
							icon={Clock}
							accent='slate'
						>
							<RecordKvRow label='Created By' value={product.createdBy} />
							<RecordKvRow label='Created Date' value={product.createdDate} />
							<RecordKvRow label='Updated By' value={product.updatedBy} />
							<RecordKvRow
								label='Updated Date'
								value={product.updatedDate}
								isLast
							/>
						</RecordSectionCard>
					</div>
				);

			case "media":
				return (
					<RecordSectionCard
						title='Media & Assets'
						icon={FileText}
						accent='purple'
					>
						<MediaSection product={product} />
					</RecordSectionCard>
				);

			default:
				return null;
		}
	};

	return (
		<RecordDetailPage
			listHref='/masters/products'
			listLabel='Products'
			recordName={product.productName}
			recordCode={product.productId}
			statusLabel={STATUS_LABEL[product.status]}
			statusVariant={STATUS_VARIANT[product.status]}
			metaItems={[
				{ label: product.category || "No category", icon: Tag },
				{ label: product.sku || "No SKU", icon: Package },
			]}
			kpis={kpis}
			tabs={tabs}
			activeTab={activeTab}
			onTabChange={setActiveTab}
			active={product.status === "active"}
			onActiveChange={
				(product.status as string) !== "draft"
					? (on) => updateStatus(on ? "active" : "inactive")
					: undefined
			}
			toggleDisabled={(product.status as string) === "draft"}
			onEdit={() => router.push(`/masters/products/${product.id}/edit`)}
			sidebar={{
				quickActions: [
					{
						label: "Edit Product",
						icon: Pencil,
						onClick: () => router.push(`/masters/products/${product.id}/edit`),
						variant: "primary",
					},
				],
				summary: [
					{
						label: "Category",
						value: product.category || "—",
						highlight: true,
					},
					{ label: "SKU", value: product.sku || "—" },
					{ label: "MRP", value: formatMoney(product.mrp) },
					{ label: "GST Rate", value: product.gstRate || "—" },
					{ label: "Created", value: product.createdDate },
					{ label: "Updated", value: product.updatedDate },
				],
			}}
		>
			{renderTabContent()}
		</RecordDetailPage>
	);
}
