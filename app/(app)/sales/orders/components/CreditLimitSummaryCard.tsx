"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, CreditCard } from "lucide-react";
import {
	type CustomerCreditSummary,
	type CreditLimitIndicator,
	formatCreditRupee,
} from "@/lib/sales/customer-credit-limit";

const INDICATOR_CFG: Record<
	CreditLimitIndicator,
	{ label: string; dot: string; text: string; bg: string; border: string; icon: typeof CheckCircle2 }
> = {
	healthy: {
		label: "Healthy Credit",
		dot: "bg-emerald-500",
		text: "text-emerald-700",
		bg: "bg-emerald-50",
		border: "border-emerald-200",
		icon: CheckCircle2,
	},
	warning: {
		label: "Near Credit Limit",
		dot: "bg-amber-400",
		text: "text-amber-700",
		bg: "bg-amber-50",
		border: "border-amber-200",
		icon: AlertTriangle,
	},
	exceeded: {
		label: "Credit limit exceeded",
		dot: "bg-red-400",
		text: "text-red-700",
		bg: "bg-red-50",
		border: "border-red-200",
		icon: AlertTriangle,
	},
};

function SummaryCell({
	label,
	value,
	valueClassName,
}: {
	label: string;
	value: string;
	valueClassName?: string;
}) {
	return (
		<div className='min-w-0'>
			<p className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate'>
				{label}
			</p>
			<p
				className={cn(
					"text-xs font-semibold tabular-nums text-foreground mt-0.5 truncate",
					valueClassName,
				)}
			>
				{value}
			</p>
		</div>
	);
}

export default function CreditLimitSummaryCard({
	summary,
}: {
	summary: CustomerCreditSummary;
}) {
	const cfg = INDICATOR_CFG[summary.indicator];
	const Icon = cfg.icon;

	return (
		<div className={cn("rounded-xl border p-3 space-y-2.5", cfg.bg, cfg.border)}>
			<div className='flex items-center justify-between gap-2'>
				<div className='flex items-center gap-2 min-w-0'>
					<div className='w-7 h-7 rounded-lg bg-white/80 border border-border/60 flex items-center justify-center flex-shrink-0'>
						<CreditCard className='w-3.5 h-3.5 text-brand-600' />
					</div>
					<p className='text-xs font-semibold text-foreground'>Credit Summary</p>
				</div>
				<span
					className={cn(
						"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0",
						cfg.bg,
						cfg.text,
					)}
				>
					<span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
					<Icon className='w-3 h-3 flex-shrink-0' />
					{cfg.label}
				</span>
			</div>

			<div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
				<SummaryCell
					label='Total Credit Limit'
					value={formatCreditRupee(summary.totalCreditLimit)}
				/>
				<SummaryCell
					label='Utilized Credit'
					value={formatCreditRupee(summary.alreadyUtilizedCredit)}
				/>
				<SummaryCell
					label='Available Credit'
					value={formatCreditRupee(summary.availableCreditLimit)}
					valueClassName={
						summary.indicator === "healthy"
							? "text-emerald-700"
							: summary.indicator === "warning"
								? "text-amber-700"
								: "text-red-700"
					}
				/>
				<SummaryCell
					label='Current Order Value'
					value={formatCreditRupee(summary.currentOrderValue)}
					valueClassName={
						summary.indicator === "exceeded" ? "text-red-700" : undefined
					}
				/>
			</div>
		</div>
	);
}
