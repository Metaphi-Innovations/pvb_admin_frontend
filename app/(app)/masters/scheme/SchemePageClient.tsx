"use client";

import { Gift } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Column } from "@/components/ui/DataTable";
import {
  MasterModule,
  MasterFormGrid,
  MasterField,
  MasterViewRow,
  compactInput,
} from "@/components/masters/MasterModule";
import {
  DEFAULT_SCHEME_FORM,
  formToScheme,
  SCHEME_SEED,
  SCHEME_STORAGE_KEY,
  SCHEME_TYPE_OPTIONS,
  schemeToForm,
  schemeTypeLabel,
  type SchemeForm,
  type SchemeRecord,
  validateSchemeForm,
} from "./scheme-data";

const columns: Column<SchemeRecord>[] = [
  { key: "schemeName", header: "Scheme Name", sortable: true },
  { key: "schemeCode", header: "Scheme Code", sortable: true, render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
  {
    key: "schemeType",
    header: "Scheme Type",
    sortable: true,
    render: (v) => schemeTypeLabel(v as SchemeRecord["schemeType"]),
  },
  { key: "startDate", header: "Start Date", sortable: true },
  { key: "endDate", header: "End Date", sortable: true },
];

export default function SchemeMasterPage() {
  return (
    <MasterModule<SchemeRecord, SchemeForm>
      config={{
        title: "Scheme Master",
        description: "Promotional and pricing schemes",
        icon: Gift,
        storageKey: SCHEME_STORAGE_KEY,
        seed: SCHEME_SEED,
        codePrefix: "SCH-",
        columns,
        searchKeys: ["schemeName", "schemeCode", "description", "schemeType"],
        defaultForm: DEFAULT_SCHEME_FORM,
        getFormFromRecord: schemeToForm,
        recordFromForm: formToScheme,
        validate: validateSchemeForm,
        setCodeOnForm: (f, code) => ({ ...f, schemeCode: code }),
        renderFormFields: ({ form, setForm }) => (
          <MasterFormGrid>
            <MasterField label="Scheme Name" required>
              <Input className={compactInput()} value={form.schemeName} onChange={(e) => setForm((f) => ({ ...f, schemeName: e.target.value }))} />
            </MasterField>
            <MasterField label="Scheme Code" required>
              <Input className={compactInput("font-mono")} value={form.schemeCode} onChange={(e) => setForm((f) => ({ ...f, schemeCode: e.target.value.toUpperCase() }))} />
            </MasterField>
            <MasterField label="Scheme Type" required>
              <Select value={form.schemeType} onValueChange={(v) => setForm((f) => ({ ...f, schemeType: v as SchemeForm["schemeType"] }))}>
                <SelectTrigger className={compactInput()}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEME_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </MasterField>
            <MasterField label="Start Date" required>
              <Input type="date" className={compactInput()} value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </MasterField>
            <MasterField label="End Date" required>
              <Input type="date" className={compactInput()} value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </MasterField>
            <MasterField label="Description" className="sm:col-span-2">
              <Textarea className="text-xs min-h-[72px] resize-none" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </MasterField>
          </MasterFormGrid>
        ),
        renderViewDetails: (r) => (
          <div className="rounded-lg border border-border/60 bg-muted/10 px-3">
            <MasterViewRow label="Scheme Name" value={r.schemeName} />
            <MasterViewRow label="Scheme Code" value={<span className="font-mono">{r.schemeCode}</span>} />
            <MasterViewRow label="Scheme Type" value={schemeTypeLabel(r.schemeType)} />
            <MasterViewRow label="Start Date" value={r.startDate} />
            <MasterViewRow label="End Date" value={r.endDate} />
            <MasterViewRow label="Description" value={r.description || "—"} />
            <MasterViewRow label="Status" value={r.status === "active" ? "Active" : "Inactive"} />
          </div>
        ),
      }}
    />
  );
}
