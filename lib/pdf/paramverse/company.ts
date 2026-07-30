/** Shared Paramverse company block for ERP PDFs. */
export const PARAMVERSE_COMPANY = {
  companyName: "PARAMVERSE BIO PRIVATE LIMITED",
  companyAddress:
    "402, 4th Floor, Omega Tower, Hiranandani Link Road, Hiranandani Gardens, Opp. Colgate Palmolive, Mumbai – 400076, Maharashtra",
  companyMetaLine:
    "GSTIN: 27AAQCP4960M1ZL   PAN: AAQCP4960M   CIN: U46201MH2025PTC463792",
  companyContactLine:
    "Ph: 022-41276000/01/02/03   Email: info@paramverse.com   Web: www.paramversebio.com",
  signatoryCompany: "PARAMVERSE BIO PVT. LTD.",
} as const satisfies Record<string, string>;

/** Mutable string shape so PDF view-models can override company fields. */
export type ParamverseCompany = {
  companyName: string;
  companyAddress: string;
  companyMetaLine: string;
  companyContactLine: string;
  signatoryCompany: string;
};
