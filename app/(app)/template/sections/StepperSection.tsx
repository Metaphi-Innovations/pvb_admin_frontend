import { Check } from "lucide-react";

export default function StepperSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Order Form Stepper</h3>
        <div className="bg-white border border-border rounded-card p-6 shadow-card">
          <div className="flex items-center justify-between mb-8">
            {[
              { step: 1, title: "Basic Info", status: "complete" },
              { step: 2, title: "Items", status: "active" },
              { step: 3, title: "Shipping", status: "pending" },
              { step: 4, title: "Review", status: "pending" },
            ].map((item, idx) => (
              <div key={item.step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                      item.status === "complete"
                        ? "bg-emerald-100 text-emerald-700"
                        : item.status === "active"
                        ? "bg-brand-100 text-brand-700 border-2 border-brand-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.status === "complete" ? <Check className="w-5 h-5" /> : item.step}
                  </div>
                  <p className="text-xs font-semibold text-foreground mt-2 text-center">{item.title}</p>
                </div>
                {idx < 3 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      item.status === "complete" ? "bg-emerald-500" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="bg-muted/20 rounded-lg p-4">
            <p className="text-sm font-semibold text-foreground">Select Items</p>
            <p className="text-xs text-muted-foreground mt-1">Choose products and quantities</p>
          </div>
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Stepper States</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• Completed steps (green with checkmark)</p>
          <p>• Active step (highlighted border)</p>
          <p>• Pending steps (grayed out)</p>
          <p>• Progress lines between steps</p>
        </div>
      </div>
    </div>
  );
}
