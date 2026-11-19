"use client";

import { useParams } from "next/navigation";
import ShiftFormPageClient from "../../ShiftFormPageClient";

export default function EditShiftPage() {
  const params = useParams();
  const raw = params?.id;
  const id = typeof raw === "string" ? Number(raw) : Number(Array.isArray(raw) ? raw[0] : NaN);
  return (
    <ShiftFormPageClient
      mode="edit"
      shiftId={Number.isFinite(id) ? id : undefined}
    />
  );
}
