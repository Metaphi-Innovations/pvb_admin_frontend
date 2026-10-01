"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Pencil, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HrSuccessToast } from "../../../components/HrSuccessToast";
import { HrOrgPageHeader, hrBtn } from "../../organization/_components";
import {
  loadAttendanceModesSettings,
  type AttendanceModesSettings,
} from "../../attendance-modes-data";
import { AttendanceModesEditDrawer } from "./AttendanceModesEditDrawer";
import { AttendanceModesSummary } from "./AttendanceModesSummary";

export default function AttendanceModesClient() {
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

  return (
    <HrOrgPageHeader
      title="Attendance Modes"
      description="Configure how employees punch in from the mobile app."
      icon={Smartphone}
      sectionLabel="Attendance Settings"
      actions={
        <Button
          size="sm"
          className={hrBtn("gap-1.5", true)}
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
      }
    >
      <div className="space-y-3">
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
    </HrOrgPageHeader>
  );
}
