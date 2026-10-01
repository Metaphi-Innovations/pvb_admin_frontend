"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Scale,
  Upload,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { HrDateInput, formatHrDateDisplay } from "@/app/(app)/hr/components/HrDateInput";
import {
  ensurePostalMasterReady,
  isValidPincodeFormat,
  lookupPostalPincode,
} from "@/lib/address/postal-lookup";
import {
  HrOrgPageHeader,
  HrOrgField,
  HrOrgFormSection,
  HrOrgFormPanel,
  HrPhoneField,
  hrInput,
} from "../_components";
import {
  loadCompanyProfile,
  saveCompanyProfile,
  type CompanyProfile,
} from "../../organization-data";

/** Company Profile–only density (does not change shared org form tokens). */
const CP_MAX = "max-w-[1040px] w-full";
const CP_DENSE = cn(
  "cp-profile-dense",
  "[&_section]:!px-4 [&_section]:!py-3.5",
  "[&_section>div:first-child]:!mb-2.5 [&_section>div:first-child]:!pb-2",
  "[&_h2]:!text-[13px] [&_h2]:!font-semibold [&_h2]:!leading-snug",
  "[&_section>div:first-child_p]:!text-[11px] [&_section>div:first-child_p]:!mt-0.5",
  "[&_label]:!text-[11px] [&_label]:!font-medium [&_label]:!leading-none",
  "[&_.grid]:!gap-x-3 [&_.grid]:!gap-y-2.5",
  "[&_input]:!h-9 [&_input]:!text-xs [&_input]:!rounded-[10px]",
  "[&_button[role=combobox]]:!h-9 [&_button[role=combobox]]:!text-xs [&_button[role=combobox]]:!rounded-[10px]",
  "[&_button[aria-haspopup=dialog]]:!h-9 [&_button[aria-haspopup=dialog]]:!text-xs [&_button[aria-haspopup=dialog]]:!rounded-[10px]",
  "[&_section>div:first-child_.shrink-0]:!w-6 [&_section>div:first-child_.shrink-0]:!h-6",
  "[&_section>div:first-child_.shrink-0_svg]:!w-3 [&_section>div:first-child_.shrink-0_svg]:!h-3",
  "[&_p.text-muted-foreground]:!text-[11px]",
);

const CP_BTN = "h-9 px-3 text-xs rounded-[10px]";
const CP_BTN_PRIMARY =
  "h-9 px-3 text-xs rounded-[10px] bg-brand-600 hover:bg-brand-700 text-white shadow-sm";

function cpInput(className?: string, state?: "error" | "success" | "default") {
  return cn(hrInput(className, state), "!h-9 !text-xs !rounded-[10px]");
}

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const CIN_RE = /^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function profilesEqual(a: CompanyProfile, b: CompanyProfile): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function formatPhone(cc: string, num: string): string {
  if (!num.trim()) return "—";
  return `${cc || "+91"} ${num}`.trim();
}

function validateCompanyProfile(profile: CompanyProfile): Record<string, string> {
  const e: Record<string, string> = {};
  if (!profile.companyName.trim()) e.companyName = "Company name is required";

  if (profile.pan.trim() && !PAN_RE.test(profile.pan.trim().toUpperCase())) {
    e.pan = "Enter a valid 10-character PAN (e.g. ABCDE1234F)";
  }
  if (profile.gstin.trim() && !GSTIN_RE.test(profile.gstin.trim().toUpperCase())) {
    e.gstin = "Enter a valid GSTIN";
  }
  if (profile.cin.trim() && !CIN_RE.test(profile.cin.trim().toUpperCase())) {
    e.cin = "Enter a valid CIN";
  }
  if (profile.email.trim() && !EMAIL_RE.test(profile.email.trim())) {
    e.email = "Enter a valid email address";
  }
  if (profile.hrContactEmail.trim() && !EMAIL_RE.test(profile.hrContactEmail.trim())) {
    e.hrContactEmail = "Enter a valid email address";
  }
  if (profile.phoneNumber.trim() && !/^\d{6,15}$/.test(profile.phoneNumber.trim())) {
    e.phoneNumber = "Enter a valid phone number";
  }
  if (
    profile.hrContactPhoneNumber.trim() &&
    !/^\d{6,15}$/.test(profile.hrContactPhoneNumber.trim())
  ) {
    e.hrContactPhoneNumber = "Enter a valid phone number";
  }
  if (!profile.addressLine1.trim()) e.addressLine1 = "Address Line 1 is required";
  if (!profile.pincode.trim()) e.pincode = "PIN Code is required";
  else if (!isValidPincodeFormat(profile.pincode)) e.pincode = "Enter a valid 6-digit PIN Code";
  if (!profile.city.trim()) e.city = "City is required";
  if (!profile.state.trim()) e.state = "State is required";
  if (!profile.country.trim()) e.country = "Country is required";
  return e;
}

function ReadValue({
  value,
  mono,
  className,
}: {
  value?: string;
  mono?: boolean;
  className?: string;
}) {
  const v = value?.trim();
  return (
    <p
      className={cn(
        "text-xs text-foreground mt-1 leading-snug min-h-[16px]",
        mono && "font-mono text-foreground",
        !v && "text-muted-foreground",
        className,
      )}
    >
      {v ? v : "—"}
    </p>
  );
}

function IconInput({
  icon: Icon,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="relative">
      <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      <Input {...props} className={cn(className, "pl-8")} />
    </div>
  );
}

export default function CompanyProfileClient() {
  const [saved, setSaved] = useState<CompanyProfile | null>(null);
  const [draft, setDraft] = useState<CompanyProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const data = loadCompanyProfile();
    if (!data.dateOfIncorporation) data.dateOfIncorporation = "";
    if (!data.phoneCountryCode) data.phoneCountryCode = "+91";
    if (!data.hrContactPhoneCountryCode) data.hrContactPhoneCountryCode = "+91";
    if (!data.country) data.country = "India";
    setSaved(data);
    setDraft({ ...data });
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    void ensurePostalMasterReady();
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const dirty = useMemo(() => {
    if (!saved || !draft) return false;
    return !profilesEqual(saved, draft);
  }, [saved, draft]);

  const canUpdate = useMemo(() => {
    if (!dirty || !draft) return false;
    return Object.keys(validateCompanyProfile(draft)).length === 0;
  }, [dirty, draft]);

  const set = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
    setDraft((f) => (f ? { ...f, [key]: value } : f));
    setErrors((e) => {
      const n = { ...e };
      delete n[key as string];
      return n;
    });
  };

  const applyPincode = (raw: string) => {
    const pin = raw.replace(/\D/g, "").slice(0, 6);
    set("pincode", pin);
    if (!isValidPincodeFormat(pin)) return;
    const loc = lookupPostalPincode(pin);
    if (!loc) return;
    setDraft((f) =>
      f
        ? {
            ...f,
            pincode: pin,
            city: loc.city || f.city,
            state: loc.state || f.state,
            country: f.country || "India",
          }
        : f,
    );
  };

  const handleEdit = () => {
    if (!saved) return;
    setDraft({ ...saved });
    setErrors({});
    setEditing(true);
  };

  const handleCancel = () => {
    if (saved) setDraft({ ...saved });
    setErrors({});
    setEditing(false);
  };

  const handleUpdate = () => {
    if (!draft || !saved) return;
    const e = validateCompanyProfile(draft);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    if (!dirty) {
      setEditing(false);
      return;
    }
    const next: CompanyProfile = {
      ...draft,
      companyName: draft.companyName.trim(),
      legalName: draft.legalName.trim(),
      companyCode: saved.companyCode,
      pan: draft.pan.trim().toUpperCase(),
      gstin: draft.gstin.trim().toUpperCase(),
      cin: draft.cin.trim().toUpperCase(),
      pfRegistration: draft.pfRegistration.trim().toUpperCase(),
      esiRegistration: draft.esiRegistration.trim().toUpperCase(),
      ptRegistration: draft.ptRegistration.trim().toUpperCase(),
      lwfRegistration: draft.lwfRegistration.trim().toUpperCase(),
      email: draft.email.trim(),
      hrContactEmail: draft.hrContactEmail.trim(),
      country: draft.country.trim() || "India",
    };
    saveCompanyProfile(next);
    setSaved({ ...next });
    setDraft({ ...next });
    setEditing(false);
    setToast(true);
  };

  const onLogoChange = (file: File | null) => {
    if (!file) {
      set("logoUrl", "");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((e) => ({ ...e, logoUrl: "Maximum file size is 2 MB" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("logoUrl", String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  const view = saved;
  const form = editing ? draft : saved;

  const headerActions = editing ? (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" className={CP_BTN} onClick={handleCancel}>
        Cancel
      </Button>
      <Button
        type="button"
        size="sm"
        className={CP_BTN_PRIMARY}
        onClick={handleUpdate}
        disabled={!canUpdate}
      >
        Update
      </Button>
    </div>
  ) : (
    <Button
      type="button"
      size="sm"
      className={cn(CP_BTN_PRIMARY, "gap-1.5")}
      onClick={handleEdit}
      disabled={loading || !saved}
    >
      <Pencil className="w-3.5 h-3.5" /> Edit
    </Button>
  );

  if (loading || !form) {
    return (
      <HrOrgPageHeader
        title="Company Profile"
        description="Company identity and registration details for HR documents."
        icon={Building2}
        actions={headerActions}
        maxWidthClass={CP_MAX}
        className="[&_h1]:!text-lg [&_h1]:!font-semibold [&_h1]:!leading-snug [&_h1+p]:!text-[11px]"
      >
        <HrOrgFormPanel>
          <div className="px-4 py-3.5 animate-pulse space-y-2.5">
            <div className="h-3 bg-muted rounded w-36" />
            <div className="grid grid-cols-3 gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-9 bg-muted rounded-[10px]" />
              ))}
            </div>
          </div>
        </HrOrgFormPanel>
      </HrOrgPageHeader>
    );
  }

  return (
    <HrOrgPageHeader
      title="Company Profile"
      description="Company identity and registration details for HR documents."
      icon={Building2}
      actions={headerActions}
      maxWidthClass={CP_MAX}
      className="[&_h1]:!text-lg [&_h1]:!font-semibold [&_h1]:!leading-snug [&_h1+p]:!text-[11px]"
    >
      {toast && (
        <div className="mb-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-700">
          Company profile updated successfully.
        </div>
      )}

      <div className={CP_DENSE}>
      <HrOrgFormPanel>
        {/* A. BASIC */}
        <HrOrgFormSection
          title="Basic Company Information"
          description="Legal identity shown on HR letters and statutory documents."
          icon={Building2}
        >
          <HrOrgField
            label="Company Logo"
            size="md"
            helper={editing ? "PNG, JPG, or SVG · Max 2 MB · Preview only (no upload backend)" : undefined}
            error={errors.logoUrl}
            id="logo"
          >
            <div className="h-9 flex items-center gap-2">
              <div className="w-9 h-9 rounded-[10px] border border-border bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                {form.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logoUrl} alt="" className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground/40" />
                )}
              </div>
              {editing && (
                <>
                  <label
                    className={cn(
                      CP_BTN,
                      "inline-flex items-center gap-1.5 border border-border cursor-pointer hover:bg-muted shrink-0 bg-white",
                    )}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {form.logoUrl && (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline inline-flex items-center gap-1"
                      onClick={() => onLogoChange(null)}
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                  )}
                </>
              )}
              {!editing && !form.logoUrl && (
                <p className="text-[11px] text-muted-foreground">No logo uploaded</p>
              )}
            </div>
          </HrOrgField>

          <HrOrgField label="Company Name" required={editing} size="md" error={errors.companyName} id="companyName">
            {editing ? (
              <IconInput
                icon={Building2}
                id="companyName"
                value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
                className={cpInput(undefined, errors.companyName ? "error" : "default")}
                placeholder="e.g. Paramverse Bio Pvt. Ltd."
              />
            ) : (
              <ReadValue value={form.companyName} />
            )}
          </HrOrgField>

          <HrOrgField label="Legal Name" size="md" id="legalName" helper={editing ? "Optional if same as Company Name" : undefined}>
            {editing ? (
              <Input
                id="legalName"
                value={form.legalName}
                onChange={(e) => set("legalName", e.target.value)}
                className={cpInput()}
                placeholder="Registered legal name"
              />
            ) : (
              <ReadValue value={form.legalName} />
            )}
          </HrOrgField>

          <HrOrgField label="Company Code" size="sm" id="companyCode" helper={editing ? "System identity — read-only" : undefined}>
            {editing ? (
              <Input
                id="companyCode"
                value={form.companyCode}
                readOnly
                className={cpInput("font-mono")}
              />
            ) : (
              <ReadValue value={form.companyCode} mono />
            )}
          </HrOrgField>

          <HrOrgField label="Business / Industry Type" size="md" id="industry">
            {editing ? (
              <Input
                id="industry"
                value={form.industry}
                onChange={(e) => set("industry", e.target.value)}
                className={cpInput()}
                placeholder="e.g. Agri Distribution"
              />
            ) : (
              <ReadValue value={form.industry} />
            )}
          </HrOrgField>

          <HrOrgField label="Date of Incorporation" size="md" id="doi">
            {editing ? (
              <HrDateInput
                id="doi"
                value={form.dateOfIncorporation || ""}
                onChange={(v) => set("dateOfIncorporation", v)}
                placeholder="Select date"
              />
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <ReadValue value={formatHrDateDisplay(form.dateOfIncorporation)} className="mt-0" />
              </div>
            )}
          </HrOrgField>
        </HrOrgFormSection>

        {/* B. STATUTORY */}
        <HrOrgFormSection
          title="Statutory Details"
          description="Company registration identifiers only — rates and rules belong under Statutory Compliance."
          icon={Scale}
        >
          <HrOrgField label="GST Registration Number" size="md" error={errors.gstin} id="gstin">
            {editing ? (
              <IconInput
                icon={FileText}
                id="gstin"
                value={form.gstin}
                onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                className={cpInput("font-mono", errors.gstin ? "error" : "default")}
                placeholder="e.g. 27ABCDE1234F1Z5"
              />
            ) : (
              <ReadValue value={form.gstin} mono />
            )}
          </HrOrgField>
          <HrOrgField label="PAN" size="sm" error={errors.pan} id="pan">
            {editing ? (
              <Input
                id="pan"
                value={form.pan}
                onChange={(e) => set("pan", e.target.value.toUpperCase().slice(0, 10))}
                className={cpInput("font-mono", errors.pan ? "error" : "default")}
                placeholder="e.g. ABCDE1234F"
              />
            ) : (
              <ReadValue value={form.pan} mono />
            )}
          </HrOrgField>
          <HrOrgField label="CIN" size="md" error={errors.cin} id="cin">
            {editing ? (
              <Input
                id="cin"
                value={form.cin}
                onChange={(e) => set("cin", e.target.value.toUpperCase())}
                className={cpInput("font-mono", errors.cin ? "error" : "default")}
                placeholder="e.g. U01100MH2020PTC123456"
              />
            ) : (
              <ReadValue value={form.cin} mono />
            )}
          </HrOrgField>
          <HrOrgField label="PF Registration Number" size="md" id="pf">
            {editing ? (
              <Input
                id="pf"
                value={form.pfRegistration}
                onChange={(e) => set("pfRegistration", e.target.value.toUpperCase())}
                className={cpInput("font-mono")}
                placeholder="PF registration number"
              />
            ) : (
              <ReadValue value={form.pfRegistration} mono />
            )}
          </HrOrgField>
          <HrOrgField label="ESI Registration Number" size="md" id="esi">
            {editing ? (
              <Input
                id="esi"
                value={form.esiRegistration}
                onChange={(e) => set("esiRegistration", e.target.value.toUpperCase())}
                className={cpInput("font-mono")}
                placeholder="ESI registration number"
              />
            ) : (
              <ReadValue value={form.esiRegistration} mono />
            )}
          </HrOrgField>
          <HrOrgField label="Professional Tax Registration" size="md" id="pt">
            {editing ? (
              <Input
                id="pt"
                value={form.ptRegistration}
                onChange={(e) => set("ptRegistration", e.target.value.toUpperCase())}
                className={cpInput("font-mono")}
                placeholder="PT registration number"
              />
            ) : (
              <ReadValue value={form.ptRegistration} mono />
            )}
          </HrOrgField>
          <HrOrgField label="LWF Registration Number" size="md" id="lwf">
            {editing ? (
              <Input
                id="lwf"
                value={form.lwfRegistration}
                onChange={(e) => set("lwfRegistration", e.target.value.toUpperCase())}
                className={cpInput("font-mono")}
                placeholder="LWF registration number"
              />
            ) : (
              <ReadValue value={form.lwfRegistration} mono />
            )}
          </HrOrgField>
        </HrOrgFormSection>

        {/* C. CONTACT */}
        <HrOrgFormSection title="Contact Information" description="Company and primary HR contact." icon={Phone}>
          <HrOrgField label="Company Email" size="md" error={errors.email} id="email">
            {editing ? (
              <IconInput
                icon={Mail}
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={cpInput(undefined, errors.email ? "error" : "default")}
                placeholder="e.g. hr@company.com"
              />
            ) : (
              <ReadValue value={form.email} />
            )}
          </HrOrgField>
          <HrOrgField label="Company Phone" size="md" error={errors.phoneNumber} id="phone">
            {editing ? (
              <HrPhoneField
                id="phone"
                countryCode={form.phoneCountryCode || "+91"}
                onCountryCodeChange={(v) => set("phoneCountryCode", v)}
                value={form.phoneNumber}
                onChange={(v) => set("phoneNumber", v)}
                placeholder="Phone number"
                className="[&_input]:!h-9 [&_button]:!h-9"
              />
            ) : (
              <ReadValue value={formatPhone(form.phoneCountryCode, form.phoneNumber)} />
            )}
          </HrOrgField>
          <HrOrgField label="Primary HR Contact Name" size="md" id="hrName">
            {editing ? (
              <IconInput
                icon={User}
                id="hrName"
                value={form.hrContactName}
                onChange={(e) => set("hrContactName", e.target.value)}
                className={cpInput()}
                placeholder="e.g. Priya Sharma"
              />
            ) : (
              <ReadValue value={form.hrContactName} />
            )}
          </HrOrgField>
          <HrOrgField label="Primary HR Contact Email" size="md" error={errors.hrContactEmail} id="hrEmail">
            {editing ? (
              <IconInput
                icon={Mail}
                id="hrEmail"
                type="email"
                value={form.hrContactEmail}
                onChange={(e) => set("hrContactEmail", e.target.value)}
                className={cpInput(undefined, errors.hrContactEmail ? "error" : "default")}
                placeholder="e.g. priya.sharma@company.com"
              />
            ) : (
              <ReadValue value={form.hrContactEmail} />
            )}
          </HrOrgField>
          <HrOrgField label="Primary HR Contact Phone" size="md" error={errors.hrContactPhoneNumber} id="hrPhone">
            {editing ? (
              <HrPhoneField
                id="hrPhone"
                countryCode={form.hrContactPhoneCountryCode || "+91"}
                onCountryCodeChange={(v) => set("hrContactPhoneCountryCode", v)}
                value={form.hrContactPhoneNumber}
                onChange={(v) => set("hrContactPhoneNumber", v)}
                placeholder="Phone number"
                className="[&_input]:!h-9 [&_button]:!h-9"
              />
            ) : (
              <ReadValue
                value={formatPhone(form.hrContactPhoneCountryCode, form.hrContactPhoneNumber)}
              />
            )}
          </HrOrgField>
        </HrOrgFormSection>

        {/* D. ADDRESS */}
        <HrOrgFormSection title="Registered Address" description="Registered office address." icon={MapPin}>
          <HrOrgField label="Address Line 1" required={editing} size="lg" error={errors.addressLine1} id="addr1">
            {editing ? (
              <IconInput
                icon={MapPin}
                id="addr1"
                value={form.addressLine1}
                onChange={(e) => set("addressLine1", e.target.value)}
                className={cpInput(undefined, errors.addressLine1 ? "error" : "default")}
                placeholder="e.g. Office No., Building, Street"
              />
            ) : (
              <ReadValue value={form.addressLine1} />
            )}
          </HrOrgField>
          <HrOrgField label="Address Line 2" size="lg" id="addr2">
            {editing ? (
              <Input
                id="addr2"
                value={form.addressLine2}
                onChange={(e) => set("addressLine2", e.target.value)}
                className={cpInput()}
                placeholder="e.g. Area, Landmark"
              />
            ) : (
              <ReadValue value={form.addressLine2} />
            )}
          </HrOrgField>
          <HrOrgField label="PIN Code" required={editing} size="sm" error={errors.pincode} id="pin">
            {editing ? (
              <Input
                id="pin"
                value={form.pincode}
                onChange={(e) => applyPincode(e.target.value)}
                className={cpInput("font-mono", errors.pincode ? "error" : "default")}
                placeholder="e.g. 400086"
                inputMode="numeric"
              />
            ) : (
              <ReadValue value={form.pincode} mono />
            )}
          </HrOrgField>
          <HrOrgField label="City" required={editing} size="sm" error={errors.city} id="city">
            {editing ? (
              <Input
                id="city"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className={cpInput(undefined, errors.city ? "error" : "default")}
                placeholder="City"
              />
            ) : (
              <ReadValue value={form.city} />
            )}
          </HrOrgField>
          <HrOrgField label="State" required={editing} size="sm" error={errors.state} id="state">
            {editing ? (
              <Input
                id="state"
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                className={cpInput(undefined, errors.state ? "error" : "default")}
                placeholder="State"
              />
            ) : (
              <ReadValue value={form.state} />
            )}
          </HrOrgField>
          <HrOrgField label="Country" required={editing} size="sm" error={errors.country} id="country">
            {editing ? (
              <Input
                id="country"
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                className={cpInput(undefined, errors.country ? "error" : "default")}
                placeholder="India"
              />
            ) : (
              <ReadValue value={form.country} />
            )}
          </HrOrgField>
        </HrOrgFormSection>
      </HrOrgFormPanel>
      </div>
    </HrOrgPageHeader>
  );
}
