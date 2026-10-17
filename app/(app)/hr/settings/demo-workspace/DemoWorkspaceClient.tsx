"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Database, AlertTriangle, CheckCircle2, Trash2, Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { HrSuccessToast } from "../../components/HrSuccessToast";
import { HrOrgPageHeader, hrBtn } from "../organization/_components";
import {
  DEMO_CONFIRM_PHRASE,
  DEMO_TARGETS,
  DEMO_WORKSPACE_MARKER,
  isHrDemoWorkspaceEnabled,
} from "../../demo/demo-workspace-constants";
import {
  previewDemoWorkspace,
  runDemoWorkspaceSeed,
  type DemoSeedPreview,
  type DemoSeedResult,
} from "../../demo/demo-workspace-seed";
import {
  getDemoManifestSummary,
  hasDemoManifest,
  resetDemoWorkspace,
  type DemoResetResult,
} from "../../demo/demo-workspace-reset";
import {
  inspectDemoWorkspaceStores,
  type DemoWorkspaceInspection,
} from "../../demo/demo-workspace-inspect";

const VERIFY_LINKS = [
  { href: "/hr/employees", label: "Employee Directory" },
  { href: "/hr/attendance/dashboard", label: "Attendance Dashboard" },
  { href: "/hr/requests", label: "Leave Requests" },
  { href: "/hr/payroll/history", label: "Payroll History" },
  { href: "/hr/travel-requests", label: "Travel Requests" },
  { href: "/hr/reimbursements", label: "Reimbursements" },
  { href: "/hr/hr-letters", label: "HR Letters" },
  { href: "/hr/offboarding", label: "Offboarding" },
  { href: "/hr/notifications", label: "Notifications" },
] as const;

export default function DemoWorkspaceClient() {
  const enabled = isHrDemoWorkspaceEnabled();
  const [preview, setPreview] = useState<DemoSeedPreview | null>(null);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [seedResult, setSeedResult] = useState<DemoSeedResult | null>(null);
  const [resetResult, setResetResult] = useState<DemoResetResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [manifestPresent, setManifestPresent] = useState(false);
  const [manifestCounts, setManifestCounts] = useState<Record<string, number>>({});
  const [inspection, setInspection] = useState<DemoWorkspaceInspection | null>(null);

  const refresh = useCallback(() => {
    if (!isHrDemoWorkspaceEnabled()) return;
    setPreview(previewDemoWorkspace());
    setManifestPresent(hasDemoManifest());
    const m = getDemoManifestSummary();
    setManifestCounts(m?.counts ?? {});
    setInspection(inspectDemoWorkspaceStores());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!enabled) {
    return (
      <HrOrgPageHeader
        title="Demo Workspace"
        description="Not available in this environment."
        icon={Database}
        sectionLabel="Tools"
        sectionHref="/hr/settings"
      >
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 max-w-lg">
          <p className="text-sm font-semibold text-foreground">Demo Workspace is disabled</p>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            This tool is only shown in development, or when{" "}
            <span className="font-mono">NEXT_PUBLIC_ENABLE_HR_DEMO_WORKSPACE=true</span> is set.
            It is not exposed in production builds by default.
          </p>
          <Link href="/hr/settings" className="text-xs font-medium text-brand-700 hover:underline mt-3 inline-block">
            Back to Settings Overview
          </Link>
        </div>
      </HrOrgPageHeader>
    );
  }

  const canSeed = confirmPhrase.trim() === DEMO_CONFIRM_PHRASE && !!preview?.safe && !busy;
  const canReset = resetConfirm.trim() === "RESET DEMO" && manifestPresent && !busy;

  const handleSeed = () => {
    if (!canSeed) return;
    setBusy(true);
    setSeedResult(null);
    setResetResult(null);
    try {
      const result = runDemoWorkspaceSeed();
      setSeedResult(result);
      if (result.ok) {
        setToast("Demo workspace seeded. Open Attendance Dashboard to verify counts.");
        setConfirmPhrase("");
      }
      refresh();
    } catch (e) {
      setSeedResult({
        ok: false,
        error: e instanceof Error ? e.message : "Seed failed",
        manifest: getDemoManifestSummary() ?? {
          version: 1,
          marker: DEMO_WORKSPACE_MARKER,
          seededAt: "",
          employeeIds: [],
          employeeCodes: [],
          departmentIds: [],
          designationIds: [],
          leaveRequestIds: [],
          attendanceRecordIds: [],
          travelRequestIds: [],
          travelClaimIds: [],
          letterDocumentIds: [],
          offboardingIds: [],
          payrollRunIds: [],
          notificationIds: [],
          notes: [],
          counts: {},
        },
        warnings: [],
      });
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    if (!canReset) return;
    setBusy(true);
    setResetResult(null);
    setSeedResult(null);
    try {
      const result = resetDemoWorkspace();
      setResetResult(result);
      if (result.ok) {
        setToast("Demo workspace records removed.");
        setResetConfirm("");
      }
      refresh();
    } catch (e) {
      setResetResult({
        ok: false,
        error: e instanceof Error ? e.message : "Reset failed",
        removed: {},
        skipped: [],
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <HrOrgPageHeader
      title="Demo Workspace"
      description="Safe, manual demo data seeding for client presentations. Does not overwrite Settings or non-demo records."
      icon={Database}
      sectionLabel="Tools"
      sectionHref="/hr/settings"
    >
      <div className="space-y-4 max-w-3xl">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Development / demo only</p>
            <p>
              Uses namespace <span className="font-mono">{DEMO_WORKSPACE_MARKER}</span> and codes{" "}
              <span className="font-mono">PVBWS-E###</span>. Never auto-seeds. Never writes Accounts.
              Type <span className="font-mono font-semibold">{DEMO_CONFIRM_PHRASE}</span> to confirm
              insertion.
            </p>
          </div>
        </div>

        {/* Live store inspection */}
        {inspection && (
          <div className="rounded-xl border border-border bg-white shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-navy-700">Live store inspection</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(hrBtn(), "h-8 text-xs")}
                onClick={refresh}
                disabled={busy}
              >
                Refresh
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <PreviewStat label="Demo employees" value={inspection.employeesDemo} />
              <PreviewStat label="With shift assigned" value={inspection.employeesWithShift} />
              <PreviewStat label="Attendance rows" value={inspection.attendanceDemo} />
              <PreviewStat label="Leave requests" value={inspection.leaveRequestsDemo} />
              <PreviewStat label="Travel requests" value={inspection.travelRequestsDemo} />
              <PreviewStat label="Claims" value={inspection.claimsDemo} />
              <PreviewStat label="Letters" value={inspection.lettersDemo} />
              <PreviewStat label="Offboarding" value={inspection.offboardingDemo} />
              <PreviewStat label="Payroll runs" value={inspection.payrollRunsDemo} />
              <PreviewStat label="Notifications" value={inspection.notificationsDemo} />
              <PreviewStat
                label={`Dashboard present>0 (${inspection.dashboardMonth})`}
                value={inspection.dashboardNonZeroPresent}
              />
              <PreviewStat label="Dashboard demo rows" value={inspection.dashboardRows} />
            </div>
            {inspection.dashboardSample.length > 0 && (
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground">Sample dashboard (current month):</p>
                {inspection.dashboardSample.map((s) => (
                  <p key={s.code} className="font-mono">
                    {s.code}: P={s.present} A={s.absent} WO={s.weekOff} Late={s.late}
                  </p>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {VERIFY_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:underline"
                >
                  {l.label}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="rounded-xl border border-border bg-white shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-navy-700">Seed preview</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(hrBtn(), "h-8 text-xs")}
              onClick={refresh}
              disabled={busy}
            >
              Refresh preview
            </Button>
          </div>

          {!preview ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : (
            <>
              {preview.blockers.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 space-y-1">
                  {preview.blockers.map((b) => (
                    <p key={b} className="text-xs text-red-700">
                      {b}
                    </p>
                  ))}
                </div>
              )}
              {preview.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 space-y-1">
                  {preview.warnings.map((w) => (
                    <p key={w} className="text-xs text-amber-800">
                      {w}
                    </p>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <PreviewStat label="Employees to add" value={preview.plan.employeesToAdd} />
                <PreviewStat
                  label="Already present"
                  value={preview.plan.employeesAlreadyPresent}
                />
                <PreviewStat label="Target employees" value={DEMO_TARGETS.employees} />
                <PreviewStat label="Travel requests" value={preview.plan.travelRequests} />
                <PreviewStat label="Claims" value={preview.plan.claims} />
                <PreviewStat label="Letters" value={preview.plan.letters} />
                <PreviewStat label="Offboarding" value={preview.plan.offboarding} />
                <PreviewStat label="Payroll months" value={preview.plan.payrollMonths} />
                <PreviewStat label="Leave requests (approx)" value={preview.plan.leaveRequests} />
              </div>
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                <p>
                  Branches: {preview.plan.branchesAvailable.join(", ") || "—"} · Shifts:{" "}
                  {preview.plan.shiftsAvailable.join(", ") || "—"}
                </p>
                <p>
                  Structure: {preview.plan.salaryStructure} · Cycle: {preview.plan.payrollCycle}
                </p>
              </div>
            </>
          )}

          <div className="pt-2 border-t border-border space-y-2">
            <label className="text-xs font-medium text-foreground">Confirmation phrase</label>
            <Input
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              placeholder={DEMO_CONFIRM_PHRASE}
              className="h-9 text-sm rounded-[10px] max-w-xs font-mono"
              disabled={busy || !preview?.safe}
            />
            <Button
              type="button"
              size="sm"
              className={cn(hrBtn("", true), "h-8 text-xs gap-1.5")}
              disabled={!canSeed}
              onClick={handleSeed}
            >
              <Play className="w-3.5 h-3.5" />
              {busy ? "Seeding…" : "Seed demo workspace"}
            </Button>
          </div>
        </div>

        {seedResult && (
          <ResultCard
            ok={seedResult.ok}
            title={seedResult.ok ? "Seed completed" : "Seed blocked / failed"}
            error={seedResult.error}
            warnings={seedResult.warnings}
            counts={seedResult.manifest.counts}
          />
        )}

        {/* Manifest / Reset */}
        <div className="rounded-xl border border-border bg-white shadow-sm p-4 space-y-3">
          <p className="text-sm font-semibold text-navy-700">Reset demo records</p>
          <p className="text-xs text-muted-foreground">
            Removes only records tracked in the demo manifest (and PVBWS-marked rows). Existing
            non-demo employees, Settings, and Accounts are left unchanged.
          </p>
          {manifestPresent ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {Object.entries(manifestCounts).map(([k, v]) => (
                <PreviewStat key={k} label={k} value={v} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No active demo manifest.</p>
          )}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-xs font-medium">Type RESET DEMO to confirm</label>
            <Input
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="RESET DEMO"
              className="h-9 text-sm rounded-[10px] max-w-xs font-mono"
              disabled={busy || !manifestPresent}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(hrBtn("h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50"))}
              disabled={!canReset}
              onClick={handleReset}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset demo workspace
            </Button>
          </div>
        </div>

        {resetResult && (
          <ResultCard
            ok={resetResult.ok}
            title={resetResult.ok ? "Reset completed" : "Reset failed"}
            error={resetResult.error}
            warnings={resetResult.skipped}
            counts={resetResult.removed}
          />
        )}
      </div>

      {toast && <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />}
    </HrOrgPageHeader>
  );
}

function PreviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        {label}
      </p>
      <p className="text-sm font-bold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function ResultCard({
  ok,
  title,
  error,
  warnings,
  counts,
}: {
  ok: boolean;
  title: string;
  error?: string;
  warnings?: string[];
  counts: Record<string, number>;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3 space-y-2",
        ok ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50/60",
      )}
    >
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-red-600" />
        )}
        <p className={cn("text-sm font-semibold", ok ? "text-emerald-800" : "text-red-800")}>
          {title}
        </p>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      {warnings && warnings.length > 0 && (
        <ul className="text-xs text-amber-800 space-y-0.5 list-disc pl-4">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {Object.keys(counts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(counts).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-border text-[11px]"
            >
              <span className="text-muted-foreground">{k}</span>
              <span className="font-semibold">{v}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
