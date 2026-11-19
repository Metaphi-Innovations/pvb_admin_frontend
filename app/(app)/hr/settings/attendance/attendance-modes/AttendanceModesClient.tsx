"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Pencil, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HrSuccessToast } from "../../../components/HrSuccessToast";
import { HrInfoHeading } from "../../../components/HrInfoHint";
import { HrOrgPageHeader, hrBtn } from "../../organization/_components";
import {
  loadAttendanceModesSettings,
  type AttendanceModesSettings,
} from "../../attendance-modes-data";
import { AttendanceModesEditDrawer } from "./AttendanceModesEditDrawer";
import { AttendanceModesSummary } from "./AttendanceModesSummary";

export default function AttendanceModesClient({
  embedded = false,
}: {
  /** When true, omit page chrome (used inside Shift & Attendance Setup tabs). */
  embedded?: boolean;
} = {}) {
  const [saved, setSaved] = useState<AttendanceModesSettings | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setSaved(loadAttendanceModesSettings());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSaved = () => {
    refresh();
    setToast("Attendance Modes updated successfully.");
  };

  if (!saved) return null;

  const editAction = (
    <Button
      size="sm"
      className={hrBtn("gap-1.5", true)}
      onClick={() => setEditOpen(true)}
    >
      <Pencil className="w-3.5 h-3.5" /> Edit
    </Button>
  );

  const modesInfo = {
    title: "Attendance Modes",
    summary: "Controls how employees punch attendance from the Employee Mobile app.",
    what: "Configures mobile punch availability, GPS/location checks, and face verification requirements.",
    when: "Applied when an employee punches in or out on mobile.",
    affects: "Employee Mobile attendance capture. Does not change desktop attendance listing or shift assignment.",
    sections: [
      {
        label: "Current configuration",
        body: (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
            <dt className="text-muted-foreground">Mobile attendance</dt>
            <dd className="font-medium">
              {saved.mobileAttendanceEnabled ? "On" : "Off"}
            </dd>
            <dt className="text-muted-foreground">GPS capture</dt>
            <dd className="font-medium">{saved.captureGps ? "On" : "Off"}</dd>
            <dt className="text-muted-foreground">Face verification</dt>
            <dd className="font-medium">
              {saved.faceVerificationEnabled ? "On" : "Off"}
            </dd>
          </dl>
        ),
      },
    ],
  };

  const body = (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <HrInfoHeading mode="drawer" info={modesInfo}>
            Attendance Modes
          </HrInfoHeading>
          {embedded && editAction}
        </div>
        <AttendanceModesSummary settings={saved} />
        <p className="text-[11px] text-muted-foreground max-w-[640px]">
          Last updated {saved.updatedAt} by {saved.updatedBy}
        </p>
      </div>

      <AttendanceModesEditDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        saved={saved}
        onSaved={handleSaved}
      />

      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </>
  );

  if (embedded) return body;

  return (
    <HrOrgPageHeader
      title="Attendance Modes"
      description="Configure how employees punch in from the mobile app."
      icon={Smartphone}
      sectionLabel="Attendance Settings"
      actions={editAction}
    >
      {body}
    </HrOrgPageHeader>
  );
}
