import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export default function TabsAccordionSection() {
  const [expandedAccordion, setExpandedAccordion] = useState(0);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Tabs</h3>
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="bg-white border border-t-0 border-border rounded-b-lg p-4">
            <p className="text-sm text-foreground">Order details and information</p>
          </TabsContent>
          <TabsContent value="history" className="bg-white border border-t-0 border-border rounded-b-lg p-4">
            <p className="text-sm text-foreground">Order history and changes</p>
          </TabsContent>
          <TabsContent value="documents" className="bg-white border border-t-0 border-border rounded-b-lg p-4">
            <p className="text-sm text-foreground">Associated documents</p>
          </TabsContent>
        </Tabs>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Accordion</h3>
        <div className="space-y-2">
          {[
            { title: "What is Dharitri Sutra?", content: "Dharitri Sutra is an ERP/SFA platform for agri-tech" },
            { title: "How do I create an order?", content: "Navigate to Orders and click Create New Order" },
            { title: "Can I edit orders?", content: "Yes, you can edit pending orders before approval" },
          ].map((item, idx) => (
            <div key={idx} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedAccordion(expandedAccordion === idx ? -1 : idx)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
              >
                <p className="text-sm font-semibold text-foreground text-left">{item.title}</p>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 ${
                    expandedAccordion === idx ? "rotate-180" : ""
                  }`}
                />
              </button>
              {expandedAccordion === idx && (
                <div className="px-4 py-3 bg-muted/10 border-t border-border">
                  <p className="text-xs text-foreground">{item.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Tab & Accordion Uses</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• Tabs: organize related content</p>
          <p>• Accordion: collapse/expand sections</p>
          <p>• Save space on page</p>
          <p>• Group similar information</p>
        </div>
      </div>
    </div>
  );
}
