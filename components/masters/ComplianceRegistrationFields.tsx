"use client";

import type { ComplianceRegistrationValues } from "@/lib/masters/compliance-registration";
import { RegistrationToggleRow } from "@/components/masters/RegistrationToggleRow";

export function ComplianceRegistrationFields({
	values,
	onChange,
	errors = {},
	readOnly,
	inputClassName = "h-8 text-xs",
}: {
	values: ComplianceRegistrationValues;
	onChange: (next: ComplianceRegistrationValues) => void;
	errors?: Record<string, string>;
	readOnly?: boolean;
	/** @deprecated kept for API compatibility */
	namePrefix?: string;
	inputClassName?: string;
}) {
	return (
		<div className="space-y-0">
			<RegistrationToggleRow
				label="FSSAI Registered"
				enabled={values.fssaiRegistered}
				onEnabledChange={(yes) =>
					onChange({ ...values, fssaiRegistered: yes, fssai: yes ? values.fssai : "" })
				}
				numberLabel="FSSAI License Number"
				numberValue={values.fssai}
				onNumberChange={(value) => onChange({ ...values, fssai: value })}
				numberError={errors.fssai}
				numberPlaceholder="FSSAI license number"
				readOnly={readOnly}
				inputClassName={inputClassName}
			/>

			<RegistrationToggleRow
				label="CIB Registered"
				enabled={values.cibRegistered}
				onEnabledChange={(yes) =>
					onChange({ ...values, cibRegistered: yes, cibRegn: yes ? values.cibRegn : "" })
				}
				numberLabel="CIB Registration Number"
				numberValue={values.cibRegn}
				onNumberChange={(value) => onChange({ ...values, cibRegn: value })}
				numberError={errors.cibRegn}
				numberPlaceholder="CIB registration number"
				readOnly={readOnly}
				inputClassName={inputClassName}
			/>

			<RegistrationToggleRow
				label="FCO Registered"
				enabled={values.fcoRegistered}
				onEnabledChange={(yes) =>
					onChange({ ...values, fcoRegistered: yes, fcoRegn: yes ? values.fcoRegn : "" })
				}
				numberLabel="FCO Registration Number"
				numberValue={values.fcoRegn}
				onNumberChange={(value) => onChange({ ...values, fcoRegn: value })}
				numberError={errors.fcoRegn}
				numberPlaceholder="FCO registration number"
				readOnly={readOnly}
				inputClassName={inputClassName}
			/>
		</div>
	);
}
