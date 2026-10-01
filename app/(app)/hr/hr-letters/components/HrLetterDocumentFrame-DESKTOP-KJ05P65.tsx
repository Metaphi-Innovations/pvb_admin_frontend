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
  className,
}: HrLetterDocumentFrameProps) {
  const documentTitle = (title || "").trim();
  const headerText = stripHtmlToText(header || "");
  const showHeader =
    !isBlankTemplateHtml(header || "") &&
    headerText.toLowerCase() !== documentTitle.toLowerCase();
  const showFooter = !isBlankTemplateHtml(footer || "");
  const showChrome = !!(useCompanyLogo || showCompanyAddress || showCompanyContact);

  return (
    <div className={cn("space-y-3", className)}>
      {unknownPlaceholders && unknownPlaceholders.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Unknown field{unknownPlaceholders.length > 1 ? "s" : ""}:{" "}
          {unknownPlaceholders.map((k) => `{{${k}}}`).join(", ")}
          <span className="block text-[11px] mt-1 text-amber-700/90">
            Left as {"{{token}}"} in the document. Issue is blocked until these are removed or
            mapped.
          </span>
        </div>
      ) : null}

      <div
        className={cn(
          "mx-auto w-full max-w-[520px] min-h-[640px] bg-white border border-border",
          "shadow-sm rounded-sm p-6 text-[12px] leading-relaxed text-foreground",
        )}
        data-hr-letter-page
      >
        {showChrome ? (
          <div className="mb-4 pb-3 border-b border-border text-center space-y-1">
            {useCompanyLogo && logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-10 mx-auto object-contain" />
            ) : useCompanyLogo ? (
              <p className="text-sm font-bold text-navy-700">{companyName || "—"}</p>
            ) : null}
            {showCompanyAddress ? (
              <p className="text-[11px] text-muted-foreground">{companyAddress || "—"}</p>
            ) : null}
            {showCompanyContact ? (
              <p className="text-[11px] text-muted-foreground">{companyContact || "—"}</p>
            ) : null}
          </div>
        ) : null}

        {documentTitle ? (
          <h2 className="mb-3 text-sm font-bold text-navy-700 tracking-wide uppercase text-center">
            {documentTitle}
          </h2>
        ) : null}

        {showHeader ? (
          <div
            className="mb-3 text-[12px]"
            dangerouslySetInnerHTML={{ __html: header }}
          />
        ) : null}

        <div dangerouslySetInnerHTML={{ __html: body || "<p>—</p>" }} />

        {showFooter ? (
          <div
            className="mt-6 pt-3 border-t border-border text-[11px] text-muted-foreground"
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
  body { font-family: "Plus Jakarta Sans", Georgia, serif; margin: 0; padding: 24px; color: #111; }
  img { max-height: 40px; }
</style>
</head><body>${page.innerHTML}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}
