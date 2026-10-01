"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Eye,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { HrDateInput } from "../../../components/HrDateInput";
import { formatDateDisplay } from "../../../employees/employee-display";
import {
  HrOrgPageHeader,
  HrOrgField,
  HrFormDrawer,
  HrListingToolbar,
  HrDataGrid,
  HrIconActionButton,
  exportOrgCsv,
  hrInput,
  hrTextarea,
  hrSelect,
  hrBtn,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../../organization/_components";
import {
  applyWelcomePlaceholders,
  createWelcomeAttachmentFromFile,
  formatWelcomeMaterialLabel,
  formatWelcomeHistoryStatus,
  welcomeHistoryStatusClass,
  welcomeHistoryStatusHelp,
  getActiveWelcomeTemplates,
  getSampleWelcomePreviewVars,
  getWelcomeSendOnLabel,
  loadWelcomeSentHistory,
  loadWelcomeSetup,
  loadWelcomeTemplates,
  nextWelcomeTemplateId,
  normalizeWelcomeTemplateName,
  saveWelcomeSetup,
  saveWelcomeTemplates,
  touchWelcomeTemplate,
  withWelcomeTemplateAudit,
  WELCOME_PLACEHOLDERS,
  WELCOME_SEND_ON_OPTIONS,
  type WelcomeAttachmentMeta,
  type WelcomeChannel,
  type WelcomeSendOn,
  type WelcomeSentRecord,
  type WelcomeSetupSettings,
  type WelcomeTemplateRecord,
} from "../../welcome-workflow-data";

type TabId = "templates" | "setup" | "history";

type TemplateForm = {
  id?: number;
  name: string;
  subject: string;
  message: string;
  attachments: WelcomeAttachmentMeta[];
  videoLink: string;
  status: WelcomeTemplateRecord["status"];
};

const EMPTY_FORM: TemplateForm = {
  name: "",
  subject: "",
  message: "",
  attachments: [],
  videoLink: "",
  status: "active",
};

const TEMPLATE_COLS = [
  { id: "name", label: "Template Name" },
  { id: "subject", label: "Subject" },
  { id: "material", label: "Material" },
  { id: "status", label: "Active" },
  { id: "actions", label: "Actions" },
];

const HISTORY_COLS = [
  { id: "employee", label: "Employee" },
  { id: "code", label: "Employee Code" },
  { id: "template", label: "Template" },
  { id: "joining", label: "Joining Date" },
  { id: "sentOn", label: "Sent On" },
  { id: "channel", label: "Channel" },
  { id: "material", label: "Material" },
  { id: "status", label: "Status" },
  { id: "actions", label: "Actions" },
];

function setupEqual(a: WelcomeSetupSettings, b: WelcomeSetupSettings) {
  return (
    a.welcomeEmail === b.welcomeEmail &&
    a.welcomeNotification === b.welcomeNotification &&
    a.sendOn === b.sendOn &&
    a.defaultTemplateId === b.defaultTemplateId
  );
}

function statusLabel(s: WelcomeSentRecord["status"]) {
  return formatWelcomeHistoryStatus(s);
}

function WelcomeStatusChip({ status }: { status: WelcomeSentRecord["status"] }) {
  const label = statusLabel(status);
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
  const date = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
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
    <div className="flex items-start justify-between gap-3 rounded-[12px] border border-border bg-muted/20 px-3 py-2.5">
      <div className="min-w-0">
        <label htmlFor={id} className="text-xs font-medium text-foreground">
          {label}
        </label>
        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{helper}</p>
      </div>
      <div className="h-9 flex items-center shrink-0">
        <Switch id={id} size="sm" checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}

export default function WelcomeWorkflowClient() {
  const [tab, setTab] = useState<TabId>("templates");
  const [toast, setToast] = useState<string | null>(null);

  /* templates */
  const [templates, setTemplates] = useState<WelcomeTemplateRecord[]>([]);
  const [tSearch, setTSearch] = useState("");
  const [tStatus, setTStatus] = useState<HrStatusFilter>("all");
  const [tDensity, setTDensity] = useState<HrDensity>("compact");
  const [tVisible, setTVisible] = useState(TEMPLATE_COLS.map((c) => c.id));
  const [tSelected, setTSelected] = useState<number[]>([]);
  const [tLoading, setTLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<WelcomeTemplateRecord | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* setup */
  const [savedSetup, setSavedSetup] = useState<WelcomeSetupSettings | null>(null);
  const [draftSetup, setDraftSetup] = useState<WelcomeSetupSettings | null>(null);

  /* history */
  const [history, setHistory] = useState<WelcomeSentRecord[]>([]);
  const [hSearch, setHSearch] = useState("");
  const [hTemplate, setHTemplate] = useState("all");
  const [hChannel, setHChannel] = useState<"all" | WelcomeChannel>("all");
  const [hFrom, setHFrom] = useState("");
  const [hTo, setHTo] = useState("");
  const [hDensity, setHDensity] = useState<HrDensity>("compact");
  const [hVisible, setHVisible] = useState(HISTORY_COLS.map((c) => c.id));
  const [hSelected, setHSelected] = useState<number[]>([]);
  const [viewHist, setViewHist] = useState<WelcomeSentRecord | null>(null);

  const refreshTemplates = useCallback(() => {
    setTLoading(true);
    setTemplates(loadWelcomeTemplates());
    setTLoading(false);
  }, []);

  const refreshSetup = useCallback(() => {
    const s = loadWelcomeSetup();
    setSavedSetup(s);
    setDraftSetup({ ...s });
  }, []);

  const refreshHistory = useCallback(() => {
    setHistory(loadWelcomeSentHistory());
  }, []);

  useEffect(() => {
    refreshTemplates();
    refreshSetup();
    refreshHistory();
  }, [refreshTemplates, refreshSetup, refreshHistory]);

  const filteredTemplates = useMemo(() => {
    let list = templates;
    if (tStatus !== "all") list = list.filter((t) => t.status === tStatus);
    const q = tSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q),
      );
    }
    return list;
  }, [templates, tSearch, tStatus]);

  const activeTemplates = useMemo(() => getActiveWelcomeTemplates(templates), [templates]);

  const filteredHistory = useMemo(() => {
    let list = history;
    const q = hSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q),
      );
    }
    if (hTemplate !== "all") {
      list = list.filter((r) => String(r.templateId) === hTemplate);
    }
    if (hChannel !== "all") list = list.filter((r) => r.channel === hChannel);
    if (hFrom) list = list.filter((r) => r.sentOn.slice(0, 10) >= hFrom);
    if (hTo) list = list.filter((r) => r.sentOn.slice(0, 10) <= hTo);
    return list;
  }, [history, hSearch, hTemplate, hChannel, hFrom, hTo]);

  const setupDirty =
    !!savedSetup && !!draftSetup && !setupEqual(savedSetup, draftSetup);
  const canUpdateSetup = setupDirty;

  /* template CRUD */
  const closeSheet = () => {
    setSheetOpen(false);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setSheetOpen(true);
  };

  const openEdit = (r: WelcomeTemplateRecord) => {
    setForm({
      id: r.id,
      name: r.name,
      subject: r.subject,
      message: r.message,
      attachments: r.attachments.map((a) => ({ ...a })),
      videoLink: r.videoLink,
      status: r.status,
    });
    setErrors({});
    setSheetOpen(true);
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Template Name is required";
    else if (
      templates.some(
        (t) =>
          t.id !== form.id &&
          normalizeWelcomeTemplateName(t.name) === normalizeWelcomeTemplateName(form.name),
      )
    ) {
      e.name = "Template name already exists.";
    }
    if (!form.subject.trim()) e.subject = "Email Subject is required";
    if (!form.message.trim()) e.message = "Welcome Message is required";
    if (form.videoLink.trim()) {
      try {
        // eslint-disable-next-line no-new
        new URL(form.videoLink.trim());
      } catch {
        e.videoLink = "Enter a valid URL";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveTemplate = () => {
    if (!validateForm()) return;
    if (form.id) {
      saveWelcomeTemplates(
        templates.map((t) =>
          t.id === form.id
            ? touchWelcomeTemplate({
                ...t,
                name: form.name.trim(),
                subject: form.subject.trim(),
                message: form.message.trim(),
                attachments: form.attachments,
                videoLink: form.videoLink.trim(),
                status: form.status,
              })
            : t,
        ),
      );
    } else {
      saveWelcomeTemplates([
        ...templates,
        withWelcomeTemplateAudit({
          id: nextWelcomeTemplateId(templates),
          name: form.name.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
          attachments: form.attachments,
          videoLink: form.videoLink.trim(),
          status: form.status,
        }),
      ]);
    }
    closeSheet();
    refreshTemplates();
  };

  const toggleTemplateActive = (r: WelcomeTemplateRecord, active: boolean) => {
    if (r.status === (active ? "active" : "inactive")) return;
    saveWelcomeTemplates(
      templates.map((t) =>
        t.id === r.id
          ? touchWelcomeTemplate({ ...t, status: active ? "active" : "inactive" })
          : t,
      ),
    );
    // Clear default if deactivated
    if (!active && draftSetup?.defaultTemplateId === r.id) {
      const next = { ...draftSetup, defaultTemplateId: null };
      setDraftSetup(next);
      saveWelcomeSetup(next);
      setSavedSetup(next);
    }
    setToast(activeStatusToastMessage(r.name, active));
    refreshTemplates();
  };

  const onPickFile = (file: File | undefined) => {
    if (!file) return;
    const result = createWelcomeAttachmentFromFile(file);
    if ("error" in result) {
      setErrors((e) => ({ ...e, attachments: result.error }));
      return;
    }
    setForm((f) => ({ ...f, attachments: [...f.attachments, result] }));
    setErrors((e) => {
      const n = { ...e };
      delete n.attachments;
      return n;
    });
  };

  const templateColumns: HrDataGridColumn<WelcomeTemplateRecord>[] = [
    {
      id: "name",
      label: "Template Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="font-semibold text-foreground">{r.name}</span>,
    },
    {
      id: "subject",
      label: "Subject",
      sortable: true,
      sortValue: (r) => r.subject,
      render: (r) => <span className="text-muted-foreground">{r.subject}</span>,
    },
    {
      id: "material",
      label: "Material",
      sortable: true,
      sortValue: (r) => r.attachments.length + (r.videoLink.trim() ? 1 : 0),
      render: (r) => (
        <span className="text-foreground">
          {formatWelcomeMaterialLabel({
            attachments: r.attachments,
            videoLink: r.videoLink,
          })}
        </span>
      ),
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
          onCheckedChange={(a) => toggleTemplateActive(r, a)}
        />
      ),
    },
    {
      id: "actions",
      label: "",
      className: "w-[5.5rem]",
      render: (r) => (
        <div className="inline-flex items-center gap-0.5">
          <HrIconActionButton label="Preview" onClick={() => setPreview(r)}>
            <Eye />
          </HrIconActionButton>
          <HrIconActionButton label="Edit" onClick={() => openEdit(r)}>
            <Pencil />
          </HrIconActionButton>
        </div>
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
      id: "code",
      label: "Employee Code",
      sortable: true,
      sortValue: (r) => r.employeeCode,
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-brand-700">{r.employeeCode}</span>
      ),
    },
    {
      id: "template",
      label: "Template",
      sortable: true,
      sortValue: (r) => r.templateName,
      render: (r) => r.templateName,
    },
    {
      id: "joining",
      label: "Joining Date",
      sortable: true,
      sortValue: (r) => r.joiningDate,
      render: (r) => formatDateDisplay(r.joiningDate),
    },
    {
      id: "sentOn",
      label: "Sent On",
      sortable: true,
      sortValue: (r) => r.sentOn,
      render: (r) => formatSentOn(r.sentOn),
    },
    {
      id: "channel",
      label: "Channel",
      sortable: true,
      sortValue: (r) => r.channel,
      render: (r) => (r.channel === "email" ? "Email" : "Notification"),
    },
    {
      id: "material",
      label: "Material",
      render: (r) => formatWelcomeMaterialLabel(r),
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

  const previewVars = getSampleWelcomePreviewVars();

  return (
    <HrOrgPageHeader
      title="Welcome Workflow"
      description="Configure welcome templates, delivery setup, and sent history for new employees."
      icon={Sparkles}
      sectionLabel="Employee Onboarding Setup"
      sectionHref="/hr/settings"
      actions={
        tab === "templates" ? (
          <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" /> Add Template
          </Button>
        ) : tab === "setup" ? (
          <Button
            size="sm"
            className={hrBtn("", true)}
            disabled={
              !canUpdateSetup ||
              (!!draftSetup?.defaultTemplateId &&
                !activeTemplates.some((t) => t.id === draftSetup.defaultTemplateId) &&
                !!(draftSetup.welcomeEmail || draftSetup.welcomeNotification))
            }
            onClick={() => {
              if (!draftSetup || !canUpdateSetup) return;
              const channelsOn = draftSetup.welcomeEmail || draftSetup.welcomeNotification;
              if (
                channelsOn &&
                draftSetup.defaultTemplateId != null &&
                !activeTemplates.some((t) => t.id === draftSetup.defaultTemplateId)
              ) {
                setToast(null);
                return;
              }
              saveWelcomeSetup(draftSetup);
              setSavedSetup({ ...draftSetup });
              setToast("Welcome setup updated successfully.");
            }}
          >
            Update
          </Button>
        ) : null
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="space-y-3">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="templates" className="text-xs px-3">
            Templates
          </TabsTrigger>
          <TabsTrigger value="setup" className="text-xs px-3">
            Welcome Setup
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs px-3">
            Sent History
          </TabsTrigger>
        </TabsList>

        {/* ── Templates ── */}
        <TabsContent value="templates" className="mt-0 space-y-3">
          <div className="rounded-lg border border-navy-100 bg-navy-50/50 px-3 py-2.5 text-xs text-navy-800 flex flex-wrap items-start gap-2">
            <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-navy-600" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-navy-900">Central Template Management</p>
              <p className="text-[11px] text-navy-700 mt-0.5 leading-relaxed">
                Reusable Welcome Letter body content is managed under{" "}
                <Link
                  href="/hr/settings/templates?type=welcome_letter"
                  className="font-semibold text-brand-700 hover:underline inline-flex items-center gap-0.5"
                >
                  Template Management
                  <ExternalLink className="w-3 h-3" />
                </Link>
                . This Welcome Workflow keeps delivery channels, attachments, video links,
                setup timing, and sent history — those are not duplicated in Template Management.
              </p>
            </div>
          </div>
          <HrListingToolbar
            search={tSearch}
            onSearchChange={setTSearch}
            searchPlaceholder="Search templates…"
            statusFilter={tStatus}
            onStatusFilterChange={setTStatus}
            density={tDensity}
            onDensityChange={setTDensity}
            columns={TEMPLATE_COLS}
            visibleColumns={tVisible}
            onVisibleColumnsChange={setTVisible}
            selectedCount={tSelected.length}
            onRefresh={refreshTemplates}
            onExport={() =>
              exportOrgCsv(
                "hr-welcome-templates.csv",
                ["Template Name", "Subject", "Material", "Active"],
                filteredTemplates.map((t) => [
                  t.name,
                  t.subject,
                  formatWelcomeMaterialLabel({
                    attachments: t.attachments,
                    videoLink: t.videoLink,
                  }),
                  t.status,
                ]),
              )
            }
          />
          <HrDataGrid
            rows={filteredTemplates}
            columns={templateColumns}
            visibleColumnIds={tVisible}
            density={tDensity}
            loading={tLoading}
            isEmptyStore={templates.length === 0}
            emptyTitle="No welcome templates yet"
            emptyDescription="Create reusable welcome communications for new joiners."
            emptyActionLabel="+ Add Template"
            onEmptyAction={openAdd}
            onClearFilters={() => {
              setTSearch("");
              setTStatus("all");
            }}
            selectedIds={tSelected}
            onSelectedIdsChange={setTSelected}
          />
        </TabsContent>

        {/* ── Setup ── */}
        <TabsContent value="setup" className="mt-0">
          {draftSetup && (
            <div className="max-w-2xl border border-border rounded-[12px] bg-white shadow-sm p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleCard
                  id="ws-email"
                  label="Welcome Email"
                  helper="Send welcome communication to the employee by email."
                  checked={draftSetup.welcomeEmail}
                  onCheckedChange={(v) => setDraftSetup({ ...draftSetup, welcomeEmail: v })}
                />
                <ToggleCard
                  id="ws-notif"
                  label="Welcome Notification"
                  helper="Send a welcome notification to the employee."
                  checked={draftSetup.welcomeNotification}
                  onCheckedChange={(v) =>
                    setDraftSetup({ ...draftSetup, welcomeNotification: v })
                  }
                />
              </div>

              {(() => {
                const channelsOff =
                  !draftSetup.welcomeEmail && !draftSetup.welcomeNotification;
                const defaultInactive =
                  draftSetup.defaultTemplateId != null &&
                  !activeTemplates.some((t) => t.id === draftSetup.defaultTemplateId);
                return (
                  <>
                    <HrOrgField label="Send On" size="sm" id="ws-send-on">
                      <Select
                        value={draftSetup.sendOn}
                        onValueChange={(v) =>
                          setDraftSetup({ ...draftSetup, sendOn: v as WelcomeSendOn })
                        }
                        disabled={channelsOff}
                      >
                        <SelectTrigger
                          id="ws-send-on"
                          className={cn(hrSelect(), channelsOff && "opacity-70")}
                        >
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
                      {channelsOff ? (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Enable Welcome Email or Welcome Notification to configure Send On.
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Intended send timing: {getWelcomeSendOnLabel(draftSetup.sendOn)}.
                        </p>
                      )}
                    </HrOrgField>

                    <HrOrgField label="Default Welcome Template" size="md" id="ws-default">
                      {activeTemplates.length === 0 ? (
                        <p className="text-xs text-amber-700 py-2">
                          No active templates. Create and activate a template first.
                        </p>
                      ) : (
                        <Select
                          value={
                            draftSetup.defaultTemplateId &&
                            activeTemplates.some((t) => t.id === draftSetup.defaultTemplateId)
                              ? String(draftSetup.defaultTemplateId)
                              : undefined
                          }
                          onValueChange={(v) =>
                            setDraftSetup({ ...draftSetup, defaultTemplateId: Number(v) })
                          }
                          disabled={channelsOff}
                        >
                          <SelectTrigger
                            id="ws-default"
                            className={cn(hrSelect(), channelsOff && "opacity-70")}
                          >
                            <SelectValue placeholder="Select default template…" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeTemplates.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {defaultInactive && (
                        <p className="text-xs text-amber-700 mt-1">
                          The previously selected default template is inactive. Select another
                          active template.
                        </p>
                      )}
                    </HrOrgField>
                  </>
                );
              })()}

              <div className="rounded-[10px] border border-border bg-muted/20 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-foreground">Recipient Email Priority</p>
                <ol className="mt-1 text-[11px] text-muted-foreground space-y-0.5 list-decimal list-inside leading-snug">
                  <li>Company Email</li>
                  <li>Personal Email</li>
                </ol>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── History ── */}
        <TabsContent value="history" className="mt-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={hSearch}
              onChange={(e) => setHSearch(e.target.value)}
              placeholder="Search employee…"
              className="h-9 px-2.5 text-xs border border-border rounded-[10px] min-w-[180px] bg-white"
            />
            <Select value={hTemplate} onValueChange={setHTemplate}>
              <SelectTrigger className="h-9 w-[180px] text-xs rounded-[10px]">
                <SelectValue placeholder="Template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All templates</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={hChannel}
              onValueChange={(v) => setHChannel(v as "all" | WelcomeChannel)}
            >
              <SelectTrigger className="h-9 w-[140px] text-xs rounded-[10px]">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="notification">Notification</SelectItem>
              </SelectContent>
            </Select>
            <div className="w-[150px]">
              <HrDateInput
                value={hFrom}
                onChange={setHFrom}
                placeholder="From date"
                aria-label="From date"
              />
            </div>
            <div className="w-[150px]">
              <HrDateInput
                value={hTo}
                onChange={setHTo}
                placeholder="To date"
                aria-label="To date"
              />
            </div>
            <HrIconActionButton label="Refresh" onClick={refreshHistory} className="border-border">
              <RefreshCw />
            </HrIconActionButton>
          </div>

          <HrDataGrid
            rows={filteredHistory}
            columns={historyColumns}
            visibleColumnIds={hVisible}
            density={hDensity}
            loading={false}
            isEmptyStore={history.length === 0}
            emptyTitle="No welcome communications sent yet."
            emptyDescription="Send a welcome communication from Employee Onboarding to create history."
            onClearFilters={() => {
              setHSearch("");
              setHTemplate("all");
              setHChannel("all");
              setHFrom("");
              setHTo("");
            }}
            selectedIds={hSelected}
            onSelectedIdsChange={setHSelected}
          />
        </TabsContent>
      </Tabs>

      {/* Template drawer */}
      <HrFormDrawer
        open={sheetOpen}
        onOpenChange={(o) => {
          if (!o) closeSheet();
          else setSheetOpen(true);
        }}
        title={form.id ? "Edit Template" : "Add Template"}
        description="Reusable welcome communication for new employees."
        onSave={handleSaveTemplate}
        saveLabel={form.id ? "Update" : "Create"}
      >
        <div className="space-y-3">
          <HrOrgField label="Template Name" required error={errors.name} id="wt-name">
            <Input
              id="wt-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={hrInput(undefined, errors.name ? "error" : "default")}
              placeholder="e.g. Standard Employee Welcome"
            />
          </HrOrgField>
          <HrOrgField label="Email Subject" required error={errors.subject} id="wt-subject">
            <Input
              id="wt-subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className={hrInput(undefined, errors.subject ? "error" : "default")}
              placeholder="Welcome to the Team"
            />
          </HrOrgField>
          <HrOrgField label="Welcome Message" required error={errors.message} id="wt-msg">
            <Textarea
              id="wt-msg"
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className={hrTextarea()}
              placeholder="Welcome {{employee_name}}…"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
              Placeholders (stored as plain text): {WELCOME_PLACEHOLDERS.join(" · ")}
            </p>
          </HrOrgField>
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Attachments</p>
            <p className="text-[11px] text-muted-foreground">
              File delivery will be available once document storage is connected.
            </p>
            <div className="space-y-1.5">
              {form.attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-[10px] border border-border bg-white px-2.5 py-2 text-xs"
                >
                  <div className="w-8 h-8 rounded-md bg-muted/60 border border-border flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{a.fileName}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {a.fileType.toUpperCase()}
                      {a.sizeLabel ? ` · ${a.sizeLabel}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50"
                    aria-label="Remove file"
                    onClick={() =>
                      setForm({
                        ...form,
                        attachments: form.attachments.filter((x) => x.id !== a.id),
                      })
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" /> Add File
            </Button>
            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              accept=".pdf,.ppt,.pptx,application/pdf"
              onChange={(e) => {
                onPickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {errors.attachments && (
              <p className="text-xs text-red-600">{errors.attachments}</p>
            )}
          </div>
          <HrOrgField label="Video Link" error={errors.videoLink} id="wt-video">
            <div className="flex gap-2">
              <Input
                id="wt-video"
                value={form.videoLink}
                onChange={(e) => setForm({ ...form, videoLink: e.target.value })}
                className={hrInput(undefined, errors.videoLink ? "error" : "default")}
                placeholder="https://…"
              />
              {form.videoLink.trim() && (
                <a
                  href={form.videoLink}
                  target="_blank"
                  rel="noreferrer"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border text-slate-600 hover:bg-muted"
                  aria-label="Open video link"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </HrOrgField>
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Active / Inactive</p>
            <div className="h-9 flex items-center">
              <HrActiveStatusSwitch
                size="md"
                checked={form.status === "active"}
                onCheckedChange={(a) =>
                  setForm({ ...form, status: a ? "active" : "inactive" })
                }
              />
            </div>
          </div>
        </div>
      </HrFormDrawer>

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-md rounded-[16px] p-4 gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {preview?.name ?? "Preview"}
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              Sample substitution for UI preview only.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-2 text-xs">
              <p>
                <span className="text-muted-foreground">Template: </span>
                <span className="font-semibold">{preview.name}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Subject: </span>
                <span className="font-medium">
                  {applyWelcomePlaceholders(preview.subject, previewVars)}
                </span>
              </p>
              <div>
                <p className="text-muted-foreground mb-1">Welcome Message</p>
                <p className="whitespace-pre-wrap leading-snug">
                  {applyWelcomePlaceholders(preview.message, previewVars)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Attachments</p>
                {preview.attachments.length === 0 ? (
                  <p className="text-muted-foreground">—</p>
                ) : (
                  <ul className="space-y-1">
                    {preview.attachments.map((a) => (
                      <li key={a.id} className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>
                          {a.fileName}
                          <span className="text-muted-foreground">
                            {" "}
                            ({a.fileType.toUpperCase()}
                            {a.sizeLabel ? ` · ${a.sizeLabel}` : ""})
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Video Link</p>
                {preview.videoLink.trim() ? (
                  <a
                    href={preview.videoLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                  >
                    {preview.videoLink} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <p className="text-muted-foreground">—</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History view */}
      <Dialog open={!!viewHist} onOpenChange={(o) => !o && setViewHist(null)}>
        <DialogContent className="max-w-md rounded-[16px] p-4 gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Welcome communication</DialogTitle>
            <DialogDescription className="text-[11px]">
              Snapshot captured at send time.
            </DialogDescription>
          </DialogHeader>
          {viewHist && (
            <div className="space-y-2 text-xs">
              <p>
                <span className="text-muted-foreground">Employee: </span>
                <span className="font-medium">
                  {viewHist.employeeName} ({viewHist.employeeCode})
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Recipient: </span>
                {viewHist.sentToEmail || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Template: </span>
                {viewHist.templateName}
              </p>
              <p>
                <span className="text-muted-foreground">Subject: </span>
                <span className="font-medium">{viewHist.subjectSnapshot}</span>
              </p>
              <div>
                <p className="text-muted-foreground mb-1">Message</p>
                <p className="whitespace-pre-wrap leading-snug">{viewHist.messageSnapshot}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Files</p>
                {viewHist.attachmentsSnapshot.length === 0 ? (
                  <p className="text-muted-foreground">—</p>
                ) : (
                  <ul className="space-y-0.5">
                    {viewHist.attachmentsSnapshot.map((a) => (
                      <li key={a.id} className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        {a.fileName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Video Link</p>
                {viewHist.videoLinkSnapshot.trim() ? (
                  <a
                    href={viewHist.videoLinkSnapshot}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                  >
                    {viewHist.videoLinkSnapshot} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <p className="text-muted-foreground">—</p>
                )}
              </div>
              <p>
                <span className="text-muted-foreground">Sent On: </span>
                {formatSentOn(viewHist.sentOn)}
              </p>
              <p>
                <span className="text-muted-foreground">Channel: </span>
                {viewHist.channel === "email" ? "Email" : "Notification"}
              </p>
              <p className="flex items-center gap-2">
                <span className="text-muted-foreground">Status: </span>
                <WelcomeStatusChip status={viewHist.status} />
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </HrOrgPageHeader>
  );
}
