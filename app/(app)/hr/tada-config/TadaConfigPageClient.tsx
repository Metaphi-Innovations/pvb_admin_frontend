"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Settings2 } from "lucide-react";
import {
  HrPolicySection,
  PolicyField,
  compactSelect,
} from "../components/HrPolicySection";
import {
  CITY_CATEGORY_POLICY_OPTIONS,
  LOCAL_CONVEYANCE_MODE_OPTIONS,
  SF_ROLE_OPTIONS,
  TRAVEL_CLASS_OPTIONS,
  VEHICLE_TYPE_POLICY_OPTIONS,
  loadRoleEntitlements,
  saveRoleEntitlements,
  loadCityCategories,
  saveCityCategories,
  loadLodgingBoarding,
  saveLodgingBoarding,
  loadLocalTravel,
  saveLocalTravel,
  loadKmReimbursement,
  saveKmReimbursement,
  loadIncidental,
  saveIncidental,
  loadClaimTypes,
  saveClaimTypes,
  nextPolicyId,
  stampNew,
  stampUpdate,
  type RoleEntitlement,
  type CityCategoryMaster,
  type LodgingBoardingPolicy,
  type LocalTravelPolicy,
  type KmReimbursementPolicy,
  type IncidentalPolicy,
  type ClaimTypeMaster,
} from "./tada-config-data";

const TABS = [
  { id: "role", label: "Role Entitlement" },
  { id: "city", label: "City Category" },
  { id: "lodging", label: "Lodging & Boarding" },
  { id: "local", label: "Local Travel" },
  { id: "km", label: "KM Reimbursement" },
  { id: "incidental", label: "Incidental" },
  { id: "claimType", label: "Claim Types" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TAB_IDS = new Set(TABS.map((t) => t.id));

export default function TadaConfigPageClient() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>("role");

  useEffect(() => {
    const q = searchParams.get("tab");
    if (q && TAB_IDS.has(q as TabId)) setTab(q as TabId);
  }, [searchParams]);
  const [roles, setRoles] = useState(loadRoleEntitlements);
  const [cities, setCities] = useState(loadCityCategories);
  const [lodging, setLodging] = useState(loadLodgingBoarding);
  const [localT, setLocalT] = useState(loadLocalTravel);
  const [km, setKm] = useState(loadKmReimbursement);
  const [incidental, setIncidental] = useState(loadIncidental);
  const [claimTypes, setClaimTypes] = useState(loadClaimTypes);

  const refresh = useCallback(() => {
    setRoles(loadRoleEntitlements());
    setCities(loadCityCategories());
    setLodging(loadLodgingBoarding());
    setLocalT(loadLocalTravel());
    setKm(loadKmReimbursement());
    setIncidental(loadIncidental());
    setClaimTypes(loadClaimTypes());
  }, []);

  const saveRoles = (l: RoleEntitlement[]) => {
    saveRoleEntitlements(l);
    setRoles(l);
  };

  return (
    <AppLayout>
      <div className="max-w-[1280px] mx-auto space-y-4">
        <PageHeader
          title="TA/DA Configuration"
          description="Sales Force travel policy — roles, city categories, allowances, and claim rules."
          icon={Settings2}
          breadcrumbs={[
            { label: "HR", href: "/hr/attendance" },
            { label: "TA/DA Configuration" },
          ]}
        />

        <div className="flex gap-1 border-b border-border overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as TabId)}
              className={cn(
                "px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px",
                tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "role" && (
          <HrPolicySection<RoleEntitlement>
            title="Role / Grade Entitlement"
            description="Travel class and conveyance by designation (NSM, RSM, ASM, TM, Agronomist)."
            records={roles}
            onSave={saveRoles}
            searchKeys={["designation", "travelClass", "localConveyanceMode"]}
            defaultForm={{ designation: "", travelClass: "Economy", airTravelAllowed: false, localConveyanceMode: "Auto / Taxi", status: "active" }}
            columns={[
              { key: "designation", header: "Role / Designation", sortable: true },
              { key: "travelClass", header: "Travel Class", sortable: true },
              { key: "airTravelAllowed", header: "Air Travel", render: (r) => (r.airTravelAllowed ? "Yes" : "No") },
              { key: "localConveyanceMode", header: "Local Conveyance" },
            ]}
            getFormFromRecord={(r) => ({ ...r })}
            recordFromForm={(f, id, ex) =>
              stampUpdate(
                stampNew(
                  {
                    designation: String(f.designation),
                    travelClass: String(f.travelClass),
                    airTravelAllowed: Boolean(f.airTravelAllowed),
                    localConveyanceMode: String(f.localConveyanceMode),
                    status: (f.status as RoleEntitlement["status"]) ?? "active",
                    createdBy: ex?.createdBy,
                    createdAt: ex?.createdAt,
                  },
                  id,
                ),
              )
            }
            validate={(f) => (!f.designation ? "Designation is required." : null)}
            renderFormFields={({ form, setForm }) => (
              <div className="grid grid-cols-1 gap-3">
                <PolicyField label="Role / Designation" required>
                  <Select value={String(form.designation || "")} onValueChange={(v) => setForm((f) => ({ ...f, designation: v }))}>
                    <SelectTrigger className={compactSelect()}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{SF_ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
                  </Select>
                </PolicyField>
                <PolicyField label="Travel Class" required>
                  <Select value={String(form.travelClass || "")} onValueChange={(v) => setForm((f) => ({ ...f, travelClass: v }))}>
                    <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                    <SelectContent>{TRAVEL_CLASS_OPTIONS.map((r) => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
                  </Select>
                </PolicyField>
                <PolicyField label="Air Travel Allowed">
                  <Select value={form.airTravelAllowed ? "yes" : "no"} onValueChange={(v) => setForm((f) => ({ ...f, airTravelAllowed: v === "yes" }))}>
                    <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="yes" className="text-xs">Yes</SelectItem><SelectItem value="no" className="text-xs">No</SelectItem></SelectContent>
                  </Select>
                </PolicyField>
                <PolicyField label="Local Conveyance Mode">
                  <Select value={String(form.localConveyanceMode || "")} onValueChange={(v) => setForm((f) => ({ ...f, localConveyanceMode: v }))}>
                    <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                    <SelectContent>{LOCAL_CONVEYANCE_MODE_OPTIONS.map((r) => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
                  </Select>
                </PolicyField>
              </div>
            )}
          />
        )}

        {tab === "city" && (
          <HrPolicySection<CityCategoryMaster>
            title="City Category Master"
            records={cities}
            onSave={(l) => { saveCityCategories(l); setCities(l); }}
            searchKeys={["cityName", "cityCategory"]}
            defaultForm={{ cityName: "", cityCategory: "Metro", status: "active" }}
            columns={[
              { key: "cityName", header: "City Name", sortable: true },
              { key: "cityCategory", header: "City Category", sortable: true },
            ]}
            getFormFromRecord={(r) => ({ ...r })}
            recordFromForm={(f, id, ex) =>
              stampUpdate(stampNew({ cityName: String(f.cityName), cityCategory: String(f.cityCategory), status: f.status as CityCategoryMaster["status"], createdBy: ex?.createdBy, createdAt: ex?.createdAt }, id))
            }
            validate={(f) => (!f.cityName ? "City name required." : null)}
            renderFormFields={({ form, setForm }) => (
              <div className="grid grid-cols-1 gap-3">
                <PolicyField label="City Name" required><Input className="h-8 text-xs" value={String(form.cityName || "")} onChange={(e) => setForm((f) => ({ ...f, cityName: e.target.value }))} /></PolicyField>
                <PolicyField label="City Category" required>
                  <Select value={String(form.cityCategory || "")} onValueChange={(v) => setForm((f) => ({ ...f, cityCategory: v }))}>
                    <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                    <SelectContent>{CITY_CATEGORY_POLICY_OPTIONS.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </PolicyField>
              </div>
            )}
          />
        )}

        {tab === "lodging" && (
          <HrPolicySection<LodgingBoardingPolicy>
            title="Lodging & Boarding Policy"
            records={lodging}
            onSave={(l) => { saveLodgingBoarding(l); setLodging(l); }}
            searchKeys={["designation", "cityCategory"]}
            defaultForm={{ designation: "Territory Manager", cityCategory: "Metro", lodgingLimit: 0, boardingLimit: 0, status: "active" }}
            columns={[
              { key: "designation", header: "Designation", sortable: true },
              { key: "cityCategory", header: "City Category", sortable: true },
              { key: "lodgingLimit", header: "Lodging Limit", render: (r) => `₹${r.lodgingLimit}` },
              { key: "boardingLimit", header: "Boarding Limit", render: (r) => `₹${r.boardingLimit}` },
            ]}
            getFormFromRecord={(r) => ({ ...r })}
            recordFromForm={(f, id, ex) =>
              stampUpdate(stampNew({
                designation: String(f.designation),
                cityCategory: String(f.cityCategory),
                lodgingLimit: Number(f.lodgingLimit) || 0,
                boardingLimit: Number(f.boardingLimit) || 0,
                status: f.status as LodgingBoardingPolicy["status"],
                createdBy: ex?.createdBy,
                createdAt: ex?.createdAt,
              }, id))
            }
            validate={(f) => (!f.designation || !f.cityCategory ? "Designation and city category required." : null)}
            renderFormFields={({ form, setForm }) => (
              <div className="grid grid-cols-2 gap-3">
                <PolicyField label="Designation" className="col-span-2">
                  <Select value={String(form.designation || "")} onValueChange={(v) => setForm((f) => ({ ...f, designation: v }))}>
                    <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                    <SelectContent>{SF_ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
                  </Select>
                </PolicyField>
                <PolicyField label="City Category">
                  <Select value={String(form.cityCategory || "")} onValueChange={(v) => setForm((f) => ({ ...f, cityCategory: v }))}>
                    <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                    <SelectContent>{CITY_CATEGORY_POLICY_OPTIONS.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </PolicyField>
                <PolicyField label="Lodging Limit (₹)"><Input type="number" className="h-8 text-xs" value={form.lodgingLimit ?? ""} onChange={(e) => setForm((f) => ({ ...f, lodgingLimit: Number(e.target.value) }))} /></PolicyField>
                <PolicyField label="Boarding Limit (₹)"><Input type="number" className="h-8 text-xs" value={form.boardingLimit ?? ""} onChange={(e) => setForm((f) => ({ ...f, boardingLimit: Number(e.target.value) }))} /></PolicyField>
              </div>
            )}
          />
        )}

        {tab === "local" && (
          <HrPolicySection<LocalTravelPolicy>
            title="Local Travel Policy"
            records={localT}
            onSave={(l) => { saveLocalTravel(l); setLocalT(l); }}
            searchKeys={["designation", "cityCategory"]}
            defaultForm={{ designation: "Territory Manager", cityCategory: "Metro", mealsMiscAmount: 0, nonPeakHoursMode: "Auto / Taxi", peakOddHoursMode: "Auto / Taxi", status: "active" }}
            columns={[
              { key: "designation", header: "Designation", sortable: true },
              { key: "cityCategory", header: "City Category", sortable: true },
              { key: "mealsMiscAmount", header: "Meals / Misc", render: (r) => `₹${r.mealsMiscAmount}` },
              { key: "nonPeakHoursMode", header: "Non-Peak Mode" },
              { key: "peakOddHoursMode", header: "Peak / Odd Hours" },
            ]}
            getFormFromRecord={(r) => ({ ...r })}
            recordFromForm={(f, id, ex) =>
              stampUpdate(stampNew({
                designation: String(f.designation),
                cityCategory: String(f.cityCategory),
                mealsMiscAmount: Number(f.mealsMiscAmount) || 0,
                nonPeakHoursMode: String(f.nonPeakHoursMode),
                peakOddHoursMode: String(f.peakOddHoursMode),
                status: f.status as LocalTravelPolicy["status"],
                createdBy: ex?.createdBy,
                createdAt: ex?.createdAt,
              }, id))
            }
            validate={(f) => (!f.designation ? "Designation required." : null)}
            renderFormFields={({ form, setForm }) => (
              <div className="grid grid-cols-1 gap-3">
                <PolicyField label="Designation">
                  <Select value={String(form.designation || "")} onValueChange={(v) => setForm((f) => ({ ...f, designation: v }))}>
                    <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                    <SelectContent>{SF_ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
                  </Select>
                </PolicyField>
                <PolicyField label="City Category">
                  <Select value={String(form.cityCategory || "")} onValueChange={(v) => setForm((f) => ({ ...f, cityCategory: v }))}>
                    <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                    <SelectContent>{CITY_CATEGORY_POLICY_OPTIONS.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </PolicyField>
                <PolicyField label="Meals / Misc Amount (₹)"><Input type="number" className="h-8 text-xs" value={form.mealsMiscAmount ?? ""} onChange={(e) => setForm((f) => ({ ...f, mealsMiscAmount: Number(e.target.value) }))} /></PolicyField>
                <PolicyField label="Non-Peak Hours Mode"><Input className="h-8 text-xs" value={String(form.nonPeakHoursMode || "")} onChange={(e) => setForm((f) => ({ ...f, nonPeakHoursMode: e.target.value }))} /></PolicyField>
                <PolicyField label="Peak / Odd Hours Mode"><Input className="h-8 text-xs" value={String(form.peakOddHoursMode || "")} onChange={(e) => setForm((f) => ({ ...f, peakOddHoursMode: e.target.value }))} /></PolicyField>
              </div>
            )}
          />
        )}

        {tab === "km" && (
          <HrPolicySection<KmReimbursementPolicy>
            title="KM Reimbursement Policy"
            records={km}
            onSave={(l) => { saveKmReimbursement(l); setKm(l); }}
            searchKeys={["vehicleType"]}
            defaultForm={{ vehicleType: "Two-Wheeler", ratePerKm: 5, approvalRequired: false, status: "active" }}
            columns={[
              { key: "vehicleType", header: "Vehicle Type", sortable: true },
              { key: "ratePerKm", header: "Rate / KM", render: (r) => `₹${r.ratePerKm}` },
              { key: "approvalRequired", header: "Approval Required", render: (r) => (r.approvalRequired ? "Yes" : "No") },
            ]}
            getFormFromRecord={(r) => ({ ...r })}
            recordFromForm={(f, id, ex) =>
              stampUpdate(stampNew({
                vehicleType: String(f.vehicleType),
                ratePerKm: Number(f.ratePerKm) || 0,
                approvalRequired: Boolean(f.approvalRequired),
                status: f.status as KmReimbursementPolicy["status"],
                createdBy: ex?.createdBy,
                createdAt: ex?.createdAt,
              }, id))
            }
            validate={(f) => (!f.vehicleType ? "Vehicle type required." : null)}
            renderFormFields={({ form, setForm }) => (
              <div className="grid grid-cols-1 gap-3">
                <PolicyField label="Vehicle Type">
                  <Select value={String(form.vehicleType || "")} onValueChange={(v) => setForm((f) => ({ ...f, vehicleType: v }))}>
                    <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                    <SelectContent>{VEHICLE_TYPE_POLICY_OPTIONS.map((v) => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}</SelectContent>
                  </Select>
                </PolicyField>
                <PolicyField label="Rate Per KM (₹)"><Input type="number" className="h-8 text-xs" value={form.ratePerKm ?? ""} onChange={(e) => setForm((f) => ({ ...f, ratePerKm: Number(e.target.value) }))} /></PolicyField>
                <PolicyField label="Approval Required">
                  <Select value={form.approvalRequired ? "yes" : "no"} onValueChange={(v) => setForm((f) => ({ ...f, approvalRequired: v === "yes" }))}>
                    <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="yes" className="text-xs">Yes</SelectItem><SelectItem value="no" className="text-xs">No</SelectItem></SelectContent>
                  </Select>
                </PolicyField>
              </div>
            )}
          />
        )}

        {tab === "incidental" && (
          <HrPolicySection<IncidentalPolicy>
            title="Incidental Allowance Policy"
            records={incidental}
            onSave={(l) => { saveIncidental(l); setIncidental(l); }}
            searchKeys={["designation"]}
            defaultForm={{ designation: "Territory Manager", incidentalAmountPerDay: 0, billsRequired: false, status: "active" }}
            columns={[
              { key: "designation", header: "Designation", sortable: true },
              { key: "incidentalAmountPerDay", header: "Amount / Day", render: (r) => `₹${r.incidentalAmountPerDay}` },
              { key: "billsRequired", header: "Bills Required", render: (r) => (r.billsRequired ? "Yes" : "No") },
            ]}
            getFormFromRecord={(r) => ({ ...r })}
            recordFromForm={(f, id, ex) =>
              stampUpdate(stampNew({
                designation: String(f.designation),
                incidentalAmountPerDay: Number(f.incidentalAmountPerDay) || 0,
                billsRequired: Boolean(f.billsRequired),
                status: f.status as IncidentalPolicy["status"],
                createdBy: ex?.createdBy,
                createdAt: ex?.createdAt,
              }, id))
            }
            validate={(f) => (!f.designation ? "Designation required." : null)}
            renderFormFields={({ form, setForm }) => (
              <div className="grid grid-cols-1 gap-3">
                <PolicyField label="Designation">
                  <Select value={String(form.designation || "")} onValueChange={(v) => setForm((f) => ({ ...f, designation: v }))}>
                    <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                    <SelectContent>{SF_ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
                  </Select>
                </PolicyField>
                <PolicyField label="Incidental Amount Per Day (₹)"><Input type="number" className="h-8 text-xs" value={form.incidentalAmountPerDay ?? ""} onChange={(e) => setForm((f) => ({ ...f, incidentalAmountPerDay: Number(e.target.value) }))} /></PolicyField>
                <PolicyField label="Bills Required">
                  <Select value={form.billsRequired ? "yes" : "no"} onValueChange={(v) => setForm((f) => ({ ...f, billsRequired: v === "yes" }))}>
                    <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="yes" className="text-xs">Yes</SelectItem><SelectItem value="no" className="text-xs">No</SelectItem></SelectContent>
                  </Select>
                </PolicyField>
              </div>
            )}
          />
        )}

        {tab === "claimType" && (
          <HrPolicySection<ClaimTypeMaster>
            title="Claim Type Master"
            records={claimTypes}
            onSave={(l) => { saveClaimTypes(l); setClaimTypes(l); }}
            searchKeys={["claimTypeName", "claimTypeCode"]}
            defaultForm={{ claimTypeName: "", claimTypeCode: "", billsRequired: true, approvalRequired: true, status: "active" }}
            columns={[
              { key: "claimTypeName", header: "Claim Type", sortable: true },
              { key: "claimTypeCode", header: "Code", sortable: true },
              { key: "billsRequired", header: "Bills", render: (r) => (r.billsRequired ? "Yes" : "No") },
              { key: "approvalRequired", header: "Approval", render: (r) => (r.approvalRequired ? "Yes" : "No") },
            ]}
            getFormFromRecord={(r) => ({ ...r })}
            recordFromForm={(f, id, ex) =>
              stampUpdate(stampNew({
                claimTypeName: String(f.claimTypeName),
                claimTypeCode: String(f.claimTypeCode),
                billsRequired: Boolean(f.billsRequired),
                approvalRequired: Boolean(f.approvalRequired),
                status: f.status as ClaimTypeMaster["status"],
                createdBy: ex?.createdBy,
                createdAt: ex?.createdAt,
              }, id))
            }
            validate={(f) => (!f.claimTypeName || !f.claimTypeCode ? "Name and code required." : null)}
            renderFormFields={({ form, setForm }) => (
              <div className="grid grid-cols-1 gap-3">
                <PolicyField label="Claim Type Name" required><Input className="h-8 text-xs" value={String(form.claimTypeName || "")} onChange={(e) => setForm((f) => ({ ...f, claimTypeName: e.target.value }))} /></PolicyField>
                <PolicyField label="Claim Type Code" required><Input className="h-8 text-xs font-mono" value={String(form.claimTypeCode || "")} onChange={(e) => setForm((f) => ({ ...f, claimTypeCode: e.target.value }))} /></PolicyField>
                <PolicyField label="Bills Required">
                  <Select value={form.billsRequired ? "yes" : "no"} onValueChange={(v) => setForm((f) => ({ ...f, billsRequired: v === "yes" }))}>
                    <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="yes" className="text-xs">Yes</SelectItem><SelectItem value="no" className="text-xs">No</SelectItem></SelectContent>
                  </Select>
                </PolicyField>
                <PolicyField label="Approval Required">
                  <Select value={form.approvalRequired ? "yes" : "no"} onValueChange={(v) => setForm((f) => ({ ...f, approvalRequired: v === "yes" }))}>
                    <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="yes" className="text-xs">Yes</SelectItem><SelectItem value="no" className="text-xs">No</SelectItem></SelectContent>
                  </Select>
                </PolicyField>
              </div>
            )}
          />
        )}
      </div>
    </AppLayout>
  );
}
