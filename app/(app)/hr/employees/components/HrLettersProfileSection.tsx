"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Eye, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyProfileState, ProfileSectionHeader } from "./employee-form-ui";
import { formatDateDisplay } from "../employee-display";
import type { HrEmployee } from "../employee-master-data";
import type { GeneratedHrDocument } from "@/app/(app)/hr/settings/hr-template-data";
import { hrBtn } from "@/app/(app)/hr/settings/organization/_components";
import { HrIconActionButton } from "@/app/(app)/hr/settings/organization/_components/HrIconActionButton";
import { HrSuccessToast } from "@/app/(app)/hr/components/HrSuccessToast";
import { cn } from "@/lib/utils";
import {
  hrLetterTypeLabel,
  letterStatusLabel,
  listHrLettersForEmployee,
} from "@/app/(app)/hr/hr-letters/hr-letters-data";
import { HrLetterCreateDrawer } from "@/app/(app)/hr/hr-letters/components/HrLetterCreateDrawer";
import { HrLetterViewDrawer } from "@/app/(app)/hr/hr-letters/components/HrLetterViewDrawer";

function StatusPill({ status }: { status: GeneratedHrDocument["status"] }) {
  const cls =
    status === "issued"
      ? "bg-emerald-50 text-emerald-700"
      : status === "generated"
        ? "bg-navy-50 text-navy-700"
        : "bg-slate-100 text-slate-600";
  const dot =
    status === "issued"
      ? "bg-emerald-500"
      : status === "generated"
        ? "bg-navy-500"
        : "bg-slate-400";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
      {letterStatusLabel(status)}
    </span>
  );
}

export function HrLettersProfileSection({ employee }: { employee: HrEmployee }) {
  const [docs, setDocs] = useState<GeneratedHrDocument[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [viewLetter, setViewLetter] = useState<GeneratedHrDocument | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setDocs(listHrLettersForEmployee(employee));
  }, [employee]);

  useEffect(() => {
    refresh();
    const onUpd = () => refresh();
    window.addEventListener("hr-generated-documents-updated", onUpd);
    return () => window.removeEventListener("hr-generated-documents-updated", onUpd);
  }, [refresh]);

  const openCreate = () => {
    setDraftId(null);
    setCreateOpen(true);
  };

  return (
    <div>
      <ProfileSectionHeader
        title="HR Letters"
        description="Letters issued to this employee. Content is generated from Template Management snapshots."
        actions={
          <Button type="button" size="sm" className={hrBtn("gap-1.5 shrink-0", true)} onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" /> Create HR Letter
          </Button>
        }
      />

      {docs.length === 0 ? (
        <div className="space-y-3">
          <EmptyProfileState message="No HR letters have been generated for this employee." />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={openCreate}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              + Create HR Letter
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-left">
                <th className="px-3 py-2 font-semibold">Letter Type</th>
                <th className="px-3 py-2 font-semibold">Issue Date</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Generated On</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-border/60">
                  <td className="px-3 py-2">
                    <p className="font-medium">{hrLetterTypeLabel(d.templateType)}</p>
                    <p className="text-[10px] text-muted-foreground">{d.templateName || "—"}</p>
                  </td>
                  <td className="px-3 py-2">
                    {d.issueDate ? formatDateDisplay(d.issueDate) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={d.status} />
                  </td>
                  <td className="px-3 py-2">
                    {d.generatedOn ? formatDateDisplay(d.generatedOn.slice(0, 10)) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-0.5">
                      <HrIconActionButton label="View" onClick={() => setViewLetter(d)}>
                        <Eye />
                      </HrIconActionButton>
                      {d.status === "draft" ? (
                        <HrIconActionButton
                          label="Edit"
                          onClick={() => {
                            setDraftId(d.id);
                            setCreateOpen(true);
                          }}
                        >
                          <Pencil />
                        </HrIconActionButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <HrLetterCreateDrawer
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setDraftId(null);
        }}
        draftId={draftId}
        lockedEmployeeId={employee.id}
        onSaved={(msg) => {
          setToast(msg);
          refresh();
        }}
      />

      <HrLetterViewDrawer
        open={!!viewLetter}
        letter={viewLetter}
        onClose={() => setViewLetter(null)}
      />

      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
