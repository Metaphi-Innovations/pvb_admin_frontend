"use client";

import { AlertTriangle } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
	type CustomerCreditSummary,
	formatCreditRupee,
} from "@/lib/sales/customer-credit-limit";

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className='flex items-center justify-between gap-4 text-xs'>
			<span className='text-muted-foreground'>{label}</span>
			<span className='font-semibold tabular-nums text-foreground'>{value}</span>
		</div>
	);
}

export default function CreditLimitExceededDialog({
	open,
	onClose,
	summary,
}: {
	open: boolean;
	onClose: () => void;
	summary: CustomerCreditSummary;
}) {
	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className='max-w-sm'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2 text-base'>
						<div className='w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-50 border border-red-200'>
							<AlertTriangle className='w-4 h-4 text-red-500' />
						</div>
						Credit Limit Exceeded
					</DialogTitle>
					<DialogDescription className='pt-1'>
						This order exceeds the customer&apos;s available credit limit.
					</DialogDescription>
				</DialogHeader>

				<div className='rounded-lg border border-border bg-muted/20 px-3 py-2.5 space-y-2'>
					<DetailRow
						label='Total Credit Limit'
						value={formatCreditRupee(summary.totalCreditLimit)}
					/>
					<DetailRow
						label='Utilized Credit'
						value={formatCreditRupee(summary.alreadyUtilizedCredit)}
					/>
					<DetailRow
						label='Available Credit'
						value={formatCreditRupee(summary.availableCreditLimit)}
					/>
					<DetailRow
						label='Order Value'
						value={formatCreditRupee(summary.currentOrderValue)}
					/>
					<div className='border-t border-border/60 pt-2'>
						<DetailRow
							label='Excess Amount'
							value={formatCreditRupee(summary.excessAmount)}
						/>
					</div>
				</div>

				<div className='flex items-center justify-end pt-1'>
					<Button
						variant='outline'
						size='sm'
						className='h-8 text-xs'
						onClick={onClose}
					>
						Close
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
