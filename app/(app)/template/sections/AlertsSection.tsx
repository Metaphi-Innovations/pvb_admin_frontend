import { AlertCircle, Check, Info, AlertTriangle, Bell, X } from "lucide-react";

export default function AlertsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Alert Types</h3>
        <div className="space-y-3">
          {[
            {
              type: "Success",
              bg: "bg-emerald-50",
              border: "border-emerald-200",
              icon: Check,
              text: "text-emerald-800",
              msg: "Your changes have been saved successfully.",
            },
            {
              type: "Info",
              bg: "bg-info/10",
              border: "border-info/20",
              icon: Info,
              text: "text-info",
              msg: "Important information you should know.",
            },
            {
              type: "Warning",
              bg: "bg-amber-50",
              border: "border-amber-200",
              icon: AlertTriangle,
              text: "text-amber-800",
              msg: "Please review this warning before proceeding.",
            },
            {
              type: "Error",
              bg: "bg-red-50",
              border: "border-red-200",
              icon: AlertCircle,
              text: "text-red-800",
              msg: "An error occurred. Please try again.",
            },
          ].map((alert) => {
            const Icon = alert.icon;
            return (
              <div key={alert.type} className={`${alert.bg} border ${alert.border} rounded-lg p-4 flex items-start gap-3`}>
                <Icon className={`w-5 h-5 ${alert.text} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${alert.text}`}>{alert.type}</p>
                  <p className={`text-sm mt-1 ${alert.text.replace("800", "700")}`}>{alert.msg}</p>
                </div>
                <button className="flex-shrink-0 mt-0.5">
                  <X className={`w-4 h-4 ${alert.text}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Notifications</h3>
        <div className="space-y-3">
          {[
            { title: "Order Confirmed", time: "2 minutes ago", icon: Bell },
            { title: "New Message", time: "5 minutes ago", icon: Bell },
            { title: "Approval Needed", time: "30 minutes ago", icon: Bell },
          ].map((notif) => {
            const Icon = notif.icon;
            return (
              <div key={notif.title} className="bg-muted/20 border border-border rounded-lg p-3 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-100 border border-brand-200 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{notif.title}</p>
                  <p className="text-xs text-muted-foreground">{notif.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Alert Best Practices</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• Use semantic colors (success, warning, error, info)</p>
          <p>• Always include a close button for dismissible alerts</p>
          <p>• Keep messages clear and actionable</p>
          <p>• Use icons for quick visual recognition</p>
          <p>• Position alerts prominently for visibility</p>
        </div>
      </div>
    </div>
  );
}
