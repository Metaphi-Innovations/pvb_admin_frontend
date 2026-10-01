"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_EMPLOYEE_FORM,
  createHrEmployeeFromForm,
  generateEmployeeCode,
  getEmployeeCreateFormErrors,
  type HrEmployeeFormErrors,
  type HrEmployeeFormValues,
} from "../employee-master-data";
import { createHrNotification } from "@/lib/hr/hr-notifications";
import { EmployeeCreateForm } from "./EmployeeCreateForm";

export function EmployeeCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (employeeId: number) => void;
}) {
  const [form, setForm] = useState<HrEmployeeFormValues>(DEFAULT_EMPLOYEE_FORM);
  const [errors, setErrors] = useState<HrEmployeeFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const submitLock = useRef(false);

  useEffect(() => {
    if (!open) return;
    setForm({ ...DEFAULT_EMPLOYEE_FORM, employeeCode: generateEmployeeCode(), status: "active" });
    setErrors({});
    setFormError(null);
    setSubmitting(false);
    submitLock.current = false;
  }, [open]);

  const close = () => {
    if (submitting) return;
    onOpenChange(false);
  };

  const scrollToFirstError = () => {
    const root = bodyRef.current;
    if (!root) return;
    const target =
      root.querySelector<HTMLElement>("[aria-invalid='true']") ??
      root.querySelector<HTMLElement>(".text-red-500");
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const submit = () => {
    if (submitLock.current || submitting) return;
    submitLock.current = true;
    setSubmitting(true);
    setFormError(null);

    try {
      const nextErrors = getEmployeeCreateFormErrors(form);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        const first = Object.values(nextErrors)[0] ?? "Please complete the required fields.";
        setFormError(first);
        setSubmitting(false);
        submitLock.current = false;
        requestAnimationFrame(scrollToFirstError);
        return;
      }

      const rec = createHrEmployeeFromForm(form);
      createHrNotification({
        eventType: "employee_created",
        employeeId: rec.id,
        sourceModule: "employees",
        sourceId: String(rec.id),
        context: {
          employee_name: rec.employeeName,
          employee_code: rec.employeeCode,
        },
      });
      createHrNotification({
        eventType: "onboarding_started",
        employeeId: rec.id,
        sourceModule: "onboarding",
        sourceId: String(rec.id),
        context: {
          employee_name: rec.employeeName,
          employee_code: rec.employeeCode,
          joining_date: rec.dateOfJoining,
        },
      });
      onOpenChange(false);
      onCreated(rec.id);
    } catch (err) {
      console.error("[HR Employees] create employee failed:", err);
      setFormError("Unable to create employee. Please try again.");
      setSubmitting(false);
      submitLock.current = false;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) onOpenChange(next);
      }}
    >
      <DialogContent
        className={cn(
          "w-[calc(100%-1.5rem)] max-w-[680px] max-h-[85vh]",
          "flex flex-col gap-0 p-0 overflow-hidden rounded-[18px]",
          "translate-y-[-50%]",
        )}
      >
        <div className="flex-shrink-0 flex items-start gap-3 px-5 pt-5 pb-3.5 border-b border-border pr-12">
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="w-8 h-8 mt-0.5 flex items-center justify-center rounded-lg border border-border hover:bg-muted/40 flex-shrink-0 disabled:opacity-50"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="min-w-0 pt-0.5">
            <DialogTitle className="text-base font-semibold text-foreground leading-tight">
              Add Employee
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Enter the essential employee details to create the profile.
            </DialogDescription>
          </div>
        </div>

        <div
          ref={bodyRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 pb-6"
        >
          {formError && (
            <div
              role="alert"
              className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            >
              {formError}
            </div>
          )}
          <EmployeeCreateForm
            form={form}
            onChange={(f) => {
              setForm(f);
              if (Object.keys(errors).length || formError) {
                setErrors({});
                setFormError(null);
              }
            }}
            errors={errors}
          />
        </div>

        <div className="flex-shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-muted/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 text-sm px-4"
            onClick={close}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 text-sm px-4 bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-70"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "Creating…" : "Create Employee"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
