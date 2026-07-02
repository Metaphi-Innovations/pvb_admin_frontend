"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  parseMonetaryValueInCrores,
  parseMonetaryValueInLakhs,
} from "@/lib/distributor/distributor-scoring";

function toFormValues(distributor: Distributor): DistributorFormValues {
  const planLakhs = parseMonetaryValueInLakhs(distributor.annualBusinessPotential);
  const turnoverCrores = parseMonetaryValueInCrores(distributor.annualTurnover);

  return {
    firmName: distributor.firmName,
    contactPersonName: distributor.contactPersonName,
    yearsInBusiness: String(distributor.yearsInBusiness),
    address: distributor.address,
    addressLine2: distributor.addressLine2 || "",
    gender: distributor.gender,
    phoneNumber: distributor.phoneNumber,
    village: distributor.village,
    town: distributor.town,
    city: distributor.city,
    district: distributor.district,
    state: distributor.state,
    pincode: distributor.pincode,
    companiesDealingIn: distributor.companiesDealingIn,
    annualTurnover: turnoverCrores > 0 ? String(turnoverCrores) : "",
    annualBusinessPotential: planLakhs > 0 ? String(planLakhs) : "",
    farmerNetwork: distributor.farmerNetwork,
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

  if (!form.state.trim()) errors.state = "State is required.";
  if (!form.district.trim()) errors.district = "District is required.";
  if (!form.city.trim()) errors.city = "City is required.";
  if (!form.town.trim()) errors.town = "City/Town is required.";
  if (!form.village.trim()) errors.village = "Village is required.";
  
  if (!form.companiesDealingIn.trim()) {
    errors.companiesDealingIn = "At least one brand must be selected/entered.";
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

export default function DistributorEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [currentDistributorId, setCurrentDistributorId] = useState<number | null>(null);
  const [form, setForm] = useState<DistributorFormValues | null>(null);
  const [errors, setErrors] = useState<DistributorFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const distributorList = loadDistributors();
    setDistributors(distributorList);

    const idFromQuery = Number.parseInt(searchParams.get("id") ?? "", 10);
    const idFromSession =
      typeof window !== "undefined"
        ? Number.parseInt(
            window.sessionStorage.getItem(VIEW_DISTRIBUTOR_STORAGE_KEY) ?? "",
            10,
          )
        : Number.NaN;

    const selectedId = Number.isNaN(idFromQuery) ? idFromSession : idFromQuery;
    const selectedDistributor = distributorList.find(
      (distributor) => distributor.id === selectedId,
    );

    if (!selectedDistributor) {
      router.replace("/database/distributor");
      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        VIEW_DISTRIBUTOR_STORAGE_KEY,
        String(selectedDistributor.id),
      );
    }

    setCurrentDistributorId(selectedDistributor.id);
    setForm(toFormValues(selectedDistributor));
  }, [router, searchParams]);

  const currentDistributor = useMemo(
    () =>
      currentDistributorId === null
        ? null
        : distributors.find((distributor) => distributor.id === currentDistributorId) ?? null,
    [currentDistributorId, distributors],
  );

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
    if (!form || currentDistributorId === null || !currentDistributor) {
      return;
    }

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    const planLakhs = Number.parseFloat(form.annualBusinessPotential) || 0;
    const planCroresStr = planLakhs > 0 ? `₹${(planLakhs / 100).toFixed(2)} Cr` : "—";
    const turnoverVal = Number.parseFloat(form.annualTurnover) || 0;
    const turnoverStr = turnoverVal > 0 ? `₹${turnoverVal.toFixed(2)} Cr` : "—";

    const updatedDistributor: Distributor = {
      ...currentDistributor,
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
      annualTurnover: turnoverStr,
      annualBusinessPotential: planCroresStr,
      farmerNetwork: form.farmerNetwork.trim(),
    };

    const updatedDistributors = distributors.map((distributor) =>
      distributor.id === currentDistributorId ? updatedDistributor : distributor,
    );

    saveDistributors(updatedDistributors);
    
    setTimeout(() => {
      router.push("/database/distributor");
    }, 500);
  };

  if (!form || !currentDistributor) {
    return null;
  }

  return (
    <FormContainer
      title="Edit Distributor"
      description="Database / Distributor / Edit"
      onBack={handleCancel}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-lg text-xs font-semibold"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            className="h-9 rounded-lg bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Update Distributor"}
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
