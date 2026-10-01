"use client";

import { cn } from "@/lib/utils";

export function YesNoRadio({
	name,
	value,
	onChange,
	disabled,
	className,
}: {
	name: string;
	value: boolean;
	onChange: (next: boolean) => void;
	disabled?: boolean;
	className?: string;
}) {
	return (
		<div className={cn("flex items-center gap-4 h-8", className)}>
			<label
				className={cn(
					"flex items-center gap-1.5 text-xs text-foreground",
					disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
				)}
			>
				<input
					type="radio"
					name={name}
					checked={value === true}
					onChange={() => onChange(true)}
					disabled={disabled}
					className="accent-brand-600"
				/>
				Yes
			</label>
			<label
				className={cn(
					"flex items-center gap-1.5 text-xs text-foreground",
					disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
				)}
			>
				<input
					type="radio"
					name={name}
					checked={value === false}
					onChange={() => onChange(false)}
					disabled={disabled}
					className="accent-brand-600"
				/>
				No
			</label>
		</div>
	);
}
