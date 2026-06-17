import { RecordKvRow } from "@/components/record-detail";

export function ComplianceRegistrationViewRows({
	values,
	lastRowProps,
}: {
	values: {
		fssaiRegistered?: boolean;
		fssai?: string;
		cibRegistered?: boolean;
		cibRegn?: string;
		fcoRegistered?: boolean;
		fcoRegn?: string;
	};
	/** Applied to the FCO number row when shown, or FCO registered row when number hidden */
	lastRowProps?: { isLast?: boolean };
}) {
	const fssaiRegistered = values.fssaiRegistered ?? Boolean(values.fssai?.trim());
	const cibRegistered = values.cibRegistered ?? Boolean(values.cibRegn?.trim());
	const fcoRegistered = values.fcoRegistered ?? Boolean(values.fcoRegn?.trim());

	return (
		<>
			<RecordKvRow label="FSSAI Registered" value={fssaiRegistered ? "Yes" : "No"} />
			{fssaiRegistered && (
				<RecordKvRow label="FSSAI Number" value={values.fssai || "—"} mono copy />
			)}
			<RecordKvRow label="CIB Registered" value={cibRegistered ? "Yes" : "No"} />
			{cibRegistered && (
				<RecordKvRow
					label="CIB Registration Number"
					value={values.cibRegn || "—"}
					mono
					copy
				/>
			)}
			<RecordKvRow
				label="FCO Registered"
				value={fcoRegistered ? "Yes" : "No"}
				isLast={!fcoRegistered && lastRowProps?.isLast}
			/>
			{fcoRegistered && (
				<RecordKvRow
					label="FCO Registration Number"
					value={values.fcoRegn || "—"}
					mono
					copy
					isLast={lastRowProps?.isLast}
				/>
			)}
		</>
	);
}
