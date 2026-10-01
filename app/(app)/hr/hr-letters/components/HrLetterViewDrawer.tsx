"use client";

import React, { useMemo, useRef } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { hrBtn } from "@/app/(app)/hr/settings/organization/_components";
import {
  formatDateDisplay,
  getBranchDisplayLabel,
} from "@/app/(app)/hr/employees/employee-display";
import { getHrEmployeeById } from "@/app/(app)/hr/employees/employee-master-data";
import {
  getHrTemplateById,
  type GeneratedHrDocument,
} from "@/app/(app)/hr/settings/hr-template-data";
import {
  formatLetterDateTime,
  hrLetterTypeLabel,
  letterStatusLabel,
  previewHrLetter,
} from "../hr-letters-data";
import { HrLetterDocumentFrame, printHrLetterPreview } from "./HrLetterDocumentFrame";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-medium text-foreground mt-0.5 break-words">{value || "—"}</p>
    </div>
  );
}

export function HrLetterViewDrawer({
  open,
  letter,
  onClose,
  livePreview,
}: {
  open: boolean;
  letter: GeneratedHrDocument | null;
  onClose: () => void;
  /** When true (drafts), re-render from current employee + template instead of snapshot. */
  livePreview?: boolean;
}) {
  const frameHost = useRef<HTMLDivElement>(null);

  const resolved = useMemo(() => {
    if (!letter) return null;
    const useLive = livePreview || letter.status === "draft";
    if (!useLive) {
      return {
        title: letter.documentTitle || letter.renderedSubject,
        header: letter.renderedHeader,
        body: letter.renderedBody,
        footer: letter.renderedFooter,
        companyName: letter.snapshotCompanyName,
        companyAddress: letter.snapshotCompanyAddress,
        companyContact: letter.snapshotCompanyContact,
        logoUrl: letter.snapshotLogoUrl,
        useCompanyLogo: letter.snapshotUseCompanyLogo,
        showCompanyAddress: letter.snapshotShowCompanyAddress,
        showCompanyContact: letter.snapshotShowCompanyContact,
        unknownPlaceholders: letter.unknownPlaceholders,
      };
    }
    const template = getHrTemplateById(letter.templateId);
    const employee =
      letter.employeeId != null ? getHrEmployeeById(letter.employeeId) : undefined;
    if (!template || !employee) {
      return {
        title: letter.documentTitle || letter.renderedSubject,
        header: letter.renderedHeader,
        body: letter.renderedBody,
        footer: letter.renderedFooter,
        companyName: letter.snapshotCompanyName,
        companyAddress: letter.snapshotCompanyAddress,
        companyContact: letter.snapshotCompanyContact,
        logoUrl: letter.snapshotLogoUrl,
        useCompanyLogo: letter.snapshotUseCompanyLogo,
        showCompanyAddress: letter.snapshotShowCompanyAddress,
        showCompanyContact: letter.snapshotShowCompanyContact,
        unknownPlaceholders: letter.unknownPlaceholders,
      };
    }
    const preview = previewHrLetter(
      employee,
      template,
      letter.issueDate || "",
      letter.documentTitle || letter.renderedSubject,
    );
    return {
      title: preview.title,
      header: preview.rendered.header,
      body: preview.rendered.body,
      footer: preview.rendered.footer,
      companyName: preview.rendered.companyName,
      companyAddress: preview.rendered.companyAddress,
      companyContact: preview.rendered.companyContact,
      logoUrl: preview.rendered.logoUrl,
      useCompanyLogo: preview.rendered.useCompanyLogo,
      showCompanyAddress: preview.rendered.showCompanyAddress,
      showCompanyContact: preview.rendered.showCompanyContact,
      unknownPlaceholders: preview.rendered.unknownPlaceholders,
    };
  }, [letter, livePreview]);

  if (!letter) return null;

  const employee =
    letter.employeeId != null ? getHrEmployeeById(letter.employeeId) : undefined;
  const typeLabel = hrLetterTypeLabel(letter.templateType);
  const status = letterStatusLabel(letter.status);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full max-w-[800px] flex flex-col p-0 gap-0">
        <SheetHeader className="px-5 pt-4 pb-3 pr-12">
          <SheetTitle className="text-[15px] font-semibold">
            {letter.documentTitle || letter.renderedSubject || typeLabel}
          </SheetTitle>
          <SheetDescription className="text-xs mt-0.5">
            {letter.status === "draft"
              ? "Draft — content follows the current template until Generate."
              : "Generated snapshot — later template edits do not change this letter."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-5 py-4 space-y-4">
          <div className="rounded-xl border border-border bg-muted/20 p-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
            <InfoRow label="Employee" value={letter.employeeName} />
            <InfoRow label="Employee Code" value={letter.employeeCode} />
            <InfoRow label="Letter Type" value={typeLabel} />
            <InfoRow
              label="Template Used"
              value={letter.templateName || "—"}
            />
            <InfoRow
              label="Issue Date"
              value={letter.issueDate ? formatDateDisplay(letter.issueDate) : "—"}
            />
            <InfoRow label="Status" value={status} />
            <InfoRow
              label="Generated On"
              value={
                letter.generatedOn
                  ? `${formatLetterDateTime(letter.generatedOn)}${letter.generatedBy ? ` · ${letter.generatedBy}` : ""}`
                  : "—"
              }
            />
            <InfoRow
              label="Issued On"
              value={
                letter.issuedOn
                  ? `${formatLetterDateTime(letter.issuedOn)}${letter.issuedBy ? ` · ${letter.issuedBy}` : ""}`
                  : "—"
              }
            />
            {letter.referenceNumber ? (
              <InfoRow label="Reference Number" value={letter.referenceNumber} />
            ) : null}
            {employee?.designation ? (
              <InfoRow label="Designation" value={employee.designation} />
            ) : null}
            {employee?.branch ? (
              <InfoRow
                label="Branch"
                value={getBranchDisplayLabel(employee.branch) || employee.branch}
              />
            ) : null}
          </div>

          {letter.internalNote ? (
            <div className="rounded-lg border border-border bg-muted/10 px-3 py-2 text-xs">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Internal note
              </p>
              <p className="mt-0.5 text-foreground">{letter.internalNote}</p>
            </div>
          ) : null}

          {resolved ? (
            <div ref={frameHost}>
              <HrLetterDocumentFrame
                title={resolved.title}
                header={resolved.header}
                body={resolved.body}
                footer={resolved.footer}
                companyName={resolved.companyName}
                companyAddress={resolved.companyAddress}
                companyContact={resolved.companyContact}
                logoUrl={resolved.logoUrl}
                useCompanyLogo={resolved.useCompanyLogo}
                showCompanyAddress={resolved.showCompanyAddress}
                showCompanyContact={resolved.showCompanyContact}
                unknownPlaceholders={resolved.unknownPlaceholders}
              />
            </div>
          ) : null}
        </SheetBody>

        <SheetFooter className="px-5 py-3 gap-2">
          <Button type="button" variant="outline" size="sm" className={hrBtn()} onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(hrBtn("gap-1.5"))}
            onClick={() =>
              printHrLetterPreview(
                frameHost.current,
                letter.documentTitle || letter.renderedSubject || "HR Letter",
              )
            }
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
