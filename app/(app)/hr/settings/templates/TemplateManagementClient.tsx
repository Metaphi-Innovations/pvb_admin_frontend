"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  HrActiveStatusSwitch,
  activeStatusToastMessage,
} from "../../components/HrActiveStatusSwitch";
import { HrSuccessToast } from "../../components/HrSuccessToast";
import {
  HrOrgPageHeader,
  HrOrgField,
  HrFormDrawer,
  HrConfirmDialog,
  HrSettingsDeleteDialog,
  type HrSettingsDeleteTarget,
  HrListingToolbar,
  HrDataGrid,
  exportOrgCsv,
  hrInput,
  hrBtn,
  HrStatusToggle,
  HrIconActionButton,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../organization/_components";
import {
  HR_TEMPLATE_TYPE_OPTIONS,
  applyDefaultExclusive,
  buildSampleTemplateContext,
  buildSampleBlockRenderData,
  countGeneratedDocsForTemplate,
  createGeneratedHrDocument,
  findUnknownPlaceholders,
  getDefaultTemplateByType,
  groupLabel,
  isBlankTemplateHtml,
  isHrTemplateNameTaken,
  loadHrTemplates,
  nextHrTemplateId,
  placeholderToken,
  placeholdersForType,
  renderHrTemplate,
  saveHrTemplates,
  stripHtmlToText,
  templateTypeLabel,
  withHrTemplateNewAudit,
  withHrTemplateUpdateAudit,
  type HrTemplateRecord,
  type HrTemplateTypeKey,
  type PlaceholderGroupKey,
} from "../hr-template-data";
import {
  HR_TEMPLATE_BLOCK_REGISTRY,
  blockCompatibilityWarning,
  buildBlockChipHtml,
  createBlockInstance,
  syncBlocksWithHtml,
  type HrBlockSettings,
  type HrTemplateBlockInstance,
  type HrTemplateBlockType,
} from "../hr-template-blocks";
import { TemplateRichEditor, insertHtmlIntoEditor } from "./TemplateRichEditor";
import { TemplateBlockConfigDialog } from "./TemplateBlockConfigDialog";

type FormState = {
  id?: number;
  name: string;
  templateType: HrTemplateTypeKey;
  customTypeName: string;
  subject: string;
  header: string;
  body: string;
  footer: string;
  blocks: HrTemplateBlockInstance[];
  useCompanyLogo: boolean;
  showCompanyAddress: boolean;
  showCompanyContact: boolean;
  isDefault: boolean;
  status: HrTemplateRecord["status"];
};

const EMPTY: FormState = {
  name: "",
  templateType: "offer_letter",
  customTypeName: "",
  subject: "",
  header: "",
  body: "",
  footer: "",
  blocks: [],
  useCompanyLogo: true,
  showCompanyAddress: false,
  showCompanyContact: false,
  isDefault: false,
  status: "active",
};

const COLUMN_DEFS = [
  { id: "name", label: "Template Name" },
  { id: "type", label: "Template Type" },
  { id: "default", label: "Default" },
  { id: "status", label: "Active" },
  { id: "updated", label: "Last Updated" },
  { id: "actions", label: "Actions" },
];

type FocusField = "subject" | "header" | "body" | "footer";

function recordToForm(r: HrTemplateRecord): FormState {
  return {
    id: r.id,
    name: r.name,
    templateType: r.templateType,
    customTypeName: r.customTypeName,
    subject: r.subject,
    header: r.header,
    body: r.body,
    footer: r.footer,
    blocks: r.blocks ?? [],
    useCompanyLogo: r.useCompanyLogo,
    showCompanyAddress: r.showCompanyAddress,
    showCompanyContact: r.showCompanyContact,
    isDefault: r.isDefault,
    status: r.status,
  };
}

function DocumentPreview({
  open,
  onClose,
  template,
  onEdit,
  onSaveSnapshot,
}: {
  open: boolean;
  onClose: () => void;
  template: HrTemplateRecord | null;
  onEdit?: () => void;
  onSaveSnapshot?: () => void;
}) {
  const rendered = useMemo(
    () =>
      template
        ? renderHrTemplate(template, buildSampleTemplateContext(), buildSampleBlockRenderData())
        : null,
    [template],
  );
  if (!template || !rendered) return null;

  const documentTitle = (rendered.subject || "").trim();
  const headerText = stripHtmlToText(rendered.header);
  const typeLabel = templateTypeLabel(template.templateType, template.customTypeName);
  // Header is optional letterhead only — never echo Document Title or Template Type name
  const showHeader =
    !isBlankTemplateHtml(rendered.header) &&
    headerText.toLowerCase() !== documentTitle.toLowerCase() &&
    headerText.toLowerCase() !== typeLabel.toLowerCase();
  const showFooter = !isBlankTemplateHtml(rendered.footer);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-[640px] flex flex-col p-0 gap-0">
        <SheetHeader>
          <SheetTitle>Preview — {template.name}</SheetTitle>
          <SheetDescription>
            Sample preview (Priya Verma) · does not change the template
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {rendered.unknownPlaceholders.length > 0 ? (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Unknown field
              {rendered.unknownPlaceholders.length > 1 ? "s" : ""}:{" "}
              {rendered.unknownPlaceholders.map((k) => `{{${k}}}`).join(", ")}
              <span className="block text-[11px] mt-1 text-amber-700/90">
                Shown as — in the document. Use Fields panel for supported names.
              </span>
            </div>
          ) : null}
          {rendered.blockWarnings?.length > 0 ? (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-1">
              {rendered.blockWarnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          ) : null}
          <div className="mx-auto max-w-[520px] min-h-[640px] bg-white border border-border shadow-sm rounded-sm p-6 text-[12px] leading-relaxed text-foreground">
            {(rendered.useCompanyLogo ||
              rendered.showCompanyAddress ||
              rendered.showCompanyContact) && (
              <div className="mb-4 pb-3 border-b border-border text-center space-y-1">
                {rendered.useCompanyLogo && rendered.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={rendered.logoUrl}
                    alt="Logo"
                    className="h-10 mx-auto object-contain"
                  />
                ) : rendered.useCompanyLogo ? (
                  <p className="text-sm font-bold text-navy-700">{rendered.companyName}</p>
                ) : null}
                {rendered.showCompanyAddress ? (
                  <p className="text-[11px] text-muted-foreground">{rendered.companyAddress}</p>
                ) : null}
                {rendered.showCompanyContact ? (
                  <p className="text-[11px] text-muted-foreground">{rendered.companyContact}</p>
                ) : null}
              </div>
            )}

            {/* Document Title once — from Subject / Document Title field only */}
            {documentTitle ? (
              <h2 className="mb-3 text-sm font-bold text-navy-700 tracking-wide uppercase text-center">
                {documentTitle}
              </h2>
            ) : null}

            {showHeader ? (
              <div
                className="mb-3 text-[12px]"
                dangerouslySetInnerHTML={{ __html: rendered.header }}
              />
            ) : null}

            <div dangerouslySetInnerHTML={{ __html: rendered.body || "<p>—</p>" }} />

            {showFooter ? (
              <div
                className="mt-6 pt-3 border-t border-border text-[11px] text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: rendered.footer }}
              />
            ) : null}
          </div>
        </SheetBody>
        <SheetFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" className={hrBtn()} onClick={onClose}>
            Close
          </Button>
          {onSaveSnapshot ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={hrBtn()}
              onClick={onSaveSnapshot}
            >
              Save Snapshot
            </Button>
          ) : null}
          {onEdit ? (
            <Button type="button" size="sm" className={hrBtn("", true)} onClick={onEdit}>
              Edit
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function TemplateManagementClient() {
  const [records, setRecords] = useState<HrTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HrStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [density, setDensity] = useState<HrDensity>("compact");
  const [visibleColumns, setVisibleColumns] = useState(COLUMN_DEFS.map((c) => c.id));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<HrTemplateRecord | null>(null);
  const [previewRecord, setPreviewRecord] = useState<HrTemplateRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusField, setFocusField] = useState<FocusField>("body");
  const [confirm, setConfirm] = useState<{
    type: "deactivate" | "make_default";
    record: HrTemplateRecord;
    currentDefaultName?: string;
  } | null>(null);
  const [pendingDefaultForm, setPendingDefaultForm] = useState(false);
  const [configBlockId, setConfigBlockId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    ({ record: HrTemplateRecord } & HrSettingsDeleteTarget) | null
  >(null);
  const [toast, setToast] = useState<string | null>(null);

  const subjectRef = useRef<HTMLInputElement>(null);
  const headerEditorHost = useRef<HTMLDivElement>(null);
  const bodyEditorHost = useRef<HTMLDivElement>(null);
  const footerEditorHost = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setRecords(loadHrTemplates());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    try {
      const t = new URLSearchParams(window.location.search).get("type");
      if (t) setTypeFilter(t);
    } catch {
      /* ignore */
    }
  }, [refresh]);

  useEffect(() => {
    const onUpd = () => refresh();
    window.addEventListener("hr-templates-updated", onUpd);
    return () => window.removeEventListener("hr-templates-updated", onUpd);
  }, [refresh]);

  const filtered = useMemo(() => {
    let list = records;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (typeFilter !== "all") list = list.filter((r) => r.templateType === typeFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        templateTypeLabel(r.templateType, r.customTypeName).toLowerCase().includes(q),
    );
  }, [records, search, statusFilter, typeFilter]);

  const unknownInForm = useMemo(
    () => findUnknownPlaceholders(form.subject, form.header, form.body, form.footer),
    [form],
  );

  const fieldGroups = useMemo(() => {
    const list = placeholdersForType(form.templateType);
    const map = new Map<PlaceholderGroupKey, typeof list>();
    for (const p of list) {
      const arr = map.get(p.group) ?? [];
      arr.push(p);
      map.set(p.group, arr);
    }
    return Array.from(map.entries());
  }, [form.templateType]);

  const closeSheet = () => {
    setSheetOpen(false);
    setForm(EMPTY);
    setErrors({});
    setPendingDefaultForm(false);
  };

  const openAdd = () => {
    const t = (typeFilter !== "all" ? typeFilter : "offer_letter") as HrTemplateTypeKey;
    setForm({
      ...EMPTY,
      templateType: HR_TEMPLATE_TYPE_OPTIONS.some((o) => o.value === t) ? t : "offer_letter",
      isDefault: !getDefaultTemplateByType(
        HR_TEMPLATE_TYPE_OPTIONS.some((o) => o.value === t) ? t : "offer_letter",
        records,
      ),
    });
    setErrors({});
    setSheetOpen(true);
  };

  const openEdit = (r: HrTemplateRecord) => {
    setViewRecord(null);
    setPreviewRecord(null);
    setForm(recordToForm(r));
    setErrors({});
    setSheetOpen(true);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const n = { ...e };
      delete n[key as string];
      return n;
    });
  };

  const insertAtSubject = (token: string) => {
    const el = subjectRef.current;
    if (!el) {
      set("subject", (form.subject || "") + token);
      return;
    }
    const start = el.selectionStart ?? form.subject.length;
    const end = el.selectionEnd ?? start;
    const next = form.subject.slice(0, start) + token + form.subject.slice(end);
    set("subject", next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const insertPlaceholder = (key: string) => {
    const token = placeholderToken(key);
    if (focusField === "subject") {
      insertAtSubject(token);
      return;
    }
    const host =
      focusField === "header"
        ? headerEditorHost.current
        : focusField === "footer"
          ? footerEditorHost.current
          : bodyEditorHost.current;
    const editable = host?.querySelector("[contenteditable]") as HTMLElement | null;
    if (editable) {
      editable.dispatchEvent(
        new CustomEvent("hr-insert-placeholder", { detail: token }),
      );
    } else {
      set(focusField, (form[focusField] || "") + token);
    }
  };

  const insertDynamicBlock = (blockType: HrTemplateBlockType) => {
    const warn = blockCompatibilityWarning(blockType, form.templateType);
    if (warn) setToast(warn);
    const instance = createBlockInstance(blockType);
    const chip = buildBlockChipHtml(instance);
    setForm((f) => ({ ...f, blocks: [...(f.blocks || []), instance] }));
    if (focusField === "subject") {
      insertAtSubject(`{{${blockType}}}`);
      setConfigBlockId(instance.id);
      return;
    }
    const host =
      focusField === "header"
        ? headerEditorHost.current
        : focusField === "footer"
          ? footerEditorHost.current
          : bodyEditorHost.current;
    const editable = host?.querySelector("[contenteditable]") as HTMLElement | null;
    if (editable) {
      insertHtmlIntoEditor(editable, chip);
    } else {
      set(focusField, (form[focusField] || "") + chip);
    }
    setConfigBlockId(instance.id);
  };

  const configBlock = useMemo(
    () => form.blocks?.find((b) => b.id === configBlockId) ?? null,
    [form.blocks, configBlockId],
  );

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Template Name is required";
    else if (isHrTemplateNameTaken(form.name, form.id ?? null, records)) {
      e.name = "A template with this name already exists";
    }
    if (!form.templateType) e.templateType = "Template Type is required";
    if (form.templateType === "custom" && !form.customTypeName.trim()) {
      e.customTypeName = "Custom Type Name is required";
    }
    const bodyText = form.body.replace(/<[^>]+>/g, "").trim();
    if (!bodyText) e.body = "Body is required";
    if (form.isDefault && form.status !== "active") {
      e.status = "Default template must be Active";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = (): Omit<
    HrTemplateRecord,
    "id" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt" | "usageCount"
  > & { usageCount?: number } => {
    const blocks = syncBlocksWithHtml(
      form.blocks,
      form.header,
      form.body,
      form.footer,
    );
    return {
      name: form.name.trim(),
      templateType: form.templateType,
      customTypeName: form.templateType === "custom" ? form.customTypeName.trim() : "",
      subject: form.subject,
      header: form.header,
      body: form.body,
      footer: form.footer,
      blocks,
      useCompanyLogo: form.useCompanyLogo,
      showCompanyAddress: form.showCompanyAddress,
      showCompanyContact: form.showCompanyContact,
      isDefault: form.isDefault,
      status: form.status,
    };
  };

  const commitSave = (forceDefault = false) => {
    const payload = { ...buildPayload(), isDefault: forceDefault || form.isDefault };
    let next = [...records];

    if (form.id) {
      const prev = records.find((r) => r.id === form.id);
      next = next.map((r) =>
        r.id === form.id
          ? withHrTemplateUpdateAudit({
              ...r,
              ...payload,
              id: r.id,
              usageCount: prev?.usageCount ?? 0,
            })
          : r,
      );
      setToast("Template updated.");
    } else {
      next = [
        ...next,
        withHrTemplateNewAudit({
          ...payload,
          id: nextHrTemplateId(records),
          usageCount: 0,
        }),
      ];
      setToast("Template created.");
    }

    if (payload.isDefault && payload.status === "active") {
      const id = form.id ?? next[next.length - 1]!.id;
      next = applyDefaultExclusive(
        next,
        id,
        payload.templateType,
        payload.customTypeName,
      );
    }

    saveHrTemplates(next);
    closeSheet();
    refresh();
  };

  const handleSave = () => {
    if (!validate()) return;
    const payload = buildPayload();
    if (payload.isDefault && payload.status === "active") {
      const current = getDefaultTemplateByType(payload.templateType, records);
      if (current && current.id !== form.id) {
        setPendingDefaultForm(true);
        setConfirm({
          type: "make_default",
          record: current,
          currentDefaultName: current.name,
        });
        return;
      }
    }
    commitSave();
  };

  const applyStatus = (record: HrTemplateRecord, nextActive: boolean) => {
    if (!nextActive && record.isDefault) {
      setToast("Default template cannot be deactivated. Set another default first.");
      return;
    }
    saveHrTemplates(
      records.map((r) =>
        r.id === record.id
          ? withHrTemplateUpdateAudit({
              ...r,
              status: nextActive ? "active" : "inactive",
              isDefault: nextActive ? r.isDefault : false,
            })
          : r,
      ),
    );
    setToast(activeStatusToastMessage(record.name, nextActive));
    refresh();
  };

  const requestDelete = (record: HrTemplateRecord) => {
    const usage = Math.max(record.usageCount, countGeneratedDocsForTemplate(record.id));
    setDeleteTarget({
      record,
      entityLabel: "Template",
      usageCount: usage,
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (
      deleteTarget.record.usageCount > 0 ||
      countGeneratedDocsForTemplate(deleteTarget.record.id) > 0
    ) {
      setToast("Template has been used. Make Inactive instead of deleting.");
      setDeleteTarget(null);
      return;
    }
    saveHrTemplates(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast("Template deleted.");
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<HrTemplateRecord>[] = [
    {
      id: "name",
      label: "Template Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <button
          type="button"
          className="font-semibold text-foreground hover:text-brand-700 text-left"
          onClick={() => setViewRecord(r)}
        >
          {r.name}
        </button>
      ),
    },
    {
      id: "type",
      label: "Template Type",
      sortable: true,
      sortValue: (r) => templateTypeLabel(r.templateType, r.customTypeName),
      render: (r) => (
        <span className="text-muted-foreground">
          {templateTypeLabel(r.templateType, r.customTypeName)}
        </span>
      ),
    },
    {
      id: "default",
      label: "Default",
      sortable: true,
      sortValue: (r) => (r.isDefault ? 1 : 0),
      render: (r) =>
        r.isDefault ? (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
            Default
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "status",
      label: "Active",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => (
        <HrActiveStatusSwitch
          checked={r.status === "active"}
          onCheckedChange={(active: boolean) => {
            if (!active) {
              if (r.isDefault) {
                setToast("Default template cannot be deactivated. Set another default first.");
                return;
              }
              setConfirm({ type: "deactivate", record: r });
              return;
            }
            applyStatus(r, true);
          }}
        />
      ),
    },
    {
      id: "updated",
      label: "Last Updated",
      sortable: true,
      sortValue: (r) => r.updatedAt,
      render: (r) => (
        <span className="text-muted-foreground">
          {r.updatedAt}
          <span className="block text-[10px]">{r.updatedBy}</span>
        </span>
      ),
    },
    {
      id: "actions",
      label: "",
      className: "w-[7.5rem]",
      render: (r) => (
        <div className="flex items-center justify-end gap-0.5">
          <HrIconActionButton label="Preview" onClick={() => setPreviewRecord(r)}>
            <Eye className="w-3.5 h-3.5" />
          </HrIconActionButton>
          <HrIconActionButton label="Edit" onClick={() => openEdit(r)}>
            <Pencil className="w-3.5 h-3.5" />
          </HrIconActionButton>
          <HrIconActionButton label="Delete" onClick={() => requestDelete(r)}>
            <Trash2 className="w-3.5 h-3.5" />
          </HrIconActionButton>
        </div>
      ),
    },
  ];

  return (
    <HrOrgPageHeader
      title="Template Management"
      description="Create and manage reusable HR document and communication templates."
      icon={FileText}
      sectionLabel="HR Letter Settings"
      sectionHref="/hr/settings"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Template
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className={cn(hrInput(), "h-8 w-48 text-xs")}>
              <SelectValue placeholder="Template Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Types
              </SelectItem>
              {HR_TEMPLATE_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search templates…"
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          density={density}
          onDensityChange={setDensity}
          columns={COLUMN_DEFS}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          selectedCount={selectedIds.length}
          onRefresh={refresh}
          onExport={() =>
            exportOrgCsv(
              "hr-templates.csv",
              ["Name", "Type", "Default", "Status", "Updated", "Updated By"],
              filtered.map((r) => [
                r.name,
                templateTypeLabel(r.templateType, r.customTypeName),
                r.isDefault ? "Yes" : "No",
                r.status,
                r.updatedAt,
                r.updatedBy,
              ]),
            )
          }
        />

        <HrDataGrid
          rows={filtered}
          columns={columns}
          visibleColumnIds={visibleColumns}
          density={density}
          loading={loading}
          isEmptyStore={records.length === 0}
          emptyTitle="No templates yet"
          emptyDescription="Add reusable HR document templates (Payslip, Offer Letter, and more)."
          emptyActionLabel="+ Add Template"
          onEmptyAction={openAdd}
          onClearFilters={() => {
            setSearch("");
            setStatusFilter("all");
            setTypeFilter("all");
          }}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
        />
      </div>

      <HrFormDrawer
        open={sheetOpen}
        onOpenChange={(o) => !o && closeSheet()}
        title={form.id ? "Edit Template" : "Add Template"}
        description="Dynamic placeholders insert into subject, header, body, or footer."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
        contentClassName="max-w-full sm:max-w-[calc(100vw-1.5rem)] md:max-w-[800px]"
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 pb-1">
          <div className="space-y-3.5 min-w-0">
            <HrOrgField label="Template Name" required size="full" error={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={hrInput(undefined, errors.name ? "error" : "default")}
                placeholder="Standard Offer Letter"
              />
            </HrOrgField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <HrOrgField label="Template Type" required size="full">
                <Select
                  value={form.templateType}
                  onValueChange={(v) => set("templateType", v as HrTemplateTypeKey)}
                >
                  <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HR_TEMPLATE_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </HrOrgField>
              {form.templateType === "custom" ? (
                <HrOrgField
                  label="Custom Type Name"
                  required
                  size="full"
                  error={errors.customTypeName}
                >
                  <Input
                    value={form.customTypeName}
                    onChange={(e) => set("customTypeName", e.target.value)}
                    className={hrInput(
                      undefined,
                      errors.customTypeName ? "error" : "default",
                    )}
                    placeholder="Probation Extension Letter"
                  />
                </HrOrgField>
              ) : (
                <div />
              )}
            </div>

            <HrOrgField
              label="Document Title"
              size="full"
              helper="Shown once as the document heading. Template Type is metadata only and is not printed."
            >
              <Input
                ref={subjectRef}
                value={form.subject}
                onFocus={() => setFocusField("subject")}
                onChange={(e) => set("subject", e.target.value)}
                className={hrInput()}
                placeholder="APPOINTMENT LETTER"
              />
            </HrOrgField>

            <div onFocusCapture={() => setFocusField("header")} ref={headerEditorHost}>
              <HrOrgField label="Header" size="full">
                <TemplateRichEditor
                  value={form.header}
                  onChange={(v) => set("header", v)}
                  onBlockChipClick={(id) => setConfigBlockId(id)}
                  placeholder="Optional header…"
                  minHeightClass="min-h-[64px]"
                />
              </HrOrgField>
            </div>

            <div onFocusCapture={() => setFocusField("body")} ref={bodyEditorHost}>
              <HrOrgField label="Body" required size="full" error={errors.body}>
                <TemplateRichEditor
                  value={form.body}
                  onChange={(v) => set("body", v)}
                  onBlockChipClick={(id) => setConfigBlockId(id)}
                  placeholder="Dear {{employee_name}},…"
                  minHeightClass="min-h-[180px]"
                />
              </HrOrgField>
            </div>

            <div onFocusCapture={() => setFocusField("footer")} ref={footerEditorHost}>
              <HrOrgField label="Footer" size="full">
                <TemplateRichEditor
                  value={form.footer}
                  onChange={(v) => set("footer", v)}
                  onBlockChipClick={(id) => setConfigBlockId(id)}
                  placeholder="Optional footer…"
                  minHeightClass="min-h-[56px]"
                />
              </HrOrgField>
            </div>

            {unknownInForm.length > 0 ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                Unknown field{unknownInForm.length > 1 ? "s" : ""}:{" "}
                {unknownInForm.map((k) => `{{${k}}}`).join(", ")}
              </p>
            ) : null}

            <HrStatusToggle
              checked={form.useCompanyLogo}
              onCheckedChange={(v) => set("useCompanyLogo", v)}
              label="Use Company Logo"
              activeLabel="ON"
              inactiveLabel="OFF"
              size="sm"
              helper="Uses Company Profile logo when available."
            />
            <HrStatusToggle
              checked={form.showCompanyAddress}
              onCheckedChange={(v) => set("showCompanyAddress", v)}
              label="Show Company Address"
              activeLabel="ON"
              inactiveLabel="OFF"
              size="sm"
            />
            <HrStatusToggle
              checked={form.showCompanyContact}
              onCheckedChange={(v) => set("showCompanyContact", v)}
              label="Show Company Contact"
              activeLabel="ON"
              inactiveLabel="OFF"
              size="sm"
            />
            <HrStatusToggle
              checked={form.isDefault}
              onCheckedChange={(v) => set("isDefault", v)}
              label="Default Template"
              activeLabel="Yes"
              inactiveLabel="No"
              size="sm"
              helper="Only one active default per template type."
            />
            <HrStatusToggle
              checked={form.status === "active"}
              onCheckedChange={(v) => {
                if (form.isDefault && !v) {
                  setErrors((e) => ({
                    ...e,
                    status: "Default template cannot be inactive.",
                  }));
                  return;
                }
                set("status", v ? "active" : "inactive");
              }}
              label="Active"
              activeLabel="ON"
              inactiveLabel="OFF"
              size="sm"
              helper={errors.status}
            />

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={hrBtn()}
                onClick={() => {
                  if (!validate()) return;
                  const temp: HrTemplateRecord = {
                    id: form.id ?? 0,
                    ...buildPayload(),
                    usageCount: 0,
                    createdBy: "",
                    updatedBy: "",
                    createdAt: "",
                    updatedAt: "",
                  };
                  setPreviewRecord(temp);
                }}
              >
                Preview
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-3 h-fit md:sticky md:top-0 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Fields
              </p>
              <p className="text-[10px] text-muted-foreground mb-2">
                Click to insert into {focusField}.
              </p>
              <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                {fieldGroups.map(([group, items]) => (
                  <div key={group}>
                    <p className="text-[10px] font-semibold text-foreground mb-1">
                      {groupLabel(group)}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {items.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          disabled={!p.available}
                          title={p.available ? p.label : "Unavailable"}
                          onClick={() => insertPlaceholder(p.key)}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-md border font-mono",
                            p.available
                              ? "bg-white border-border hover:border-brand-400 hover:bg-brand-50 text-foreground"
                              : "bg-muted text-muted-foreground border-transparent cursor-not-allowed",
                          )}
                        >
                          {`{{${p.key}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Dynamic Blocks
              </p>
              <p className="text-[10px] text-muted-foreground mb-2">
                Inserts a configurable table chip. Click chip to edit settings.
              </p>
              <div className="flex flex-col gap-1">
                {HR_TEMPLATE_BLOCK_REGISTRY.map((b) => {
                  const warn = blockCompatibilityWarning(b.id, form.templateType);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      title={warn || b.description}
                      onClick={() => insertDynamicBlock(b.id)}
                      className={cn(
                        "text-left text-[11px] px-2 py-1.5 rounded-md border bg-white hover:border-brand-400 hover:bg-brand-50 transition-colors",
                        warn ? "border-amber-300 text-amber-900" : "border-border text-foreground",
                      )}
                    >
                      <span className="font-semibold block">{b.label}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {`{{${b.token}}}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </HrFormDrawer>

      <Sheet open={!!viewRecord} onOpenChange={(o) => !o && setViewRecord(null)}>
        <SheetContent className="w-full sm:max-w-[520px] flex flex-col p-0 gap-0">
          <SheetHeader>
            <SheetTitle>{viewRecord?.name}</SheetTitle>
            <SheetDescription>Read-only template details</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-3 text-xs">
            {viewRecord ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium">
                      {templateTypeLabel(viewRecord.templateType, viewRecord.customTypeName)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Default</p>
                    <p className="font-medium">{viewRecord.isDefault ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">
                      {viewRecord.status === "active" ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Updated</p>
                    <p className="font-medium">
                      {viewRecord.updatedAt} · {viewRecord.updatedBy}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Subject</p>
                  <p className="font-medium">{viewRecord.subject || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Body</p>
                  <div
                    className="rounded-lg border border-border p-2 bg-muted/10"
                    dangerouslySetInnerHTML={{ __html: viewRecord.body || "—" }}
                  />
                </div>
              </>
            ) : null}
          </SheetBody>
          <SheetFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={hrBtn()}
              onClick={() => setViewRecord(null)}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={hrBtn()}
              onClick={() => viewRecord && setPreviewRecord(viewRecord)}
            >
              Preview
            </Button>
            <Button
              type="button"
              size="sm"
              className={hrBtn("", true)}
              onClick={() => viewRecord && openEdit(viewRecord)}
            >
              Edit
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DocumentPreview
        open={!!previewRecord}
        onClose={() => setPreviewRecord(null)}
        template={previewRecord}
        onEdit={
          previewRecord && previewRecord.id
            ? () => {
                const r = records.find((x) => x.id === previewRecord.id);
                if (r) openEdit(r);
                else openEdit(previewRecord);
                setPreviewRecord(null);
              }
            : undefined
        }
        onSaveSnapshot={
          previewRecord && previewRecord.id
            ? () => {
                const tpl =
                  records.find((x) => x.id === previewRecord.id) ?? previewRecord;
                createGeneratedHrDocument({
                  template: tpl,
                  sourceModule: "template_management",
                  status: "generated",
                });
                setToast("Generated document snapshot saved.");
                setPreviewRecord(null);
                refresh();
              }
            : undefined
        }
      />

      <HrConfirmDialog
        open={!!confirm}
        onClose={() => {
          setConfirm(null);
          setPendingDefaultForm(false);
        }}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === "deactivate") {
            applyStatus(confirm.record, false);
          } else if (confirm.type === "make_default" && pendingDefaultForm) {
            commitSave(true);
          }
          setConfirm(null);
          setPendingDefaultForm(false);
        }}
        destructive={confirm?.type === "deactivate"}
        title={
          confirm?.type === "make_default"
            ? "Make this the default template?"
            : "Deactivate template?"
        }
        description={
          confirm?.type === "make_default"
            ? `${confirm.currentDefaultName} is currently the default ${templateTypeLabel(form.templateType, form.customTypeName)} template. Make this the new default?`
            : `${confirm?.record.name ?? ""}. Inactive templates are unavailable for new generation.`
        }
        confirmLabel={confirm?.type === "make_default" ? "Make Default" : "Deactivate"}
      />

      <HrSettingsDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        target={deleteTarget}
        onDelete={handleDelete}
        onMakeInactive={() => {
          if (!deleteTarget) return;
          applyStatus(deleteTarget.record, false);
          setDeleteTarget(null);
        }}
      />

      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />

      <TemplateBlockConfigDialog
        open={!!configBlock}
        block={configBlock}
        onClose={() => setConfigBlockId(null)}
        onSave={(settings: HrBlockSettings) => {
          if (!configBlockId) return;
          setForm((f) => ({
            ...f,
            blocks: f.blocks.map((b) =>
              b.id === configBlockId ? { ...b, settings } : b,
            ),
          }));
          setConfigBlockId(null);
          setToast("Block settings saved.");
        }}
        onRemove={() => {
          if (!configBlockId) return;
          const id = configBlockId;
          setForm((f) => ({
            ...f,
            blocks: f.blocks.filter((b) => b.id !== id),
            header: f.header.replace(
              new RegExp(
                `<span[^>]*data-hr-block-id=["']${id}["'][^>]*>[\\s\\S]*?<\\/span>`,
                "gi",
              ),
              "",
            ),
            body: f.body.replace(
              new RegExp(
                `<span[^>]*data-hr-block-id=["']${id}["'][^>]*>[\\s\\S]*?<\\/span>`,
                "gi",
              ),
              "",
            ),
            footer: f.footer.replace(
              new RegExp(
                `<span[^>]*data-hr-block-id=["']${id}["'][^>]*>[\\s\\S]*?<\\/span>`,
                "gi",
              ),
              "",
            ),
          }));
          setConfigBlockId(null);
          setToast("Block removed.");
        }}
      />
    </HrOrgPageHeader>
  );
}
