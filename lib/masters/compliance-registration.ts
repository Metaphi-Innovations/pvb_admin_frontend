export interface ComplianceRegistrationValues {
	fssaiRegistered: boolean;
	fssai: string;
	cibRegistered: boolean;
	cibRegn: string;
	fcoRegistered: boolean;
	fcoRegn: string;
}

/** Back-fill registered flags from legacy number fields. */
export function deriveComplianceRegistration(
	raw: Partial<ComplianceRegistrationValues>,
): ComplianceRegistrationValues {
	return {
		fssaiRegistered: raw.fssaiRegistered ?? Boolean(raw.fssai?.trim()),
		fssai: raw.fssai ?? "",
		cibRegistered: raw.cibRegistered ?? Boolean(raw.cibRegn?.trim()),
		cibRegn: raw.cibRegn ?? "",
		fcoRegistered: raw.fcoRegistered ?? Boolean(raw.fcoRegn?.trim()),
		fcoRegn: raw.fcoRegn ?? "",
	};
}

export function validateComplianceRegistration(
	values: ComplianceRegistrationValues,
): Record<string, string> {
	const errors: Record<string, string> = {};
	if (values.fssaiRegistered && !values.fssai.trim()) {
		errors.fssai = "FSSAI number is required when FSSAI registered";
	}
	if (values.cibRegistered && !values.cibRegn.trim()) {
		errors.cibRegn = "CIB registration number is required when CIB registered";
	}
	if (values.fcoRegistered && !values.fcoRegn.trim()) {
		errors.fcoRegn = "FCO registration number is required when FCO registered";
	}
	return errors;
}

export function complianceRegistrationToStored(
	values: ComplianceRegistrationValues,
): ComplianceRegistrationValues {
	return {
		fssaiRegistered: values.fssaiRegistered,
		fssai: values.fssaiRegistered ? values.fssai.trim() : "",
		cibRegistered: values.cibRegistered,
		cibRegn: values.cibRegistered ? values.cibRegn.trim() : "",
		fcoRegistered: values.fcoRegistered,
		fcoRegn: values.fcoRegistered ? values.fcoRegn.trim() : "",
	};
}
