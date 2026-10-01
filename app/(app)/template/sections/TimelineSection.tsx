import { Calendar, Check, AlertCircle, Clock } from "lucide-react";

export default function TimelineSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Activity Timeline</h3>
        <div className="relative">
          <div className="space-y-6">
            {[
              { time: "Today at 2:30 PM", event: "Order Approved", icon: Check, status: "complete" },
              { time: "Today at 1:15 PM", event: "Submitted for Review", icon: AlertCircle, status: "complete" },
              { time: "Today at 11:00 AM", event: "Order Created", icon: Calendar, status: "complete" },
              { time: "Pending", event: "Delivery Scheduled", icon: Clock, status: "pending" },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.status === "complete"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    {idx < 3 && <div className="w-0.5 h-12 bg-border mt-2" />}
                  </div>
                  <div className="pt-1.5">
                    <p className="text-sm font-semibold text-foreground">{item.event}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Timeline Pattern</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• Vertical timeline layout</p>
          <p>• Icons for event types</p>
          <p>• Timestamps for context</p>
          <p>• Status indicators (complete, pending)</p>
        </div>
      </div>
    </div>
  );
}
