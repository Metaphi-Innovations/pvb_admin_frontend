export interface GstPrincipalAddress {
  buildingName: string;
  buildingNumber: string;
  floorNumber: string;
  street: string;
  locality: string;
  location: string;
  district: string;
  state: string;
  pincode: string;
  landmark: string;
  latitude: string;
  longitude: string;
}

export interface GstJurisdiction {
  stateJurisdictionCode: string;
  stateJurisdiction: string;
  centralJurisdictionCode: string;
  centralJurisdiction: string;
}

export interface GstVerificationDetails {
  gstin: string;
  legalName: string;
  tradeName: string;
  registrationType: string;
  status: string;
  registrationDate: string;
  businessType: string;
  natureOfBusiness: string[];
  principalAddress: GstPrincipalAddress;
  additionalAddresses: GstPrincipalAddress[];
  einvoiceStatus: string;
  jurisdiction: GstJurisdiction;
  legalAddress: string;
}

/** Payload returned to parent forms on Auto Fill. */
export interface GstAutoFillPayload {
  legalName: string;
  legalAddress: string;
  gstin: string;
  tradeName: string;
  principalAddress: GstPrincipalAddress;
  details: GstVerificationDetails;
}

export function formatGstAddressLine(address: GstPrincipalAddress): string {
  const parts = [
    address.floorNumber,
    [address.buildingNumber, address.buildingName].filter(Boolean).join(" "),
    address.street,
    address.locality,
    address.location,
    address.district,
    address.state,
    address.pincode,
    address.landmark ? `Near ${address.landmark}` : "",
  ]
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

export function toGstAutoFillPayload(
  details: GstVerificationDetails,
): GstAutoFillPayload {
  return {
    legalName: details.legalName,
    legalAddress: details.legalAddress || formatGstAddressLine(details.principalAddress),
    gstin: details.gstin,
    tradeName: details.tradeName,
    principalAddress: details.principalAddress,
    details,
  };
}
