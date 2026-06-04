"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HrFormLayout } from "../../components/HrFormLayout";
import { EmployeeMasterForm } from "../components/EmployeeMasterForm";
import {
  DEFAULT_EMPLOYEE_FORM,
  formToEmployee,
  generateEmployeeCode,
  loadHrEmployees,
  saveHrEmployees,
  validateEmployeeForm,
  type HrEmployeeFormValues,
} from "../employee-master-data";

export default function NewEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState<HrEmployeeFormValues>(DEFAULT_EMPLOYEE_FORM);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCode(generateEmployeeCode());
  }, []);

  const save = () => {
    const err = validateEmployeeForm(form);
    if (err) {
      setError(err);
      return;
    }
    const list = loadHrEmployees();
    const id = list.length ? Math.max(...list.map((e) => e.id)) + 1 : 1;
    const rec = formToEmployee(form, id, code);
    saveHrEmployees([...list, rec]);
    router.push("/hr/employees");
  };

  return (
    <HrFormLayout
      mode="create"
      title="Create Employee"
      breadcrumb={[
        { label: "HR", href: "/hr/employees" },
        { label: "Employee Master", href: "/hr/employees" },
      ]}
      code={code}
      onSave={save}
      saveLabel="Save Employee"
    >
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <EmployeeMasterForm form={form} onChange={setForm} employeeCode={code} />
    </HrFormLayout>
  );
}
