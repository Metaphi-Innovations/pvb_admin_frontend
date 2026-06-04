"use client";

import { FlaskConical } from "lucide-react";
import type { Column } from "@/components/ui/DataTable";
import { MasterModule, MasterFormGrid, MasterViewRow } from "@/components/masters/MasterModule";
import { NameCodeDescriptionFields } from "@/components/masters/simpleFields";
import {
  DEFAULT_FORMULATION_FORM,
  formToFormulation,
  FORMULATION_SEED,
  FORMULATION_STORAGE_KEY,
  formulationToForm,
  type FormulationForm,
  type FormulationRecord,
  validateFormulationForm,
} from "./formulation-data";

const columns: Column<FormulationRecord>[] = [
  { key: "formulationName", header: "Formulation Name", sortable: true },
  { key: "formulationCode", header: "Formulation Code", sortable: true, render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
];

export default function FormulationMasterPage() {
  return (
    <MasterModule<FormulationRecord, FormulationForm>
      config={{
        title: "Formulation Master",
        description: "Product formulation types",
        icon: FlaskConical,
        storageKey: FORMULATION_STORAGE_KEY,
        seed: FORMULATION_SEED,
        codePrefix: "FORM-",
        columns,
        searchKeys: ["formulationName", "formulationCode", "description"],
        defaultForm: DEFAULT_FORMULATION_FORM,
        getFormFromRecord: formulationToForm,
        recordFromForm: formToFormulation,
        validate: validateFormulationForm,
        setCodeOnForm: (f, code) => ({ ...f, formulationCode: code }),
        renderFormFields: ({ form, setForm }) => (
          <MasterFormGrid>
            <NameCodeDescriptionFields
              form={{ name: form.formulationName, code: form.formulationCode, description: form.description }}
              setForm={(u) =>
                setForm((prev) => {
                  const n = typeof u === "function" ? u({ name: prev.formulationName, code: prev.formulationCode, description: prev.description }) : u;
                  return { ...prev, formulationName: n.name, formulationCode: n.code, description: n.description };
                })
              }
              errors={{}}
              labels={{ name: "Formulation Name", code: "Formulation Code" }}
            />
          </MasterFormGrid>
        ),
        renderViewDetails: (r) => (
          <div className="rounded-lg border border-border/60 bg-muted/10 px-3">
            <MasterViewRow label="Formulation Name" value={r.formulationName} />
            <MasterViewRow label="Formulation Code" value={<span className="font-mono">{r.formulationCode}</span>} />
            <MasterViewRow label="Description" value={r.description || "—"} />
            <MasterViewRow label="Status" value={r.status === "active" ? "Active" : "Inactive"} />
          </div>
        ),
      }}
    />
  );
}
