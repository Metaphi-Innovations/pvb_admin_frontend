"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MasterField, compactInput } from "./MasterModule";

export function NameCodeDescriptionFields({
  form,
  setForm,
  errors,
  labels,
  codeDisabled = false,
  codeFirst = false,
}: {
  form: { name: string; code: string; description: string };
  setForm: React.Dispatch<React.SetStateAction<{ name: string; code: string; description: string }>>;
  errors: Record<string, string>;
  labels: { name: string; code: string };
  codeDisabled?: boolean;
  codeFirst?: boolean;
}) {
  return (
    <>
      <MasterField label={labels.code} required error={errors.code}>
        <Input
          disabled={codeDisabled}
          readOnly={codeDisabled}
          autoFocus={codeFirst}
          className={compactInput(`font-mono ${codeDisabled ? "opacity-100 bg-background text-foreground cursor-not-allowed" : ""}`)}
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
        />
      </MasterField>
      <MasterField label={labels.name} required error={errors.name}>
        <Input
          className={compactInput()}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
