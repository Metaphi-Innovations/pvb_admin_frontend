"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MasterField, compactInput } from "./MasterModule";

export function NameCodeDescriptionFields({
  form,
  setForm,
  errors,
  labels,
}: {
  form: { name: string; code: string; description: string };
  setForm: React.Dispatch<React.SetStateAction<{ name: string; code: string; description: string }>>;
  errors: Record<string, string>;
  labels: { name: string; code: string };
}) {
  return (
    <>
      <MasterField label={labels.name} required error={errors.name}>
        <Input
          className={compactInput()}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </MasterField>
      <MasterField label={labels.code} required error={errors.code}>
        <Input
          className={compactInput("font-mono")}
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
        />
      </MasterField>
      <MasterField label="Description" className="sm:col-span-2">
        <Textarea
          className="text-xs min-h-[72px] resize-none"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </MasterField>
    </>
  );
}
