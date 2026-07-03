"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import {
  computeDistributorAssessment,
  formatCategoryLabel,
  GRADE_A_COMPANIES,
  GRADE_B_COMPANIES,
} from "@/lib/distributor/distributor-scoring";
import { hydratePostalMaster } from "@/lib/geography/postal-master-store";
import { getTownsForPincode, lookupPostalPincode } from "@/lib/address/postal-lookup";

export interface DistributorFormValues {
  firmName: string;
  contactPersonName: string;
  gender: "Male" | "Female" | "Other";
  phoneNumber: string;
  yearsInBusiness: string;
  address: string;
  addressLine2: string;
  pincode: string;
  state: string;
  district: string;
  city: string;
  town: string;
  village: string;
  companiesDealingIn: string;
  annualTurnover: string; // Turnover in Cr (e.g. "1.80")
  annualBusinessPotential: string; // Business Plan in Lakhs (e.g. "42.00")
  farmerNetwork: string;
}

export type DistributorFormErrors = Partial<Record<keyof DistributorFormValues, string>>;

interface DistributorFormProps {
  form: DistributorFormValues;
  onChange: (f: DistributorFormValues) => void;
  errors: DistributorFormErrors;
  clearError: (key: keyof DistributorFormValues) => void;
  readOnly?: boolean;
}

function SectionHead({ label, sub, required }: { label: string; sub?: string; required?: boolean }) {
  return (
    <div className="mb-3 pb-2 border-b border-border/60">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

const fieldClass =
  "h-9 rounded-lg border-border/70 bg-white text-xs shadow-none focus-visible:ring-1 focus-visible:ring-brand-500/30 placeholder:text-muted-foreground/50";

export function DistributorForm({
  form,
  onChange,
  errors,
  clearError,
  readOnly = false,
}: DistributorFormProps) {
  const patch = (p: Partial<DistributorFormValues>) => {
    onChange({ ...form, ...p });
  };

  // State to hold whether the postal master has loaded
  const [postalReady, setPostalReady] = useState(false);
  const [townOptionsList, setTownOptionsList] = useState<string[]>([]);
  
  // Local state for custom "Others" input to prevent cursor jumping and trailing comma stripping
  const [localOthersVal, setLocalOthersVal] = useState("");

  // List of all standard companies in the image (A + B)
  const allStandardCompanies = useMemo(() => {
    return [...GRADE_A_COMPANIES, ...GRADE_B_COMPANIES].sort();
  }, []);

  // Map option list for the dropdown
  const companyOptions = useMemo(() => {
    return allStandardCompanies.map((c) => ({ value: c, label: c }));
  }, [allStandardCompanies]);

  // Parse current selected companies
  const selectedCompanies = useMemo(() => {
    return form.companiesDealingIn
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
  }, [form.companiesDealingIn]);

  // Standard companies that are currently selected
  const selectedStandardCompanies = useMemo(() => {
    return selectedCompanies.filter((sc) =>
      allStandardCompanies.some((c) => c.toLowerCase() === sc.toLowerCase())
    );
  }, [selectedCompanies, allStandardCompanies]);

  // Custom companies that are currently selected (Others)
  const selectedOtherCompanies = useMemo(() => {
    return selectedCompanies.filter(
      (sc) => !allStandardCompanies.some((c) => c.toLowerCase() === sc.toLowerCase())
    );
  }, [selectedCompanies, allStandardCompanies]);

  // Sync local text input when database string changes from outside
  useEffect(() => {
    const list = selectedCompanies.filter(
      (sc) => !allStandardCompanies.some((c) => c.toLowerCase() === sc.toLowerCase())
    );
    const expectedText = list.join(", ");
    
    const normalize = (str: string) =>
      str
        .split(/[,;|/]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .sort()
        .join(",");
        
    if (normalize(expectedText) !== normalize(localOthersVal)) {
      setLocalOthersVal(expectedText);
    }
  }, [form.companiesDealingIn, allStandardCompanies]);

  const handleDropdownSelect = (values: string[]) => {
    if (readOnly) return;
    const combined = [...values, ...selectedOtherCompanies];
    const unique = Array.from(new Set(combined));
    patch({ companiesDealingIn: unique.join(", ") });
    clearError("companiesDealingIn");
  };

  const handleRemoveCompany = (companyName: string) => {
    if (readOnly) return;
    const next = selectedCompanies.filter((c) => c.toLowerCase() !== companyName.toLowerCase());
    patch({ companiesDealingIn: next.join(", ") });
  };

  const handleOthersChange = (value: string) => {
    if (readOnly) return;
    setLocalOthersVal(value);

    // Split custom brands keeping standard ones intact
    const customList = value
      .split(/[,;|/]+/)
      .map((c) => c.trim())
      .filter(Boolean);
      
    const combined = [...selectedStandardCompanies, ...customList];
    const unique = Array.from(new Set(combined));
    patch({ companiesDealingIn: unique.join(", ") });
    clearError("companiesDealingIn");
  };

  // Hydrate postal master on mount
  useEffect(() => {
    let active = true;
    hydratePostalMaster().then(() => {
      if (active) {
        setPostalReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Sync towns list and auto-fill when pincode changes
  useEffect(() => {
    const rawPin = form.pincode.replace(/\D/g, "").slice(0, 6);
    if (!postalReady || rawPin.length !== 6) {
      setTownOptionsList([]);
      return;
    }

    const towns = getTownsForPincode(rawPin);
    setTownOptionsList(towns);

    const loc = lookupPostalPincode(rawPin, form.town);
    if (loc) {
      const updates: Partial<DistributorFormValues> = {
        state: loc.state,
        district: loc.district,
        city: loc.city,
      };
      
      // Auto-select town if there is exactly 1 match
      if (towns.length === 1) {
        updates.town = towns[0];
        clearError("town");
      }
      
      patch(updates);
      clearError("state");
      clearError("district");
      clearError("city");
    }
  }, [postalReady, form.pincode]);

  const handleTownChange = (selectedTown: string) => {
    if (readOnly) return;
    const rawPin = form.pincode.replace(/\D/g, "").slice(0, 6);
    const loc = lookupPostalPincode(rawPin, selectedTown);
    if (loc) {
      patch({
        town: selectedTown,
        city: loc.city,
        district: loc.district,
        state: loc.state,
      });
      clearError("town");
      clearError("city");
      clearError("district");
      clearError("state");
    } else {
      patch({ town: selectedTown });
      clearError("town");
    }
  };

  // Assessment preview values
  const liveAssessment = useMemo(() => {
    const planLakhs = Number.parseFloat(form.annualBusinessPotential) || 0;
    const planCroresStr = planLakhs > 0 ? `₹${(planLakhs / 100).toFixed(4)} Cr` : "0";

    const turnoverVal = Number.parseFloat(form.annualTurnover) || 0;
    const turnoverStr = turnoverVal > 0 ? `₹${turnoverVal.toFixed(2)} Cr` : "0";

    return computeDistributorAssessment({
      companiesDealingIn: form.companiesDealingIn,
      annualTurnover: turnoverStr,
      yearsInBusiness: Number.parseInt(form.yearsInBusiness, 10) || 0,
      annualBusinessPotential: planCroresStr,
    });
  }, [form.companiesDealingIn, form.annualTurnover, form.yearsInBusiness, form.annualBusinessPotential]);

  const townDropdownOptions = useMemo(() => {
    return townOptionsList.map((town) => ({ value: town, label: town }));
  }, [townOptionsList]);

  return (
    <div className="space-y-6">
      {/* 1. Primary Profile Information */}
      <section className="bg-white rounded-xl border border-border/80 p-4 shadow-sm">
        <SectionHead label="Distributor Details" sub="Firm name, primary contact person, gender, phone number & business experience" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Firm Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.firmName}
              onChange={(e) => {
                patch({ firmName: e.target.value });
                clearError("firmName");
              }}
              readOnly={readOnly}
              className={cn(fieldClass, errors.firmName && "border-red-400 focus-visible:ring-red-200")}
              placeholder="Enter firm name"
            />
            {errors.firmName && <p className="text-[10px] font-medium text-red-500">{errors.firmName}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Contact Person Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.contactPersonName}
              onChange={(e) => {
                patch({ contactPersonName: e.target.value });
                clearError("contactPersonName");
              }}
              readOnly={readOnly}
              className={cn(fieldClass, errors.contactPersonName && "border-red-400 focus-visible:ring-red-200")}
              placeholder="Enter contact person name"
            />
            {errors.contactPersonName && <p className="text-[10px] font-medium text-red-500">{errors.contactPersonName}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Gender</Label>
            <AutocompleteSelect
              options={["Male", "Female", "Other"].map((g) => ({ value: g, label: g }))}
              value={form.gender}
              onChange={(v) => patch({ gender: v as any })}
              disabled={readOnly}
              placeholder="Select gender"
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Mobile Number <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.phoneNumber}
              onChange={(e) => {
                patch({ phoneNumber: e.target.value });
                clearError("phoneNumber");
              }}
              readOnly={readOnly}
              maxLength={10}
              className={cn(fieldClass, errors.phoneNumber && "border-red-400 focus-visible:ring-red-200")}
              placeholder="10-digit mobile number"
            />
            {errors.phoneNumber && <p className="text-[10px] font-medium text-red-500">{errors.phoneNumber}</p>}
          </div>

          <div className="space-y-1.5 col-span-1">
            <Label className="text-xs font-semibold text-foreground">
              Years in Business <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              value={form.yearsInBusiness}
              onChange={(e) => {
                patch({ yearsInBusiness: e.target.value });
                clearError("yearsInBusiness");
              }}
              readOnly={readOnly}
              className={cn(fieldClass, errors.yearsInBusiness && "border-red-400 focus-visible:ring-red-200")}
              placeholder="Years in business"
            />
            {errors.yearsInBusiness && <p className="text-[10px] font-medium text-red-500">{errors.yearsInBusiness}</p>}
          </div>
        </div>
      </section>

      {/* 2. Address & Geography Details */}
      <section className="bg-white rounded-xl border border-border/80 p-4 shadow-sm">
        <SectionHead label="Location & Address" sub="Pincode lookup maps automatically to State, District, and City. Select the Town and type Address/Village." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Pincode <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.pincode}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                patch({ pincode: digits });
                clearError("pincode");
              }}
              readOnly={readOnly}
              maxLength={6}
              className={cn(fieldClass, errors.pincode && "border-red-400 focus-visible:ring-red-200")}
              placeholder="e.g. 388001"
            />
            {errors.pincode && <p className="text-[10px] font-medium text-red-500">{errors.pincode}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              State <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.state}
              readOnly
              className={cn(fieldClass, "bg-muted/30 text-muted-foreground", errors.state && "border-red-400")}
              placeholder="Auto-filled from pincode"
            />
            {errors.state && <p className="text-[10px] font-medium text-red-500">{errors.state}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              District <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.district}
              readOnly
              className={cn(fieldClass, "bg-muted/30 text-muted-foreground", errors.district && "border-red-400")}
              placeholder="Auto-filled from pincode"
            />
            {errors.district && <p className="text-[10px] font-medium text-red-500">{errors.district}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              City/Town <span className="text-red-500">*</span>
            </Label>
            {townDropdownOptions.length > 0 ? (
              <AutocompleteSelect
                options={townDropdownOptions}
                value={form.town}
                onChange={handleTownChange}
                disabled={readOnly}
                placeholder="Select city/town"
                className="h-9 text-xs"
              />
            ) : (
              <Input
                value={form.town || form.city}
                onChange={(e) => handleTownChange(e.target.value)}
                readOnly={readOnly}
                className={cn(fieldClass, (errors.town || errors.city) && "border-red-400")}
                placeholder="Enter city/town"
              />
            )}
            {(errors.town || errors.city) && <p className="text-[10px] font-medium text-red-500">{errors.town || errors.city}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Village <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.village}
              onChange={(e) => {
                patch({ village: e.target.value });
                clearError("village");
              }}
              readOnly={readOnly}
              className={cn(fieldClass, errors.village && "border-red-400 focus-visible:ring-red-200")}
              placeholder="Enter village"
            />
            {errors.village && <p className="text-[10px] font-medium text-red-500">{errors.village}</p>}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-semibold text-foreground">
              Address Line 1 <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.address}
              onChange={(e) => {
                patch({ address: e.target.value });
                clearError("address");
              }}
              readOnly={readOnly}
              className={cn(fieldClass, errors.address && "border-red-400 focus-visible:ring-red-200")}
              placeholder="Flat/House/Shop No., building/lane name"
            />
            {errors.address && <p className="text-[10px] font-medium text-red-500">{errors.address}</p>}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-semibold text-foreground">Address Line 2</Label>
            <Input
              value={form.addressLine2}
              onChange={(e) => patch({ addressLine2: e.target.value })}
              readOnly={readOnly}
              className={fieldClass}
              placeholder="Area, landmark or secondary address"
            />
          </div>
        </div>
      </section>

      {/* 3. Business & Agri-Input Companies details */}
      <section className="bg-white rounded-xl border border-border/80 p-4 shadow-sm">
        <SectionHead label="Business details & Brands" sub="Companies worked with (Category A/B auto-scoring), Annual turnover, Business plan and Farmer network" />
        
        {/* Companies Row (Dropdown + Other Brands half-and-half) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* Left Column: Dropdown Selection & Chips */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Agri-input Companies Dealing In <span className="text-red-500">*</span>
            </Label>
            <AutocompleteSelect
              options={companyOptions}
              value={selectedStandardCompanies}
              onChange={handleDropdownSelect}
              multiple={true}
              disabled={readOnly}
              placeholder="Search and select companies..."
              className="min-h-9 text-xs"
            />

            {/* Selected brands chips */}
            {selectedStandardCompanies.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-100 rounded-lg max-h-[120px] overflow-y-auto mt-1.5">
                {selectedStandardCompanies.map((company) => (
                  <span
                    key={company}
                    className="inline-flex items-center gap-1 bg-white border border-brand-200 text-brand-700 rounded-md px-2 py-0.5 text-xs font-medium"
                  >
                    {company}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCompany(company)}
                        className="text-brand-500 hover:text-brand-700 focus:outline-none"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            
            {errors.companiesDealingIn && (
              <p className="text-[10px] font-medium text-red-500">{errors.companiesDealingIn}</p>
            )}
          </div>

          {/* Right Column: Other Brands Comma Separated */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Other Brands (Comma separated)
            </Label>
            <Input
              value={localOthersVal}
              onChange={(e) => handleOthersChange(e.target.value)}
              readOnly={readOnly}
              className={fieldClass}
              placeholder="e.g. Organic India, Dharitri Sutra, IFFCO"
            />
          </div>
        </div>

        {/* Financial and Network Numbers */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Annual Turnover (Cr INR) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.annualTurnover}
                onChange={(e) => {
                  patch({ annualTurnover: e.target.value });
                  clearError("annualTurnover");
                }}
                readOnly={readOnly}
                className={cn(fieldClass, "pr-12", errors.annualTurnover && "border-red-400 focus-visible:ring-red-200")}
                placeholder="e.g. 1.80"
              />
              <span className="absolute right-3 top-2.5 text-[10px] font-semibold text-muted-foreground">Cr</span>
            </div>
            {errors.annualTurnover && <p className="text-[10px] font-medium text-red-500">{errors.annualTurnover}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Annual Business Plan FY27 (Lakh INR) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                min="0"
                value={form.annualBusinessPotential}
                onChange={(e) => {
                  patch({ annualBusinessPotential: e.target.value });
                  clearError("annualBusinessPotential");
                }}
                readOnly={readOnly}
                className={cn(fieldClass, "pr-12", errors.annualBusinessPotential && "border-red-400 focus-visible:ring-red-200")}
                placeholder="e.g. 42.0"
              />
              <span className="absolute right-3 top-2.5 text-[10px] font-semibold text-muted-foreground">Lakh</span>
            </div>
            {errors.annualBusinessPotential && (
              <p className="text-[10px] font-medium text-red-500">{errors.annualBusinessPotential}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Farmer Network Size <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.farmerNetwork}
              onChange={(e) => {
                patch({ farmerNetwork: e.target.value });
                clearError("farmerNetwork");
              }}
              readOnly={readOnly}
              className={cn(fieldClass, errors.farmerNetwork && "border-red-400 focus-visible:ring-red-200")}
              placeholder="e.g. 1,250 Farmers"
            />
            {errors.farmerNetwork && <p className="text-[10px] font-medium text-red-500">{errors.farmerNetwork}</p>}
          </div>
        </div>
      </section>

      {/* 4. Live ERP Scoring Auto Assessment Panel */}
      {liveAssessment && (
        <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-inner">
          <SectionHead label="ERP Auto Assessment Preview" sub="Calculated live based on rules provided in spreadsheet. Final parameters will freeze upon saving." />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            <div className="rounded-lg bg-white border border-border/80 p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Weighted Score</p>
              <p className="text-xl font-extrabold text-slate-800 mt-1 tabular-nums">
                {liveAssessment.weightedScore.toFixed(1)} / 100
              </p>
            </div>
            
            <div className="rounded-lg bg-white border border-border/80 p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Category</p>
              <p className={cn(
                "text-xl font-extrabold mt-1",
                liveAssessment.category === "A" && "text-emerald-700",
                liveAssessment.category === "B" && "text-blue-700",
                liveAssessment.category === "C" && "text-amber-700"
              )}>
                {formatCategoryLabel(liveAssessment.category)}
              </p>
            </div>

            <div className="rounded-lg bg-white border border-border/80 p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Credit Limit (INR)</p>
              <p className="text-xl font-extrabold text-slate-800 mt-1">
                {liveAssessment.creditLimit > 0
                  ? `₹${(liveAssessment.creditLimit / 100_000).toFixed(2)} Lakh`
                  : "Cash & Carry"}
              </p>
              {liveAssessment.creditLimit > 0 && (
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  ({liveAssessment.category === "A" ? "50%" : "30%"} of business plan)
                </p>
              )}
            </div>

            <div className="rounded-lg bg-white border border-border/80 p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Credit Period</p>
              <p className="text-xl font-extrabold text-slate-800 mt-1">
                {liveAssessment.creditPeriodDays > 0 ? `${liveAssessment.creditPeriodDays} Days` : "0 Days"}
              </p>
            </div>
          </div>

          {/* Breakdown description */}
          <div className="mt-3 bg-white/70 border border-slate-100 rounded-lg p-2.5 text-[11px] text-muted-foreground space-y-1.5">
            <div className="font-semibold text-slate-700 border-b border-border/30 pb-1 flex justify-between">
              <span>Scoring Weightage Matrix Breakdown:</span>
              <span>Total: {liveAssessment.totalWeightedPoints} / 10000</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div>• <b>Brands (35%):</b> {liveAssessment.companyMarks} Marks ({liveAssessment.companyScoreReason})</div>
              <div>• <b>Turnover (20%):</b> {liveAssessment.turnoverMarks} Marks</div>
              <div>• <b>Tenure (25%):</b> {liveAssessment.tenureMarks} Marks</div>
              <div>• <b>Plan FY27 (20%):</b> {liveAssessment.businessPlanMarks} Marks</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
