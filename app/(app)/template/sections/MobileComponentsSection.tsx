import { Menu, Home, ShoppingBag, BarChart3, User } from "lucide-react";

export default function MobileComponentsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Mobile Layout</h3>
        <div className="max-w-sm border-2 border-foreground rounded-2xl overflow-hidden bg-white">
          {/* Mobile Header */}
          <div className="bg-white border-b border-border px-4 py-3 flex items-center justify-between">
            <Menu className="w-5 h-5" />
            <p className="text-sm font-semibold">Dashboard</p>
            <div className="w-5" />
          </div>

          {/* Mobile Content */}
          <div className="p-4 space-y-4 h-64 overflow-y-auto">
            <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-brand-700">Total Sales</p>
              <p className="text-2xl font-bold text-brand-600 mt-1">₹48.2L</p>
            </div>
            <div className="bg-muted/20 border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-foreground">Pending Orders</p>
              <p className="text-lg font-semibold text-foreground mt-1">87</p>
            </div>
          </div>

          {/* Mobile Bottom Navigation */}
          <div className="border-t border-border bg-white px-2 py-2 flex items-center justify-around">
            {[
              { icon: Home, label: "Home", active: true },
              { icon: ShoppingBag, label: "Orders" },
              { icon: BarChart3, label: "Analytics" },
              { icon: User, label: "Profile" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded ${
                    item.active ? "text-brand-600" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Mobile Patterns</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• Responsive card layouts</p>
          <p>• Bottom navigation tabs</p>
          <p>• Touch-friendly buttons</p>
          <p>• Vertical scrolling content</p>
          <p>• Minimal padding on small screens</p>
        </div>
      </div>
    </div>
  );
}
