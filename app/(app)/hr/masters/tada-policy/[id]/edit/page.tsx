"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HrFormLayout } from "../../../../components/HrFormLayout";
import { TadaPolicyForm } from "../../components/TadaPolicyForm";
import {
  formToPolicy,
  getTadaPolicyById,
  loadTadaPolicies,
  policyToForm,
  saveTadaPolicies,
  validatePolicyForm,
  type TadaPolicyFormValues,
} from "../../tada-policy-data";

export default function EditTadaPolicyPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<TadaPolicyFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = getTadaPolicyById(id);
    if (!p) {
      router.replace("/hr/masters/tada-policy");
      return;
    }
    setForm(policyToForm(p));
  }, [id, router]);

  const save = () => {
    if (!form) return;
    const err = validatePolicyForm(form);
    if (err) {
      setError(err);
      return;
    }
    const existing = getTadaPolicyById(id);
    saveTadaPolicies(loadTadaPolicies().map((p) => (p.id === id ? formToPolicy(form, id, existing) : p)));
    router.push("/hr/masters/tada-policy");
  };

  if (!form) return null;

  return (
    <HrFormLayout
      mode="edit"
      title="Edit TA/DA Policy"
      breadcrumb={[
        { label: "HR", href: "/hr/employees" },
        { label: "TA/DA Policy", href: "/hr/masters/tada-policy" },
      ]}
      code={form.policyCode}
      subtitle={form.policyName}
      onSave={save}
      saveLabel="Save Policy"
    >
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <TadaPolicyForm form={form} onChange={setForm} />
    </HrFormLayout>
  );
}
