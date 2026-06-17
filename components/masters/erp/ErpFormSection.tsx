"use client";

import React from "react";
import { cn } from "@/lib/utils";

/** Compact bordered section — SAP / NetSuite style, minimal vertical footprint. */
export function ErpFormSection({
	title,
	children,
	className,
	bodyClassName,
}: {
	title: string;
	children: React.ReactNode;
	className?: string;
	bodyClassName?: string;
}) {
	return (
		<div
			className={cn(
				"rounded-md border border-border bg-white overflow-hidden",
				className,
			)}
		>
			<div className="flex items-center border-b border-border/70 bg-muted/25 px-2.5 py-1">
				<p className="text-[10px] font-bold uppercase tracking-wide text-foreground">
					{title}
				</p>
			</div>
			<div className={cn("p-2.5", bodyClassName)}>{children}</div>
		</div>
	);
}
