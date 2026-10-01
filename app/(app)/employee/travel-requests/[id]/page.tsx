"use client";

import { useParams } from "next/navigation";
import TravelRequestDetailClient from "../TravelRequestDetailClient";

export default function TravelRequestDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  return <TravelRequestDetailClient id={id} />;
}
