"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Camera,
  Globe2,
  Hash,
  CreditCard,
  Landmark,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import {
  EMPLOYMENT_STATUS_OPTIONS,
} from "@/lib/hr/config";
import { cn } from "@/lib/utils";
import {
  getBranchSelectOptions,
  getDepartmentSelectOptions,
  getDesignationSelectOptions,
  getEmployeeTypeSelectOptions,
  getEmploymentStatusSelectOptions,
} from "@/app/(app)/hr/settings/organization-data";
import {
  getDefaultLeavePolicy,
  getEmployeeLeavePolicyId,
  getLeavePolicyById,
  getLeavePolicySelectOptions,
  setEmployeeLeavePolicy,
} from "@/app/(app)/hr/settings/leave-data";
import {
  ACCOUNT_TYPE_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  EMPTY_BANK,
  EMPTY_CONTACT,
  EMPTY_EMERGENCY,
  EMPTY_EMPLOYMENT_EXTRA,
  EMPTY_GOVERNMENT_IDS,
  EMPTY_PERSONAL,
  MARITAL_OPTIONS,
  RELATIONSHIP_OPTIONS,
  getActiveHrEmployees,
  isEmployeeCodeUnique,
  maskAadhaar,
  maskAccountNumber,
  newProfileRecordId,
  type EmployeeAddress,
  type EmployeeBankDetails,
  type EmployeeContactDetails,
  type EmployeeEducationRecord,
  type EmployeeEmergencyContact,
  type EmployeeEmploymentExtra,
  type EmployeeExperienceRecord,
  type EmployeeGovernmentIds,
  type EmployeePersonalDetails,
  type HrEmployee,
} from "../employee-master-data";
import {
  formatDateDisplay,
  getBranchDisplayLabel,
  getEmployeeTypeLabel,
} from "../employee-display";
import {
  EmpField,
  EmpFormActions,
  EmpFormPanel,
  EmpInput,
  EmpSection,
  EmpTextarea,
  EmptyProfileState,
  EMP_LABEL,
  EMP_SELECT_CONTENT,
  EMP_SELECT_ITEM,
  EMP_SELECT_TRIGGER,
  EMP_SUBHEAD,
  EMP_TEXT,
  type EmpControlWidth,
  ProfileSectionHeader,
  type ProfileSectionEditor,
} from "./employee-form-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmploymentStatusChip } from "./EmployeeStatusChips";
import { HrDateInput, HrYearSelect } from "@/app/(app)/hr/components/HrDateInput";
import {
  EmpGenderSelect,
  EmpIconInput,
  EmpNationalitySelect,
  EmpPhoneField,
  formatPhoneDisplay,
  nationalPhoneDigits,
  validatePhoneNumber,
} from "@/app/(app)/hr/components/hr-employee-form-controls";
import {
  ensurePostalMasterReady,
  isValidPincodeFormat,
  lookupPostalPincode,
} from "@/lib/address/postal-lookup";

function ReadGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">{children}</div>;
}

function ReadField({
  label,
  value,
  mono,
  node,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  node?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className={cn(EMP_LABEL, "text-muted-foreground")}>{label}</p>
      {node ?? (
        <p className={cn(EMP_TEXT, "text-foreground mt-0.5 truncate", mono && "font-mono text-brand-700")}>
          {value && value.trim() ? value : "—"}
        </p>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className={cn(EMP_SUBHEAD, "mb-3")}>{children}</p>
  );
}

function AddressReadGrid({ address }: { address?: EmployeeAddress }) {
  const a = address ?? {
    line1: "",
    line2: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
  };
  return (
    <ReadGrid>
      <ReadField label="Address Line 1" value={a.line1} />
      <ReadField label="Address Line 2" value={a.line2} />
      <ReadField label="City" value={a.city} />
      <ReadField label="State" value={a.state} />
      <ReadField label="Country" value={a.country} />
      <ReadField label="PIN Code" value={a.pincode} />
    </ReadGrid>
  );
}

function AddressEditFields({
  address,
  onChange,
  onPatch,
}: {
  address: EmployeeAddress;
  onChange: (key: keyof EmployeeAddress, value: string) => void;
  /** Patch multiple keys (PIN autofill) */
  onPatch?: (patch: Partial<EmployeeAddress>) => void;
}) {
  React.useEffect(() => {
    void ensurePostalMasterReady();
  }, []);

  const applyPincode = (raw: string) => {
    const pin = raw.replace(/\D/g, "").slice(0, 6);
    onChange("pincode", pin);
    if (!isValidPincodeFormat(pin)) return;
    const loc = lookupPostalPincode(pin);
    if (!loc) return;
    onPatch?.({
      pincode: pin,
      city: loc.city || address.city,
      state: loc.state || address.state,
      country: address.country || "India",
    });
  };

  return (
    <>
      <EmpField label="Address Line 1" width="full">
        <EmpIconInput
          icon={MapPin}
          value={address.line1}
          onChange={(e) => onChange("line1", e.target.value)}
          placeholder="Flat / House No., Building, Street"
        />
      </EmpField>
      <EmpField label="Address Line 2" width="full">
        <EmpIconInput
          icon={MapPin}
          value={address.line2}
          onChange={(e) => onChange("line2", e.target.value)}
          placeholder="Area, Landmark"
        />
      </EmpField>
      <EmpField label="PIN Code" width="compact">
        <EmpIconInput
          icon={Hash}
          value={address.pincode}
          onChange={(e) => applyPincode(e.target.value)}
          placeholder="e.g. 400086"
          inputMode="numeric"
          maxLength={6}
        />
      </EmpField>
      <EmpField label="City" width="small">
        <EmpIconInput
          icon={Building2}
          value={address.city}
          onChange={(e) => onChange("city", e.target.value)}
          placeholder="City"
        />
      </EmpField>
      <EmpField label="State" width="small">
        <EmpIconInput
          icon={MapPin}
          value={address.state}
          onChange={(e) => onChange("state", e.target.value)}
          placeholder="State"
        />
      </EmpField>
      <EmpField label="Country" width="small">
        <EmpIconInput
          icon={Globe2}
          value={address.country}
          onChange={(e) => onChange("country", e.target.value)}
          placeholder="India"
        />
      </EmpField>
    </>
  );
}

function SimpleSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  allowEmpty,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly (string | { value: string; label: string })[];
  placeholder?: string;
  allowEmpty?: boolean;
  /** Ignored — parent EmpField owns grid span; control always fills its cell. */
  width?: EmpControlWidth;
}) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <Select
      value={value || (allowEmpty ? "__none__" : undefined)}
      onValueChange={(v) => onChange(v === "__none__" ? "" : v)}
    >
      <SelectTrigger className={cn(EMP_SELECT_TRIGGER, "w-full")}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={EMP_SELECT_CONTENT} position="popper">
        {allowEmpty && (
          <SelectItem value="__none__" className={EMP_SELECT_ITEM}>
            {placeholder}
          </SelectItem>
        )}
        {opts.map((o) => (
          <SelectItem key={o.value} value={o.value} className={EMP_SELECT_ITEM}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ─── Personal (includes contact, emergency, addresses) ─── */

export function PersonalDetailsSection({
  employee,
  onSave,
  editMode,
  onDirtyChange,
  onRegisterEditor,
}: {
  employee: HrEmployee;
  onSave: (patch: Partial<HrEmployee>, successMsg?: string) => void;
  editMode: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterEditor?: (editor: ProfileSectionEditor | null) => void;
}) {
  const [personal, setPersonal] = useState<EmployeePersonalDetails>(EMPTY_PERSONAL());
  const [contact, setContact] = useState<EmployeeContactDetails>(EMPTY_CONTACT());
  const [emergency, setEmergency] = useState<EmployeeEmergencyContact>(EMPTY_EMERGENCY());
  const [name, setName] = useState(employee.employeeName);
  const [mobile, setMobile] = useState(employee.mobileNumber);
  const [companyEmail, setCompanyEmail] = useState(employee.emailId);
  const [photoDataUrl, setPhotoDataUrl] = useState(employee.photoDataUrl ?? "");
  const [err, setErr] = useState<string | null>(null);

  const resetFromEmployee = () => {
    setPersonal({ ...EMPTY_PERSONAL(), ...employee.personal });
    setContact({ ...EMPTY_CONTACT(), ...employee.contact });
    const emSrc = employee.emergency;
    setEmergency({
      contactName: emSrc?.contactName ?? "",
      relationship: emSrc?.relationship ?? "",
      mobileNumber: emSrc?.mobileNumber ?? "",
      alternateNumber: emSrc?.alternateNumber ?? "",
    });
    setName(employee.employeeName);
    setMobile(employee.mobileNumber);
    setCompanyEmail(employee.emailId);
    setPhotoDataUrl(employee.photoDataUrl ?? "");
    setErr(null);
  };

  useEffect(() => {
    resetFromEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when stored employee changes
  }, [employee]);

  useEffect(() => {
    if (!editMode) {
      resetFromEmployee();
      onDirtyChange?.(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when edit mode toggles
  }, [editMode]);

  useEffect(() => {
    if (!editMode) return;
    const baselineContact = { ...EMPTY_CONTACT(), ...employee.contact };
    const baselinePersonal = { ...EMPTY_PERSONAL(), ...employee.personal };
    const baselineEmergency = {
      contactName: employee.emergency?.contactName ?? "",
      relationship: employee.emergency?.relationship ?? "",
      mobileNumber: employee.emergency?.mobileNumber ?? "",
      alternateNumber: employee.emergency?.alternateNumber ?? "",
    };
    const dirty =
      name.trim() !== employee.employeeName.trim() ||
      mobile.trim() !== employee.mobileNumber.trim() ||
      companyEmail.trim() !== employee.emailId.trim() ||
      (photoDataUrl || "") !== (employee.photoDataUrl ?? "") ||
      JSON.stringify(personal) !== JSON.stringify(baselinePersonal) ||
      JSON.stringify(contact) !== JSON.stringify(baselineContact) ||
      JSON.stringify(emergency) !== JSON.stringify(baselineEmergency);
    onDirtyChange?.(dirty);
  }, [
    editMode,
    name,
    mobile,
    companyEmail,
    photoDataUrl,
    personal,
    contact,
    emergency,
    employee,
    onDirtyChange,
  ]);

  const p = { ...EMPTY_PERSONAL(), ...employee.personal };
  const c = { ...EMPTY_CONTACT(), ...employee.contact };
  const em = { ...EMPTY_EMERGENCY(), ...employee.emergency };
  const permanentView = c.permanentSameAsCurrent ? c.currentAddress : c.permanentAddress;

  const onPhoto = (file: File | null) => {
    if (!file) {
      setPhotoDataUrl("");
      return;
    }
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  };

  const setCurrent = (key: keyof EmployeeAddress, value: string) =>
    setContact((prev) => {
      const currentAddress = { ...prev.currentAddress, [key]: value };
      return {
        ...prev,
        currentAddress,
        ...(prev.permanentSameAsCurrent ? { permanentAddress: { ...currentAddress } } : {}),
      };
    });

  const patchCurrent = (patch: Partial<EmployeeAddress>) =>
    setContact((prev) => {
      const currentAddress = { ...prev.currentAddress, ...patch };
      return {
        ...prev,
        currentAddress,
        ...(prev.permanentSameAsCurrent ? { permanentAddress: { ...currentAddress } } : {}),
      };
    });

  const setPermanent = (key: keyof EmployeeAddress, value: string) =>
    setContact({
      ...contact,
      permanentAddress: { ...contact.permanentAddress, [key]: value },
    });

  const patchPermanent = (patch: Partial<EmployeeAddress>) =>
    setContact({
      ...contact,
      permanentAddress: { ...contact.permanentAddress, ...patch },
    });

  const handleUpdate = (): boolean => {
    if (!name.trim()) {
      setErr("Full name is required.");
      return false;
    }
    const mobileDigits = nationalPhoneDigits(mobile);
    if (!mobileDigits) {
      setErr("Mobile number is required.");
      return false;
    }
    const phoneErr = validatePhoneNumber(mobileDigits, "+91");
    if (phoneErr) {
      setErr(phoneErr);
      return false;
    }
    const nextContact = { ...contact };
    if (nextContact.permanentSameAsCurrent) {
      nextContact.permanentAddress = { ...nextContact.currentAddress };
    }
    onSave({
      employeeName: name.trim(),
      mobileNumber: mobileDigits,
      emailId: companyEmail.trim(),
      photoDataUrl: photoDataUrl || undefined,
      personal,
      contact: {
        ...nextContact,
        alternateMobile: nationalPhoneDigits(nextContact.alternateMobile),
      },
      emergency: {
        contactName: emergency.contactName,
        relationship: emergency.relationship,
        mobileNumber: nationalPhoneDigits(emergency.mobileNumber),
        alternateNumber: nationalPhoneDigits(emergency.alternateNumber),
      },
    });
    return true;
  };

  useEffect(() => {
    if (!editMode) {
      onRegisterEditor?.(null);
      return;
    }
    onRegisterEditor?.({ save: handleUpdate, discard: resetFromEmployee });
    return () => onRegisterEditor?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, name, mobile, companyEmail, photoDataUrl, personal, contact, emergency, employee]);

  return (
    <div>
      <ProfileSectionHeader
        title="Personal Details"
        description="Basic, contact, emergency, and address information."
      />
      {err && editMode && <p className="text-xs text-red-600 mb-3">{err}</p>}

      {!editMode ? (
        <div className="space-y-6">
          <div>
            <SectionLabel>Basic Details</SectionLabel>
            <div className="flex items-start gap-4 mb-3">
              <div className="w-14 h-14 rounded-full border border-border bg-muted/30 overflow-hidden shrink-0 flex items-center justify-center">
                {employee.photoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={employee.photoDataUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <ReadGrid>
                <ReadField label="Full Name" value={employee.employeeName} />
                <ReadField label="Date of Birth" value={formatDateDisplay(p.dateOfBirth)} />
                <ReadField label="Gender" value={p.gender} />
                <ReadField label="Marital Status" value={p.maritalStatus} />
                <ReadField label="Blood Group" value={p.bloodGroup} />
                <ReadField label="Nationality" value={p.nationality} />
                <ReadField label="Father / Guardian Name" value={p.fatherName} />
                <ReadField label="Mother Name" value={p.motherName} />
              </ReadGrid>
            </div>
          </div>

          <div>
            <SectionLabel>Contact Details</SectionLabel>
            <ReadGrid>
              <ReadField label="Company Email" value={employee.emailId} />
              <ReadField label="Personal Email" value={c.personalEmail} />
              <ReadField
                label="Mobile Number"
                value={employee.mobileNumber ? formatPhoneDisplay("+91", nationalPhoneDigits(employee.mobileNumber)) : ""}
              />
              <ReadField
                label="Alternate Mobile Number"
                value={c.alternateMobile ? formatPhoneDisplay("+91", nationalPhoneDigits(c.alternateMobile)) : ""}
              />
            </ReadGrid>
          </div>

          <div>
            <SectionLabel>Emergency Contact</SectionLabel>
            <ReadGrid>
              <ReadField label="Emergency Contact Name" value={em.contactName} />
              <ReadField label="Relationship" value={em.relationship} />
              <ReadField
                label="Mobile Number"
                value={em.mobileNumber ? formatPhoneDisplay("+91", nationalPhoneDigits(em.mobileNumber)) : ""}
              />
              <ReadField
                label="Alternate Mobile Number"
                value={em.alternateNumber ? formatPhoneDisplay("+91", nationalPhoneDigits(em.alternateNumber)) : ""}
              />
            </ReadGrid>
          </div>

          <div>
            <SectionLabel>Current Address</SectionLabel>
            <AddressReadGrid address={c.currentAddress} />
          </div>

          <div>
            <SectionLabel>Permanent Address</SectionLabel>
            {c.permanentSameAsCurrent && (
              <p className="text-[11px] text-muted-foreground mb-2">Same as Current Address</p>
            )}
            <AddressReadGrid address={permanentView} />
          </div>
        </div>
      ) : (
        <EmpFormPanel className="space-y-4">
          <EmpSection title="Basic Details">
            <div className="col-span-12 flex items-center gap-3">
              <label className="relative cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
                />
                <span
                  className={cn(
                    "w-14 h-14 rounded-full border border-dashed border-border bg-muted/30",
                    "flex items-center justify-center overflow-hidden",
                    "group-hover:border-brand-400 group-hover:bg-brand-50/40 transition-colors",
                  )}
                >
                  {photoDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoDataUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-5 h-5 text-muted-foreground" />
                  )}
                </span>
              </label>
              <div>
                <p className={EMP_LABEL}>Profile Photo</p>
                <label className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline cursor-pointer mt-0.5">
                  <Upload className="w-3 h-3" />
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              {photoDataUrl && (
                <button
                  type="button"
                  className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => setPhotoDataUrl("")}
                >
                  Remove
                </button>
              )}
            </div>
            <EmpField label="Full Name" required width="wide">
              <EmpIconInput
                icon={User}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Vikram Mehta"
              />
            </EmpField>
            <EmpField label="Date of Birth" width="small">
              <HrDateInput
                value={personal.dateOfBirth}
                onChange={(v) => setPersonal({ ...personal, dateOfBirth: v })}
                aria-label="Date of Birth"
                placeholder="Select date"
              />
            </EmpField>
            <EmpField label="Gender" width="wide" fitContent>
              <EmpGenderSelect
                value={personal.gender}
                onChange={(v) => setPersonal({ ...personal, gender: v })}
              />
            </EmpField>
            <EmpField label="Marital Status" width="small">
              <SimpleSelect
                value={personal.maritalStatus}
                onChange={(v) => setPersonal({ ...personal, maritalStatus: v })}
                options={MARITAL_OPTIONS}
                allowEmpty
                width="full"
              />
            </EmpField>
            <EmpField label="Blood Group" width="small">
              <SimpleSelect
                value={personal.bloodGroup}
                onChange={(v) => setPersonal({ ...personal, bloodGroup: v })}
                options={BLOOD_GROUP_OPTIONS}
                allowEmpty
                placeholder="Select blood group"
                width="full"
              />
            </EmpField>
            <EmpField label="Nationality" width="medium">
              <EmpNationalitySelect
                value={personal.nationality}
                onChange={(v) => setPersonal({ ...personal, nationality: v })}
                placeholder="Select nationality"
                width="full"
              />
            </EmpField>
            <EmpField label="Father / Guardian Name" width="medium">
              <EmpIconInput
                icon={User}
                value={personal.fatherName}
                onChange={(e) => setPersonal({ ...personal, fatherName: e.target.value })}
                placeholder="Enter father or guardian name"
              />
            </EmpField>
            <EmpField label="Mother Name" width="medium">
              <EmpIconInput
                icon={User}
                value={personal.motherName}
                onChange={(e) => setPersonal({ ...personal, motherName: e.target.value })}
                placeholder="Enter mother name"
              />
            </EmpField>
          </EmpSection>

          <EmpSection title="Contact Details">
            <EmpField label="Company Email" width="wide">
              <EmpIconInput
                icon={Building2}
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </EmpField>
            <EmpField label="Personal Email" width="wide">
              <EmpIconInput
                icon={Mail}
                type="email"
                value={contact.personalEmail}
                onChange={(e) => setContact({ ...contact, personalEmail: e.target.value })}
                placeholder="e.g. vikram@gmail.com"
              />
            </EmpField>
            <EmpField label="Mobile Number" required width="medium">
              <EmpPhoneField
                value={mobile}
                onChange={setMobile}
                placeholder="98765 43210"
              />
            </EmpField>
            <EmpField label="Alternate Mobile Number" width="medium">
              <EmpPhoneField
                value={contact.alternateMobile}
                onChange={(v) => setContact({ ...contact, alternateMobile: v })}
                placeholder="98765 43210"
              />
            </EmpField>
          </EmpSection>

          <EmpSection title="Emergency Contact">
            <EmpField label="Emergency Contact Name" width="wide">
              <EmpIconInput
                icon={User}
                value={emergency.contactName}
                onChange={(e) => setEmergency({ ...emergency, contactName: e.target.value })}
                placeholder="e.g. Sangeeta Mehta"
              />
            </EmpField>
            <EmpField label="Relationship" width="small">
              <SimpleSelect
                value={emergency.relationship}
                onChange={(v) => setEmergency({ ...emergency, relationship: v })}
                options={RELATIONSHIP_OPTIONS}
                allowEmpty
                width="full"
              />
            </EmpField>
            <EmpField label="Mobile Number" width="medium">
              <EmpPhoneField
                value={emergency.mobileNumber}
                onChange={(v) => setEmergency({ ...emergency, mobileNumber: v })}
                placeholder="98765 43210"
              />
            </EmpField>
            <EmpField label="Alternate Mobile Number" width="medium">
              <EmpPhoneField
                value={emergency.alternateNumber}
                onChange={(v) => setEmergency({ ...emergency, alternateNumber: v })}
                placeholder="98765 43210"
              />
            </EmpField>
          </EmpSection>

          <EmpSection title="Current Address">
            <AddressEditFields
              address={contact.currentAddress}
              onChange={setCurrent}
              onPatch={patchCurrent}
            />
          </EmpSection>

          <EmpSection title="Permanent Address">
            <div className="col-span-12">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded accent-brand-600"
                  checked={contact.permanentSameAsCurrent}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setContact({
                      ...contact,
                      permanentSameAsCurrent: checked,
                      ...(checked
                        ? { permanentAddress: { ...contact.currentAddress } }
                        : {}),
                    });
                  }}
                />
                Same as Current Address
              </label>
            </div>
            {!contact.permanentSameAsCurrent && (
              <AddressEditFields
                address={contact.permanentAddress}
                onChange={setPermanent}
                onPatch={patchPermanent}
              />
            )}
          </EmpSection>
        </EmpFormPanel>
      )}
    </div>
  );
}

/* ─── Employment ─── */

export function EmploymentDetailsSection({
  employee,
  onSave,
  editMode,
  onDirtyChange,
  onRegisterEditor,
}: {
  employee: HrEmployee;
  onSave: (patch: Partial<HrEmployee>, successMsg?: string) => void;
  editMode: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterEditor?: (editor: ProfileSectionEditor | null) => void;
}) {
  const [codeError, setCodeError] = useState<string | null>(null);
  const [leavePolicyId, setLeavePolicyId] = useState<number | null>(null);
  const [policyTick, setPolicyTick] = useState(0);
  const [extra, setExtra] = useState<EmployeeEmploymentExtra>(EMPTY_EMPLOYMENT_EXTRA());
  const [core, setCore] = useState({
    employeeCode: employee.employeeCode,
    department: employee.department,
    designation: employee.designation,
    branch: employee.branch,
    reportingManagerId: employee.reportingManagerId as number | null,
    employeeType: employee.employeeType,
    employmentStatus: employee.employmentStatus,
    dateOfJoining: employee.dateOfJoining,
    emailId: employee.emailId,
  });

  const resetFromEmployee = () => {
    setExtra({ ...EMPTY_EMPLOYMENT_EXTRA(), ...employee.employmentExtra });
    const explicitPolicyId = getEmployeeLeavePolicyId(employee.employeeCode);
    setLeavePolicyId(explicitPolicyId ?? getDefaultLeavePolicy()?.id ?? null);
    setCore({
      employeeCode: employee.employeeCode,
      department: employee.department,
      designation: employee.designation,
      branch: employee.branch,
      reportingManagerId: employee.reportingManagerId,
      employeeType: employee.employeeType,
      employmentStatus: employee.employmentStatus,
      dateOfJoining: employee.dateOfJoining,
      emailId: employee.emailId,
    });
    setCodeError(null);
  };

  useEffect(() => {
    const refresh = () => setPolicyTick((t) => t + 1);
    window.addEventListener("hr-leave-policies-updated", refresh);
    window.addEventListener("hr-employee-leave-policy-updated", refresh);
    return () => {
      window.removeEventListener("hr-leave-policies-updated", refresh);
      window.removeEventListener("hr-employee-leave-policy-updated", refresh);
    };
  }, []);

  useEffect(() => {
    resetFromEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee, policyTick]);

  useEffect(() => {
    if (!editMode) {
      resetFromEmployee();
      onDirtyChange?.(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

  useEffect(() => {
    if (!editMode) return;
    const baselineExtra = { ...EMPTY_EMPLOYMENT_EXTRA(), ...employee.employmentExtra };
    const baselinePolicyId =
      getEmployeeLeavePolicyId(employee.employeeCode) ?? getDefaultLeavePolicy()?.id ?? null;
    const dirty =
      core.employeeCode !== employee.employeeCode ||
      core.department !== employee.department ||
      core.designation !== employee.designation ||
      core.branch !== employee.branch ||
      core.reportingManagerId !== employee.reportingManagerId ||
      core.employeeType !== employee.employeeType ||
      core.employmentStatus !== employee.employmentStatus ||
      core.dateOfJoining !== employee.dateOfJoining ||
      core.emailId !== employee.emailId ||
      leavePolicyId !== baselinePolicyId ||
      JSON.stringify(extra) !== JSON.stringify(baselineExtra);
    onDirtyChange?.(dirty);
  }, [editMode, core, extra, employee, leavePolicyId, onDirtyChange]);

  const x = { ...EMPTY_EMPLOYMENT_EXTRA(), ...employee.employmentExtra };
  const managers = getActiveHrEmployees().filter((e) => e.id !== employee.id);
  const employeeTypeOptions = useMemo(
    () => getEmployeeTypeSelectOptions({ includeInactiveValue: core.employeeType }),
    [core.employeeType],
  );

  const branchOptions = useMemo(
    () => getBranchSelectOptions({ includeCurrent: core.branch }),
    [core.branch],
  );
  const departmentOptions = useMemo(
    () => getDepartmentSelectOptions({ includeCurrent: core.department }),
    [core.department],
  );
  const designationOptions = useMemo(
    () => getDesignationSelectOptions({ includeCurrent: core.designation }),
    [core.designation],
  );
  const employmentStatusOptions = useMemo(() => {
    try {
      const fromMaster = getEmploymentStatusSelectOptions({
        includeInactiveValue: core.employmentStatus,
      });
      if (fromMaster.length > 0) return fromMaster;
    } catch {
      /* fall through */
    }
    return EMPLOYMENT_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
  }, [core.employmentStatus]);

  const leavePolicyOptions = useMemo(
    () =>
      getLeavePolicySelectOptions({
        includePolicyId: getEmployeeLeavePolicyId(employee.employeeCode),
      }).map((o) => ({
        value: String(o.value),
        label: o.label,
      })),
    [employee.employeeCode, policyTick],
  );

  const assignedLeavePolicy =
    getLeavePolicyById(leavePolicyId ?? 0) ??
    getLeavePolicyById(getEmployeeLeavePolicyId(employee.employeeCode) ?? 0) ??
    getDefaultLeavePolicy();

  const handleUpdate = (): boolean => {
    const code = core.employeeCode.trim();
    if (!code) {
      setCodeError("Employee code is required.");
      return false;
    }
    if (!isEmployeeCodeUnique(code, employee.id)) {
      setCodeError("This employee code is already in use.");
      return false;
    }
    if (core.reportingManagerId === employee.id) {
      setCodeError("An employee cannot report to themselves.");
      return false;
    }
    const mgr = core.reportingManagerId
      ? managers.find((m) => m.id === core.reportingManagerId)
      : undefined;
    if (leavePolicyId) {
      setEmployeeLeavePolicy(employee.employeeCode, leavePolicyId);
    }
    onSave({
      employeeCode: code,
      department: core.department,
      designation: core.designation,
      branch: core.branch,
      reportingManagerId: core.reportingManagerId,
      employeeType: core.employeeType,
      employmentStatus: core.employmentStatus,
      dateOfJoining: core.dateOfJoining,
      emailId: core.emailId,
      reportingManagerName:
        mgr?.employeeName ?? (core.reportingManagerId ? employee.reportingManagerName : "—"),
      employmentExtra: extra,
    });
    return true;
  };

  useEffect(() => {
    if (!editMode) {
      onRegisterEditor?.(null);
      return;
    }
    onRegisterEditor?.({ save: handleUpdate, discard: resetFromEmployee });
    return () => onRegisterEditor?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, core, extra, employee, leavePolicyId]);

  return (
    <div>
      <ProfileSectionHeader
        title="Employment Details"
        description="Role, org assignment, leave policy, and employment dates."
      />
      {!editMode ? (
        <ReadGrid>
          <ReadField label="Employee Code" value={employee.employeeCode} mono />
          <ReadField label="Company Email" value={employee.emailId} />
          <ReadField label="Branch" value={getBranchDisplayLabel(employee.branch)} />
          <ReadField label="Department" value={employee.department} />
          <ReadField label="Designation" value={employee.designation} />
          <ReadField label="Leave Policy" value={assignedLeavePolicy?.name ?? "—"} />
          <ReadField label="Reporting Manager" value={employee.reportingManagerName} />
          <ReadField label="Employee Type" value={getEmployeeTypeLabel(employee.employeeType)} />
          <ReadField
            label="Employment Status"
            node={<div className="mt-0.5"><EmploymentStatusChip status={employee.employmentStatus} /></div>}
          />
          <ReadField label="Date of Joining" value={formatDateDisplay(employee.dateOfJoining)} />
          <ReadField label="Probation End Date" value={formatDateDisplay(x.probationEndDate)} />
          <ReadField label="Confirmation Date" value={formatDateDisplay(x.confirmationDate)} />
          <ReadField label="Work Location" value={x.workLocation} />
        </ReadGrid>
      ) : (
        <EmpFormPanel>
          <EmpSection title="Employment">
            <EmpField label="Employee Code" required width="small" error={codeError ?? undefined}>
              <EmpIconInput
                icon={CreditCard}
                value={core.employeeCode}
                onChange={(e) => {
                  setCore({ ...core, employeeCode: e.target.value });
                  setCodeError(null);
                }}
                className="font-mono"
                placeholder="e.g. EMP-0002"
              />
            </EmpField>
            <EmpField label="Company Email" width="wide">
              <EmpInput
                type="email"
                value={core.emailId}
                onChange={(e) => setCore({ ...core, emailId: e.target.value })}
              />
            </EmpField>
            <EmpField label="Branch" width="medium">
              <SimpleSelect
                value={core.branch}
                onChange={(v) => setCore({ ...core, branch: v })}
                options={branchOptions}
              />
            </EmpField>
            <EmpField label="Department" width="medium">
              <SimpleSelect
                value={core.department}
                onChange={(v) => setCore({ ...core, department: v })}
                options={departmentOptions}
              />
            </EmpField>
            <EmpField label="Designation" width="medium">
              <SimpleSelect
                value={core.designation}
                onChange={(v) => setCore({ ...core, designation: v })}
                options={designationOptions}
              />
            </EmpField>
            <EmpField label="Leave Policy" width="medium">
              <SimpleSelect
                value={leavePolicyId ? String(leavePolicyId) : ""}
                onChange={(v) => setLeavePolicyId(v ? Number(v) : null)}
                options={leavePolicyOptions}
                placeholder="Select leave policy…"
              />
            </EmpField>
            <EmpField label="Reporting Manager" width="medium">
              <SimpleSelect
                value={core.reportingManagerId ? String(core.reportingManagerId) : ""}
                onChange={(v) =>
                  setCore({ ...core, reportingManagerId: v ? Number(v) : null })
                }
                options={managers.map((m) => ({
                  value: String(m.id),
                  label: `${m.employeeName} (${m.employeeCode})`,
                }))}
                allowEmpty
                placeholder="None"
              />
            </EmpField>
            <EmpField label="Employee Type" width="small">
              <SimpleSelect
                value={core.employeeType}
                onChange={(v) =>
                  setCore({ ...core, employeeType: v as HrEmployee["employeeType"] })
                }
                options={employeeTypeOptions}
                width="full"
              />
            </EmpField>
            <EmpField label="Employment Status" width="small">
              <SimpleSelect
                value={core.employmentStatus}
                onChange={(v) =>
                  setCore({
                    ...core,
                    employmentStatus: v as HrEmployee["employmentStatus"],
                  })
                }
                options={employmentStatusOptions}
                width="full"
              />
            </EmpField>
            <EmpField label="Date of Joining" width="small">
              <HrDateInput
                value={core.dateOfJoining}
                onChange={(v) => setCore({ ...core, dateOfJoining: v })}
                aria-label="Date of Joining"
              />
            </EmpField>
            <EmpField label="Probation End Date" width="small">
              <HrDateInput
                value={extra.probationEndDate}
                onChange={(v) => setExtra({ ...extra, probationEndDate: v })}
                aria-label="Probation End Date"
                min={core.dateOfJoining || undefined}
              />
            </EmpField>
            <EmpField label="Confirmation Date" width="small">
              <HrDateInput
                value={extra.confirmationDate}
                onChange={(v) => setExtra({ ...extra, confirmationDate: v })}
                aria-label="Confirmation Date"
                min={core.dateOfJoining || undefined}
              />
            </EmpField>
            <EmpField label="Work Location" width="medium">
              <EmpInput
                value={extra.workLocation}
                onChange={(e) => setExtra({ ...extra, workLocation: e.target.value })}
              />
            </EmpField>
          </EmpSection>
        </EmpFormPanel>
      )}
    </div>
  );
}

/* ─── Bank ─── */

export function BankDetailsSection({
  employee,
  onSave,
  editMode,
  onDirtyChange,
  onRegisterEditor,
  onRequestEdit,
}: {
  employee: HrEmployee;
  onSave: (patch: Partial<HrEmployee>, successMsg?: string) => void;
  editMode: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterEditor?: (editor: ProfileSectionEditor | null) => void;
  /** Enter profile Edit Mode so bank fields can be filled. */
  onRequestEdit?: () => void;
}) {
  const [draft, setDraft] = useState<EmployeeBankDetails>(EMPTY_BANK());
  const [confirmAcct, setConfirmAcct] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const resetFromEmployee = () => {
    const b = { ...EMPTY_BANK(), ...employee.bank };
    setDraft(b);
    setConfirmAcct(b.accountNumber);
    setErr(null);
  };

  useEffect(() => {
    resetFromEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee]);

  useEffect(() => {
    if (!editMode) {
      resetFromEmployee();
      onDirtyChange?.(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

  useEffect(() => {
    if (!editMode) return;
    const baseline = { ...EMPTY_BANK(), ...employee.bank };
    const dirty =
      JSON.stringify(draft) !== JSON.stringify(baseline) || confirmAcct !== baseline.accountNumber;
    onDirtyChange?.(dirty);
  }, [editMode, draft, confirmAcct, employee, onDirtyChange]);

  const b = { ...EMPTY_BANK(), ...employee.bank };
  const hasData = !!(b.accountNumber || b.bankName || b.ifscCode);

  const handleUpdate = (): boolean => {
    if (draft.accountNumber && draft.accountNumber !== confirmAcct) {
      setErr("Account number and confirm account number must match.");
      return false;
    }
    onSave({ bank: draft });
    return true;
  };

  useEffect(() => {
    if (!editMode) {
      onRegisterEditor?.(null);
      return;
    }
    onRegisterEditor?.({ save: handleUpdate, discard: resetFromEmployee });
    return () => onRegisterEditor?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, draft, confirmAcct, employee]);

  return (
    <div>
      <ProfileSectionHeader title="Bank Details" />
      {err && editMode && <p className="text-xs text-red-600 mb-3">{err}</p>}
      {!editMode ? (
        !hasData ? (
          <EmptyProfileState
            message="No bank details added yet."
            actionLabel="Add Bank Details"
            onAction={onRequestEdit}
          />
        ) : (
          <ReadGrid>
            <ReadField label="Account Holder Name" value={b.accountHolderName} />
            <ReadField label="Bank Name" value={b.bankName} />
            <ReadField label="Account Number" value={b.accountNumber ? maskAccountNumber(b.accountNumber) : ""} mono />
            <ReadField label="IFSC Code" value={b.ifscCode} mono />
            <ReadField label="Bank Branch Name" value={b.bankBranch} />
            <ReadField label="Account Type" value={b.accountType} />
          </ReadGrid>
        )
      ) : (
        <EmpFormPanel>
          <EmpSection title="Bank Account">
            <EmpField label="Account Holder Name" width="wide">
              <EmpIconInput
                icon={User}
                value={draft.accountHolderName}
                onChange={(e) => setDraft({ ...draft, accountHolderName: e.target.value })}
                placeholder="e.g. Vikram Mehta"
              />
            </EmpField>
            <EmpField label="Bank Name" width="wide">
              <EmpIconInput
                icon={Landmark}
                value={draft.bankName}
                onChange={(e) => setDraft({ ...draft, bankName: e.target.value })}
                placeholder="e.g. HDFC Bank"
              />
            </EmpField>
            <EmpField label="Account Number" width="medium">
              <EmpIconInput
                icon={Hash}
                value={draft.accountNumber}
                onChange={(e) => setDraft({ ...draft, accountNumber: e.target.value })}
                placeholder="Enter account number"
              />
            </EmpField>
            <EmpField label="Confirm Account Number" width="medium">
              <EmpIconInput
                icon={Hash}
                value={confirmAcct}
                onChange={(e) => setConfirmAcct(e.target.value)}
                placeholder="Re-enter account number"
              />
            </EmpField>
            <EmpField label="IFSC Code" width="small">
              <EmpIconInput
                icon={Landmark}
                value={draft.ifscCode}
                onChange={(e) => setDraft({ ...draft, ifscCode: e.target.value.toUpperCase() })}
                placeholder="e.g. HDFC0001234"
                className="font-mono uppercase"
              />
            </EmpField>
            <EmpField label="Bank Branch Name" width="medium">
              <EmpInput
                value={draft.bankBranch}
                onChange={(e) => setDraft({ ...draft, bankBranch: e.target.value })}
              />
            </EmpField>
            <EmpField label="Account Type" width="small">
              <SimpleSelect
                value={draft.accountType}
                onChange={(v) => setDraft({ ...draft, accountType: v })}
                options={ACCOUNT_TYPE_OPTIONS}
                allowEmpty
                width="full"
              />
            </EmpField>
          </EmpSection>
        </EmpFormPanel>
      )}
    </div>
  );
}

/* ─── Government IDs ─── */

export function GovernmentIdsSection({
  employee,
  onSave,
  editMode,
  onDirtyChange,
  onRegisterEditor,
  onRequestEdit,
}: {
  employee: HrEmployee;
  onSave: (patch: Partial<HrEmployee>, successMsg?: string) => void;
  editMode: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterEditor?: (editor: ProfileSectionEditor | null) => void;
  onRequestEdit?: () => void;
}) {
  const [draft, setDraft] = useState<EmployeeGovernmentIds>(EMPTY_GOVERNMENT_IDS());

  const resetFromEmployee = () => {
    setDraft({ ...EMPTY_GOVERNMENT_IDS(), ...employee.governmentIds });
  };

  useEffect(() => {
    resetFromEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee]);

  useEffect(() => {
    if (!editMode) {
      resetFromEmployee();
      onDirtyChange?.(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

  useEffect(() => {
    if (!editMode) return;
    const baseline = { ...EMPTY_GOVERNMENT_IDS(), ...employee.governmentIds };
    onDirtyChange?.(JSON.stringify(draft) !== JSON.stringify(baseline));
  }, [editMode, draft, employee, onDirtyChange]);

  const g = { ...EMPTY_GOVERNMENT_IDS(), ...employee.governmentIds };
  const hasData = Object.values(g).some((v) => !!v);

  const handleUpdate = (): boolean => {
    onSave({ governmentIds: draft });
    return true;
  };

  useEffect(() => {
    if (!editMode) {
      onRegisterEditor?.(null);
      return;
    }
    onRegisterEditor?.({ save: handleUpdate, discard: resetFromEmployee });
    return () => onRegisterEditor?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, draft, employee]);

  return (
    <div>
      <ProfileSectionHeader
        title="Government / Statutory IDs"
        description="Employee-specific identifiers for statutory and payroll use."
      />
      {!editMode ? (
        !hasData ? (
          <EmptyProfileState
            message="No government / statutory ID details added yet."
            actionLabel="Add Government IDs"
            onAction={onRequestEdit}
          />
        ) : (
          <div className="space-y-5">
            <div>
              <SectionLabel>Primary Identifiers</SectionLabel>
              <ReadGrid>
                <ReadField label="PAN" value={g.pan} mono />
                <ReadField label="Aadhaar" value={g.aadhaar ? maskAadhaar(g.aadhaar) : ""} mono />
                <ReadField label="UAN" value={g.uan} mono />
              </ReadGrid>
            </div>
            <div>
              <SectionLabel>Employment Statutory IDs</SectionLabel>
              <ReadGrid>
                <ReadField label="PF Number" value={g.pfNumber} mono />
                <ReadField label="ESIC Number" value={g.esicNumber} mono />
              </ReadGrid>
            </div>
            <div>
              <SectionLabel>Passport</SectionLabel>
              <ReadGrid>
                <ReadField label="Passport Number" value={g.passportNumber} mono />
                <ReadField label="Passport Expiry Date" value={formatDateDisplay(g.passportExpiry)} />
              </ReadGrid>
            </div>
            <div>
              <SectionLabel>Driving Licence</SectionLabel>
              <ReadGrid>
                <ReadField label="Driving Licence Number" value={g.drivingLicenceNumber} mono />
                <ReadField label="Driving Licence Expiry Date" value={formatDateDisplay(g.drivingLicenceExpiry)} />
              </ReadGrid>
            </div>
          </div>
        )
      ) : (
        <EmpFormPanel className="space-y-4">
          <EmpSection title="Primary Identifiers">
            <EmpField label="PAN" width="small">
              <EmpInput
                value={draft.pan}
                onChange={(e) => setDraft({ ...draft, pan: e.target.value.toUpperCase() })}
                placeholder="e.g. ABCDE1234F"
                className="font-mono uppercase"
              />
            </EmpField>
            <EmpField label="Aadhaar" width="medium">
              <EmpInput
                value={draft.aadhaar}
                onChange={(e) => setDraft({ ...draft, aadhaar: e.target.value })}
                placeholder="12-digit Aadhaar"
                inputMode="numeric"
              />
            </EmpField>
            <EmpField label="UAN" width="medium">
              <EmpInput
                value={draft.uan}
                onChange={(e) => setDraft({ ...draft, uan: e.target.value })}
                placeholder="Universal Account Number"
              />
            </EmpField>
          </EmpSection>

          <EmpSection title="Employment Statutory IDs">
            <EmpField label="PF Number" width="medium">
              <EmpInput
                value={draft.pfNumber}
                onChange={(e) => setDraft({ ...draft, pfNumber: e.target.value })}
                placeholder="PF / EPFO number"
              />
            </EmpField>
            <EmpField label="ESIC Number" width="medium">
              <EmpInput
                value={draft.esicNumber}
                onChange={(e) => setDraft({ ...draft, esicNumber: e.target.value })}
                placeholder="ESIC number"
              />
            </EmpField>
          </EmpSection>

          <EmpSection title="Passport">
            <EmpField label="Passport Number" width="medium">
              <EmpInput
                value={draft.passportNumber}
                onChange={(e) => setDraft({ ...draft, passportNumber: e.target.value })}
                placeholder="Passport number"
              />
            </EmpField>
            <EmpField label="Passport Expiry" width="small">
              <HrDateInput
                value={draft.passportExpiry}
                onChange={(v) => setDraft({ ...draft, passportExpiry: v })}
                aria-label="Passport Expiry"
              />
            </EmpField>
          </EmpSection>

          <EmpSection title="Driving Licence">
            <EmpField label="Driving Licence Number" width="medium">
              <EmpInput
                value={draft.drivingLicenceNumber}
                onChange={(e) => setDraft({ ...draft, drivingLicenceNumber: e.target.value })}
                placeholder="Driving licence number"
              />
            </EmpField>
            <EmpField label="Driving Licence Expiry" width="small">
              <HrDateInput
                value={draft.drivingLicenceExpiry}
                onChange={(v) => setDraft({ ...draft, drivingLicenceExpiry: v })}
                aria-label="Driving Licence Expiry"
              />
            </EmpField>
          </EmpSection>
        </EmpFormPanel>
      )}
    </div>
  );
}

/* ─── Education / Experience / Documents (list editors) ─── */

export function EducationSection({
  employee,
  onSave,
  editMode,
  onDirtyChange,
  onRegisterEditor,
  onRequestEdit,
  autoStartAdd,
  onAutoStartConsumed,
}: {
  employee: HrEmployee;
  onSave: (patch: Partial<HrEmployee>, successMsg?: string) => void;
  editMode: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterEditor?: (editor: ProfileSectionEditor | null) => void;
  onRequestEdit?: () => void;
  /** When entering edit mode from empty-state CTA, open add form once. */
  autoStartAdd?: boolean;
  onAutoStartConsumed?: () => void;
}) {
  const list = employee.education ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EmployeeEducationRecord | null>(null);

  const startAdd = () => {
    const rec: EmployeeEducationRecord = {
      id: newProfileRecordId(),
      qualification: "",
      specialization: "",
      institution: "",
      university: "",
      startYear: "",
      endYear: "",
      grade: "",
      certificateName: "",
    };
    setDraft(rec);
    setEditingId(rec.id);
  };

  useEffect(() => {
    if (!editMode) {
      setEditingId(null);
      setDraft(null);
      onDirtyChange?.(false);
      onRegisterEditor?.(null);
      return;
    }
    onDirtyChange?.(!!editingId && !!draft);
    onRegisterEditor?.({
      save: () => {
        if (draft && editingId) {
          const current = employee.education ?? [];
          const isExisting = current.some((r) => r.id === draft.id);
          const next = isExisting
            ? current.map((r) => (r.id === draft.id ? draft : r))
            : [...current, draft];
          onSave(
            { education: next },
            isExisting ? "Education updated successfully." : "Education added successfully.",
          );
          setEditingId(null);
          setDraft(null);
        }
        return true;
      },
      discard: () => {
        setEditingId(null);
        setDraft(null);
      },
    });
    return () => onRegisterEditor?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, editingId, draft, employee.education]);

  useEffect(() => {
    if (editMode && autoStartAdd && !editingId) {
      startAdd();
      onAutoStartConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, autoStartAdd]);

  const saveDraft = () => {
    if (!draft) return;
    const isExisting = list.some((r) => r.id === draft.id);
    const next = isExisting
      ? list.map((r) => (r.id === draft.id ? draft : r))
      : [...list, draft];
    onSave(
      { education: next },
      isExisting ? "Education updated successfully." : "Education added successfully.",
    );
    setEditingId(null);
    setDraft(null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4 pb-3 border-b border-border">
        <div>
          <h2 className="text-[16px] font-semibold leading-[22px] text-foreground">Education</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Academic qualifications</p>
        </div>
        {editMode && (
          <button
            type="button"
            onClick={startAdd}
            className="h-8 px-3 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Education
          </button>
        )}
      </div>

      {editingId && draft && (
        <EmpFormPanel className="mb-4">
          <EmpSection title={list.some((r) => r.id === draft.id) ? "Edit Education" : "Add Education"}>
            <EmpField label="Qualification" width="medium">
              <EmpInput value={draft.qualification} onChange={(e) => setDraft({ ...draft, qualification: e.target.value })} />
            </EmpField>
            <EmpField label="Specialization" width="medium">
              <EmpInput value={draft.specialization} onChange={(e) => setDraft({ ...draft, specialization: e.target.value })} />
            </EmpField>
            <EmpField label="Institution" width="wide">
              <EmpInput value={draft.institution} onChange={(e) => setDraft({ ...draft, institution: e.target.value })} />
            </EmpField>
            <EmpField label="University / Board" width="wide">
              <EmpInput value={draft.university} onChange={(e) => setDraft({ ...draft, university: e.target.value })} />
            </EmpField>
            <EmpField label="Start Year" width="small">
              <HrYearSelect
                value={draft.startYear}
                onChange={(v) => setDraft({ ...draft, startYear: v })}
                aria-label="Start Year"
              />
            </EmpField>
            <EmpField label="End Year" width="small">
              <HrYearSelect
                value={draft.endYear}
                onChange={(v) => setDraft({ ...draft, endYear: v })}
                aria-label="End Year"
                fromYear={draft.startYear ? Number(draft.startYear) : undefined}
              />
            </EmpField>
            <EmpField label="Grade / Percentage" width="small">
              <EmpInput value={draft.grade} onChange={(e) => setDraft({ ...draft, grade: e.target.value })} />
            </EmpField>
          </EmpSection>
          <EmpFormActions>
            <button type="button" className="h-8 px-3 text-xs border rounded-lg" onClick={() => { setEditingId(null); setDraft(null); }}>
              Cancel
            </button>
            <button type="button" className="h-8 px-3 text-xs rounded-lg bg-brand-600 text-white" onClick={saveDraft}>
              {list.some((r) => r.id === draft.id) ? "Update" : "Add Education"}
            </button>
          </EmpFormActions>
        </EmpFormPanel>
      )}

      {list.length === 0 && !editingId ? (
        <EmptyProfileState
          message="No education details added yet."
          actionLabel="Add Education"
          onAction={() => {
            if (editMode) startAdd();
            else onRequestEdit?.();
          }}
        />
      ) : (
        <ul className="space-y-2">
          {list.map((rec) => (
            <li key={rec.id} className="rounded-lg border border-border px-3 py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{rec.qualification || "Qualification"}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {[rec.specialization, rec.institution, rec.university].filter(Boolean).join(" · ") || "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {[rec.startYear, rec.endYear].filter(Boolean).join(" – ") || "Years not set"}
                  {rec.grade ? ` · ${rec.grade}` : ""}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {editMode && (
                  <>
                    <button
                      type="button"
                      className="p-1.5 rounded-md hover:bg-muted"
                      aria-label="Edit"
                      onClick={() => {
                        setDraft({ ...rec });
                        setEditingId(rec.id);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-md hover:bg-red-50"
                      aria-label="Delete"
                      onClick={() => onSave({ education: list.filter((r) => r.id !== rec.id) })}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ExperienceSection({
  employee,
  onSave,
  editMode,
  onDirtyChange,
  onRegisterEditor,
  onRequestEdit,
  autoStartAdd,
  onAutoStartConsumed,
}: {
  employee: HrEmployee;
  onSave: (patch: Partial<HrEmployee>, successMsg?: string) => void;
  editMode: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterEditor?: (editor: ProfileSectionEditor | null) => void;
  onRequestEdit?: () => void;
  autoStartAdd?: boolean;
  onAutoStartConsumed?: () => void;
}) {
  const list = employee.experience ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EmployeeExperienceRecord | null>(null);

  const startAdd = () => {
    const rec: EmployeeExperienceRecord = {
      id: newProfileRecordId(),
      employerName: "",
      designation: "",
      startDate: "",
      endDate: "",
      employmentType: "",
      reasonForLeaving: "",
      experienceLetterName: "",
      relievingLetterName: "",
    };
    setDraft(rec);
    setEditingId(rec.id);
  };

  useEffect(() => {
    if (!editMode) {
      setEditingId(null);
      setDraft(null);
      onDirtyChange?.(false);
      onRegisterEditor?.(null);
      return;
    }
    onDirtyChange?.(!!editingId && !!draft);
    onRegisterEditor?.({
      save: () => {
        if (draft && editingId) {
          const current = employee.experience ?? [];
          const isExisting = current.some((r) => r.id === draft.id);
          const next = isExisting
            ? current.map((r) => (r.id === draft.id ? draft : r))
            : [...current, draft];
          onSave(
            { experience: next },
            isExisting ? "Experience updated successfully." : "Experience added successfully.",
          );
          setEditingId(null);
          setDraft(null);
        }
        return true;
      },
      discard: () => {
        setEditingId(null);
        setDraft(null);
      },
    });
    return () => onRegisterEditor?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, editingId, draft, employee.experience]);

  useEffect(() => {
    if (editMode && autoStartAdd && !editingId) {
      startAdd();
      onAutoStartConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, autoStartAdd]);

  const saveDraft = () => {
    if (!draft) return;
    const isExisting = list.some((r) => r.id === draft.id);
    const next = isExisting
      ? list.map((r) => (r.id === draft.id ? draft : r))
      : [...list, draft];
    onSave(
      { experience: next },
      isExisting ? "Experience updated successfully." : "Experience added successfully.",
    );
    setEditingId(null);
    setDraft(null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4 pb-3 border-b border-border">
        <div>
          <h2 className="text-[16px] font-semibold leading-[22px] text-foreground">Experience</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Previous employment</p>
        </div>
        {editMode && (
          <button
            type="button"
            onClick={startAdd}
            className="h-8 px-3 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Experience
          </button>
        )}
      </div>

      {editingId && draft && (
        <EmpFormPanel className="mb-4">
          <EmpSection title={list.some((r) => r.id === draft.id) ? "Edit Experience" : "Add Experience"}>
            <EmpField label="Company Name" width="wide">
              <EmpInput value={draft.employerName} onChange={(e) => setDraft({ ...draft, employerName: e.target.value })} />
            </EmpField>
            <EmpField label="Designation / Job Title" width="wide">
              <EmpInput value={draft.designation} onChange={(e) => setDraft({ ...draft, designation: e.target.value })} />
            </EmpField>
            <EmpField label="Employment Type" width="small">
              <EmpInput value={draft.employmentType} onChange={(e) => setDraft({ ...draft, employmentType: e.target.value })} />
            </EmpField>
            <EmpField label="From Date" width="small">
              <HrDateInput
                value={draft.startDate}
                onChange={(v) => setDraft({ ...draft, startDate: v })}
                aria-label="Experience From Date"
              />
            </EmpField>
            <EmpField label="To Date" width="small">
              <HrDateInput
                value={draft.endDate}
                onChange={(v) => setDraft({ ...draft, endDate: v })}
                aria-label="Experience To Date"
                min={draft.startDate || undefined}
              />
            </EmpField>
            <EmpField label="Reason for Leaving" width="full">
              <EmpInput value={draft.reasonForLeaving} onChange={(e) => setDraft({ ...draft, reasonForLeaving: e.target.value })} />
            </EmpField>
          </EmpSection>
          <EmpFormActions>
            <button type="button" className="h-8 px-3 text-xs border rounded-lg" onClick={() => { setEditingId(null); setDraft(null); }}>
              Cancel
            </button>
            <button type="button" className="h-8 px-3 text-xs rounded-lg bg-brand-600 text-white" onClick={saveDraft}>
              {list.some((r) => r.id === draft.id) ? "Update" : "Add Experience"}
            </button>
          </EmpFormActions>
        </EmpFormPanel>
      )}

      {list.length === 0 && !editingId ? (
        <EmptyProfileState
          message="No previous employment details added."
          actionLabel="Add Experience"
          onAction={() => {
            if (editMode) startAdd();
            else onRequestEdit?.();
          }}
        />
      ) : (
        <ul className="space-y-2">
          {list.map((rec) => (
            <li key={rec.id} className="rounded-lg border border-border px-3 py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold">{rec.employerName || "Employer"}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {[rec.designation, rec.employmentType].filter(Boolean).join(" · ") || "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {[formatDateDisplay(rec.startDate), formatDateDisplay(rec.endDate)].join(" – ")}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {editMode && (
                  <>
                    <button type="button" className="p-1.5 rounded-md hover:bg-muted" onClick={() => { setDraft({ ...rec }); setEditingId(rec.id); }}>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button type="button" className="p-1.5 rounded-md hover:bg-red-50" onClick={() => onSave({ experience: list.filter((r) => r.id !== rec.id) })}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ModuleShellSection({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div>
      <div className="mb-4 pb-3 border-b border-border">
        <h2 className="text-[16px] font-semibold leading-[22px] text-foreground">{title}</h2>
      </div>
      <EmptyProfileState message={message} />
    </div>
  );
}

export { DocumentsSection } from "./DocumentsSection";
