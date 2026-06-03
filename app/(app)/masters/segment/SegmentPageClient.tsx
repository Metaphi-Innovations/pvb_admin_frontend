"use client";

import { PieChart } from "lucide-react";
import type { Column } from "@/components/ui/DataTable";
import { MasterModule, MasterFormGrid, MasterViewRow } from "@/components/masters/MasterModule";
import { NameCodeDescriptionFields } from "@/components/masters/simpleFields";
import {
  DEFAULT_SEGMENT_FORM,
  formToSegment,
  SEGMENT_SEED,
  SEGMENT_STORAGE_KEY,
  segmentToForm,
  type SegmentForm,
  type SegmentRecord,
  validateSegmentForm,
} from "./segment-data";

const columns: Column<SegmentRecord>[] = [
  { key: "segmentName", header: "Segment Name", sortable: true },
  { key: "segmentCode", header: "Segment Code", sortable: true, render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
];

export default function SegmentMasterPage() {
  return (
    <MasterModule<SegmentRecord, SegmentForm>
      config={{
        title: "Segment Master",
        description: "Market and customer segments",
        icon: PieChart,
        storageKey: SEGMENT_STORAGE_KEY,
        seed: SEGMENT_SEED,
        codePrefix: "SEG-",
        columns,
        searchKeys: ["segmentName", "segmentCode", "description"],
        defaultForm: DEFAULT_SEGMENT_FORM,
        getFormFromRecord: segmentToForm,
        recordFromForm: formToSegment,
        validate: validateSegmentForm,
        setCodeOnForm: (f, code) => ({ ...f, segmentCode: code }),
        renderFormFields: ({ form, setForm, errors }) => (
          <MasterFormGrid>
            <NameCodeDescriptionFields
              form={{ name: form.segmentName, code: form.segmentCode, description: form.description }}
              setForm={(u) =>
                setForm((prev) => {
                  const n = typeof u === "function" ? u({ name: prev.segmentName, code: prev.segmentCode, description: prev.description }) : u;
                  return { ...prev, segmentName: n.name, segmentCode: n.code, description: n.description };
                })
              }
              errors={{}}
              labels={{ name: "Segment Name", code: "Segment Code" }}
            />
          </MasterFormGrid>
        ),
        renderViewDetails: (r) => (
          <div className="rounded-lg border border-border/60 bg-muted/10 px-3">
            <MasterViewRow label="Segment Name" value={r.segmentName} />
            <MasterViewRow label="Segment Code" value={<span className="font-mono">{r.segmentCode}</span>} />
            <MasterViewRow label="Description" value={r.description || "—"} />
            <MasterViewRow label="Status" value={r.status === "active" ? "Active" : "Inactive"} />
          </div>
        ),
      }}
    />
  );
}
