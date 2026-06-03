"use client";

import { Ruler } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Column } from "@/components/ui/DataTable";
import {
  MasterModule,
  MasterFormGrid,
  MasterField,
  MasterViewRow,
  compactInput,
} from "@/components/masters/MasterModule";
import {
  DEFAULT_UNIT_FORM,
  formToUnit,
  UNIT_SEED,
  UNIT_STORAGE_KEY,
  unitToForm,
  type UnitForm,
  type UnitRecord,
  validateUnitForm,
} from "./unit-data";

const columns: Column<UnitRecord>[] = [
  { key: "unitName", header: "Unit Name", sortable: true },
  { key: "unitCode", header: "Unit Code", sortable: true, render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
  { key: "symbol", header: "Symbol", sortable: true, render: (v) => <span className="font-mono font-semibold">{String(v)}</span> },
];

export default function UnitMasterPage() {
  return (
    <MasterModule<UnitRecord, UnitForm>
      config={{
        title: "Unit Master",
        description: "Units of measure for products",
        icon: Ruler,
        storageKey: UNIT_STORAGE_KEY,
        seed: UNIT_SEED,
        codePrefix: "UNIT-",
        columns,
        searchKeys: ["unitName", "unitCode", "symbol", "description"],
        defaultForm: DEFAULT_UNIT_FORM,
        getFormFromRecord: unitToForm,
        recordFromForm: formToUnit,
        validate: validateUnitForm,
        setCodeOnForm: (f, code) => ({ ...f, unitCode: code }),
        renderFormFields: ({ form, setForm }) => (
          <MasterFormGrid>
            <MasterField label="Unit Name" required>
              <Input className={compactInput()} value={form.unitName} onChange={(e) => setForm((f) => ({ ...f, unitName: e.target.value }))} />
            </MasterField>
            <MasterField label="Unit Code" required>
              <Input className={compactInput("font-mono")} value={form.unitCode} onChange={(e) => setForm((f) => ({ ...f, unitCode: e.target.value.toUpperCase() }))} />
            </MasterField>
            <MasterField label="Symbol" required>
              <Input className={compactInput("font-mono")} value={form.symbol} onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))} placeholder="KG, L, PKT" />
            </MasterField>
            <MasterField label="Description" className="sm:col-span-2">
              <Textarea className="text-xs min-h-[72px] resize-none" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </MasterField>
          </MasterFormGrid>
        ),
        renderViewDetails: (r) => (
          <div className="rounded-lg border border-border/60 bg-muted/10 px-3">
            <MasterViewRow label="Unit Name" value={r.unitName} />
            <MasterViewRow label="Unit Code" value={<span className="font-mono">{r.unitCode}</span>} />
            <MasterViewRow label="Symbol" value={<span className="font-mono">{r.symbol}</span>} />
            <MasterViewRow label="Description" value={r.description || "—"} />
            <MasterViewRow label="Status" value={r.status === "active" ? "Active" : "Inactive"} />
          </div>
        ),
      }}
    />
  );
}
