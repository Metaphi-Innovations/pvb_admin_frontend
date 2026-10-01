"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Eye, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HrDateInput } from "@/app/(app)/hr/components/HrDateInput";
import {
  hrBtn,
  HrOrgField,
} from "@/app/(app)/hr/settings/organization/_components";
import {
  getActiveHrEmployees,
  getHrEmployeeById,
  type HrEmployee,
} from "@/app/(app)/hr/employees/employee-master-data";
import {
  getActiveTemplatesByType,
  getDefaultTemplateByType,
  getGeneratedHrDocumentById,
  loadHrTemplates,
  type HrTemplateRecord,
  type HrTemplateTypeKey,
} from "@/app/(app)/hr/settings/hr-template-data";
import { policyToday } from "@/lib/hr/policy-common";
import {
  buildEmployeeLetterContext,
  defaultTitleFromTemplate,
  generateHrLetter,
  getLetterDataGaps,
  inspectTemplateAvailability,
  previewHrLetter,
  saveHrLetterDraft,
  HR_LETTER_TYPE_OPTIONS,
  type LetterDataGap,
} from "../hr-letters-data";
import { HrLetterCombobox } from "./HrLetterCombobox";
import { HrLetterDocumentFrame } from "./HrLetterDocumentFrame";
import { HrLetterEmployeePicker } from "./HrLetterEmployeePicker";

const DRAWER_WIDTH = "w-full max-w-[800px]";

export function HrLetterCreateDrawer({
  open,
  onOpenChange,
  draftId,
  lockedEmployeeId,
  initialLetterType,
  lockLetterType,
  issueDatePreset,
  extraContext,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftId?: string | null;
  lockedEmployeeId?: number | null;
  initialLetterType?: HrTemplateTypeKey;
  lockLetterType?: boolean;
  issueDatePreset?: string;
  extraContext?: Partial<import("@/app/(app)/hr/settings/hr-template-data").TemplateRenderContext>;
  onSaved?: (msg: string) => void;
}) {
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [tplTick, setTplTick] = useState(0);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [letterType, setLetterType] = useState<HrTemplateTypeKey>("appointment_letter");
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [issueDate, setIssueDate] = useState(policyToday());
  const [documentTitle, setDocumentTitle] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const employeeLocked = lockedEmployeeId != null;

  const reloadEmployees = () => {
    setEmployees(getActiveHrEmployees());
  };

  useEffect(() => {
    if (!open) return;
    reloadEmployees();
    const onTpl = () => setTplTick((n) => n + 1);
    window.addEventListener("hr-templates-updated", onTpl);
    return () => window.removeEventListener("hr-templates-updated", onTpl);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setBanner(null);
    setShowPreview(false);

    if (draftId) {
      const doc = getGeneratedHrDocumentById(draftId);
      if (doc && doc.status === "draft") {
        setEmployeeId(doc.employeeId ?? null);
        setLetterType(doc.templateType);
        setTemplateId(doc.templateId || null);
        setIssueDate(doc.issueDate || policyToday());
        setDocumentTitle(doc.documentTitle || doc.renderedSubject || "");
        setReferenceNumber(doc.referenceNumber || "");
        setInternalNote(doc.internalNote || "");
        return;
      }
    }

    setEmployeeId(lockedEmployeeId ?? null);
    const type = initialLetterType ?? "appointment_letter";
    setLetterType(type);
    const def = getDefaultTemplateByType(type);
    setTemplateId(def?.id ?? null);
    setIssueDate(issueDatePreset || policyToday());
    setDocumentTitle(defaultTitleFromTemplate(def));
    setReferenceNumber("");
    setInternalNote("");
  }, [open, draftId, lockedEmployeeId, initialLetterType, issueDatePreset]);

  const activeTemplates = useMemo(() => {
    if (!open) return [] as HrTemplateRecord[];
    return getActiveTemplatesByType(letterType, loadHrTemplates());
  }, [open, letterType, tplTick]);

  const pickerEmployees = useMemo(() => {
    const list = [...employees];
    if (employeeId != null && !list.some((e) => e.id === employeeId)) {
      const extra = getHrEmployeeById(employeeId);
      if (extra) list.unshift(extra);
    }
    return list;
  }, [employees, employeeId]);

  const selectedEmployee =
    employeeId != null
      ? pickerEmployees.find((e) => e.id === employeeId) ?? getHrEmployeeById(employeeId)
      : undefined;

  const availability = inspectTemplateAvailability(templateId);
  const selectedTemplate =
    activeTemplates.find((t) => t.id === templateId) ?? availability.template;

  const handleLetterTypeChange = (next: HrTemplateTypeKey) => {
    setLetterType(next);
    const def = getDefaultTemplateByType(next);
    setTemplateId(def?.id ?? null);
    setDocumentTitle(defaultTitleFromTemplate(def));
    setShowPreview(false);
  };

  const handleTemplateChange = (idStr: string) => {
    const id = Number(idStr);
    const tpl = activeTemplates.find((t) => t.id === id) ?? null;
    setTemplateId(tpl ? tpl.id : null);
    setDocumentTitle(defaultTitleFromTemplate(tpl));
    setShowPreview(false);
  };

  const formPayload = () => ({
    employeeId: employeeId ?? 0,
    letterType,
    templateId,
    issueDate,
    documentTitle,
    referenceNumber,
    internalNote,
  });

  const validateBase = (requireTemplate: boolean): boolean => {
    const e: Record<string, string> = {};
    if (employeeId == null) e.employee = "Employee is required";
    if (!letterType) e.letterType = "Letter Type is required";
    if (!issueDate) e.issueDate = "Issue Date is required";
    if (requireTemplate) {
      if (!templateId || availability.missing) {
        e.template = "No active template is available for this Letter Type.";
      } else if (availability.inactive && !activeTemplates.some((t) => t.id === templateId)) {
        e.template = "The selected template is inactive. Choose an active template.";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveDraft = () => {
    if (!validateBase(false)) return;
    setBusy(true);
    const result = saveHrLetterDraft(formPayload(), draftId);
    setBusy(false);
    if (!result.ok) {
      setBanner(result.error);
      return;
    }
    onSaved?.("Draft saved.");
    onOpenChange(false);
  };

  const handleGenerate = () => {
    if (!validateBase(true)) return;
    setBusy(true);
    const result = generateHrLetter(formPayload(), draftId, extraContext);
    setBusy(false);
    if (!result.ok) {
      setBanner(result.error);
      return;
    }
    onSaved?.("Letter generated.");
    onOpenChange(false);
  };

  const livePreview = useMemo(() => {
    if (!showPreview || !selectedEmployee || !selectedTemplate) return null;
    return previewHrLetter(
      selectedEmployee,
      selectedTemplate,
      issueDate,
      documentTitle,
      extraContext,
    );
  }, [showPreview, selectedEmployee, selectedTemplate, issueDate, documentTitle, extraContext]);

  const gaps: LetterDataGap[] = (() => {
    if (!selectedEmployee) return [];
    if (selectedTemplate) {
      return (
        livePreview?.gaps ??
        previewHrLetter(selectedEmployee, selectedTemplate, issueDate, documentTitle, extraContext).gaps
      );
    }
    return getLetterDataGaps(
      letterType,
      selectedEmployee,
      buildEmployeeLetterContext(selectedEmployee, issueDate, extraContext),
      null,
    );
  })();

  const noActiveTemplates = activeTemplates.length === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={`${DRAWER_WIDTH} flex flex-col p-0 gap-0`}>
        <SheetHeader className="px-5 pt-4 pb-3 pr-12">
          <SheetTitle className="text-[15px] font-semibold">
            {draftId ? "Edit HR Letter Draft" : "Create HR Letter"}
          </SheetTitle>
          <SheetDescription className="text-xs mt-0.5">
            Employee data is resolved from the directory. Letter content comes from Template
            Management.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-5 py-4 space-y-4">
          {banner ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {banner}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <HrOrgField label="Employee" required error={errors.employee} size="md">
              <HrLetterEmployeePicker
                employees={pickerEmployees}
                valueId={employeeId}
                disabled={employeeLocked}
                error={!!errors.employee}
                onChange={(emp) => {
                  setEmployeeId(emp?.id ?? null);
                  setShowPreview(false);
                }}
              />
            </HrOrgField>

            <HrOrgField label="Letter Type" required error={errors.letterType} size="md">
              <HrLetterCombobox
                value={letterType}
                onChange={(v) => handleLetterTypeChange(v as HrTemplateTypeKey)}
                placeholder="Select letter type…"
                error={!!errors.letterType}
                disabled={lockLetterType}
                options={HR_LETTER_TYPE_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
            </HrOrgField>

            <HrOrgField
              label="Template"
              required
              error={errors.template}
              size="md"
              helper={
                noActiveTemplates
                  ? undefined
                  : selectedTemplate?.isDefault
                    ? "Default template for this type is selected."
                    : "Active templates for this letter type."
              }
            >
              <HrLetterCombobox
                value={templateId ? String(templateId) : ""}
                onChange={handleTemplateChange}
                placeholder="Select template…"
                error={!!errors.template}
                emptyLabel="No active templates"
                options={[
                  ...(!availability.missing &&
                  selectedTemplate &&
                  !activeTemplates.some((t) => t.id === selectedTemplate.id)
                    ? [
                        {
                          value: String(selectedTemplate.id),
                          label: `${selectedTemplate.name} (Inactive)`,
                          hint: "Not available for new generation",
                          disabled: true,
                        },
                      ]
                    : []),
                  ...activeTemplates.map((t) => ({
                    value: String(t.id),
                    label: t.isDefault ? `${t.name} (Default)` : t.name,
                    hint: t.customTypeName || undefined,
                  })),
                ]}
              />
            </HrOrgField>

            <HrOrgField label="Issue Date" required error={errors.issueDate} size="md">
              <HrDateInput
                value={issueDate}
                onChange={(v) => {
                  setIssueDate(v);
                  setShowPreview(false);
                }}
                aria-invalid={!!errors.issueDate}
              />
            </HrOrgField>

            <HrOrgField
              label="Document Title / Subject"
              size="lg"
              helper="Defaults from the selected template. You may override."
            >
              <Input
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="Document title…"
                className="h-9 text-sm rounded-lg"
              />
            </HrOrgField>

            <HrOrgField label="Reference Number" size="md" helper="Optional">
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Optional reference…"
                className="h-9 text-sm rounded-lg"
              />
            </HrOrgField>
          </div>

          <HrOrgField label="Remark / Internal Note" size="full" helper="Optional — not printed on the letter">
            <Textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={2}
              placeholder="Internal note…"
              className="text-sm rounded-lg"
            />
          </HrOrgField>

          {noActiveTemplates ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 space-y-1.5">
              <p className="font-medium">No active template is available for this Letter Type.</p>
              <p>Generation is blocked until an active template exists.</p>
              <Link
                href="/hr/settings/templates"
                className="inline-flex font-medium text-brand-700 hover:underline"
              >
                Manage Templates
              </Link>
            </div>
          ) : null}

          {availability.missing && templateId ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Selected template is no longer available. Choose another active template before
              Generate.
            </div>
          ) : null}

          {availability.inactive && selectedTemplate ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              This draft still references <strong>{selectedTemplate.name}</strong>, which is now
              inactive. Choose an active template before Generate.
            </div>
          ) : null}

          {gaps.map((g) => (
            <div
              key={g.message}
              className={
                g.level === "warning"
                  ? "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                  : "rounded-lg border border-navy-100 bg-navy-50 px-3 py-2 text-xs text-navy-800"
              }
            >
              <span className="font-medium">
                {g.level === "warning" ? "Configuration / Data Required. " : ""}
              </span>
              {g.message}
            </div>
          ))}

          {showPreview && livePreview ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Preview
              </p>
              <HrLetterDocumentFrame
                title={livePreview.title}
                header={livePreview.rendered.header}
                body={livePreview.rendered.body}
                footer={livePreview.rendered.footer}
                companyName={livePreview.rendered.companyName}
                companyAddress={livePreview.rendered.companyAddress}
                companyContact={livePreview.rendered.companyContact}
                logoUrl={livePreview.rendered.logoUrl}
                useCompanyLogo={livePreview.rendered.useCompanyLogo}
                showCompanyAddress={livePreview.rendered.showCompanyAddress}
                showCompanyContact={livePreview.rendered.showCompanyContact}
                unknownPlaceholders={livePreview.rendered.unknownPlaceholders}
              />
            </div>
          ) : null}
        </SheetBody>

        <SheetFooter className="px-5 py-3 gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={hrBtn()}
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={hrBtn("gap-1.5")}
            onClick={handleSaveDraft}
            disabled={busy}
          >
            <Save className="w-3.5 h-3.5" /> Save Draft
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={hrBtn("gap-1.5")}
            disabled={busy || !selectedEmployee || !selectedTemplate}
            onClick={() => {
              if (!validateBase(true)) return;
              setShowPreview(true);
            }}
          >
            <Eye className="w-3.5 h-3.5" /> Preview Letter
          </Button>
          <Button
            type="button"
            size="sm"
            className={hrBtn("gap-1.5", true)}
            onClick={handleGenerate}
            disabled={busy || noActiveTemplates}
          >
            <FileText className="w-3.5 h-3.5" /> Generate
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
