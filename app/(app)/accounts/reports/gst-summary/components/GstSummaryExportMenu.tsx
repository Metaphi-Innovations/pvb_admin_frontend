"use client";

import { useCallback, useState } from "react";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { showToast } from "@/lib/toast";
import { GstSummaryApiError } from "@/services/gst-summary.service";

type Format = "EXCEL" | "PDF";

export function GstSummaryExportMenu({
  disabled,
  disabledTitle,
  onExport,
}: {
  disabled?: boolean;
  disabledTitle?: string;
  onExport: (format: Format) => Promise<void>;
}) {
  const [exporting, setExporting] = useState(false);

  const handle = useCallback(
    async (format: Format) => {
      if (exporting || disabled) return;
      setExporting(true);
      try {
        await onExport(format);
      } catch (error) {
        const message =
          error instanceof GstSummaryApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Export failed.";
        showToast(message, "error");
      } finally {
        setExporting(false);
      }
    },
    [disabled, exporting, onExport],
  );

  return (
    <AccountsExportMenu
      onExcel={() => void handle("EXCEL")}
      onPdf={() => void handle("PDF")}
      disabled={exporting || !!disabled}
      disabledTitle={
        exporting ? "Export in progress…" : disabledTitle
      }
    />
  );
}
