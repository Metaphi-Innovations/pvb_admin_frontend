import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ModalsSection() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Modal Dialog</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Modal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Action</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                This is a modal dialog for important actions. Users must take action or dismiss.
              </p>
              <div className="flex gap-2 justify-end">
                <DialogTrigger asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogTrigger>
                <Button>Confirm</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Modal Types</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• Confirmation dialogs for destructive actions</p>
          <p>• Form modals for data entry</p>
          <p>• Alert modals for important notifications</p>
          <p>• Should overlay the entire page</p>
          <p>• Require explicit user action to close</p>
        </div>
      </div>
    </div>
  );
}
