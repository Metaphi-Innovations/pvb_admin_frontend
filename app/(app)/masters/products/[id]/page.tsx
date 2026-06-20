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
	Download,
	Eye,
	ExternalLink,
	FileText,
	IndianRupee,
	Package,
	Pencil,
	Tag,
} from "lucide-react";
import {
	getImagePreviewUrl,
	getProductImages,
	getProductUrls,
	loadProducts,
	saveProducts,
	type Product,
	type ProductImage,
	type ProductStatus,
} from "../product-data";
import { formatIndianRupeeDisplay } from "@/lib/currency/indian-rupee";
import { getStandardPricing } from "@/lib/pricing/resolve-pricing";
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
	const [previewImage, setPreviewImage] = useState<ProductImage | null>(null);
	const images = getProductImages(product);
	const urls = getProductUrls(product);

	const openExternal = (url: string) => {
		window.open(url, "_blank", "noopener,noreferrer");
	};

	const downloadImage = (image: ProductImage) => {
		const url = getImagePreviewUrl(image);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = image.name;
		anchor.target = "_blank";
		anchor.rel = "noopener noreferrer";
		document.body.appendChild(anchor);
		anchor.click();
		document.body.removeChild(anchor);
	};

	return (
		<div className='space-y-4'>
			<div className='space-y-2'>
				<p className='text-xs font-semibold text-foreground'>Product Images</p>
				{images.length === 0 ? (
					<p className='text-xs text-muted-foreground py-3 text-center border border-dashed border-border/60 rounded-lg'>
						No product images uploaded
					</p>
				) : (
					<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5'>
						{images.map((image) => {
							const preview = getImagePreviewUrl(image);
							return (
								<div
									key={image.id}
									className='flex flex-col overflow-hidden border rounded-lg border-border/60 bg-white'
								>
									<button
										type='button'
										className='relative h-[88px] w-full bg-muted/20'
										onClick={() => setPreviewImage(image)}
										title='Click to preview'
									>
										<img src={preview} alt={image.name} className='object-cover w-full h-full' />
									</button>
									<div className='px-2 py-1.5 space-y-1 border-t border-border/40'>
										<p className='text-[10px] font-medium truncate'>{image.name}</p>
										<p className='text-[9px] text-muted-foreground'>{image.size || "—"}</p>
										<div className='flex items-center gap-1'>
											<Button
												type='button'
												variant='outline'
												size='sm'
												className='h-6 flex-1 px-1 text-[9px] gap-1'
												onClick={() => setPreviewImage(image)}
											>
												<Eye className='w-3 h-3 shrink-0' />
												Preview
											</Button>
											<Button
												type='button'
												variant='outline'
												size='sm'
												className='h-6 w-7 px-0'
												onClick={() => downloadImage(image)}
												title='Download'
											>
												<Download className='w-3 h-3' />
											</Button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			<div className='pt-2 space-y-2 border-t border-border/40'>
				<p className='text-xs font-semibold text-foreground'>Document URLs</p>
				{urls.length === 0 ? (
					<p className='text-xs text-muted-foreground py-3 text-center border border-dashed border-border/60 rounded-lg'>
						No document URLs added
					</p>
				) : (
					<div className='overflow-hidden border rounded-lg border-border/60'>
						<table className='w-full text-xs'>
							<thead>
								<tr className='border-b bg-muted/30 border-border/50'>
									<th className='w-12 px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground'>Sr No</th>
									<th className='px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground'>URL</th>
									<th className='w-24 px-2 py-1.5 text-center text-[10px] font-semibold text-muted-foreground'>Open Link</th>
								</tr>
							</thead>
							<tbody>
								{urls.map((item, index) => (
									<tr key={item.id} className='border-b border-border/40 last:border-0'>
										<td className='px-2 py-2 text-muted-foreground tabular-nums'>{index + 1}</td>
										<td className='px-2 py-2 truncate max-w-md' title={item.url}>{item.url}</td>
										<td className='px-2 py-2 text-center'>
											<Button
												type='button'
												variant='ghost'
												size='icon'
												className='w-7 h-7 text-brand-600'
												onClick={() => openExternal(item.url)}
											>
												<ExternalLink className='w-3.5 h-3.5' />
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<Dialog
				open={!!previewImage}
				onOpenChange={(open) => {
					if (!open) setPreviewImage(null);
				}}
			>
				<DialogContent className='z-[500] max-w-3xl p-4 bg-white border border-border rounded-xl shadow-lg'>
					<DialogHeader className='pb-2 border-b border-border/50'>
						<DialogTitle className='text-sm font-semibold truncate'>
							{previewImage?.name ?? "Image preview"}
						</DialogTitle>
					</DialogHeader>
					<div className='flex items-center justify-center min-h-[200px] py-4 bg-muted/5 rounded-lg'>
						{previewImage && getImagePreviewUrl(previewImage) ? (
							<img
								src={getImagePreviewUrl(previewImage)}
								alt={previewImage.name}
								className='max-h-[70vh] max-w-full object-contain'
							/>
						) : (
							<p className='text-sm text-muted-foreground'>Preview unavailable</p>
						)}
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

	const mediaCount = useMemo(() => {
		if (!product) return 0;
		return getProductImages(product).length + getProductUrls(product).length;
	}, [product]);

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
		{ value: "media", label: "Media & Documents", count: mediaCount || undefined },
	];

	const standardPricing = getStandardPricing(product.id);

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
			value: standardPricing
				? formatIndianRupeeDisplay(standardPricing.mrp)
				: "—",
			label: "MRP (Pricing Master)",
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
								label='Product Name'
								value={product.productName}
								highlight
							/>
							<RecordKvRow
								label='Scientific Name'
								value={product.scientificName}
							/>
							<RecordKvRow label='Category' value={product.category} />
							<RecordKvRow label='Segment' value={product.segment} />
							<RecordKvRow
								label='Form'
								value={product.form ?? product.formulation}
							/>
							<RecordKvRow label='CFU' value={product.cfu} />
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
							title='Accounting Mapping'
							icon={FileText}
							accent='green'
						>
							<RecordKvRow label='HSN Code' value={product.hsnCode} mono copy />
							<RecordKvRow label='GST Rate' value={product.gstRate || "—"} />
							<RecordKvRow
								label='Inventory Account'
								value={product.inventoryAccount ?? "Inventory / Stock in Hand"}
							/>
							<RecordKvRow
								label='Sales Account'
								value={product.salesAccount ?? "Sales"}
							/>
							<RecordKvRow
								label='Purchase Account'
								value={product.purchaseAccount ?? "Purchases"}
							/>
							<RecordKvRow
								label='COGS Account'
								value={product.cogsAccount ?? "Cost of Goods Sold"}
								isLast
							/>
						</RecordSectionCard>

						<RecordSectionCard
							title='Tax & Compliance'
							icon={IndianRupee}
							accent='orange'
						>
							<RecordKvRow label='HSN Code' value={product.hsnCode} mono copy />
							<RecordKvRow
								label='GST Rate'
								value={
									<div className='text-right'>
										<span>{product.gstRate || "—"}</span>
										<p className='text-[10px] font-normal text-muted-foreground mt-0.5'>
											Auto-filled from HSN code
										</p>
									</div>
								}
								isLast={!standardPricing}
							/>
							{standardPricing && (
								<>
									<RecordKvRow
										label='Cost Price (CP)'
										value={formatIndianRupeeDisplay(standardPricing.costPrice)}
										amount
									/>
									<RecordKvRow
										label='Distributor Price (DP)'
										value={formatIndianRupeeDisplay(standardPricing.distributorPrice)}
										amount
									/>
									<RecordKvRow
										label='Retail Price (RP)'
										value={formatIndianRupeeDisplay(standardPricing.retailPrice)}
										amount
									/>
									<RecordKvRow
										label='MRP'
										value={formatIndianRupeeDisplay(standardPricing.mrp)}
										amount
										highlight
										isLast
									/>
									<p className='text-[10px] text-muted-foreground px-1 pt-1'>
										Pricing from{" "}
										<Link
											href='/masters/pricing'
											className='text-brand-600 hover:underline'
										>
											Pricing Master
										</Link>
										. Vendor and customer overrides apply at transaction level.
									</p>
								</>
							)}
							{!standardPricing && (
								<p className='text-[10px] text-muted-foreground px-1 pt-1'>
									No active pricing record. Add pricing in{" "}
									<Link
										href='/masters/pricing'
										className='text-brand-600 hover:underline'
									>
										Pricing Master
									</Link>
									.
								</p>
							)}
						</RecordSectionCard>

						<RecordSectionCard
							title='Commercial & Stock'
							icon={Tag}
							accent='green'
						>
							<RecordKvRow label='SKU' value={product.sku} mono copy />
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
						title='Media & Documents'
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
			recordCode={product.sku}
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
					{
						label: "MRP",
						value: standardPricing
							? formatIndianRupeeDisplay(standardPricing.mrp)
							: "—",
					},
					{ label: "GST Rate", value: product.gstRate ? `${product.gstRate} (from HSN)` : "—" },
					{ label: "Created", value: product.createdDate },
					{ label: "Updated", value: product.updatedDate },
				],
			}}
		>
			{renderTabContent()}
		</RecordDetailPage>
	);
}
