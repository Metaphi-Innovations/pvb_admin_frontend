"use client";

import React from "react";
import { cn } from "@/lib/utils";

/** Compact bordered section — SAP / NetSuite style, minimal vertical footprint. */
export function ErpFormSection({
	title,
	children,
	className,
	bodyClassName,
	headerRight,
}: {
	title: string;
	children: React.ReactNode;
	className?: string;
	bodyClassName?: string;
	/** Toggle / actions shown inline with section title */
	headerRight?: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				"rounded-md border border-border bg-white overflow-hidden",
				className,
			)}
		>
			<div className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/25 px-2.5 py-1">
				<p className="text-[10px] font-bold uppercase tracking-wide text-foreground shrink-0">
					{title}
				</p>
				{headerRight ? (
					<div className="flex items-center justify-end min-w-0">{headerRight}</div>
				) : null}
			</div>
			<div className={cn("p-2", bodyClassName)}>{children}</div>
		</div>
	);
}
