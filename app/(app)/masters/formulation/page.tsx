"use client";

"use client";

import { createLazyClientPage } from "@/lib/createLazyClientPage";

export default createLazyClientPage(() => import("./FormulationPageClient"));
