"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Star, Download, Search, ThumbsUp, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Feedback {
  id: number;
  eventCode: string;
  eventTitle: string;
  farmerName: string;
  village: string;
  contentRating: number;
  trainerRating: number;
  overallRating: number;
  comments: string;
  wouldRecommend: boolean;
  submittedOn: string;
}

const SEED: Feedback[] = [
  { id: 1, eventCode: "EVT-001", eventTitle: "BioGrow Crop Care Training", farmerName: "Ramesh Patel", village: "Navapura", contentRating: 5, trainerRating: 5, overallRating: 5, comments: "Very informative session. Learned a lot about new crop protection methods.", wouldRecommend: true, submittedOn: "2024-01-25" },
  { id: 2, eventCode: "EVT-001", eventTitle: "BioGrow Crop Care Training", farmerName: "Prakash Rao", village: "Tandur", contentRating: 4, trainerRating: 5, overallRating: 4, comments: "Good training but would like more practical demonstrations.", wouldRecommend: true, submittedOn: "2024-01-25" },
  { id: 3, eventCode: "EVT-001", eventTitle: "BioGrow Crop Care Training", farmerName: "Suresh Kumar", village: "Kheralu", contentRating: 3, trainerRating: 4, overallRating: 3, comments: "Content was good but timing could be better. Started late.", wouldRecommend: false, submittedOn: "2024-01-25" },
  { id: 4, eventCode: "EVT-002", eventTitle: "New Pesticide Product Demo", farmerName: "Haridas Patil", village: "Mohol", contentRating: 5, trainerRating: 4, overallRating: 5, comments: "Excellent product demo. The new spray is very effective on cotton.", wouldRecommend: true, submittedOn: "2024-01-28" },
  { id: 5, eventCode: "EVT-002", eventTitle: "New Pesticide Product Demo", farmerName: "Gopal Nair", village: "Kuttanad", contentRating: 4, trainerRating: 4, overallRating: 4, comments: "Good demonstration. Would like to see more regional crops covered.", wouldRecommend: true, submittedOn: "2024-01-28" },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={cn("w-3 h-3", i <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30")} />
      ))}
      <span className="ml-1 text-[11px] font-semibold text-foreground">{rating}</span>
    </div>
  );
}

export default function FeedbackPage() {
  const [feedbacks] = useState<Feedback[]>(SEED);
  const [search, setSearch] = useState("");

  const filtered = feedbacks.filter(f => {
    const q = search.toLowerCase();
    return !q || f.farmerName.toLowerCase().includes(q) || f.eventCode.toLowerCase().includes(q);
  });

  const avgRating = (feedbacks.reduce((s, f) => s + f.overallRating, 0) / feedbacks.length).toFixed(1);
  const wouldRecommend = feedbacks.filter(f => f.wouldRecommend).length;

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Event Feedback</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Attendee ratings and comments</p>
          </div>
          <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Responses", value: feedbacks.length, icon: MessageSquare, accent: true },
            { label: "Avg Rating", value: `${avgRating} / 5`, icon: Star },
            { label: "Would Recommend", value: `${wouldRecommend} / ${feedbacks.length}`, icon: ThumbsUp },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", accent ? "bg-brand-600" : "bg-muted")}>
                <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
              </div>
              <div>
                <p className="text-base font-bold text-foreground leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search feedback…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map(f => (
            <div key={f.id} className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs font-semibold text-brand-700">{f.eventCode}</span>
                    <span className="text-xs text-muted-foreground">{f.eventTitle}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{f.farmerName}</p>
                  <p className="text-[11px] text-muted-foreground">{f.village} · {f.submittedOn}</p>
                </div>
                <div className="text-right">
                  <StarRating rating={f.overallRating} />
                  {f.wouldRecommend && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 mt-1 justify-end">
                      <ThumbsUp className="w-3 h-3" /> Recommends
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Content Quality</p>
                  <StarRating rating={f.contentRating} />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Trainer/Presenter</p>
                  <StarRating rating={f.trainerRating} />
                </div>
              </div>
              {f.comments && (
                <div className="bg-muted/20 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-muted-foreground italic">"{f.comments}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
