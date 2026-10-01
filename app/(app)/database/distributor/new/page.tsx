"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormContainer } from "@/components/layout/FormContainer";
import {
  DistributorForm,
  DistributorFormValues,
  DistributorFormErrors,
} from "../components/DistributorForm";
import {
  loadDistributors,
  saveDistributors,
  type Distributor,
  VIEW_DISTRIBUTOR_STORAGE_KEY,
} from "../distributor-data";

function emptyFormValues(): DistributorFormValues {
  return {
    firmName: "",
    contactPersonName: "",
    gender: "Male",
    phoneNumber: "",
    yearsInBusiness: "",
    address: "",
    addressLine2: "",
    pincode: "",
    state: "",
    district: "",
    city: "",
    town: "",
    village: "",
    companiesDealingIn: "",
    annualTurnover: "",
    annualBusinessPotential: "",
    farmerNetwork: "",
  };
}

function validateForm(form: DistributorFormValues): DistributorFormErrors {
  const errors: DistributorFormErrors = {};

  if (!form.firmName.trim()) errors.firmName = "Firm name is required.";
  if (!form.contactPersonName.trim()) {
    errors.contactPersonName = "Contact person name is required.";
  }
  if (!form.phoneNumber.trim()) {
    errors.phoneNumber = "Mobile number is required.";
  } else if (!/^\d{10}$/.test(form.phoneNumber.trim())) {
    errors.phoneNumber = "Mobile number must be exactly 10 digits.";
  }

  const years = Number.parseInt(form.yearsInBusiness, 10);
  if (!form.yearsInBusiness.trim()) {
    errors.yearsInBusiness = "Years in business is required.";
  } else if (Number.isNaN(years) || years < 0) {
    errors.yearsInBusiness = "Years in business must be a valid number.";
  }

  if (!form.address.trim()) errors.address = "Address Line 1 is required.";
  if (!form.pincode.trim()) {
    errors.pincode = "Pincode is required.";
  } else if (!/^\d{6}$/.test(form.pincode.trim())) {
    errors.pincode = "Pincode must be exactly 6 digits.";
  }

  if (!form.state.trim()) errors.state = "State is required (auto-fills from pincode).";
  if (!form.district.trim()) errors.district = "District is required (auto-fills from pincode).";
  if (!form.city.trim()) errors.city = "City is required (auto-fills from pincode).";
  if (!form.town.trim()) errors.town = "City/Town is required.";
  if (!form.village.trim()) errors.village = "Village is required.";
  
  if (!form.companiesDealingIn.trim()) {
    errors.companiesDealingIn = "At least one brand or company must be selected/entered.";
  }

  const turnover = Number.parseFloat(form.annualTurnover);
  if (!form.annualTurnover.trim()) {
    errors.annualTurnover = "Annual turnover is required.";
  } else if (Number.isNaN(turnover) || turnover < 0) {
    errors.annualTurnover = "Enter a valid positive turnover in Cr.";
  }

  const plan = Number.parseFloat(form.annualBusinessPotential);
  if (!form.annualBusinessPotential.trim()) {
    errors.annualBusinessPotential = "Annual business plan is required.";
  } else if (Number.isNaN(plan) || plan < 0) {
    errors.annualBusinessPotential = "Enter a valid positive business plan in Lakhs.";
  }

  if (!form.farmerNetwork.trim()) errors.farmerNetwork = "Farmer network size is required.";

  return errors;
}

export default function NewDistributorPage() {
  const router = useRouter();
  const [form, setForm] = useState<DistributorFormValues>(emptyFormValues());
  const [errors, setErrors] = useState<DistributorFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const setField = <K extends keyof DistributorFormValues>(
    key: K,
    value: DistributorFormValues[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    clearError(key);
  };

  const clearError = (key: keyof DistributorFormValues) => {
    setErrors((current) => {
      if (!current[key]) return current;
      const nextErrors = { ...current };
      delete nextErrors[key];
      return nextErrors;
    });
  };

  const handleCancel = () => {
    router.push("/database/distributor");
  };

  const handleSave = () => {
    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSaving(true);
    const distributorList = loadDistributors();
    
    // Find next ID
    const nextId =
      distributorList.length > 0
        ? Math.max(...distributorList.map((d) => d.id)) + 1
        : 1;

    // Convert form values back to seed structure
    const planLakhs = Number.parseFloat(form.annualBusinessPotential) || 0;
    const planCroresStr = planLakhs > 0 ? `₹${(planLakhs / 100).toFixed(2)} Cr` : "—";
    const turnoverVal = Number.parseFloat(form.annualTurnover) || 0;
    const turnoverStr = turnoverVal > 0 ? `₹${turnoverVal.toFixed(2)} Cr` : "—";

    const newDistributor: Distributor = {
      id: nextId,
      firmName: form.firmName.trim(),
      contactPersonName: form.contactPersonName.trim(),
      gender: form.gender,
      phoneNumber: form.phoneNumber.trim(),
      yearsInBusiness: Number.parseInt(form.yearsInBusiness, 10),
      address: form.address.trim(),
      addressLine2: form.addressLine2.trim() || undefined,
      pincode: form.pincode.trim(),
      state: form.state.trim(),
      district: form.district.trim(),
      city: form.city.trim(),
      town: form.town.trim(),
      village: form.village.trim(),
      companiesDealingIn: form.companiesDealingIn.trim(),
      latLong: "0.0, 0.0", // default coords
      annualTurnover: turnoverStr,
      annualBusinessPotential: planCroresStr,
      farmerNetwork: form.farmerNetwork.trim(),
      source: "erp",
      conversionStatus: "not_converted",
      convertedCustomerId: null,
      submittedAt: new Date().toISOString().slice(0, 10),
    };

    const updatedList = [...distributorList, newDistributor];
    saveDistributors(updatedList);

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(VIEW_DISTRIBUTOR_STORAGE_KEY, String(newDistributor.id));
    }

    // Redirect to list
    setTimeout(() => {
      router.push("/database/distributor");
    }, 500);
  };

  return (
    <FormContainer
      title="Add Distributor"
      description="Database / Distributor / Add"
      onBack={handleCancel}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-lg text-xs font-semibold"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Discard
          </Button>
          <Button
            className="h-9 rounded-lg bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Distributor"}
          </Button>
        </div>
      }
    >
      <DistributorForm
        form={form}
        onChange={setForm}
        errors={errors}
        clearError={clearError}
      />
    </FormContainer>
  );
}
