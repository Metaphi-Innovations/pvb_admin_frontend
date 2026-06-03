"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HrFormLayout } from "../../../components/HrFormLayout";
import { EmployeeMasterForm } from "../../components/EmployeeMasterForm";
import {
  employeeToForm,
  formToEmployee,
  getHrEmployeeById,
  loadHrEmployees,
  saveHrEmployees,
  validateEmployeeForm,
  type HrEmployeeFormValues,
} from "../../employee-master-data";

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<HrEmployeeFormValues | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const e = getHrEmployeeById(id);
    if (!e) {
      router.replace("/hr/employees");
      return;
    }
    setForm(employeeToForm(e));
    setCode(e.employeeCode);
  }, [id, router]);

  const save = () => {
    if (!form) return;
    const err = validateEmployeeForm(form);
    if (err) {
      setError(err);
      return;
    }
    const existing = getHrEmployeeById(id);
    if (!existing) return;
    const rec = formToEmployee(form, id, code, existing);
    const list = loadHrEmployees().map((e) => (e.id === id ? rec : e));
    saveHrEmployees(list);
    router.push("/hr/employees");
  };

  if (!form) return null;

  return (
    <HrFormLayout
      mode="edit"
      title="Edit Employee"
      breadcrumb={[
        { label: "HR", href: "/hr/employees" },
        { label: "Employee Master", href: "/hr/employees" },
      ]}
      code={code}
      subtitle={form.employeeName}
      onSave={save}
      saveLabel="Save Employee"
    >
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <EmployeeMasterForm form={form} onChange={setForm} employeeCode={code} excludeId={id} />
    </HrFormLayout>
  );
}
