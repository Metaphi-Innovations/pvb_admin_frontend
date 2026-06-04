"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HrFormLayout } from "../../components/HrFormLayout";
import { EmployeeMasterForm } from "../components/EmployeeMasterForm";
import {
  employeeToForm,
  getHrEmployeeById,
  type HrEmployeeFormValues,
} from "../employee-master-data";

export default function ViewEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<HrEmployeeFormValues | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    const e = getHrEmployeeById(id);
    if (!e) {
      router.replace("/hr/employees");
      return;
    }
    setForm(employeeToForm(e));
    setCode(e.employeeCode);
  }, [id, router]);

  if (!form) return null;

  return (
    <HrFormLayout
      mode="view"
      title="View Employee"
      breadcrumb={[
        { label: "HR", href: "/hr/employees" },
        { label: "Employee Master", href: "/hr/employees" },
      ]}
      code={code}
      subtitle={form.employeeName}
    >
      <div className="flex justify-end mb-2">
        <Button
          size="sm"
          className="h-8 text-xs"
          variant="outline"
          onClick={() => router.push(`/hr/employees/${id}/edit`)}
        >
          Edit
        </Button>
      </div>
      <EmployeeMasterForm form={form} onChange={() => {}} employeeCode={code} readOnly excludeId={id} />
    </HrFormLayout>
  );
}
