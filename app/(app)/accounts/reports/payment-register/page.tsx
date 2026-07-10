import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const PaymentRegisterPageClient = lazyAccountsPage(() =>
  import("@/components/accounts/VoucherCashRegisterPageClient").then((m) => ({
    default: () => <m.default registerType="payment" />,
  })),
);

export default function PaymentRegisterReportPage() {
  return <PaymentRegisterPageClient />;
}
