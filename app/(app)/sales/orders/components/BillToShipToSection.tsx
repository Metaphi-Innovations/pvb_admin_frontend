"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	AlertCircle,
	Building2,
	Check,
	ChevronsUpDown,
	Mail,
	Phone,
	Search,
} from "lucide-react";
import {
	type SalesOrderCustomerAddress,
	formatAddressDropdownLines,
} from "../sales-order-address-utils";

function AddressDetailBody({ address }: { address: SalesOrderCustomerAddress }) {
	const addressLine = [address.addressLine1, address.addressLine2]
		.filter(Boolean)
		.join(", ");
	const cityLine = [address.city, address.state, address.pincode]
		.filter(Boolean)
		.join(", ");
	const showPhone = address.phone && address.phone !== "—";
	const showEmail = address.email && address.email !== "—";

	return (
		<div className='rounded-lg border border-border/60 border-l-2 border-l-brand-600 bg-muted/20 px-2.5 py-2 space-y-1 min-w-0'>
			<div className='flex items-center gap-1.5 min-w-0'>
				<Building2 className='w-3 h-3 text-brand-600 flex-shrink-0' />
				<p className='text-xs font-semibold text-foreground leading-tight truncate'>
					{address.companyName}
				</p>
			</div>

			<p className='text-[11px] leading-snug'>
				<span className='font-medium text-foreground/70'>GSTIN:</span>{" "}
				<span className='font-medium text-foreground font-mono'>{address.gstin}</span>
			</p>

			{(addressLine || cityLine) && (
				<p className='text-[11px] text-muted-foreground leading-snug'>
					{[addressLine, cityLine].filter(Boolean).join(" · ")}
				</p>
			)}

			{(showPhone || showEmail) && (
				<div className='flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5'>
					{showPhone && (
						<span className='inline-flex items-center gap-1 min-w-0 text-[11px] leading-snug'>
							<Phone className='w-3 h-3 text-muted-foreground/70 flex-shrink-0' />
							<span className='text-foreground/80 truncate'>{address.phone}</span>
						</span>
					)}
					{showEmail && (
						<span className='inline-flex items-center gap-1 min-w-0 text-[11px] leading-snug'>
							<Mail className='w-3 h-3 text-muted-foreground/70 flex-shrink-0' />
							<span className='text-foreground/80 truncate'>{address.email}</span>
						</span>
					)}
				</div>
			)}
		</div>
	);
}

function AddressSelector({
	label,
	required,
	value,
	onChange,
	options,
	placeholder,
	error,
}: {
	label: string;
	required?: boolean;
	value: string;
	onChange: (id: string) => void;
	options: SalesOrderCustomerAddress[];
	placeholder: string;
	error?: string;
}) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const selected = options.find((o) => o.id === value);
	const filtered = options.filter((opt) => {
		const q = search.toLowerCase();
		if (!q) return true;
		return (
			opt.label.toLowerCase().includes(q) ||
			opt.companyName.toLowerCase().includes(q) ||
			opt.state.toLowerCase().includes(q) ||
			opt.gstin.toLowerCase().includes(q) ||
			opt.addressLine1.toLowerCase().includes(q)
		);
	});

	return (
		<div className='space-y-1 min-w-0'>
			<Label className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>
				{label} {required && <span className='text-red-500'>*</span>}
			</Label>

			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<button
						type='button'
						disabled={options.length === 0}
						className={cn(
							"w-full h-8 px-2.5 text-xs text-left border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30 transition-colors",
							error ? "border-red-400" : "border-border",
							options.length === 0 && "opacity-60 cursor-not-allowed",
						)}
					>
						<span
							className={
								selected
									? "text-foreground truncate"
									: "text-muted-foreground truncate"
							}
						>
							{selected ? selected.label : placeholder}
						</span>
						<ChevronsUpDown className='flex-shrink-0 w-3.5 h-3.5 text-muted-foreground' />
					</button>
				</PopoverTrigger>
				<PopoverContent className='w-[--radix-popover-trigger-width] p-0' align='start'>
					<div className='p-2 border-b border-border'>
						<div className='relative'>
							<Search className='w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none' />
							<Input
								placeholder='Search address…'
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className='h-8 pl-8 text-xs'
							/>
						</div>
					</div>
					<div className='max-h-[240px] overflow-y-auto'>
						{filtered.map((opt) => (
							<button
								key={opt.id}
								type='button'
								onClick={() => {
									onChange(opt.id);
									setOpen(false);
									setSearch("");
								}}
								className={cn(
									"w-full px-3 py-2 text-left transition-colors hover:bg-muted/60 border-b border-border/40 last:border-0",
									selected?.id === opt.id && "bg-brand-50",
								)}
							>
								<div className='flex items-start gap-2'>
									<div className='flex-1 min-w-0 space-y-0.5'>
										<p className='text-[10px] font-semibold text-brand-700 truncate'>
											{opt.label}
										</p>
										{formatAddressDropdownLines(opt).map((line, i) => (
											<p
												key={i}
												className='text-[10px] text-muted-foreground leading-snug truncate'
											>
												{line}
											</p>
										))}
									</div>
									{selected?.id === opt.id && (
										<Check className='w-3.5 h-3.5 text-brand-600 flex-shrink-0 mt-0.5' />
									)}
								</div>
							</button>
						))}
						{filtered.length === 0 && (
							<p className='px-3 py-3 text-xs text-center text-muted-foreground'>
								No addresses found
							</p>
						)}
					</div>
				</PopoverContent>
			</Popover>

			{selected && <AddressDetailBody address={selected} />}

			{error && (
				<p className='flex items-center gap-1 text-xs text-red-500'>
					<AlertCircle className='w-3.5 h-3.5 flex-shrink-0' /> {error}
				</p>
			)}
		</div>
	);
}

export default function BillToShipToSection({
	addresses,
	billOptions,
	shipOptions,
	billToAddressId,
	shipToAddressId,
	onBillToChange,
	onShipToChange,
	errors,
	emptyHint = "Select a customer to load Bill To / Ship To addresses.",
}: {
	addresses?: SalesOrderCustomerAddress[];
	billOptions?: SalesOrderCustomerAddress[];
	shipOptions?: SalesOrderCustomerAddress[];
	billToAddressId: string;
	shipToAddressId: string;
	onBillToChange: (id: string) => void;
	onShipToChange: (id: string) => void;
	errors?: { billToAddressId?: string; shipToAddressId?: string };
	emptyHint?: string;
}) {
	const billList = billOptions ?? addresses ?? [];
	const shipList = shipOptions ?? addresses ?? [];

	if (billList.length === 0 && shipList.length === 0) {
		return (
			<div className='rounded-lg border border-dashed border-border px-3 py-2.5 bg-muted/20'>
				<p className='text-[11px] text-muted-foreground'>{emptyHint}</p>
			</div>
		);
	}

	return (
		<div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
			<AddressSelector
				label='Bill To'
				required
				value={billToAddressId}
				onChange={onBillToChange}
				options={billList}
				placeholder='Select bill to address…'
				error={errors?.billToAddressId}
			/>
			<AddressSelector
				label='Ship To'
				required
				value={shipToAddressId}
				onChange={onShipToChange}
				options={shipList}
				placeholder='Select ship to address…'
				error={errors?.shipToAddressId}
			/>
		</div>
	);
}
