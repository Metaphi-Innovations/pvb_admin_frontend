"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BillWiseOutstandingPageClient from "../../BillWiseOutstandingPageClient";

export default function BillWiseOutstandingPage() {
  const { id } = useParams<{ id: string }>();
  const ledgerId = Number(id);
  const [from, setFrom] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setFrom(new URLSearchParams(window.location.search).get("from"));
  }, []);

  if (!Number.isFinite(ledgerId)) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Invalid ledger.</p>
      </div>
    );
  }

  if (from === undefined) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return <BillWiseOutstandingPageClient ledgerId={ledgerId} from={from} />;
}
