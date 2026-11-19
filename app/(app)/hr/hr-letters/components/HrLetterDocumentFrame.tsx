"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { isBlankTemplateHtml, stripHtmlToText } from "@/app/(app)/hr/settings/hr-template-data";

export interface HrLetterDocumentFrameProps {
  title: string;
  header: string;
  body: string;
  footer: string;
  companyName?: string;
  companyAddress?: string;
  companyContact?: string;
  logoUrl?: string;
  useCompanyLogo?: boolean;
  showCompanyAddress?: boolean;
  showCompanyContact?: boolean;
  unknownPlaceholders?: string[];
  /** Optional letter meta shown under letterhead */
  issueDate?: string;
  referenceNumber?: string;
  className?: string;
}

/** A4-style letter preview. Used for live preview and historical snapshots. */
export function HrLetterDocumentFrame({
  title,
  header,
  body,
  footer,
  companyName,
  companyAddress,
  companyContact,
  logoUrl,
  useCompanyLogo,
  showCompanyAddress,
  showCompanyContact,
  unknownPlaceholders,
  issueDate,
  referenceNumber,
  className,
}: HrLetterDocumentFrameProps) {
  const documentTitle = (title || "").trim();
  const headerText = stripHtmlToText(header || "");
  const showHeader =
    !isBlankTemplateHtml(header || "") &&
    headerText.toLowerCase() !== documentTitle.toLowerCase();
  const showFooter = !isBlankTemplateHtml(footer || "");
  const showChrome = !!(useCompanyLogo || showCompanyAddress || showCompanyContact);
  const showMeta = !!(issueDate || referenceNumber);

  return (
    <div className={cn("space-y-3", className)}>
      {unknownPlaceholders && unknownPlaceholders.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Unknown field{unknownPlaceholders.length > 1 ? "s" : ""}:{" "}
          {unknownPlaceholders.map((k) => `{{${k}}}`).join(", ")}
          <span className="block text-[11px] mt-1 text-amber-700/90">
            Shown as — in the document. Issue is blocked until these are removed or mapped.
          </span>
        </div>
      ) : null}

      <div
        className={cn(
          "mx-auto w-full max-w-[720px] bg-white border border-border",
          "shadow-sm rounded-sm px-8 py-8 sm:px-10 sm:py-9 text-[13px] leading-[1.65] text-foreground",
        )}
        data-hr-letter-page
      >
        {showChrome ? (
          <div className="mb-5 pb-4 border-b border-border text-center space-y-1">
            {useCompanyLogo && logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-11 mx-auto object-contain mb-1" />
            ) : useCompanyLogo ? (
              <p className="text-base font-bold text-navy-700 tracking-tight">
                {companyName || "—"}
              </p>
            ) : null}
            {showCompanyAddress ? (
              <p className="text-[11px] text-muted-foreground leading-snug max-w-[520px] mx-auto">
                {companyAddress || "—"}
              </p>
            ) : null}
            {showCompanyContact ? (
              <p className="text-[11px] text-muted-foreground">{companyContact || "—"}</p>
            ) : null}
          </div>
        ) : null}

        {showMeta ? (
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2 text-[11px] text-muted-foreground">
            {referenceNumber ? (
              <p>
                <span className="font-semibold text-foreground">Ref:</span>{" "}
                <span className="font-mono">{referenceNumber}</span>
              </p>
            ) : (
              <span />
            )}
            {issueDate ? (
              <p>
                <span className="font-semibold text-foreground">Date:</span> {issueDate}
              </p>
            ) : null}
          </div>
        ) : null}

        {documentTitle ? (
          <h2 className="mb-5 text-[15px] font-bold text-navy-700 tracking-wide uppercase text-center leading-snug">
            {documentTitle}
          </h2>
        ) : null}

        {showHeader ? (
          <div
            className="mb-4 text-[13px] [&_p]:mb-2.5"
            dangerouslySetInnerHTML={{ __html: header }}
          />
        ) : null}

        <div
          className={cn(
            "text-[13px] text-foreground",
            "[&_p]:mb-3 [&_p:last-child]:mb-0",
            "[&_strong]:font-semibold [&_table]:w-full [&_table]:text-[12px] [&_table]:my-3",
            "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5",
            "[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1.5 [&_th]:bg-muted/40 [&_th]:text-left",
          )}
          dangerouslySetInnerHTML={{ __html: body || "<p>—</p>" }}
        />

        {showFooter ? (
          <div
            className="mt-8 pt-4 border-t border-border text-[11px] text-muted-foreground [&_p]:mb-1"
            dangerouslySetInnerHTML={{ __html: footer }}
          />
        ) : null}
      </div>
    </div>
  );
}

export function printHrLetterPreview(root: HTMLElement | null, fallbackTitle: string) {
  if (!root || typeof window === "undefined") return;
  const page = root.querySelector("[data-hr-letter-page]") ?? root;
  const w = window.open("", "_blank", "noopener,noreferrer,width=800,height=1000");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${fallbackTitle}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: "Plus Jakarta Sans", Georgia, "Times New Roman", serif; margin: 0; padding: 8px; color: #111; font-size: 13px; line-height: 1.65; }
  h2 { text-align: center; text-transform: uppercase; letter-spacing: 0.04em; color: #1A3A96; font-size: 15px; }
  img { max-height: 44px; }
  p { margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { background: #f5f5f5; }
</style>
</head><body>${page.innerHTML}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}
