"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import {
	Monitor,
	Smartphone,
	ChevronDown,
	Check,
	Shield,
	Save,
	AlertCircle,
	XCircle,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	type UserPermissions,
	type WebAction,
	type MobileAction,
	type PermModule,
	type MobileGroupDef,
	PERMISSION_REGISTRY,
	MOBILE_PERMISSION_REGISTRY,
	defaultPermissions,
	defaultSubPerm,
	defaultMobilePerm,
	roleDefaultPermissions,
	migratePermissions,
} from "../../../employee/employee-data";
import {
	type Role,
	type RolePermissionTemplate,
	loadRoles,
	loadPermissionTemplates,
	savePermissionTemplates,
} from "../../roles-data";

const ALL_WEB_ACTIONS: WebAction[] = [
	"view",
	"create",
	"edit",
	"delete",
	"approve",
	"export",
	"import",
];
const ALL_MOBILE_ACTIONS: MobileAction[] = [
	"view",
	"create",
	"edit",
	"delete",
	"approve",
];
const WEB_ACTION_LABELS: Record<WebAction, string> = {
	view: "View",
	create: "Create",
	edit: "Edit",
	delete: "Delete",
	approve: "Approve",
	export: "Export",
	import: "Import",
};
const MOBILE_ACTION_LABELS: Record<MobileAction, string> = {
	view: "View",
	create: "Create",
	edit: "Edit",
	delete: "Delete",
	approve: "Approve",
};

export default function RolePermissionsPage() {
	const router = useRouter();
	const params = useParams();
	const roleId = Number(params?.id);

	const [role, setRole] = useState<Role | null>(null);
	const [notFound, setNotFound] = useState(false);
	const [section, setSection] = useState<"web" | "mobile">("web");
	const [openMods, setOpenMods] = useState<Set<string>>(new Set());
	const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

	// Set state holding string keys in format "modId.subId.action" or "grpId.featId.action"
	const [activeWebPerms, setActiveWebPerms] = useState<Set<string>>(new Set());
	const [activeMobilePerms, setActiveMobilePerms] = useState<Set<string>>(new Set());

	const [pendingSection, setPendingSection] = useState<"web" | "mobile" | null>(null);
	const [showWarningModal, setShowWarningModal] = useState(false);
	const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 3200);
		return () => clearTimeout(t);
	}, [toast]);

	const hasSelectedPermissions = (platform: "web" | "mobile") => {
		if (platform === "web") {
			return activeWebPerms.size > 0;
		} else {
			return activeMobilePerms.size > 0;
		}
	};

	const handleSectionChange = (targetSection: "web" | "mobile") => {
		if (section === targetSection) return;
		if (hasSelectedPermissions(section)) {
			setPendingSection(targetSection);
			setShowWarningModal(true);
		} else {
			setSection(targetSection);
		}
	};

	const confirmSectionChange = () => {
		if (!pendingSection) return;
		if (section === "web") {
			setActiveWebPerms(new Set());
		} else {
			setActiveMobilePerms(new Set());
		}
		setSection(pendingSection);
		setPendingSection(null);
		setShowWarningModal(false);
	};

	const cancelSectionChange = () => {
		setPendingSection(null);
		setShowWarningModal(false);
	};

	useEffect(() => {
		const roles = loadRoles();
		const found = roles.find((r) => r.id === roleId);
		if (!found || found.status === "archived") {
			setNotFound(true);
			return;
		}
		setRole(found);

		const templates = loadPermissionTemplates();
		const existingTemplate = templates[roleId] || templates[String(roleId)];

		if (existingTemplate) {
			setSection(existingTemplate.accessType === "mobile" ? "mobile" : "web");

			const webSet = new Set<string>();
			if (Array.isArray(existingTemplate.webPermissions)) {
				existingTemplate.webPermissions.forEach((p: any) => {
					let mKey = p.moduleKey || p.module || p.moduleId || p.moduleName;
					const aKey = p.actionKey || p.action || p.permission;
					if (mKey && aKey) {
						if (mKey === "sales.customers") {
							mKey = "masters.customerMaster";
						}
						// Ensure moduleKey holds modId.subId format
						webSet.add(`${mKey}.${aKey}`);
					}
				});
			}
			setActiveWebPerms(webSet);

			const mobileSet = new Set<string>();
			if (Array.isArray(existingTemplate.mobilePermissions)) {
				existingTemplate.mobilePermissions.forEach((p: any) => {
					let mKey = p.moduleKey || p.module || p.moduleId || p.moduleName;
					const aKey = p.actionKey || p.action || p.permission;
					if (mKey && aKey) {
						// Ensure moduleKey holds grpId.featId format
						mobileSet.add(`${mKey}.${aKey}`);
					}
				});
			}
			setActiveMobilePerms(mobileSet);
		} else {
			setActiveWebPerms(new Set());
			setActiveMobilePerms(new Set());
			setSection("web");
		}

		if (PERMISSION_REGISTRY.length > 0) {
			setOpenMods(new Set([PERMISSION_REGISTRY[0].id]));
		}
		if (MOBILE_PERMISSION_REGISTRY.length > 0) {
			setOpenGroups(new Set([MOBILE_PERMISSION_REGISTRY[0].id]));
		}
	}, [roleId]);

	const toggleMod = (id: string) =>
		setOpenMods((s) => {
			const next = new Set(s);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

	const toggleGroup = (id: string) =>
		setOpenGroups((s) => {
			const next = new Set(s);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

	const toggleWebPerm = (modId: string, subId: string, action: string) => {
		const key = `${modId}.${subId}.${action}`;
		setActiveWebPerms((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const toggleMobilePerm = (grpId: string, featId: string, action: string) => {
		const key = `${grpId}.${featId}.${action}`;
		setActiveMobilePerms((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const grantMod = (mod: PermModule) => {
		setActiveWebPerms((prev) => {
			const next = new Set(prev);
			mod.submodules.forEach((sub) => {
				sub.actions.forEach((action) => {
					next.add(`${mod.id}.${sub.id}.${action}`);
				});
			});
			return next;
		});
	};

	const revokeMod = (mod: PermModule) => {
		setActiveWebPerms((prev) => {
			const next = new Set(prev);
			mod.submodules.forEach((sub) => {
				sub.actions.forEach((action) => {
					next.delete(`${mod.id}.${sub.id}.${action}`);
				});
			});
			return next;
		});
	};

	const grantGroup = (grp: MobileGroupDef) => {
		setActiveMobilePerms((prev) => {
			const next = new Set(prev);
			grp.features.forEach((feat) => {
				feat.actions.forEach((action) => {
					next.add(`${grp.id}.${feat.id}.${action}`);
				});
			});
			return next;
		});
	};

	const revokeGroup = (grp: MobileGroupDef) => {
		setActiveMobilePerms((prev) => {
			const next = new Set(prev);
			grp.features.forEach((feat) => {
				feat.actions.forEach((action) => {
					next.delete(`${grp.id}.${feat.id}.${action}`);
				});
			});
			return next;
		});
	};

	const grantAll = () => {
		const webSet = new Set<string>();
		PERMISSION_REGISTRY.forEach((mod) => {
			mod.submodules.forEach((sub) => {
				sub.actions.forEach((action) => {
					webSet.add(`${mod.id}.${sub.id}.${action}`);
				});
			});
		});

		const mobileSet = new Set<string>();
		MOBILE_PERMISSION_REGISTRY.forEach((grp) => {
			grp.features.forEach((feat) => {
				feat.actions.forEach((action) => {
					mobileSet.add(`${grp.id}.${feat.id}.${action}`);
				});
			});
		});

		setActiveWebPerms(webSet);
		setActiveMobilePerms(mobileSet);
	};

	const revokeAll = () => {
		setActiveWebPerms(new Set());
		setActiveMobilePerms(new Set());
	};

	const modHasAny = (mod: PermModule) =>
		mod.submodules.some((sub) =>
			ALL_WEB_ACTIONS.some(
				(action) =>
					sub.actions.includes(action) &&
					activeWebPerms.has(`${mod.id}.${sub.id}.${action}`),
			),
		);

	const groupHasAny = (grp: MobileGroupDef) =>
		grp.features.some((feat) =>
			ALL_MOBILE_ACTIONS.some(
				(action) =>
					feat.actions.includes(action) &&
					activeMobilePerms.has(`${grp.id}.${feat.id}.${action}`),
			),
		);

	const handleSave = () => {
		if (!role) return;

		const hasWeb = activeWebPerms.size > 0;
		const hasMobile = activeMobilePerms.size > 0;

		if (hasWeb && hasMobile) {
			setToast({
				msg: "Only one access type is allowed per role. Please keep either Web Portal or Mobile permissions.",
				type: "error",
			});
			return;
		}

		if (!hasWeb && !hasMobile) {
			setToast({
				msg: "Please select at least one permission.",
				type: "error",
			});
			return;
		}

		const templates = loadPermissionTemplates();
		const existing = templates[roleId] || templates[String(roleId)];
		const nowStr = new Date().toISOString().slice(0, 10);

		// Format web permissions as array of { moduleKey, actionKey }
		const webPermissions: any[] = [];
		activeWebPerms.forEach((val) => {
			const parts = val.split(".");
			if (parts.length >= 3) {
				const moduleKey = `${parts[0]}.${parts[1]}`;
				const actionKey = parts.slice(2).join(".");
				webPermissions.push({ moduleKey, actionKey });
			}
		});

		// Format mobile permissions as array of { moduleKey, actionKey }
		const mobilePermissions: any[] = [];
		activeMobilePerms.forEach((val) => {
			const parts = val.split(".");
			if (parts.length >= 3) {
				const moduleKey = `${parts[0]}.${parts[1]}`;
				const actionKey = parts.slice(2).join(".");
				mobilePermissions.push({ moduleKey, actionKey });
			}
		});

		templates[roleId] = {
			roleId: roleId,
			accessType: hasWeb ? "web" : hasMobile ? "mobile" : "none",
			webPermissions,
			mobilePermissions,
			createdAt: existing?.createdAt || nowStr,
			updatedAt: nowStr,
		};
		savePermissionTemplates(templates);
		router.push("/user-management/roles?tab=templates");
	};

	if (notFound) {
		return (
			<div className='flex flex-col items-center justify-center gap-3 py-24'>
				<p className='text-sm font-medium text-foreground'>Role not found</p>
				<p className='text-xs text-muted-foreground'>
					The role may have been archived or doesn't exist.
				</p>
				<Button
					size='sm'
					variant='outline'
					className='h-8 mt-2 text-xs'
					onClick={() => router.push("/user-management/roles")}
				>
					Back to Roles
				</Button>
			</div>
		);
	}

	if (!role) return null;

	return (
		<FormContainer
			title={`Permission Template — ${role.roleName}`}
			description='User Management → Roles → Permission Template'
			onBack={() => router.push("/user-management/roles?tab=templates")}
			onCancel={() => router.push("/user-management/roles?tab=templates")}
			cancelLabel='Cancel'
			noCard={true}
			actions={
				<Button
					size='sm'
					className='h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white'
					onClick={handleSave}
				>
					<Save className='w-3.5 h-3.5' /> Save Template
				</Button>
			}
		>
			<div className='px-6 pt-1 pb-6 space-y-4'>
				{/* Tab Selection */}
				<div className='flex gap-1.5 pb-2 border-b border-border'>
					{(
						[
							["web", "Web Portal"],
							["mobile", "Mobile App"],
						] as const
					).map(([key, label]) => (
						<button
							key={key}
							type='button'
							onClick={() => handleSectionChange(key)}
							className={cn(
								"flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium transition-colors border",
								section === key
									? "bg-brand-600 text-white border-brand-600"
									: "border-border text-muted-foreground hover:bg-muted/40",
							)}
						>
							{key === "web" ? (
								<Monitor className='w-3.5 h-3.5' />
							) : (
								<Smartphone className='w-3.5 h-3.5' />
							)}
							{label} Permissions
						</button>
					))}
				</div>

				{/* Permission Accordion */}
				<div className='space-y-3'>
					{section === "web" && (
						<div className='space-y-2'>
							{PERMISSION_REGISTRY.map((mod) => {
								const expanded = openMods.has(mod.id);
								const hasAny = modHasAny(mod);
								return (
									<div
										key={mod.id}
										className='overflow-hidden border border-border bg-white rounded-xl shadow-sm'
									>
										<div
											className={cn(
												"flex items-center justify-between px-4 py-3.5 cursor-pointer transition-colors select-none",
												expanded
													? "border-b border-border bg-muted/5"
													: hasAny
														? "hover:bg-brand-50/40"
														: "hover:bg-muted/20",
											)}
											onClick={() => toggleMod(mod.id)}
										>
											<div className='flex items-center gap-2'>
												<ChevronDown
													className={cn(
														"w-3.5 h-3.5 text-muted-foreground transition-transform duration-150",
														!expanded && "-rotate-90",
													)}
												/>
												<span className='text-xs font-semibold text-foreground'>
													{mod.label}
												</span>
												<span className='text-[10px] text-muted-foreground'>
													({mod.submodules.length} submodule
													{mod.submodules.length > 1 ? "s" : ""})
												</span>
												{hasAny && !expanded && (
													<span className='text-[9px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-semibold'>
														configured
													</span>
												)}
											</div>
											<div
												className='flex items-center gap-1'
												onClick={(e) => e.stopPropagation()}
											>
												<button
													type='button'
													onClick={() => grantMod(mod)}
													className='text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors'
												>
													Grant All
												</button>
												<button
													type='button'
													onClick={() => revokeMod(mod)}
													className='text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors'
												>
													Revoke All
												</button>
											</div>
										</div>
										{expanded && (
											<div className='space-y-2.5 p-4 bg-slate-50/30'>
												{mod.submodules.map((sub) => {
													const actions = ALL_WEB_ACTIONS.filter((action) =>
														sub.actions.includes(action),
													);
													const rowActive = actions.some((action) =>
														activeWebPerms.has(`${mod.id}.${sub.id}.${action}`),
													);
													return (
														<div
															key={sub.id}
															className={cn(
																"rounded-xl border border-border bg-white px-4 py-3 transition-colors",
																rowActive && "bg-brand-50/10 border-brand-100",
															)}
														>
															<div className='flex flex-col gap-2 lg:flex-row lg:items-center'>
																<div className='min-w-0 lg:w-56 lg:flex-shrink-0'>
																	<p className='text-[11px] font-semibold text-foreground'>
																		{sub.label}
																	</p>
																	<p className='text-[9px] text-muted-foreground mt-0.5'>
																		Available permissions
																	</p>
																</div>
																<div className='flex flex-wrap items-center gap-1.5 lg:pl-4'>
																	{actions.map((action) => {
																		const checked = activeWebPerms.has(
																			`${mod.id}.${sub.id}.${action}`
																		);
																		return (
																			<label
																				key={action}
																				className={cn(
																					"inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-medium cursor-pointer transition-colors select-none",
																					checked
																						? "border-brand-300 bg-brand-50 text-brand-700 font-semibold"
																						: "border-border text-muted-foreground hover:bg-muted/40",
																				)}
																			>
																				<input
																					type='checkbox'
																					checked={checked}
																					onChange={() =>
																						toggleWebPerm(
																							mod.id,
																							sub.id,
																							action,
																						)
																					}
																					className='w-3.5 h-3.5 rounded accent-brand-650 cursor-pointer'
																				/>
																				<span>{WEB_ACTION_LABELS[action]}</span>
																			</label>
																		);
																	})}
																</div>
															</div>
														</div>
													);
												})}
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}

					{section === "mobile" && (
						<div className='space-y-2'>
							{MOBILE_PERMISSION_REGISTRY.map((grp) => {
								const expanded = openGroups.has(grp.id);
								const hasAny = groupHasAny(grp);
								return (
									<div
										key={grp.id}
										className='overflow-hidden border border-border bg-white rounded-xl shadow-sm'
									>
										<div
											className={cn(
												"flex items-center justify-between px-4 py-3.5 cursor-pointer transition-colors select-none",
												expanded
													? "border-b border-border bg-muted/5"
													: hasAny
														? "hover:bg-brand-50/40"
														: "hover:bg-muted/20",
											)}
											onClick={() => toggleGroup(grp.id)}
										>
											<div className='flex items-center gap-2'>
												<ChevronDown
													className={cn(
														"w-3.5 h-3.5 text-muted-foreground transition-transform duration-150",
														!expanded && "-rotate-90",
													)}
												/>
												<span className='text-xs font-semibold text-foreground'>
													{grp.label}
												</span>
												<span className='text-[10px] text-muted-foreground'>
													({grp.features.length} feature
													{grp.features.length > 1 ? "s" : ""})
												</span>
												{hasAny && !expanded && (
													<span className='text-[9px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-semibold'>
														configured
													</span>
												)}
											</div>
											<div
												className='flex items-center gap-1'
												onClick={(e) => e.stopPropagation()}
											>
												<button
													type='button'
													onClick={() => grantGroup(grp)}
													className='text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors'
												>
													Grant All
												</button>
												<button
													type='button'
													onClick={() => revokeGroup(grp)}
													className='text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors'
												>
													Revoke All
												</button>
											</div>
										</div>
										{expanded && (
											<div className='space-y-2.5 p-4 bg-slate-50/30'>
												{grp.features.map((feat) => {
													const actions = ALL_MOBILE_ACTIONS.filter((action) =>
														feat.actions.includes(action),
													);
													const rowActive = actions.some((action) =>
														activeMobilePerms.has(`${grp.id}.${feat.id}.${action}`),
													);
													return (
														<div
															key={feat.id}
															className={cn(
																"rounded-xl border border-border bg-white px-4 py-3 transition-colors",
																rowActive && "bg-brand-50/10 border-brand-100",
															)}
														>
															<div className='flex flex-col gap-2 lg:flex-row lg:items-center'>
																<div className='min-w-0 lg:w-56 lg:flex-shrink-0'>
																	<p className='text-[11px] font-semibold text-foreground'>
																		{feat.label}
																	</p>
																	<p className='text-[9px] text-muted-foreground mt-0.5'>
																		Available permissions
																	</p>
																</div>
																<div className='flex flex-wrap items-center gap-1.5 lg:pl-4'>
																	{actions.map((action) => {
																		const checked = activeMobilePerms.has(
																			`${grp.id}.${feat.id}.${action}`
																		);
																		return (
																			<label
																				key={action}
																				className={cn(
																					"inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-medium cursor-pointer transition-colors select-none",
																					checked
																						? "border-brand-300 bg-brand-50 text-brand-700 font-semibold"
																						: "border-border text-muted-foreground hover:bg-muted/40",
																				)}
																			>
																				<input
																					type='checkbox'
																					checked={checked}
																					onChange={() =>
																						toggleMobilePerm(
																							grp.id,
																							feat.id,
																							action,
																						)
																					}
																					className='w-3.5 h-3.5 rounded accent-brand-650 cursor-pointer'
																				/>
																				<span>
																					{MOBILE_ACTION_LABELS[action]}
																				</span>
																			</label>
																		);
																	})}
																</div>
															</div>
														</div>
													);
												})}
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>

			{/* Warning Modal */}
			<Dialog open={showWarningModal} onOpenChange={(v) => !v && cancelSectionChange()}>
				<DialogContent className='max-w-md p-0 gap-0 overflow-hidden'>
					<DialogHeader className='px-5 pt-5 pb-3 border-b border-border/80'>
						<DialogTitle className='text-sm font-semibold flex items-center gap-2 text-red-650'>
							<AlertCircle className='w-4 h-4 text-red-650' />
							Confirm Platform Switch
						</DialogTitle>
						<DialogDescription className='text-xs text-muted-foreground'>
							Changing the access type will reset existing selections.
						</DialogDescription>
					</DialogHeader>

					<div className='px-5 py-4 text-xs text-foreground leading-normal'>
						{section === "web"
							? "Switching to Mobile permissions will clear all Web Portal permissions for this role. Do you want to continue?"
							: "Switching to Web Portal permissions will clear all Mobile permissions for this role. Do you want to continue?"}
					</div>

					<DialogFooter className='px-5 py-3 border-t border-border/80 bg-muted/20 flex items-center justify-end gap-2'>
						<Button variant='outline' size='sm' className='h-8 text-xs' onClick={cancelSectionChange}>
							Cancel
						</Button>
						<Button
							size='sm'
							className='h-8 text-xs text-white bg-brand-600 hover:bg-brand-700'
							onClick={confirmSectionChange}
						>
							Yes, Continue
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Toast */}
			{toast && (
				<div
					className={cn(
						"fixed top-5 right-5 z-[200] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
						"animate-in slide-in-from-top-2 fade-in-0 duration-300",
						toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
					)}
				>
					{toast.type === "success" ? (
						<Check className='flex-shrink-0 w-4 h-4' />
					) : (
						<XCircle className='flex-shrink-0 w-4 h-4' />
					)}
					{toast.msg}
				</div>
			)}
		</FormContainer>
	);
}
