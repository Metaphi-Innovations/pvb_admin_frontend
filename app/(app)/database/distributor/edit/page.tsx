"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormContainer } from "@/components/layout/FormContainer";
import { cn } from "@/lib/utils";
import {
  loadDistributors,
  saveDistributors,
  type Distributor,
  VIEW_DISTRIBUTOR_STORAGE_KEY,
} from "../distributor-data";

type DistributorFormValues = {
  firmName: string;
  contactPersonName: string;
  yearsInBusiness: string;
  address: string;
  gender: Distributor["gender"];
  phoneNumber: string;
  village: string;
  town: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  companiesDealingIn: string;
  latLong: string;
  annualTurnover: string;
  annualBusinessPotential: string;
  farmerNetwork: string;
  distributorCategory: string;
};

type DistributorFormErrors = Partial<Record<keyof DistributorFormValues, string>>;

function toFormValues(distributor: Distributor): DistributorFormValues {
  return {
    firmName: distributor.firmName,
    contactPersonName: distributor.contactPersonName,
    yearsInBusiness: String(distributor.yearsInBusiness),
    address: distributor.address,
    gender: distributor.gender,
    phoneNumber: distributor.phoneNumber,
    village: distributor.village,
    town: distributor.town,
    city: distributor.city,
    district: distributor.district,
    state: distributor.state,
    pincode: distributor.pincode,
    companiesDealingIn: distributor.companiesDealingIn,
    latLong: distributor.latLong,
    annualTurnover: distributor.annualTurnover,
    annualBusinessPotential: distributor.annualBusinessPotential,
    farmerNetwork: distributor.farmerNetwork,
    distributorCategory: distributor.distributorCategory,
  };
}

function toDistributor(id: number, form: DistributorFormValues): Distributor {
  return {
    id,
    firmName: form.firmName.trim(),
    contactPersonName: form.contactPersonName.trim(),
    yearsInBusiness: Number.parseInt(form.yearsInBusiness, 10),
    address: form.address.trim(),
    gender: form.gender,
    phoneNumber: form.phoneNumber.trim(),
    village: form.village.trim(),
    town: form.town.trim(),
    city: form.city.trim(),
    district: form.district.trim(),
    state: form.state.trim(),
    pincode: form.pincode.trim(),
    companiesDealingIn: form.companiesDealingIn.trim(),
    latLong: form.latLong.trim(),
    annualTurnover: form.annualTurnover.trim(),
    annualBusinessPotential: form.annualBusinessPotential.trim(),
    farmerNetwork: form.farmerNetwork.trim(),
    distributorCategory: form.distributorCategory.trim(),
  };
}

function validateForm(form: DistributorFormValues): DistributorFormErrors {
  const errors: DistributorFormErrors = {};

  if (!form.firmName.trim()) errors.firmName = "Firm name is required.";
  if (!form.contactPersonName.trim()) {
    errors.contactPersonName = "Contact person name is required.";
  }
  if (!form.phoneNumber.trim()) errors.phoneNumber = "Phone number is required.";
  if (!form.state.trim()) errors.state = "State is required.";
  if (!form.district.trim()) errors.district = "District is required.";
  if (!form.city.trim()) errors.city = "City is required.";
  if (!form.village.trim()) errors.village = "Village is required.";

  const yearsInBusiness = Number.parseInt(form.yearsInBusiness, 10);
  if (!form.yearsInBusiness.trim()) {
    errors.yearsInBusiness = "Years in business is required.";
  } else if (Number.isNaN(yearsInBusiness) || yearsInBusiness < 0) {
    errors.yearsInBusiness = "Enter a valid number.";
  }

  return errors;
}

function Toast({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
}) {
  return (
    <div
      className={cn(
        "fixed right-5 top-5 z-[100] rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl",
        type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      <div className="flex items-center gap-2">
        <span>{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="text-white/80 transition hover:text-white"
          aria-label="Dismiss message"
        >
          x
        </button>
      </div>
    </div>
  );
}

function SectionDivider({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-2 border-b border-border/40 pb-2">
      <p className="text-xs font-semibold text-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

const fieldClass =
  "h-9 rounded-lg border-border/70 bg-white text-sm shadow-none focus-visible:ring-1 focus-visible:ring-brand-500/30 placeholder:text-muted-foreground/50";
const selectClass = cn(
  fieldClass,
  "w-full border px-3 text-sm outline-none transition-colors",
  "focus:ring-1 focus:ring-brand-500/30",
);

export default function DistributorEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [currentDistributorId, setCurrentDistributorId] = useState<number | null>(null);
  const [form, setForm] = useState<DistributorFormValues | null>(null);
  const [errors, setErrors] = useState<DistributorFormErrors>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null,
  );

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

  const setField = <K extends keyof DistributorFormValues>(
    key: K,
    value: DistributorFormValues[K],
  ) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
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
    if (!form || currentDistributorId === null) {
      return;
    }

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setToast({ message: "Please fix the highlighted fields.", type: "error" });
      return;
    }

    const updatedDistributor = toDistributor(currentDistributorId, form);
    const updatedDistributors = distributors.map((distributor) =>
      distributor.id === currentDistributorId ? updatedDistributor : distributor,
    );

    saveDistributors(updatedDistributors);
    setDistributors(updatedDistributors);
    setToast({ message: "Distributor updated successfully.", type: "success" });

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        VIEW_DISTRIBUTOR_STORAGE_KEY,
        String(currentDistributorId),
      );
    }

    window.setTimeout(() => {
      router.push("/database/distributor");
    }, 700);
  };

  if (!form || !currentDistributor) {
    return null;
  }

  return (
    <FormContainer
      title="Edit Distributor"
      description="Database / Distributor / Edit"
      onBack={() => router.push("/database/distributor")}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-lg text-xs font-semibold"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            className="h-9 rounded-lg bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700"
            onClick={handleSave}
          >
            Update Distributor
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <SectionDivider
            title="Distributor Details"
            subtitle="Primary contact and profile information"
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Firm Name" required error={errors.firmName}>
              <Input
                value={form.firmName}
                onChange={(event) => setField("firmName", event.target.value)}
                className={cn(fieldClass, errors.firmName && "border-red-400")}
                placeholder="Enter firm name"
              />
            </Field>
            <Field
              label="Contact Person Name"
              required
              error={errors.contactPersonName}
            >
              <Input
                value={form.contactPersonName}
                onChange={(event) =>
                  setField("contactPersonName", event.target.value)
                }
                className={cn(
                  fieldClass,
                  errors.contactPersonName && "border-red-400",
                )}
                placeholder="Enter contact person name"
              />
            </Field>
            <Field label="Gender">
              <select
                value={form.gender}
                onChange={(event) =>
                  setField("gender", event.target.value as Distributor["gender"])
                }
                className={selectClass}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Phone Number" required error={errors.phoneNumber}>
              <Input
                value={form.phoneNumber}
                onChange={(event) => setField("phoneNumber", event.target.value)}
                className={cn(fieldClass, errors.phoneNumber && "border-red-400")}
                placeholder="Enter phone number"
              />
            </Field>
            <Field
              label="Years in Business"
              required
              error={errors.yearsInBusiness}
              className="lg:col-span-1"
            >
              <Input
                type="number"
                min="0"
                value={form.yearsInBusiness}
                onChange={(event) =>
                  setField("yearsInBusiness", event.target.value)
                }
                className={cn(
                  fieldClass,
                  errors.yearsInBusiness && "border-red-400",
                )}
                placeholder="0"
              />
            </Field>
          </div>
        </section>

        <section>
          <SectionDivider
            title="Location Details"
            subtitle="Address hierarchy and geo information"
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Address" className="lg:col-span-2">
              <Textarea
                value={form.address}
                onChange={(event) => setField("address", event.target.value)}
                className="min-h-[96px] rounded-lg border-border/70 bg-white text-sm shadow-none focus-visible:ring-1 focus-visible:ring-brand-500/30 placeholder:text-muted-foreground/50"
                placeholder="Enter address"
              />
            </Field>
            <Field label="Village" required error={errors.village}>
              <Input
                value={form.village}
                onChange={(event) => setField("village", event.target.value)}
                className={cn(fieldClass, errors.village && "border-red-400")}
                placeholder="Enter village"
              />
            </Field>
            <Field label="Town">
              <Input
                value={form.town}
                onChange={(event) => setField("town", event.target.value)}
                className={fieldClass}
                placeholder="Enter town"
              />
            </Field>
            <Field label="City" required error={errors.city}>
              <Input
                value={form.city}
                onChange={(event) => setField("city", event.target.value)}
                className={cn(fieldClass, errors.city && "border-red-400")}
                placeholder="Enter city"
              />
            </Field>
            <Field label="District" required error={errors.district}>
              <Input
                value={form.district}
                onChange={(event) => setField("district", event.target.value)}
                className={cn(fieldClass, errors.district && "border-red-400")}
                placeholder="Enter district"
              />
            </Field>
            <Field label="State" required error={errors.state}>
              <Input
                value={form.state}
                onChange={(event) => setField("state", event.target.value)}
                className={cn(fieldClass, errors.state && "border-red-400")}
                placeholder="Enter state"
              />
            </Field>
            <Field label="Pincode">
              <Input
                value={form.pincode}
                onChange={(event) => setField("pincode", event.target.value)}
                className={fieldClass}
                placeholder="Enter pincode"
              />
            </Field>
            <Field label="Lat-long">
              <Input
                value={form.latLong}
                onChange={(event) => setField("latLong", event.target.value)}
                className={fieldClass}
                placeholder="Enter coordinates"
              />
            </Field>
          </div>
        </section>

        <section>
          <SectionDivider
            title="Business Details"
            subtitle="Commercial profile and channel capacity"
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Companies He Is Dealing In" className="lg:col-span-2">
              <Textarea
                value={form.companiesDealingIn}
                onChange={(event) =>
                  setField("companiesDealingIn", event.target.value)
                }
                className="min-h-[96px] rounded-lg border-border/70 bg-white text-sm shadow-none focus-visible:ring-1 focus-visible:ring-brand-500/30 placeholder:text-muted-foreground/50"
                placeholder="Enter company names"
              />
            </Field>
            <Field label="Annual Turnover">
              <Input
                value={form.annualTurnover}
                onChange={(event) =>
                  setField("annualTurnover", event.target.value)
                }
                className={fieldClass}
                placeholder="Enter annual turnover"
              />
            </Field>
            <Field label="Annual Business He Can Do for Us">
              <Input
                value={form.annualBusinessPotential}
                onChange={(event) =>
                  setField("annualBusinessPotential", event.target.value)
                }
                className={fieldClass}
                placeholder="Enter business potential"
              />
            </Field>
            <Field label="Farmer Network">
              <Input
                value={form.farmerNetwork}
                onChange={(event) =>
                  setField("farmerNetwork", event.target.value)
                }
                className={fieldClass}
                placeholder="Enter farmer network"
              />
            </Field>
            <Field label="Distributor Category">
              <Input
                value={form.distributorCategory}
                onChange={(event) =>
                  setField("distributorCategory", event.target.value)
                }
                className={fieldClass}
                placeholder="Enter distributor category"
              />
            </Field>
          </div>
        </section>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </FormContainer>
  );
}
