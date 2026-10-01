"use client";

import OffboardingPageClient from "./OffboardingPageClient";

/** Direct mount — avoids Soft Nav stall during demo. */
export default function OffboardingPage() {
  return <OffboardingPageClient />;
}
