import React from "react";
import {
  Check, AlertCircle, Info, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Search, Settings, Bell, User, LogOut, Home, BarChart3, FileText, Plus, Trash2,
  Edit, Eye, EyeOff, Download, Upload, Filter, ArrowUpDown, Grid, List, Calendar,
  Clock, MapPin, Phone, Mail, Package, Truck, CheckCircle2, AlertTriangle,
  Zap, DollarSign, Users, Wheat, TrendingUp, Menu, MoreVertical,
} from "lucide-react";

export default function IconsSection() {
  const iconGroups = {
    actions: [
      { icon: Plus, name: "Plus", use: "Create, add new" },
      { icon: Edit, name: "Edit", use: "Edit content" },
      { icon: Trash2, name: "Trash2", use: "Delete" },
      { icon: Download, name: "Download", use: "Download file" },
      { icon: Upload, name: "Upload", use: "Upload file" },
      { icon: Search, name: "Search", use: "Search" },
      { icon: Filter, name: "Filter", use: "Filter data" },
      { icon: ArrowUpDown, name: "ArrowUpDown", use: "Sort data" },
    ],
    status: [
      { icon: Check, name: "Check", use: "Success, confirmed" },
      { icon: CheckCircle2, name: "CheckCircle2", use: "Completed" },
      { icon: AlertCircle, name: "AlertCircle", use: "Warning, caution" },
      { icon: AlertTriangle, name: "AlertTriangle", use: "Error, alert" },
      { icon: Info, name: "Info", use: "Information" },
      { icon: X, name: "X", use: "Close, cancel" },
      { icon: Eye, name: "Eye", use: "View, visibility" },
      { icon: EyeOff, name: "EyeOff", use: "Hidden" },
    ],
    navigation: [
      { icon: Home, name: "Home", use: "Home, dashboard" },
      { icon: Menu, name: "Menu", use: "Toggle menu" },
      { icon: ChevronUp, name: "ChevronUp", use: "Collapse up" },
      { icon: ChevronDown, name: "ChevronDown", use: "Expand down" },
      { icon: ChevronLeft, name: "ChevronLeft", use: "Previous" },
      { icon: ChevronRight, name: "ChevronRight", use: "Next" },
      { icon: MoreVertical, name: "MoreVertical", use: "More options" },
    ],
    business: [
      { icon: DollarSign, name: "DollarSign", use: "Sales, money" },
      { icon: Package, name: "Package", use: "Products, inventory" },
      { icon: Truck, name: "Truck", use: "Delivery, shipping" },
      { icon: Wheat, name: "Wheat", use: "Agriculture, crops" },
      { icon: Users, name: "Users", use: "People, team" },
      { icon: TrendingUp, name: "TrendingUp", use: "Growth, analytics" },
      { icon: BarChart3, name: "BarChart3", use: "Analytics, reports" },
      { icon: FileText, name: "FileText", use: "Documents" },
    ],
    ui: [
      { icon: Settings, name: "Settings", use: "Preferences, config" },
      { icon: Bell, name: "Bell", use: "Notifications" },
      { icon: User, name: "User", use: "Profile, account" },
      { icon: LogOut, name: "LogOut", use: "Logout, exit" },
      { icon: Calendar, name: "Calendar", use: "Dates, scheduling" },
      { icon: Clock, name: "Clock", use: "Time, duration" },
      { icon: MapPin, name: "MapPin", use: "Location" },
      { icon: Grid, name: "Grid", use: "Grid view" },
    ],
  };

  return (
    <div className="space-y-8">
      {Object.entries(iconGroups).map(([group, icons]) => (
        <div key={group}>
          <h3 className="text-sm font-semibold text-foreground mb-4 capitalize">
            {group.replace(/([A-Z])/g, " $1").trim()} Icons
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {icons.map(({ icon: Icon, name, use }) => (
              <div key={name} className="bg-muted/20 border border-border rounded-lg p-4 hover:bg-muted/40 transition-colors">
                <div className="flex justify-center mb-3">
                  <Icon className="w-8 h-8 text-brand-600" />
                </div>
                <p className="text-xs font-semibold text-foreground text-center truncate">{name}</p>
                <p className="text-xs text-muted-foreground text-center mt-1">{use}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Icon Library</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• All icons from Lucide Icons library</p>
          <p>• Standard sizes: w-4, w-5, w-6 for UI; w-8, w-10 for display</p>
          <p>• Use semantic colors: text-brand-600 for primary, text-success/warning/error for status</p>
          <p>• Always include aria-label for accessibility</p>
        </div>
      </div>
    </div>
  );
}
