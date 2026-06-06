"use client";
import { createLazyClientPage } from "@/lib/createLazyClientPage";
export default createLazyClientPage(() => import("../../../debit-notes/DebitNoteCreatePageClient"));
