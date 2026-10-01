import type { Distributor } from "@/app/(app)/database/distributor/distributor-data";
import type { CustomerFormValues } from "@/app/(app)/masters/customers/components/CustomerForm";
import { DEFAULT_CUSTOMER_FORM } from "@/app/(app)/masters/customers/components/CustomerForm";
import { computeDistributorAssessment } from "./distributor-scoring";

export const CONVERT_DISTRIBUTOR_STORAGE_KEY = "distributor:convert-id";

export function buildCustomerPrefillFromDistributor(
  distributor: Distributor,
): CustomerFormValues {
  const assessment = computeDistributorAssessment(distributor);

  const recommendedLimit = assessment.creditLimit;
  const recommendedDays = assessment.creditPeriodDays;
  const recommendedStatus = assessment.creditStatus;

  return {
    ...DEFAULT_CUSTOMER_FORM,
    customerName: distributor.firmName,
    customerType: "Distributor",
    mobile: distributor.phoneNumber,
    address: [
      distributor.address,
      distributor.addressLine2,
      distributor.village,
      distributor.town,
      distributor.city,
    ]
      .filter(Boolean)
      .join(", "),
    pincode: distributor.pincode,
    creditSource: "distributor_conversion",
    linkedDistributorId: String(distributor.id),
    linkedDistributorName: distributor.firmName,
    distributorScore: assessment.weightedScore.toFixed(2),
    distributorCategory: assessment.category,
    recommendedCreditLimit: String(recommendedLimit),
    recommendedCreditDays: String(recommendedDays),
    recommendedCreditStatus: recommendedStatus,
    finalCreditStatus: recommendedStatus,
    creditLimit: String(recommendedLimit),
    paymentType:
      assessment.paymentMode === "cash_and_carry" ? "immediate" : "credit",
    creditDays: String(recommendedDays),
    advancePercentage: "",
    creditOverrideReason: "",
  };
}
