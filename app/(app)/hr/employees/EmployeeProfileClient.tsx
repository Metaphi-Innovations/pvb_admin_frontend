"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MoreHorizontal,
  Briefcase,
  Building2,
  MapPin,
  User,
  Calendar,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  getHrEmployeeById,
  updateHrEmployee,
  type HrEmployee,
} from "./employee-master-data";
import {
  PROFILE_NAV_SECTIONS,
  formatDateDisplay,
  getBranchDisplayLabel,
  getEmployeeProfileCompletion,
  getEmployeeTypeLabel,
  type ProfileSectionId,
} from "./employee-display";
import {
  EmployeeAvatar,
  EmploymentStatusChip,
  ProfileCompletionCell,
} from "./components/EmployeeStatusChips";
import {
  BankDetailsSection,
  DocumentsSection,
  EducationSection,
  EmploymentDetailsSection,
  ExperienceSection,
  GovernmentIdsSection,
  PersonalDetailsSection,
} from "./components/EmployeeProfileSections";
import {
  AttendanceProfileSection,
  HrLettersProfileSection,
  LeaveBalanceProfileSection,
  OffboardingProfileSection,
  OnboardingProfileSection,
  SalaryPayrollProfileSection,
  TimelineProfileSection,
} from "./components/EmployeeProfileOperationalSections";
import type { ProfileSectionEditor } from "./components/employee-form-ui";

const EDIT_MODE_SECTIONS: ProfileSectionId[] = [
  "personal",
  "employment",
  "bank",
  "government-ids",
  "education",
  "experience",
];

const SECTION_UPDATE_LABEL: Partial<Record<ProfileSectionId, string>> = {
  personal: "Personal Details updated successfully.",
  employment: "Employment Details updated successfully.",
  bank: "Bank Details updated successfully.",
  "government-ids": "Government / Statutory IDs updated successfully.",
  education: "Education updated successfully.",
  experience: "Experience updated successfully.",
};

function ProfileToast({
  msg,
  onDismiss,
}: {
  msg: string;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl bg-emerald-600 text-white text-sm font-medium animate-in slide-in-from-bottom-2 fade-in-0 duration-300">
      <span>{msg}</span>
      <button type="button" className="opacity-80 hover:opacity-100 ml-1" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

type PendingNav =
  | { type: "section"; id: ProfileSectionId }
  | { type: "exit" }
  | null;

export default function EmployeeProfileClient({
  employeeId,
  initialEditMode = false,
}: {
  employeeId: number;
  /** When true (e.g. `/hr/employees/[id]/edit`), open full profile Edit Mode. */
  initialEditMode?: boolean;
}) {
  const router = useRouter();
  const [employee, setEmployee] = useState<HrEmployee | null | undefined>(undefined);
  const [section, setSection] = useState<ProfileSectionId>("personal");
  const [toast, setToast] = useState<string | null>(null);
  const [profileEditMode, setProfileEditMode] = useState(initialEditMode);
  const [sectionDirty, setSectionDirty] = useState(false);
  const [pendingNav, setPendingNav] = useState<PendingNav>(null);
  const [pendingListAdd, setPendingListAdd] = useState<"education" | "experience" | null>(null);
  const sectionEditorRef = useRef<ProfileSectionEditor | null>(null);
  const fromEditRoute = initialEditMode;

  const registerSectionEditor = useCallback((editor: ProfileSectionEditor | null) => {
    sectionEditorRef.current = editor;
  }, []);

  const refresh = useCallback(() => {
    setEmployee(getHrEmployeeById(employeeId) ?? null);
  }, [employeeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setProfileEditMode(initialEditMode);
    setSectionDirty(false);
    setPendingNav(null);
    setPendingListAdd(null);
    setSection("personal");
    sectionEditorRef.current = null;
  }, [employeeId, initialEditMode]);

  const enterEditMode = useCallback((listAdd?: "education" | "experience") => {
    setProfileEditMode(true);
    if (listAdd) setPendingListAdd(listAdd);
  }, []);

  /** Consume one-shot list-add intent so sections do not re-open add after save. */
  useEffect(() => {
    if (!pendingListAdd) return;
    const t = window.setTimeout(() => setPendingListAdd(null), 50);
    return () => window.clearTimeout(t);
  }, [pendingListAdd, section]);

  const exitEditMode = useCallback(() => {
    setProfileEditMode(false);
    setSectionDirty(false);
    setPendingListAdd(null);
    if (fromEditRoute) {
      router.replace(`/hr/employees/${employeeId}`);
    }
  }, [fromEditRoute, employeeId, router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleDirtyChange = useCallback((dirty: boolean) => {
    setSectionDirty(dirty);
  }, []);

  const handleSave = (patch: Partial<HrEmployee>, successMsg?: string) => {
    const next = updateHrEmployee(employeeId, patch);
    if (next) {
      setEmployee(next);
      setSectionDirty(false);
      if (successMsg) setToast(successMsg);
    }
  };

  const applyPendingNav = (nav: PendingNav) => {
    if (!nav) return;
    if (nav.type === "section") {
      sectionEditorRef.current?.discard();
      setSection(nav.id);
      setPendingListAdd(null);
    }
    if (nav.type === "exit") {
      sectionEditorRef.current?.discard();
      exitEditMode();
    }
    setPendingNav(null);
  };

  const requestSectionChange = (next: ProfileSectionId) => {
    if (next === section) return;
    if (profileEditMode && sectionDirty && EDIT_MODE_SECTIONS.includes(section)) {
      setPendingNav({ type: "section", id: next });
      return;
    }
    setSection(next);
    setSectionDirty(false);
    setPendingListAdd(null);
  };

  /** Exit Employee Profile Edit Mode. Confirms only when the active section is dirty. */
  const requestCancelEditMode = () => {
    if (sectionDirty && EDIT_MODE_SECTIONS.includes(section)) {
      setPendingNav({ type: "exit" });
      return;
    }
    sectionEditorRef.current?.discard();
    exitEditMode();
  };

  /** Saves the active master-data section only. Does NOT exit Employee Edit Mode. */
  const requestHeaderUpdate = () => {
    if (!EDIT_MODE_SECTIONS.includes(section)) {
      setToast("This section is not editable in Employee Edit Mode.");
      return;
    }
    if (!sectionDirty) return;
    if (!sectionEditorRef.current) {
      setSectionDirty(false);
      return;
    }
    const hadPendingChanges = sectionDirty;
    const ok = sectionEditorRef.current.save();
    if (!ok) return;
    setSectionDirty(false);
    // Form sections always persist on Update; list sections toast only when a draft was open
    if (
      section === "education" ||
      section === "experience"
    ) {
      if (hadPendingChanges) {
        setToast(SECTION_UPDATE_LABEL[section] ?? "Employee details updated successfully.");
      }
      return;
    }
    setToast(SECTION_UPDATE_LABEL[section] ?? "Employee details updated successfully.");
    // Intentionally keep profileEditMode === true
  };

  const isExitConfirm = pendingNav?.type === "exit";
  const canUpdate =
    profileEditMode &&
    sectionDirty &&
    EDIT_MODE_SECTIONS.includes(section);

  if (employee === undefined) {
    return (
      <div className="rounded-xl border border-border bg-white p-8 animate-pulse space-y-4">
        <div className="h-14 w-14 rounded-full bg-muted" />
        <div className="h-4 bg-muted rounded w-48" />
        <div className="h-3 bg-muted rounded w-72" />
      </div>
    );
  }

  if (employee === null) {
    return (
      <div className="rounded-xl border border-border bg-white p-10 text-center space-y-3">
        <p className="text-sm font-semibold text-foreground">Employee not found</p>
        <p className="text-xs text-muted-foreground">
          This record may have been removed or the link is invalid.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => router.push("/hr/employees")}
        >
          Back to Employees
        </Button>
      </div>
    );
  }

  const completion = getEmployeeProfileCompletion(employee);
  const editModeActive = profileEditMode;

  return (
    <div className="flex flex-col gap-3 w-full max-w-[1400px]">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Link href="/hr/employees" className="hover:text-brand-700 font-medium">
          Employees
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold truncate">{employee.employeeName}</span>
      </nav>

      <div
        className={cn(
          "rounded-xl border border-border bg-white shadow-sm p-4",
          employee.status === "inactive" && "opacity-95",
        )}
      >
        <div className="flex flex-wrap items-start gap-4">
          <EmployeeAvatar name={employee.employeeName} size="lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground leading-tight">
                {employee.employeeName}
              </h1>
              <EmploymentStatusChip status={employee.employmentStatus} />
              {profileEditMode && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-brand-50 text-brand-700 border border-brand-200">
                  Edit Mode
                </span>
              )}
            </div>
            <p className="font-mono text-xs font-semibold text-foreground">{employee.employeeCode}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> {employee.designation || "—"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {employee.department || "—"}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {getBranchDisplayLabel(employee.branch)}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="w-3 h-3" /> {employee.reportingManagerName || "—"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Joined {formatDateDisplay(employee.dateOfJoining)}
              </span>
              <span>{getEmployeeTypeLabel(employee.employeeType)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <span className="text-[11px] text-muted-foreground">Profile completion</span>
              <ProfileCompletionCell percent={completion.percent} />
              <span className="text-[11px] text-muted-foreground">
                {completion.filled}/{completion.total} fields
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => router.push("/hr/employees")}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Directory
            </Button>
            {profileEditMode ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={requestCancelEditMode}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                  onClick={requestHeaderUpdate}
                  disabled={!canUpdate}
                >
                  Update
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
                onClick={() => setProfileEditMode(true)}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  More actions
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-xs">
                  Change Status
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="text-xs">
                  Send Invitation
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="text-xs">
                  Start Offboarding
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="text-xs">
                  Generate Letter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 min-h-0">
        <aside className="lg:w-52 shrink-0">
          <nav
            aria-label="Employee profile sections"
            className="rounded-xl border border-border bg-white shadow-sm overflow-hidden lg:sticky lg:top-2"
          >
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/20">
              Profile
            </p>
            <ul className="py-1 max-h-[min(70vh,640px)] overflow-y-auto flex lg:flex-col overflow-x-auto lg:overflow-x-visible">
              {PROFILE_NAV_SECTIONS.map((item) => {
                const active = section === item.id;
                return (
                  <li key={item.id} className="shrink-0 lg:shrink">
                    <button
                      type="button"
                      onClick={() => requestSectionChange(item.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap lg:whitespace-normal",
                        "border-l-2 lg:border-l-2 border-b-2 lg:border-b-0",
                        active
                          ? "bg-brand-50 text-brand-700 border-brand-600"
                          : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main className="flex-1 min-w-0 rounded-xl border border-border bg-white shadow-sm p-4 sm:p-5">
          {section === "personal" && (
            <PersonalDetailsSection
              employee={employee}
              onSave={handleSave}
              editMode={editModeActive}
              onDirtyChange={handleDirtyChange}
              onRegisterEditor={registerSectionEditor}
            />
          )}
          {section === "employment" && (
            <EmploymentDetailsSection
              employee={employee}
              onSave={handleSave}
              editMode={editModeActive}
              onDirtyChange={handleDirtyChange}
              onRegisterEditor={registerSectionEditor}
            />
          )}
          {section === "bank" && (
            <BankDetailsSection
              employee={employee}
              onSave={handleSave}
              editMode={editModeActive}
              onDirtyChange={handleDirtyChange}
              onRegisterEditor={registerSectionEditor}
              onRequestEdit={() => enterEditMode()}
            />
          )}
          {section === "government-ids" && (
            <GovernmentIdsSection
              employee={employee}
              onSave={handleSave}
              editMode={editModeActive}
              onDirtyChange={handleDirtyChange}
              onRegisterEditor={registerSectionEditor}
              onRequestEdit={() => enterEditMode()}
            />
          )}
          {section === "education" && (
            <EducationSection
              employee={employee}
              onSave={handleSave}
              editMode={editModeActive}
              onDirtyChange={handleDirtyChange}
              onRegisterEditor={registerSectionEditor}
              onRequestEdit={() => enterEditMode("education")}
              autoStartAdd={pendingListAdd === "education"}
            />
          )}
          {section === "experience" && (
            <ExperienceSection
              employee={employee}
              onSave={handleSave}
              editMode={editModeActive}
              onDirtyChange={handleDirtyChange}
              onRegisterEditor={registerSectionEditor}
              onRequestEdit={() => enterEditMode("experience")}
              autoStartAdd={pendingListAdd === "experience"}
            />
          )}
          {section === "documents" && (
            <DocumentsSection employee={employee} onSave={handleSave} />
          )}
          {section === "onboarding" && <OnboardingProfileSection employee={employee} />}
          {section === "attendance" && (
            <AttendanceProfileSection employee={employee} onEmployeeUpdated={refresh} />
          )}
          {section === "payroll" && (
            <SalaryPayrollProfileSection employee={employee} onEmployeeUpdated={refresh} />
          )}
          {section === "leave" && <LeaveBalanceProfileSection employee={employee} />}
          {section === "letters" && <HrLettersProfileSection employee={employee} />}
          {section === "offboarding" && <OffboardingProfileSection employee={employee} />}
          {section === "timeline" && <TimelineProfileSection employee={employee} />}
        </main>
      </div>

      <Dialog open={!!pendingNav} onOpenChange={(o) => !o && setPendingNav(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {isExitConfirm ? "Discard unsaved changes?" : "You have unsaved changes."}
            </DialogTitle>
            <DialogDescription className="pt-1 text-xs">
              {isExitConfirm
                ? "You have unsaved changes in this employee profile. If you exit now, those changes will be lost."
                : "You have unsaved changes. Stay to continue editing, or discard them to continue. Use Update in the header to save first."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setPendingNav(null)}
            >
              Stay
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => {
                setSectionDirty(false);
                applyPendingNav(pendingNav);
              }}
            >
              {isExitConfirm ? "Discard & Exit" : "Discard & Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <ProfileToast msg={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
