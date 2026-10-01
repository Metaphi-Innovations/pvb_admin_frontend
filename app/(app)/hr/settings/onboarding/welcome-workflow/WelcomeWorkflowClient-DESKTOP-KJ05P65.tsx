"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, ExternalLink, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HrActiveStatusSwitch,
  activeStatusToastMessage,
} from "../../../components/HrActiveStatusSwitch";
import { HrSuccessToast } from "../../../components/HrSuccessToast";
import { formatDateDisplay } from "../../../employees/employee-display";
import {
  HrOrgPageHeader,
  HrOrgField,
  HrFormDrawer,
  HrListingToolbar,
  HrDataGrid,
  HrIconActionButton,
  HrRowActions,
  exportOrgCsv,
  hrSelect,
  hrBtn,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../../organization/_components";
import {
  applyWelcomePlaceholders,
  formatWelcomeHistoryStatus,
  welcomeHistoryStatusClass,
  welcomeHistoryStatusHelp,
  getWelcomeHrTemplates,
  getWelcomeSendOnLabel,
  loadWelcomeSentHistory,
  loadWelcomeSetup,
  loadWelcomeTypeMappings,
  nextWelcomeMappingId,
  saveWelcomeSetup,
  saveWelcomeTypeMappings,
  welcomeEmployeeTypeOptions,
  WELCOME_SEND_ON_OPTIONS,
  type WelcomeSendOn,
  type WelcomeSentRecord,
  type WelcomeSetupSettings,
  type WelcomeTypeMapping,
} from "../../welcome-workflow-data";
import { getHrTemplateById } from "../../hr-template-data";
import { getEmployeeTypeLabelFromMaster } from "../../organization-data";

type TabId = "mapping" | "setup" | "history";

type MappingForm = {
  id?: number;
  employeeTypeValue: string;
  employeeTypeId: number | null;
  templateId: number | "";
  status: WelcomeTypeMapping["status"];
};

const EMPTY_MAP: MappingForm = {
  employeeTypeValue: "",
  employeeTypeId: null,
  templateId: "",
  status: "active",
};

function setupEqual(a: WelcomeSetupSettings, b: WelcomeSetupSettings) {
  return (
    a.welcomeEmail === b.welcomeEmail &&
    a.welcomeNotification === b.welcomeNotification &&
    a.sendOn === b.sendOn &&
    a.fallbackTemplateId === b.fallbackTemplateId
  );
}

function WelcomeStatusChip({ status }: { status: WelcomeSentRecord["status"] }) {
  const label = formatWelcomeHistoryStatus(status);
  const help = welcomeHistoryStatusHelp(status);
  const chip = (
    <span
      className={cn(
        "inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border",
        welcomeHistoryStatusClass(status),
      )}
    >
      {label}
    </span>
  );
  if (!help) return chip;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-default">{chip}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[11px] max-w-[220px]">
          {help}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function formatSentOn(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${date}, ${time}`;
}

function ToggleCard({
  id,
  label,
  helper,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  helper: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-muted/15 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{helper}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function WelcomeWorkflowClient() {
  const [tab, setTab] = useState<TabId>("mapping");
  const [mappings, setMappings] = useState<WelcomeTypeMapping[]>([]);
  const [history, setHistory] = useState<WelcomeSentRecord[]>([]);
  const [draftSetup, setDraftSetup] = useState<WelcomeSetupSettings | null>(null);
  const [savedSetup, setSavedSetup] = useState<WelcomeSetupSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HrStatusFilter>("all");
  const [density, setDensity] = useState<HrDensity>("compact");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<MappingForm>(EMPTY_MAP);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [viewHist, setViewHist] = useState<WelcomeSentRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [historySelectedIds, setHistorySelectedIds] = useState<number[]>([]);

  const typeOptions = useMemo(() => welcomeEmployeeTypeOptions(), []);
  const hrTemplates = useMemo(() => getWelcomeHrTemplates(), [sheetOpen, draftSetup]);

  const refresh = useCallback(() => {
    setLoading(true);
    setMappings(loadWelcomeTypeMappings());
    setHistory(loadWelcomeSentHistory());
    const setup = loadWelcomeSetup();
    setDraftSetup(setup);
    setSavedSetup(setup);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const canUpdateSetup =
    !!draftSetup && !!savedSetup && !setupEqual(draftSetup, savedSetup);

  const filteredMappings = useMemo(() => {
    let list = mappings;
    if (statusFilter !== "all") list = list.filter((m) => m.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((m) => {
        const typeLabel = getEmployeeTypeLabelFromMaster(m.employeeTypeValue).toLowerCase();
        const tpl = getHrTemplateById(m.templateId)?.name?.toLowerCase() ?? "";
        return typeLabel.includes(q) || tpl.includes(q) || m.employeeTypeValue.includes(q);
      });
    }
    return list;
  }, [mappings, search, statusFilter]);

  const openAdd = () => {
    setForm(EMPTY_MAP);
    setErrors({});
    setSheetOpen(true);
  };

  const openEdit = (m: WelcomeTypeMapping) => {
    setForm({
      id: m.id,
      employeeTypeValue: m.employeeTypeValue,
      employeeTypeId: m.employeeTypeId,
      templateId: m.templateId,
      status: m.status,
    });
    setErrors({});
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setForm(EMPTY_MAP);
    setErrors({});
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.employeeTypeValue) e.employeeTypeValue = "Employee Type is required";
    else if (
      mappings.some(
        (m) =>
          m.id !== form.id &&
          m.employeeTypeValue === form.employeeTypeValue &&
          m.status === "active" &&
          form.status === "active",
      )
    ) {
      e.employeeTypeValue = "An active mapping already exists for this Employee Type.";
    }
    if (!form.templateId) e.templateId = "Welcome Template is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveMapping = () => {
    if (!validate()) return;
    const typeOpt = typeOptions.find((t) => t.value === form.employeeTypeValue);
    const today = new Date().toISOString().slice(0, 10);
    if (form.id) {
      saveWelcomeTypeMappings(
        mappings.map((m) =>
          m.id === form.id
            ? {
                ...m,
                employeeTypeValue: form.employeeTypeValue,
                employeeTypeId: typeOpt?.id ?? form.employeeTypeId,
                templateId: Number(form.templateId),
                status: form.status,
                updatedAt: today,
              }
            : m,
        ),
      );
    } else {
      saveWelcomeTypeMappings([
        ...mappings,
        {
          id: nextWelcomeMappingId(mappings),
          employeeTypeValue: form.employeeTypeValue,
          employeeTypeId: typeOpt?.id ?? null,
          templateId: Number(form.templateId),
          status: form.status,
          createdAt: today,
          updatedAt: today,
        },
      ]);
    }
    closeSheet();
    refresh();
    setToast("Welcome template mapping saved.");
  };

  const toggleMappingActive = (m: WelcomeTypeMapping, active: boolean) => {
    if (m.status === (active ? "active" : "inactive")) return;
    const today = new Date().toISOString().slice(0, 10);
    saveWelcomeTypeMappings(
      mappings.map((row) =>
        row.id === m.id
          ? { ...row, status: active ? "active" : "inactive", updatedAt: today }
          : row,
      ),
    );
    setToast(
      activeStatusToastMessage(getEmployeeTypeLabelFromMaster(m.employeeTypeValue), active),
    );
    refresh();
  };

  const handleDeleteMapping = (m: WelcomeTypeMapping) => {
    saveWelcomeTypeMappings(mappings.filter((row) => row.id !== m.id));
    refresh();
    setToast("Mapping deleted.");
  };

  const mappingColumns: HrDataGridColumn<WelcomeTypeMapping>[] = [
    {
      id: "type",
      label: "Employee Type",
      sortable: true,
      sortValue: (r) => r.employeeTypeValue,
      render: (r) => (
        <span className="font-semibold text-foreground">
          {getEmployeeTypeLabelFromMaster(r.employeeTypeValue)}
        </span>
      ),
    },
    {
      id: "template",
      label: "Welcome Template",
      sortable: true,
      sortValue: (r) => getHrTemplateById(r.templateId)?.name ?? "",
      render: (r) => getHrTemplateById(r.templateId)?.name ?? `Template #${r.templateId}`,
    },
    {
      id: "status",
      label: "Active",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => (
        <HrActiveStatusSwitch
          size="sm"
          checked={r.status === "active"}
          onCheckedChange={(a) => toggleMappingActive(r, a)}
        />
      ),
    },
    {
      id: "actions",
      label: "",
      className: "w-[4.75rem]",
      render: (r) => (
        <HrRowActions
          onEdit={() => openEdit(r)}
          editLabel="Edit Mapping"
          onDelete={() => handleDeleteMapping(r)}
        />
      ),
    },
  ];

  const historyColumns: HrDataGridColumn<WelcomeSentRecord>[] = [
    {
      id: "employee",
      label: "Employee",
      sortable: true,
      sortValue: (r) => r.employeeName,
      render: (r) => <span className="font-semibold">{r.employeeName}</span>,
    },
    {
      id: "type",
      label: "Employee Type",
      sortable: true,
      sortValue: (r) => r.employeeTypeLabel || r.employeeType || "",
      render: (r) => r.employeeTypeLabel || r.employeeType || "—",
    },
    {
      id: "template",
      label: "Template Used",
      sortable: true,
      sortValue: (r) => r.templateName,
      render: (r) => r.templateName,
    },
    {
      id: "channel",
      label: "Channel",
      sortable: true,
      sortValue: (r) => r.channel,
      render: (r) => (r.channel === "email" ? "Email" : "Notification"),
    },
    {
      id: "sentOn",
      label: "Sent On",
      sortable: true,
      sortValue: (r) => r.sentOn,
      render: (r) => formatSentOn(r.sentOn),
    },
    {
      id: "status",
      label: "Status",
      sortable: true,
      sortValue: (r) => formatWelcomeHistoryStatus(r.status),
      render: (r) => <WelcomeStatusChip status={r.status} />,
    },
    {
      id: "actions",
      label: "",
      className: "w-12",
      render: (r) => (
        <HrIconActionButton label="View" onClick={() => setViewHist(r)}>
          <Eye />
        </HrIconActionButton>
      ),
    },
  ];

  const fallbackPreview = draftSetup?.fallbackTemplateId
    ? getHrTemplateById(draftSetup.fallbackTemplateId)
    : null;

  return (
    <HrOrgPageHeader
      title="Welcome Workflow"
      description="Map welcome templates by Employee Type. Templates are managed in Template Management."
      icon={Sparkles}
      sectionLabel="Employee Onboarding Setup"
      sectionHref="/hr/settings"
      actions={
        tab === "mapping" ? (
          <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" /> Add Mapping
          </Button>
        ) : tab === "setup" ? (
          <Button
            size="sm"
            className={hrBtn("", true)}
            disabled={!canUpdateSetup}
            onClick={() => {
              if (!draftSetup || !canUpdateSetup) return;
              saveWelcomeSetup(draftSetup);
              setSavedSetup(draftSetup);
              setToast("Welcome setup updated.");
            }}
          >
            Update Setup
          </Button>
        ) : null
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="space-y-3">
        <TabsList className="h-9">
          <TabsTrigger value="mapping" className="text-xs">
            Template Mapping
          </TabsTrigger>
          <TabsTrigger value="setup" className="text-xs">
            Delivery Setup
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            Sent History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mapping" className="space-y-3 mt-0">
          <div className="rounded-[10px] border border-border bg-muted/15 px-3 py-2.5 text-[11px] text-muted-foreground">
            Welcome templates come from{" "}
            <Link href="/hr/settings/templates?type=welcome_letter" className="text-brand-700 hover:underline font-medium">
              Template Management
            </Link>
            . This screen only maps Employee Types to those templates.
          </div>
          <HrListingToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search mappings…"
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            density={density}
            onDensityChange={setDensity}
            columns={[
              { id: "type", label: "Employee Type" },
              { id: "template", label: "Welcome Template" },
              { id: "status", label: "Active" },
              { id: "actions", label: "Actions" },
            ]}
            visibleColumns={["type", "template", "status", "actions"]}
            onVisibleColumnsChange={() => {}}
            selectedCount={0}
            onRefresh={refresh}
            onExport={() =>
              exportOrgCsv(
                "hr-welcome-type-mappings.csv",
                ["Employee Type", "Template", "Active"],
                filteredMappings.map((m) => [
                  getEmployeeTypeLabelFromMaster(m.employeeTypeValue),
                  getHrTemplateById(m.templateId)?.name ?? String(m.templateId),
                  m.status,
                ]),
              )
            }
          />
          <HrDataGrid
            rows={filteredMappings}
            columns={mappingColumns}
            visibleColumnIds={["type", "template", "status", "actions"]}
            density={density}
            loading={loading}
            isEmptyStore={mappings.length === 0}
            emptyTitle="No welcome template mappings yet"
            emptyDescription="Map each Employee Type to a Template Management welcome letter."
            emptyActionLabel="+ Add Mapping"
            onEmptyAction={openAdd}
            onClearFilters={() => {
              setSearch("");
              setStatusFilter("all");
            }}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
          />
        </TabsContent>

        <TabsContent value="setup" className="space-y-3 mt-0">
          {draftSetup && (
            <div className="max-w-xl space-y-3">
              <ToggleCard
                id="welcome-email"
                label="Welcome Email"
                helper="Send welcome communication by email when enabled."
                checked={draftSetup.welcomeEmail}
                onCheckedChange={(v) => setDraftSetup({ ...draftSetup, welcomeEmail: v })}
              />
              <ToggleCard
                id="welcome-notif"
                label="Welcome Notification"
                helper="Log an in-app HR notification when enabled."
                checked={draftSetup.welcomeNotification}
                onCheckedChange={(v) => setDraftSetup({ ...draftSetup, welcomeNotification: v })}
              />
              <HrOrgField label="Send On" size="md">
                <Select
                  value={draftSetup.sendOn}
                  onValueChange={(v) =>
                    setDraftSetup({ ...draftSetup, sendOn: v as WelcomeSendOn })
                  }
                >
                  <SelectTrigger className={hrSelect()}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WELCOME_SEND_ON_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </HrOrgField>
              <HrOrgField
                label="Fallback Welcome Template"
                size="md"
                helper="Used only when the employee type has no active mapping."
              >
                <Select
                  value={
                    draftSetup.fallbackTemplateId != null
                      ? String(draftSetup.fallbackTemplateId)
                      : "none"
                  }
                  onValueChange={(v) =>
                    setDraftSetup({
                      ...draftSetup,
                      fallbackTemplateId: v === "none" ? null : Number(v),
                    })
                  }
                >
                  <SelectTrigger className={hrSelect()}>
                    <SelectValue placeholder="Select fallback template…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None — block send if unmapped</SelectItem>
                    {hrTemplates.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </HrOrgField>
              {fallbackPreview && (
                <p className="text-[11px] text-muted-foreground">
                  Fallback preview: {fallbackPreview.subject || fallbackPreview.name}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Recipient priority: Company Email → Personal Email. Timing is for display only
                (no scheduler in this prototype).
              </p>
              <Link
                href="/hr/settings/templates?type=welcome_letter"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
              >
                Manage welcome templates <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-0">
          <HrDataGrid
            rows={history}
            columns={historyColumns}
            visibleColumnIds={[
              "employee",
              "type",
              "template",
              "channel",
              "sentOn",
              "status",
              "actions",
            ]}
            density={density}
            loading={loading}
            isEmptyStore={history.length === 0}
            emptyTitle="No welcome communications logged yet"
            emptyDescription="Send Welcome from an Employee Profile to record history."
            selectedIds={historySelectedIds}
            onSelectedIdsChange={setHistorySelectedIds}
          />
        </TabsContent>
      </Tabs>

      <HrFormDrawer
        open={sheetOpen}
        onOpenChange={(o) => {
          if (!o) closeSheet();
          else setSheetOpen(true);
        }}
        title={form.id ? "Edit Mapping" : "Add Mapping"}
        description="Link an Employee Type to a Template Management welcome letter."
        onSave={handleSaveMapping}
        saveLabel={form.id ? "Update" : "Create"}
      >
        <div className="space-y-3">
          <HrOrgField label="Employee Type" required size="md" error={errors.employeeTypeValue}>
            <Select
              value={form.employeeTypeValue || undefined}
              onValueChange={(v) => {
                const opt = typeOptions.find((t) => t.value === v);
                setForm((f) => ({
                  ...f,
                  employeeTypeValue: v,
                  employeeTypeId: opt?.id ?? null,
                }));
              }}
            >
              <SelectTrigger className={hrSelect(undefined, errors.employeeTypeValue ? "error" : "default")}>
                <SelectValue placeholder="Select employee type…" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrOrgField>
          <HrOrgField label="Welcome Template" required size="md" error={errors.templateId}>
            <Select
              value={form.templateId ? String(form.templateId) : undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, templateId: Number(v) }))}
            >
              <SelectTrigger className={hrSelect(undefined, errors.templateId ? "error" : "default")}>
                <SelectValue placeholder="Select template…" />
              </SelectTrigger>
              <SelectContent>
                {hrTemplates.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No active welcome_letter templates
                  </SelectItem>
                ) : (
                  hrTemplates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </HrOrgField>
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Active</p>
            <HrActiveStatusSwitch
              size="md"
              checked={form.status === "active"}
              onCheckedChange={(a) =>
                setForm((f) => ({ ...f, status: a ? "active" : "inactive" }))
              }
            />
          </div>
        </div>
      </HrFormDrawer>

      <Dialog open={!!viewHist} onOpenChange={(o) => !o && setViewHist(null)}>
        <DialogContent className="max-w-md rounded-[16px]">
          <DialogHeader>
            <DialogTitle className="text-sm">Welcome Communication</DialogTitle>
            <DialogDescription className="text-[11px]">
              Snapshot from send time — later mapping changes do not alter this record.
            </DialogDescription>
          </DialogHeader>
          {viewHist && (
            <div className="space-y-2 text-xs">
              <p>
                <span className="text-muted-foreground">Employee: </span>
                {viewHist.employeeName} ({viewHist.employeeCode})
              </p>
              <p>
                <span className="text-muted-foreground">Employee Type: </span>
                {viewHist.employeeTypeLabel || viewHist.employeeType || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Template Used: </span>
                {viewHist.templateName}
              </p>
              <p>
                <span className="text-muted-foreground">Resolution: </span>
                {viewHist.resolutionSource === "mapping"
                  ? "Employee Type Mapping"
                  : viewHist.resolutionSource === "fallback"
                    ? "Fallback"
                    : "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Joining: </span>
                {formatDateDisplay(viewHist.joiningDate)}
              </p>
              <p>
                <span className="text-muted-foreground">Sent On: </span>
                {formatSentOn(viewHist.sentOn)}
              </p>
              <div className="rounded-lg border border-border bg-muted/20 p-2.5 mt-2">
                <p className="font-semibold">{viewHist.subjectSnapshot}</p>
                <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                  {applyWelcomePlaceholders(viewHist.messageSnapshot, {
                    employee_name: viewHist.employeeName,
                    joining_date: formatDateDisplay(viewHist.joiningDate),
                  })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </HrOrgPageHeader>
  );
}
