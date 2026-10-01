import { Home, ShoppingBag, Users, BarChart3, Settings, ChevronRight } from "lucide-react";

export default function SidebarSection() {
  const menuItems = [
    { label: "Dashboard", icon: Home, active: true },
    { label: "Orders", icon: ShoppingBag },
    { label: "Farmers", icon: Users },
    { label: "Analytics", icon: BarChart3 },
    { label: "Settings", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="w-64 bg-white border-r border-border rounded-card shadow-card overflow-hidden">
          <div className="p-6 border-b border-border">
            <p className="text-sm font-bold text-brand-600">Menu</p>
          </div>
          <nav className="p-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                    item.active
                      ? "bg-brand-50 text-brand-700 font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm flex-1">{item.label}</span>
                  {item.active && <ChevronRight className="w-4 h-4" />}
                </div>
              );
            })}
          </nav>
        </div>
        <div className="flex-1" />
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Sidebar Features</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• Collapsible navigation menu</p>
          <p>• Active state indication</p>
          <p>• Icons for quick recognition</p>
          <p>• Nested submenu support</p>
          <p>• Responsive behavior on mobile</p>
        </div>
      </div>
    </div>
  );
}
