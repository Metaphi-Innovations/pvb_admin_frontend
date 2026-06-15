"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RecordDetailLayout, type RecordDetailLayoutProps } from "./RecordDetailLayout";

export type RecordDetailPageProps = RecordDetailLayoutProps & {
  /** Optional alert/banner above main content (e.g. blocked reason) */
  alert?: React.ReactNode;
};

export function RecordDetailPage({ alert, ...layoutProps }: RecordDetailPageProps) {
  return (
    <AppLayout>
      {alert}
      <RecordDetailLayout {...layoutProps} />
    </AppLayout>
  );
}
