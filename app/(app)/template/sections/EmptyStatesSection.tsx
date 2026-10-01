import { AlertCircle, ShoppingBag, FileText, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmptyStatesSection() {
  const emptyStates = [
    {
      title: "No Orders",
      desc: "You haven't created any orders yet.",
      icon: ShoppingBag,
      action: "Create Order",
    },
    {
      title: "No Data",
      desc: "No results match your search criteria.",
      icon: AlertCircle,
      action: "Clear Filters",
    },
    {
      title: "No Documents",
      desc: "Upload documents to get started.",
      icon: FileText,
      action: "Upload File",
    },
    {
      title: "No Inventory",
      desc: "Your inventory is empty.",
      icon: Package,
      action: "Add Product",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Empty State Variations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emptyStates.map(({ title, desc, icon: Icon, action }) => (
            <div key={title} className="bg-muted/20 border border-border rounded-card p-8 flex flex-col items-center justify-center text-center">
              <Icon className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
              <p className="text-xs text-muted-foreground mb-4">{desc}</p>
              <Button size="sm" className="bg-brand-600 hover:bg-brand-700">{action}</Button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Empty State Guidelines</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• Use relevant icon for the context</p>
          <p>• Clear, friendly message</p>
          <p>• Action button to resolve the empty state</p>
          <p>• Appropriate use of whitespace</p>
          <p>• Consistent with overall design system</p>
        </div>
      </div>
    </div>
  );
}
