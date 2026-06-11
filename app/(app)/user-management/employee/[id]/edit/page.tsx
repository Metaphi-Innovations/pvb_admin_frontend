"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { CheckCircle2, XCircle, X } from "lucide-react";
import EmployeeForm from "../../components/EmployeeForm";
import { type Employee, loadEmployees, saveEmployees } from "../../employee-data";
import { cn } from "@/lib/utils";

const DEPARTMENTS = [
  { id: 1, name: "Sales" },
  { id: 2, name: "HR" },
  { id: 3, name: "Accounts" },
  { id: 4, name: "Procurement" },
  { id: 5, name: "Field Force" },
  { id: 6, name: "Operations" },
];

interface ToastState { msg: string; type: "success" | "error" }

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className={cn(
      "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
      "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
      toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
    )}>
      {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = parseInt(params.id as string, 10);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const emp = loadEmployees().find(e => e.id === employeeId);
    if (emp) setEmployee(emp);
    else {
      setToast({ msg: "User not found", type: "error" });
      setTimeout(() => router.push("/user-management/employee"), 1500);
    }
  }, [employeeId, router]);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSave = (updated: Employee) => {
    const others = loadEmployees().filter(e => e.id !== updated.id);
    saveEmployees([...others, updated]);
    setToast({ msg: "User updated successfully", type: "success" });
    setTimeout(() => router.push(`/user-management/employee/${updated.id}`), 1500);
  };

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground text-sm">Loading user…</p>
      </div>
    );
  }

  return (
    <>
      <EmployeeForm
        mode="edit"
        employee={employee}
        onSave={handleSave}
        onCancel={() => router.push(`/user-management/employee/${employeeId}`)}
        departments={DEPARTMENTS}
      />
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
