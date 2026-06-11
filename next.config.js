/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /** Tree-shake large icon/UI packages (smaller dev + prod bundles). */
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-popover",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-tabs",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-scroll-area",
    ],
  },

  async redirects() {
    return [
      {
        source: "/",
        destination: "/login",
        permanent: false,
      },
      { source: "/hr/masters/tada-policy", destination: "/hr/sales-force-policy", permanent: false },
      { source: "/hr/masters/monthly-target", destination: "/hr/sales-force-policy", permanent: false },
      { source: "/hr/tada-config", destination: "/hr/sales-force-policy", permanent: false },
      { source: "/hr/attendance/sync", destination: "/hr/attendance", permanent: false },
      { source: "/hr/attendance/reports", destination: "/hr/attendance", permanent: false },
      { source: "/accounts/transactions/sales", destination: "/accounts/transactions/invoices", permanent: false },
      { source: "/accounts/transactions/sales-return", destination: "/accounts/transactions/credit-notes", permanent: false },
      { source: "/accounts/transactions/purchase-return", destination: "/accounts/transactions/debit-notes", permanent: false },
      { source: "/accounts/transactions/payment", destination: "/accounts/transactions/payments", permanent: false },
      { source: "/accounts/transactions/bank-reconciliation", destination: "/accounts/transactions/reconciliation", permanent: false },
      { source: "/accounts/ledger", destination: "/accounts/masters/ledgers", permanent: false },
      { source: "/accounts/outstanding", destination: "/accounts/reports/trial-balance", permanent: false },
    ];
  },
};

module.exports = nextConfig;
