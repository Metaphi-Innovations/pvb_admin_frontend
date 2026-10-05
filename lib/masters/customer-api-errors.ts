export type ApiValidationError = {
  path?: string;
  message?: string;
};

export type CustomerApiErrorResult = {
  toastMessage: string;
  fieldErrors: Record<string, string>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/** Map API/Zod snake_case paths to CustomerForm field keys. */
export function mapCustomerApiPathToFieldKey(path: string): string {
  const normalized = path.trim();
  if (!normalized) return "";

  const directMap: Record<string, string> = {
    email: "email",
    mobile_no: "mobile",
    customer_name: "customerName",
    customer_type_id: "customerType",
    gstin_no: "gstin",
    pan_no: "pan",
    tds_section_id: "tdsMasterId",
    account_number: "accountNumber",
    ifsc_code: "ifscCode",
    account_holder: "accountHolderName",
    bank_name: "bankName",
    branch_name: "branch",
    swift_code: "swiftCode",
    credit_limit: "creditLimit",
    credit_days: "creditDays",
    advance: "advancePercentage",
    payment_type: "paymentType",
    openingBalance: "openingBalance",
    balanceType: "balanceType",
    openingBalanceDate: "openingBalanceDate",
    registered_legal_name: "legalName",
    registered_gst_address: "gstAddress",
    branches: "branches",
  };

  if (directMap[normalized]) return directMap[normalized];

  const branchMatch =
    normalized.match(/^branches\[(\d+)\]\.(.+)$/) ??
    normalized.match(/^branches\.(\d+)\.(.+)$/);
  if (!branchMatch) return normalized;

  const branchIdx = Number.parseInt(branchMatch[1] ?? "", 10);
  const field = branchMatch[2] ?? "";
  if (!Number.isFinite(branchIdx) || branchIdx < 0) return normalized;

  if (field === "billing_address_line_1") return `branch_${branchIdx}_billingAddressLine1`;
  if (field === "billing_address_line_2") return `branch_${branchIdx}_billingAddressLine2`;
  if (field === "billing_city") return `branch_${branchIdx}_billingCity`;
  if (field === "billing_state") return `branch_${branchIdx}_billingState`;
  if (field === "billing_town") return `branch_${branchIdx}_billingTown`;
  if (field === "billing_pincode") return `branch_${branchIdx}_billingPincode`;
  if (field === "shipping_address_line_1") return `branch_${branchIdx}_shippingAddressLine1`;
  if (field === "shipping_address_line_2") return `branch_${branchIdx}_shippingAddressLine2`;
  if (field === "shipping_city") return `branch_${branchIdx}_shippingCity`;
  if (field === "shipping_state") return `branch_${branchIdx}_shippingState`;
  if (field === "shipping_town") return `branch_${branchIdx}_shippingTown`;
  if (field === "shipping_pincode") return `branch_${branchIdx}_shippingPincode`;
  if (field === "sales_man_id") return `branch_${branchIdx}_salesManId`;
  if (field === "branch_name") return `branch_${branchIdx}_branchName`;
  return `branch_${branchIdx}_${field}`;
}

/** Turn technical upload/API wording into a clear toast for the user. */
export function humanizeCustomerErrorMessage(raw: string): string {
  const message = String(raw ?? "").trim();
  if (!message) return "";

  if (
    /LIMIT_FILE_SIZE/i.test(message) ||
    /file too large/i.test(message) ||
    /maximum file size/i.test(message)
  ) {
    return "One of the branch documents is too large. Each file must be 25MB or smaller. Compress or replace the file, then try again.";
  }

  if (/LIMIT_FILE_COUNT|too many files/i.test(message)) {
    return "Too many documents were uploaded. Remove some branch documents (maximum 40 files), then try again.";
  }

  if (/invalid file type/i.test(message)) {
    return "That file type is not allowed. Upload a PDF, image (JPG/PNG/GIF), Word, Excel, or CSV file.";
  }

  if (/unexpected file field|unexpected field/i.test(message)) {
    return "A document could not be uploaded because of an unexpected file field. Remove and re-attach the documents, then try again.";
  }

  // Strip technical Multer/busboy noise if it leaks through.
  if (/busboy|multipart|MulterError/i.test(message)) {
    return "Document upload failed. Check each branch document (type and size up to 25MB), then try again.";
  }

  return message;
}

/**
 * Axios interceptor rejects a plain object `{ message, error, validation_errors }`,
 * while raw axios errors use `{ response: { data } }`. Support both shapes.
 */
export function extractCustomerApiError(
  err: unknown,
  fallback = "Failed to save customer.",
): CustomerApiErrorResult {
  const root = asRecord(err);
  const response = asRecord(root?.response);
  const data = asRecord(response?.data) ?? root;

  const validationErrors = Array.isArray(data?.validation_errors)
    ? (data.validation_errors as ApiValidationError[])
    : [];

  const fieldErrors: Record<string, string> = {};
  for (const item of validationErrors) {
    const key = mapCustomerApiPathToFieldKey(String(item.path ?? ""));
    const msg = humanizeCustomerErrorMessage(String(item.message ?? "").trim());
    if (key && msg) fieldErrors[key] = msg;
  }

  const rawToast =
    validationErrors[0]?.message?.trim() ||
    String(data?.message ?? "").trim() ||
    String(data?.error ?? "").trim() ||
    (err instanceof Error ? err.message.trim() : "") ||
    fallback;

  return {
    toastMessage: humanizeCustomerErrorMessage(rawToast) || fallback,
    fieldErrors,
  };
}
