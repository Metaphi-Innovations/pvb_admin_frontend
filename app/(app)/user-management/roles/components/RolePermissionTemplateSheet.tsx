"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter,
  SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, ChevronDown, Check, Shield } from "lucide-react";
import {
  type UserPermissions, type WebAction, type MobileAction, type PermModule, type MobileGroupDef,
  PERMISSION_REGISTRY, MOBILE_PERMISSION_REGISTRY,
  defaultPermissions, defaultSubPerm, defaultMobilePerm,
  roleDefaultPermissions, migratePermissions,
} from "../../employee/employee-data";
import { type Role } from "../roles-data";

const ALL_WEB_ACTIONS: WebAction[] = ["view", "create", "edit", "delete", "approve", "export", "import"];
const ALL_MOBILE_ACTIONS: MobileAction[] = ["view", "create", "edit", "delete", "approve"];
const WEB_ACTION_LABELS: Record<WebAction, string> = {
  view: "View", create: "Create", edit: "Edit", delete: "Delete", approve: "Approve", export: "Export", import: "Import"
};
const MOBILE_ACTION_LABELS: Record<MobileAction, string> = {
  view: "View", create: "Create", edit: "Edit", delete: "Delete", approve: "Approve"
};

interface RolePermissionTemplateSheetProps {
  open: boolean;
  onClose: () => void;
  role: Role | null;
  initialPermissions?: UserPermissions | null;
  onSave: (perms: UserPermissions) => void;
}

export default function RolePermissionTemplateSheet({
  open,
  onClose,
  role,
  initialPermissions,
  onSave,
}: RolePermissionTemplateSheetProps) {
  const [perms, setPerms] = useState<UserPermissions>(defaultPermissions());
  const [section, setSection] = useState<"web" | "mobile">("web");
  const [openMods, setOpenMods] = useState<Set<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Initialize permissions when sheet opens
  useEffect(() => {
    if (open) {
      if (initialPermissions) {
        setPerms(migratePermissions(initialPermissions));
      } else {
        setPerms(defaultPermissions());
      }
      // Expand the first sections by default
      if (PERMISSION_REGISTRY.length > 0) {
        setOpenMods(new Set([PERMISSION_REGISTRY[0].id]));
      }
      if (MOBILE_PERMISSION_REGISTRY.length > 0) {
        setOpenGroups(new Set([MOBILE_PERMISSION_REGISTRY[0].id]));
      }
    }
  }, [open, initialPermissions]);

  const toggleMod = (id: string) => setOpenMods((s) => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleGroup = (id: string) => setOpenGroups((s) => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const getSub = (modId: string, subId: string) =>
    perms.web?.[modId]?.[subId] || defaultSubPerm();

  const getMob = (grpId: string, featId: string) =>
    perms.mobile?.[grpId]?.[featId] || defaultMobilePerm();

  const setSubAction = (modId: string, subId: string, action: WebAction, val: boolean) => {
    setPerms({
      ...perms,
      web: {
        ...perms.web,
        [modId]: {
          ...(perms.web?.[modId] || {}),
          [subId]: {
            ...getSub(modId, subId),
            [action]: val,
          },
        },
      },
    });
  };

  const setMobAction = (grpId: string, featId: string, action: MobileAction, val: boolean) => {
    setPerms({
      ...perms,
      mobile: {
        ...perms.mobile,
        [grpId]: {
          ...(perms.mobile?.[grpId] || {}),
          [featId]: {
            ...getMob(grpId, featId),
            [action]: val,
          },
        },
      },
    });
  };

  const grantMod = (mod: PermModule) => {
    const updated = { ...(perms.web || {}) };
    updated[mod.id] = {};
    mod.submodules.forEach((sub) => {
      updated[mod.id][sub.id] = {
        view: sub.actions.includes("view"),
        create: sub.actions.includes("create"),
        edit: sub.actions.includes("edit"),
        delete: sub.actions.includes("delete"),
        approve: sub.actions.includes("approve"),
        export: sub.actions.includes("export"),
        import: sub.actions.includes("import"),
      };
    });
    setPerms({ ...perms, web: updated });
  };

  const revokeMod = (mod: PermModule) => {
    const updated = { ...(perms.web || {}) };
    updated[mod.id] = {};
    mod.submodules.forEach((sub) => {
      updated[mod.id][sub.id] = defaultSubPerm();
    });
    setPerms({ ...perms, web: updated });
  };

  const grantGroup = (grp: MobileGroupDef) => {
    const updated = { ...(perms.mobile || {}) };
    updated[grp.id] = {};
    grp.features.forEach((feat) => {
      updated[grp.id][feat.id] = {
        view: feat.actions.includes("view"),
        create: feat.actions.includes("create"),
        edit: feat.actions.includes("edit"),
        delete: feat.actions.includes("delete"),
        approve: feat.actions.includes("approve"),
      };
    });
    setPerms({ ...perms, mobile: updated });
  };

  const revokeGroup = (grp: MobileGroupDef) => {
    const updated = { ...(perms.mobile || {}) };
    updated[grp.id] = {};
    grp.features.forEach((feat) => {
      updated[grp.id][feat.id] = defaultMobilePerm();
    });
    setPerms({ ...perms, mobile: updated });
  };

  const grantAll = () => {
    const next: UserPermissions = { web: {}, mobile: {} };
    PERMISSION_REGISTRY.forEach((mod) => {
      next.web[mod.id] = {};
      mod.submodules.forEach((sub) => {
        next.web[mod.id][sub.id] = {
          view: sub.actions.includes("view"),
          create: sub.actions.includes("create"),
          edit: sub.actions.includes("edit"),
          delete: sub.actions.includes("delete"),
          approve: sub.actions.includes("approve"),
          export: sub.actions.includes("export"),
          import: sub.actions.includes("import"),
        };
      });
    });
    MOBILE_PERMISSION_REGISTRY.forEach((grp) => {
      next.mobile[grp.id] = {};
      grp.features.forEach((feat) => {
        next.mobile[grp.id][feat.id] = {
          view: feat.actions.includes("view"),
          create: feat.actions.includes("create"),
          edit: feat.actions.includes("edit"),
          delete: feat.actions.includes("delete"),
          approve: feat.actions.includes("approve"),
        };
      });
    });
    setPerms(next);
  };

  const revokeAll = () => setPerms(defaultPermissions());

  const modHasAny = (mod: PermModule) =>
    mod.submodules.some((sub) => ALL_WEB_ACTIONS.some((action) => sub.actions.includes(action) && Boolean((getSub(mod.id, sub.id) as any)[action])));
  
  const groupHasAny = (grp: MobileGroupDef) =>
    grp.features.some((feat) => ALL_MOBILE_ACTIONS.some((action) => feat.actions.includes(action) && Boolean((getMob(grp.id, feat.id) as any)[action])));

  if (!role) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand-50 border border-brand-200">
              <Shield className="w-4 h-4 text-brand-650" />
            </div>
            <div>
              <SheetTitle>Permission Template</SheetTitle>
              <SheetDescription>Configure default module permissions for role</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2.5">
            <div>
              <p className="text-xs font-semibold text-foreground">
                Role Name: <span className="text-brand-700">{role.roleName}</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Load suggested permissions for this role. You can adjust individually after loading.
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setPerms(roleDefaultPermissions(role.roleName))}
              >
                Load Role Defaults
              </Button>
              <button
                type="button"
                onClick={grantAll}
                className="text-[10px] font-semibold px-2 py-1 rounded bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
              >
                Grant All
              </button>
              <button
                type="button"
                onClick={revokeAll}
                className="text-[10px] font-semibold px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                Revoke All
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 pb-2 border-b border-border">
            {([["web", "Web Portal"], ["mobile", "Mobile App"]] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-colors border",
                  section === key
                    ? "bg-brand-600 text-white border-brand-600"
                    : "border-border text-muted-foreground hover:bg-muted/40"
                )}
              >
                {key === "web" ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                {label} Permissions
              </button>
            ))}
          </div>

          <div className="max-h-[calc(100vh-290px)] overflow-y-auto pr-1">
            {section === "web" && (
              <div className="space-y-1.5">
                {PERMISSION_REGISTRY.map((mod) => {
                  const expanded = openMods.has(mod.id);
                  const hasAny = modHasAny(mod);
                  return (
                    <div key={mod.id} className="overflow-hidden border border-border rounded-xl">
                      <div
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors select-none bg-white",
                          expanded ? "border-b border-border" : hasAny ? "hover:bg-brand-50/40" : "hover:bg-muted/20"
                        )}
                        onClick={() => toggleMod(mod.id)}
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={cn(
                              "w-3.5 h-3.5 text-muted-foreground transition-transform duration-150",
                              !expanded && "-rotate-90"
                            )}
                          />
                          <span className="text-xs font-semibold text-foreground">{mod.label}</span>
                          <span className="text-[10px] text-muted-foreground">
                            ({mod.submodules.length} submodule{mod.submodules.length > 1 ? "s" : ""})
                          </span>
                          {hasAny && !expanded && (
                            <span className="text-[9px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-semibold">
                              configured
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => grantMod(mod)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                          >
                            Grant All
                          </button>
                          <button
                            type="button"
                            onClick={() => revokeMod(mod)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            Revoke All
                          </button>
                        </div>
                      </div>
                      {expanded && (
                        <div className="space-y-2 p-3 bg-slate-50/30">
                          {mod.submodules.map((sub) => {
                            const sp = getSub(mod.id, sub.id);
                            const actions = ALL_WEB_ACTIONS.filter((action) => sub.actions.includes(action));
                            const rowActive = actions.some((action) => Boolean((sp as any)[action]));
                            return (
                              <div
                                key={sub.id}
                                className={cn(
                                  "rounded-xl border border-border/60 bg-white px-3 py-2.5 transition-colors",
                                  rowActive && "bg-brand-50/20 border-brand-200"
                                )}
                              >
                                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                                  <div className="min-w-0 lg:w-48 lg:flex-shrink-0">
                                    <p className="text-[11px] font-semibold text-foreground">{sub.label}</p>
                                    <p className="text-[9px] text-muted-foreground">Available permissions</p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 lg:pl-4">
                                    {actions.map((action) => {
                                      const checked = Boolean((sp as any)[action]);
                                      return (
                                        <label
                                          key={action}
                                          className={cn(
                                            "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium cursor-pointer transition-colors",
                                            checked
                                              ? "border-brand-300 bg-brand-50 text-brand-700"
                                              : "border-border text-muted-foreground hover:bg-muted/40"
                                          )}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(e) => setSubAction(mod.id, sub.id, action, e.target.checked)}
                                            className="w-3.5 h-3.5 rounded accent-brand-650 cursor-pointer"
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
              <div className="space-y-1.5">
                {MOBILE_PERMISSION_REGISTRY.map((grp) => {
                  const expanded = openGroups.has(grp.id);
                  const hasAny = groupHasAny(grp);
                  return (
                    <div key={grp.id} className="overflow-hidden border border-border rounded-xl">
                      <div
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors select-none bg-white",
                          expanded ? "border-b border-border" : hasAny ? "hover:bg-brand-50/40" : "hover:bg-muted/20"
                        )}
                        onClick={() => toggleGroup(grp.id)}
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={cn(
                              "w-3.5 h-3.5 text-muted-foreground transition-transform duration-150",
                              !expanded && "-rotate-90"
                            )}
                          />
                          <span className="text-xs font-semibold text-foreground">{grp.label}</span>
                          <span className="text-[10px] text-muted-foreground">
                            ({grp.features.length} feature{grp.features.length > 1 ? "s" : ""})
                          </span>
                          {hasAny && !expanded && (
                            <span className="text-[9px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-semibold">
                              configured
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => grantGroup(grp)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                          >
                            Grant All
                          </button>
                          <button
                            type="button"
                            onClick={() => revokeGroup(grp)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            Revoke All
                          </button>
                        </div>
                      </div>
                      {expanded && (
                        <div className="space-y-2 p-3 bg-slate-50/30">
                          {grp.features.map((feat) => {
                            const mp = getMob(grp.id, feat.id);
                            const actions = ALL_MOBILE_ACTIONS.filter((action) => feat.actions.includes(action));
                            const rowActive = actions.some((action) => Boolean((mp as any)[action]));
                            return (
                              <div
                                key={feat.id}
                                className={cn(
                                  "rounded-xl border border-border/60 bg-white px-3 py-2.5 transition-colors",
                                  rowActive && "bg-brand-50/20 border-brand-200"
                                )}
                              >
                                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                                  <div className="min-w-0 lg:w-48 lg:flex-shrink-0">
                                    <p className="text-[11px] font-semibold text-foreground">{feat.label}</p>
                                    <p className="text-[9px] text-muted-foreground">Available permissions</p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 lg:pl-4">
                                    {actions.map((action) => {
                                      const checked = Boolean((mp as any)[action]);
                                      return (
                                        <label
                                          key={action}
                                          className={cn(
                                            "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium cursor-pointer transition-colors",
                                            checked
                                              ? "border-brand-300 bg-brand-50 text-brand-700"
                                              : "border-border text-muted-foreground hover:bg-muted/40"
                                          )}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(e) => setMobAction(grp.id, feat.id, action, e.target.checked)}
                                            className="w-3.5 h-3.5 rounded accent-brand-650 cursor-pointer"
                                          />
                                          <span>{MOBILE_ACTION_LABELS[action]}</span>
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
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => onSave(perms)}
          >
            Save Template
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
