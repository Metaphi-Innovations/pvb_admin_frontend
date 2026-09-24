"use client";

import React from "react";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	type EligibleProductDiscountSchemeOffer,
	formatSchemeDiscountValue,
	formatSchemeRupee,
} from "@/app/(app)/masters/scheme/product-discount-scheme";

export type ProductSchemeOfferDialogMode = "view" | "no-scheme";

interface ProductSchemeOfferDialogProps {
	open: boolean;
	mode: ProductSchemeOfferDialogMode;
	/** Auto-selected highest discount (or currently applied) offer — view only. */
	offer: EligibleProductDiscountSchemeOffer | null;
	customerType?: string;
	stateName?: string;
	onClose: () => void;
}

function formatValidity(startDate?: string, endDate?: string): string {
	if (startDate && endDate) return `${startDate} to ${endDate}`;
	if (startDate) return `From ${startDate}`;
	if (endDate) return `Until ${endDate}`;
	return "—";
}

/**
 * View-only scheme details. Product Discount on Sales Order always auto-applies
 * the highest eligible discount — no manual scheme picker.
 */
export default function ProductSchemeOfferDialog({
	open,
	mode,
	offer,
	customerType,
	stateName,
	onClose,
}: ProductSchemeOfferDialogProps) {
	const showOffer = mode === "view" && offer;

	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="max-w-md gap-0 p-0 overflow-hidden">
				{showOffer ? (
					<>
						<div className="px-5 pt-5 pb-4 border-b border-border bg-gradient-to-br from-brand-50/80 to-white">
							<DialogHeader className="space-y-2 text-left">
								<div className="inline-flex items-center gap-1.5 w-fit rounded-full border border-dashed border-brand-400 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700">
									<Tag className="w-3.5 h-3.5" />
									Auto-applied (highest discount)
								</div>
								<DialogTitle className="text-base font-semibold text-foreground">
									{offer.schemeName}
								</DialogTitle>
								<DialogDescription className="text-xs font-mono text-brand-700">
									{offer.schemeCode}
								</DialogDescription>
							</DialogHeader>
						</div>

						<div className="px-5 py-4 space-y-2.5">
							<p className="text-[10px] leading-snug text-muted-foreground">
								When multiple schemes qualify, the highest per-unit discount is
								applied automatically. Manual selection is not available.
							</p>
							<SchemeDetailRow label="Scheme Code" value={offer.schemeCode} />
							<SchemeDetailRow label="Scheme Name" value={offer.schemeName} />
							<SchemeDetailRow label="Product" value={offer.productName} />
							<SchemeDetailRow
								label="Customer Type"
								value={customerType ?? offer.customerType}
							/>
							<SchemeDetailRow
								label="State"
								value={stateName ?? offer.stateName}
							/>
							<SchemeDetailRow
								label="Dealer Price"
								value={formatSchemeRupee(offer.dealerPrice)}
								amount
							/>
							<SchemeDetailRow label="Discount Type" value={offer.discountType} />
							<SchemeDetailRow
								label="Discount Value"
								value={formatSchemeDiscountValue(
									offer.discountType,
									offer.discountValue,
								)}
							/>
							<SchemeDetailRow
								label="Discount Amount"
								value={formatSchemeRupee(offer.discountAmount)}
								amount
							/>
							<SchemeDetailRow
								label="Final Rate"
								value={formatSchemeRupee(offer.finalSchemePrice)}
								amount
								highlight
							/>
							<SchemeDetailRow
								label="Validity"
								value={formatValidity(offer.startDate, offer.endDate)}
							/>
						</div>

						<DialogFooter className="px-5 py-3 border-t border-border bg-muted/20 sm:justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8 text-xs"
								onClick={onClose}
							>
								Close
							</Button>
						</DialogFooter>
					</>
				) : (
					<>
						<div className="px-5 pt-5 pb-4">
							<DialogHeader className="space-y-2 text-left">
								<DialogTitle className="text-base font-semibold text-foreground">
									No Scheme Available
								</DialogTitle>
								<DialogDescription className="text-sm text-muted-foreground leading-relaxed">
									No eligible product discount scheme found for this product,
									customer type, state and order date.
								</DialogDescription>
							</DialogHeader>
						</div>
						<DialogFooter className="px-5 py-3 border-t border-border bg-muted/20">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8 text-xs"
								onClick={onClose}
							>
								Close
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}

function SchemeDetailRow({
	label,
	value,
	amount,
	highlight,
}: {
	label: string;
	value: string;
	amount?: boolean;
	highlight?: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-3 text-xs">
			<span className="text-muted-foreground shrink-0">{label}</span>
			<span
				className={
					highlight
						? "font-semibold text-emerald-700 tabular-nums"
						: amount
							? "font-medium tabular-nums text-foreground"
							: "text-foreground text-right"
				}
			>
				{value}
			</span>
		</div>
	);
}
