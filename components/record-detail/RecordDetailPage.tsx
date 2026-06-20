"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RecordDetailLayout, type RecordDetailLayoutProps } from "./RecordDetailLayout";

export type RecordDetailPageProps = RecordDetailLayoutProps & {
  /** Optional alert/banner above main content (e.g. blocked reason) */
  alert?: React.ReactNode;
  /** When true, skip AppLayout wrapper (use inside Accounts module shell) */
  embedded?: boolean;
};

export function RecordDetailPage({ alert, embedded, ...layoutProps }: RecordDetailPageProps) {
  const content = (
    <>
      {alert}
      <RecordDetailLayout {...layoutProps} />
    </>
  );

  if (embedded) return content;

  return <AppLayout>{content}</AppLayout>;
}
