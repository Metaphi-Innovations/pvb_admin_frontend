"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SchemeSettings } from "../scheme-data";

interface SchemeSettingsDialogProps {
  open: boolean;
  settings: SchemeSettings;
  onChange: (settings: SchemeSettings) => void;
  onClose: () => void;
  onSave: () => void;
}

export function SchemeSettingsDialog({
  open,
  settings,
  onChange,
  onClose,
  onSave,
}: SchemeSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Scheme Conflict Settings</DialogTitle>
          <DialogDescription className="text-xs">
            Configure how multiple schemes are applied when rules overlap.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
            <div>
              <Label className="text-xs font-medium">Allow multiple schemes</Label>
              <p className="text-[10px] text-muted-foreground">Yes = combine benefits; No = single scheme</p>
            </div>
            <Switch
              checked={settings.allowMultipleSchemes}
              onCheckedChange={(v) =>
                onChange({
                  ...settings,
                  allowMultipleSchemes: v,
                  applyHighestBenefit: v ? settings.applyHighestBenefit : true,
                })
              }
            />
          </div>
          {!settings.allowMultipleSchemes && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <div>
                <Label className="text-xs font-medium">Apply highest benefit</Label>
                <p className="text-[10px] text-muted-foreground">When only one scheme applies</p>
              </div>
              <Switch
                checked={settings.applyHighestBenefit}
                onCheckedChange={(v) => onChange({ ...settings, applyHighestBenefit: v })}
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
            <div>
              <Label className="text-xs font-medium">Priority-based override</Label>
              <p className="text-[10px] text-muted-foreground">
                Near Expiry → Festive → Product → Cash → Payment → Turnover
              </p>
            </div>
            <Switch
              checked={settings.priorityOverride}
              onCheckedChange={(v) => onChange({ ...settings, priorityOverride: v })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={onSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
