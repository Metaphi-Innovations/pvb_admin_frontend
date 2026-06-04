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
      { source: "/hr/masters/tada-policy", destination: "/hr/tada-config", permanent: false },
      { source: "/hr/masters/monthly-target", destination: "/hr/tada-config", permanent: false },
      { source: "/hr/attendance/sync", destination: "/hr/attendance", permanent: false },
      { source: "/hr/attendance/reports", destination: "/hr/attendance", permanent: false },
    ];
  },
};

module.exports = nextConfig;
