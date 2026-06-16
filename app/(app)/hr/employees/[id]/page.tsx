"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Briefcase, Building2 } from "lucide-react";
import { RecordDetailPage, OVERVIEW_TAB, type RecordDetailSidebarProps } from "@/components/record-detail";
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
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const e = getHrEmployeeById(id);
    if (!e) {
      router.replace("/hr/employees");
      return;
    }
    setForm(employeeToForm(e));
    setCode(e.employeeCode);
    setStatus(e.status);
  }, [id, router]);

  if (!form) return null;

  const sidebar: RecordDetailSidebarProps = {
    summary: [
      { label: "Department", value: form.department || "—" },
      { label: "Designation", value: form.designation || "—" },
      { label: "Branch", value: form.branch || "—" },
      { label: "Employment Status", value: form.employmentStatus || "—" },
      { label: "Date of Joining", value: form.dateOfJoining || "—" },
      { label: "Email", value: form.emailId || "—" },
      { label: "Mobile", value: form.mobileNumber ? `${form.mobileCountryCode} ${form.mobileNumber}` : "—" },
    ],
  };

  return (
    <RecordDetailPage
      listHref="/hr/employees"
      listLabel="Employees"
      recordName={form.employeeName}
      recordCode={code}
      statusLabel={status === "active" ? "Active" : "Inactive"}
      statusVariant={status === "active" ? "active" : "inactive"}
      metaItems={[
        { icon: Building2, label: form.department || "—" },
        { icon: Briefcase, label: form.designation || "—" },
      ]}
      tabs={[OVERVIEW_TAB]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEdit={() => router.push(`/hr/employees/${id}/edit`)}
      sidebar={sidebar}
    >
      {activeTab === "overview" && (
        <EmployeeMasterForm form={form} onChange={() => {}} employeeCode={code} readOnly excludeId={id} />
      )}
    </RecordDetailPage>
  );
}
