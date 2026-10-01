"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function FieldError({ msg }: { msg?: string }) {
	if (!msg) return null;
	return <p className="text-[11px] text-red-500 leading-tight">{msg}</p>;
}

export interface BankDetailsValues {
	accountHolderName: string;
	bankName: string;
	branch: string;
	accountNumber: string;
	confirmAccountNumber: string;
	ifscCode: string;
	swiftCode?: string;
}

export function BankDetailsFields({
	values,
	onChange,
	errors = {},
	readOnly,
	inputClassName = "h-8 text-xs",
}: {
	values: BankDetailsValues;
	onChange: (next: BankDetailsValues) => void;
	errors?: Record<string, string>;
	readOnly?: boolean;
	inputClassName?: string;
}) {
	const set = <K extends keyof BankDetailsValues>(key: K, value: BankDetailsValues[K]) =>
		onChange({ ...values, [key]: value });

	const fieldCls = (key: string) =>
		cn(inputClassName, errors[key] && "border-red-400 focus-visible:ring-red-300");

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
			<div className="space-y-1">
				<Label className="text-xs font-medium text-foreground">Account Holder Name</Label>
				<Input
					disabled={readOnly}
					value={values.accountHolderName}
					onChange={(e) => set("accountHolderName", e.target.value)}
					className={fieldCls("accountHolderName")}
				/>
				<FieldError msg={errors.accountHolderName} />
			</div>
			<div className="space-y-1">
				<Label className="text-xs font-medium text-foreground">Bank Name</Label>
				<Input
					disabled={readOnly}
					value={values.bankName}
					onChange={(e) => set("bankName", e.target.value)}
					className={fieldCls("bankName")}
				/>
				<FieldError msg={errors.bankName} />
			</div>
			<div className="space-y-1">
				<Label className="text-xs font-medium text-foreground">Branch Name</Label>
				<Input
					disabled={readOnly}
					value={values.branch}
					onChange={(e) => set("branch", e.target.value)}
					className={fieldCls("branch")}
				/>
				<FieldError msg={errors.branch} />
			</div>
			<div className="space-y-1">
				<Label className="text-xs font-medium text-foreground">Account Number</Label>
				<Input
					disabled={readOnly}
					value={values.accountNumber}
					onChange={(e) => set("accountNumber", e.target.value)}
					className={cn(fieldCls("accountNumber"), "font-mono")}
				/>
				<FieldError msg={errors.accountNumber} />
			</div>
			<div className="space-y-1">
				<Label className="text-xs font-medium text-foreground">Confirm Account Number</Label>
				<Input
					disabled={readOnly}
					value={values.confirmAccountNumber}
					onChange={(e) => set("confirmAccountNumber", e.target.value)}
					className={cn(fieldCls("confirmAccountNumber"), "font-mono")}
				/>
				<FieldError msg={errors.confirmAccountNumber} />
			</div>
			<div className="space-y-1">
				<Label className="text-xs font-medium text-foreground">IFSC Code</Label>
				<Input
					disabled={readOnly}
					value={values.ifscCode}
					onChange={(e) => set("ifscCode", e.target.value.toUpperCase())}
					className={cn(fieldCls("ifscCode"), "font-mono uppercase")}
				/>
				<FieldError msg={errors.ifscCode} />
			</div>
			<div className="space-y-1">
				<Label className="text-xs font-medium text-foreground">SWIFT Code</Label>
				<Input
					disabled={readOnly}
					value={values.swiftCode ?? ""}
					onChange={(e) => set("swiftCode", e.target.value)}
					className={fieldCls("swiftCode")}
					placeholder="Optional"
				/>
				<FieldError msg={errors.swiftCode} />
			</div>
		</div>
	);
}
