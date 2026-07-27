"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Monitor,
  Smartphone,
  ChevronDown,
  Check,
  Save,
  AlertCircle,
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
  PERMISSION_REGISTRY,
  MOBILE_PERMISSION_REGISTRY,
  type WebAction,
  type MobileAction,
  type PermModule,
  type MobileGroupDef,
  type PermSubmodule,
  type MobileFeatureDef,
} from "../../../employee/employee-data";
import {
  useCreateTemplate,
  useTemplate,
  useUpdateTemplate,
} from "@/hooks/user-management";
import { getErrorMessage } from "@/lib/masters/master-query-errors";

const ALL_WEB_ACTIONS: WebAction[] = ["view", "create", "edit", "delete", "approve", "export", "import"];
const ALL_MOBILE_ACTIONS: MobileAction[] = ["view", "create", "edit", "delete", "approve"];

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

interface TemplateFormProps {
  mode: "add" | "edit" | "view";
  templateId?: string;
}

export default function TemplateForm({ mode, templateId }: TemplateFormProps) {
  const router = useRouter();
  const isReadOnly = mode === "view";
  const templateQuery = useTemplate(templateId);
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();

  const [templateName, setTemplateName] = useState("");
  const [accessType, setAccessType] = useState<"web" | "mobile">("web");

  const [activeWebPerms, setActiveWebPerms] = useState<Set<string>>(new Set());
  const [activeMobilePerms, setActiveMobilePerms] = useState<Set<string>>(new Set());

  const [openMods, setOpenMods] = useState<Set<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const [pendingAccessType, setPendingAccessType] = useState<"web" | "mobile" | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (PERMISSION_REGISTRY.length > 0) {
      setOpenMods(new Set([PERMISSION_REGISTRY[0].id]));
    }
    if (MOBILE_PERMISSION_REGISTRY.length > 0) {
      setOpenGroups(new Set([MOBILE_PERMISSION_REGISTRY[0].id]));
    }
  }, []);

  useEffect(() => {
    if (mode === "add") return;
    if (!templateQuery.data) return;

    setTemplateName(templateQuery.data.templateName);
    setAccessType(templateQuery.data.accessType);
    setFormError(null);

    const webSet = new Set<string>();
    templateQuery.data.webPermissions.forEach((p) => {
      webSet.add(`${p.moduleKey}.${p.actionKey}`);
    });
    setActiveWebPerms(webSet);

    const mobileSet = new Set<string>();
    templateQuery.data.mobilePermissions.forEach((p) => {
      mobileSet.add(`${p.moduleKey}.${p.actionKey}`);
    });
    setActiveMobilePerms(mobileSet);
  }, [mode, templateQuery.data]);

  const hasSelectedPermissions = (platform: "web" | "mobile") => {
    return platform === "web" ? activeWebPerms.size > 0 : activeMobilePerms.size > 0;
  };

  const handleAccessTypeChange = (target: "web" | "mobile") => {
    if (isReadOnly) return;
    if (accessType === target) return;

    if (hasSelectedPermissions(accessType)) {
      setPendingAccessType(target);
      setShowWarningModal(true);
    } else {
      setAccessType(target);
    }
  };

  const confirmAccessTypeChange = () => {
    if (!pendingAccessType) return;
    if (accessType === "web") {
      setActiveWebPerms(new Set());
    } else {
      setActiveMobilePerms(new Set());
    }
    setAccessType(pendingAccessType);
    setPendingAccessType(null);
    setShowWarningModal(false);
  };

  const toggleMod = (id: string) => {
    setOpenMods((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setOpenGroups((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleWebPerm = (modId: string, subId: string, action: string) => {
    if (isReadOnly) return;
    const key = `${modId}.${subId}.${action}`;
    setActiveWebPerms((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleMobilePerm = (grpId: string, featId: string, action: string) => {
    if (isReadOnly) return;
    const key = `${grpId}.${featId}.${action}`;
    setActiveMobilePerms((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const grantMod = (mod: PermModule) => {
    if (isReadOnly) return;
    setActiveWebPerms((prev) => {
      const next = new Set(prev);
      mod.submodules.forEach((sub: PermSubmodule) => {
        sub.actions.forEach((action: WebAction) => {
          next.add(`${mod.id}.${sub.id}.${action}`);
        });
      });
      return next;
    });
  };

  const revokeMod = (mod: PermModule) => {
    if (isReadOnly) return;
    setActiveWebPerms((prev) => {
      const next = new Set(prev);
      mod.submodules.forEach((sub: PermSubmodule) => {
        sub.actions.forEach((action: WebAction) => {
          next.delete(`${mod.id}.${sub.id}.${action}`);
        });
      });
      return next;
    });
  };

  const grantGroup = (grp: MobileGroupDef) => {
    if (isReadOnly) return;
    setActiveMobilePerms((prev) => {
      const next = new Set(prev);
      grp.features.forEach((feat: MobileFeatureDef) => {
        feat.actions.forEach((action: MobileAction) => {
          next.add(`${grp.id}.${feat.id}.${action}`);
        });
      });
      return next;
    });
  };

  const revokeGroup = (grp: MobileGroupDef) => {
    if (isReadOnly) return;
    setActiveMobilePerms((prev) => {
      const next = new Set(prev);
      grp.features.forEach((feat: MobileFeatureDef) => {
        feat.actions.forEach((action: MobileAction) => {
          next.delete(`${grp.id}.${feat.id}.${action}`);
        });
      });
      return next;
    });
  };

  const modHasAny = (mod: PermModule) => {
    return mod.submodules.some((sub: PermSubmodule) =>
      sub.actions.some((action: WebAction) => activeWebPerms.has(`${mod.id}.${sub.id}.${action}`))
    );
  };

  const groupHasAny = (grp: MobileGroupDef) => {
    return grp.features.some((feat: MobileFeatureDef) =>
      feat.actions.some((action: MobileAction) => activeMobilePerms.has(`${grp.id}.${feat.id}.${action}`))
    );
  };

  const handleSave = () => {
    if (isReadOnly) return;

    if (!templateName.trim()) {
      setNameError("Template Name is required");
      return;
    }
    setNameError("");

    setFormError(null);

    const webPermissions: { moduleKey: string; actionKey: string }[] = [];
    if (accessType === "web") {
      activeWebPerms.forEach((val) => {
        const parts = val.split(".");
        if (parts.length >= 3) {
          webPermissions.push({
            moduleKey: `${parts[0]}.${parts[1]}`,
            actionKey: parts.slice(2).join("."),
          });
        }
      });
    }

    const mobilePermissions: { moduleKey: string; actionKey: string }[] = [];
    if (accessType === "mobile") {
      activeMobilePerms.forEach((val) => {
        const parts = val.split(".");
        if (parts.length >= 3) {
          mobilePermissions.push({
            moduleKey: `${parts[0]}.${parts[1]}`,
            actionKey: parts.slice(2).join("."),
          });
        }
      });
    }

    if (mode === "add") {
      createMutation.mutate(
        {
          name: templateName,
          description: null,
          accessType,
          webPermissions,
          mobilePermissions,
        },
        {
          onSuccess: () => router.push("/user-management/roles?tab=templates"),
          onError: (error) =>
            setFormError(getErrorMessage(error, "Failed to create permission template.")),
        },
      );
      return;
    }

    if (mode === "edit" && templateId) {
      updateMutation.mutate(
        {
          id: templateId,
          payload: {
            name: templateName,
            description: null,
            accessType,
            webPermissions,
            mobilePermissions,
          },
        },
        {
          onSuccess: () => router.push("/user-management/roles?tab=templates"),
          onError: (error) =>
            setFormError(getErrorMessage(error, "Failed to update permission template.")),
        },
      );
    }
  };

  const isLoadingTemplate = mode !== "add" && templateQuery.isLoading;
  const isTemplateMissing = mode !== "add" && (templateQuery.isError || !templateQuery.data);

  return (
    <FormContainer
      title={
        mode === "add"
          ? "Add Permission Template"
          : mode === "edit"
          ? `Edit Template — ${templateName}`
          : `View Template — ${templateName}`
      }
      description="User Management → Roles → Permission Template"
      onBack={() => router.push("/user-management/roles?tab=templates")}
      onCancel={() => router.push("/user-management/roles?tab=templates")}
      cancelLabel={isReadOnly ? "Back" : "Cancel"}
      noCard={true}
      actions={
        !isReadOnly && (
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="w-3.5 h-3.5" /> Save Template
          </Button>
        )
      }
    >
      {isLoadingTemplate ? (
        <div className="px-6 py-10 text-sm text-muted-foreground">Loading template...</div>
      ) : isTemplateMissing ? (
        <div className="px-6 py-10 text-sm text-muted-foreground">Template not found.</div>
      ) : (
      <div className="px-6 pt-1 pb-6 space-y-6">
        {formError ? <p className="text-xs text-red-600">{formError}</p> : null}
        {/* Template Basic Details */}
        <div className="grid grid-cols-3 gap-4 p-5 bg-white border shadow-sm rounded-xl border-border">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Template Name <span className="text-red-500">*</span>
            </Label>
            <Input
              disabled={isReadOnly}
              value={templateName}
              onChange={(e) => {
                setTemplateName(e.target.value);
                if (e.target.value.trim()) setNameError("");
              }}
              placeholder="e.g. Sales Executive Standard"
              className={cn("h-9 text-sm rounded-lg", nameError && "border-red-400")}
            />
            {nameError && (
              <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {nameError}
              </p>
            )}
          </div>

        </div>

        {/* Tab Selection */}
        <div className="flex gap-1.5 pb-2 border-b border-border">
          {(
            [
              ["web", "Web Portal"],
              ["mobile", "Mobile App"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              disabled={isReadOnly && accessType !== key}
              onClick={() => handleAccessTypeChange(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium transition-colors border",
                accessType === key
                  ? "bg-brand-600 text-white border-brand-600"
                  : "border-border text-muted-foreground hover:bg-muted/40",
                isReadOnly && accessType !== key && "opacity-40 cursor-not-allowed"
              )}
            >
              {key === "web" ? (
                <Monitor className="w-3.5 h-3.5" />
              ) : (
                <Smartphone className="w-3.5 h-3.5" />
              )}
              {label} Permissions
            </button>
          ))}
        </div>

        {/* Permission Accordion */}
        <div className="space-y-3">
          {accessType === "web" && (
            <div className="space-y-2">
              {PERMISSION_REGISTRY.map((mod: PermModule) => {
                const expanded = openMods.has(mod.id);
                const hasAny = modHasAny(mod);
                return (
                  <div
                    key={mod.id}
                    className="overflow-hidden bg-white border shadow-sm border-border rounded-xl"
                  >
                    <div
                      className={cn(
                        "flex items-center justify-between px-4 py-3.5 cursor-pointer transition-colors select-none",
                        expanded
                          ? "border-b border-border bg-muted/5"
                          : hasAny
                          ? "hover:bg-brand-50/40"
                          : "hover:bg-muted/20"
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
                        <span className="text-xs font-semibold text-foreground">
                          {mod.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({mod.submodules.length} submodule
                          {mod.submodules.length > 1 ? "s" : ""})
                        </span>
                        {hasAny && !expanded && (
                          <span className="text-[9px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-semibold">
                            configured
                          </span>
                        )}
                      </div>
                      {!isReadOnly && (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => grantMod(mod)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-660 hover:bg-brand-100 transition-colors"
                          >
                            Grant All
                          </button>
                          <button
                            type="button"
                            onClick={() => revokeMod(mod)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-105 transition-colors"
                          >
                            Revoke All
                          </button>
                        </div>
                      )}
                    </div>
                    {expanded && (
                      <div className="space-y-2.5 p-4 bg-slate-50/30">
                        {mod.submodules.map((sub: PermSubmodule) => {
                          const actions = ALL_WEB_ACTIONS.filter((action) =>
                            sub.actions.includes(action)
                          );
                          const rowActive = actions.some((action) =>
                            activeWebPerms.has(`${mod.id}.${sub.id}.${action}`)
                          );
                          return (
                            <div
                              key={sub.id}
                              className={cn(
                                "rounded-xl border border-border bg-white px-4 py-3 transition-colors",
                                rowActive && "bg-brand-50/10 border-brand-100"
                              )}
                            >
                              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                                <div className="min-w-0 lg:w-56 lg:flex-shrink-0">
                                  <p className="text-[11px] font-semibold text-foreground">
                                    {sub.label}
                                  </p>
                                  <p className="text-[9px] text-muted-foreground mt-0.5">
                                    Available permissions
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 lg:pl-4">
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
                                          isReadOnly && "pointer-events-none"
                                        )}
                                      >
                                        <input
                                          disabled={isReadOnly}
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() =>
                                            toggleWebPerm(mod.id, sub.id, action)
                                          }
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

          {accessType === "mobile" && (
            <div className="space-y-2">
              {MOBILE_PERMISSION_REGISTRY.map((grp: MobileGroupDef) => {
                const expanded = openGroups.has(grp.id);
                const hasAny = groupHasAny(grp);
                return (
                  <div
                    key={grp.id}
                    className="overflow-hidden bg-white border shadow-sm border-border rounded-xl"
                  >
                    <div
                      className={cn(
                        "flex items-center justify-between px-4 py-3.5 cursor-pointer transition-colors select-none",
                        expanded
                          ? "border-b border-border bg-muted/5"
                          : hasAny
                          ? "hover:bg-brand-50/40"
                          : "hover:bg-muted/20"
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
                        <span className="text-xs font-semibold text-foreground">
                          {grp.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({grp.features.length} feature
                          {grp.features.length > 1 ? "s" : ""})
                        </span>
                        {hasAny && !expanded && (
                          <span className="text-[9px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-semibold">
                            configured
                          </span>
                        )}
                      </div>
                      {!isReadOnly && (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => grantGroup(grp)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-660 hover:bg-brand-100 transition-colors"
                          >
                            Grant All
                          </button>
                          <button
                            type="button"
                            onClick={() => revokeGroup(grp)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-105 transition-colors"
                          >
                            Revoke All
                          </button>
                        </div>
                      )}
                    </div>
                    {expanded && (
                      <div className="space-y-2.5 p-4 bg-slate-50/30">
                        {grp.features.map((feat: MobileFeatureDef) => {
                          const actions = ALL_MOBILE_ACTIONS.filter((action) =>
                            feat.actions.includes(action)
                          );
                          const rowActive = actions.some((action) =>
                            activeMobilePerms.has(`${grp.id}.${feat.id}.${action}`)
                          );
                          return (
                            <div
                              key={feat.id}
                              className={cn(
                                "rounded-xl border border-border bg-white px-4 py-3 transition-colors",
                                rowActive && "bg-brand-50/10 border-brand-100"
                              )}
                            >
                              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                                <div className="min-w-0 lg:w-56 lg:flex-shrink-0">
                                  <p className="text-[11px] font-semibold text-foreground">
                                    {feat.label}
                                  </p>
                                  <p className="text-[9px] text-muted-foreground mt-0.5">
                                    Available permissions
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 lg:pl-4">
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
                                          isReadOnly && "pointer-events-none"
                                        )}
                                      >
                                        <input
                                          disabled={isReadOnly}
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() =>
                                            toggleMobilePerm(grp.id, feat.id, action)
                                          }
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
      </div>
      )}

      {/* Warning Dialog for Access Type switch */}
      <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="flex items-center justify-center w-8 h-8 border border-red-200 rounded-lg bg-red-50">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              Switch Platform Type?
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs">
              Changing the platform type will clear all currently selected permissions for{" "}
              {accessType === "web" ? "Web Portal" : "Mobile App"}. Do you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setPendingAccessType(null);
                setShowWarningModal(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs text-white bg-red-600 hover:bg-red-700"
              onClick={confirmAccessTypeChange}
            >
              Proceed &amp; Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormContainer>
  );
}
