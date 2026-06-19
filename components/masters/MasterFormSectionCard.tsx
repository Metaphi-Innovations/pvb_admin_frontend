"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function MasterFormSectionCard({
	title,
	description,
	icon: Icon,
	children,
	className,
}: {
	title: string;
	description?: string;
	icon?: React.ElementType;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"rounded-xl border border-border bg-white shadow-sm overflow-hidden",
				className,
			)}
		>
			<div className="flex items-start gap-2.5 border-b border-border/60 bg-muted/20 px-4 py-3">
				{Icon && (
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-brand-50">
						<Icon className="h-4 w-4 text-brand-600" />
					</div>
				)}
				<div className="min-w-0">
					<p className="text-xs font-bold uppercase tracking-wider text-foreground">
						{title}
					</p>
					{description && (
						<p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
					)}
				</div>
			</div>
			<div className="p-4 space-y-3">{children}</div>
		</div>
	);
}
