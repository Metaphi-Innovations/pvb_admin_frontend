"use client";

import { FollowUpActivityFeed } from "./FollowUpActivityFeed";
import { type POFollowUpEntry } from "../po-followup-data";

export function FollowUpTimeline({ entries }: { entries: POFollowUpEntry[] }) {
  return <FollowUpActivityFeed entries={entries} showTitle={false} />;
}
