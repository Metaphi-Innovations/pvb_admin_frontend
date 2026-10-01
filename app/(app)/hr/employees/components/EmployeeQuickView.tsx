"use client";

import React from "react";
import Link from "next/link";
import { Pencil, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import type { HrEmployee } from "../employee-master-data";
import {
  formatDateDisplay,
  getBranchDisplayLabel,
  getEmployeeProfileCompletion,
  getEmployeeTypeLabel,
} from "../employee-display";
import {
  EmployeeAvatar,
  EmploymentStatusChip,
  ProfileCompletionCell,
} from "./EmployeeStatusChips";

export function EmployeeQuickView({
  employee,
  open,
  onOpenChange,
}: {
  employee: HrEmployee | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const completion = employee ? getEmployeeProfileCompletion(employee) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-[520px] sm:max-w-[520px] flex flex-col">
        {employee && (
          <>
            <SheetHeader className="px-5 pt-5 pb-4 pr-12 border-b border-border">
              <div className="flex items-start gap-3">
                <EmployeeAvatar name={employee.employeeName} size="lg" />
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-base truncate">{employee.employeeName}</SheetTitle>
                  <SheetDescription className="font-mono text-xs mt-0.5">
                    {employee.employeeCode}
                  </SheetDescription>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <EmploymentStatusChip status={employee.employmentStatus} />
                    <span className="text-[11px] text-muted-foreground truncate">
                      {employee.designation}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">{employee.department}</p>
                </div>
              </div>
            </SheetHeader>

            <SheetBody className="px-5 py-4 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">
                  Quick facts
                </p>
                <dl className="grid grid-cols-1 gap-2.5 text-xs">
                  <Fact label="Branch" value={getBranchDisplayLabel(employee.branch)} />
                  <Fact label="Reporting Manager" value={employee.reportingManagerName || "—"} />
                  <Fact label="Employee Type" value={getEmployeeTypeLabel(employee.employeeType)} />
                  <Fact label="Date of Joining" value={formatDateDisplay(employee.dateOfJoining)} />
                  <Fact label="Company Email" value={employee.emailId || "—"} />
                  <Fact label="Mobile" value={employee.mobileNumber || "—"} />
                  <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/50">
                    <dt className="text-muted-foreground shrink-0">Profile Completion</dt>
                    <dd>
                      {completion && <ProfileCompletionCell percent={completion.percent} />}
                    </dd>
                  </div>
                </dl>
              </div>
            </SheetBody>

            <SheetFooter className="px-5 py-3 gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
                <Link href={`/hr/employees/${employee.id}/edit`} onClick={() => onOpenChange(false)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit Employee
                </Link>
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white" asChild>
                <Link href={`/hr/employees/${employee.id}`} onClick={() => onOpenChange(false)}>
                  <ExternalLink className="w-3.5 h-3.5" /> Open Full Profile
                </Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/50">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="font-medium text-foreground text-right break-all">{value}</dd>
    </div>
  );
}
