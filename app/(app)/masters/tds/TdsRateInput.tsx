"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sanitizeTdsRateInput, showTdsRatePercentSuffix } from "./tds-data";

export function TdsRateInput({
	value,
	onChange,
	className,
	...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
	value: string;
	onChange: (value: string) => void;
}) {
	const showSuffix = showTdsRatePercentSuffix(value);

	return (
		<div className="relative">
			<Input
				{...props}
				value={value}
				onChange={(e) => onChange(sanitizeTdsRateInput(e.target.value))}
				className={cn(className, showSuffix && "pr-7")}
				placeholder="e.g. 10"
			/>
			{showSuffix && (
				<span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
					%
				</span>
			)}
		</div>
	);
}
