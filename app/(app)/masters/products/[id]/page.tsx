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
import {
	Clock,
	Eye,
	ExternalLink,
	FileText,
	IndianRupee,
	Package,
	Truck,
} from "lucide-react";
import {
	formatPackSize,
	formatGrossWeight,
	formatNetWeight,
	getImagePreviewUrl,
	getProductCode,
	getProductImages,
	getProductUrls,
	mapApiMediaAssetToProductImage,
	type Product,
	type ProductImage,
	type ProductStatus,
	type ProductUrl,
} from "../product-data";
import { formatIndianRupeeDisplay } from "@/lib/currency/indian-rupee";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useProduct, useToggleProductStatus } from "@/hooks/masters";

const STATUS_LABEL: Record<ProductStatus | "draft", string> = {
	active: "Active",
	inactive: "Inactive",
	draft: "Draft",
	archived: "Archived",
};

const STATUS_VARIANT: Record<ProductStatus | "draft", "active" | "inactive" | "draft"> = {
	active: "active",
	inactive: "inactive",
	draft: "draft",
	archived: "inactive",
};

function MediaSection({ product }: { product: Product }) {
	const [previewImage, setPreviewImage] = useState<ProductImage | null>(null);
	const images = getProductImages(product);
	const urls = getProductUrls(product);

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
						{images.map((image) => (
							<div
								key={image.id}
								className='flex flex-col overflow-hidden border rounded-lg border-border/60 bg-white'
							>
								<button
									type='button'
									className='relative h-[88px] w-full bg-muted/20'
									onClick={() => setPreviewImage(image)}
								>
									<img
										src={getImagePreviewUrl(image)}
										alt={image.name}
										className='object-cover w-full h-full'
										crossOrigin='anonymous'
									/>
								</button>
								<div className='px-2 py-1.5 border-t border-border/40'>
									<Button
										type='button'
										variant='outline'
										size='sm'
										className='h-6 w-full text-[9px]'
										onClick={() => setPreviewImage(image)}
									>
										<Eye className='w-3 h-3 mr-1' /> View
									</Button>
								</div>
							</div>
						))}
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
								<tr className='border-b bg-muted/30'>
									<th className='px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground'>
										URL
									</th>
									<th className='w-16 px-2 py-1.5 text-center text-[10px] font-semibold text-muted-foreground'>
										Open
									</th>
								</tr>
							</thead>
							<tbody>
								{urls.map((item: ProductUrl) => (
									<tr key={item.id} className='border-b border-border/40 last:border-0'>
										<td className='px-2 py-2 truncate max-w-md' title={item.url}>
											{item.url}
										</td>
										<td className='px-2 py-2 text-center'>
											<Button
												type='button'
												variant='ghost'
												size='icon'
												className='w-7 h-7'
												onClick={() =>
													window.open(item.url, "_blank", "noopener,noreferrer")
												}
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
				onOpenChange={(o) => !o && setPreviewImage(null)}
			>
				<DialogContent className='max-w-3xl p-4'>
					<DialogHeader>
						<DialogTitle className='text-sm truncate'>
							{previewImage?.name}
						</DialogTitle>
					</DialogHeader>
					{previewImage && (
						<img
							src={getImagePreviewUrl(previewImage)}
							alt={previewImage.name}
							className='max-h-[70vh] w-full object-contain'
							crossOrigin='anonymous'
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}

export default function ProductDetailPage() {
	const router = useRouter();
	const { id } = useParams<{ id: string }>();
	const [activeTab, setActiveTab] = useState("overview");

	const { data: apiProduct, isLoading, isError } = useProduct(id);
	const toggleStatusMutation = useToggleProductStatus();

	const product = useMemo<Product | null>(() => {
		if (!apiProduct) return null;
		return {
			id: apiProduct.id,
			productId: apiProduct.productUuid,
			productCode: apiProduct.productCode,
			productName: apiProduct.productName,
			sku: apiProduct.sku,
			supplier: apiProduct.supplier || undefined,
			supplierCode: apiProduct.supplierCode || undefined,
			category: apiProduct.category,
			subCategory: apiProduct.subCategory,
			segment: apiProduct.segment,
			form: apiProduct.form || "",
			cfu: apiProduct.cfu || undefined,
			authority: apiProduct.authority || undefined,
			hsnCode: apiProduct.hsnCode,
			hsnId: apiProduct.hsnId || undefined,
			gstRate: apiProduct.gstRate || "",
			gstId: apiProduct.gstId || undefined,
			packSize: apiProduct.packSize ?? undefined,
			baseUnit: apiProduct.baseUnit,
			mou: apiProduct.mou || undefined,
			unitPerCase: apiProduct.unitPerCase ?? undefined,
			packagingUnit: apiProduct.packagingUnit || "",
			netWeightPerPackagingUnit: apiProduct.netWeight ?? undefined,
			grossWeight: apiProduct.grossWeight ?? undefined,
			mrp: apiProduct.mrp ?? undefined,
			status: apiProduct.status,
			createdBy: apiProduct.createdBy || "Admin",
			createdDate: apiProduct.createdAt || "",
			updatedBy: apiProduct.updatedBy || "Admin",
			updatedDate: apiProduct.updatedAt || "",
			productImages: (apiProduct.assets ?? [])
				.filter((a) => a.asset_type === "MEDIA")
				.map(mapApiMediaAssetToProductImage),
			productUrls: (apiProduct.assets ?? [])
				.filter((a) => a.asset_type === "LINK")
				.map((a) => ({
					id: a.product_asset_id ?? crypto.randomUUID(),
					url: a.link_url ?? "",
				})),
		};
	}, [apiProduct]);

	const mediaCount = useMemo(() => {
		if (!product) return 0;
		return getProductImages(product).length + getProductUrls(product).length;
	}, [product]);

	const updateStatus = (status: ProductStatus) => {
		if (!id) return;
		toggleStatusMutation.mutate({ id, isActive: status === "active" });
	};

	if (isLoading) {
		return (
			<AppLayout>
				<div className='py-16 text-center'>
					<p className='text-sm text-muted-foreground'>Loading product details...</p>
				</div>
			</AppLayout>
		);
	}

	if (isError || !product) {
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

	const productCode = getProductCode(product);
	const tabs = [
		{ value: "overview", label: "Overview" },
		{ value: "media", label: "Media & Documents", count: mediaCount || undefined },
	];

	const renderTabContent = () => {
		switch (activeTab) {
			case "overview":
				return (
					<div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
						<RecordSectionCard title='Product Information' icon={Package} accent='blue'>
							<RecordKvRow label='Product Code' value={productCode} mono copy />
							<RecordKvRow label='Supplier' value={product.supplier} />
							<RecordKvRow label='Supplier Code' value={product.supplierCode} mono />
							<RecordKvRow label='Product Name' value={product.productName} highlight />
							<RecordKvRow label='Scientific Name' value={product.scientificName} />
							<RecordKvRow label='Segment' value={product.segment} />
							<RecordKvRow label='Category' value={product.category} />
							<RecordKvRow label='Form' value={product.form} />
							<RecordKvRow label='CFU' value={product.cfu} />
							<RecordKvRow label='Authority' value={product.authority} />
							<RecordKvRow label='SKU' value={product.sku} mono copy isLast />
						</RecordSectionCard>

						<RecordSectionCard title='Tax & Compliance' icon={IndianRupee} accent='orange'>
							<RecordKvRow label='HSN Code' value={product.hsnCode} mono copy />
							<RecordKvRow
								label='GST %'
								value={
									<div className='text-right'>
										<span>{product.gstRate || "—"}</span>
										<p className='text-[10px] font-normal text-muted-foreground mt-0.5'>
											Auto-filled from HSN code
										</p>
									</div>
								}
								isLast
							/>
						</RecordSectionCard>

						<RecordSectionCard title='Packaging & Weight' icon={Package} accent='green'>
							<RecordKvRow label='Pack Size' value={formatPackSize(product)} />
							<RecordKvRow label='Unit' value={product.baseUnit} />
							<RecordKvRow label='Packaging Unit' value={product.packagingUnit} />
							<RecordKvRow
								label='Unit per Case'
								value={
									product.unitPerCase !== undefined
										? String(product.unitPerCase)
										: undefined
								}
							/>
							<RecordKvRow
								label='Net Weight'
								value={formatNetWeight(product)}
							/>
							<RecordKvRow label='MoU' value={product.mou} />
							<RecordKvRow
								label='Gross Weight'
								value={formatGrossWeight(product)}
							/>
							<RecordKvRow
								label='MRP'
								value={
									product.mrp !== undefined && product.mrp > 0
										? formatIndianRupeeDisplay(product.mrp)
										: undefined
								}
								amount
								highlight
								isLast
							/>
						</RecordSectionCard>

						<RecordSectionCard title='Status & Audit' icon={Clock} accent='slate'>
							<RecordKvRow
								label='Status'
								value={
									<RecordStatusPill
										label={STATUS_LABEL[product.status]}
										variant={STATUS_VARIANT[product.status]}
									/>
								}
							/>
							<RecordKvRow label='Created By' value={product.createdBy} />
							<RecordKvRow label='Created Date' value={product.createdDate} />
							<RecordKvRow label='Updated By' value={product.updatedBy} />
							<RecordKvRow label='Updated Date' value={product.updatedDate} isLast />
						</RecordSectionCard>
					</div>
				);

			case "media":
				return (
					<RecordSectionCard title='Media & Documents' icon={FileText} accent='purple'>
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
			recordCode={productCode}
			statusLabel={STATUS_LABEL[product.status]}
			statusVariant={STATUS_VARIANT[product.status]}
			metaItems={[
				{ label: product.supplier || "No supplier", icon: Truck },
				{ label: productCode || "No code", icon: Package },
			]}
			tabs={tabs}
			activeTab={activeTab}
			onTabChange={setActiveTab}
			active={product.status === "active"}
			onActiveChange={
				(product.status as string) !== "draft"
					? (on) => updateStatus(on ? "active" : "inactive")
					: undefined
			}
			toggleDisabled={(product.status as string) === "draft" || toggleStatusMutation.isPending}
			onEdit={() => router.push(`/masters/products/${id}/edit`)}
			sidebar={{
				summary: [
					{ label: "Product Code", value: productCode || "—", highlight: true },
					{ label: "Supplier", value: product.supplier || "—" },
					{ label: "SKU", value: product.sku || "—" },
					{
						label: "MRP",
						value:
							product.mrp !== undefined && product.mrp > 0
								? formatIndianRupeeDisplay(product.mrp)
								: "—",
					},
					{ label: "GST %", value: product.gstRate || "—" },
					{ label: "Created", value: product.createdDate },
					{ label: "Updated", value: product.updatedDate },
				],
			}}
		>
			{renderTabContent()}
		</RecordDetailPage>
	);
}
