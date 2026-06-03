"use client";

import { Microscope } from "lucide-react";
import type { Column } from "@/components/ui/DataTable";
import { MasterModule, MasterFormGrid, MasterViewRow } from "@/components/masters/MasterModule";
import { NameCodeDescriptionFields } from "@/components/masters/simpleFields";
import {
  CFU_SEED,
  CFU_STORAGE_KEY,
  cfuToForm,
  DEFAULT_CFU_FORM,
  formToCfu,
  type CfuForm,
  type CfuRecord,
  validateCfuForm,
} from "./cfu-data";

const columns: Column<CfuRecord>[] = [
  { key: "cfuName", header: "CFU Name", sortable: true },
  { key: "cfuCode", header: "CFU Code", sortable: true, render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
];

export default function CfuMasterPage() {
  return (
    <MasterModule<CfuRecord, CfuForm>
      config={{
        title: "CFU Master",
        description: "Colony forming unit definitions",
        icon: Microscope,
        storageKey: CFU_STORAGE_KEY,
        seed: CFU_SEED,
        codePrefix: "CFU-",
        columns,
        searchKeys: ["cfuName", "cfuCode", "description"],
        defaultForm: DEFAULT_CFU_FORM,
        getFormFromRecord: cfuToForm,
        recordFromForm: formToCfu,
        validate: validateCfuForm,
        setCodeOnForm: (f, code) => ({ ...f, cfuCode: code }),
        renderFormFields: ({ form, setForm }) => (
          <MasterFormGrid>
            <NameCodeDescriptionFields
              form={{ name: form.cfuName, code: form.cfuCode, description: form.description }}
              setForm={(u) =>
                setForm((prev) => {
                  const n = typeof u === "function" ? u({ name: prev.cfuName, code: prev.cfuCode, description: prev.description }) : u;
                  return { ...prev, cfuName: n.name, cfuCode: n.code, description: n.description };
                })
              }
              errors={{}}
              labels={{ name: "CFU Name", code: "CFU Code" }}
            />
          </MasterFormGrid>
        ),
        renderViewDetails: (r) => (
          <div className="rounded-lg border border-border/60 bg-muted/10 px-3">
            <MasterViewRow label="CFU Name" value={r.cfuName} />
            <MasterViewRow label="CFU Code" value={<span className="font-mono">{r.cfuCode}</span>} />
            <MasterViewRow label="Description" value={r.description || "—"} />
            <MasterViewRow label="Status" value={r.status === "active" ? "Active" : "Inactive"} />
          </div>
        ),
      }}
    />
  );
}
