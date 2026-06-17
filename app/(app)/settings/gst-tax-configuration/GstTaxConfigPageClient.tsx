"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { ActiveInactiveToggle } from "@/components/ui/ActiveInactiveToggle";
import { ChevronLeft, Eye, FileText, Plus, Save, Trash2, Upload } from "lucide-react";
import {
	type GstLutRecord,
	DEFAULT_GST_LUT_FORM,
	loadGstLutRecords,
	saveGstLutRecords,
	nextGstLutId,
	recordToLutForm,
	formToLutRecord,
	validateGstLutForm,
	getFinancialYearOptions,
	getCompanyGstinOptions,
	getBranchGstinMappingOptions,
	formatFinancialYearLabel,
} from "@/lib/settings/gst-tax-config";

function formatDisplayDate(iso: string): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

export default function GstTaxConfigPageClient() {
	const [records, setRecords] = useState<GstLutRecord[]>([]);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState(DEFAULT_GST_LUT_FORM);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const financialYearOptions = useMemo(() => getFinancialYearOptions(), []);
	const companyGstinOptions = useMemo(() => getCompanyGstinOptions(), []);
	const branchOptions = useMemo(() => getBranchGstinMappingOptions(), []);

	useEffect(() => {
		setRecords(loadGstLutRecords());
	}, []);

	const resetForm = () => {
		setEditingId(null);
		setForm(DEFAULT_GST_LUT_FORM);
		setErrors({});
	};

	const startEdit = (record: GstLutRecord) => {
		setEditingId(record.id);
		setForm(recordToLutForm(record));
		setErrors({});
	};

	const onFinancialYearChange = (value: string) => {
		const fy = financialYearOptions.find((o) => o.value === value);
		setForm((p) => ({
			...p,
			financialYear: value,
			lutValidFrom: fy?.startDate ?? p.lutValidFrom,
			lutValidTo: fy?.endDate ?? p.lutValidTo,
		}));
	};

	const onBranchChange = (branchId: string) => {
		const branch = branchOptions.find((b) => b.value === branchId);
		setForm((p) => ({
			...p,
			branchId,
			branchName: branch?.branchName ?? p.branchName,
			gstin: branch?.gstin ?? p.gstin,
		}));
	};

	const handlePdfUpload = (file: File) => {
		if (file.type !== "application/pdf") {
			setErrors((e) => ({
				...e,
				lutDocument: "Only PDF documents are allowed.",
			}));
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			setForm((p) => ({
				...p,
				lutDocument: {
					fileName: file.name,
					dataUrl: reader.result as string,
					uploadedAt: new Date().toISOString(),
				},
			}));
			setErrors((e) => {
				const next = { ...e };
				delete next.lutDocument;
				return next;
			});
		};
		reader.readAsDataURL(file);
	};

	const handleSave = () => {
		const fieldErrors = validateGstLutForm(form);
		setErrors(fieldErrors);
		if (Object.keys(fieldErrors).length > 0) return;

		const list = loadGstLutRecords();
		const id = editingId ?? nextGstLutId(list);
		const existing = editingId
			? list.find((r) => r.id === editingId)
			: undefined;
		const record = formToLutRecord(form, id, existing);
		const updated = editingId
			? list.map((r) => (r.id === editingId ? record : r))
			: [...list, record];
		saveGstLutRecords(updated);
		setRecords(updated);
		resetForm();
	};

	return (
		<AppLayout>
			<div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
				<div className="flex items-start justify-between gap-3">
					<div>
						<Link
							href="/settings"
							className="mb-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
						>
							<ChevronLeft className="h-3 w-3" />
							Settings
						</Link>
						<h1 className="text-lg font-semibold text-foreground">
							GST &amp; Tax Configuration
						</h1>
						<p className="text-xs text-muted-foreground">
							Maintain financial-year wise LUT records for SEZ supplies. Used
							automatically on Sales Orders and Tax Invoices.
						</p>
					</div>
					<Button
						size="sm"
						className="h-8 gap-1.5 bg-brand-600 text-xs text-white hover:bg-brand-700"
						onClick={resetForm}
					>
						<Plus className="h-3.5 w-3.5" />
						Add LUT Record
					</Button>
				</div>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
					<div className="space-y-4 lg:col-span-2">
						<section className="space-y-3 rounded-lg border border-border bg-white p-4">
							<h2 className="border-b border-border/60 pb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
								{editingId ? "Edit LUT Record" : "New LUT Record"}
							</h2>

							<div className="space-y-1">
								<Label className="text-xs">Financial Year *</Label>
								<AutocompleteSelect
									options={financialYearOptions.map((o) => ({
										value: o.value,
										label: o.label,
									}))}
									value={form.financialYear}
									onChange={(v) => onFinancialYearChange(String(v))}
									placeholder="Select financial year…"
									className="h-8 text-xs"
								/>
								{errors.financialYear && (
									<p className="text-[11px] text-red-500">
										{errors.financialYear}
									</p>
								)}
							</div>

							<div className="space-y-1">
								<Label className="text-xs">Company GSTIN *</Label>
								<AutocompleteSelect
									options={companyGstinOptions.map((o) => ({
										value: o.value,
										label: o.label,
									}))}
									value={form.gstin}
									onChange={(v) =>
										setForm((p) => ({
											...p,
											gstin: String(v).toUpperCase(),
										}))
									}
									placeholder="Select company GSTIN…"
									className="h-8 text-xs font-mono"
								/>
								{errors.gstin && (
									<p className="text-[11px] text-red-500">{errors.gstin}</p>
								)}
							</div>

							{branchOptions.length > 1 && (
								<div className="space-y-1">
									<Label className="text-xs">Branch GSTIN Mapping</Label>
									<AutocompleteSelect
										options={branchOptions.map((o) => ({
											value: o.value,
											label: o.label,
										}))}
										value={form.branchId}
										onChange={(v) => onBranchChange(String(v))}
										placeholder="Select branch (optional)…"
										className="h-8 text-xs"
									/>
								</div>
							)}

							<div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
								<div>
									<p className="text-xs font-medium">LUT Applicable</p>
									<p className="text-[11px] text-muted-foreground">
										Enable for SEZ supply under LUT
									</p>
								</div>
								<Switch
									checked={form.lutApplicable}
									onCheckedChange={(yes) =>
										setForm((p) => ({
											...p,
											lutApplicable: yes,
											lutNumber: yes ? p.lutNumber : "",
											lutDocument: yes ? p.lutDocument : undefined,
										}))
									}
								/>
							</div>

							{form.lutApplicable && (
								<>
									<div className="space-y-1">
										<Label className="text-xs">LUT Number *</Label>
										<Input
											className="h-8 text-xs"
											placeholder="e.g. LUT/2026-27/001"
											value={form.lutNumber}
											onChange={(e) =>
												setForm((p) => ({
													...p,
													lutNumber: e.target.value,
												}))
											}
										/>
										{errors.lutNumber && (
											<p className="text-[11px] text-red-500">
												{errors.lutNumber}
											</p>
										)}
									</div>

									<div className="grid grid-cols-2 gap-2">
										<div className="space-y-1">
											<Label className="text-xs">Valid From *</Label>
											<Input
												type="date"
												className="h-8 text-xs"
												value={form.lutValidFrom}
												onChange={(e) =>
													setForm((p) => ({
														...p,
														lutValidFrom: e.target.value,
													}))
												}
											/>
											{errors.lutValidFrom && (
												<p className="text-[11px] text-red-500">
													{errors.lutValidFrom}
												</p>
											)}
										</div>
										<div className="space-y-1">
											<Label className="text-xs">Valid To *</Label>
											<Input
												type="date"
												className="h-8 text-xs"
												value={form.lutValidTo}
												onChange={(e) =>
													setForm((p) => ({
														...p,
														lutValidTo: e.target.value,
													}))
												}
											/>
											{errors.lutValidTo && (
												<p className="text-[11px] text-red-500">
													{errors.lutValidTo}
												</p>
											)}
										</div>
									</div>

									<div className="space-y-1">
										<Label className="text-xs">LUT Document (PDF)</Label>
										<div className="flex flex-wrap items-center gap-2">
											<label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted/30">
												<Upload className="h-3.5 w-3.5" />
												Upload PDF
												<input
													type="file"
													accept="application/pdf"
													className="hidden"
													onChange={(e) => {
														const file = e.target.files?.[0];
														if (file) handlePdfUpload(file);
														e.target.value = "";
													}}
												/>
											</label>
											{form.lutDocument && (
												<>
													<span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
														<FileText className="h-3 w-3" />
														{form.lutDocument.fileName}
													</span>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														className="h-7 px-2 text-xs"
														onClick={() =>
															window.open(
																form.lutDocument?.dataUrl,
																"_blank",
															)
														}
													>
														<Eye className="mr-1 h-3 w-3" />
														View
													</Button>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														className="h-7 px-2 text-xs text-red-600"
														onClick={() =>
															setForm((p) => ({
																...p,
																lutDocument: undefined,
															}))
														}
													>
														<Trash2 className="mr-1 h-3 w-3" />
														Remove
													</Button>
												</>
											)}
										</div>
										{errors.lutDocument && (
											<p className="text-[11px] text-red-500">
												{errors.lutDocument}
											</p>
										)}
									</div>
								</>
							)}

							<div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
								<span className="text-xs font-medium">Status</span>
								<ActiveInactiveToggle
									active={form.status === "active"}
									onChange={(active) =>
										setForm((p) => ({
											...p,
											status: active ? "active" : "inactive",
										}))
									}
								/>
							</div>

							<Button
								size="sm"
								className="h-8 w-full gap-1.5 bg-brand-600 text-xs text-white hover:bg-brand-700"
								onClick={handleSave}
							>
								<Save className="h-3.5 w-3.5" />
								Save LUT Record
							</Button>
						</section>
					</div>

					<section className="space-y-3 rounded-lg border border-border bg-white p-4 lg:col-span-3">
						<h2 className="border-b border-border/60 pb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
							LUT Records (Financial Year wise)
						</h2>
						<div className="overflow-x-auto">
							<table className="w-full text-xs">
								<thead>
									<tr className="border-b text-left text-muted-foreground">
										<th className="py-2 pr-2">FY</th>
										<th className="py-2 pr-2">GSTIN</th>
										<th className="py-2 pr-2">Branch</th>
										<th className="py-2 pr-2">LUT No.</th>
										<th className="py-2 pr-2">Validity</th>
										<th className="py-2 pr-2">Document</th>
										<th className="py-2">Status</th>
									</tr>
								</thead>
								<tbody>
									{records.length === 0 ? (
										<tr>
											<td
												colSpan={7}
												className="py-6 text-center text-muted-foreground"
											>
												No LUT records configured yet.
											</td>
										</tr>
									) : (
										records.map((r) => (
											<tr
												key={r.id}
												className="cursor-pointer border-b border-border/40 hover:bg-muted/30"
												onClick={() => startEdit(r)}
											>
												<td className="py-2 pr-2 font-mono">
													{formatFinancialYearLabel(r.financialYear)}
												</td>
												<td className="py-2 pr-2 font-mono">{r.gstin}</td>
												<td className="py-2 pr-2">
													{r.branchName || "Head Office"}
												</td>
												<td className="py-2 pr-2">
													{r.lutApplicable ? r.lutNumber : "N/A"}
												</td>
												<td className="py-2 pr-2 text-[11px] text-muted-foreground">
													{r.lutValidFrom && r.lutValidTo
														? `${formatDisplayDate(r.lutValidFrom)} to ${formatDisplayDate(r.lutValidTo)}`
														: "—"}
												</td>
												<td className="py-2 pr-2">
													{r.lutDocument ? (
														<span className="inline-flex items-center gap-1 text-brand-700">
															<FileText className="h-3 w-3" />
															PDF
														</span>
													) : (
														"—"
													)}
												</td>
												<td className="py-2 capitalize">{r.status}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</section>
				</div>
			</div>
		</AppLayout>
	);
}
