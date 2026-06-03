"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HrFormLayout } from "../../../components/HrFormLayout";
import { TadaPolicyForm } from "../components/TadaPolicyForm";
import {
  DEFAULT_POLICY_FORM,
  formToPolicy,
  generatePolicyCode,
  loadTadaPolicies,
  saveTadaPolicies,
  validatePolicyForm,
  type TadaPolicyFormValues,
} from "../tada-policy-data";

export default function NewTadaPolicyPage() {
  const router = useRouter();
  const [form, setForm] = useState<TadaPolicyFormValues>(DEFAULT_POLICY_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm((f) => ({ ...f, policyCode: generatePolicyCode() }));
  }, []);

  const save = () => {
    const err = validatePolicyForm(form);
    if (err) {
      setError(err);
      return;
    }
    const list = loadTadaPolicies();
    const id = list.length ? Math.max(...list.map((p) => p.id)) + 1 : 1;
    saveTadaPolicies([...list, formToPolicy(form, id)]);
    router.push("/hr/masters/tada-policy");
  };

  return (
    <HrFormLayout
      mode="create"
      title="Create TA/DA Policy"
      breadcrumb={[
        { label: "HR", href: "/hr/employees" },
        { label: "TA/DA Policy", href: "/hr/masters/tada-policy" },
      ]}
      code={form.policyCode}
      onSave={save}
      saveLabel="Save Policy"
    >
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <TadaPolicyForm form={form} onChange={setForm} />
    </HrFormLayout>
  );
}
