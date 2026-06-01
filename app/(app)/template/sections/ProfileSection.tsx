import { User, Mail, Phone, MapPin, LogOut, Settings } from "lucide-react";

export default function ProfileSection() {
  return (
    <div className="space-y-6">
      <div className="max-w-md">
        <h3 className="text-sm font-semibold text-foreground mb-4">User Profile Card</h3>
        <div className="bg-white border border-border rounded-card p-6 shadow-card">
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Rajesh Kumar</p>
              <span className="inline-block text-xs bg-brand-50 text-brand-700 border border-brand-200 rounded px-2 py-0.5 mt-1">
                Territory Manager
              </span>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-foreground">rajesh@dharitrisutra.com</p>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-foreground">+91 98765 43210</p>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-foreground">Nashik, Maharashtra</p>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-border">
            <button className="flex-1 text-xs font-medium px-3 py-2 flex items-center justify-center gap-1.5 hover:bg-muted rounded transition-colors">
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button className="flex-1 text-xs font-medium px-3 py-2 flex items-center justify-center gap-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Profile Components</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• User avatar with initials</p>
          <p>• Name and role badge</p>
          <p>• Contact information</p>
          <p>• Activity status indicator</p>
          <p>• Quick action buttons</p>
        </div>
      </div>
    </div>
  );
}
