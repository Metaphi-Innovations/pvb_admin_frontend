"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import {
  HR_TRAVEL_CLAIMS_EVENT,
  loadClaimActor,
  salesForceEmployees,
  setClaimActor,
} from "./travel-claim-data";

export function EmployeeClaimsShell({
  title,
  subtitle,
  backHref,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [actor, setActor] = useState<HrEmployee | null>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const people = typeof window === "undefined" ? [] : salesForceEmployees();
  const onTravel = pathname.startsWith("/employee/travel-requests");
  const onClaims = pathname.startsWith("/employee/claims");

  useEffect(() => {
    const sync = () => setActor(loadClaimActor());
    sync();
    window.addEventListener(HR_TRAVEL_CLAIMS_EVENT, sync);
    return () => window.removeEventListener(HR_TRAVEL_CLAIMS_EVENT, sync);
  }, []);

  return (
    <div className="mx-auto w-full max-w-md min-h-[calc(100vh-104px)] bg-muted/30 flex flex-col">
      <header className="sticky top-0 z-20 bg-white border-b border-border px-4 py-3 space-y-2">
        <div className="flex items-start gap-2">
          {backHref ? (
            <Link
              href={backHref}
              className="mt-0.5 p-2 -ml-2 rounded-[10px] hover:bg-muted min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-navy-700" />
            </Link>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-navy-700 leading-tight">{title}</h1>
            {subtitle ? <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p> : null}
          </div>
        </div>
        {actor ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="w-full h-10 px-3 rounded-[10px] border border-border bg-muted/30 flex items-center justify-between text-left"
            >
              <span className="min-w-0">
                <span className="block text-xs font-semibold truncate">{actor.employeeName}</span>
                <span className="block text-[10px] text-muted-foreground truncate">
                  {actor.designation} · {actor.employeeCode}
                </span>
              </span>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground", open && "rotate-180")} />
            </button>
            {open ? (
              <div className="absolute left-0 right-0 mt-1 rounded-[12px] border border-border bg-white shadow-lg z-30 max-h-56 overflow-y-auto">
                {people.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setClaimActor(p.id);
                      setActor(p);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 hover:bg-muted/50",
                      p.id === actor.id && "bg-brand-50",
                    )}
                  >
                    <p className="text-xs font-semibold">{p.employeeName}</p>
                    <p className="text-[10px] text-muted-foreground">{p.designation}</p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {onTravel || onClaims ? (
          <div className="flex gap-1 p-0.5 rounded-[10px] border border-border bg-muted/30">
            <Link
              href="/employee/travel-requests"
              className={cn(
                "flex-1 h-8 text-[11px] font-semibold rounded-md inline-flex items-center justify-center",
                onTravel ? "bg-white text-navy-700 shadow-sm" : "text-muted-foreground",
              )}
            >
              Travel Requests
            </Link>
            <Link
              href="/employee/claims"
              className={cn(
                "flex-1 h-8 text-[11px] font-semibold rounded-md inline-flex items-center justify-center",
                onClaims ? "bg-white text-navy-700 shadow-sm" : "text-muted-foreground",
              )}
            >
              Claims
            </Link>
          </div>
        ) : null}
      </header>
      <div className={cn("flex-1 px-4 py-4 space-y-3", footer && "pb-28")}>{children}</div>
      {footer ? (
        <div className="sticky bottom-0 z-20 border-t border-border bg-white/95 backdrop-blur px-4 py-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
