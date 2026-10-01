"use client";

import type { HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import { PolicyCheckPanel, PolicyGuidanceCard } from "@/app/(app)/employee/claims/claim-ui";
import { formatInr, formatRequestDate, travelPeriodLabel, type EmployeeTravelRequest } from "./travel-request-data";
import type { TravelRequestEvaluation } from "./travel-request-engine";
import { TravelRequestStatusPill } from "./travel-request-ui";

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
      <p className="text-[11px] text-muted-foreground">{k}</p>
      <p className={`text-xs font-medium text-right ${mono ? "font-mono text-brand-700" : ""}`}>{v || "—"}</p>
    </div>
  );
}

export function TravelRequestViewBody({
  req,
  evaln,
  employee,
}: {
  req: EmployeeTravelRequest;
  evaln: TravelRequestEvaluation | null;
  employee?: HrEmployee | null;
}) {
  const snap = req.snapshot;
  const guidance = snap?.guidance?.length ? snap.guidance : evaln?.guidance ?? [];
  const checks = (snap?.checks?.length ? snap.checks : evaln?.checks ?? []).map((c) => ({
    id: c.id,
    level: c.level as "ok" | "warn" | "exception" | "block",
    label: c.label,
    detail: c.detail,
  }));

  return (
    <div className="space-y-3">
      <section className="rounded-[14px] border border-border bg-white p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="font-mono text-xs font-semibold text-brand-700">{req.requestNo || "Draft"}</p>
            <p className="text-sm font-semibold mt-0.5">{req.destination || "—"}</p>
          </div>
          <TravelRequestStatusPill status={req.status} />
        </div>
        <Row k="Employee" v={`${req.employeeName} · ${req.employeeCode}`} />
        <Row k="Designation" v={req.designation} />
        <Row k="Purpose" v={req.purpose} />
        <Row k="From" v={req.travelFrom} />
        <Row k="Destination" v={req.destination} />
        <Row k="Travel Period" v={travelPeriodLabel(req)} />
        <Row k="Mode" v={req.travelMode} />
        <Row k="Stay" v={req.stayRequired ? `${req.stayType === "relatives_friends" ? "Relatives / Friends" : "Hotel"} · ${req.expectedNights ?? "—"} night(s)` : "No"} />
        {req.visitReference ? <Row k="Visit reference" v={req.visitReference} /> : null}
        {req.projectPurpose ? <Row k="Project / purpose" v={req.projectPurpose} /> : null}
        {req.remarks ? <Row k="Remarks" v={req.remarks} /> : null}
      </section>

      <section className="rounded-[14px] border border-border bg-white p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Resolved context</p>
        <Row k="Headquarters" v={snap?.hqCity || evaln?.hq.city || "—"} />
        <Row k="HQ Source" v={snap?.hqSource === "employee_hq" ? "Employee" : snap?.hqSource === "branch" || evaln?.hq.source === "branch" ? "Branch" : evaln?.hq.sourceLabel || "—"} />
        <Row k="Travel Policy" v={snap?.policyName || evaln?.policy?.name || "—"} />
        <Row k="Policy No." v={snap?.policyNumber || evaln?.policy?.policyNumber || "—"} mono />
        <Row k="Entitlement Group" v={snap?.groupName || evaln?.groupName || "—"} />
        <Row k="City Classification" v={snap?.cityClassName || evaln?.cityClassName || "—"} />
        <Row k="Travel Context" v={evaln?.contextLabel || (snap?.travelContext === "ex_hq" ? "Ex-HQ" : snap?.travelContext || "—")} />
        <Row k="Approx one-way KM" v={req.distanceKm != null ? String(req.distanceKm) : "—"} />
      </section>

      <PolicyGuidanceCard rows={guidance} groupName={snap?.groupName || evaln?.groupName} />

      <section className="rounded-[14px] border border-border bg-white p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Estimated cost</p>
        <Row k="Travel" v={formatInr(snap?.estimatedTravel ?? evaln?.estimatedTravel)} />
        <Row k="Stay" v={formatInr(snap?.estimatedStay ?? evaln?.estimatedStay)} />
        <Row k="Other eligible" v={formatInr(snap?.estimatedOther ?? evaln?.estimatedOther)} />
        <Row k="Estimated total request" v={formatInr(snap?.estimatedTotal ?? evaln?.estimatedTotal)} />
        <Row k="Policy eligible estimate" v={formatInr(snap?.policyEligibleEstimate ?? evaln?.policyEligibleEstimate)} />
        <Row k="Exception estimate" v={formatInr(snap?.exceptionEstimate ?? evaln?.exceptionEstimate)} />
      </section>

      {(snap?.exceptions.length || evaln?.exceptions.length) ? (
        <section className="rounded-[14px] border border-orange-200 bg-orange-50 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-orange-800 mb-1">Exceptions</p>
          {(snap?.exceptions.length ? snap.exceptions : evaln?.exceptions ?? []).map((e) => (
            <p key={e.id} className="text-xs text-orange-800">
              ⚠ {e.label}
            </p>
          ))}
        </section>
      ) : null}

      <PolicyCheckPanel rows={checks} />

      <section className="rounded-[14px] border border-border bg-white p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Approval chain</p>
        {req.approvalSteps.length === 0 ? (
          <p className="text-xs text-muted-foreground">{req.approvalChainName || "Not assigned yet"}</p>
        ) : (
          <ol className="space-y-2">
            {req.approvalSteps.map((s) => (
              <li key={s.id} className="text-xs">
                <span className="font-semibold">{s.roleLabel}</span>
                <span className="text-muted-foreground"> · {s.assigneeName}</span>
                <span className="block text-[11px] text-muted-foreground capitalize">{s.status.replace("_", " ")}</span>
                {s.remark ? <span className="block text-[11px]">{s.remark}</span> : null}
              </li>
            ))}
          </ol>
        )}
        <p className="text-[11px] text-muted-foreground mt-2">Current: {req.status === "approved" ? req.finalApproverName : req.approvalSteps.find((s) => s.status === "pending")?.roleLabel || "—"}</p>
      </section>

      <section className="rounded-[14px] border border-border bg-white p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Timeline</p>
        {req.timeline.length === 0 ? (
          <p className="text-xs text-muted-foreground">No history yet.</p>
        ) : (
          <ol className="space-y-2">
            {req.timeline.map((t) => (
              <li key={t.id} className="text-xs">
                <p className="font-semibold">{t.action}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t.user} · {formatRequestDate(t.at.slice(0, 10))} {t.at.slice(11, 16)}
                </p>
                {t.remark ? <p className="text-[11px]">{t.remark}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {employee ? null : null}
    </div>
  );
}
