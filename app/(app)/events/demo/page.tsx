"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Download,
  Eye,
  MoreVertical,
  Search,
  Users,
} from "lucide-react";

import { type DemoRecord, SEED, VIEW_DEMO_STORAGE_KEY } from "./demo-data";

const PER_PAGE = 10;

function formatList(values: string[]) {
  return values.join(", ");
}

export default function DemoPage() {
  const router = useRouter();
  const [records] = useState<DemoRecord[]>(SEED);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;

    return records.filter((record) =>
      [
        record.demoCode,
        record.demoTopic,
        record.demoMethod,
        record.demonstratorName,
        record.demonstratorContact,
        ...record.productCategory,
        ...record.productsDemonstrated,
        ...record.cropFocus,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [records, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const start = (page - 1) * PER_PAGE;
  const visibleRecords = filtered.slice(start, start + PER_PAGE);

  const stats = useMemo(
    () => ({
      totalDemos: records.length,
      totalFarmersAttended: records.reduce((sum, record) => sum + record.totalFarmersAttended, 0),
      totalDistributorsAttended: records.reduce(
        (sum, record) => sum + record.totalDistributorsAttended,
        0,
      ),
      avgSuccessRating:
        records.length === 0
          ? 0
          : Number(
              (
                records.reduce((sum, record) => sum + record.eventSuccessRating, 0) / records.length
              ).toFixed(1),
            ),
    }),
    [records],
  );

  const handleViewRecord = (record: DemoRecord) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(VIEW_DEMO_STORAGE_KEY, String(record.id));
    }
    router.push("/events/demo/view");
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Demo</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              View demonstration topics, crop focus, and feedback outcomes
            </p>
          </div>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Demos", value: stats.totalDemos },
            { label: "Farmers Attended", value: stats.totalFarmersAttended },
            { label: "Distributors Attended", value: stats.totalDistributorsAttended },
            { label: "Avg Success Rating", value: stats.avgSuccessRating },
          ].map((card) => (
            <div key={card.label} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50">
                <Users className="h-4 w-4 text-brand-600" />
              </div>
              <div>
                <p className="text-base font-bold leading-none text-foreground">{card.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-[9px] h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search demos..."
              className="h-8 w-full rounded-lg border border-border bg-white pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Demo Topic</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Product Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Products Demonstrated</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Crop Focus</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Demo Method</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Demonstrator Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Demonstrator Contact</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-foreground whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No demos match your search</p>
                        <p className="text-xs text-muted-foreground">Try adjusting the search term</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleRecords.map((record) => (
                    <tr key={record.id} className="group border-b border-border/60 transition-colors hover:bg-muted/20">
                      <td className="px-4 py-2 text-xs font-semibold text-foreground whitespace-nowrap">{record.demoTopic}</td>
                      <td className="px-4 py-2 text-xs text-foreground max-w-[180px] truncate">{formatList(record.productCategory)}</td>
                      <td className="px-4 py-2 text-xs text-foreground max-w-[220px] truncate">{formatList(record.productsDemonstrated)}</td>
                      <td className="px-4 py-2 text-xs text-foreground max-w-[160px] truncate">{formatList(record.cropFocus)}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{record.demoMethod}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{record.demonstratorName}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{record.demonstratorContact}</td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        <div className="relative flex justify-center">
                          <button
                            type="button"
                            onClick={() => setOpenMenu(openMenu === record.id ? null : record.id)}
                            className="rounded-md p-1.5 transition-colors hover:bg-muted"
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </button>
                          {openMenu === record.id && (
                            <div className="absolute right-0 top-7 z-50 w-40 rounded-xl border border-border bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  handleViewRecord(record);
                                  setOpenMenu(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted"
                              >
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" /> View
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3">
            <p className="text-[11px] text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {visibleRecords.length === 0 ? 0 : Math.min(start + visibleRecords.length, filtered.length)}
              </span>{" "}
              of <span className="font-medium text-foreground">{filtered.length}</span> records
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={page === totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
