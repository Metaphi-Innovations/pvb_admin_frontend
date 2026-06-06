"use client";

import { formatFollowUpDateTime, type POFollowUpEntry } from "../po-followup-data";

export function FollowUpTimeline({ entries }: { entries: POFollowUpEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-[12px] text-[#6B80A0] py-4 text-center">No follow-ups recorded yet.</p>;
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, idx) => (
        <FollowUpTimelineItem key={entry.id} entry={entry} isLast={idx === entries.length - 1} />
      ))}
    </div>
  );
}

function FollowUpTimelineItem({ entry, isLast }: { entry: POFollowUpEntry; isLast: boolean }) {
  return (
    <div className="flex gap-2.5 pb-4 relative">
      {!isLast && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-[#DDE3EF]" />}
      <span className="w-2.5 h-2.5 rounded-full bg-brand-500 mt-1 shrink-0 z-[1]" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-[#0A1628]">{formatFollowUpDateTime(entry.followUpAt)}</p>
        <p className="text-[11px] text-[#6B80A0] mt-1.5">
          Spoke With: <span className="text-[#0A1628] font-medium">{entry.spokeWith || "—"}</span>
        </p>
        <p className="text-[11px] text-[#6B80A0] mt-1">
          Remarks: <span className="text-[#3D5473] whitespace-pre-wrap">{entry.remarks}</span>
        </p>
        <p className="text-[11px] text-[#9AAAC5] mt-1.5">Added By: {entry.createdBy}</p>
      </div>
    </div>
  );
}
