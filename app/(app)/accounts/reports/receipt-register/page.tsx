import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const ReceiptRegisterPageClient = lazyAccountsPage(() =>
  import("@/components/accounts/VoucherCashRegisterPageClient").then((m) => ({
    default: () => <m.default registerType="receipt" />,
  })),
);

export default function ReceiptRegisterReportPage() {
  return <ReceiptRegisterPageClient />;
}
