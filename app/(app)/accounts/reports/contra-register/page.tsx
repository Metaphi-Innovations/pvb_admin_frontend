import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const ContraRegisterPageClient = lazyAccountsPage(() =>
  import("@/components/accounts/VoucherCashRegisterPageClient").then((m) => ({
    default: () => <m.default registerType="contra" />,
  })),
);

export default function ContraRegisterReportPage() {
  return <ContraRegisterPageClient />;
}
