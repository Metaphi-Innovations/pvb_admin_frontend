"use client";

import React, { useEffect, useState } from "react";
import { Tag, Check } from "lucide-react";
import { cn } from "@/lib/utils";
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
	formatSchemeOfferLabel,
	formatSchemeRupee,
} from "@/app/(app)/masters/scheme/product-discount-scheme";

export type ProductSchemeOfferDialogMode = "apply" | "no-scheme";

interface ProductSchemeOfferDialogProps {
	open: boolean;
	mode: ProductSchemeOfferDialogMode;
	offers: EligibleProductDiscountSchemeOffer[];
	selectedOffer: EligibleProductDiscountSchemeOffer | null;
	customerType?: string;
	stateName?: string;
	onSelectOffer: (offer: EligibleProductDiscountSchemeOffer) => void;
	onClose: () => void;
	onApply?: () => void;
}

function formatValidity(startDate?: string, endDate?: string): string {
	if (startDate && endDate) return `${startDate} to ${endDate}`;
	if (startDate) return `From ${startDate}`;
	if (endDate) return `Until ${endDate}`;
	return "—";
}

export default function ProductSchemeOfferDialog({
	open,
	mode,
	offers,
	selectedOffer,
	customerType,
	stateName,
	onSelectOffer,
	onClose,
	onApply,
}: ProductSchemeOfferDialogProps) {
	const [activeOffer, setActiveOffer] = useState<EligibleProductDiscountSchemeOffer | null>(
		selectedOffer,
	);

	useEffect(() => {
		if (open) setActiveOffer(selectedOffer);
	}, [open, selectedOffer]);

	const isApply = mode === "apply" && offers.length > 0 && activeOffer;

	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className='max-w-md gap-0 p-0 overflow-hidden'>
				{isApply && activeOffer ? (
					<>
						<div className='px-5 pt-5 pb-4 border-b border-border bg-gradient-to-br from-brand-50/80 to-white'>
							<DialogHeader className='space-y-2 text-left'>
								<div className='inline-flex items-center gap-1.5 w-fit rounded-full border border-dashed border-brand-400 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700'>
									<Tag className='w-3.5 h-3.5' />
									Product Discount Scheme
								</div>
								<DialogTitle className='text-base font-semibold text-foreground'>
									{activeOffer.schemeName}
								</DialogTitle>
								<DialogDescription className='text-xs font-mono text-brand-700'>
									{activeOffer.schemeCode}
								</DialogDescription>
							</DialogHeader>
						</div>

						{offers.length > 1 && (
							<div className='px-5 py-3 border-b border-border bg-muted/10 space-y-1.5 max-h-36 overflow-y-auto'>
								<p className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
									Select Scheme ({offers.length})
								</p>
								{offers.map((offer) => {
									const selected = offer.schemeCode === activeOffer.schemeCode;
									return (
										<button
											key={offer.schemeCode}
											type='button'
											onClick={() => {
												setActiveOffer(offer);
												onSelectOffer(offer);
											}}
											className={cn(
												"w-full flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
												selected
													? "border-brand-400 bg-brand-50"
													: "border-border hover:bg-muted/30",
											)}
										>
											<div className='min-w-0'>
												<p className='text-[11px] font-mono font-semibold text-brand-700 truncate'>
													{formatSchemeOfferLabel(offer)}
												</p>
												<p className='text-[10px] text-muted-foreground truncate'>
													{offer.schemeName}
												</p>
											</div>
											<div className='text-right shrink-0'>
												<p className='text-[10px] font-medium tabular-nums'>
													{formatSchemeRupee(offer.finalSchemePrice)}
												</p>
												{selected && (
													<Check className='w-3.5 h-3.5 text-brand-600 ml-auto mt-0.5' />
												)}
											</div>
										</button>
									);
								})}
							</div>
						)}

						<div className='px-5 py-4 space-y-2.5'>
							<SchemeDetailRow label='Scheme Code' value={activeOffer.schemeCode} />
							<SchemeDetailRow label='Scheme Name' value={activeOffer.schemeName} />
							<SchemeDetailRow label='Product' value={activeOffer.productName} />
							<SchemeDetailRow
								label='Customer Type'
								value={customerType ?? activeOffer.customerType}
							/>
							<SchemeDetailRow
								label='State'
								value={stateName ?? activeOffer.stateName}
							/>
							<SchemeDetailRow
								label='Dealer Price'
								value={formatSchemeRupee(activeOffer.dealerPrice)}
								amount
							/>
							<SchemeDetailRow label='Discount Type' value={activeOffer.discountType} />
							<SchemeDetailRow
								label='Discount Value'
								value={formatSchemeDiscountValue(
									activeOffer.discountType,
									activeOffer.discountValue,
								)}
							/>
							<SchemeDetailRow
								label='Discount Amount'
								value={formatSchemeRupee(activeOffer.discountAmount)}
								amount
							/>
							<SchemeDetailRow
								label='Final Rate'
								value={formatSchemeRupee(activeOffer.finalSchemePrice)}
								amount
								highlight
							/>
							<SchemeDetailRow
								label='Validity'
								value={formatValidity(activeOffer.startDate, activeOffer.endDate)}
							/>
						</div>

						<DialogFooter className='px-5 py-3 border-t border-border bg-muted/20 sm:justify-end gap-2'>
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='h-8 text-xs'
								onClick={onClose}
							>
								Close
							</Button>
							<Button
								type='button'
								size='sm'
								className='h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white'
								onClick={() => {
									onApply?.();
									onClose();
								}}
							>
								Apply Scheme
							</Button>
						</DialogFooter>
					</>
				) : (
					<>
						<div className='px-5 pt-5 pb-4'>
							<DialogHeader className='space-y-2 text-left'>
								<DialogTitle className='text-base font-semibold text-foreground'>
									No Scheme Available
								</DialogTitle>
								<DialogDescription className='text-sm text-muted-foreground leading-relaxed'>
									No eligible product discount scheme found for this product,
									customer type, state and order date.
								</DialogDescription>
							</DialogHeader>
						</div>
						<DialogFooter className='px-5 py-3 border-t border-border bg-muted/20'>
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='h-8 text-xs'
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
		<div className='flex items-center justify-between gap-3 text-xs'>
			<span className='text-muted-foreground shrink-0'>{label}</span>
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
