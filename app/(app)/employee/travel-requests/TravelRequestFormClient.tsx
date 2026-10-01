"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmployeeClaimsShell } from "@/app/(app)/employee/claims/EmployeeClaimsShell";
import {
  AreaField,
  FieldBlock,
  PolicyCheckPanel,
  PolicyGuidanceCard,
  SearchSelect,
  SectionHead,
  TextField,
} from "@/app/(app)/employee/claims/claim-ui";
import { HR_TRAVEL_POLICY_EVENT } from "@/app/(app)/hr/settings/reimbursement/travel-policy/travel-policy-data";
import { getHrEmployeeById, type HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import {
  HR_TRAVEL_CLAIMS_EVENT,
  loadClaimActor,
} from "@/app/(app)/employee/claims/travel-claim-data";
import {
  TRAVEL_MODE_OPTIONS,
  emptyTravelRequest,
  formatInr,
  newTimelineId,
  saveTravelRequest,
  travelPeriodLabel,
  type EmployeeTravelRequest,
  type StayKind,
  type TaxiKind,
  type TravelModeKind,
} from "./travel-request-data";
import {
  evaluateTravelRequest,
  listDestinationCities,
  railClassOptions,
  vehicleTypesFromPolicy,
} from "./travel-request-engine";
import { submitTravelRequest } from "./travel-request-approval";

export default function TravelRequestFormClient({
  initial,
  mode,
}: {
  initial?: EmployeeTravelRequest;
  mode: "new" | "edit";
}) {
  const router = useRouter();
  const [actor, setActor] = useState<HrEmployee | null>(null);
  const [req, setReq] = useState<EmployeeTravelRequest | null>(initial ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [policyTick, setPolicyTick] = useState(0);

  useEffect(() => {
    const sync = () => {
      if (initial) {
        setActor(getHrEmployeeById(initial.employeeId) ?? loadClaimActor());
        return;
      }
      const e = loadClaimActor();
      setActor(e);
      setReq((prev) => {
        if (!e) return prev;
        if (!prev) return emptyTravelRequest(e);
        return {
          ...prev,
          employeeId: e.id,
          employeeCode: e.employeeCode,
          employeeName: e.employeeName,
          designation: e.designation,
          branch: e.branch,
        };
      });
    };
    if (initial) {
      setActor(getHrEmployeeById(initial.employeeId) ?? loadClaimActor());
      setReq(initial);
    } else {
      sync();
    }
    window.addEventListener(HR_TRAVEL_CLAIMS_EVENT, sync);
    const bump = () => setPolicyTick((n) => n + 1);
    window.addEventListener(HR_TRAVEL_POLICY_EVENT, bump);
    return () => {
      window.removeEventListener(HR_TRAVEL_CLAIMS_EVENT, sync);
      window.removeEventListener(HR_TRAVEL_POLICY_EVENT, bump);
    };
  }, [initial]);

  const evaln = useMemo(() => {
    if (!actor || !req) return null;
    return evaluateTravelRequest(actor, req);
  }, [actor, req, policyTick]);

  if (!actor || !req || !evaln) {
    return (
      <EmployeeClaimsShell title="New Travel Request" backHref="/employee/travel-requests">
        <p className="text-sm text-muted-foreground">Loading employee context…</p>
      </EmployeeClaimsShell>
    );
  }

  const patch = (partial: Partial<EmployeeTravelRequest>) => {
    setReq((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const cities = listDestinationCities();
  const vehicles = vehicleTypesFromPolicy(evaln.policy);
  const railOpts = railClassOptions(evaln.policy, evaln.entitledRailClass);
  const locked = req.status === "approved" || req.status === "rejected" || req.status === "cancelled";

  const persistDraft = () => {
    const saved = saveTravelRequest({
      ...req,
      employeeId: actor.id,
      employeeCode: actor.employeeCode,
      employeeName: actor.employeeName,
      designation: actor.designation,
      branch: actor.branch,
      status: req.status === "returned" ? "returned" : "draft",
      timeline:
        req.id && req.timeline.length
          ? req.timeline
          : [
              {
                id: newTimelineId(),
                at: new Date().toISOString(),
                action: "Draft created",
                user: actor.employeeName,
                remark: "",
                status: "draft",
              },
            ],
    });
    setReq(saved);
    setToast("Draft saved");
    return saved;
  };

  const doSubmit = () => {
    const result = submitTravelRequest(
      {
        ...req,
        employeeId: actor.id,
        employeeCode: actor.employeeCode,
        employeeName: actor.employeeName,
        designation: actor.designation,
        branch: actor.branch,
      },
      actor,
      evaln,
    );
    if (!result.ok) {
      setToast(result.error);
      return;
    }
    router.push(`/employee/travel-requests/${result.request.id}`);
  };

  return (
    <EmployeeClaimsShell
      title={mode === "new" && !req.id ? "New Travel Request" : req.requestNo || "Edit Travel Request"}
      subtitle="Pre-travel / Ex-HQ approval"
      backHref="/employee/travel-requests"
      footer={
        locked ? null : (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-11 rounded-[10px]" onClick={() => persistDraft()}>
              Save Draft
            </Button>
            <Button
              className="flex-1 h-11 rounded-[10px] bg-brand-600 hover:bg-brand-700 text-white"
              disabled={!evaln.canSubmit}
              onClick={() => setConfirmOpen(true)}
            >
              {req.status === "returned" ? "Resubmit" : "Submit"}
            </Button>
          </div>
        )
      }
    >
      <section className="rounded-[14px] border border-border bg-white p-3.5 space-y-1.5 text-xs">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Employee (resolved)</p>
        <p>
          <span className="font-semibold">{actor.employeeName}</span> · {actor.employeeCode}
        </p>
        <p className="text-muted-foreground">{actor.designation}</p>
        <p>
          Headquarters: <span className="font-semibold">{evaln.hq.city || "Not configured"}</span>
          {evaln.hq.configured ? (
            <span className="text-muted-foreground"> · Source: {evaln.hq.sourceLabel}</span>
          ) : null}
        </p>
        <p className="text-muted-foreground">{evaln.policy?.name || "No applicable policy"}</p>
        <p className="text-muted-foreground">Entitlement group: {evaln.groupName || "Unmapped"}</p>
      </section>

      <SectionHead n={1} title="Travel details" />
      <div className="space-y-3 rounded-[14px] border border-border bg-white p-3.5">
        <FieldBlock label="Travel Purpose" required>
          <TextField value={req.purpose} disabled={locked} onChange={(e) => patch({ purpose: e.target.value })} placeholder="Customer visit / market work…" />
        </FieldBlock>
        <FieldBlock label="Travel From" required>
          <TextField value={req.travelFrom} disabled={locked} onChange={(e) => patch({ travelFrom: e.target.value })} placeholder="HQ / starting city" />
        </FieldBlock>
        <FieldBlock
          label="Destination"
          required
          hint={evaln.cityClassName ? `City Classification: ${evaln.cityClassName}` : "Classification is resolved from policy."}
        >
          <SearchSelect
            value={req.destination}
            placeholder="Select city…"
            options={cities.map((c) => ({ value: c.city, label: c.city, hint: c.state }))}
            onChange={(v) => patch({ destination: v, stayCity: req.stayCity || v })}
          />
        </FieldBlock>
        <div className="grid grid-cols-2 gap-2">
          <FieldBlock label="Departure Date" required>
            <TextField type="date" value={req.departureDate} disabled={locked} onChange={(e) => patch({ departureDate: e.target.value })} />
          </FieldBlock>
          <FieldBlock label="Departure Time">
            <TextField type="time" value={req.departureTime} disabled={locked} onChange={(e) => patch({ departureTime: e.target.value })} />
          </FieldBlock>
          <FieldBlock label="Return Date" required>
            <TextField type="date" value={req.returnDate} disabled={locked} onChange={(e) => patch({ returnDate: e.target.value })} />
          </FieldBlock>
          <FieldBlock label="Return Time">
            <TextField type="time" value={req.returnTime} disabled={locked} onChange={(e) => patch({ returnTime: e.target.value })} />
          </FieldBlock>
        </div>
        <FieldBlock
          label="Approx one-way distance (KM)"
          hint="Distance verification will be integrated later. Used for Ex-HQ validation only."
        >
          <TextField
            type="number"
            min={0}
            value={req.distanceKm ?? ""}
            disabled={locked}
            onChange={(e) => patch({ distanceKm: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </FieldBlock>
        <FieldBlock label="Travel Mode" required>
          <SearchSelect
            value={req.travelMode}
            placeholder="Select mode…"
            options={TRAVEL_MODE_OPTIONS.map((m) => ({ value: m, label: m }))}
            onChange={(v) => patch({ travelMode: v as TravelModeKind })}
          />
        </FieldBlock>
        {req.travelMode === "Air" ? (
          <>
            <FieldBlock label="Estimated road/rail journey duration (hours)" hint={evaln.airLabel}>
              <TextField
                type="number"
                min={0}
                value={req.estimatedJourneyHours ?? ""}
                disabled={locked}
                onChange={(e) => patch({ estimatedJourneyHours: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </FieldBlock>
            <FieldBlock label="Air fare estimate">
              <TextField
                type="number"
                min={0}
                value={req.airFareEstimate ?? ""}
                disabled={locked}
                onChange={(e) => patch({ airFareEstimate: e.target.value === "" ? null : Number(e.target.value), estimatedTravelCost: e.target.value === "" ? req.estimatedTravelCost : Number(e.target.value) })}
              />
            </FieldBlock>
            <FieldBlock label="Reason for air travel">
              <AreaField value={req.airReason} disabled={locked} onChange={(e) => patch({ airReason: e.target.value })} />
            </FieldBlock>
            <p className="text-[11px] text-muted-foreground">
              Eligible: {evaln.airEligible === "yes" ? "Yes" : evaln.airEligible === "no" ? "No" : evaln.airEligible === "conditional" ? "Conditional" : "—"}
            </p>
          </>
        ) : null}
        {req.travelMode === "Rail" ? (
          <>
            <p className="text-[11px] text-muted-foreground">Entitled rail class: {evaln.entitledRailClass || "—"}</p>
            <FieldBlock label="Requested rail class">
              <SearchSelect
                value={req.requestedRailClass || evaln.entitledRailClass}
                placeholder="Class…"
                options={railOpts.map((c) => ({ value: c, label: c }))}
                onChange={(v) => patch({ requestedRailClass: v })}
              />
            </FieldBlock>
          </>
        ) : null}
        {req.travelMode === "Own Vehicle" ? (
          <>
            <FieldBlock label="Vehicle type">
              <SearchSelect
                value={req.vehicleType}
                placeholder="Vehicle…"
                options={vehicles.map((v) => ({ value: v, label: v }))}
                onChange={(v) => patch({ vehicleType: v })}
              />
            </FieldBlock>
            <p className="text-[11px] text-muted-foreground">
              Configured rate: {evaln.kmRate != null ? `₹${evaln.kmRate}/KM` : "—"} · Estimated eligible: {formatInr(evaln.kmAmount)}
            </p>
          </>
        ) : null}
        {req.travelMode === "Taxi" ? (
          <>
            <p className="text-[11px] text-muted-foreground">{evaln.taxiSummary || "Taxi entitlement from policy."}</p>
            <FieldBlock label="Taxi type">
              <SearchSelect
                value={req.taxiKind}
                placeholder="Shared or private…"
                options={[
                  { value: "shared", label: "Shared / public taxi" },
                  { value: "private", label: "Private taxi" },
                ]}
                onChange={(v) => patch({ taxiKind: v as TaxiKind })}
              />
            </FieldBlock>
          </>
        ) : null}
        <FieldBlock label="Estimated travel cost">
          <TextField
            type="number"
            min={0}
            value={req.estimatedTravelCost ?? ""}
            disabled={locked}
            onChange={(e) => patch({ estimatedTravelCost: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </FieldBlock>
        <FieldBlock label="Stay required">
          <SearchSelect
            value={req.stayRequired ? "yes" : "no"}
            placeholder="Stay?"
            options={[
              { value: "no", label: "No" },
              { value: "yes", label: "Yes" },
            ]}
            onChange={(v) => patch({ stayRequired: v === "yes", stayType: v === "yes" ? req.stayType || "hotel" : "" })}
          />
        </FieldBlock>
        {req.stayRequired ? (
          <>
            <FieldBlock label="Stay city">
              <SearchSelect
                value={req.stayCity || req.destination}
                placeholder="Stay city…"
                options={cities.map((c) => ({ value: c.city, label: c.city, hint: c.state }))}
                onChange={(v) => patch({ stayCity: v })}
              />
            </FieldBlock>
            <FieldBlock label="Expected nights">
              <TextField
                type="number"
                min={0}
                value={req.expectedNights ?? ""}
                disabled={locked}
                onChange={(e) => patch({ expectedNights: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </FieldBlock>
            <FieldBlock label="Stay type">
              <SearchSelect
                value={req.stayType}
                placeholder="Stay type…"
                options={[
                  { value: "hotel", label: "Hotel" },
                  { value: "relatives_friends", label: "Relatives / Friends" },
                ]}
                onChange={(v) => patch({ stayType: v as StayKind })}
              />
            </FieldBlock>
            {req.stayType === "hotel" ? (
              <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-[11px] space-y-1">
                <p>City class: {evaln.cityClassName || "—"}</p>
                <p>Lodging limit: {formatInr(evaln.lodgingLimit)} / night</p>
                <p>Boarding limit: {formatInr(evaln.boardingLimit)} / day</p>
                <p>
                  Estimated eligible lodging: {formatInr((evaln.lodgingLimit ?? 0) * (req.expectedNights || 0))} · boarding:{" "}
                  {formatInr((evaln.boardingLimit ?? 0) * (req.expectedNights || 0))}
                </p>
                <p className="text-muted-foreground">Estimates only — actual claim is submitted later.</p>
              </div>
            ) : null}
            {req.stayType === "relatives_friends" ? (
              <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-[11px] space-y-1">
                <p>Flat per-night allowance: {evaln.relativesPerNight == null ? "Not applicable" : formatInr(evaln.relativesPerNight)}</p>
                <p>Estimated eligible: {formatInr((evaln.relativesPerNight ?? 0) * (req.expectedNights || 0))}</p>
              </div>
            ) : null}
            <FieldBlock label="Estimated stay cost">
              <TextField
                type="number"
                min={0}
                value={req.estimatedStayCost ?? ""}
                disabled={locked}
                onChange={(e) => patch({ estimatedStayCost: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </FieldBlock>
          </>
        ) : null}
        <FieldBlock label="Other eligible estimate">
          <TextField
            type="number"
            min={0}
            value={req.estimatedOtherCost ?? ""}
            disabled={locked}
            onChange={(e) => patch({ estimatedOtherCost: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </FieldBlock>
        <FieldBlock label="Customer / visit reference">
          <TextField value={req.visitReference} disabled={locked} onChange={(e) => patch({ visitReference: e.target.value })} />
        </FieldBlock>
        <FieldBlock label="Project / business purpose">
          <TextField value={req.projectPurpose} disabled={locked} onChange={(e) => patch({ projectPurpose: e.target.value })} />
        </FieldBlock>
        <FieldBlock label="Remarks">
          <AreaField value={req.remarks} disabled={locked} onChange={(e) => patch({ remarks: e.target.value })} />
        </FieldBlock>
      </div>

      <PolicyGuidanceCard rows={evaln.guidance} groupName={evaln.groupName} />

      <section className="rounded-[14px] border border-border bg-white p-3.5 text-xs space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Estimated cost</p>
        <p>Estimated total request: <span className="font-semibold">{formatInr(evaln.estimatedTotal)}</span></p>
        <p>Policy eligible estimate: {formatInr(evaln.policyEligibleEstimate)}</p>
        <p>Exception estimate: {formatInr(evaln.exceptionEstimate)}</p>
      </section>

      <PolicyCheckPanel rows={evaln.checks} />

      {toast ? <p className="text-xs text-brand-700">{toast}</p> : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Submit Travel Request?</DialogTitle>
            <DialogDescription>
              {req.destination} · {travelPeriodLabel(req)} · {req.travelMode || "—"}
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs space-y-1">
            <p>Estimated cost: {formatInr(evaln.estimatedTotal)}</p>
            <p>Approval chain: {evaln.chainRolesNeeded ? "Required (from Travel Policy)" : "Not required"}</p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 h-9 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => {
                setConfirmOpen(false);
                doSubmit();
              }}
            >
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </EmployeeClaimsShell>
  );
}
