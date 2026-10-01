"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RecordDetailPage } from "@/components/record-detail";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Star, User } from "lucide-react";
import { type DemoRecord, SEED, VIEW_DEMO_STORAGE_KEY } from "../demo-data";

function formatList(values: string[]) {
  return values.join(", ");
}

function formatDecimal(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function BooleanPill({ value }: { value: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        value ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
      )}
    >
      {value ? "Yes" : "No"}
    </span>
  );
}

function RatingPill({ value }: { value: number }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
      <span>{value}/5</span>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            className={cn(
              "h-3 w-3",
              index < value ? "fill-amber-500 text-amber-500" : "text-slate-300",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function InfoField({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <div className="min-h-[36px] rounded-lg border border-border bg-white px-3 py-2 text-xs text-foreground shadow-sm">
        {value}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="space-y-4 px-4 py-4">{children}</div>
    </section>
  );
}

export default function DemoViewPage() {
  const router = useRouter();
  const [records] = useState<DemoRecord[]>(SEED);
  const [viewRecord, setViewRecord] = useState<DemoRecord | null>(null);

  useEffect(() => {
    let selectedRecord: DemoRecord | undefined;
    if (typeof window !== "undefined") {
      const selectedId = window.sessionStorage.getItem(VIEW_DEMO_STORAGE_KEY);
      selectedRecord = records.find((record) => String(record.id) === selectedId);
    }

    setViewRecord(selectedRecord ?? records[0] ?? null);
  }, [records]);

  const currentRecordIndex = useMemo(
    () => (viewRecord ? records.findIndex((record) => record.id === viewRecord.id) : -1),
    [records, viewRecord],
  );

  const handleStepViewRecord = (direction: -1 | 1) => {
    if (currentRecordIndex < 0) return;

    const nextRecord = records[currentRecordIndex + direction];
    if (!nextRecord) return;

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(VIEW_DEMO_STORAGE_KEY, String(nextRecord.id));
    }
    setViewRecord(nextRecord);
    router.push("/events/demo/view");
  };

  const handleCloseView = () => {
    router.push("/events/demo");
  };

  if (!viewRecord) {
    return (
      <RecordDetailPage
        listHref="/events/demo"
        listLabel="Demos"
        recordName="Demo Details"
        statusLabel="Loading"
        statusVariant="neutral"
      >
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Loading demo...</div>
      </RecordDetailPage>
    );
  }

  return (
    <RecordDetailPage
      listHref="/events/demo"
      listLabel="Demos"
      recordName={viewRecord.demoTopic}
      recordCode={viewRecord.demoCode}
      statusLabel="Completed"
      statusVariant="active"
      metaItems={[
        { icon: User, label: viewRecord.demonstratorName },
        { label: viewRecord.demoMethod },
      ]}
      headerActions={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous demo"
            disabled={currentRecordIndex <= 0}
            onClick={() => handleStepViewRecord(-1)}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted",
              currentRecordIndex <= 0 ? "cursor-not-allowed opacity-40" : "hover:text-foreground",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next demo"
            disabled={currentRecordIndex < 0 || currentRecordIndex >= records.length - 1}
            onClick={() => handleStepViewRecord(1)}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted",
              currentRecordIndex < 0 || currentRecordIndex >= records.length - 1
                ? "cursor-not-allowed opacity-40"
                : "hover:text-foreground",
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      }
      sidebar={{
        summary: [
          { label: "Farmers Attended", value: viewRecord.totalFarmersAttended, highlight: true },
          { label: "Farmers Invited", value: viewRecord.totalFarmersInvited },
          { label: "Distributors Attended", value: viewRecord.totalDistributorsAttended },
          { label: "Leads Generated", value: viewRecord.leadsGenerated },
          { label: "Event Rating", value: `${viewRecord.eventSuccessRating}/5` },
        ],
        quickActions: [
          {
            label: "Back to List",
            onClick: handleCloseView,
            variant: "outline",
          },
        ],
      }}
    >
      <>
            <SectionCard title="Demo Information">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <InfoField label="Demo Topic" value={viewRecord.demoTopic} />
                <InfoField label="Demo Method" value={viewRecord.demoMethod} />
                <InfoField label="Product Category" value={formatList(viewRecord.productCategory)} />
                <InfoField label="Products Demonstrated" value={formatList(viewRecord.productsDemonstrated)} />
                <InfoField label="Crop Focus" value={formatList(viewRecord.cropFocus)} />
                <InfoField label="Demonstrator Name" value={viewRecord.demonstratorName} />
                <InfoField label="Demonstrator Contact" value={viewRecord.demonstratorContact} />
                <InfoField label="Demo Objective" value={viewRecord.demoObjective} className="lg:col-span-2" />
              </div>
            </SectionCard>

            <SectionCard title="Attendance">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <InfoField label="Total Farmers Invited" value={viewRecord.totalFarmersInvited} />
                <InfoField label="Total Farmers Attended" value={viewRecord.totalFarmersAttended} />
                <InfoField label="Total Distributors Invited" value={viewRecord.totalDistributorsInvited} />
                <InfoField label="Total Distributors Attended" value={viewRecord.totalDistributorsAttended} />
                <InfoField label="Other Attendees" value={viewRecord.otherAttendees} />
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">Attendee List</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground">Name</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground">Type</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewRecord.attendeeList.map((attendee) => (
                        <tr key={attendee.id} className="border-b border-border/60">
                          <td className="px-4 py-2 text-xs text-foreground">{attendee.name}</td>
                          <td className="px-4 py-2 text-xs text-foreground">{attendee.type}</td>
                          <td className="px-4 py-2 text-xs text-foreground">{attendee.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Farmer Feedback">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <InfoField label="Interested in Product" value={<BooleanPill value={viewRecord.interestedInProduct} />} />
                <InfoField label="Feedback Rating" value={<RatingPill value={viewRecord.feedbackRating} />} />
                <InfoField label="Purchase Intent" value={viewRecord.purchaseIntent} />
                <InfoField label="Follow-up Required" value={<BooleanPill value={viewRecord.followUpRequired} />} />
                <InfoField label="Feedback Comments" value={viewRecord.feedbackComments} className="lg:col-span-2" />
              </div>
            </SectionCard>

            <SectionCard title="Distributor Feedback">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <InfoField label="Distributor Name" value={viewRecord.distributorFeedback.distributorName} />
                <InfoField
                  label="Product Interest Level"
                  value={<RatingPill value={viewRecord.distributorFeedback.productInterestLevel} />}
                />
                <InfoField
                  label="Order Potential"
                  value={formatDecimal(viewRecord.distributorFeedback.orderPotential)}
                />
                <InfoField
                  label="Comments"
                  value={viewRecord.distributorFeedback.comments}
                  className="lg:col-span-2"
                />
              </div>
            </SectionCard>

            <SectionCard title="Outcome Summary">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoField label="Leads Generated" value={viewRecord.leadsGenerated} />
                <InfoField label="Sample Requests" value={viewRecord.sampleRequests} />
                <InfoField label="Trial Requests" value={viewRecord.trialRequests} />
                <InfoField label="Orders Received" value={formatDecimal(viewRecord.ordersReceived)} />
                <InfoField label="Follow-up Visits Planned" value={viewRecord.followUpVisitsPlanned} />
                <InfoField label="Event Success Rating" value={<RatingPill value={viewRecord.eventSuccessRating} />} />
              </div>
            </SectionCard>
          </>
    </RecordDetailPage>
  );
}
