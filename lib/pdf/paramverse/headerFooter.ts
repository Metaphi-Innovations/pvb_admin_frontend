import { escapeHtml, escapeSrcAttr, asText } from "./formatters";
import type { ParamverseCompany } from "./company";
import { PARAMVERSE_COMPANY } from "./company";

export interface PdfHeaderInput {
  logoSrc?: string;
  docTitle: string;
  /** Optional second line under title (e.g. WITH GOODS VALUE). */
  docSubtitle?: string;
  company?: Partial<ParamverseCompany>;
}

/** Logo + company block (left) + document title (right). */
export function renderParamverseHeader(input: PdfHeaderInput): string {
  const company = { ...PARAMVERSE_COMPANY, ...input.company };
  const subtitle = String(input.docSubtitle ?? "").trim();
  return `
  <div class="pv-header">
    <div class="pv-logo">
      ${input.logoSrc ? `<img src="${escapeSrcAttr(input.logoSrc)}" alt="Logo" />` : ""}
    </div>
    <div>
      <div class="pv-company-name">${escapeHtml(company.companyName)}</div>
      <div class="pv-muted">${escapeHtml(company.companyAddress)}</div>
      <div class="pv-muted">${escapeHtml(company.companyMetaLine)}</div>
      <div class="pv-muted">${escapeHtml(company.companyContactLine)}</div>
    </div>
    <div class="pv-doc-title-wrap">
      <div class="pv-doc-title">${escapeHtml(input.docTitle)}</div>
      ${subtitle ? `<div class="pv-doc-subtitle">${escapeHtml(subtitle)}</div>` : ""}
    </div>
  </div>`;
}

export interface PdfFooterInput {
  left: string;
  center: string;
  right: string;
}

/** Bottom triple footer line. */
export function renderParamverseFooter(input: PdfFooterInput): string {
  return `
  <div class="pv-footer">
    <span>${escapeHtml(asText(input.left, ""))}</span>
    <span>${escapeHtml(asText(input.center, ""))}</span>
    <span>${escapeHtml(asText(input.right, ""))}</span>
  </div>`;
}

export function renderParamverseSectionTitle(text: string): string {
  return `<div class="pv-section-title">${escapeHtml(text)}</div>`;
}

export function renderParamverseSignatory(companyName: string): string {
  return `
  <div class="pv-sign">
    <div class="pv-sign-company">FOR ${escapeHtml(companyName)}</div>
    <div class="pv-sign-gap"></div>
    <div class="pv-sign-label">Authorised Signatory</div>
  </div>`;
}
