"use client";

import { createLazyClientPage } from "@/lib/createLazyClientPage";

export default createLazyClientPage(() => import("../../payments/PaymentsPageClient"));
