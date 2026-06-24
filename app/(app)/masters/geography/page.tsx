"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeographyMasterTab } from "./components/GeographyMasterTab";
import { PincodeMasterTab } from "./components/PincodeMasterTab";

export default function GeographyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "pincode" ? "pincode" : "geography";

  const setTab = (tab: string) => {
    const next = tab === "pincode" ? "?tab=pincode" : "";
    router.replace(`/masters/geography${next}`);
  };

  return (
    <ListingContainer title="Geography" titleIcon={Globe}>
      <Tabs value={activeTab} onValueChange={setTab} className="space-y-4">
        <TabsList className="border-b border-border w-full justify-start rounded-none h-auto p-0 bg-transparent space-x-6">
          <TabsTrigger
            value="geography"
            className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-xs font-semibold text-muted-foreground data-[state=active]:border-brand-600 data-[state=active]:text-brand-650 bg-transparent shadow-none hover:text-brand-650 transition-all"
          >
            Geography Master
          </TabsTrigger>
          <TabsTrigger
            value="pincode"
            className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-xs font-semibold text-muted-foreground data-[state=active]:border-brand-600 data-[state=active]:text-brand-650 bg-transparent shadow-none hover:text-brand-650 transition-all"
          >
            Pincode Master
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geography" className="m-0 outline-none">
          <GeographyMasterTab />
        </TabsContent>

        <TabsContent value="pincode" className="m-0 outline-none">
          <PincodeMasterTab />
        </TabsContent>
      </Tabs>
    </ListingContainer>
  );
}
