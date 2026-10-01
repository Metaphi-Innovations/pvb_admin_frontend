const VOUCHER_FORM_TOAST_KEY = "ds-voucher-form-toast";

export function stashVoucherFormToast(message: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(VOUCHER_FORM_TOAST_KEY, message);
}

export function consumeVoucherFormToast(): string | null {
  if (typeof window === "undefined") return null;
  const message = sessionStorage.getItem(VOUCHER_FORM_TOAST_KEY);
  if (message) sessionStorage.removeItem(VOUCHER_FORM_TOAST_KEY);
  return message;
}
