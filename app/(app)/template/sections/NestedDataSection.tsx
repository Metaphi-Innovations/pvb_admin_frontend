import { ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function NestedDataSection() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Expandable Rows</h3>
        <div className="bg-white border border-border rounded-card shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-foreground">Order</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-foreground">Amount</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2].map((id) => (
                <div key={id}>
                  <tr
                    className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => setExpanded(expanded === id ? null : id)}
                  >
                    <td className="px-4 py-3 flex items-center gap-2">
                      {expanded === id ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <span className="font-medium text-foreground">PO #{2341 + id}</span>
                    </td>
                    <td className="px-4 py-3 text-foreground">₹{4.2 + id}L</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">Pending</span>
                    </td>
                  </tr>
                  {expanded === id && (
                    <tr className="bg-muted/10 border-b border-border">
                      <td colSpan={3} className="px-8 py-4">
                        <div className="space-y-2 text-xs">
                          <p><span className="text-muted-foreground">Items:</span> Urea 50kg × 10 bags</p>
                          <p><span className="text-muted-foreground">From:</span> Nashik Warehouse</p>
                          <p><span className="text-muted-foreground">Delivery:</span> May 25, 2024</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </div>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Nested Comments</h3>
        <div className="space-y-3">
          <div className="bg-white border border-border rounded-lg p-4">
            <div className="flex gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-brand-100" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground">Rajesh Kumar</p>
                <p className="text-xs text-muted-foreground">Please review the quantity</p>
              </div>
            </div>
            <div className="ml-11 space-y-2">
              <div className="bg-muted/20 border border-border rounded p-2">
                <div className="flex gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-sage-100" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Priya Desai</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Quantity looks good!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Nested Data Patterns</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• Expandable/collapsible rows</p>
          <p>• Nested tree structures</p>
          <p>• Threaded comments</p>
          <p>• Hierarchical data display</p>
        </div>
      </div>
    </div>
  );
}
