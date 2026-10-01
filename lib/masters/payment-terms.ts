export type PaymentType = "immediate" | "credit" | "advance";

export interface StructuredPaymentTerms {
	paymentType: PaymentType;
	creditDays: number;
	advancePercentage: number;
}

export const PAYMENT_TYPE_OPTIONS: { value: PaymentType; label: string }[] = [
	{ value: "immediate", label: "Immediate" },
	{ value: "credit", label: "Credit" },
	{ value: "advance", label: "Advance" },
];

const LEGACY_PRESET_LABELS: Record<string, string> = {
	advance: "Advance (Full)",
	"net-7": "Net 7 Days",
	"net-15": "Net 15 Days",
	"net-30": "Net 30 Days",
	"net-45": "Net 45 Days",
	"net-60": "Net 60 Days",
	"net-90": "Net 90 Days",
	"net-120": "Net 120 Days",
	"net-150": "Net 150 Days",
	"net-180": "Net 180 Days",
	immediate: "Immediate",
};

function parseLegacyNetDays(value: string): number | null {
	const match = value.trim().toLowerCase().match(/^net-(\d+)$/);
	return match ? parseInt(match[1], 10) : null;
}

/** Migrate legacy string payment terms to structured fields. */
export function paymentTermsFromLegacy(legacy: string): StructuredPaymentTerms {
	const v = (legacy || "").trim().toLowerCase();
	if (!v || v === "immediate" || v === "cod" || v === "net-0") {
		return { paymentType: "immediate", creditDays: 0, advancePercentage: 0 };
	}
	if (v === "advance" || v.startsWith("advance")) {
		const pctMatch = v.match(/(\d+)/);
		return {
			paymentType: "advance",
			creditDays: 0,
			advancePercentage: pctMatch
				? Math.min(100, Math.max(1, parseInt(pctMatch[1], 10)))
				: 100,
		};
	}
	const days = parseLegacyNetDays(v);
	if (days != null) {
		return { paymentType: "credit", creditDays: days, advancePercentage: 0 };
	}
	return { paymentType: "credit", creditDays: 30, advancePercentage: 0 };
}

/** Derive legacy string for modules that still read `paymentTerms`. */
export function paymentTermsToLegacy(terms: StructuredPaymentTerms): string {
	if (terms.paymentType === "immediate") return "immediate";
	if (terms.paymentType === "advance") return "advance";
	return `net-${terms.creditDays}`;
}

export function formatStructuredPaymentTerms(
	terms: StructuredPaymentTerms,
): string {
	if (terms.paymentType === "immediate") return "Immediate";
	if (terms.paymentType === "advance") {
		return `Advance ${terms.advancePercentage}%`;
	}
	if (terms.creditDays === 0) return "Immediate";
	return `Credit ${terms.creditDays} Days`;
}

export function formatLegacyPaymentTermsLabel(value: string): string {
	if (!value) return "—";
	const preset = LEGACY_PRESET_LABELS[value];
	if (preset) return preset;
	const days = parseLegacyNetDays(value);
	if (days != null) return `Net ${days} Days`;
	return value;
}

export function formatPartyPaymentTerms(party: {
	paymentType?: PaymentType;
	creditDays?: number;
	advancePercentage?: number;
	paymentTerms?: string;
}): string {
	if (party.paymentType) {
		return formatStructuredPaymentTerms({
			paymentType: party.paymentType,
			creditDays: party.creditDays ?? 0,
			advancePercentage: party.advancePercentage ?? 0,
		});
	}
	return formatLegacyPaymentTermsLabel(party.paymentTerms ?? "");
}

export function resolveStructuredPaymentTerms(party: {
	paymentType?: PaymentType;
	creditDays?: number;
	advancePercentage?: number;
	paymentTerms?: string;
}): StructuredPaymentTerms {
	if (party.paymentType) {
		return {
			paymentType: party.paymentType,
			creditDays: party.creditDays ?? 0,
			advancePercentage: party.advancePercentage ?? 0,
		};
	}
	return paymentTermsFromLegacy(party.paymentTerms ?? "net-30");
}

export interface PaymentTermsFormValues {
	paymentType: PaymentType | "";
	creditDays: string;
	advancePercentage: string;
}

export function structuredToFormValues(
	terms: StructuredPaymentTerms,
): PaymentTermsFormValues {
	return {
		paymentType: terms.paymentType,
		creditDays: String(terms.creditDays),
		advancePercentage:
			terms.paymentType === "advance" && terms.advancePercentage > 0
				? String(terms.advancePercentage)
				: "",
	};
}

export function formValuesToStructured(
	form: PaymentTermsFormValues,
): StructuredPaymentTerms | null {
	if (!form.paymentType) return null;
	if (form.paymentType === "immediate") {
		return {
			paymentType: "immediate",
			creditDays: 0,
			advancePercentage: 0,
		};
	}
	if (form.paymentType === "credit") {
		const days = parseInt(form.creditDays, 10);
		if (Number.isNaN(days) || form.creditDays.trim() === "") return null;
		return {
			paymentType: "credit",
			creditDays: days,
			advancePercentage: 0,
		};
	}
	const pct = parseInt(form.advancePercentage, 10);
	if (Number.isNaN(pct) || form.advancePercentage.trim() === "") return null;
	return {
		paymentType: "advance",
		creditDays: 0,
		advancePercentage: pct,
	};
}

export function validatePaymentTermsForm(
	form: PaymentTermsFormValues,
	prefix = "",
): Record<string, string> {
	const errors: Record<string, string> = {};
	const key = (field: string) => (prefix ? `${prefix}${field}` : field);

	if (!form.paymentType) {
		errors[key("paymentType")] = "Payment type is required";
		return errors;
	}

	if (form.paymentType === "immediate") {
		return errors;
	}

	if (form.paymentType === "credit") {
		if (!form.creditDays.trim()) {
			errors[key("creditDays")] = "Credit days is required";
		} else {
			const days = parseInt(form.creditDays, 10);
			if (Number.isNaN(days) || days < 0) {
				errors[key("creditDays")] = "Enter a valid number of credit days";
			}
		}
		return errors;
	}

	if (!form.advancePercentage.trim()) {
		errors[key("advancePercentage")] = "Advance % is required";
	} else {
		const pct = parseInt(form.advancePercentage, 10);
		if (Number.isNaN(pct) || pct < 1 || pct > 100) {
			errors[key("advancePercentage")] =
				"Advance % must be between 1 and 100";
		}
	}

	return errors;
}
