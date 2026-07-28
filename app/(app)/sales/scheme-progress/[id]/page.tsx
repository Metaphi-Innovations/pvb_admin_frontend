"use client";

import SchemeProgressDetailClient from "./SchemeProgressDetailClient";

type PageProps = { params: { id: string } };

export default function SchemeProgressDetailPage({ params }: PageProps) {
  return <SchemeProgressDetailClient id={decodeURIComponent(params.id)} />;
}
