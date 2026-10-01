"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HR_TRAVEL_POLICY_EVENT } from "@/app/(app)/hr/settings/reimbursement/travel-policy/travel-policy-data";
import { getHrEmployeeById, type HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import { EmployeeClaimsShell } from "./EmployeeClaimsShell";
import {
  AmountStrip,
  AreaField,
  AttachmentList,
  FieldBlock,
  PolicyCheckPanel,
  PolicyGuidanceCard,
  SearchSelect,
  SectionHead,
  TextField,
  kindLabel,
} from "./claim-ui";
import {
  CLAIM_TYPE_OPTIONS,
  TRAVEL_MODE_OPTIONS,
  emptyClaim,
  formatInr,
  HR_TRAVEL_CLAIMS_EVENT,
  loadClaimActor,
  newAttachmentId,
  newTimelineId,
  saveTravelClaim,
  type AttachmentKind,
  type EmployeeClaimType,
  type EmployeeTravelClaim,
} from "./travel-claim-data";
import {
  approvedTravelRequestsForEmployee,
  travelPeriodLabel,
  type EmployeeTravelRequest,
} from "@/app/(app)/employee/travel-requests/travel-request-data";
import {
  buildPolicySnapshot,
  evaluateClaim,
  formatDuration,
  listDestinationCities,
  vehicleTypesFromPolicy,
} from "./travel-claim-engine";
import { attachApprovalOnSubmit } from "./travel-claim-approval";
import { createHrNotification } from "@/lib/hr/hr-notifications";

export default function ClaimFormClient({
  initial,
  mode,
}: {
  initial?: EmployeeTravelClaim;
  mode: "new" | "edit";
}) {
  const router = useRouter();
  const [actor, setActor] = useState<HrEmployee | null>(null);
  const [claim, setClaim] = useState<EmployeeTravelClaim | null>(initial ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadKind, setUploadKind] = useState<AttachmentKind>("bill");

  const [policyTick, setPolicyTick] = useState(0);

  useEffect(() => {
    const syncActor = () => {
      if (initial) {
        setActor(getHrEmployeeById(initial.employeeId) ?? loadClaimActor());
        return;
      }
      const e = loadClaimActor();
      setActor(e);
      setClaim((prev) => {
        if (!e) return prev;
        if (!prev) return emptyClaim(e);
        return {
          ...prev,
          employeeId: e.id,
          employeeCode: e.employeeCode,
          employeeName: e.employeeName,
          designation: e.designation,
        };
      });
    };
    if (initial) {
      setActor(getHrEmployeeById(initial.employeeId) ?? loadClaimActor());
      setClaim(initial);
    } else {
      syncActor();
    }
    window.addEventListener(HR_TRAVEL_CLAIMS_EVENT, syncActor);
    const bump = () => setPolicyTick((n) => n + 1);
    window.addEventListener(HR_TRAVEL_POLICY_EVENT, bump);
    return () => {
      window.removeEventListener(HR_TRAVEL_CLAIMS_EVENT, syncActor);
      window.removeEventListener(HR_TRAVEL_POLICY_EVENT, bump);
    };
  }, [initial]);

  const evaln = useMemo(() => {
    if (!actor || !claim) return null;
    return evaluateClaim(actor, claim);
  }, [actor, claim, policyTick]);

  useEffect(() => {
    if (!claim || !evaln) return;
    if (
      claim.claimedAmount === evaln.claimedAmount &&
      claim.eligibleAmount === evaln.eligibleAmount &&
      claim.exceptionAmount === evaln.exceptionAmount
    ) {
      return;
    }
    setClaim((prev) =>
      prev
        ? {
            ...prev,
            claimedAmount: evaln.claimedAmount,
            eligibleAmount: evaln.eligibleAmount,
            exceptionAmount: evaln.exceptionAmount,
          }
        : prev,
    );
  }, [evaln, claim]);

  if (!actor || !claim || !evaln) {
    return (
      <EmployeeClaimsShell title="New Claim" backHref="/employee/claims">
        <p className="text-sm text-muted-foreground">Loading employee context…</p>
      </EmployeeClaimsShell>
    );
  }

  const patch = (partial: Partial<EmployeeTravelClaim>) => {
    setClaim((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const setType = (key: EmployeeClaimType) => {
    patch({ claimType: key });
  };

  const applyLinkedRequest = (tr: EmployeeTravelRequest | null) => {
    if (!tr) {
      patch({
        linkedTravelRequestId: null,
        linkedTravelRequestNo: "",
        approvedEstimate: null,
        priorApprovalRef: "",
      });
      return;
    }
    const snap = tr.snapshot;
    const stayHotel = tr.stayType === "hotel";
    patch({
      linkedTravelRequestId: tr.id,
      linkedTravelRequestNo: tr.requestNo,
      approvedEstimate: snap?.estimatedTotal ?? null,
      purpose: claim.purpose || tr.purpose,
      destination: tr.destination,
      city: tr.stayCity || tr.destination,
      travelFrom: tr.travelFrom,
      fromLocation: tr.travelFrom,
      toLocation: tr.destination,
      periodFrom: tr.departureDate,
      periodTo: tr.returnDate,
      expenseDate: tr.departureDate,
      departureAt: tr.departureTime ? `${tr.departureDate}T${tr.departureTime}` : tr.departureDate,
      returnAt: tr.returnTime ? `${tr.returnDate}T${tr.returnTime}` : tr.returnDate,
      modeOfTravel: tr.travelMode,
      distanceKm: tr.distanceKm,
      overnight: tr.stayRequired,
      vehicleType: tr.vehicleType,
      stayFrom: tr.departureDate,
      stayTo: tr.returnDate,
      checkInDate: stayHotel ? tr.departureDate : claim.checkInDate,
      checkOutDate: stayHotel ? tr.returnDate : claim.checkOutDate,
      priorApprovalRef: tr.requestNo,
      priorApprovedBy: tr.finalApproverName,
      priorApprovalDate: tr.approvedOn,
    });
  };

  const linkedOptions = actor
    ? approvedTravelRequestsForEmployee(actor.id).map((r) => ({
        value: String(r.id),
        label: `${r.requestNo} · ${r.destination} · ${travelPeriodLabel(r)}`,
      }))
    : [];

  const cities = listDestinationCities();
  const vehicles = vehicleTypesFromPolicy(evaln.policy);
  const readOnlyAmount = evaln.amountLocked;
  const t = claim.claimType;

  const persistDraft = () => {
    const saved = saveTravelClaim({
      ...claim,
      employeeId: actor.id,
      employeeCode: actor.employeeCode,
      employeeName: actor.employeeName,
      designation: actor.designation,
      status: claim.status === "returned" ? "returned" : "draft",
      claimedAmount: evaln.claimedAmount,
      eligibleAmount: evaln.eligibleAmount,
      exceptionAmount: evaln.exceptionAmount,
      timeline:
        claim.id && claim.timeline.length
          ? claim.timeline
          : [
              {
                id: newTimelineId(),
                at: new Date().toISOString(),
                status: "draft",
                label: "Draft saved",
                detail: "Incomplete claims can be resumed later.",
              },
            ],
    });
    setClaim(saved);
    setToast("Draft saved");
    return saved;
  };

  const doSubmit = () => {
    if (!evaln.canSubmit) return;
    const snap = buildPolicySnapshot(actor, claim, evaln);
    const now = new Date().toISOString();
    const isResubmit = claim.status === "returned";
    const prepared = attachApprovalOnSubmit(
      {
        ...claim,
        employeeId: actor.id,
        employeeCode: actor.employeeCode,
        employeeName: actor.employeeName,
        designation: actor.designation,
        claimedAmount: evaln.claimedAmount,
        eligibleAmount: evaln.eligibleAmount,
        exceptionAmount: evaln.exceptionAmount,
        policySnapshot: snap,
        submittedOn: now.slice(0, 10),
      },
      actor,
      evaln,
    );
    const saved = saveTravelClaim({
      ...prepared,
      status: "submitted",
      timeline: [
        ...claim.timeline,
        {
          id: newTimelineId(),
          at: now,
          status: "submitted",
          label: isResubmit ? "Resubmitted" : "Submitted",
          detail: isResubmit ? "Claim resubmitted after correction." : "Claim submitted for approval.",
        },
      ],
    });
    createHrNotification({
      eventType: "claim_submitted",
      employeeId: saved.employeeId,
      sourceModule: "reimbursements",
      sourceId: String(saved.id),
      context: {
        employee_name: saved.employeeName,
        claim_no: saved.claimNo,
        claim_amount: formatInr(saved.claimedAmount),
      },
    });
    if (saved.exceptionApprovalStatus === "required") {
      createHrNotification({
        eventType: "exception_approval_required",
        employeeId: saved.employeeId,
        sourceModule: "reimbursements",
        sourceId: String(saved.id),
        context: {
          employee_name: saved.employeeName,
          claim_no: saved.claimNo,
          claim_amount: formatInr(saved.claimedAmount),
        },
      });
    }
    setConfirmOpen(false);
    router.push(`/employee/claims/${saved.id}`);
  };

  const onPickFile = (kind: AttachmentKind) => {
    setUploadKind(kind);
    fileRef.current?.click();
  };

  const showBills = evaln.billRequired || t === "ex_hq_travel" || t === "lodging" || t === "other_travel";
  const deEmphasizeBill = !evaln.billRequired;

  return (
    <EmployeeClaimsShell
      title={mode === "new" && !claim.id ? "New Claim" : claim.claimNo || "Edit Claim"}
      subtitle="Travel / expense claim"
      backHref="/employee/claims"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-11 rounded-[10px]" onClick={() => persistDraft()}>
            Save Draft
          </Button>
          <Button
            className="flex-1 h-11 rounded-[10px] bg-brand-600 hover:bg-brand-700 text-white"
            disabled={!evaln.canSubmit}
            onClick={() => setConfirmOpen(true)}
          >
            {claim.status === "returned" ? "Resubmit" : "Submit"}
          </Button>
        </div>
      }
    >
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            patch({
              attachments: [
                ...claim.attachments,
                {
                  id: newAttachmentId(),
                  kind: uploadKind,
                  fileName: file.name,
                  fileType: file.type || "file",
                  sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
                  dataUrl: String(reader.result || ""),
                },
              ],
            });
          };
          reader.readAsDataURL(file);
        }}
      />

      <SectionHead n={1} title="Claim Type" />
      <SearchSelect
        value={claim.claimType}
        placeholder="Select claim type…"
        options={CLAIM_TYPE_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
        onChange={(v) => setType(v as EmployeeClaimType)}
      />

      {t === "ex_hq_travel" || t === "lodging" || t === "boarding" || t === "relatives_friends" || t === "overnight_journey" ? (
        <FieldBlock
          label="Linked Travel Request"
          hint="Approved requests only. Prefills destination, dates, mode and policy version."
        >
          <SearchSelect
            value={claim.linkedTravelRequestId ? String(claim.linkedTravelRequestId) : ""}
            placeholder="Select approved travel request…"
            options={[{ value: "", label: "None" }, ...linkedOptions]}
            onChange={(v) => {
              if (!v) {
                applyLinkedRequest(null);
                return;
              }
              const tr = approvedTravelRequestsForEmployee(actor.id).find((r) => String(r.id) === v) ?? null;
              applyLinkedRequest(tr);
            }}
          />
        </FieldBlock>
      ) : null}

      {t ? (
        <>
          <SectionHead n={2} title="Travel / Expense Details" />
          <div className="space-y-3 rounded-[14px] border border-border bg-white p-3.5">
            <FieldBlock label="Expense / Travel Date" required>
              <TextField type="date" value={claim.expenseDate} onChange={(e) => patch({ expenseDate: e.target.value })} />
            </FieldBlock>
            <FieldBlock label="Purpose" required>
              <TextField
                value={claim.purpose}
                onChange={(e) => patch({ purpose: e.target.value })}
                placeholder="Purpose of travel / expense"
              />
            </FieldBlock>

            {(t === "ex_hq_travel" || t === "local_city" || t === "other_travel" || t === "personal_vehicle_km") && (
              <>
                <FieldBlock label="From Location" required={t === "ex_hq_travel" || t === "local_city"}>
                  <TextField
                    value={t === "ex_hq_travel" ? claim.travelFrom : t === "personal_vehicle_km" ? claim.startPoint : claim.fromLocation}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (t === "ex_hq_travel") patch({ travelFrom: v, fromLocation: v });
                      else if (t === "personal_vehicle_km") patch({ startPoint: v, fromLocation: v });
                      else patch({ fromLocation: v });
                    }}
                    placeholder="From"
                  />
                </FieldBlock>
                <FieldBlock label={t === "ex_hq_travel" ? "Destination" : "To Location"} required>
                  <TextField
                    value={
                      t === "ex_hq_travel"
                        ? claim.destination
                        : t === "personal_vehicle_km"
                          ? claim.destinationPoint
                          : claim.toLocation
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (t === "ex_hq_travel") patch({ destination: v, toLocation: v, city: claim.city || v });
                      else if (t === "personal_vehicle_km") patch({ destinationPoint: v, toLocation: v });
                      else patch({ toLocation: v });
                    }}
                    placeholder="To"
                  />
                </FieldBlock>
              </>
            )}

            {(t === "lodging" ||
              t === "relatives_friends" ||
              t === "boarding" ||
              t === "field_conveyance" ||
              t === "ex_hq_travel" ||
              t === "incidental") && (
              <FieldBlock
                label={t === "field_conveyance" ? "Location / Market" : "Destination City"}
                required={t === "lodging" || t === "field_conveyance"}
                hint={
                  evaln.cityClassName
                    ? `${cityDisplay(claim)} · ${evaln.cityClassName}`
                    : "City classification is resolved from policy — you do not select it."
                }
              >
                {t === "field_conveyance" ? (
                  <TextField
                    value={claim.locationMarket}
                    onChange={(e) => patch({ locationMarket: e.target.value, city: e.target.value || claim.city })}
                    placeholder="Market / location"
                  />
                ) : (
                  <SearchSelect
                    value={claim.city}
                    placeholder="Select city…"
                    options={cities.map((c) => ({ value: c.city, label: c.city, hint: c.state }))}
                    onChange={(v) => patch({ city: v, destination: claim.destination || v })}
                  />
                )}
              </FieldBlock>
            )}

            {t === "ex_hq_travel" && (
              <>
                <FieldBlock label="Departure Date/Time" required>
                  <TextField
                    type="datetime-local"
                    value={claim.departureAt}
                    onChange={(e) => patch({ departureAt: e.target.value, expenseDate: e.target.value.slice(0, 10) || claim.expenseDate })}
                  />
                </FieldBlock>
                <FieldBlock label="Return Date/Time" required>
                  <TextField type="datetime-local" value={claim.returnAt} onChange={(e) => patch({ returnAt: e.target.value, periodTo: e.target.value.slice(0, 10) })} />
                </FieldBlock>
                <FieldBlock
                  label="Mode of Travel"
                  required
                  hint={
                    evaln.entitledRailClass
                      ? `Entitled rail class: ${evaln.entitledRailClass}${evaln.airNote ? ` · ${evaln.airNote}` : ""}`
                      : evaln.airNote
                  }
                >
                  <SearchSelect
                    value={claim.modeOfTravel}
                    placeholder="Select mode…"
                    options={TRAVEL_MODE_OPTIONS.map((m) => ({ value: m, label: m }))}
                    onChange={(v) => patch({ modeOfTravel: v })}
                  />
                </FieldBlock>
                <FieldBlock label="Ticket Amount">
                  <TextField
                    type="number"
                    min={0}
                    value={claim.ticketAmount ?? ""}
                    onChange={(e) => patch({ ticketAmount: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </FieldBlock>
                <FieldBlock
                  label="One-way distance from HQ (KM)"
                  hint={evaln.hqNote}
                >
                  <TextField
                    type="number"
                    min={0}
                    value={claim.distanceKm ?? ""}
                    onChange={(e) => patch({ distanceKm: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="Enter KM — distance is not auto-calculated"
                  />
                </FieldBlock>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-brand-600"
                    checked={claim.overnight}
                    onChange={(e) => patch({ overnight: e.target.checked })}
                  />
                  Overnight travel
                </label>
              </>
            )}

            {t === "lodging" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <FieldBlock label="Check-in Date" required>
                    <TextField type="date" value={claim.checkInDate} onChange={(e) => patch({ checkInDate: e.target.value, expenseDate: e.target.value || claim.expenseDate })} />
                  </FieldBlock>
                  <FieldBlock label="Check-out Date" required>
                    <TextField type="date" value={claim.checkOutDate} onChange={(e) => patch({ checkOutDate: e.target.value, periodTo: e.target.value })} />
                  </FieldBlock>
                </div>
                <p className="text-[11px] text-muted-foreground">Number of nights: {evaln.nights}</p>
                <FieldBlock label="Hotel Name">
                  <TextField value={claim.hotelName} onChange={(e) => patch({ hotelName: e.target.value })} />
                </FieldBlock>
                <FieldBlock label="Bill Amount" required>
                  <TextField
                    type="number"
                    min={0}
                    value={claim.billAmount ?? ""}
                    onChange={(e) => patch({ billAmount: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </FieldBlock>
                {evaln.policy?.lodgingRules.gstReimbursedSeparately ? (
                  <FieldBlock label="GST Amount">
                    <TextField
                      type="number"
                      min={0}
                      value={claim.gstAmount ?? ""}
                      onChange={(e) => patch({ gstAmount: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </FieldBlock>
                ) : null}
                {evaln.gstinRequired ? (
                  <FieldBlock label="Hotel GSTIN" required>
                    <TextField value={claim.hotelGstin} onChange={(e) => patch({ hotelGstin: e.target.value })} />
                  </FieldBlock>
                ) : null}
              </>
            )}

            {t === "boarding" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <FieldBlock label="Period From">
                    <TextField type="date" value={claim.periodFrom} onChange={(e) => patch({ periodFrom: e.target.value, expenseDate: e.target.value })} />
                  </FieldBlock>
                  <FieldBlock label="Period To">
                    <TextField type="date" value={claim.periodTo} onChange={(e) => patch({ periodTo: e.target.value })} />
                  </FieldBlock>
                </div>
                <FieldBlock label="Number of Eligible Days">
                  <TextField
                    type="number"
                    min={1}
                    value={claim.eligibleDays ?? ""}
                    onChange={(e) => patch({ eligibleDays: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </FieldBlock>
                <FieldBlock label="Claim Amount">
                  <TextField
                    type="number"
                    min={0}
                    value={claim.travelAmount ?? ""}
                    onChange={(e) => patch({ travelAmount: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </FieldBlock>
              </>
            )}

            {t === "relatives_friends" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <FieldBlock label="Stay From">
                    <TextField type="date" value={claim.stayFrom} onChange={(e) => patch({ stayFrom: e.target.value, expenseDate: e.target.value, checkInDate: e.target.value })} />
                  </FieldBlock>
                  <FieldBlock label="Stay To">
                    <TextField type="date" value={claim.stayTo} onChange={(e) => patch({ stayTo: e.target.value, checkOutDate: e.target.value })} />
                  </FieldBlock>
                </div>
                <p className="text-[11px] text-muted-foreground">Number of nights: {evaln.nights} · Amount is the policy flat allowance.</p>
              </>
            )}

            {t === "overnight_journey" && (
              <>
                <FieldBlock label="Journey Start" required>
                  <TextField
                    type="datetime-local"
                    value={claim.journeyStart}
                    onChange={(e) => patch({ journeyStart: e.target.value, expenseDate: e.target.value.slice(0, 10) || claim.expenseDate })}
                  />
                </FieldBlock>
                <FieldBlock label="Journey End" required>
                  <TextField type="datetime-local" value={claim.journeyEnd} onChange={(e) => patch({ journeyEnd: e.target.value })} />
                </FieldBlock>
                <p className="text-sm font-semibold text-navy-700">
                  Journey Duration {formatDuration(evaln.journeyHours)}
                </p>
                <p className="text-xs text-muted-foreground">Slab is matched automatically. You do not select it.</p>
              </>
            )}

            {t === "local_city" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <FieldBlock label="Start Time" required>
                    <TextField type="time" value={claim.startTime} onChange={(e) => patch({ startTime: e.target.value })} />
                  </FieldBlock>
                  <FieldBlock label="End Time" required>
                    <TextField type="time" value={claim.endTime} onChange={(e) => patch({ endTime: e.target.value })} />
                  </FieldBlock>
                </div>
                {evaln.localMode ? (
                  <p className="text-xs text-navy-700 font-medium">Entitled travel mode: {evaln.localMode}</p>
                ) : null}
                <FieldBlock label="Travel Mode">
                  <SearchSelect
                    value={claim.modeOfTravel}
                    placeholder="Select mode…"
                    options={TRAVEL_MODE_OPTIONS.map((m) => ({ value: m, label: m }))}
                    onChange={(v) => patch({ modeOfTravel: v })}
                  />
                </FieldBlock>
                <FieldBlock label="Travel Amount">
                  <TextField
                    type="number"
                    min={0}
                    value={claim.travelAmount ?? ""}
                    onChange={(e) => patch({ travelAmount: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </FieldBlock>
              </>
            )}

            {t === "field_conveyance" && !readOnlyAmount ? (
              <FieldBlock label="Claim Amount">
                <TextField
                  type="number"
                  min={0}
                  value={claim.travelAmount ?? ""}
                  onChange={(e) => patch({ travelAmount: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </FieldBlock>
            ) : null}

            {t === "personal_vehicle_km" && (
              <>
                <FieldBlock label="Vehicle Type" required>
                  <SearchSelect
                    value={claim.vehicleType}
                    placeholder="Select vehicle…"
                    options={vehicles.map((v) => ({ value: v, label: v }))}
                    onChange={(v) => patch({ vehicleType: v })}
                  />
                </FieldBlock>
                <FieldBlock label="KM Travelled" required>
                  <TextField
                    type="number"
                    min={0}
                    value={claim.kmTravelled ?? ""}
                    onChange={(e) => patch({ kmTravelled: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </FieldBlock>
                {evaln.kmCalcLabel ? (
                  <p className="text-sm font-semibold text-navy-700">{evaln.kmCalcLabel} = {formatInr(evaln.claimedAmount)}</p>
                ) : null}
                {evaln.policy?.kmClaimFields.startOdometer ? (
                  <FieldBlock label="Start Odometer">
                    <TextField value={claim.startOdometer} onChange={(e) => patch({ startOdometer: e.target.value })} />
                  </FieldBlock>
                ) : null}
                {evaln.policy?.kmClaimFields.endOdometer ? (
                  <FieldBlock label="End Odometer">
                    <TextField value={claim.endOdometer} onChange={(e) => patch({ endOdometer: e.target.value })} />
                  </FieldBlock>
                ) : null}
                {evaln.monthlyKmNote ? (
                  <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Monthly KM Approval Required. {evaln.monthlyKmNote}
                  </div>
                ) : null}
              </>
            )}

            {t === "incidental" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <FieldBlock label="Period From">
                    <TextField type="date" value={claim.periodFrom} onChange={(e) => patch({ periodFrom: e.target.value, expenseDate: e.target.value })} />
                  </FieldBlock>
                  <FieldBlock label="Period To">
                    <TextField type="date" value={claim.periodTo} onChange={(e) => patch({ periodTo: e.target.value })} />
                  </FieldBlock>
                </div>
                <FieldBlock label="Eligible Days">
                  <TextField
                    type="number"
                    min={1}
                    value={claim.eligibleDays ?? ""}
                    onChange={(e) => patch({ eligibleDays: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </FieldBlock>
              </>
            )}

            {t === "other_travel" && (
              <FieldBlock label="Amount">
                <TextField
                  type="number"
                  min={0}
                  value={claim.travelAmount ?? ""}
                  onChange={(e) => patch({ travelAmount: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </FieldBlock>
            )}

            <FieldBlock label="Remarks">
              <AreaField value={claim.remarks} onChange={(e) => patch({ remarks: e.target.value })} placeholder="Optional notes" />
            </FieldBlock>

            {readOnlyAmount ? (
              <FieldBlock label="Claim Amount" hint="Calculated from policy — not editable.">
                <TextField readOnly value={formatInr(evaln.claimedAmount)} />
              </FieldBlock>
            ) : null}

            {evaln.companyNameRequired && (t === "lodging" || t === "ex_hq_travel" || t === "other_travel") ? (
              <FieldBlock label="Bill in Company Name">
                <div className="flex gap-2">
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() => patch({ billInCompanyName: v })}
                      className={`flex-1 h-11 rounded-[10px] border text-sm font-medium ${
                        claim.billInCompanyName === v
                          ? "border-brand-400 bg-brand-50 text-brand-700"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {v ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </FieldBlock>
            ) : null}
          </div>

          <PolicyGuidanceCard rows={evaln.guidance} groupName={evaln.groupName} />
          <AmountStrip
            claimed={formatInr(evaln.claimedAmount)}
            eligible={formatInr(evaln.eligibleAmount)}
            excess={formatInr(evaln.exceptionAmount)}
          />
          {claim.linkedTravelRequestNo ? (
            <p className="text-[11px] text-muted-foreground">
              Approved estimate {formatInr(claim.approvedEstimate)} · Actual claim {formatInr(evaln.claimedAmount)}
              {claim.approvedEstimate != null
                ? ` · Variance ${formatInr(evaln.claimedAmount - claim.approvedEstimate)}`
                : ""}
            </p>
          ) : null}

          <SectionHead n={3} title="Bills / Approvals" />
          <div className="rounded-[14px] border border-border bg-white p-3.5 space-y-3">
            {evaln.originalBillRequired ? (
              <p className="text-xs text-navy-700 bg-navy-50 border border-navy-100 rounded-[10px] px-3 py-2">
                Original bill must be submitted as per policy.
              </p>
            ) : null}
            {deEmphasizeBill ? (
              <p className="text-[11px] text-muted-foreground">Bills are not required for this claim type.</p>
            ) : null}
            {showBills || !deEmphasizeBill ? (
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["bill", "Upload Bill"],
                    ["ticket", "Ticket"],
                    ["approval", "Approval"],
                    ["other", "Other"],
                  ] as const
                ).map(([kind, label]) => (
                  <Button
                    key={kind}
                    type="button"
                    variant="outline"
                    className="h-11 rounded-[10px] text-xs"
                    onClick={() => onPickFile(kind)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" className="h-11 rounded-[10px] text-xs" onClick={() => onPickFile("other")}>
                  Other supporting
                </Button>
                {evaln.priorApprovalRequired ? (
                  <Button type="button" variant="outline" className="h-11 rounded-[10px] text-xs" onClick={() => onPickFile("approval")}>
                    Approval
                  </Button>
                ) : null}
              </div>
            )}
            <AttachmentList
              items={claim.attachments}
              onRemove={(id) => patch({ attachments: claim.attachments.filter((a) => a.id !== id) })}
            />
            {evaln.priorApprovalRequired ? (
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prior Approval</p>
                <p className="text-xs">
                  Status:{" "}
                  <span className="font-semibold">
                    {claim.attachments.some((a) => a.kind === "approval") || claim.priorApprovalRef
                      ? "Attached"
                      : "Not Attached"}
                  </span>
                </p>
                <FieldBlock label="Approval Reference">
                  <TextField value={claim.priorApprovalRef} onChange={(e) => patch({ priorApprovalRef: e.target.value })} />
                </FieldBlock>
                <FieldBlock label="Approved By">
                  <TextField value={claim.priorApprovedBy} onChange={(e) => patch({ priorApprovedBy: e.target.value })} />
                </FieldBlock>
                <FieldBlock label="Approval Date">
                  <TextField type="date" value={claim.priorApprovalDate} onChange={(e) => patch({ priorApprovalDate: e.target.value })} />
                </FieldBlock>
              </div>
            ) : null}
            {evaln.exceptionRequired ? (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700">Policy Exception</p>
                <p className="text-xs text-orange-800">Exception Approval Required</p>
                <FieldBlock label="Reason" required>
                  <AreaField
                    value={claim.exceptionReason}
                    onChange={(e) => patch({ exceptionReason: e.target.value })}
                    placeholder="Why this claim exceeds policy"
                  />
                </FieldBlock>
              </div>
            ) : null}
          </div>

          <SectionHead n={4} title="Policy Check" />
          <PolicyCheckPanel rows={evaln.checks} />

          <SectionHead n={5} title="Review" />
          <div className="rounded-[14px] border border-border bg-white p-3.5 space-y-1 text-xs">
            <p>
              <span className="text-muted-foreground">Type</span> · {CLAIM_TYPE_OPTIONS.find((o) => o.key === t)?.label}
            </p>
            <p>
              <span className="text-muted-foreground">Claimed</span> · {formatInr(evaln.claimedAmount)}
            </p>
            <p>
              <span className="text-muted-foreground">Eligible</span> · {formatInr(evaln.eligibleAmount)}
            </p>
            {evaln.exceptionAmount > 0 ? (
              <p>
                <span className="text-muted-foreground">Exception</span> · {formatInr(evaln.exceptionAmount)}
              </p>
            ) : null}
            <p className="text-[11px] text-muted-foreground pt-1">
              Files: {claim.attachments.map((a) => `${kindLabel(a.kind)} (${a.fileName})`).join(", ") || "None"}
            </p>
          </div>
        </>
      ) : null}

      {toast ? (
        <p className="text-xs text-center text-emerald-700">{toast}</p>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Submit this claim for approval?</DialogTitle>
            <DialogDescription className="text-xs space-y-1 pt-2">
              <span className="block">Type: {CLAIM_TYPE_OPTIONS.find((o) => o.key === t)?.label}</span>
              <span className="block">Claimed: {formatInr(evaln.claimedAmount)}</span>
              <span className="block">Eligible: {formatInr(evaln.eligibleAmount)}</span>
              {evaln.exceptionAmount > 0 ? (
                <span className="block">Exception: {formatInr(evaln.exceptionAmount)}</span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="h-9" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button className="h-9 bg-brand-600 hover:bg-brand-700 text-white" onClick={doSubmit}>
              {claim.status === "returned" ? "Resubmit Claim" : "Submit Claim"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </EmployeeClaimsShell>
  );
}

function cityDisplay(claim: EmployeeTravelClaim): string {
  return claim.city || claim.locationMarket || claim.destination || "—";
}
