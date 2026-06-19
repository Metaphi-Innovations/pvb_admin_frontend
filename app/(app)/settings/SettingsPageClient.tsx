"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Receipt } from "lucide-react";

const SETTINGS_SECTIONS = [
	{
		title: "GST & Tax Configuration",
		description:
			"Financial-year wise LUT records, company GSTIN mapping, and SEZ supply settings.",
		href: "/settings/gst-tax-configuration",
		icon: Receipt,
	},
];

export default function SettingsPageClient() {
	return (
		<AppLayout>
			<div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
				<div>
					<h1 className="text-lg font-semibold text-foreground">Settings</h1>
					<p className="text-xs text-muted-foreground">
						Application configuration and compliance settings.
					</p>
				</div>

				<div className="space-y-3">
					<h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/60 pb-2">
						Configuration
					</h2>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						{SETTINGS_SECTIONS.map((section) => (
							<Link
								key={section.href}
								href={section.href}
								className="rounded-lg border border-border bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/30"
							>
								<div className="flex items-start gap-3">
									<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
										<section.icon className="h-4 w-4" />
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-semibold text-foreground">
											{section.title}
										</p>
										<p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
											{section.description}
										</p>
									</div>
								</div>
							</Link>
						))}
					</div>
				</div>
			</div>
		</AppLayout>
	);
}
