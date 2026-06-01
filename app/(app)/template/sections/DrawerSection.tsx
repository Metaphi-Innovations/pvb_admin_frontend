import { X } from "lucide-react";

export default function DrawerSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Side Drawer</h3>
        <div className="flex gap-4">
          <div className="flex-1 bg-muted/20 rounded-lg h-64" />
          <div className="w-64 bg-white border-l border-border shadow-lg overflow-hidden rounded-lg flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Order Details</p>
              <button className="p-1 hover:bg-muted rounded">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Order ID</p>
                <p className="text-sm font-semibold text-foreground mt-1">PO #2341</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Amount</p>
                <p className="text-sm font-semibold text-foreground mt-1">₹4.2L</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Status</p>
                <span className="inline-block text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-1 mt-1">
                  Pending
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-border flex gap-2">
              <button className="flex-1 text-xs px-3 py-2 border border-border rounded hover:bg-muted">
                Cancel
              </button>
              <button className="flex-1 text-xs px-3 py-2 bg-brand-600 text-white rounded hover:bg-brand-700">
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Drawer Patterns</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• Slides in from side (right or left)</p>
          <p>• Close button in header</p>
          <p>• Overlay on content</p>
          <p>• Content areas: header, body, footer</p>
        </div>
      </div>
    </div>
  );
}
